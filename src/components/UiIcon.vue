<script setup lang="ts">
import { computed } from 'vue'
import { iconVer, svg, want } from '../lib/iconify'

const props = defineProps<{ name: string }>()
const html = computed(() => {
  void iconVer.value
  const s = svg(props.name)
  if (!s) want(props.name)
  return s
})
</script>

<template>
  <span class="i" v-html="html" />
</template>
