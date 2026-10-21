<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { iconVer, svg, want } from '../lib/iconify'

const props = defineProps<{ id: string, sel?: boolean }>()
const el = ref<HTMLElement>()
const seen = ref(false)
const html = computed(() => {
  void iconVer.value
  if (!seen.value) return ''
  const s = svg(props.id)
  if (!s) want(props.id)
  return s
})

let io: IntersectionObserver | undefined
onMounted(() => {
  io = new IntersectionObserver((es) => {
    if (es.some(e => e.isIntersecting)) { seen.value = true; io?.disconnect() }
  }, { rootMargin: '200px' })
  io.observe(el.value!)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <button ref="el" class="t" :class="{ sel }" :data-ic="id" :title="id">
    <span v-if="html" class="i" v-html="html" />
    <span v-else class="ph" />
  </button>
</template>
