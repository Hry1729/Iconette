<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import TitleBar from './components/TitleBar.vue'
import Pop from './components/Pop.vue'
import Toast from './components/Toast.vue'
import OtherPop from './components/OtherPop.vue'
import FolderPop from './components/FolderPop.vue'
import UiIcon from './components/UiIcon.vue'
import ShortcutItem from './components/ShortcutItem.vue'
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
watchEffect(() => { setTrayLabels([t('showMain'), t('quick'), t('quitApp')]) })

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
  await loadInfo(S.sets)
  ensureAll()
})
</script>

<template>
  <div class="win" :data-mode="R.mode" :style="{ '--icolor': S.color || 'var(--ink)' }">
    <TitleBar />
    <component :is="view" @copy="(id: string) => copy(id)" @enter="R.list[0] && select(R.list[0], true)" />

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
    </Pop>
    <Pop id="cmp" :w="300"><OtherPop /></Pop>
    <Pop id="folder" :w="210"><FolderPop /></Pop>
    <Toast />
  </div>
</template>
