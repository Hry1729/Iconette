import { reactive, watch } from 'vue'

export type Mode = 'search' | 'sets' | 'swipe' | 'fav'
export type Fmt = 'svg' | 'png' | 'vue' | 'jsx' | 'unocss' | 'iconify' | 'dataurl' | 'name'
export type Deck = 'icons' | 'comp' | 'lib'
export type FavTab = 'icons' | 'sets' | 'ui' | 'recent'

const KEY = 'icones-desktop:v1'

const defaults = {
  lang: 'zh' as 'zh' | 'en',
  theme: 'system' as 'system' | 'light' | 'dark',
  fmt: 'svg' as Fmt,
  click: false,
  favs: [] as string[],
  folders: {} as Record<string, string[]>,
  recent: [] as string[],
  color: null as string | null,
  size: 24,
  sets: ['lucide', 'ph', 'tabler', 'mingcute', 'material-symbols', 'ri', 'logos'],
  /** Icon sets already swiped. */
  seen: [] as string[],
  /** Swipe filter (B6). */
  swf: { color: 'any' as 'any' | 'mono' | 'multi', cat: null as string | null, lic: false },
  /** Saved component libraries ("shadcn") and components ("shadcn/button"). */
  uiFav: [] as string[],
  uiSeen: [] as string[],
  deck: 'icons' as Deck,
  /** Closing the main window hides it to the tray instead of quitting. */
  closeToTray: true,
}

function read(): Partial<typeof defaults> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}

/** Persistent settings (saved to the webview's localStorage, per user, survives updates). */
export const S = reactive({ ...defaults, ...read() })
let applying = false
watch(S, () => { if (!applying) localStorage.setItem(KEY, JSON.stringify(S)) }, { deep: true })
// The quick window and the main window share localStorage: pick up changes made in the other one.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return
  try {
    applying = true
    Object.assign(S, JSON.parse(e.newValue))
  }
  catch {}
  finally { setTimeout(() => { applying = false }) }
})

/** Runtime UI state. */
export const R = reactive({
  mode: 'search' as Mode,
  q: '',
  set: null as string | null,
  sel: null as string | null,
  list: [] as string[],
  pop: null as string | null,
  // resources
  res: 'icons' as 'icons' | 'ui',
  lib: null as string | null,
  libTab: 'dash' as 'dash' | 'grid',
  fw: null as string | null,
  cat: null as string | null,
  // favorites
  favTab: 'icons' as FavTab,
  folder: null as string | null,
  // swipe
  swCount: '',
})

export function addRecent(id: string) {
  S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0, 80)
}

export function toggleFav(id: string): boolean {
  const i = S.favs.indexOf(id)
  if (i > -1) {
    S.favs.splice(i, 1)
    for (const f in S.folders) S.folders[f] = S.folders[f].filter(x => x !== id)
    return false
  }
  S.favs.unshift(id)
  // Saving while a group is open puts it in that group too.
  if (R.mode === 'fav' && R.folder && S.folders[R.folder] && !S.folders[R.folder].includes(id)) S.folders[R.folder].unshift(id)
  return true
}

export function toggleSet(p: string): boolean {
  const i = S.sets.indexOf(p)
  if (i > -1) { S.sets.splice(i, 1); return false }
  S.sets.push(p)
  return true
}

export function toggleUI(id: string): boolean {
  const i = S.uiFav.indexOf(id)
  if (i > -1) { S.uiFav.splice(i, 1); return false }
  S.uiFav.push(id)
  return true
}
