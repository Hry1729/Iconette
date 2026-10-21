import { reactive } from 'vue'
import { load } from './iconify'
import { code, fmtLabel, pngBlob } from './format'
import { copyPng, copyText } from './native'
import { R, S, addRecent, toggleFav } from './store'
import { t } from './i18n'

export const toastState = reactive({ show: false, msg: '', icon: 'lucide:check' })
let tt: ReturnType<typeof setTimeout> | undefined
export function toast(msg: string, icon = 'lucide:check') {
  Object.assign(toastState, { show: true, msg, icon })
  clearTimeout(tt)
  tt = setTimeout(() => { toastState.show = false }, 1300)
}

export async function select(id: string, scroll = false) {
  R.sel = id
  if (scroll) requestAnimationFrame(() => document.querySelector(`.t[data-ic="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' }))
  await load([id])
}
export function clearSel() { R.sel = null; R.pop = null }

export async function copy(id = R.sel) {
  if (!id) return
  await load([id])
  try {
    if (S.fmt === 'png') {
      const ink = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#1c1c1e'
      await copyPng(await pngBlob(id, ink))
    }
    else { await copyText(code(id)) }
    addRecent(id)
    toast(`${t('copied')} ${fmtLabel()}`)
  }
  catch (e) {
    console.error(e)
    toast(String(e), 'lucide:x')
  }
}

export function like(id = R.sel) {
  if (!id) return
  const on = toggleFav(id)
  toast(on ? t('favd') : t('unfavd'), on ? 'ph:heart-fill' : 'lucide:heart-off')
}

/** Tile click: select, and copy right away when "click to copy" is on. */
export function pick(id: string) {
  select(id)
  if (S.click) copy(id)
}
