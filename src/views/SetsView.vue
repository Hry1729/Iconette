<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { openUrl } from '../lib/native'

// Debounced query so the side-by-side component iframes are not rebuilt on every keystroke.
const q = ref('')
let deb: ReturnType<typeof setTimeout> | undefined
watch(() => R.q, (v) => { clearTimeout(deb); deb = setTimeout(() => { q.value = v.trim().toLowerCase() }, 220) }, { immediate: true })
const body = ref<HTMLElement>()
watch(() => [R.res, R.lib, R.cat, R.fw], () => body.value?.scrollTo(0, 0))

function setRes(r: 'icons' | 'ui') { R.res = r; R.lib = null; R.q = '' }

// ---- icon sets
ensureAll()
const ent = computed(() => Object.entries(INFO).filter(([, s]) => !s.hidden))
const cats = computed(() => [...new Set(ent.value.map(([, s]) => s.category || 'Other'))])
const groups = computed(() => {
  const g: Record<string, string[]> = {}
  for (const [p, s] of ent.value) {
    const c = s.category || 'Other'
    if (R.cat && c !== R.cat) continue
    if (q.value && !`${p} ${s.name || ''}`.toLowerCase().includes(q.value)) continue
    ;(g[c] ||= []).push(p)
  }
  return Object.entries(g)
})

// ---- component libraries
const uiGroups = computed(() => {
  const list = UIL.filter(l => (!R.fw || l.fw === R.fw) && (!q.value || (l.name + l.zh + l.en).toLowerCase().includes(q.value)))
  const out: [string, UILib[]][] = []
  for (const fw of ['React', 'Vue']) {
    const a = list.filter(l => l.fw === fw)
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
</script>

<template>
  <nav class="rail">
    <button class="st" :class="{ on: R.res !== 'ui' }" @click="setRes('icons')">{{ t('tSets') }}</button>
    <button class="st" :class="{ on: R.res === 'ui' }" @click="setRes('ui')">{{ t('tUI') }}</button>
    <span class="div" />
    <template v-if="R.res !== 'ui'">
      <button class="st" :class="{ on: !R.cat }" @click="R.cat = null">{{ t('all') }}<em>{{ ent.length }}</em></button>
      <button v-for="c in cats" :key="c" class="st" :class="{ on: R.cat === c }" @click="R.cat = c">{{ c }}</button>
    </template>
    <template v-else-if="!lib">
      <button v-for="f in ['', 'React', 'Vue']" :key="f" class="st" :class="{ on: (R.fw || '') === f }" @click="R.fw = f || null">{{ f || t('all') }}</button>
    </template>
    <template v-else>
      <button class="st" @click="R.lib = null"><UiIcon name="lucide:chevron-left" />{{ t('allUI') }}</button>
      <span class="div" />
      <button v-for="x in DEMOS" :key="x.id" class="st" :class="{ on: x.id === R.lib }" @click="openLib(x.id)">{{ x.name }}<em>{{ x.fw }}</em></button>
    </template>
  </nav>

  <div ref="body" class="body">
    <!-- icon sets, grouped by category like the original Icônes home -->
    <template v-if="R.res !== 'ui'">
      <div v-if="!ent.length" class="empty"><div>…</div></div>
      <div v-else-if="!groups.length" class="empty"><div>{{ t('none') }}</div></div>
      <template v-for="([c, ps], i) in groups" v-else :key="c">
        <div class="sec" :style="i ? '' : 'padding-top:4px'"><b>{{ c }}</b><span>{{ ps.length }}</span></div>
        <div class="scs"><SetCard v-for="p in ps" :key="p" :p="p" /></div>
      </template>
    </template>

    <!-- library page -->
    <template v-else-if="lib">
      <div class="libh">
        <div>
          <h2>{{ lib.name }} <span class="chip">{{ lib.fw }}</span><span v-if="lib.eco && lib.eco !== lib.name" class="chip">{{ lib.eco }} {{ t('eco') }}</span></h2>
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
        <div v-else class="empty" style="height:300px"><div><h2>{{ t('soon') }}</h2><div>{{ t('soonSub') }}</div></div></div>
      </div>
    </template>

    <!-- component libraries -->
    <template v-else>
      <template v-for="k in cmpKeys" :key="k">
        <div class="sec" style="padding-top:4px"><b>{{ ukl(k) }}</b><span>{{ t('cmpN', { n: cmpLibs.length }) }}</span></div>
        <div class="cmp">
          <div v-for="l in cmpLibs" :key="l.id" class="cmpc">
            <div class="cmph"><b>{{ l.name }}</b><small>{{ l.fw }}</small><span class="sp" /><button class="pill sm" @click="openLib(l.id)">{{ t('toLib') }}</button></div>
            <div class="cmpb"><DemoFrame :lib="l.id" :keys="[k]" cls="one" /></div>
          </div>
        </div>
      </template>
      <template v-for="([n, ls], i) in uiGroups" :key="n">
        <div class="sec" :style="i || cmpKeys.length ? '' : 'padding-top:4px'"><b>{{ n }}</b><span>{{ ls.length }}</span></div>
        <div class="scs"><UICard v-for="l in ls" :key="l.id" :l="l" /></div>
      </template>
      <div v-if="!uiGroups.length && !cmpKeys.length" class="empty"><div>{{ t('none') }}</div></div>
    </template>
  </div>
</template>
