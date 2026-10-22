// Bridge so global keyboard shortcuts (App) can drive the swipe deck (SwipeView).
export type SwipeAct = 'like' | 'nope' | 'open'
export const swipeApi = {
  commit: (_a: SwipeAct) => {},
  undo: () => {},
  shuffle: () => {},
}

export const OKLIC = /^(MIT|ISC|Apache|CC0|CC-BY-[0-9]|CC-BY-SA|MPL|BSD|OFL|Unlicense)/i
export const TOP = ['lucide', 'tabler', 'ph', 'mingcute', 'ri', 'solar', 'iconoir', 'heroicons', 'carbon', 'fluent', 'material-symbols', 'mdi', 'tdesign', 'icon-park-outline', 'hugeicons', 'akar-icons', 'radix-icons', 'majesticons', 'uil', 'bx', 'line-md', 'svg-spinners', 'logos', 'skill-icons', 'devicon', 'octicon', 'simple-icons', 'proicons', 'basil', 'streamline']

export function hash(s: string) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}
export function rng(a: number) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
