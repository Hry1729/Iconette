<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { iconVer, svg, want } from '../lib/iconify'
import { dragStart } from '../lib/drag'
import { S } from '../lib/store'
import { like } from '../lib/actions'

// heart: show the hover ♥ that saves the icon straight into the chest.
const props = defineProps<{ id: string, sel?: boolean, heart?: boolean }>()
const el = ref<HTMLElement>()
const seen = ref(false)
const html = computed(() => {
  void iconVer.value
  if (!seen.value) return ''
  const s = svg(props.id)
  if (!s) want(props.id)
  return s
})
const saved = computed(() => props.heart && S.favs.includes(props.id))

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
  <button ref="el" class="t" :class="{ sel, saved }" :data-ic="id" :title="id" draggable="true" @dragstart="dragStart($event, id)" @mousedown="dragStart($event, id)">
    <span v-if="html" class="i" v-html="html" />
    <span v-else class="ph" />
    <span v-if="heart" class="hv" role="button" @mousedown.stop @click.stop="like(id)">
      <svg viewBox="0 0 24 24" width="1em" height="1em"><path :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
    </span>
  </button>
</template>
