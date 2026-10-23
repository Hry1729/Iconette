import { reactive, ref } from 'vue'
import { UI_ICONS } from './ui-icons'

export const API = 'https://api.iconify.design'

export interface IconData { b: string, w: number, h: number }
export interface SetInfo {
  name: string
  total?: number
  author?: { name: string, url?: string }
  license?: { title: string, spdx?: string, url?: string }
  samples?: string[]
  category?: string
  palette?: boolean
  hidden?: boolean
}

const cache = new Map<string, IconData | null>(Object.entries(UI_ICONS))
const pend = new Map<string, Promise<void>>()
/** Bumped whenever new icon data lands, so components re-render. */
export const iconVer = ref(0)
export const INFO = reactive<Record<string, SetInfo>>({})
let allLoaded = false
const COLL: Record<string, string[]> = {}

export async function J<T = any>(u: string, ms = 10000): Promise<T> {
  const ac = new AbortController()
  const to = setTimeout(() => ac.abort(), ms)
  try {
    const r = await fetch(u, { signal: ac.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  }
  finally { clearTimeout(to) }
}

export const has = (id: string) => cache.has(id)

export function load(ids: string[]): Promise<unknown> {
  const need: Record<string, string[]> = {}
  const ps: Promise<void>[] = []
  for (const id of ids) {
    if (cache.has(id)) continue
    const p0 = pend.get(id)
    if (p0) { ps.push(p0); continue }
    const [p, n] = id.split(':')
    ;(need[p] ||= []).push(n)
  }
  for (const p in need) {
    for (let i = 0; i < need[p].length; i += 90) {
      const c = need[p].slice(i, i + 90)
      const pr = J(`${API}/${p}.json?icons=${c.join(',')}`).then((d: any) => {
        const W = d.width || 16
        const H = d.height || 16
        for (const n of c) {
          let ic = d.icons?.[n]
          const a = d.aliases?.[n]
          if (!ic && a) ic = d.icons?.[a.parent]
          cache.set(`${p}:${n}`, ic ? { b: ic.body, w: ic.width || W, h: ic.height || H } : null)
          pend.delete(`${p}:${n}`)
        }
        iconVer.value++
      }).catch(() => c.forEach(n => pend.delete(`${p}:${n}`)))
      c.forEach(n => pend.set(`${p}:${n}`, pr))
      ps.push(pr)
    }
  }
  return Promise.all(ps)
}

// Batch lazy requests from many tiles into one request per set.
const queue = new Set<string>()
let queued = false
export function want(id: string) {
  if (cache.has(id) || pend.has(id)) return
  queue.add(id)
  if (!queued) {
    queued = true
    setTimeout(() => { queued = false; const ids = [...queue]; queue.clear(); load(ids) }, 16)
  }
}

export function svg(id: string, o: { color?: string | null, size?: number } = {}): string {
  const d = cache.get(id)
  if (!d) return ''
  let b = d.b
  if (o.color) b = b.replace(/currentColor/g, o.color)
  const s = o.size ? `width="${Math.round(o.size * d.w / d.h)}" height="${o.size}"` : 'width="1em" height="1em"'
  return `<svg xmlns="http://www.w3.org/2000/svg" ${s} viewBox="0 0 ${d.w} ${d.h}">${b}</svg>`
}

export async function loadInfo(prefixes: string[]) {
  try { Object.assign(INFO, await J(`${API}/collections?prefixes=${prefixes.join(',')}`)) }
  catch {}
}
export async function ensureAll() {
  if (allLoaded) return
  try { const d = await J(`${API}/collections`); for (const k in d) if (!INFO[k]) INFO[k] = d[k]; allLoaded = true }
  catch {}
}

const collPend: Record<string, Promise<string[]> | undefined> = {}
/** All icon names of a set (deduplicated in-flight requests). */
export function collection(p: string): Promise<string[]> {
  if (COLL[p]) return Promise.resolve(COLL[p])
  return collPend[p] ||= fetchCollection(p).finally(() => { collPend[p] = undefined })
}
async function fetchCollection(p: string): Promise<string[]> {
  try {
    const d: any = await J(`${API}/collection?prefix=${p}`)
    COLL[p] = [...new Set<string>([...(d.uncategorized || []), ...Object.values<string[]>(d.categories || {}).flat()])]
  }
  // Network/rate-limit failure: fall back to the samples, but don't cache so a later call retries.
  catch { return INFO[p]?.samples || [] }
  return COLL[p]
}

export async function search(q: string, opts: { prefix?: string, limit?: number } = {}): Promise<string[]> {
  const lim = opts.limit ?? (opts.prefix ? 999 : 480)
  try {
    const d: any = await J(`${API}/search?query=${encodeURIComponent(q)}&limit=${lim}${opts.prefix ? `&prefixes=${opts.prefix}` : ''}`)
    return d.icons || []
  }
  catch { return [] }
}

export const setName = (p?: string | null) => (p ? INFO[p]?.name || p : '')
export const shortName = (p?: string | null) => setName(p).replace(/ Icons?$/, '')
