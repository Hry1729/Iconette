// B2 其他风格: the same icon name in other icon sets.
import { API, J } from './iconify'
import { S } from './store'

const STY = ['lucide', 'ph', 'tabler', 'mingcute', 'material-symbols', 'ri', 'mdi', 'carbon', 'heroicons', 'iconoir', 'solar', 'fluent', 'hugeicons', 'akar-icons']
export const baseName = (n: string) => n
  .replace(/-(outline|outlined|line|fill|filled|solid|bold|thin|light|duotone|rounded|sharp|regular|broken|linear|twotone|2|20-regular|24-regular|24-filled|20-filled)$/g, '')
  .replace(/-(outline|line|fill|filled|solid|bold|rounded|regular)$/, '')

const memo = new Map<string, string[]>()
/** The selected icon first, then up to 18 same-name icons, one per set (saved sets first). */
export async function otherStyles(id: string): Promise<string[]> {
  if (memo.has(id)) return memo.get(id)!
  const nm = baseName(id.split(':')[1])
  const pre = [...new Set([...S.sets, ...STY])].slice(0, 24)
  let icons: string[] = []
  try { icons = (await J(`${API}/search?query=${encodeURIComponent(nm)}&limit=400&prefixes=${pre.join(',')}`)).icons || [] }
  catch { return [id] }
  const by: Record<string, string> = {}
  for (const x of icons) {
    const [pp, n] = x.split(':')
    if (baseName(n) !== nm && n !== nm) continue
    if (!by[pp] || n === nm) by[pp] = x
  }
  const ids = [id, ...pre.map(pp => by[pp]).filter(Boolean).filter(x => x !== id).slice(0, 18)]
  memo.set(id, ids)
  return ids
}
