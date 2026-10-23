<script setup lang="ts">
import { ref, watch } from 'vue'
import UiIcon from './UiIcon.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { toast } from '../lib/actions'
import { applyFavs, exportFavs, favCount, parseFavFile, pickFavFile } from '../lib/favio'

// Settings rows: export favorites to a JSON file / import one (merge or replace).
const ask = ref(false)
watch(() => R.pop, () => { ask.value = false })

async function doExport() {
  try {
    if (await exportFavs()) toast(t('favExported', { n: favCount({ icons: S.favs, sets: S.sets, ui: S.uiFav }) }), 'lucide:download')
  }
  catch (e) { console.warn(e); toast(t('favIOFail'), 'lucide:x') }
}
async function doImport(mode: 'merge' | 'replace') {
  ask.value = false
  let text: string | null
  try { text = await pickFavFile() }
  catch (e) { console.warn(e); toast(t('favIOFail'), 'lucide:x'); return }
  if (text == null) return
  try {
    const n = applyFavs(parseFavFile(text), mode)
    toast(t(mode === 'merge' ? 'favMerged' : 'favReplaced', { n }), 'lucide:upload')
  }
  catch (e) { toast(t((e as Error).message === 'newer' ? 'favNewer' : 'favBad'), 'lucide:x') }
}
</script>

<template>
  <button class="it" @click="doExport"><UiIcon name="lucide:download" />{{ t('favExport') }}</button>
  <button class="it" :class="{ on: ask }" @click="ask = !ask"><UiIcon name="lucide:upload" />{{ t('favImport') }}<span class="r">{{ ask ? '' : '…' }}</span></button>
  <div v-if="ask" class="fio">
    <button :title="t('favMergeTip')" @click="doImport('merge')">{{ t('favMerge') }}</button>
    <button :title="t('favReplaceTip')" @click="doImport('replace')">{{ t('favReplace') }}</button>
  </div>
</template>
