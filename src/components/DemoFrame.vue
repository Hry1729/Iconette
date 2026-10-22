<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { demoDoc } from '../lib/demos'
import { S } from '../lib/store'

// A live component demo in a sandboxed srcdoc iframe. keys === 'dash' renders the sample dashboard
// on a 1200×820 virtual canvas scaled down to the available width.
const props = defineProps<{ lib: string, keys: string[] | 'dash', cls?: string }>()
const doc = computed(() => { void S.lang; return demoDoc(props.lib, props.keys) })
const dash = computed(() => props.keys === 'dash')
const w = ref<HTMLElement>()
const scale = ref(0)
const height = ref(0)
let ro: ResizeObserver | undefined
function fit() {
  const el = w.value
  if (!el) return
  const s = el.clientWidth / 1200
  if (!s) return
  scale.value = s
  height.value = (props.cls === 'mini' ? 720 : 820) * s
}
onMounted(() => {
  if (!w.value) return
  ro = new ResizeObserver(fit)
  ro.observe(w.value)
  requestAnimationFrame(fit)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div v-if="dash" ref="w" class="dw" :class="cls" :style="{ height: height ? `${height}px` : undefined }">
    <iframe class="dashin" sandbox="allow-scripts allow-same-origin" :srcdoc="doc" :style="{ transform: `scale(${scale})` }" />
  </div>
  <iframe v-else class="demo" :class="cls" sandbox="allow-scripts allow-same-origin" :srcdoc="doc" />
</template>
