<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import UiIcon from './UiIcon.vue'
import { R } from '../lib/store'
import { t } from '../lib/i18n'
import { toast } from '../lib/actions'
import { DEFAULT_ACCEL, accelFromEvent, keyLabel, quickAccel, quickKey, resetQuickShortcut, setQuickShortcut, suspendQuickShortcut } from '../lib/native'

// Settings row: click, then press a combo to make it the global quick-window shortcut. Esc cancels.
const rec = ref(false)
const err = ref('')
let errT: ReturnType<typeof setTimeout> | undefined

function onKey(e: KeyboardEvent) {
  e.preventDefault()
  e.stopImmediatePropagation()
  if (e.key === 'Escape') { stop(); return }
  const acc = accelFromEvent(e)
  if (acc) apply(acc)
}
function start() {
  if (rec.value) { stop(); return }
  err.value = ''
  rec.value = true
  suspendQuickShortcut(true)
  window.addEventListener('keydown', onKey, true)
}
function stop() {
  if (!rec.value) return
  rec.value = false
  window.removeEventListener('keydown', onKey, true)
  suspendQuickShortcut(false)
}
async function apply(acc: string) {
  window.removeEventListener('keydown', onKey, true)
  try {
    await setQuickShortcut(acc)
    rec.value = false
    toast(t('keySet', { k: keyLabel(acc) }), 'lucide:keyboard')
  }
  catch (e) {
    rec.value = false
    suspendQuickShortcut(false)
    err.value = String(e) === 'invalid' ? t('keyBad') : t('keyTaken')
    clearTimeout(errT)
    errT = setTimeout(() => { err.value = '' }, 1800)
  }
}
async function reset() {
  stop()
  await resetQuickShortcut()
  if (quickKey.value) toast(t('keySet', { k: quickKey.value }), 'lucide:keyboard')
}
watch(() => R.pop, (p) => { if (p !== 'menu') stop() })
onBeforeUnmount(stop)
</script>

<template>
  <div class="it kr" :class="{ rec, bad: err }" role="button" tabindex="0" :title="t('keyHint')" @click="start">
    <UiIcon name="lucide:keyboard" />{{ t('quickKeyL') }}
    <span class="r">{{ err || (rec ? t('pressKeys') : quickKey || t('noKey')) }}</span>
    <button v-if="!rec && quickAccel !== DEFAULT_ACCEL" class="rs" :title="t('keyReset')" @click.stop="reset"><UiIcon name="lucide:rotate-ccw" /></button>
  </div>
</template>
