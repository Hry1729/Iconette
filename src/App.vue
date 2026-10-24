<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import TitleBar from './components/TitleBar.vue'
import Pop from './components/Pop.vue'
import Toast from './components/Toast.vue'
import OtherPop from './components/OtherPop.vue'
import FolderPop from './components/FolderPop.vue'
import UiIcon from './components/UiIcon.vue'
import ShortcutItem from './components/ShortcutItem.vue'
import FavIO from './components/FavIO.vue'
import UpdateTip from './components/UpdateTip.vue'
import { autoCheck, checkUpdate, installUpdate, upd } from './lib/update'
import SearchView from './views/SearchView.vue'
import FavView from './views/FavView.vue'
import SwipeView from './views/SwipeView.vue'
import SetsView from './views/SetsView.vue'
import { R, S, type Mode } from './lib/store'
import { t } from './lib/i18n'
import { ensureAll, loadInfo } from './lib/iconify'
import { FMTS, fmtLabel } from './lib/format'
import { clearSel, copy, like, select, setMode } from './lib/actions'
import { accelFromEvent, autostartEnabled, inTauri, isMac, quickAccel, quickKey, setAutostart, setCloseToTray, setTrayLabels, toggleQuick } from './lib/native'
import { focusApi, swipeApi } from './lib/swipe'
import { pageFx, reduced } from './lib/fx'
import { anim } from './lib/iso'

const view = computed(() => R.mode === 'search' ? SearchView : R.mode === 'fav' ? FavView : R.mode === 'sets' ? SetsView : SwipeView)
const COLORS = [null, '#1c1c1e', '#ffffff', '#e5484d', '#f5a524', '#30a46c', '#3e63dd', '#8e4ec6']
const CHECKER = 'conic-gradient(#999 0 25%,#ddd 0 50%,#999 0 75%,#ddd 0)'

// theme
const mq = matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => { document.body.dataset.theme = S.theme === 'system' ? (mq.matches ? 'dark' : 'light') : S.theme }
watchEffect(applyTheme)
mq.addEventListener('change', applyTheme)
watchEffect(() => { document.documentElement.lang = S.lang === 'zh' ? 'zh-CN' : 'en' })
document.body.classList.toggle('mac', isMac)

function openQuick() {
  R.pop = null
  if (inTauri) toggleQuick()
  else window.open('quick.html', 'iconette-quick', 'width=560,height=248')
}
const autostart = ref(false)
async function toggleAutostart() {
  try { await setAutostart(!autostart.value); autostart.value = !autostart.value }
  catch (e) { console.warn(e) }
}
watchEffect(() => { setCloseToTray(S.closeToTray) })
const updLabel = computed(() => ({ checking: t('updChecking'), latest: t('updLatest'), avail: `v${upd.ver}`, downloading: `${upd.pct}%`, installing: '…', manual: `v${upd.ver}`, failed: t('updE_other'), error: t('updFail') } as Record<string, string>)[upd.state] || `v${upd.cur}`)
watchEffect(() => { setTrayLabels([t('showMain'), t('quick'), t('quitApp')]) })

// ---- page switches: no out-in; the old page becomes a frozen layer that plays its exit while the new page is live
function onLeave(el: Element, done: () => void) {
  const e = el as HTMLElement
  const win = document.querySelector('.win')!
  const r = e.getBoundingClientRect()
  const wr = win.getBoundingClientRect()
  e.classList.add('leaving')
  e.style.cssText += `;position:absolute;left:${r.left - wr.left}px;top:${r.top - wr.top}px;width:${r.width}px;height:${r.height}px;flex:none;margin:0`
  const p = pageFx.pending
  pageFx.pending = null
  const job = reduced()
    ? Promise.resolve()
    : p?.fn ? p.fn(e, p.to) : anim(e, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' }).finished
  Promise.resolve(job).catch(() => {}).finally(done)
}
function onEnter(el: Element, done: () => void) {
  const self = pageFx.selfEnter
  pageFx.selfEnter = false
  if (self || reduced()) { done(); return }
  anim(el as HTMLElement, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.catch(() => {}).finally(done)
}

/** Arrow-key navigation over icon tiles by geometry (works across grouped grids). */
function nav(key: string) {
  const ts = [...document.querySelectorAll<HTMLElement>('.body .t')].filter(x => x.offsetParent)
  const cur = ts.find(x => x.dataset.ic === R.sel)
  if (!cur) return false
  const i = ts.indexOf(cur)
  let nx: HTMLElement | undefined
  if (key === 'ArrowRight') nx = ts[i + 1]
  else if (key === 'ArrowLeft') nx = ts[i - 1]
  else {
    const r0 = cur.getBoundingClientRect()
    const cx = r0.left + r0.width / 2
    const down = key === 'ArrowDown'
    const rows = ts.map(x => ({ x, r: x.getBoundingClientRect() })).filter(o => (down ? o.r.top > r0.top + 4 : o.r.top < r0.top - 4))
    if (!rows.length) return true
    const rowTop = down ? Math.min(...rows.map(o => o.r.top)) : Math.max(...rows.map(o => o.r.top))
    nx = rows.filter(o => Math.abs(o.r.top - rowTop) < 4).sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx))[0]?.x
  }
  if (nx) select(nx.dataset.ic!, true)
  return true
}

function onKey(e: KeyboardEvent) {
  if (!inTauri && quickAccel.value && accelFromEvent(e) === quickAccel.value) { e.preventDefault(); openQuick(); return }
  if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); setMode((['search', 'sets', 'swipe', 'fav'] as Mode[])[+e.key - 1]); return }
  if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
    e.preventDefault()
    if (R.mode === 'swipe') setMode('search')
    requestAnimationFrame(() => focusApi.focus())
    return
  }
  const typing = ['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)
  if (e.key === 'Escape') {
    if (R.pop) R.pop = null
    else if (R.sel) clearSel()
    else if (R.mode === 'search') { R.q = ''; R.set = null }
    return
  }
  if (typing) return
  if (R.mode === 'swipe') {
    if (S.swView === 'gacha') {
      if (e.code === 'Space') { e.preventDefault(); swipeApi.space() }
      if (e.key === 'ArrowRight') { e.preventDefault(); swipeApi.keep() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); swipeApi.back() }
      return
    }
    const a = ({ ArrowRight: 'like', ArrowLeft: 'nope', ArrowUp: 'open', Enter: 'open' } as const)[e.key as 'Enter']
    if (a) { e.preventDefault(); swipeApi.commit(a) }
    if (e.key.toLowerCase() === 'z') swipeApi.undo()
    if (e.key.toLowerCase() === 'r') swipeApi.shuffle()
    return
  }
  if (e.key === '/') { e.preventDefault(); focusApi.focus(); return }
  if (!R.sel) { if (e.key.length === 1 && /\w/.test(e.key) && !e.metaKey && !e.ctrlKey && R.mode !== 'sets') focusApi.focus(); return }
  if (e.key === 'Enter') { e.preventDefault(); copy(); return }
  if (e.key.toLowerCase() === 'f') { like(); return }
  if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key) && nav(e.key)) e.preventDefault()
}

onMounted(async () => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.pop')) R.pop = null })
  if (inTauri) autostart.value = await autostartEnabled()
  if (inTauri) autoCheck()
  await loadInfo(S.sets)
  ensureAll()
})
</script>

<template>
  <div class="win" :data-mode="R.mode" :style="{ '--icolor': S.color || 'var(--ink)' }">
    <TitleBar />
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <component :is="view" :key="R.mode" @copy="(id: string) => copy(id)" @enter="R.list[0] && select(R.list[0], true)" />
    </Transition>

    <Pop id="color" :w="228">
      <div class="lbl">{{ t('iconColor') }}</div>
      <div class="sw"><button v-for="c in COLORS" :key="String(c)" :class="{ on: c === S.color }" :style="{ background: c || CHECKER }" :title="c || 'currentColor'" @click="S.color = c" /></div>
    </Pop>
    <Pop id="size" :w="228">
      <div class="lbl">{{ t('size') }}</div>
      <div class="sz"><input v-model.number="S.size" type="range" min="12" max="96"><span>{{ S.size }}px</span></div>
    </Pop>
    <Pop id="fmt" :w="180">
      <div class="lbl">{{ t('format') }}</div>
      <button v-for="[k] in FMTS" :key="k" class="it" :class="{ on: k === S.fmt }" @click="S.fmt = k; R.pop = null">{{ fmtLabel(k) }}<span class="r ck">✓</span></button>
    </Pop>
    <Pop id="menu" :w="220" place="below">
      <div class="lbl">{{ t('theme') }}</div>
      <button v-for="[k, ic, l] in [['system', 'lucide:monitor', 'sys'], ['light', 'lucide:sun', 'light'], ['dark', 'lucide:moon', 'dark']] as const" :key="k" class="it" :class="{ on: S.theme === k }" @click="S.theme = k">
        <UiIcon :name="ic" />{{ t(l) }}<span class="r ck">✓</span>
      </button>
      <hr>
      <button class="it" @click="S.lang = S.lang === 'zh' ? 'en' : 'zh'"><UiIcon name="lucide:languages" />{{ t('lang') }}<span class="r">{{ S.lang === 'zh' ? '中文' : 'English' }}</span></button>
      <button class="it" :class="{ on: S.click }" @click="S.click = !S.click"><UiIcon name="lucide:mouse-pointer-click" />{{ t('clickCopy') }}<span class="r ck">✓</span></button>
      <button class="it" @click="openQuick"><UiIcon name="lucide:zap" />{{ t('quick') }}<span v-if="quickKey" class="r">{{ quickKey }}</span></button>
      <ShortcutItem />
      <template v-if="inTauri">
        <hr>
        <button class="it" :class="{ on: S.closeToTray }" @click="S.closeToTray = !S.closeToTray"><UiIcon name="lucide:app-window" />{{ t('closeTray') }}<span class="r ck">✓</span></button>
        <button class="it" :class="{ on: autostart }" @click="toggleAutostart"><UiIcon name="lucide:power" />{{ t('autostart') }}<span class="r ck">✓</span></button>
      </template>
      <hr>
      <FavIO />
      <hr>
      <button class="it" @click="['avail', 'failed', 'manual'].includes(upd.state) ? installUpdate() : checkUpdate()"><UiIcon name="lucide:refresh-cw" />{{ t('updCheck') }}<span class="r" :class="{ upd: ['avail', 'downloading', 'installing'].includes(upd.state) }">{{ updLabel }}</span></button>
    </Pop>
    <Pop id="cmp" :w="300"><OtherPop /></Pop>
    <Pop id="folder" :w="210"><FolderPop /></Pop>
    <Toast />
    <UpdateTip />
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><radialGradient id="inkGlow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><pattern id="inkGrain" patternUnits="userSpaceOnUse" width="14" height="14"><g fill="#7a7a7a"><circle cx="4.53" cy="2.11" r="0.24"/><circle cx="1.01" cy="7.50" r="0.19"/><circle cx="0.81" cy="7.10" r="0.13"/><circle cx="6.07" cy="0.98" r="0.14"/><circle cx="5.94" cy="11.58" r="0.14"/><circle cx="3.13" cy="8.78" r="0.29"/><circle cx="8.08" cy="5.55" r="0.30"/><circle cx="0.65" cy="12.02" r="0.17"/><circle cx="2.02" cy="1.65" r="0.18"/><circle cx="11.43" cy="2.53" r="0.22"/><circle cx="8.94" cy="5.21" r="0.22"/><circle cx="0.88" cy="0.83" r="0.16"/><circle cx="9.53" cy="5.99" r="0.18"/><circle cx="8.20" cy="6.34" r="0.17"/><circle cx="11.12" cy="9.79" r="0.16"/><circle cx="8.04" cy="7.35" r="0.28"/><circle cx="10.21" cy="4.03" r="0.30"/><circle cx="1.65" cy="5.85" r="0.26"/><circle cx="2.13" cy="6.85" r="0.13"/><circle cx="9.36" cy="10.70" r="0.22"/><circle cx="12.26" cy="4.39" r="0.25"/><circle cx="8.32" cy="8.12" r="0.20"/><circle cx="11.76" cy="13.23" r="0.21"/><circle cx="9.30" cy="0.85" r="0.25"/><circle cx="9.06" cy="13.90" r="0.27"/><circle cx="3.98" cy="5.40" r="0.24"/><circle cx="0.32" cy="6.46" r="0.15"/><circle cx="1.64" cy="0.83" r="0.26"/><circle cx="1.81" cy="3.47" r="0.19"/><circle cx="12.20" cy="1.13" r="0.20"/><circle cx="7.69" cy="12.37" r="0.27"/><circle cx="12.10" cy="3.90" r="0.19"/><circle cx="5.02" cy="12.38" r="0.29"/><circle cx="2.11" cy="2.47" r="0.16"/><circle cx="3.27" cy="6.79" r="0.23"/><circle cx="3.68" cy="0.06" r="0.20"/><circle cx="5.17" cy="7.93" r="0.29"/><circle cx="9.67" cy="7.22" r="0.23"/><circle cx="9.47" cy="0.76" r="0.28"/><circle cx="10.92" cy="12.24" r="0.26"/><circle cx="5.49" cy="5.59" r="0.14"/><circle cx="8.88" cy="0.87" r="0.13"/><circle cx="2.92" cy="2.27" r="0.18"/><circle cx="0.74" cy="0.00" r="0.15"/><circle cx="1.42" cy="5.09" r="0.12"/><circle cx="12.24" cy="8.60" r="0.15"/></g></pattern></defs></svg>
  </div>
</template>
