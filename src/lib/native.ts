import { ref } from 'vue'
// Thin layer over Tauri APIs with browser fallbacks, so `pnpm dev` also works in a normal browser.
export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
export const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)
export const isWin = /Windows/.test(navigator.userAgent)
export const modKey = isMac ? '⌘' : 'Ctrl '

export async function copyText(text: string) {
  if (inTauri) {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
    return writeText(text)
  }
  try { await navigator.clipboard.writeText(text) }
  catch {
    const a = document.createElement('textarea')
    a.value = text
    document.body.append(a)
    a.select()
    document.execCommand('copy')
    a.remove()
  }
}

export async function copyPng(blob: Blob) {
  if (inTauri) {
    const { writeImage } = await import('@tauri-apps/plugin-clipboard-manager')
    return writeImage(new Uint8Array(await blob.arrayBuffer()))
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export async function openUrl(url: string) {
  if (inTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    return openUrl(url)
  }
  window.open(url, '_blank')
}

export async function win() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}

async function invoke<T = void>(cmd: string, args?: Record<string, unknown>): Promise<T | undefined> {
  if (!inTauri) return undefined
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

/** Show / hide the quick-pick window (also bound to ⌥/Alt+Space globally on the Rust side). */
export const toggleQuick = () => invoke('toggle_quick')
export const hideQuick = async () => { if (inTauri) await invoke('quick_hide'); else window.close() }
export const setCloseToTray = (on: boolean) => invoke('set_close_to_tray', { on })
/** Display label of the quick-window shortcut that is really registered ('' when none could be).
 *  Alt+Space may be taken by PowerToys / uTools / Copilot, then the app falls back to Alt+Shift+Space. */
export const quickKey = ref(isMac ? '⌥ Space' : 'Alt Space')
const keyLabel = (sc: string) => sc.split('+').map(p => p === 'alt' ? (isMac ? '⌥' : 'Alt') : p === 'shift' ? (isMac ? '⇧' : 'Shift') : p[0].toUpperCase() + p.slice(1)).join(isMac ? '' : ' ').replace(/(⌥|⇧)(?=[A-Z])/, '$1 ')
if (inTauri) invoke<string | null>('quick_shortcut').then(sc => { quickKey.value = sc ? keyLabel(sc) : '' }).catch(() => {})
export const setTrayLabels = (labels: string[]) => invoke('set_tray_labels', { labels })

export async function autostartEnabled(): Promise<boolean> {
  if (!inTauri) return false
  try { const { isEnabled } = await import('@tauri-apps/plugin-autostart'); return await isEnabled() }
  catch { return false }
}
export async function setAutostart(on: boolean) {
  if (!inTauri) return
  const m = await import('@tauri-apps/plugin-autostart')
  await (on ? m.enable() : m.disable())
}
