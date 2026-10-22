<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import TitleBar from './components/TitleBar.vue'
import DetailBar from './components/DetailBar.vue'
import Pop from './components/Pop.vue'
import Toast from './components/Toast.vue'
import UiIcon from './components/UiIcon.vue'
import SearchView from './views/SearchView.vue'
import FavView from './views/FavView.vue'
import SoonView from './views/SoonView.vue'
import SetsView from './views/SetsView.vue'
import { R, S, type Mode } from './lib/store'
import { t } from './lib/i18n'
import { ensureAll, loadInfo } from './lib/iconify'
import { FMTS, fmtLabel } from './lib/format'
import { clearSel, copy, like, select, setMode } from './lib/actions'
import { registerGlobalShortcut } from './lib/native'

const bar = ref<InstanceType<typeof TitleBar>>()
const view = computed(() => R.mode === 'search' ? SearchView : R.mode === 'fav' ? FavView : R.mode === 'sets' ? SetsView : SoonView)
const COLORS = [null, '#1c1c1e', '#ffffff', '#e5484d', '#f5a524', '#30a46c', '#3e63dd', '#8e4ec6']
const CHECKER = 'conic-gradient(#999 0 25%,#ddd 0 50%,#999 0 75%,#ddd 0)'

// theme
const mq = matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => { document.body.dataset.theme = S.theme === 'system' ? (mq.matches ? 'dark' : 'light') : S.theme }
watchEffect(applyTheme)
mq.addEventListener('change', applyTheme)
watchEffect(() => { document.documentElement.lang = S.lang === 'zh' ? 'zh-CN' : 'en' })


function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); setMode((['search', 'sets', 'swipe', 'fav'] as Mode[])[+e.key - 1]); return }
  const typing = (document.activeElement as HTMLElement)?.tagName === 'INPUT'
  if (e.key === 'Escape') {
    if (R.pop) R.pop = null
    else if (R.sel) clearSel()
    else if (R.mode === 'search') { R.q = ''; R.set = null }
    return
  }
  if (typing) return
  if (e.key === '/') { e.preventDefault(); bar.value?.focus(); return }
  if (!R.sel) { if (e.key.length === 1 && /\w/.test(e.key) && !e.metaKey && !e.ctrlKey) bar.value?.focus(); return }
  if (e.key === 'Enter') { e.preventDefault(); copy(); return }
  if (e.key.toLowerCase() === 'f') { like(); return }
  const ts = [...document.querySelectorAll<HTMLElement>('.body .t')]
  const i = ts.findIndex(x => x.dataset.ic === R.sel)
  if (i < 0) return
  let c = 1
  while (c < ts.length && ts[c].offsetTop === ts[0].offsetTop) c++
  const j = ({ ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + c, ArrowUp: i - c } as Record<string, number>)[e.key]
  if (j !== undefined && ts[j]) { e.preventDefault(); select(ts[j].dataset.ic!, true) }
}

onMounted(async () => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.pop')) R.pop = null })
  registerGlobalShortcut(() => bar.value?.focus())
  bar.value?.focus()
  await loadInfo(S.sets)
  ensureAll()
})
</script>

<template>
  <div class="win" :style="{ '--icolor': S.color || 'var(--ink)' }">
    <TitleBar ref="bar" @enter="R.list[0] && select(R.list[0], true)" />
    <component :is="view" @copy="(id: string) => copy(id)" />
    <DetailBar />

    <Pop id="color" style="right:150px;top:46px;width:220px">
      <div class="lbl">{{ t('iconColor') }}</div>
      <div class="sw"><button v-for="c in COLORS" :key="String(c)" :class="{ on: c === S.color }" :style="{ background: c || CHECKER }" :title="c || 'currentColor'" @click="S.color = c" /></div>
    </Pop>
    <Pop id="tune" style="right:150px;bottom:58px;width:220px">
      <div class="lbl">{{ t('color') }}</div>
      <div class="sw"><button v-for="c in COLORS" :key="String(c)" :class="{ on: c === S.color }" :style="{ background: c || CHECKER }" @click="S.color = c" /></div>
      <div class="lbl">{{ t('size') }}</div>
      <div class="sz"><input v-model.number="S.size" type="range" min="12" max="96"><span>{{ S.size }}px</span></div>
    </Pop>
    <Pop id="fmt" style="right:92px;bottom:58px;width:170px">
      <div class="lbl">{{ t('format') }}</div>
      <button v-for="[k] in FMTS" :key="k" class="it" :class="{ on: k === S.fmt }" @click="S.fmt = k; R.pop = null">{{ fmtLabel(k) }}<span class="r ck">✓</span></button>
    </Pop>
    <Pop id="menu" style="right:12px;top:46px;width:210px">
      <div class="lbl">{{ t('theme') }}</div>
      <button v-for="[k, ic, l] in [['system', 'lucide:monitor', 'sys'], ['light', 'lucide:sun', 'light'], ['dark', 'lucide:moon', 'dark']] as const" :key="k" class="it" :class="{ on: S.theme === k }" @click="S.theme = k">
        <UiIcon :name="ic" />{{ t(l) }}<span class="r ck">✓</span>
      </button>
      <hr>
      <button class="it" @click="S.lang = S.lang === 'zh' ? 'en' : 'zh'"><UiIcon name="lucide:languages" />{{ t('lang') }}<span class="r">{{ S.lang === 'zh' ? '中文' : 'English' }}</span></button>
      <button class="it" :class="{ on: S.click }" @click="S.click = !S.click"><UiIcon name="lucide:mouse-pointer-click" />{{ t('clickCopy') }}<span class="r ck">✓</span></button>
      <button class="it"><UiIcon name="lucide:zap" />{{ t('quick') }}<span class="r">Alt Space</span></button>
    </Pop>
    <Toast />
  </div>
</template>
