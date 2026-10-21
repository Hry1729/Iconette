<script setup lang="ts">
import { computed, ref } from 'vue'
import UiIcon from './UiIcon.vue'
import { R, S, type Mode } from '../lib/store'
import { t } from '../lib/i18n'
import { shortName } from '../lib/iconify'
import { inTauri, isMac, modKey, win } from '../lib/native'

const emit = defineEmits<{ (e: 'enter'): void }>()
const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus() })

const MODES: [Mode, string, string][] = [['search', 'lucide:search', 'mSearch'], ['sets', 'lucide:layout-grid', 'mSets'], ['swipe', 'lucide:layers', 'swipe'], ['fav', 'lucide:heart', 'mFav']]
const ph = computed(() => R.mode === 'fav' ? t('phFav') : R.set ? t('phSet', { n: shortName(R.set) }) : t('ph'))
const dot = computed(() => S.color || 'conic-gradient(#999 0 25%,#ddd 0 50%,#999 0 75%,#ddd 0)')
const showWinControls = inTauri && !isMac

function setMode(m: Mode) { R.mode = m; R.sel = null; R.q = ''; R.set = null }
function onKey(e: KeyboardEvent) {
  if (e.key === 'Backspace' && !R.q && R.set) R.set = null
  if ((e.key === 'ArrowDown' || e.key === 'Enter') && R.list[0] && !R.sel) { e.preventDefault(); e.stopPropagation(); input.value?.blur(); emit('enter') }
}
const pop = (id: string) => { R.pop = R.pop === id ? null : id }
const wmin = async () => (await win()).minimize()
const wmax = async () => (await win()).toggleMaximize()
const wclose = async () => (await win()).close()
</script>

<template>
  <div class="top" :class="{ mac: isMac && inTauri }" data-tauri-drag-region>
    <label v-if="R.mode !== 'swipe'" class="q">
      <UiIcon name="lucide:search" />
      <span v-if="R.set" class="tag">{{ shortName(R.set) }}<button @click.prevent="R.set = null">✕</button></span>
      <input ref="input" v-model="R.q" :placeholder="ph" autocomplete="off" spellcheck="false" @keydown="onKey">
    </label>
    <div v-else class="ttl" data-tauri-drag-region>{{ t('swipe') }}</div>
    <button class="ib" :title="t('iconColor')" @click.stop="pop('color')"><span class="dot" :style="{ background: dot }" /></button>
    <div class="seg">
      <button v-for="([m, ic, k], i) in MODES" :key="m" :class="{ on: R.mode === m }" :title="`${t(k)}  ${modKey}${i + 1}`" @click="setMode(m)">
        <UiIcon :name="ic" /><span data-k>{{ t(k) }}</span>
      </button>
    </div>
    <button class="ib" @click.stop="pop('menu')"><UiIcon name="lucide:ellipsis" /></button>
    <div v-if="showWinControls" class="wc">
      <button title="最小化" @click="wmin"><UiIcon name="lucide:minus" /></button>
      <button title="最大化" @click="wmax"><UiIcon name="lucide:square" /></button>
      <button class="x" title="关闭" @click="wclose"><UiIcon name="lucide:x" /></button>
    </div>
  </div>
</template>
