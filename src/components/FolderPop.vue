<script setup lang="ts">
import { computed, ref } from 'vue'
import UiIcon from './UiIcon.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'

const fs = computed(() => Object.keys(S.folders))
const nf = ref('')
function toggle(f: string) {
  const id = R.sel
  if (!id) return
  const a = S.folders[f]
  const i = a.indexOf(id)
  i > -1 ? a.splice(i, 1) : a.unshift(id)
}
function add() {
  const v = nf.value.trim()
  const id = R.sel
  if (!v || !id) return
  S.folders[v] ||= []
  if (!S.folders[v].includes(id)) S.folders[v].unshift(id)
  nf.value = ''
}
</script>

<template>
  <div class="lbl">{{ t('moveTo') }}</div>
  <button v-for="f in fs" :key="f" class="it" :class="{ on: !!R.sel && S.folders[f].includes(R.sel) }" @click="toggle(f)"><UiIcon name="lucide:folder" />{{ f }}<span class="r ck">✓</span></button>
  <hr v-if="fs.length">
  <label class="it"><UiIcon name="lucide:plus" /><input v-model="nf" :placeholder="t('newFolder')" @keydown.stop.enter="add" @keydown.stop.esc="R.pop = null"></label>
</template>
