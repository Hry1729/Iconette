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

/** Global ⌥/Alt+Space brings the window to front (the dedicated quick window comes later). */
export async function registerGlobalShortcut(onFire: () => void) {
  if (!inTauri) return
  try {
    const { register, isRegistered } = await import('@tauri-apps/plugin-global-shortcut')
    if (await isRegistered('Alt+Space')) return
    await register('Alt+Space', async (e) => {
      if (e.state !== 'Pressed') return
      const w = await win()
      await w.show(); await w.unminimize(); await w.setFocus()
      onFire()
    })
  }
  catch (e) { console.warn('global shortcut unavailable', e) }
}
