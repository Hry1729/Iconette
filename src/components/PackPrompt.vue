<script setup lang="ts">
import { computed, onMounted } from 'vue'
import UiIcon from './UiIcon.vue'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { PACK, cancelDownload, downloadAll, formatBytes, indexReady, packDl, packUi } from '../lib/icon-pack'

const zip = formatBytes(PACK.tarballBytes, '113 MB')
const disk = formatBytes(PACK.diskBytes, '523 MB')
const full = formatBytes(PACK.unpackedBytes || 0, '528 MB')
const missing = computed(() => Math.max(0, packUi.total - packUi.cached))
const pct = computed(() => packDl.total ? Math.round(packDl.done / packDl.total * 100) : 0)
const asking = computed(() => S.iconPack === 'ask' && !packDl.on)
const resume = computed(() => S.iconPack === 'full' && missing.value > 0 && !packDl.on)
const done = computed(() => S.iconPack === 'full' && packUi.total > 0 && missing.value === 0 && !packDl.on)

onMounted(async () => {
  await indexReady
  if (S.iconPack === 'ask') packUi.open = true
  else if (S.iconPack === 'full' && packUi.total > packUi.cached) packUi.open = true
})

function later() {
  if (S.iconPack === 'ask') S.iconPack = 'ondemand'
  packUi.open = false
}
function yes() {
  S.iconPack = 'full'
  void downloadAll()
}
function close() { packUi.open = false }
</script>

<template>
  <div v-if="packUi.open" class="pack-mask" role="dialog" aria-modal="true" :aria-label="t('packTitle')">
    <div class="pack">
      <h2>{{ t('packTitle') }}</h2>
      <p v-if="packDl.on">{{ t('packGo', { name: packDl.prefix || '…', a: packDl.done, b: packDl.total }) }}</p>
      <p v-else-if="done">{{ t('packDone') }}</p>
      <p v-else-if="resume">{{ t('packResume', { n: missing }) }}</p>
      <p v-else>{{ t('packBody', { n: PACK.sets, zip, disk, full }) }}</p>
      <p v-if="asking" class="hint">{{ t('packHint') }}</p>
      <p v-if="!packDl.on && packDl.failed" class="hint">{{ t('packFail', { n: packDl.failed }) }}</p>
      <div v-if="packDl.on" class="bar" :style="{ '--p': pct + '%' }"><i /></div>
      <p v-if="packDl.on" class="hint">{{ t('packDisk', { got: formatBytes(packDl.bytes, '0 MB'), all: disk }) }}</p>
      <div class="row">
        <template v-if="packDl.on">
          <button class="btn sec" @click="cancelDownload">{{ t('packCancel') }}</button>
        </template>
        <template v-else-if="done">
          <button class="btn pri" @click="close">{{ t('packOk') }}</button>
        </template>
        <template v-else-if="resume">
          <button class="btn ghost" @click="close">{{ t('packLater') }}</button>
          <button class="btn pri" @click="yes"><UiIcon name="lucide:download" />{{ t('packYes') }}</button>
        </template>
        <template v-else>
          <button class="btn ghost" @click="later">{{ t('packNo') }}</button>
          <button class="btn pri" @click="yes"><UiIcon name="lucide:download" />{{ t('packYes') }}</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pack-mask{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.38);display:grid;place-items:center;padding:24px}
.pack{width:min(420px,100%);background:var(--pop);color:var(--text);border-radius:16px;box-shadow:var(--popsh);padding:18px 18px 14px}
.pack h2{margin:0 0 8px;font-size:15px;font-weight:650}
.pack p{margin:0;color:var(--text);font-size:12.5px;line-height:1.55}
.pack .hint{margin-top:8px;color:var(--muted);font-size:12px}
.pack .row{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.pack .bar{height:6px;border-radius:99px;background:var(--sub);margin-top:12px;overflow:hidden}
.pack .bar i{display:block;height:100%;width:var(--p);background:var(--pick);transition:width .2s}
</style>
