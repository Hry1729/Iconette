import { svg } from './iconify'
import { S, type Fmt } from './store'

export const FMTS: [Fmt, string][] = [['svg', 'SVG'], ['png', 'PNG'], ['vue', 'Vue'], ['jsx', 'React'], ['unocss', 'UnoCSS'], ['iconify', 'Iconify'], ['dataurl', 'Data URL'], ['name', '名称|Name']]
export const fmtLabel = (f: Fmt = S.fmt) => {
  const l = FMTS.find(x => x[0] === f)![1]
  return l.includes('|') ? l.split('|')[S.lang === 'en' ? 1 : 0] : l
}
const pascal = (id: string) => id.split(/[:\-_]/).map(s => (s ? s[0].toUpperCase() + s.slice(1) : '')).join('')

export function code(id: string, f: Fmt = S.fmt): string {
  const s = svg(id, { color: S.color, size: S.size })
  const [p, n] = id.split(':')
  switch (f) {
    case 'vue': return `<template>\n  ${s}\n</template>`
    case 'jsx': return `export const ${pascal(id)} = (props) => (\n  ${s.replace('<svg ', '<svg {...props} ')}\n)`
    case 'unocss': return `<i class="i-${p}-${n}" />`
    case 'iconify': return `<Icon icon="${id}" />`
    case 'dataurl': return `data:image/svg+xml,${encodeURIComponent(s)}`
    case 'name': return id
    default: return s
  }
}

export async function pngBlob(id: string, ink: string, size?: number): Promise<Blob> {
  const px = size || Math.max(S.size * 4, 256)
  const s = svg(id, { size: px }).replace(/currentColor/g, S.color || ink)
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`
  await img.decode()
  const c = document.createElement('canvas')
  c.width = c.height = px
  c.getContext('2d')!.drawImage(img, 0, 0, px, px)
  return new Promise(r => c.toBlob(b => r(b!), 'image/png'))
}
