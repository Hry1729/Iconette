import { reactive } from 'vue'
import { version as pkgVersion } from '../../package.json'
import { S } from './store'
import { inTauri, isMac, isWin, openUrl } from './native'

// 检查更新. Two paths:
//  1. tauri-plugin-updater reads latest.json from the newest GitHub release; when it has a signed
//     build for this platform, the update downloads, installs and relaunches in place.
//  2. If there is no latest.json (releases built without the signing secret) or the check fails,
//     ask the GitHub API for the latest release and offer its installer / release page.
const REPO = 'Hry1729/icones-desktop'
export const RELEASES = `https://github.com/${REPO}/releases/latest`

type NativeUpdate = { version: string, downloadAndInstall: (cb?: (e: any) => void) => Promise<void> }
export const upd = reactive({
  cur: pkgVersion,
  /** Newer version on offer ('' when none / not checked). */
  ver: '',
  url: RELEASES,
  native: null as NativeUpdate | null,
  state: 'idle' as 'idle' | 'checking' | 'latest' | 'avail' | 'installing' | 'error',
  pct: 0,
})
if (inTauri) import('@tauri-apps/api/app').then(m => m.getVersion()).then((v) => { upd.cur = v }).catch(() => {})

const parts = (v: string) => v.replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map(n => Number.parseInt(n) || 0)
export function newer(a: string, b: string) {
  const x = parts(a); const y = parts(b)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

async function viaPlugin(): Promise<boolean | null> {
  if (!inTauri) return null
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const u = await check({ timeout: 10000 })
    if (u) { upd.native = u as unknown as NativeUpdate; upd.ver = u.version; return true }
    return false
  }
  catch (e) { console.info('updater: no signed update manifest, using GitHub API', e); return null }
}

async function viaApi(): Promise<boolean> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!r.ok) throw new Error(`GitHub ${r.status}`)
  const j = await r.json() as { tag_name: string, html_url: string, assets?: { name: string, browser_download_url: string }[] }
  if (!newer(j.tag_name, upd.cur)) return false
  const as = j.assets || []
  const pick = (re: RegExp) => as.find(a => re.test(a.name))?.browser_download_url
  upd.ver = j.tag_name.replace(/^v/i, '')
  upd.url = (isWin ? pick(/-setup\.exe$/i) || pick(/\.msi$/i) : isMac ? pick(/\.dmg$/i) : undefined) || j.html_url || RELEASES
  return true
}

/** Look for a newer release. Returns the resulting state. */
export async function checkUpdate() {
  if (upd.state === 'checking' || upd.state === 'installing') return upd.state
  upd.state = 'checking'
  upd.native = null
  try {
    const p = await viaPlugin()
    const ok = p ?? await viaApi()
    upd.state = ok ? 'avail' : 'latest'
    if (!ok) upd.ver = ''
  }
  catch (e) { console.warn(e); upd.state = 'error' }
  return upd.state
}

/** Signed update: download, install, relaunch. Otherwise open the installer / release page. */
export async function installUpdate() {
  if (!upd.native) { await openUrl(upd.url); return }
  upd.state = 'installing'
  let total = 0; let got = 0
  try {
    await upd.native.downloadAndInstall((e) => {
      if (e.event === 'Started') total = e.data.contentLength || 0
      else if (e.event === 'Progress') { got += e.data.chunkLength; upd.pct = total ? Math.round(got / total * 100) : 0 }
    })
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }
  catch (e) {
    console.warn(e)
    // Fall back to the manual download rather than leaving the user stuck.
    upd.native = null
    upd.state = 'avail'
    await openUrl(upd.url)
  }
}

/** Startup: at most one automatic check per day, a few seconds after launch. */
export function autoCheck() {
  const day = new Date().toISOString().slice(0, 10)
  if (S.updDay === day) return
  setTimeout(() => { S.updDay = day; checkUpdate() }, 5000)
}
