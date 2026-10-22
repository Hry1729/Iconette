<script setup lang="ts">
import { ref, watch } from 'vue'
import IconTile from './IconTile.vue'
import { R } from '../lib/store'
import { t } from '../lib/i18n'
import { load } from '../lib/iconify'
import { baseName, otherStyles } from '../lib/other'
import { select } from '../lib/actions'

// The popover stays open while browsing: picking a variant selects it and lists its own variants.
const ids = ref<string[] | null>(null)
const name = ref('')
let anchor = ''
watch(() => [R.pop, R.sel] as const, async ([p, sel]) => {
  if (p !== 'cmp' || !sel) return
  if (ids.value?.includes(sel) && anchor) return
  anchor = sel
  name.value = baseName(sel.split(':')[1])
  ids.value = null
  const r = await otherStyles(sel)
  if (anchor !== sel) return
  await load(r)
  ids.value = r
}, { immediate: true })
</script>

<template>
  <div class="lbl">{{ t('other', { n: name }) }}</div>
  <div class="cmp6">
    <template v-if="!ids"><button v-for="i in 12" :key="i"><span class="ph" /></button></template>
    <div v-else-if="ids.length < 2" class="none">{{ t('noOther') }}</div>
    <IconTile v-for="x in ids" v-else :id="x" :key="x" :class="{ on: x === R.sel }" @click.stop="select(x)" />
  </div>
</template>
