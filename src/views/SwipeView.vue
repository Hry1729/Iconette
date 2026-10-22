<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import UiIcon from '../components/UiIcon.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, collection, ensureAll, load } from '../lib/iconify'
import { DEMOS, UI, UIK, udesc, ukl } from '../lib/ui-libs'
import { likeUI, openLib, openSet, toast } from '../lib/actions'
import { shortName } from '../lib/iconify'
import { OKLIC, type SwipeAct, TOP, hash, rng, swipeApi } from '../lib/swipe'

const deck = ref<string[]>([])
const today = ref<string[]>([])
const total = ref(0)
const ready = ref(false)
// Undo history survives switching modes, like the prototype.
const hist: { p: string, a: SwipeAct, kind: string }[] = (window as any).__swHist ||= []
const N = (n?: number) => Number(n || 0).toLocaleString()

function iconDeckAll() {
  const f = S.swf
  return Object.entries(INFO).filter(([, s]) => !s.hidden && s.category !== 'Archive / Unmaintained'
    && (f.color === 'any' || (f.color === 'multi') === !!s.palette) && (!f.cat || s.category === f.cat) && (!f.lic || OKLIC.test(s.license?.spdx || ''))).map(([p]) => p)
}

function build() {
  if (S.deck === 'icons') {
    const all = iconDeckAll()
    let d = all.filter(p => !S.seen.includes(p) && !S.sets.includes(p)).sort((a, b) => hash(`${a}x`) - hash(`${b}x`))
    // 今日推荐: five popular sets that rotate daily, always first in the deck.
    const day = Math.floor(Date.now() / 864e5)
    const pool = TOP.filter(p => d.includes(p))
    const td: string[] = []
    for (let i = 0; i < pool.length && td.length < 5; i++) td.push(pool[(day * 5 + i) % pool.length])
    today.value = [...new Set(td)]
    d = [...today.value, ...d.filter(p => !today.value.includes(p))]
    deck.value = d
    total.value = all.length
  }
  else {
    const all: string[] = S.deck === 'lib' ? DEMOS.map(l => l.id) : DEMOS.flatMap(l => UIK.map(([k]) => `${l.id}/${k}`))
    deck.value = all.filter(id => !S.uiSeen.includes(id)).sort((a, b) => S.deck === 'lib' ? 0 : hash(`${a}u`) - hash(`${b}u`))
    total.value = all.length
  }
  const done = total.value - deck.value.length
  R.swCount = total.value ? t('seen', { a: Math.min(done + 1, total.value), b: total.value }) : ''
  for (const p of deck.value.slice(0, 3)) if (S.deck === 'icons') pickIcons(p)
}

const cards = computed(() => deck.value.slice(0, 3).map((id, depth) => ({ id, depth })).reverse())
const kind = computed(() => S.deck)

// ---- icons shown on a set card (15, shuffled per card; R / shuffle button re-rolls)
const seed: Record<string, number> = {}
const icons = reactive<Record<string, string[]>>({})
const fading = reactive<Record<string, boolean>>({})
async function pickIcons(p: string, reroll = false) {
  if (icons[p] && !reroll) return
  const names = await collection(p)
  const r = rng(hash(p) + (seed[p] || 0) * 7919)
  const a = names.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  const ids = a.slice(0, 15).map(x => `${p}:${x}`)
  await load(ids)
  if (reroll) { fading[p] = true; setTimeout(() => { icons[p] = ids; fading[p] = false }, 120) }
  else icons[p] = ids
}
function shuffle() {
  if (S.deck !== 'icons') return
  const p = deck.value[0]
  if (!p) return
  seed[p] = (seed[p] || 0) + 1
  pickIcons(p, true)
}

// ---- drag / fling the front card
const drag = reactive({ dx: 0, dy: 0, down: false, snap: false, fly: null as SwipeAct | null })
let sx = 0
let sy = 0
const W = computed(() => (S.deck === 'icons' ? 460 : 520))
const frontStyle = computed(() => {
  if (drag.fly) {
    const w = W.value
    return { transform: drag.fly === 'like' ? `translate(${w}px,40px) rotate(22deg)` : drag.fly === 'nope' ? `translate(-${w}px,40px) rotate(-22deg)` : `translate(0,-${w - 40}px)`, opacity: 0 }
  }
  if (drag.down || drag.dx || drag.dy) return { transform: `translate(${drag.dx}px,${drag.dy}px) rotate(${drag.dx / 18}deg)` }
  return {}
})
const stamp = (k: SwipeAct) => {
  if (drag.fly) return drag.fly === k ? 1 : 0
  if (k === 'like') return Math.max(0, drag.dx / 110)
  if (k === 'nope') return Math.max(0, -drag.dx / 110)
  return Math.abs(drag.dx) < 60 ? Math.max(0, -drag.dy / 110) : 0
}
function down(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button') || drag.fly) return
  drag.down = true
  drag.snap = false
  sx = e.clientX
  sy = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!drag.down) return
  drag.dx = e.clientX - sx
  drag.dy = e.clientY - sy
}
function up() {
  if (!drag.down) return
  drag.down = false
  const { dx, dy } = drag
  if (dx > 110) commit('like')
  else if (dx < -110) commit('nope')
  else if (dy < -110 && Math.abs(dx) < 60) commit('open')
  else { drag.snap = true; drag.dx = drag.dy = 0 }
}

let busy = false
function commit(a: SwipeAct) {
  const id = deck.value[0]
  if (!id || busy) return
  busy = true
  drag.fly = a
  const k = S.deck
  hist.push({ p: id, a, kind: k })
  if (k === 'icons') {
    if (a === 'like') { if (!S.sets.includes(id)) S.sets.push(id); toast(t('likedSet', { n: shortName(id) }), 'ph:heart-fill') }
    if (!S.seen.includes(id)) S.seen.push(id)
  }
  else {
    if (a === 'like' && !S.uiFav.includes(id)) likeUI(id)
    if (!S.uiSeen.includes(id)) S.uiSeen.push(id)
  }
  setTimeout(() => {
    busy = false
    Object.assign(drag, { dx: 0, dy: 0, down: false, snap: false, fly: null })
    if (a === 'open') { if (k === 'icons') openSet(id); else openLib(id.split('/')[0]) }
    else build()
  }, 260)
}
function undo() {
  const i = hist.map(h => h.kind).lastIndexOf(S.deck)
  if (i < 0) return
  const [h] = hist.splice(i, 1)
  if (h.kind === 'icons') {
    S.seen = S.seen.filter(x => x !== h.p)
    if (h.a === 'like') S.sets = S.sets.filter(x => x !== h.p)
  }
  else {
    S.uiSeen = S.uiSeen.filter(x => x !== h.p)
    if (h.a === 'like') S.uiFav = S.uiFav.filter(x => x !== h.p)
  }
  build()
}
const canUndo = computed(() => { void deck.value; return hist.some(h => h.kind === S.deck) })
function restart() {
  if (S.deck === 'icons') S.seen = []
  else S.uiSeen = S.uiSeen.filter(x => (S.deck === 'lib' ? x.includes('/') : !x.includes('/')))
  build()
}

watch(() => [S.deck, S.swf.color, S.swf.cat, S.swf.lic], build)
onMounted(async () => {
  swipeApi.commit = commit
  swipeApi.undo = undo
  swipeApi.shuffle = shuffle
  if (S.deck === 'icons') build()
  await ensureAll()
  ready.value = true
  build()
})
onBeforeUnmount(() => { swipeApi.commit = () => {}; swipeApi.undo = () => {}; swipeApi.shuffle = () => {} })

const info = (p: string) => INFO[p] || ({ name: p } as any)
const hgt = (p: string) => { const h = (INFO[p] as any)?.height; return Array.isArray(h) ? h[0] : h }
</script>

<template>
  <div class="body">
    <div v-if="!deck.length && (ready || kind !== 'icons')" class="empty">
      <div>
        <h2>{{ t('doneDeck') }}</h2>
        <div v-if="kind === 'icons'">{{ t('doneDeckSub') }}</div>
        <div class="sugg"><button @click="restart">{{ t('restart') }}</button></div>
      </div>
    </div>
    <div v-else-if="deck.length" class="deck">
      <div class="stack" :class="kind === 'lib' ? 'wide' : kind === 'comp' ? 'mid' : ''">
        <div
          v-for="c in cards" :key="`${kind}:${c.id}`"
          class="card" :class="[kind !== 'icons' && 'ui', c.depth === 0 ? 'front' : c.depth === 1 ? 'back' : 'back2', c.depth === 0 && { fly: !!drag.fly, snap: drag.snap, dragging: drag.down }]"
          :style="c.depth === 0 ? frontStyle : undefined"
          @pointerdown="c.depth === 0 && down($event)" @pointermove="move" @pointerup="up" @pointercancel="up"
        >
          <!-- icon set card -->
          <template v-if="kind === 'icons'">
            <button class="ib shuf" :title="`${t('shuffle')} (R)`" @click.stop="shuffle"><UiIcon name="lucide:shuffle" /></button>
            <h3>{{ info(c.id).name }}</h3>
            <div class="by">{{ info(c.id).author?.name || '' }} · {{ t('icons', { n: N(info(c.id).total) }) }}</div>
            <div class="ic">
              <span v-for="(ic, i) in (icons[c.id] || Array(15).fill(''))" :key="i" class="i" :style="{ transition: 'opacity .18s', transitionDelay: fading[c.id] ? '0ms' : `${i * 12}ms`, opacity: fading[c.id] ? 0 : 1 }">
                <UiIcon v-if="ic" :name="ic" />
              </span>
            </div>
            <div class="ft">
              <span v-if="today.includes(c.id)" class="chip today">{{ t('today') }}</span>
              <span v-if="info(c.id).category" class="chip">{{ info(c.id).category }}</span>
              <span class="chip">{{ info(c.id).license?.title || '' }}</span>
              <span v-if="info(c.id).palette" class="chip">{{ t('fMulti') }}</span>
              <span v-if="hgt(c.id)" class="chip">{{ hgt(c.id) }}px</span>
            </div>
          </template>
          <!-- component / library card -->
          <template v-else>
            <div class="uh">
              <div>
                <h3>{{ c.id.includes('/') ? ukl(c.id.split('/')[1]) : UI(c.id).name }}</h3>
                <div class="by">{{ c.id.includes('/') ? `${UI(c.id.split('/')[0]).name} · ${UI(c.id.split('/')[0]).fw}` : `${UI(c.id).fw} · ${udesc(UI(c.id))}` }}</div>
              </div>
              <button v-if="c.id.includes('/')" class="pill sm" @click.stop="openLib(c.id.split('/')[0])">{{ t('toLib') }}<UiIcon name="lucide:arrow-right" /></button>
            </div>
            <div class="uf">
              <template v-if="c.depth === 0">
                <DemoFrame v-if="c.id.includes('/')" :lib="c.id.split('/')[0]" :keys="[c.id.split('/')[1]]" cls="one" />
                <DemoFrame v-else :lib="c.id" keys="dash" cls="mini" />
              </template>
            </div>
          </template>
          <span class="stamp like" :style="{ opacity: stamp('like') }">{{ t('like') }}</span>
          <span class="stamp nope" :style="{ opacity: stamp('nope') }">{{ t('skip') }}</span>
          <span class="stamp open" :style="{ opacity: stamp('open') }">{{ kind === 'comp' ? t('toLib') : t('open') }}</span>
        </div>
      </div>
      <div class="acts">
        <button class="ab sm" :title="`${t('undo')} (Z)`" :style="{ visibility: canUndo ? 'visible' : 'hidden' }" @click="undo"><UiIcon name="lucide:undo-2" /></button>
        <button class="ab" :title="`${t('skip')} (←)`" @click="commit('nope')"><UiIcon name="lucide:x" /></button>
        <button class="ab sm" :title="`${kind === 'comp' ? t('toLib') : t('open')} (↑)`" @click="commit('open')"><UiIcon name="lucide:arrow-up-right" /></button>
        <button class="ab like" :title="`${t('like')} (→)`" @click="commit('like')"><UiIcon name="lucide:heart" /></button>
      </div>
    </div>
  </div>
</template>
