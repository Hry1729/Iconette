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
 *  Alt+Space may be taken by PowerToys / uTools / Copilot, then the app falls back to Alt+Shift+Space;
 *  the user can also record their own in the settings menu. */
export const quickKey = ref(isMac ? '⌥ Space' : 'Alt Space')
/** The raw accelerator behind `quickKey` ("alt+space", "ctrl+shift+keyk"…). */
export const quickAccel = ref<string | null>('alt+space')
export const DEFAULT_ACCEL = 'alt+space'
const MOD: Record<string, [string, string]> = { ctrl: ['⌃', 'Ctrl'], alt: ['⌥', 'Alt'], shift: ['⇧', 'Shift'], super: ['⌘', 'Win'] }
const KEYN: Record<string, string> = { space: 'Space', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', backquote: '`', minus: '-', equal: '=', bracketleft: '[', bracketright: ']', backslash: '\\', semicolon: ';', quote: '\'', comma: ',', period: '.', slash: '/', enter: '↵', tab: 'Tab', backspace: '⌫', delete: 'Del' }
export function keyLabel(sc: string) {
  const out = sc.toLowerCase().split('+').map((p) => {
    if (MOD[p]) return MOD[p][isMac ? 0 : 1]
    if (KEYN[p]) return KEYN[p]
    const m = p.match(/^(?:key|digit|numpad)(\w)$/)
    if (m) return m[1].toUpperCase()
    return p[0].toUpperCase() + p.slice(1)
  })
  if (!isMac) return out.join(' ')
  const mods = out.slice(0, -1).join('')
  return mods ? `${mods} ${out[out.length - 1]}` : out[0]
}
function applyAccel(sc: string | null) { quickAccel.value = sc; quickKey.value = sc ? keyLabel(sc) : '' }
if (inTauri) {
  invoke<string | null>('quick_shortcut').then(sc => applyAccel(sc ?? null)).catch(() => {})
  // The other window (main / quick) changed it: follow along.
  import('@tauri-apps/api/event').then(({ listen }) => listen<string | null>('quick-shortcut', e => applyAccel(e.payload))).catch(() => {})
}
/** Accelerator for a keydown ("ctrl+shift+keyk"), or null while only modifiers are held / for plain keys. */
export function accelFromEvent(e: KeyboardEvent): string | null {
  if (['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(e.key)) return null
  const code = e.code.toLowerCase()
  if (!code || code === 'unidentified') return null
  const mods = [e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift', e.metaKey && 'super'].filter(Boolean) as string[]
  const fkey = /^f\d{1,2}$/.test(code)
  if (!fkey && (!mods.length || (mods.length === 1 && mods[0] === 'shift'))) return null
  return [...mods, code].join('+')
}
/** Use a new quick-window shortcut. Rejects with 'taken' / 'invalid' and keeps the old one. */
export async function setQuickShortcut(accel: string) {
  if (!inTauri) { applyAccel(accel); return accel }
  const sc = (await invoke<string>('set_quick_shortcut', { accel }))!
  applyAccel(sc)
  return sc
}
export async function resetQuickShortcut() {
  if (!inTauri) { applyAccel(DEFAULT_ACCEL); return }
  applyAccel((await invoke<string | null>('reset_quick_shortcut')) ?? null)
}
export const suspendQuickShortcut = (suspend: boolean) => invoke('suspend_quick_shortcut', { suspend }).catch(() => {})
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
