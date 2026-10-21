import { reactive, watch } from 'vue'

export type Mode = 'search' | 'sets' | 'swipe' | 'fav'
export type Fmt = 'svg' | 'png' | 'vue' | 'jsx' | 'unocss' | 'iconify' | 'dataurl' | 'name'

const KEY = 'icones-desktop:v1'

const defaults = {
  lang: 'zh' as 'zh' | 'en',
  theme: 'system' as 'system' | 'light' | 'dark',
  fmt: 'svg' as Fmt,
  click: false,
  favs: [] as string[],
  folders: {} as Record<string, string[]>,
  recent: [] as string[],
  color: null as string | null,
  size: 24,
  sets: ['lucide', 'ph', 'tabler', 'mingcute', 'material-symbols', 'ri', 'logos'],
}

function read(): Partial<typeof defaults> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}

/** Persistent settings (saved to the webview's localStorage, per user, survives updates). */
export const S = reactive({ ...defaults, ...read() })
watch(S, () => localStorage.setItem(KEY, JSON.stringify(S)), { deep: true })

/** Runtime UI state. */
export const R = reactive({
  mode: 'search' as Mode,
  q: '',
  set: null as string | null,
  sel: null as string | null,
  list: [] as string[],
  pop: null as string | null,
  quick: false,
})

export function addRecent(id: string) {
  S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0, 80)
}

export function toggleFav(id: string): boolean {
  const i = S.favs.indexOf(id)
  if (i > -1) {
    S.favs.splice(i, 1)
    for (const f in S.folders) S.folders[f] = S.folders[f].filter(x => x !== id)
    return false
  }
  S.favs.unshift(id)
  return true
}

export function toggleSet(p: string): boolean {
  const i = S.sets.indexOf(p)
  if (i > -1) { S.sets.splice(i, 1); return false }
  S.sets.push(p)
  return true
}
