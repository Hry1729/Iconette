// 拖出 SVG: drag an icon out of the window as a real .svg file.
// Desktop: a native OS drag (tauri-plugin-drag) of a temp file written by the Rust side.
// Browser: HTML5 drag with DownloadURL (Chromium) + text/plain code.
import { load, svg } from './iconify'
import { code, pngBlob } from './format'
import { inTauri } from './native'
import { S } from './store'
import { t } from './i18n'
import { select, toast } from './actions'

const fileName = (id: string) => id.replace(':', '-')
const ink = () => getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#1c1c1e'

async function nativeDrag(id: string) {
  await load([id])
  const s = svg(id, { color: S.color, size: S.size })
  if (!s) return
  const png = new Uint8Array(await (await pngBlob(id, ink(), 64)).arrayBuffer())
  const { invoke } = await import('@tauri-apps/api/core')
  const [file, icon] = await invoke<[string, string]>('drag_prepare', { name: fileName(id), svg: s, png: Array.from(png) })
  const { startDrag } = await import('@crabnebula/tauri-plugin-drag')
  await startDrag({ item: [file], icon, mode: 'copy' }, (r) => {
    if (r.result === 'Dropped') toast(t('dragged', { n: fileName(id) }), 'lucide:file-down')
  })
}

function htmlDrag(e: DragEvent, id: string) {
  const s = svg(id, { color: S.color, size: S.size })
  if (!s || !e.dataTransfer) return
  e.dataTransfer.setData('text/plain', code(id))
  e.dataTransfer.setData('text/html', s)
  e.dataTransfer.setData('DownloadURL', `image/svg+xml:${fileName(id)}.svg:data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`)
  e.dataTransfer.effectAllowed = 'copy'
  const g = document.createElement('div')
  g.style.cssText = `position:fixed;top:-100px;font-size:32px;color:${S.color || ink()}`
  g.innerHTML = svg(id)
  document.body.append(g)
  e.dataTransfer.setDragImage(g, 16, 16)
  setTimeout(() => g.remove())
  const end = (ev: DragEvent) => {
    if (ev.dataTransfer?.dropEffect !== 'none' || ev.clientY < 0 || ev.clientX < 0) toast(t('dragged', { n: fileName(id) }), 'lucide:file-down')
  }
  ;(e.target as HTMLElement).addEventListener('dragend', end, { once: true })
}

/** Bind to both @mousedown and @dragstart of a tile / preview. */
export function dragStart(e: MouseEvent | DragEvent, id: string) {
  if (e.type === 'dragstart') {
    if (inTauri) { e.preventDefault(); return }
    select(id)
    htmlDrag(e as DragEvent, id)
    return
  }
  if (!inTauri || (e as MouseEvent).button !== 0) return
  const x0 = e.clientX
  const y0 = e.clientY
  const move = (ev: MouseEvent) => {
    if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return
    off()
    select(id)
    nativeDrag(id).catch(err => console.warn('drag failed', err))
  }
  const off = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', off) }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', off)
}
