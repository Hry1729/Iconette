<script setup lang="ts">
import { computed } from 'vue'
import { R } from '../lib/store'

// Popover anchored to the element that opened it (R.popAt): below it when the anchor is in the
// upper part of the window, above it otherwise; right-aligned when the anchor is on the right.
const props = defineProps<{ id: string, w?: number, place?: 'auto' | 'below' | 'above' }>()
const style = computed(() => {
  const a = R.popAt
  const s: Record<string, string> = { width: `${props.w || 220}px` }
  if (!a) { s.right = '12px'; s.top = '48px'; return s }
  const W = innerWidth
  const H = innerHeight
  const above = props.place === 'above' || (props.place !== 'below' && (a.t + a.b) / 2 > H * 0.6)
  if ((a.l + a.r) / 2 > W / 2) s.right = `${Math.max(8, W - a.r)}px`
  else s.left = `${Math.max(8, a.l)}px`
  if (above) { s.bottom = `${H - a.t + 6}px`; s.maxHeight = `${a.t - 16}px` }
  else { s.top = `${a.b + 6}px`; s.maxHeight = `${H - a.b - 16}px` }
  s.transformOrigin = `${s.right ? 'right' : 'left'} ${above ? 'bottom' : 'top'}`
  return s
})
</script>

<template>
  <div class="pop" :class="{ open: R.pop === id }" :style="style" @click.stop>
    <slot v-if="R.pop === id" />
  </div>
</template>
