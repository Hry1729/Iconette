// 拖出 SVG: drag an icon out of the window as a real .svg file.
// Desktop: a native OS drag (tauri-plugin-drag) of a temp file written by the Rust side.
// Browser: HTML5 drag with DownloadURL (Chromium) + text/plain code.
import { svg } from './iconify'
import { code } from './format'
import { inTauri } from './native'
import { S } from './store'
import { t } from './i18n'
import { select, toast } from './actions'

const fileName = (id: string) => id.replace(':', '-')
const ink = () => getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#1c1c1e'

// Native OS drag arrives with the desktop shell work (tauri-plugin-drag).
async function nativeDrag(_id: string) {}

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
