import { reactive } from 'vue'
import { load } from './iconify'
import { shortName } from './iconify'
import { code, fmtLabel, pngBlob } from './format'
import { copyPng, copyText } from './native'
import { R, S, type Mode, addRecent, toggleFav, toggleSet, toggleUI } from './store'
import { t } from './i18n'
import { UI, ukl } from './ui-libs'

export const toastState = reactive({ show: false, msg: '', icon: 'lucide:check' })
let tt: ReturnType<typeof setTimeout> | undefined
export function toast(msg: string, icon = 'lucide:check') {
  Object.assign(toastState, { show: true, msg, icon })
  clearTimeout(tt)
  tt = setTimeout(() => { toastState.show = false }, 1300)
}

export function setMode(m: Mode) {
  R.mode = m
  R.sel = null
  R.q = ''
  R.set = null
  R.pop = null
}

export async function select(id: string, scroll = false) {
  R.sel = id
  if (scroll) requestAnimationFrame(() => document.querySelector(`.body .t[data-ic="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' }))
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

export async function copyRaw(text: string, msg: string) {
  await copyText(text)
  toast(msg)
}

export function like(id = R.sel) {
  if (!id) return
  const on = toggleFav(id)
  toast(on ? t('favd') : t('unfavd'), on ? 'ph:heart-fill' : 'lucide:heart-off')
}

export function likeSet(p: string) {
  const on = toggleSet(p)
  toast(on ? t('likedSet', { n: shortName(p) }) : t('unlikedSet'), on ? 'ph:heart-fill' : 'lucide:heart-off')
}

/** Save / unsave a component library ("mantine") or a component ("mantine/button"). */
export function likeUI(id: string) {
  const on = toggleUI(id)
  const [l, k] = id.split('/')
  toast(!on ? t('unfavd') : k ? `${t('favd')} · ${UI(l).name} ${ukl(k)}` : t('likedSet', { n: UI(l).name }), on ? 'ph:heart-fill' : 'lucide:heart-off')
}

/** Open a component library page in Resources. */
export function openLib(id: string) {
  if (R.mode !== 'sets') setMode('sets')
  R.res = 'ui'
  R.lib = id
  R.q = ''
}

/** Open an icon set (its icons in Find). */
export function openSet(p: string) {
  setMode('search')
  R.set = p
}

/** Tile click: select, and copy right away when "click to copy" is on. */
export function pick(id: string) {
  select(id)
  if (S.click) copy(id)
}
