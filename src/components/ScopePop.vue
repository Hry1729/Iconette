<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import UiIcon from './UiIcon.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, shortName } from '../lib/iconify'

// 范围 popover: all sets, or the checked pinned sets (drag ⋮⋮ to reorder), plus search across every
// Iconify set with one-click pin, and a prominent "add icon set" button.
const f = ref('')
const inp = ref<HTMLInputElement>()
const adding = ref(false)
const visibleSets = computed(() => Object.entries(INFO).filter(([, s]) => !s.hidden))
const N = (n?: number) => Number(n || 0).toLocaleString()
const smp = (p: string) => (INFO[p]?.samples || []).slice(0, 3).map(n => `${p}:${n}`)
const matches = computed(() => {
  const q = f.value.trim().toLowerCase()
  if (!q) return []
  return visibleSets.value.filter(([p, s]) => `${p} ${s.name} ${s.author?.name || ''} ${s.category || ''}`.toLowerCase().includes(q)).slice(0, 40).map(([p]) => p)
})
const on = (p: string) => !S.scopeAll && S.scope.includes(p)

function all() { S.scopeAll = true; R.set = null }
function toggle(p: string) {
  R.set = null
  if (S.scopeAll) { S.scopeAll = false; S.scope = [p]; return }
  S.scope = S.scope.includes(p) ? S.scope.filter(x => x !== p) : [...S.scope, p]
  if (!S.scope.length) S.scopeAll = true
}
function pin(p: string) { if (!S.sets.includes(p)) S.sets.push(p); f.value = ''; adding.value = false }
function browse(p: string) { R.set = p; R.pop = null }
async function add() { adding.value = true; await nextTick(); inp.value?.focus() }
function onKey(e: KeyboardEvent) {
  e.stopPropagation()
  if (e.key === 'Enter' && matches.value[0]) pin(matches.value[0])
  if (e.key === 'Escape') { if (f.value) f.value = ''; else R.pop = null }
}

// drag-to-reorder pinned rows
const H = 36
const dragI = ref(-1)
const shift = ref<number[]>([])
const dy = ref(0)
function grab(e: PointerEvent, i: number) {
  e.preventDefault()
  const y0 = e.clientY
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  dragI.value = i
  let ni = i
  const n = S.sets.length
  const move = (ev: PointerEvent) => {
    dy.value = ev.clientY - y0
    ni = Math.max(0, Math.min(n - 1, i + Math.round(dy.value / H)))
    shift.value = S.sets.map((_, k) => (k === i ? 0 : i < ni && k > i && k <= ni ? -H : i > ni && k < i && k >= ni ? H : 0))
  }
  const up = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    const a = S.sets.slice()
    const [p] = a.splice(i, 1)
    a.splice(ni, 0, p)
    S.sets = a
    dragI.value = -1
    dy.value = 0
    shift.value = []
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
}
const rowStyle = (k: number) => (dragI.value === k ? { transform: `translateY(${dy.value}px) scale(1.02)` } : shift.value[k] ? { transform: `translateY(${shift.value[k]}px)` } : {})
</script>

<template>
  <div class="ps">
    <UiIcon name="lucide:search" />
    <input ref="inp" v-model="f" :placeholder="adding ? t('addSetPh') : t('searchSets', { n: visibleSets.length || '200+' })" spellcheck="false" @keydown="onKey">
  </div>
  <div class="lst">
    <template v-if="!f.trim()">
      <div class="prow all" :class="{ on: S.scopeAll && !R.set }" @click="all"><span class="rd" /><span class="nm">{{ t('allSets') }}</span><span class="ct">{{ visibleSets.length || '' }}</span></div>
      <div class="pl"><span>{{ t('pinnedL') }}</span><span>{{ S.sets.length }}</span></div>
      <div v-for="(p, k) in S.sets" :key="p" class="prow pin" :class="{ on: on(p), dragging: dragI === k }" :style="rowStyle(k)" @click="toggle(p)">
        <span class="ck"><UiIcon name="lucide:check" /></span>
        <span class="smp"><UiIcon v-for="x in smp(p)" :key="x" :name="x" /></span>
        <span class="nm">{{ shortName(p) }}</span>
        <span class="ct">{{ N(INFO[p]?.total) }}</span>
        <span class="hd" @click.stop @pointerdown="grab($event, k)"><UiIcon name="lucide:grip-vertical" /></span>
      </div>
    </template>
    <template v-else>
      <div class="pl"><span>{{ t('matchN', { n: matches.length }) }}</span></div>
      <div v-for="p in matches" :key="p" class="prow" :title="t('browseSet')" @click="browse(p)">
        <span class="smp"><UiIcon v-for="x in smp(p)" :key="x" :name="x" /></span>
        <span class="nm">{{ shortName(p) }}</span>
        <span v-if="S.sets.includes(p)" class="ct">{{ t('pinned') }}</span>
        <button v-else class="btn sec addpin" @click.stop="pin(p)"><UiIcon name="lucide:plus" />{{ t('pin') }}</button>
      </div>
      <div v-if="!matches.length" class="pl">{{ t('none') }}</div>
    </template>
  </div>
  <div class="sepl" />
  <button class="addbtn" @click="add"><UiIcon name="lucide:plus" />{{ t('addSet') }}</button>
</template>
