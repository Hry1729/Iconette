<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiIcon from './UiIcon.vue'
import Logo from './Logo.vue'
import { R, type Mode } from '../lib/store'
import { t } from '../lib/i18n'
import { setMode } from '../lib/actions'
import { inTauri, isMac, modKey, win } from '../lib/native'
import { chest, chestCount, openPop } from '../lib/fx'
import { miniChestSVG } from '../lib/iso'

// Title bar = drag + switch. Everything that is not a control carries data-tauri-drag-region
// (Tauri only starts a drag when the pressed element itself has the attribute).
const MODES: [Mode, string, string][] = [['search', 'lucide:search', 'mSearch'], ['sets', 'lucide:layout-grid', 'mSets'], ['swipe', 'lucide:layers', 'swipe']]
const mac = isMac && inTauri
const showWinControls = inTauri && !isMac
const count = computed(() => chestCount())
const chestHost = ref<HTMLElement>()
onMounted(() => { if (chestHost.value) chestHost.value.innerHTML = miniChestSVG() })
// Badge digit rolls whenever the count changes or a flight lands.
const tickKey = ref(0)
watch([count, () => chest.tick], () => { tickKey.value++ })
const wmin = async () => (await win()).minimize()
const wmax = async () => (await win()).toggleMaximize()
const wclose = async () => (await win()).close()
</script>

<template>
  <div class="tb" :class="{ mac }" data-tauri-drag-region>
    <div v-if="mac" class="lights-gap" data-tauri-drag-region />
    <div class="brand" data-tauri-drag-region>
      <Logo data-tauri-drag-region /><b data-tauri-drag-region>Icônette</b>
    </div>
    <div class="drag" data-tauri-drag-region />
    <div class="modes">
      <button v-for="([m, ic, k], i) in MODES" :key="m" :class="{ on: R.mode === m }" :title="`${t(k)}  ${modKey}${i + 1}`" @click="setMode(m)">
        <UiIcon :name="ic" /><span class="lb">{{ t(k) }}</span>
      </button>
      <button class="chestbtn" :class="{ on: R.mode === 'fav' }" :title="`${t('chestTip')}  ${modKey}4`" @click="setMode('fav')">
        <span class="cw"><span ref="chestHost" class="ch" /><span v-if="count" class="badge"><span :key="tickKey" class="tick">{{ count > 99 ? '99+' : count }}</span></span></span>
        <span class="lb">{{ t('mFav') }}</span>
      </button>
    </div>
    <button class="tbtn" :class="{ on: R.pop === 'menu' }" @click.stop="openPop('menu', $event)"><UiIcon name="lucide:ellipsis" /></button>
    <div v-if="showWinControls" class="wc">
      <button :title="t('minimize')" @click="wmin"><UiIcon name="lucide:minus" /></button>
      <button :title="t('maximize')" class="sq" @click="wmax"><UiIcon name="lucide:square" /></button>
      <button class="x" :title="t('close')" @click="wclose"><UiIcon name="lucide:x" /></button>
    </div>
  </div>
</template>
