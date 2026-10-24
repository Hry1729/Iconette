import { reactive } from 'vue'
import { version as pkgVersion } from '../../package.json'
import { S } from './store'
import { inTauri, isMac, isWin, openUrl } from './native'

// 检查更新 / 更新 (v0.4.7). Paths, in order:
//  1. tauri-plugin-updater: when the newest release has a signed latest.json for this platform,
//     download + install + relaunch through the plugin.
//  2. Otherwise (this repo's releases are built without the signing secret, so normally this one) the app
//     updates itself from the plain GitHub release: src-tauri/src/selfupdate.rs finds the installer for this
//     platform, streams it to the temp dir with progress events and installs it (Windows: silent NSIS
//     setup that restarts the app; macOS: replace the .app from the dmg and relaunch, or open the dmg).
//  3. In a plain browser, or when no installer fits: open the release page.
// v0.4.6 and earlier: the 下载 button did nothing because the capability had `opener:allow-open-url`
// without any URL scope (`opener:allow-default-urls`), so openUrl() was rejected and the rejection was
// unhandled. Every openUrl call now goes through openLink(), which reports failures.
const REPO = 'Hry1729/icones-desktop'
export const RELEASES = `https://github.com/${REPO}/releases/latest`

type NativeUpdate = { version: string, downloadAndInstall: (cb?: (e: any) => void) => Promise<void> }
type Asset = { name: string, url: string, size: number }
export type UpdState = 'idle' | 'checking' | 'latest' | 'avail' | 'downloading' | 'installing' | 'manual' | 'failed' | 'error'
export const upd = reactive({
  cur: pkgVersion,
  /** Newer version on offer ('' when none / not checked). */
  ver: '',
  /** Release page (browser fallback). */
  page: RELEASES,
  asset: null as Asset | null,
  native: null as NativeUpdate | null,
  state: 'idle' as UpdState,
  pct: 0,
  /** Error code of the last failed check / update: timeout · connect · rate · http:NNN · noasset · net:… · io:… · install:… */
  err: '',
})
if (inTauri) import('@tauri-apps/api/app').then(m => m.getVersion()).then((v) => { upd.cur = v }).catch(() => {})
// screenshots / debugging
;(window as any).__upd = upd

const parts = (v: string) => v.replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map(n => Number.parseInt(n) || 0)
export function newer(a: string, b: string) {
  const x = parts(a); const y = parts(b)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}
const code = (e: unknown) => {
  const s = typeof e === 'string' ? e : (e as Error)?.message || String(e)
  if (/timed? ?out|timeout/i.test(s)) return 'timeout'
  if (/failed to fetch|network|connect/i.test(s)) return 'connect'
  return s
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>) {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

async function viaPlugin(): Promise<boolean | null> {
  if (!inTauri) return null
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const u = await check({ timeout: 10000 })
    if (u) { upd.native = u as unknown as NativeUpdate; upd.ver = u.version; return true }
    return false
  }
  catch (e) { console.info('updater: no signed update manifest, using the GitHub release', e); return null }
}

async function viaRelease(): Promise<boolean> {
  type L = { version: string, page: string, asset: Asset | null }
  let j: L
  if (inTauri) { j = await invoke<L>('upd_latest') }
  else {
    const ctl = new AbortController()
    const tm = setTimeout(() => ctl.abort(), 15000)
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal })
      if (r.status === 403 || r.status === 429) throw new Error('rate')
      if (!r.ok) throw new Error(`http:${r.status}`)
      const x = await r.json() as { tag_name: string, html_url: string, assets?: { name: string, browser_download_url: string, size: number }[] }
      const a = (x.assets || []).find(a => isWin ? /_x64-setup\.exe$/i.test(a.name) : isMac ? /\.dmg$/i.test(a.name) : false)
      j = { version: x.tag_name.replace(/^v/i, ''), page: x.html_url, asset: a ? { name: a.name, url: a.browser_download_url, size: a.size } : null }
    }
    catch (e) { throw (e as Error).name === 'AbortError' ? new Error('timeout') : e }
    finally { clearTimeout(tm) }
  }
  if (!newer(j.version, upd.cur)) return false
  upd.ver = j.version
  upd.page = j.page || RELEASES
  upd.asset = j.asset
  return true
}

/** Look for a newer release. Returns the resulting state. */
export async function checkUpdate() {
  if (['checking', 'downloading', 'installing'].includes(upd.state)) return upd.state
  upd.state = 'checking'
  upd.native = null
  upd.asset = null
  upd.err = ''
  try {
    const p = await viaPlugin()
    const ok = p ?? await viaRelease()
    upd.state = ok ? 'avail' : 'latest'
    if (!ok) upd.ver = ''
  }
  catch (e) { console.warn(e); upd.err = code(e); upd.state = 'error' }
  return upd.state
}

let unlisten: (() => void) | null = null
async function selfUpdate() {
  const a = upd.asset!
  upd.state = 'downloading'
  upd.pct = 0
  upd.err = ''
  try {
    const { listen } = await import('@tauri-apps/api/event')
    unlisten?.()
    unlisten = await listen<{ got: number, total: number }>('upd-progress', ({ payload: p }) => {
      upd.pct = p.total ? Math.min(100, Math.floor(p.got / p.total * 100)) : 0
    })
    const path = await invoke<string>('upd_download', { url: a.url, name: a.name, size: a.size })
    upd.pct = 100
    upd.state = 'installing'
    const how = await invoke<string>('upd_install', { path })
    // 'restart': the app quits now and the new version starts; 'manual': the dmg was opened in Finder
    if (how === 'manual') upd.state = 'manual'
  }
  catch (e) {
    const c = code(e)
    if (c === 'cancel') { upd.state = 'avail'; return }
    console.warn('update failed', e)
    upd.err = c
    upd.state = 'failed'
  }
  finally { unlisten?.(); unlisten = null }
}

/** 更新: signed plugin update → self update from the GitHub release → release page in the browser. */
export async function installUpdate() {
  if (['downloading', 'installing', 'checking'].includes(upd.state)) return
  if (upd.native) {
    upd.state = 'downloading'
    upd.pct = 0
    let total = 0; let got = 0
    try {
      await upd.native.downloadAndInstall((e) => {
        if (e.event === 'Started') total = e.data.contentLength || 0
        else if (e.event === 'Progress') { got += e.data.chunkLength; upd.pct = total ? Math.round(got / total * 100) : 0 }
        else if (e.event === 'Finished') upd.state = 'installing'
      })
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
      return
    }
    catch (e) {
      console.warn('signed update failed, trying the release installer', e)
      upd.native = null
      try { await viaRelease() }
      catch {}
    }
  }
  if (inTauri && upd.asset) return selfUpdate()
  if (inTauri && !upd.asset) { upd.err = 'noasset'; upd.state = 'failed'; return }
  await openRelease()
}

export function cancelUpdate() {
  if (upd.state === 'downloading' && !upd.native) invoke('upd_cancel').catch(() => {})
}

/** 在浏览器中打开 the release page. Returns false when even that failed. */
export async function openRelease() {
  try { await openUrl(upd.page || RELEASES); return true }
  catch (e) { console.warn('openUrl', e); upd.err = `open:${code(e)}`; upd.state = 'failed'; return false }
}

/** Startup: at most one automatic check per day, a few seconds after launch. */
export function autoCheck() {
  const day = new Date().toISOString().slice(0, 10)
  if (S.updDay === day) return
  setTimeout(() => { S.updDay = day; checkUpdate() }, 5000)
}
