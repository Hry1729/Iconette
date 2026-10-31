import { reactive, ref } from 'vue'
import { UI_ICONS } from './ui-icons'
import { ensureSet, hasLocal, hasParsed, namesOf, pendingSet, readSet } from './icon-pack'
import collectionsRaw from '../data/iconify-collections.json?raw'
import samplesRaw from '../data/iconify-samples.json?raw'

export { ensureSet }

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
  height?: number | number[]
  tags?: string[]
}

interface CatalogFile {
  source: string
  version: string
  generated: string
  note: string
  collections: Record<string, SetInfo>
}

const catalog = JSON.parse(collectionsRaw) as CatalogFile
const samples = JSON.parse(samplesRaw) as Record<string, IconData>

const cache = new Map<string, IconData | null>(Object.entries(UI_ICONS))
// 样例跟包走，卡片不靠网络就能画。界面自带的图标优先，不让样例覆盖。
for (const id in samples) if (!cache.has(id)) cache.set(id, samples[id])
const pend = new Map<string, Promise<void>>()
/** Bumped whenever new icon data lands, so components re-render. */
export const iconVer = ref(0)
export const INFO = reactive<Record<string, SetInfo>>({})
let allLoaded = false
let allPending: Promise<void> | undefined
const COLL: Record<string, string[]> = {}

/** 就地合并目录。新前缀写入副本；已有前缀只覆盖字段，避免换掉对象引用。 */
function mergeCollections(d: Record<string, SetInfo>) {
  for (const k in d) {
    if (!INFO[k]) INFO[k] = { ...d[k] }
    else Object.assign(INFO[k], d[k])
  }
}

// 打包的离线快照（pnpm sync:iconify 从 @iconify/json 生成）。启动即可用。
mergeCollections(catalog.collections)

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

function takeFromSet(p: string, data: any, names: string[]) {
  const W = data?.width || 16
  const H = data?.height || 16
  let hit = 0
  for (const n of names) {
    let ic = data?.icons?.[n]
    const a = data?.aliases?.[n]
    if (!ic && a) ic = data?.icons?.[a.parent]
    if (!ic?.body) continue
    cache.set(`${p}:${n}`, { b: ic.body, w: ic.width || W, h: ic.height || H })
    pend.delete(`${p}:${n}`)
    hit++
  }
  if (hit) iconVer.value++
}

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
    const names = need[p]
    const pr = fillPrefix(p, names).finally(() => {
      for (const n of names) if (pend.get(`${p}:${n}`) === pr) pend.delete(`${p}:${n}`)
    })
    for (const n of names) pend.set(`${p}:${n}`, pr)
    ps.push(pr)
  }
  return Promise.all(ps)
}

/** 本地已有全文就先用；没有的图标仍走原来的按批 API。 */
async function fillPrefix(p: string, names: string[]) {
  const wait = pendingSet(p)
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (wait && offline) {
    try { await wait }
    catch { /* 下载失败时继续走 API */ }
  }
  let left = names
  if (hasParsed(p) || hasLocal(p)) {
    try {
      const data = await readSet(p, true)
      if (data) {
        takeFromSet(p, data, names)
        left = names.filter(n => !cache.has(`${p}:${n}`))
        if (!left.length) return
      }
    }
    catch (e) { console.warn('local set', p, e) }
  }
  await fillFromApi(p, left)
}

// 原来的按批 API 请求，一批最多 90 个。
async function fillFromApi(p: string, names: string[]) {
  const ps: Promise<void>[] = []
  for (let i = 0; i < names.length; i += 90) {
    const c = names.slice(i, i + 90)
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
  await Promise.all(ps)
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

/** 刷新指定前缀的元数据。失败时沿用已有快照。 */
export async function loadInfo(prefixes: string[]) {
  try { Object.assign(INFO, await J(`${API}/collections?prefixes=${prefixes.join(',')}`)) }
  catch {}
}
export function ensureAll() {
  if (allLoaded) return Promise.resolve()
  return allPending ||= (async () => {
    try {
      const d = await J<Record<string, SetInfo>>(`${API}/collections`)
      mergeCollections(d)
      allLoaded = true
    }
    catch {}
    finally { allPending = undefined }
  })()
}

const collPend: Record<string, Promise<string[]> | undefined> = {}
/** All icon names of a set (deduplicated in-flight requests). */
export function collection(p: string): Promise<string[]> {
  if (COLL[p]) return Promise.resolve(COLL[p])
  return collPend[p] ||= fetchCollection(p).finally(() => { collPend[p] = undefined })
}
/** 本地全文里的图标名。名称接口失败、整套下载完成后再铺列表时用。 */
export async function localNames(p: string): Promise<string[] | null> {
  if (!hasParsed(p) && !hasLocal(p)) return null
  try {
    const data = await readSet(p, false)
    if (!data) return null
    const names = namesOf(data)
    if (names.length) COLL[p] = names
    return names
  }
  catch { return null }
}
async function fetchCollection(p: string): Promise<string[]> {
  if (hasParsed(p)) {
    const data = await readSet(p, false)
    if (data) return COLL[p] = namesOf(data)
  }
  // 在线时仍走原来的轻量名称接口。离线或失败再用本地全文，最后退回样例。
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (!offline) {
    try {
      const d: any = await J(`${API}/collection?prefix=${p}`)
      COLL[p] = [...new Set<string>([...(d.uncategorized || []), ...Object.values<string[]>(d.categories || {}).flat()])]
      return COLL[p]
    }
    catch { /* 落到本地全文或样例 */ }
  }
  if (hasLocal(p) || hasParsed(p)) {
    try {
      const data = await readSet(p, false)
      if (data) return COLL[p] = namesOf(data)
    }
    catch { /* 本地文件坏了就用样例，下次还能再试 */ }
  }
  return INFO[p]?.samples || []
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
