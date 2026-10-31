// 完整图标集的本地缓存。
// 桌面端写到应用数据目录 iconify/<prefix>.json（Rust 流式下载，asset 协议读取）。
// 浏览器调试写 IndexedDB。样例图标不走这里，它们跟目录一起打进包。
import { reactive } from 'vue'
import packMeta from '../data/iconify-meta.json'
import { inTauri } from './native'

export interface PackMeta {
  package: string
  version: string
  generated: string
  source: string
  note: string
  sets: number
  sampleIcons: number
  sampleBytes: number
  diskBytes: number
  tarballBytes: number
  unpackedBytes?: number
  bytes: Record<string, number>
}

export const PACK = packMeta as unknown as PackMeta

/** 超过这个体积的集合，在线时不为零散图标整份解析。打开整套仍会读。 */
const BIG = 8 * 1024 * 1024
const DB = 'iconette-iconify'
const STORE = 'sets'
const MAX_PARSED = 2

const localSet = new Set<string>()
const parsed = new Map<string, any>()
const lru: string[] = []
const reading = new Map<string, Promise<any | null>>()
const downloading = new Map<string, Promise<boolean>>()
const inflightEnsure = new Map<string, Promise<boolean>>()
let pinned = ''
let stopAll = false
let abort: AbortController | null = null

export const packUi = reactive({ open: false, cached: 0, total: 0 })
export const packDl = reactive({ on: false, done: 0, total: 0, bytes: 0, prefix: '', failed: 0 })

export function formatBytes(n: number, fallback = ''): string {
  if (!n || n < 0) return fallback
  const mb = n / 1048576
  if (mb >= 10) return `${Math.round(mb)} MB`
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

function syncCount() {
  const keys = Object.keys(PACK.bytes || {})
  packUi.total = keys.length
  let n = 0
  for (const p of keys) if (localSet.has(p)) n++
  packUi.cached = n
}

export function hasLocal(prefix: string) {
  return localSet.has(prefix)
}
export function hasParsed(prefix: string) {
  return parsed.has(prefix)
}
export function pendingSet(prefix: string) {
  return inflightEnsure.get(prefix)
}

export function namesOf(data: any): string[] {
  if (!data || typeof data !== 'object') return []
  const icons = data.icons && typeof data.icons === 'object' ? Object.keys(data.icons) : []
  const aliases = data.aliases && typeof data.aliases === 'object' ? Object.keys(data.aliases) : []
  return aliases.length ? [...new Set([...icons, ...aliases])] : icons
}

function remember(prefix: string, data: any) {
  const i = lru.indexOf(prefix)
  if (i >= 0) lru.splice(i, 1)
  lru.push(prefix)
  parsed.set(prefix, data)
  while (lru.length > MAX_PARSED) {
    const old = lru.find(p => p !== prefix && p !== pinned)
    if (!old) break
    lru.splice(lru.indexOf(old), 1)
    parsed.delete(old)
  }
  return data
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbReq<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return idb().then(db => new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

async function refreshIndex() {
  localSet.clear()
  if (inTauri) {
    try {
      const list = await tauriInvoke<string[]>('iconpack_list')
      for (const p of list) localSet.add(p)
    }
    catch (e) { console.warn('iconpack list', e) }
  }
  try {
    if (typeof indexedDB !== 'undefined') {
      const keys = await idbReq<IDBValidKey[]>('readonly', s => s.getAllKeys())
      for (const k of keys) localSet.add(String(k))
    }
  }
  catch (e) { console.warn('iconpack idb', e) }
  syncCount()
}

export const indexReady = refreshIndex()

async function forget(prefix: string) {
  localSet.delete(prefix)
  parsed.delete(prefix)
  const i = lru.indexOf(prefix)
  if (i >= 0) lru.splice(i, 1)
  if (inTauri) {
    try { await tauriInvoke('iconpack_drop', { prefix }) }
    catch { /* 文件可能本来就不在 */ }
  }
  try {
    if (typeof indexedDB !== 'undefined') await idbReq('readwrite', s => s.delete(prefix))
  }
  catch { /* 浏览器存储不可用时忽略 */ }
  syncCount()
}

async function loadParsedInner(prefix: string): Promise<any | null> {
  try {
    if (inTauri) {
      const path = await tauriInvoke<string | null>('iconpack_path', { prefix })
      if (path) {
        const { convertFileSrc } = await import('@tauri-apps/api/core')
        const res = await fetch(convertFileSrc(path))
        if (res.ok) {
          try { return remember(prefix, await res.json()) }
          catch (e) {
            console.warn('iconpack json', prefix, e)
            await forget(prefix)
            return null
          }
        }
      }
    }
  }
  catch (e) { console.warn('iconpack read', prefix, e) }
  try {
    if (typeof indexedDB === 'undefined') return null
    const text = await idbReq<string | undefined>('readonly', s => s.get(prefix))
    if (!text) return null
    return remember(prefix, JSON.parse(text))
  }
  catch (e) {
    console.warn('iconpack parse', prefix, e)
    await forget(prefix)
    return null
  }
}

function loadParsed(prefix: string): Promise<any | null> {
  const cur = reading.get(prefix)
  if (cur) return cur
  const job = loadParsedInner(prefix).finally(() => { if (reading.get(prefix) === job) reading.delete(prefix) })
  reading.set(prefix, job)
  return job
}

/** partial：零散图标。超大集合在线时不整份读入，交给原来的 API。 */
export async function readSet(prefix: string, partial = false): Promise<any | null> {
  const hit = parsed.get(prefix)
  if (hit) return hit
  const bytes = Number(PACK.bytes?.[prefix] || 0)
  if (partial && bytes > BIG && typeof navigator !== 'undefined' && navigator.onLine) return null
  if (!localSet.has(prefix)) return null
  return loadParsed(prefix)
}

function isCancel(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  return msg === 'cancel' || msg.includes('cancel') || msg.includes('AbortError')
}

function packUrls(prefix: string) {
  // jsDelivr 拒绝超过 150 MB 的包，@iconify/json 整包解压约 528 MB，所以逐文件下载先走 unpkg。
  const file = `@iconify/json@${PACK.version}/json/${prefix}.json`
  return [
    `https://unpkg.com/${file}`,
    `https://cdn.jsdelivr.net/npm/${file}`,
    `https://api.iconify.design/${prefix}.json`,
  ]
}

function looksLikeSet(text: string) {
  const head = text.slice(0, 8000)
  return head.trimStart().startsWith('{') && head.includes('"icons"')
}

async function pull(prefix: string, url: string) {
  if (stopAll && packDl.on) throw new Error('cancel')
  if (inTauri) {
    try {
      if (!packDl.on) await tauriInvoke('iconpack_reset')
      await tauriInvoke('iconpack_download', { prefix, url })
      localSet.add(prefix)
      syncCount()
      return
    }
    catch (e) {
      if (isCancel(e) || (stopAll && packDl.on)) throw new Error('cancel')
      console.warn('iconpack file', prefix, e)
    }
  }
  const ctrl = new AbortController()
  abort = ctrl
  const res = await fetch(url, { signal: ctrl.signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  if (!looksLikeSet(text)) throw new Error('not json')
  if (typeof indexedDB === 'undefined') throw new Error('no store')
  await idbReq('readwrite', s => s.put(text, prefix))
  localSet.add(prefix)
  syncCount()
}

/** 下载一个图标集。已在本地则直接成功。 */
export function downloadOne(prefix: string): Promise<boolean> {
  const cur = downloading.get(prefix)
  if (cur) return cur
  const job = (async () => {
    await indexReady
    if (localSet.has(prefix)) return true
    let last = ''
    for (const url of packUrls(prefix)) {
      try {
        await pull(prefix, url)
        return true
      }
      catch (e) {
        if (isCancel(e)) throw e
        last = e instanceof Error ? e.message : String(e)
      }
    }
    if (last) console.warn('iconpack', prefix, last)
    return false
  })().finally(() => { if (downloading.get(prefix) === job) downloading.delete(prefix) })
  downloading.set(prefix, job)
  return job
}

/** 打开整套图标时调用：本地有就读入，没有就下载一份再读。 */
export function ensureSet(prefix: string): Promise<boolean> {
  if (!prefix) return Promise.resolve(false)
  const cur = inflightEnsure.get(prefix)
  if (cur) return cur
  if (parsed.has(prefix)) return Promise.resolve(true)
  const job = (async () => {
    pinned = prefix
    const ok = await downloadOne(prefix)
    if (!ok) return false
    pinned = prefix
    const data = await readSet(prefix, false)
    return !!data
  })().finally(() => { if (inflightEnsure.get(prefix) === job) inflightEnsure.delete(prefix) })
  inflightEnsure.set(prefix, job)
  return job
}

export function cancelDownload() {
  stopAll = true
  abort?.abort()
  if (inTauri) void tauriInvoke('iconpack_cancel').catch(() => {})
}

/** 把目录里的每一套下载到本地。已有的跳过，可中途取消，下次再继续。 */
export async function downloadAll() {
  if (packDl.on) return
  stopAll = false
  if (inTauri) {
    try { await tauriInvoke('iconpack_reset') }
    catch { /* 浏览器里没有这条命令 */ }
  }
  await indexReady
  const prefixes = Object.keys(PACK.bytes || {}).sort()
  packDl.on = true
  packDl.done = 0
  packDl.total = prefixes.length
  packDl.bytes = 0
  packDl.prefix = ''
  packDl.failed = 0
  try {
    for (const p of prefixes) {
      if (stopAll) break
      if (localSet.has(p)) {
        packDl.done++
        packDl.bytes += Number(PACK.bytes[p] || 0)
        continue
      }
      packDl.prefix = p
      try {
        const ok = await downloadOne(p)
        if (stopAll) break
        if (ok) {
          packDl.done++
          packDl.bytes += Number(PACK.bytes[p] || 0)
        }
        else packDl.failed++
      }
      catch (e) {
        if (isCancel(e) || stopAll) break
        packDl.failed++
      }
    }
  }
  finally {
    packDl.on = false
    packDl.prefix = ''
    stopAll = false
    syncCount()
  }
}
