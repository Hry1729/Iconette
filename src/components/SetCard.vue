<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Heart from './Heart.vue'
import UiIcon from './UiIcon.vue'
import { INFO } from '../lib/iconify'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { likeSet, openSet } from '../lib/actions'

const props = defineProps<{ p: string, q?: string, delay?: number }>()
const s = computed(() => INFO[props.p] || { name: props.p })
const on = computed(() => S.sets.includes(props.p))
const N = (n?: number) => Number(n || 0).toLocaleString()
const esc = (x: string) => x.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`)
/** Highlight the matched part of the query. */
const hl = (x = '') => {
  const q = (props.q || '').trim().toLowerCase()
  const i = q ? x.toLowerCase().indexOf(q) : -1
  return i < 0 ? esc(x) : `${esc(x.slice(0, i))}<mark>${esc(x.slice(i, i + q.length))}</mark>${esc(x.slice(i + q.length))}`
}
// Sample icons load only once the card scrolls into view (there are 200+ sets).
const el = ref<HTMLElement>()
const seen = ref(false)
let io: IntersectionObserver | undefined
onMounted(() => {
  io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { seen.value = true; io?.disconnect() } }, { rootMargin: '200px' })
  io.observe(el.value!)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div ref="el" class="sc" :data-p="p" :style="{ animationDelay: `${delay || 0}ms` }" @click="openSet(p)">
    <div class="h"><b :title="s.name" v-html="hl(s.name)" /><button class="ib hrt" :class="{ on }" :title="t('like')" @click.stop="likeSet(p)"><Heart :on="on" /></button></div>
    <div class="sc-i"><template v-if="seen"><UiIcon v-for="n in (s.samples || []).slice(0, 5)" :key="n" :name="`${p}:${n}`" /></template></div>
    <small>{{ t('icons', { n: N(s.total) }) }} · {{ s.license?.title || '' }}<template v-if="s.author?.name"> · <span v-html="hl(s.author.name)" /></template></small>
  </div>
</template>
