<script setup lang="ts">
import { computed, nextTick, ref, watchEffect } from 'vue'
import IconTile from '../components/IconTile.vue'
import SetCard from '../components/SetCard.vue'
import UICard from '../components/UICard.vue'
import DemoFrame from '../components/DemoFrame.vue'
import Heart from '../components/Heart.vue'
import UiIcon from '../components/UiIcon.vue'
import { type FavTab, R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { ensureAll, setName } from '../lib/iconify'
import { zh2en } from '../lib/zh'
import { UI, ukl } from '../lib/ui-libs'
import { clearSel, likeUI, openLib, pick } from '../lib/actions'

defineEmits<{ (e: 'copy', id: string): void }>()
ensureAll()

const q = computed(() => R.q.trim().toLowerCase())
const TABS: [FavTab, string][] = [['icons', 'tIcons'], ['sets', 'tSets'], ['ui', 'tUI'], ['recent', 'tRecent']]
const count = (k: FavTab) => ({ icons: S.favs.length, sets: S.sets.length, ui: S.uiFav.length, recent: S.recent.length })[k]
function tab(k: FavTab) { R.favTab = k; R.folder = null; clearSel() }
const folders = computed(() => Object.keys(S.folders))

// icons (optionally one group), recent
const src = computed(() => (R.folder ? S.folders[R.folder] || [] : S.favs))
const icons = computed(() => {
  if (R.favTab === 'recent') return S.recent.filter(x => !q.value || x.includes(q.value))
  const qe = zh2en(q.value) || q.value
  return src.value.filter(x => !q.value || x.includes(qe))
})
watchEffect(() => { R.list = R.favTab === 'icons' || R.favTab === 'recent' ? icons.value : [] })

const sets = computed(() => S.sets.filter(p => !q.value || (p + setName(p)).toLowerCase().includes(q.value)))
const uiLibs = computed(() => S.uiFav.filter(x => !x.includes('/')).map(UI).filter(Boolean).filter(l => !q.value || l.name.toLowerCase().includes(q.value)))
const uiComps = computed(() => S.uiFav.filter(x => x.includes('/')))

// new group: inline input in the rail
const adding = ref(false)
const nf = ref('')
const nfEl = ref<HTMLInputElement>()
async function startAdd() { adding.value = true; nf.value = ''; await nextTick(); nfEl.value?.focus() }
function okAdd() {
  const v = nf.value.trim()
  if (v && !S.folders[v]) { S.folders[v] = []; R.folder = v }
  adding.value = false
}
function delFolder(f: string) { delete S.folders[f]; if (R.folder === f) R.folder = null }
</script>

<template>
  <nav class="rail">
    <button v-for="[k, l] in TABS" :key="k" class="st" :class="{ on: R.favTab === k }" @click="tab(k)">{{ t(l) }}<em>{{ count(k) }}</em></button>
    <template v-if="R.favTab === 'icons'">
      <span class="div" />
      <button class="st" :class="{ on: !R.folder }" @click="R.folder = null">{{ t('ungrouped') }}</button>
      <button v-for="f in folders" :key="f" class="st" :class="{ on: R.folder === f }" @click="R.folder = f"><UiIcon name="lucide:folder" />{{ f }}<em>{{ S.folders[f].length }}</em></button>
      <span v-if="adding" class="st on"><UiIcon name="lucide:folder" /><input ref="nfEl" v-model="nf" :placeholder="t('folderName')" @keydown.stop.enter="okAdd" @keydown.stop.esc="adding = false" @blur="okAdd"></span>
      <button v-else class="st add" :title="t('newFolder')" @click="startAdd"><UiIcon name="lucide:plus" /></button>
    </template>
  </nav>
  <div class="body">
    <!-- saved icon sets -->
    <template v-if="R.favTab === 'sets'">
      <div v-if="!S.sets.length" class="empty"><div><h2>{{ t('noSets') }}</h2><div>{{ t('noSetsSub') }}</div></div></div>
      <div v-else class="scs"><SetCard v-for="p in sets" :key="p" :p="p" /></div>
    </template>

    <!-- saved component libraries & components -->
    <template v-else-if="R.favTab === 'ui'">
      <div v-if="!S.uiFav.length" class="empty"><div><h2>{{ t('noUI') }}</h2><div>{{ t('noUISub') }}</div></div></div>
      <template v-else>
        <template v-if="uiLibs.length">
          <div class="sec" style="padding-top:4px"><b>{{ t('tUI') }}</b><span>{{ uiLibs.length }}</span></div>
          <div class="scs"><UICard v-for="l in uiLibs" :key="l.id" :l="l" /></div>
        </template>
        <template v-if="uiComps.length">
          <div class="sec"><b>{{ t('dComp') }}</b><span>{{ uiComps.length }}</span></div>
          <div class="cfs">
            <div v-for="id in uiComps" :key="id" class="cf">
              <div class="cfh" @click="openLib(id.split('/')[0])">
                <b>{{ ukl(id.split('/')[1]) }}</b><small>{{ UI(id.split('/')[0]).name }}</small><span class="sp" />
                <button class="ib on" @click.stop="likeUI(id)"><Heart on /></button>
              </div>
              <div class="cfb"><DemoFrame :lib="id.split('/')[0]" :keys="[id.split('/')[1]]" cls="one" /></div>
            </div>
          </div>
        </template>
      </template>
    </template>

    <!-- recently copied -->
    <template v-else-if="R.favTab === 'recent'">
      <div v-if="!S.recent.length" class="empty"><div><h2>{{ t('noRecent') }}</h2></div></div>
      <template v-else>
        <div class="meta"><b>{{ t('tRecent') }}</b><span>{{ S.recent.length }}</span><span class="sp" /><button class="lk" @click="S.recent = []; clearSel()">{{ t('clear') }}</button></div>
        <div class="grid"><IconTile v-for="id in icons" :id="id" :key="id" :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" /></div>
      </template>
    </template>

    <!-- saved icons, by group -->
    <template v-else>
      <div v-if="!src.length" class="empty"><div><h2>{{ R.folder || t('noFavIcons') }}</h2><div>{{ t('noFavIconsSub') }}</div><div v-if="R.folder" class="sugg"><button @click="delFolder(R.folder!)">{{ t('delFolder') }}</button></div></div></div>
      <template v-else>
        <div class="meta"><b>{{ R.folder || t('ungrouped') }}</b><span>{{ src.length }}</span><span class="sp" /><button v-if="R.folder" class="lk" @click="delFolder(R.folder!)">{{ t('delFolder') }}</button></div>
        <div class="grid"><IconTile v-for="id in icons" :id="id" :key="id" :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" /></div>
      </template>
    </template>
  </div>
</template>
