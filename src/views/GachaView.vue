<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import UiIcon from '../components/UiIcon.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, shortName } from '../lib/iconify'
import { SNAP, UI, udesc, ukl } from '../lib/ui-libs'
import { toast } from '../lib/actions'
import { swipeApi } from '../lib/swipe'
import { D, type Item, buildDeck, decide, gachaToday, item, pickIcons, putBack, restart } from '../lib/deck'
import { bumpChest } from '../lib/fx'
import { G, ISO, easeIO, easeOutBack, gachaSVG, sleep, tween } from '../lib/iso'

// 图标扭蛋机: drag the crank a full turn (or click it / press Space), gears turn, a capsule drops out
// of the door, opens and reveals the next deck item. Keep → it rolls down the chute into the chest
// (saved); put back → it flies back into the globe and goes to the end of the deck.
const root = ref<HTMLElement>()
const host = ref<HTMLElement>()
const card = ref<HTMLElement>()
const phase = ref<'idle' | 'turning' | 'busy' | 'reveal'>('idle')
const ang = ref(0)
const cur = ref<Item | null>(null)
const curIcons = ref<string[]>([])
const sfx = `gz${Math.random().toString(36).slice(2, 6)}`
const N = (n?: number) => Number(n || 0).toLocaleString()
const stats = computed(() => ({ stock: D.list.length, today: gachaToday().n, kept: S.gacha.kept }))
const kindName = computed(() => t(S.deck === 'comp' ? 'kComp' : S.deck === 'lib' ? 'kLib' : 'kSet'))
const angTxt = computed(() => `${Math.round(((ang.value % 360) + 360) % 360)}°`)

let cap: SVGGElement
let cranks: Element[] = []
let pcs: SVGGElement[] = []
let cp: [number, number, number] = [0, 0, 0]
const $ = (id: string) => host.value!.querySelector(`#${sfx}${id}`) as SVGGElement

function setCrank(a: number) {
  ang.value = a
  cranks.forEach(g => g.setAttribute('transform', `rotate(${a} ${G.CRANK[0]} ${G.CRANK[1]})`))
  const g = (id: string, m: number) => { const el = $(id); const [cx, cy] = el.dataset.c!.split(','); el.setAttribute('transform', `rotate(${a * m} ${cx} ${cy})`) }
  g('g1', 1); g('g2', -22 / 13); g('g3', -22 / 9 * 0.9)
}
function jiggle(k: number) {
  pcs.forEach((p, i) => {
    const x = +p.dataset.x!
    const y = +p.dataset.y!
    const r = +p.dataset.r!
    const s = Math.sin(k * Math.PI)
    p.setAttribute('transform', `translate(${(x + Math.sin(k * 9 + i * 1.7) * 2.2 * s).toFixed(2)},${(y + Math.cos(k * 11 + i) * 1.6 * s).toFixed(2)}) rotate(${r + Math.sin(k * 7 + i) * 20 * s})`)
  })
}
function capAt(X: number, Y: number, rot = 0, sc = 1) { cap.setAttribute('transform', `translate(${X.toFixed(2)},${Y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${sc})`); cp = [X, Y, rot] }

function bindCrank(hit: SVGElement) {
  let drag = false
  let acc = 0
  let la = 0
  let base = 0
  const angOf = (e: PointerEvent) => { const r = hit.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) }
  hit.addEventListener('pointerdown', (e) => { if (phase.value !== 'idle' || !D.list.length) return; drag = true; acc = 0; la = angOf(e); base = ang.value; hit.setPointerCapture(e.pointerId) })
  hit.addEventListener('pointermove', (e) => {
    if (!drag) return
    const a = angOf(e)
    let d = a - la
    if (d > Math.PI) d -= Math.PI * 2
    if (d < -Math.PI) d += Math.PI * 2
    la = a
    acc = d > 0 ? acc + d * 180 / Math.PI : Math.max(0, acc + d * 180 / Math.PI * 0.4)
    setCrank(base + acc)
    jiggle(Math.min(1, acc / 360) * 0.5)
    if (acc >= 360) { drag = false; setCrank(base + 360); dispense() }
  })
  hit.addEventListener('pointerup', () => {
    if (!drag) return
    drag = false
    if (acc < 15) turn()
    else if (acc >= 300) { const a0 = acc; tween(200, e => setCrank(base + a0 + (360 - a0) * e)).then(dispense) }
    else { const a0 = acc; tween(400, e => setCrank(base + a0 * (1 - e))) }
  })
}

async function turn() {
  if (phase.value !== 'idle' || !D.list.length) return
  phase.value = 'turning'
  const b = ang.value
  await tween(1150, (e, tt) => { setCrank(b + 360 * e); jiggle(tt) }, easeIO)
  dispense()
}

async function dispense() {
  phase.value = 'busy'
  const id = D.list[0]
  if (!id) { phase.value = 'idle'; return }
  const it = item(id)
  cur.value = it
  curIcons.value = it.k === 'set' ? (await pickIcons(it.v)).slice(0, 10) : []
  const g = gachaToday()
  g.n++
  const P = ISO.P
  const wrap = $('capwrap')
  jiggle(0)
  const ct = cap.querySelector('.ct')!
  ct.setAttribute('transform', '')
  wrap.setAttribute('clip-path', `url(#${sfx}doorclip)`)
  const a = P(60, 121, 70)
  const b = P(60, 121, 34 + 7.35)
  const flap = $('flap')
  const fy = 114 - G.DOOR[3] + 1
  tween(160, e => flap.setAttribute('transform', `translate(0,${fy}) scale(1,${1 - e * 0.85}) translate(0,${-fy})`))
  await tween(420, e => capAt(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, e * 40), (q: number) => q * q)
  tween(300, e => flap.setAttribute('transform', `translate(0,${fy}) scale(1,${0.15 + e * 0.85}) translate(0,${-fy})`), easeOutBack)
  await tween(160, (_e, tt) => capAt(b[0], b[1] - Math.sin(tt * Math.PI) * 4, 40))
  wrap.removeAttribute('clip-path')
  const c = P(60, 128.5, 34 + 7.35)
  await tween(320, e => capAt(b[0] + (c[0] - b[0]) * e, b[1] + (c[1] - b[1]) * e, 40 + e * 90), easeIO)
  await sleep(120)
  tween(420, e => ct.setAttribute('transform', `translate(${e * -3},${e * -15}) rotate(${-38 * e})`), easeOutBack)
  phase.value = 'reveal'
  await nextTick()
  showCard()
}

function fromCap(el: HTMLElement) {
  const cr = cap.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  return [cr.left + cr.width / 2 - er.left, cr.top + cr.height / 2 - er.bottom]
}
function showCard() {
  const el = card.value
  if (!el) return
  const [dx, dy] = fromCap(el)
  el.animate([{ opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.08)` }, { opacity: 1, offset: 0.5 }, { opacity: 1, transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'forwards' })
}
async function hideCard() {
  const el = card.value
  if (!el) return
  const [dx, dy] = fromCap(el)
  await el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.08)` }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished
}
async function closeCap() {
  const ct = cap.querySelector('.ct')!
  await tween(220, e => ct.setAttribute('transform', `translate(${(1 - e) * -3},${(1 - e) * -15}) rotate(${-38 * (1 - e)})`))
}

async function keep() {
  if (phase.value !== 'reveal' || !cur.value) return
  phase.value = 'busy'
  const it = cur.value
  const P = ISO.P
  await hideCard()
  await closeCap()
  const path: [number, number, number][] = [[60, 128.5, 41.35], [84, 126, 41.35], [180, 126, 37.35]]
  let rot = cp[2]
  for (let i = 0; i < path.length - 1; i++) {
    const a = P(...path[i])
    const b = P(...path[i + 1])
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    const r0 = rot
    await tween(L * 7, e => capAt(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, r0 + L * e / G.CR * 57.3), i === 0 ? ((q: number) => q * q) : ((q: number) => q))
    rot = r0 + L / G.CR * 57.3
  }
  const lid = $('lid')
  const C = G.CHEST
  const lidA = tween(380, e => { lid.innerHTML = ISO.lidSVG(C, e * 78) }, easeOutBack)
  const a = P(180, 126, 37.35)
  const c = P(219, 99, 36)
  const d = P(219, 99, 6)
  await tween(300, (e, tt) => capAt(a[0] + (c[0] - a[0]) * e, a[1] + (c[1] - a[1]) * e - Math.sin(tt * Math.PI) * 18, rot + e * 120), (q: number) => q)
  await tween(240, e => capAt(c[0], c[1] + (d[1] - c[1]) * e, rot + 120), (q: number) => q * q)
  capAt(-999, -999)
  await lidA
  await tween(520, (e, tt) => { lid.innerHTML = ISO.lidSVG(C, Math.max(0, 78 * (1 - e) + Math.sin(tt * Math.PI * 2.5) * 8 * (1 - tt))) }, (q: number) => q * q)
  lid.innerHTML = ISO.lidSVG(C, 0)
  decide(it.id, 'like')
  S.gacha.kept++
  bumpChest()
  toast(t('keptMsg', { n: it.k === 'set' ? shortName(it.v) : it.k === 'comp' ? `${UI(it.v.split('/')[0]).name} ${ukl(it.v.split('/')[1])}` : UI(it.v).name }), 'lucide:package-open')
  cur.value = null
  buildDeck()
  phase.value = 'idle'
}

async function back() {
  if (phase.value !== 'reveal' || !cur.value) return
  phase.value = 'busy'
  const it = cur.value
  const P = ISO.P
  await hideCard()
  await closeCap()
  const a = [cp[0], cp[1]]
  const tg = P(60, 60, 186)
  const r0 = cp[2]
  await tween(620, (e, tt) => capAt(a[0] + (tg[0] - a[0]) * e, a[1] + (tg[1] - a[1]) * e - Math.sin(tt * Math.PI) * 70, r0 - e * 300, 1 - e * 0.2), easeIO)
  await tween(200, e => capAt(tg[0], tg[1] + e * 30, r0 - 300, 0.8 * (1 - e)))
  capAt(-999, -999)
  await tween(500, (_e, tt) => jiggle(tt * 0.6))
  jiggle(0)
  putBack(it.id)
  cur.value = null
  phase.value = 'idle'
}

const label = (it: Item) => it.k === 'set' ? (INFO[it.v]?.name || it.v) : it.k === 'comp' ? ukl(it.v.split('/')[1]) : UI(it.v).name
const sub = (it: Item) => it.k === 'set' ? (INFO[it.v]?.author?.name || '') : it.k === 'comp' ? `${UI(it.v.split('/')[0]).name} · ${UI(it.v.split('/')[0]).fw}` : UI(it.v).fw

onMounted(() => {
  if (!host.value) return
  host.value.innerHTML = gachaSVG(sfx)
  cap = $('cap')
  cranks = [...host.value.querySelectorAll('.crot')]
  pcs = [...host.value.querySelectorAll<SVGGElement>('.pc')]
  bindCrank($('crankhit') as unknown as SVGElement)
  swipeApi.space = turn
  swipeApi.keep = keep
  swipeApi.back = back
  if (!D.list.length) buildDeck()
})
onBeforeUnmount(() => { swipeApi.space = () => {}; swipeApi.keep = () => {}; swipeApi.back = () => {} })
</script>

<template>
  <div ref="root" class="anat">
    <div ref="host" class="mhost" />
    <div class="corner tl"><b>FIG.05</b> · {{ t('gFig') }}</div>
    <div class="rdout">
      <span>{{ t('stock') }} <b>{{ stats.stock }}</b> {{ t('mei') }}</span>
      <span>{{ t('gToday') }} <b>{{ stats.today }}</b></span>
      <span>{{ t('gKept') }} <b :key="stats.kept" class="tick">{{ stats.kept }}</b></span>
      <span>{{ t('crank') }} <b>{{ angTxt }}</b></span>
    </div>
    <div class="corner bl" v-html="t('gHint')" />
    <div class="gidle" :style="{ opacity: phase === 'idle' ? 1 : 0, pointerEvents: phase === 'idle' ? 'auto' : 'none' }">
      <template v-if="D.list.length">
        <h4 v-html="t('gTitle', { k: kindName })" />
        <p>{{ t('gDesc', { k: kindName }) }}</p>
        <button class="btn pri go" @click="turn"><UiIcon name="lucide:dices" />{{ t('pull') }} <kbd>Space</kbd></button>
      </template>
      <template v-else>
        <h4>{{ t('gEmpty') }}</h4>
        <button class="btn sec go" @click="restart">{{ t('restart') }}</button>
      </template>
    </div>
    <div v-if="cur && phase !== 'idle'" ref="card" class="gcard" :class="{ show: phase === 'reveal' }">
      <span class="k">{{ t('newCap', { k: t(cur.k === 'set' ? 'kSet' : cur.k === 'comp' ? 'kComp' : 'kLib') }) }}</span>
      <div class="h"><b>{{ label(cur) }}</b><small>{{ sub(cur) }}</small></div>
      <template v-if="cur.k === 'set'">
        <div class="g"><span v-for="ic in curIcons" :key="ic"><UiIcon :name="ic" /></span></div>
        <div class="m">{{ t('icons', { n: N(INFO[cur.v]?.total) }) }} · {{ INFO[cur.v]?.license?.title }}<template v-if="INFO[cur.v]?.category"> · {{ INFO[cur.v]?.category }}</template></div>
      </template>
      <template v-else-if="cur.k === 'comp'">
        <div class="gdemo"><DemoFrame :lib="cur.v.split('/')[0]" :keys="[cur.v.split('/')[1]]" cls="one" /></div>
      </template>
      <template v-else>
        <div class="gsnap"><img v-if="SNAP[cur.v]" :src="SNAP[cur.v]" alt=""></div>
        <div class="m">{{ udesc(UI(cur.v)) }}</div>
      </template>
      <div class="bt">
        <button class="btn sec" @click="back"><UiIcon name="lucide:undo-2" />{{ t('putBack') }} <kbd>←</kbd></button>
        <button class="btn pri" @click="keep"><UiIcon name="lucide:package-open" />{{ t('keepIt') }} <kbd>→</kbd></button>
      </div>
    </div>
  </div>
</template>
