import { S } from './store'
import { inTauri } from './native'

// 收藏导出/导入: favorites as a versioned JSON file.
export const FAV_VERSION = 1
interface FavData { icons: string[], groups: Record<string, string[]>, sets: string[], ui: string[], recent?: string[] }
export interface FavFile { app: 'iconette', kind: 'favorites', version: number, exportedAt: string, data: FavData }

const strs = (v: unknown): string[] | null => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!x.trim() && x.length < 200))] : null
const uniq = (a: string[]) => [...new Set(a)]

export function buildExport(): FavFile {
  return {
    app: 'iconette',
    kind: 'favorites',
    version: FAV_VERSION,
    exportedAt: new Date().toISOString(),
    data: { icons: [...S.favs], groups: JSON.parse(JSON.stringify(S.folders)), sets: [...S.sets], ui: [...S.uiFav], recent: [...S.recent] },
  }
}
export const favCount = (d: Pick<FavData, 'icons' | 'sets' | 'ui'>) => d.icons.length + d.sets.length + d.ui.length

/** Validate an imported file; throws 'bad' (not ours / broken) or 'newer' (from a newer app version). */
export function parseFavFile(text: string): FavData {
  let o: any
  try { o = JSON.parse(text) }
  catch { throw new Error('bad') }
  if (!o || o.app !== 'iconette' || o.kind !== 'favorites' || typeof o.version !== 'number' || typeof o.data !== 'object' || !o.data) throw new Error('bad')
  if (o.version > FAV_VERSION) throw new Error('newer')
  const d = o.data
  const icons = strs(d.icons ?? [])
  const sets = strs(d.sets ?? [])
  const ui = strs(d.ui ?? [])
  if (!icons || !sets || !ui) throw new Error('bad')
  const groups: Record<string, string[]> = {}
  if (d.groups && typeof d.groups === 'object' && !Array.isArray(d.groups)) {
    for (const [k, v] of Object.entries(d.groups)) { const a = strs(v); if (a && k.trim()) groups[k.trim().slice(0, 60)] = a }
  }
  const recent = d.recent === undefined ? undefined : strs(d.recent) ?? undefined
  return { icons, groups, sets, ui, recent }
}

/** Apply imported favorites. merge: union, existing order first. replace: the file wins.
 *  Returns how many icons / sets / components were added (merge) or now saved (replace). */
export function applyFavs(d: FavData, mode: 'merge' | 'replace'): number {
  const before = mode === 'merge' ? favCount({ icons: S.favs, sets: S.sets, ui: S.uiFav }) : 0
  // Every grouped icon is also a saved icon.
  const grouped = Object.values(d.groups).flat()
  if (mode === 'replace') {
    S.favs = uniq([...d.icons, ...grouped])
    S.folders = d.groups
    S.sets = d.sets
    S.uiFav = d.ui
    if (d.recent) S.recent = d.recent.slice(0, 80)
  }
  else {
    S.favs = uniq([...S.favs, ...d.icons, ...grouped])
    const f = { ...S.folders }
    for (const [k, v] of Object.entries(d.groups)) f[k] = uniq([...(f[k] || []), ...v])
    S.folders = f
    S.sets = uniq([...S.sets, ...d.sets])
    S.uiFav = uniq([...S.uiFav, ...d.ui])
    if (d.recent) S.recent = uniq([...S.recent, ...d.recent]).slice(0, 80)
  }
  return favCount({ icons: S.favs, sets: S.sets, ui: S.uiFav }) - before
}

const fileName = () => `iconette-favorites-${new Date().toISOString().slice(0, 10)}.json`
const FILTERS = [{ name: 'JSON', extensions: ['json'] }]

/** Save dialog → file. Resolves false when the user cancels. */
export async function exportFavs(): Promise<boolean> {
  const text = JSON.stringify(buildExport(), null, 2)
  if (inTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    let path = await save({ defaultPath: fileName(), filters: FILTERS })
    if (!path) return false
    if (!/\.json$/i.test(path)) path += '.json'
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('fav_save', { path, text })
    return true
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = fileName()
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return true
}

/** Open dialog → file text, or null when cancelled. */
export async function pickFavFile(): Promise<string | null> {
  if (inTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({ multiple: false, directory: false, filters: FILTERS })
    if (!path || Array.isArray(path)) return null
    const { invoke } = await import('@tauri-apps/api/core')
    return (await invoke<string>('fav_load', { path })) ?? null
  }
  return new Promise((resolve) => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = '.json,application/json'
    inp.onchange = () => { const f = inp.files?.[0]; f ? f.text().then(resolve, () => resolve(null)) : resolve(null) }
    inp.addEventListener('cancel', () => resolve(null))
    inp.click()
  })
}
