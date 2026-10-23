<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import UiIcon from '../components/UiIcon.vue'
import DemoFrame from '../components/DemoFrame.vue'
import Pop from '../components/Pop.vue'
import GachaView from './GachaView.vue'
import { type Deck, R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, ensureAll, svg } from '../lib/iconify'
import { DEMOS, UI, UIK, udesc, ukl } from '../lib/ui-libs'
import { openLib, openSet, setGlyph, toast, uiGlyph } from '../lib/actions'
import { type SwipeAct, swipeApi } from '../lib/swipe'
import { D, buildDeck, canUndo, decide, fading, histOf, icons, item, restart, shuffleIcons, undo } from '../lib/deck'
import { burst, flyToChest, openPop, reduced } from '../lib/fx'
import { GLYPH_GACHA, tween } from '../lib/iso'

const ready = ref(false)
const cats = computed(() => [...new Set(Object.values(INFO).map(s => s.category).filter((c): c is string => !!c && c !== 'Archive / Unmaintained'))])
const nFilters = computed(() => (S.swf.color !== 'any' ? 1 : 0) + (S.swf.cat ? 1 : 0) + (S.swf.lic ? 1 : 0))
const DECKS: [Deck, string, string][] = [['icons', 'dIcons', 'lucide:layout-grid'], ['comp', 'dComp', 'lucide:toggle-left'], ['lib', 'dLib', 'lucide:package'], ['chest', 'dChest', 'lucide:package-open']]
const deckCount = (d: Deck) => d === 'icons' ? Object.values(INFO).filter(s => !s.hidden && s.category !== 'Archive / Unmaintained').length : d === 'comp' ? DEMOS.length * UIK.length : d === 'lib' ? DEMOS.length : S.sets.length + S.uiFav.length
const deckName = computed(() => t(DECKS.find(d => d[0] === S.deck)![1]))
function pickDeck(d: Deck) { S.deck = d; R.pop = null }

// ---- cards
const cards = computed(() => D.list.slice(0, 3).map((id, depth) => ({ ...item(id), depth })).reverse())
const front = computed(() => (D.list[0] ? item(D.list[0]) : null))
const info = (p: string) => INFO[p] || ({ name: p } as any)
const hgt = (p: string) => { const h = (INFO[p] as any)?.height; return Array.isArray(h) ? h[0] : h }
const isChest = computed(() => S.deck === 'chest')

// ---- drag physics: rotation, stamps, spring back, fling with velocity
const drag = reactive({ x: 0, y: 0, ry: 0, down: false })
let sx = 0
let sy = 0
let lx = 0
let lt = 0
let vx = 0
let busy = false
const k = computed(() => Math.min(1, Math.abs(drag.x) / 110))
const frontStyle = computed(() => ({ transform: `translate(${drag.x}px,${drag.y}px) rotate(${drag.x * 0.06}deg)` }))
const backStyle = computed(() => ({ transform: `translateY(${10 - k.value * 10}px) scale(${0.95 + k.value * 0.05})` }))
const stampStyle = (dir: 1 | -1) => {
  const on = Math.sign(drag.x) === dir ? k.value : 0
  return { opacity: on, transform: `rotate(${dir * 12}deg) scale(${1.3 - on * 0.3})` }
}
const openOp = computed(() => (Math.abs(drag.x) < 60 ? Math.max(0, Math.min(1, -drag.ry / 110)) : 0))
const btnStyle = (dir: 1 | -1) => (Math.sign(drag.x) === dir ? { transform: `scale(${1 + k.value * 0.18})`, color: Math.abs(drag.x) > 60 ? (dir > 0 ? 'var(--red)' : 'var(--text)') : '' } : {})

function down(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button,iframe') || busy) return
  drag.down = true
  sx = e.clientX - drag.x
  sy = e.clientY
  lx = e.clientX
  lt = performance.now()
  vx = 0
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!drag.down) return
  const n = performance.now()
  vx = (e.clientX - lx) / Math.max(1, n - lt)
  lx = e.clientX
  lt = n
  drag.x = e.clientX - sx
  drag.ry = e.clientY - sy
  drag.y = drag.ry * 0.35
}
function up() {
  if (!drag.down) return
  drag.down = false
  if (Math.abs(drag.x) > 110 || Math.abs(vx) > 0.8) commit(Math.sign(drag.x || vx) > 0 ? 'like' : 'nope')
  else if (drag.ry < -90 && Math.abs(drag.x) < 60) commit('open')
  else springBack()
}
function springBack() {
  let v = 0
  let vy = 0
  const step = () => {
    v = (v - drag.x * 0.12) * 0.72
    vy = (vy - drag.y * 0.12) * 0.72
    drag.x += v
    drag.y += vy
    if (Math.abs(drag.x) + Math.abs(v) + Math.abs(drag.y) > 0.3) requestAnimationFrame(step)
    else Object.assign(drag, { x: 0, y: 0, ry: 0 })
  }
  step()
}

// combo ×N for quick consecutive likes
const combo = reactive({ n: 0, last: 0, bump: 0 })
const likeBtn = ref<HTMLElement>()
const stackEl = ref<HTMLElement>()

async function commit(a: SwipeAct) {
  const id = D.list[0]
  if (!id || busy) return
  busy = true
  const it = item(id)
  const x0 = drag.x
  const y0 = drag.y
  if (a === 'like' && !isChest.value) {
    const src = stackEl.value?.querySelector('.card.front .cg .i') || stackEl.value?.querySelector('.card.front')
    flyToChest(src, it.k === 'set' ? (icons[it.v]?.[0] ? svg(icons[it.v][0]) : setGlyph(it.v)) : uiGlyph(), { size: 28, dur: 760 })
  }
  const dir = a === 'like' ? 1 : a === 'nope' ? -1 : 0
  if (!reduced()) {
    await tween(a === 'like' ? 380 : 300, (e) => {
      if (dir) { drag.x = x0 + (dir * 620 - x0) * e; drag.y = y0 + (dir > 0 ? -40 : 30) * e }
      else { drag.x = x0 * (1 - e); drag.y = y0 - 520 * e }
    }, (q: number) => q * q)
  }
  decide(id, a)
  const now = performance.now()
  if (a === 'like') {
    combo.n = now - combo.last < 4500 ? combo.n + 1 : 1
    combo.last = now
    if (combo.n >= 2) combo.bump++
    burst(likeBtn.value || null)
  }
  else combo.n = 0
  if (a === 'nope' && isChest.value) toast(t('movedOut'), 'lucide:package-minus')
  Object.assign(drag, { x: 0, y: 0, ry: 0, down: false })
  busy = false
  if (a === 'open') { if (it.k === 'set') openSet(it.v); else openLib(it.v.split('/')[0]); return }
  buildDeck()
  requestAnimationFrame(() => stackEl.value?.querySelector('.card.front')?.animate([{ transform: 'translateY(10px) scale(.95)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' }))
}
function shuffle() { const f = front.value; if (f?.k === 'set') shuffleIcons(f.v) }

// dot progress under the stack (red = kept)
const dots = computed(() => {
  const past = histOf().slice(-10).map(h => (h.a === 'like' ? 'yes' : 'done'))
  const fut = Math.max(0, Math.min(D.list.length - 1, 17 - past.length))
  return [...past, ...(D.list.length ? ['cur'] : []), ...Array(fut).fill('')]
})

watch(() => [S.deck, S.swf.color, S.swf.cat, S.swf.lic], () => { combo.n = 0; buildDeck() })
onMounted(async () => {
  swipeApi.commit = a => (S.swView === 'cards' ? commit(a) : undefined)
  swipeApi.undo = undo
  swipeApi.shuffle = shuffle
  buildDeck()
  await ensureAll()
  ready.value = true
  buildDeck()
})
onBeforeUnmount(() => { swipeApi.commit = () => {}; swipeApi.undo = () => {}; swipeApi.shuffle = () => {} })
</script>

<template>
  <div class="body swipe-v">
    <div class="shead">
      <button class="deck" :class="{ open: R.pop === 'deck' }" @click.stop="openPop('deck', $event)">{{ deckName }}<UiIcon name="lucide:chevron-down" /></button>
      <span class="sp" />
      <div class="vtog">
        <button :class="{ on: S.swView === 'cards' }" @click="S.swView = 'cards'"><UiIcon name="lucide:layers" />{{ t('vCards') }}</button>
        <button :class="{ on: S.swView === 'gacha' }" @click="S.swView = 'gacha'"><span class="tgi" v-html="GLYPH_GACHA" />{{ t('vGacha') }}</button>
      </div>
      <button v-if="S.deck === 'icons'" class="fchip" :class="{ on: R.pop === 'filter' }" @click.stop="openPop('filter', $event)"><UiIcon name="lucide:sliders-horizontal" />{{ t('filterN') }}<span v-if="nFilters" class="n">{{ nFilters }}</span></button>
      <button class="tbtn" :title="`${t('shuffle')} (R)`" :disabled="front?.k !== 'set'" @click="shuffle"><UiIcon name="lucide:shuffle" /></button>
    </div>

    <GachaView v-if="S.swView === 'gacha'" />
    <template v-else>
      <div v-if="!D.list.length && (ready || S.deck !== 'icons')" class="rempty done">
        <div>
          <h2>{{ isChest ? t('chestDeckNone') : t('doneDeck') }}</h2>
          <div v-if="S.deck === 'icons'">{{ t('doneDeckSub') }}</div>
          <button v-if="!isChest || S.sets.length + S.uiFav.length" class="btn sec" @click="restart">{{ t('restart') }}</button>
        </div>
      </div>
      <div v-else-if="D.list.length" class="stage">
        <div ref="stackEl" class="stack" :class="front?.k === 'lib' ? 'wide' : front?.k === 'comp' ? 'mid' : ''">
          <div
            v-for="c in cards" :key="`${S.deck}:${c.id}`"
            class="card" :class="[c.k !== 'set' && 'ui', c.depth === 0 ? 'front' : c.depth === 1 ? 'back1' : 'back2', c.depth === 0 && drag.down && 'dragging']"
            :style="c.depth === 0 ? frontStyle : c.depth === 1 ? backStyle : undefined"
            @pointerdown="c.depth === 0 && down($event)" @pointermove="move" @pointerup="up" @pointercancel="up"
          >
            <!-- icon set card -->
            <template v-if="c.k === 'set'">
              <div class="ch"><b>{{ info(c.v).name }}</b></div>
              <div class="cg">
                <span v-for="(ic, i) in (icons[c.v] || Array(12).fill('')).slice(0, 12)" :key="i" :style="{ transition: 'opacity .18s', transitionDelay: fading[c.v] ? '0ms' : `${i * 12}ms`, opacity: fading[c.v] ? 0 : 1 }">
                  <UiIcon v-if="ic" :name="ic" />
                </span>
              </div>
              <div class="ct">
                <span v-if="D.today.includes(c.v)" class="k">{{ t('today') }}</span>
                <span v-if="info(c.v).category">{{ info(c.v).category }}</span>
                <span v-if="info(c.v).license">{{ info(c.v).license?.title }}</span>
                <span v-if="info(c.v).palette">{{ t('fMulti') }}</span>
                <span v-if="hgt(c.v)">{{ hgt(c.v) }}px</span>
              </div>
            </template>
            <!-- component / library card -->
            <template v-else>
              <div class="uh">
                <div>
                  <div class="ch"><b>{{ c.k === 'comp' ? ukl(c.v.split('/')[1]) : UI(c.v).name }}</b></div>
                  <div class="by">{{ c.k === 'comp' ? `${UI(c.v.split('/')[0]).name} · ${UI(c.v.split('/')[0]).fw}` : `${UI(c.v).fw} · ${udesc(UI(c.v))}` }}</div>
                </div>
                <button v-if="c.k === 'comp'" class="pill sm" @click.stop="openLib(c.v.split('/')[0])">{{ t('toLib') }}<UiIcon name="lucide:arrow-right" /></button>
              </div>
              <div class="uf">
                <template v-if="c.depth === 0">
                  <DemoFrame v-if="c.k === 'comp'" :lib="c.v.split('/')[0]" :keys="[c.v.split('/')[1]]" cls="one" />
                  <DemoFrame v-else :lib="c.v" keys="dash" cls="mini" />
                </template>
              </div>
            </template>
            <div class="stamp yes" :style="stampStyle(1)">{{ isChest ? t('chestKeep') : t('keepS') }}</div>
            <div class="stamp no" :style="stampStyle(-1)">{{ isChest ? t('chestOut') : t('skipS') }}</div>
            <div class="stamp open" :style="{ opacity: openOp }">{{ c.k === 'comp' ? t('toLib') : t('open') }}</div>
          </div>
        </div>
        <div class="prog"><div class="dots"><i v-for="(d, i) in dots" :key="i" :class="d" /></div></div>
        <div class="acts">
          <button class="ab sm" :title="`${t('undo')} (Z)`" :style="{ visibility: canUndo() ? 'visible' : 'hidden' }" @click="undo"><UiIcon name="lucide:undo-2" /></button>
          <button class="ab no" :title="`${isChest ? t('chestOut') : t('skip')} (←)`" :style="btnStyle(-1)" @click="commit('nope')"><UiIcon name="lucide:x" /></button>
          <button class="ab sm" :title="`${front?.k === 'comp' ? t('toLib') : t('open')} (↑)`" @click="commit('open')"><UiIcon name="lucide:arrow-up-right" /></button>
          <button ref="likeBtn" class="ab yes" :title="`${isChest ? t('chestKeep') : t('like')} (→)`" :style="btnStyle(1)" @click="commit('like')"><UiIcon name="lucide:heart" /></button>
          <span class="ab sm ghost" />
        </div>
        <div :key="combo.bump" class="combo" :class="{ show: combo.n >= 2, bump: combo.bump > 0 }"><UiIcon name="lucide:flame" /><span>{{ t('combo', { n: combo.n }) }}</span></div>
      </div>
    </template>

    <Pop id="deck" :w="220" place="below">
      <button v-for="[d, l, ic] in DECKS" :key="d" class="it" :class="{ on: S.deck === d, dk: true }" @click="pickDeck(d)"><UiIcon :name="ic" />{{ t(l) }}<span class="r">{{ deckCount(d) }}</span></button>
    </Pop>
    <Pop id="filter" :w="268" place="below">
      <div class="lbl">{{ t('fColor') }}</div>
      <div class="chips2"><button v-for="k2 in (['any', 'mono', 'multi'] as const)" :key="k2" :class="{ on: S.swf.color === k2 }" @click="S.swf.color = k2">{{ t(k2 === 'any' ? 'fAny' : k2 === 'mono' ? 'fMono' : 'fMulti') }}</button></div>
      <div class="lbl">{{ t('fCat') }}</div>
      <div class="chips2"><button :class="{ on: !S.swf.cat }" @click="S.swf.cat = null">{{ t('fAny') }}</button><button v-for="c in cats" :key="c" :class="{ on: S.swf.cat === c }" @click="S.swf.cat = c">{{ c }}</button></div>
      <hr>
      <button class="it" :class="{ on: S.swf.lic }" @click="S.swf.lic = !S.swf.lic">{{ t('fLic') }}<span class="r ck">✓</span></button>
      <button class="it" style="color:var(--muted)" @click="S.swf = { color: 'any', cat: null, lic: false }">{{ t('reset') }}</button>
    </Pop>
  </div>
</template>
