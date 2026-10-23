<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from './UiIcon.vue'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { installUpdate, upd } from '../lib/update'

// Small corner note when a newer release exists; dismissing hides it until the next version.
const show = computed(() => (upd.state === 'avail' && upd.ver && S.updSkip !== upd.ver) || upd.state === 'installing')
</script>

<template>
  <div class="updtip" :class="{ show }">
    <UiIcon name="lucide:circle-arrow-up" />
    <span>{{ upd.state === 'installing' ? t('updInstalling', { p: upd.pct }) : t('updAvail', { v: upd.ver }) }}</span>
    <template v-if="upd.state !== 'installing'">
      <button class="go" @click="installUpdate">{{ upd.native ? t('updNow') : t('updGet') }}</button>
      <button class="x" :title="t('updLater')" @click="S.updSkip = upd.ver"><UiIcon name="lucide:x" /></button>
    </template>
  </div>
</template>
