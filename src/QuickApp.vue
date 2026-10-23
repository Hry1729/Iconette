<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, watchEffect } from 'vue'
import IconTile from './components/IconTile.vue'
import UiIcon from './components/UiIcon.vue'
import Logo from './components/Logo.vue'
import { S } from './lib/store'
import { t } from './lib/i18n'
import { search } from './lib/iconify'
import { zh2en } from './lib/zh'
import { code, fmtLabel, pngBlob } from './lib/format'
import { load } from './lib/iconify'
import { copyPng, copyText, hideQuick, inTauri, quickKey } from './lib/native'
import { addRecent } from './lib/store'

// 速取窗口: type, arrows to move, Enter copies in the current format and hides the window.
const q = ref('')
const list = ref<string[]>([])
const i = ref(0)
const busy = ref(false)
const input = ref<HTMLInputElement>()
const cur = computed(() => list.value[i.value] || '')

const mq = matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => { document.body.dataset.theme = S.theme === 'system' ? (mq.matches ? 'dark' : 'light') : S.theme }
watchEffect(applyTheme)
mq.addEventListener('change', applyTheme)

let tok = 0
let deb: ReturnType<typeof setTimeout> | undefined
async function run() {
  const my = ++tok
  const v = q.value.trim()
  if (!v) { list.value = S.recent.slice(0, 20); i.value = 0; return }
  const tv = zh2en(v)
  if (tv === '') { list.value = []; return }
  busy.value = true
  const ic = await search(tv || v, { limit: 120 })
  busy.value = false
  if (my !== tok) return
  const rank = (id: string) => { const k = S.sets.indexOf(id.split(':')[0]); return k < 0 ? 99 : k }
  list.value = ic.map((x, k) => [x, k] as const).sort((a, b) => (rank(a[0]) - rank(b[0])) || a[1] - b[1]).map(x => x[0]).slice(0, 20)
  i.value = 0
}
watch(q, () => { clearTimeout(deb); deb = setTimeout(run, 180) })

async function reset() {
  q.value = ''
  list.value = S.recent.slice(0, 20)
  i.value = 0
  await nextTick()
  input.value?.focus()
}

async function pick(k = i.value) {
  const id = list.value[k]
  if (!id) return
  await load([id])
  if (S.fmt === 'png') await copyPng(await pngBlob(id, getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#1c1c1e'), id.replace(':', '-'))
  else await copyText(code(id))
  addRecent(id)
  await hideQuick()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); hideQuick(); return }
  if (e.key === 'Enter') { e.preventDefault(); pick(); return }
  const d = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 } as Record<string, number>)[e.key]
  if (d && list.value.length) { e.preventDefault(); i.value = Math.max(0, Math.min(list.value.length - 1, i.value + d)) }
}

onMounted(async () => {
  reset()
  window.addEventListener('focus', () => input.value?.focus())
  if (inTauri) {
    const { listen } = await import('@tauri-apps/api/event')
    listen('quick-open', () => reset())
  }
})
</script>

<template>
  <div class="qw" :style="{ '--icolor': S.color || 'var(--ink)' }">
    <label class="q" data-tauri-drag-region>
      <Logo data-tauri-drag-region />
      <span class="qs">
        <UiIcon name="lucide:search" />
        <input ref="input" v-model="q" :placeholder="quickKey ? t('quickHint').replace('⌥ Space', quickKey) : t('ph')" autocomplete="off" spellcheck="false" @keydown="onKey">
      </span>
    </label>
    <div class="qb">
      <div v-if="!list.length" class="qe">{{ busy ? '…' : q ? t('none') : t('noRecent') }}</div>
      <div v-else class="grid">
        <IconTile v-for="(id, k) in list" :id="id" :key="id" :sel="k === i" @click="pick(k)" @mouseenter="i = k" />
      </div>
    </div>
    <div class="qf"><span>{{ cur }}</span><span>↵ {{ t('copyClose') }} · {{ fmtLabel() }}</span><span>Esc</span></div>
  </div>
</template>
