<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Heart from './Heart.vue'
import UiIcon from './UiIcon.vue'
import { INFO } from '../lib/iconify'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { likeSet, openSet } from '../lib/actions'

const props = defineProps<{ p: string }>()
const s = computed(() => INFO[props.p] || { name: props.p })
const on = computed(() => S.sets.includes(props.p))
const N = (n?: number) => Number(n || 0).toLocaleString()
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
  <div ref="el" class="sc" :data-p="p" @click="openSet(p)">
    <b :title="s.name">{{ s.name }}</b>
    <button class="ib" :class="{ on }" :title="t('like')" @click.stop="likeSet(p)"><Heart :on="on" /></button>
    <div class="sc-i"><template v-if="seen"><UiIcon v-for="n in (s.samples || []).slice(0, 5)" :key="n" :name="`${p}:${n}`" /></template></div>
    <small>{{ t('icons', { n: N(s.total) }) }} · {{ s.license?.title || '' }}</small>
  </div>
</template>
