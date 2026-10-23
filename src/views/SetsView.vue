<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SetCard from '../components/SetCard.vue'
import UICard from '../components/UICard.vue'
import DemoFrame from '../components/DemoFrame.vue'
import Heart from '../components/Heart.vue'
import UiIcon from '../components/UiIcon.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, ensureAll } from '../lib/iconify'
import { DEMOS, UI, UIK, UIL, type UILib, compMatch, udesc, ukl } from '../lib/ui-libs'
import { copyRaw, likeUI, openLib } from '../lib/actions'
import { modKey, openUrl } from '../lib/native'
import { TOP } from '../lib/swipe'
import { focusApi } from '../lib/swipe'

// Debounced query so the side-by-side component iframes are not rebuilt on every keystroke.
const q = ref('')
let deb: ReturnType<typeof setTimeout> | undefined
watch(() => R.q, (v) => { clearTimeout(deb); deb = setTimeout(() => { q.value = v.trim().toLowerCase() }, 160) }, { immediate: true })
const body = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const scrolled = ref(false)
watch(() => [R.res, R.lib, R.cat, R.fw], () => body.value?.scrollTo(0, 0))

function setRes(r: 'icons' | 'ui') { R.res = r; R.lib = null; R.q = '' }

// ---- icon sets
ensureAll()
const sort = ref<'hot' | 'name'>('hot')
const ent = computed(() => Object.entries(INFO).filter(([, s]) => !s.hidden))
const cats = computed(() => {
  const c: Record<string, number> = {}
  for (const [, s] of ent.value) c[s.category || 'Other'] = (c[s.category || 'Other'] || 0) + 1
  return Object.entries(c)
})
const sets = computed(() => {
  const L = ent.value.filter(([p, s]) => (!R.cat || (s.category || 'Other') === R.cat) && (!q.value || `${p} ${s.name || ''} ${s.author?.name || ''} ${s.category || ''}`.toLowerCase().includes(q.value))).map(([p]) => p)
  if (sort.value === 'name') return L.sort((a, b) => (INFO[a].name || a).localeCompare(INFO[b].name || b))
  const top = (p: string) => { const i = TOP.indexOf(p); return i < 0 ? 999 : i }
  return L.map((p, i) => [p, i] as const).sort((a, b) => (top(a[0]) - top(b[0])) || a[1] - b[1]).map(x => x[0])
})

// ---- component libraries
const uiList = computed(() => UIL.filter(l => (!R.fw || l.fw === R.fw) && (!q.value || (l.name + l.zh + l.en + l.fw).toLowerCase().includes(q.value))))
const uiGroups = computed(() => {
  const out: [string, UILib[]][] = []
  for (const fw of ['React', 'Vue']) {
    const a = uiList.value.filter(l => l.fw === fw)
    for (const e of new Set(a.filter(l => l.eco).map(l => l.eco!))) out.push([`${fw} · ${e} ${t('eco')}`, a.filter(l => l.eco === e)])
    const solo = a.filter(l => !l.eco)
    if (solo.length) out.push([`${fw} · ${t('solo')}`, solo])
  }
  return out
})
const cmpKeys = computed(() => compMatch(q.value).slice(0, 2))
const cmpLibs = computed(() => DEMOS.filter(l => !R.fw || l.fw === R.fw))
const lib = computed(() => (R.lib ? UI(R.lib) : null))
const libOn = computed(() => !!R.lib && S.uiFav.includes(R.lib))
const allKeys = UIK.map(k => k[0])
const fwN = (f: string) => UIL.filter(l => !f || l.fw === f).length

function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && R.q) { e.stopPropagation(); R.q = '' } }
onMounted(() => { focusApi.focus = () => input.value?.focus(); nextTick(() => input.value?.focus()) })
onBeforeUnmount(() => { focusApi.focus = () => {} })
</script>

<template>
  <div class="body res-v" :class="{ scrolled }">
    <div class="rtop">
      <div class="rseg">
        <button :class="{ on: R.res !== 'ui' }" @click="setRes('icons')">{{ t('tSets') }}<small>{{ ent.length || '' }}</small></button>
        <button :class="{ on: R.res === 'ui' }" @click="setRes('ui')">{{ t('tUI') }}<small>{{ UIL.length }}</small></button>
      </div>
      <label class="isearch">
        <UiIcon name="lucide:search" />
        <input ref="input" v-model="R.q" :placeholder="R.res === 'ui' ? t('phUIN', { n: UIL.length }) : t('phSetsN', { n: ent.length || '200+' })" spellcheck="false" autocomplete="off" @keydown="onKey">
        <kbd>{{ modKey.trim() }}K</kbd>
      </label>
      <button v-if="R.res !== 'ui'" class="qbtn" @click="sort = sort === 'hot' ? 'name' : 'hot'"><UiIcon name="lucide:arrow-up-down" />{{ t(sort === 'hot' ? 'sortHot' : 'sortName') }}</button>
    </div>
    <div class="cats">
      <template v-if="R.res !== 'ui'">
        <button :class="{ on: !R.cat }" @click="R.cat = null">{{ t('all') }}<small>{{ ent.length }}</small></button>
        <button v-for="[c, n] in cats" :key="c" :class="{ on: R.cat === c }" @click="R.cat = c">{{ c }}<small>{{ n }}</small></button>
      </template>
      <template v-else-if="!lib">
        <button v-for="f in ['', 'React', 'Vue']" :key="f" :class="{ on: (R.fw || '') === f }" @click="R.fw = f || null">{{ f || t('all') }}<small>{{ fwN(f) }}</small></button>
      </template>
      <template v-else>
        <button @click="R.lib = null"><UiIcon name="lucide:chevron-left" />{{ t('allUI') }}</button>
        <button v-for="x in DEMOS" :key="x.id" :class="{ on: x.id === R.lib }" @click="openLib(x.id)">{{ x.name }}<small>{{ x.fw }}</small></button>
      </template>
    </div>

    <div ref="body" class="vs" @scroll="scrolled = ($event.target as HTMLElement).scrollTop > 4">
      <!-- icon sets -->
      <template v-if="R.res !== 'ui'">
        <div v-if="!ent.length" class="rempty">…</div>
        <div v-else-if="!sets.length" class="rempty">{{ t('none') }}</div>
        <div v-else class="sgrid"><SetCard v-for="(p, i) in sets" :key="p" :p="p" :q="q" :delay="Math.min(i, 20) * 25" /></div>
      </template>

      <!-- library page -->
      <template v-else-if="lib">
        <div class="libh">
          <div>
            <h2>{{ lib.name }} <span class="tagc">{{ lib.fw }}</span><span v-if="lib.eco && lib.eco !== lib.name" class="tagc">{{ lib.eco }} {{ t('eco') }}</span></h2>
            <p>{{ udesc(lib) }}</p>
          </div>
          <span class="sp" />
          <button class="ib" :class="{ on: libOn }" :title="t('like')" @click="likeUI(lib.id)"><Heart :on="libOn" /></button>
          <button class="pill" :title="lib.install" @click="copyRaw(lib.install, `${t('copied')} · ${lib.install}`)"><UiIcon name="lucide:terminal" />{{ t('copyInstall') }}</button>
          <a class="pill" href="#" @click.prevent="openUrl(lib.url)"><UiIcon name="lucide:external-link" />{{ t('site') }}</a>
        </div>
        <div v-if="lib.demo" class="ltabs">
          <button :class="{ on: R.libTab !== 'grid' }" @click="R.libTab = 'dash'">{{ t('ltDash') }}</button>
          <button :class="{ on: R.libTab === 'grid' }" @click="R.libTab = 'grid'">{{ t('ltGrid') }}</button>
        </div>
        <div class="libg">
          <template v-if="lib.demo">
            <DemoFrame v-if="R.libTab === 'grid'" :key="`${lib.id}-grid`" :lib="lib.id" :keys="allKeys" cls="grid9" />
            <DemoFrame v-else :key="`${lib.id}-dash`" :lib="lib.id" keys="dash" cls="dashf" />
          </template>
          <div v-else class="rempty" style="height:300px"><div><h2>{{ t('soon') }}</h2><div>{{ t('soonSub') }}</div></div></div>
        </div>
      </template>

      <!-- component libraries -->
      <template v-else>
        <template v-for="k in cmpKeys" :key="k">
          <div class="secth"><b>{{ ukl(k) }}</b><span>{{ t('cmpN', { n: cmpLibs.length }) }}</span></div>
          <div class="cmp">
            <div v-for="l in cmpLibs" :key="l.id" class="cmpc">
              <div class="cmph"><b>{{ l.name }}</b><small>{{ l.fw }}</small><span class="sp" /><button class="pill sm" @click="openLib(l.id)">{{ t('toLib') }}</button></div>
              <div class="cmpb"><DemoFrame :lib="l.id" :keys="[k]" cls="one" /></div>
            </div>
          </div>
        </template>
        <template v-for="[n, ls] in uiGroups" :key="n">
          <div class="secth"><b>{{ n }}</b><span>{{ ls.length }}</span></div>
          <div class="sgrid"><UICard v-for="(l, i) in ls" :key="l.id" :l="l" :delay="i * 25" /></div>
        </template>
        <div v-if="!uiGroups.length && !cmpKeys.length" class="rempty">{{ t('none') }}</div>
      </template>
    </div>
  </div>
</template>
