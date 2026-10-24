<script setup lang="ts">
import { computed, ref } from 'vue'
import UiIcon from './UiIcon.vue'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { cancelUpdate, installUpdate, openRelease, upd } from '../lib/update'

// Small note at the top when a newer release exists. v0.4.7: 「更新」 downloads and installs in place — the button
// turns into a progress bar (percent + fill), errors show inline with 重试 / 在浏览器中打开; dismissing hides it
// until the next version.
const hide = ref('')
const busy = computed(() => upd.state === 'downloading' || upd.state === 'installing')
const show = computed(() => {
  if (busy.value) return true
  if (!upd.ver || hide.value === `${upd.state}:${upd.ver}`) return false
  if (upd.state === 'avail') return S.updSkip !== upd.ver
  return upd.state === 'failed' || upd.state === 'manual'
})
const errText = computed(() => {
  const e = upd.err || ''
  const k = e.split(':')[0]
  if (k === 'http') return t('updE_http', { c: e.split(':')[1] || '' })
  if (['timeout', 'connect', 'rate', 'noasset', 'install', 'io', 'open'].includes(k)) return t(`updE_${k}`)
  return t('updE_other')
})
const text = computed(() => ({
  downloading: t('updDl', { v: upd.ver }),
  installing: t('updInst', { v: upd.ver }),
  failed: errText.value,
  manual: t('updManual'),
} as Record<string, string>)[upd.state] ?? t('updAvail', { v: upd.ver }))
function close() {
  if (upd.state === 'avail') S.updSkip = upd.ver
  else hide.value = `${upd.state}:${upd.ver}`
}
</script>

<template>
  <div class="updtip" :class="{ show, err: upd.state === 'failed' }">
    <UiIcon class="i" :name="upd.state === 'failed' ? 'lucide:circle-alert' : upd.state === 'manual' ? 'lucide:hard-drive-download' : 'lucide:circle-arrow-up'" />
    <span class="tx" :title="upd.state === 'failed' ? upd.err : undefined">{{ text }}</span>
    <template v-if="busy">
      <button class="go ubar" :class="{ ind: upd.state === 'installing' }" disabled :style="{ '--p': `${upd.state === 'installing' ? 100 : upd.pct}%` }">
        <i /><span>{{ upd.state === 'installing' ? t('updNow') : t('updDlBtn', { p: upd.pct }) }}</span>
      </button>
      <button v-if="upd.state === 'downloading' && !upd.native" class="x" :title="t('updCancel')" @click="cancelUpdate"><UiIcon name="lucide:x" /></button>
    </template>
    <template v-else>
      <button v-if="upd.state === 'avail'" class="go" @click="installUpdate">{{ t('updNow') }}</button>
      <button v-if="upd.state === 'failed' && !upd.err.startsWith('open') && upd.err !== 'noasset'" class="go" @click="installUpdate">{{ t('updRetry') }}</button>
      <button v-if="upd.state === 'failed' || upd.state === 'manual'" class="lnk" @click="openRelease">{{ t('updBrowser') }}</button>
      <button class="x" :title="t('updLater')" @click="close"><UiIcon name="lucide:x" /></button>
    </template>
  </div>
</template>
