<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import UiIcon from '../components/UiIcon.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, shortName } from '../lib/iconify'
import { SNAP, UI, UICOL, ukl } from '../lib/ui-libs'
import { toast } from '../lib/actions'
import { gachaFx, swipeApi } from '../lib/swipe'
import { D, type Item, buildDeck, decide, gachaToday, item, pickIcons, putBack, restart } from '../lib/deck'
import { bumpChest, reduced } from '../lib/fx'
import { CASE, GACHA, GACHA_VB, GLYPH_GACHA, ISO, P3, PILE_PICK, RM, anim, clamp01, easeIO, easeOut, easeOutBack, gachaScene, sleep, tween } from '../lib/iso'

// 图标扭蛋机 (v10): an exploded-axonometric machine. First entry per app launch: assembled → explode → hold 1 s →
// reassemble. Drag the red crank a full turn (or Space): gears turn, a capsule drops into the exit tray, pops out,
// opens and becomes the card. Keep → it rolls into the capsule case beside the machine; put back → it flies back in.
const root = ref<HTMLElement>()
const svgEl = ref<SVGSVGElement>()
const card = ref<HTMLElement>()
const phase = ref<'idle' | 'busy' | 'reveal'>('idle')
const ang = ref(0)
const cur = ref<Item | null>(null)
const curIcons = ref<string[]>([])
const sfx = `gz${Math.random().toString(36).slice(2, 6)}`
const stats = computed(() => ({ stock: D.list.length, today: gachaToday().n, kept: S.gacha.kept }))
const angTxt = computed(() => `${Math.round(((ang.value % 360) + 360) % 360)}°`)
/** Exposed for screenshots/tests: animation phase (flip / assembled / explode / hold / re / drop / roll / hop). */
let busy = false
let T = 0
let svg: SVGSVGElement
let big: HTMLElement | null = null
let bigPos = { x: 0, y: 0 }
let hiddenPc: SVGGElement | null = null
let capc = { top: 'r', tag: '' }
const W = window as any
const setPhase = (p: string) => { W.__gacha = { ...(W.__gacha || {}), phase: p, T } }

function paintCase(lift: number, latch: number) {
  ISO.setSfx(`${sfx}g`)
  const C = GACHA.MINI_C
  const L: any = CASE.layout(C, 1, false)
  L.lid.z += lift
  L.latch = latch
  const cc = ['r', 'b', 'o', 'g', 'p', 't', 'w', 'r', 'g']
  L.caps = { 1: cc.map((top, i) => ({ top, tag: '', rot: -20 + i * 9 })), 2: cc.slice().reverse().map((top, i) => ({ top, tag: '', rot: 10 - i * 7 })) }
  L.show = { 1: cc.map(() => true), 2: cc.map(() => true) }
  const g = svg.querySelector('[data-p="case9"]')
  if (g) g.innerHTML = CASE.svg(C, L, {})
}
function setT(v: number) {
  T = v
  for (const p of GACHA.PARTS) {
    const e = easeIO(clamp01((v - p.a) / 0.45))
    const q = P3(p.v[0] * e * 1.25, p.v[1] * e * 1.25, p.v[2] * e * 1.25)
    svg.querySelector(`[data-p="${p.id}"]`)?.setAttribute('transform', `translate(${ISO.f(q[0])},${ISO.f(q[1])})`)
  }
  const A = GACHA_VB.A
  const E = GACHA_VB.E
  const k = easeIO(clamp01(v))
  svg.setAttribute('viewBox', A.map((a: number, i: number) => ISO.f(a + (E[i] - a) * k)).join(' '))
  W.__gacha = { ...(W.__gacha || {}), T }
}
async function explodeIntro() {
  busy = true
  setPhase('assembled')
  setT(0)
  if (RM()) { setPhase(''); busy = false; return }
  await sleep(380)
  setPhase('explode')
  await tween(950, e => setT(e), easeIO)
  setPhase('hold')
  await sleep(1000)
  setPhase('re')
  await tween(1500, e => setT(1 - e), easeIO)
  setT(0)
  anim(svg, [{ transform: 'translateY(0)' }, { transform: 'translateY(1.5px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' })
  setPhase('')
  busy = false
}
/** World point → client coordinates. */
function scr(x: number, y: number, z: number) {
  const q = P3(x, y, z)
  const m = svg.getScreenCTM()!
  return { x: m.a * q[0] + m.c * q[1] + m.e, y: m.b * q[0] + m.d * q[1] + m.f }
}
/** Home mini machine → this machine: shared element (FLIP), the rest of the page fades in after. */
async function flipIn(f: NonNullable<typeof gachaFx.flip>) {
  busy = true
  setPhase('flip')
  const mb = svg.getScreenCTM()!
  const ov = document.createElement('div')
  ov.className = 'flipov'
  ov.innerHTML = f.html
  document.querySelector('.win')!.appendChild(ov)
  ov.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px`
  const m1 = f.m
  const k = mb.a / m1.a
  const dx = mb.e - f.x - k * (m1.e - f.x)
  const dy = mb.f - f.y - k * (m1.f - f.y)
  svg.style.opacity = '0'
  const caseG = svg.querySelector('[data-p="case9"]') as SVGGElement
  caseG.style.opacity = '0'
  const host = root.value!
  const rest = [...(host.parentElement?.children || [])].filter(c => c !== host && !c.classList.contains('pop')) as HTMLElement[]
  const inner = [...host.children].filter(c => !c.classList.contains('gstage') && !c.classList.contains('gcard')) as HTMLElement[]
  const fades = [...rest, ...inner]
  fades.forEach(c => { c.style.opacity = '0' })
  W.__gacha = { ...(W.__gacha || {}), flipT: 0 }
  await tween(720, (e, tt) => {
    W.__gacha.flipT = tt
    const arc = Math.sin(tt * Math.PI) * -14
    ov.style.transform = `translate(${dx * e}px,${dy * e + arc}px) scale(${1 + (k - 1) * e})`
    fades.forEach((c, i) => { const d = clamp01((tt - 0.28 - i * 0.025) / 0.5); c.style.opacity = String(d); c.style.transform = d < 1 ? `translateY(${(1 - d) * 8}px)` : '' })
  }, easeIO)
  svg.style.opacity = ''
  ov.remove()
  fades.forEach((c) => { c.style.opacity = ''; c.style.transform = '' })
  await tween(260, (e) => { caseG.style.opacity = String(e) }, easeOut)
  caseG.style.opacity = ''
  W.__gacha.flipT = 1
  setPhase('')
  busy = false
}

// ---- crank + gears
function setCrank(a: number) {
  ang.value = a
  svg.querySelector('.crot')?.setAttribute('transform', `rotate(${ISO.f(a)})`)
  svg.querySelector('.gA')?.setAttribute('transform', `translate(30,22) rotate(${ISO.f(a)})`)
  svg.querySelector('.gB')?.setAttribute('transform', `translate(50.6,31.6) rotate(${ISO.f(-a * 14 / 9.2 + 8)})`)
  svg.querySelector('.gC')?.setAttribute('transform', `translate(13,34) rotate(${ISO.f(-a * 14 / 7)})`)
  const pd = svg.querySelector('.paddle')
  if (pd) { ISO.setSfx(`${sfx}g`); pd.innerHTML = GACHA.paddle(-a * Math.PI / 180 * 1.5) }
}
function bindCrank() {
  const el = svg.querySelector('[data-p="crank"]') as SVGGElement
  let drag = false
  let last = 0
  let acc = 0
  let moved = false
  const angOf = (e: PointerEvent) => { const b = svg.querySelector('.crot .hub')!.getBoundingClientRect(); return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI }
  el.addEventListener('pointerdown', (e) => { if (busy || phase.value !== 'idle' || !D.list.length) return; drag = true; moved = false; last = angOf(e); acc = 0; el.setPointerCapture(e.pointerId) })
  el.addEventListener('pointermove', (e) => {
    if (!drag) return
    const a = angOf(e)
    let d = a - last
    if (d > 180) d -= 360
    if (d < -180) d += 360
    last = a
    if (d > 0) { acc += d; moved = true; setCrank(ang.value + d) }
    if (acc >= 360) { drag = false; dispense() }
  })
  el.addEventListener('pointerup', () => { if (!drag) return; drag = false; if (!moved || acc < 15) turn() })
}
async function turn() {
  if (busy || phase.value !== 'idle' || !D.list.length) return
  busy = true
  const a0 = ang.value
  svg.querySelector('.pile')?.classList.add('shake')
  await tween(1050, e => setCrank(a0 + 360 * e), easeIO)
  busy = false
  dispense()
}

async function dispense() {
  if (busy) return
  const id = D.list[0]
  if (!id) return
  busy = true
  phase.value = 'busy'
  svg.querySelector('.pile')?.classList.remove('shake')
  const it = item(id)
  const g = gachaToday()
  g.n++
  // hide one capsule from the top of the pile; its colour is the capsule that comes out
  const hidden = PILE_PICK[g.n % PILE_PICK.length]
  hiddenPc = svg.querySelector(`.pc[data-i="${hidden}"]`)
  if (hiddenPc) hiddenPc.style.opacity = '0'
  const pt = GACHA.PILE[hidden]?.top
  capc = { top: pt && pt !== 'w' ? pt : ['r', 'b', 'g', 'o', 'p', 't'][g.n % 6], tag: '' }
  // drop from the exit opening into the tray
  const drop = svg.querySelector('.drop') as SVGGElement
  const a = P3(31, 103, 32)
  const b = P3(31, 106, 24.6)
  drop.innerHTML = `<g class="dc">${ISO.capsule(6.2, capc.top, capc.tag)}</g>`
  const dc = drop.firstChild as SVGGElement
  drop.setAttribute('transform', svg.querySelector('[data-p="exit"]')?.getAttribute('transform') || '')
  await tween(460, (_e, tt) => {
    const bt = tt < 0.62 ? (tt / 0.62) ** 2 : 1 - Math.sin((tt - 0.62) / 0.38 * Math.PI) * 0.12
    const y = a[1] + (b[1] - a[1]) * bt
    const x = a[0] + (b[0] - a[0]) * Math.min(1, tt * 1.4)
    dc.setAttribute('transform', `translate(${ISO.f(x)},${ISO.f(y)}) rotate(${ISO.f(tt * 140)})`)
  }, q => q)
  await sleep(160)
  // the card (hidden until the capsule opens)
  cur.value = it
  curIcons.value = it.k === 'set' ? (await pickIcons(it.v)).slice(0, 10) : []
  await nextTick()
  const r = dc.getBoundingClientRect()
  const R0 = r.width / 2
  const cr = card.value!.getBoundingClientRect()
  const R = 24
  big = document.createElement('div')
  big.className = 'flycap big'
  big.style.cssText = `width:${R * 2}px;height:${R * 2}px`
  big.innerHTML = `<svg class="iso10" viewBox="${-R} ${-R} ${2 * R} ${2 * R}" style="overflow:visible">${ISO.capsule(R, capc.top, capc.tag)}</svg>`
  document.querySelector('.win')!.appendChild(big)
  drop.innerHTML = ''
  const sx = r.left + R0 - R
  const sy = r.top + R0 - R
  const ex = cr.left + cr.width / 2 - R
  const ey = cr.top - 30 - R
  const kf: Keyframe[] = []
  for (let n = 0; n <= 16; n++) {
    const tt = n / 16
    const u = 1 - tt
    const cx = (sx + ex) / 2
    const cy = Math.min(sy, ey) - 90
    kf.push({ transform: `translate(${u * u * sx + 2 * u * tt * cx + tt * tt * ex}px,${u * u * sy + 2 * u * tt * cy + tt * tt * ey}px) scale(${R0 / R + (1 - R0 / R) * tt}) rotate(${tt * 360}deg)` })
  }
  await anim(big, kf, { duration: 620, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished
  bigPos = { x: ex, y: ey }
  await openCap()
  phase.value = 'reveal'
  busy = false
}
async function openCap() {
  const c = card.value!
  if (big) {
    anim(big.querySelector('.ctop')!, [{ transform: 'none' }, { transform: 'translate(-40px,6px) rotate(-30deg)' }], { duration: 440, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'forwards' })
    anim(big.querySelector('.cbot')!, [{ transform: 'none' }, { transform: 'translate(40px,-2px) rotate(24deg)' }], { duration: 440, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'forwards' })
    anim(big.querySelector('.cseam')!, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' })
  }
  c.style.transformOrigin = '50% -30px'
  await anim(c, [{ transform: 'scale(.18)', opacity: 0, borderRadius: '50%' }, { transform: 'scale(1.03)', opacity: 1, borderRadius: '16px', offset: 0.72 }, { transform: 'scale(1)', opacity: 1, borderRadius: '16px' }], { duration: 480, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished
}
async function closeCap() {
  const c = card.value
  if (c) await anim(c, [{ transform: 'scale(1)', opacity: 1, borderRadius: '16px' }, { transform: 'scale(.18)', opacity: 0, borderRadius: '50%' }], { duration: 300, easing: 'ease-in', fill: 'forwards' }).finished
  if (!big) return
  anim(big.querySelector('.ctop')!, [{ transform: 'translate(-40px,6px) rotate(-30deg)' }, { transform: 'none' }], { duration: 280, easing: 'ease-out', fill: 'forwards' })
  anim(big.querySelector('.cbot')!, [{ transform: 'translate(40px,-2px) rotate(24deg)' }, { transform: 'none' }], { duration: 280, easing: 'ease-out', fill: 'forwards' })
  await anim(big.querySelector('.cseam')!, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' }).finished
}
function restorePile() { if (hiddenPc) hiddenPc.style.opacity = ''; hiddenPc = null }

async function keep() {
  if (phase.value !== 'reveal' || busy || !cur.value) return
  busy = true
  phase.value = 'busy'
  const it = cur.value
  await closeCap()
  const R = 24
  const r = 9
  const sc = r / R
  const t0 = scr(31, 121, 0)
  const c0 = scr(122, 112, 0)
  const lidTop = scr(148, 56, 26)
  const p0 = bigPos
  const p1 = { x: t0.x - R, y: t0.y - R - r }
  const p2 = { x: c0.x - R, y: c0.y - R - r }
  setPhase('drop')
  if (big) {
    await anim(big, [{ transform: `translate(${p0.x}px,${p0.y}px) scale(1)` }, { transform: `translate(${p1.x}px,${p1.y}px) scale(${sc}) rotate(200deg)` }], { duration: 460, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).finished
    setPhase('roll')
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const rot = 200 + dist / r * 57.3
    await anim(big, [{ transform: `translate(${p1.x}px,${p1.y}px) scale(${sc}) rotate(200deg)` }, { transform: `translate(${(p1.x + p2.x) / 2}px,${(p1.y + p2.y) / 2 - 3}px) scale(${sc}) rotate(${(200 + rot) / 2}deg)` }, { transform: `translate(${p2.x}px,${p2.y}px) scale(${sc}) rotate(${rot}deg)` }], { duration: 760, easing: 'cubic-bezier(.3,.1,.4,1)', fill: 'forwards' }).finished
    setPhase('hop')
    tween(260, e => paintCase(e * 10, e), easeOut)
    await sleep(120)
    const p3 = { x: lidTop.x - R, y: lidTop.y - R }
    await anim(big, [{ transform: `translate(${p2.x}px,${p2.y}px) scale(${sc}) rotate(${rot}deg)` }, { transform: `translate(${(p2.x + p3.x) / 2}px,${Math.min(p2.y, p3.y) - 34}px) scale(${sc}) rotate(${rot + 120}deg)` }, { transform: `translate(${p3.x}px,${p3.y + 8}px) scale(${sc * 0.8}) rotate(${rot + 200}deg)`, opacity: 0.2 }], { duration: 440, easing: 'cubic-bezier(.4,0,.5,1)', fill: 'forwards' }).finished
    big.remove()
    big = null
    await tween(300, e => paintCase(10 - e * 10, 1 - e), easeOutBack)
  }
  decide(it.id, 'like')
  S.gacha.kept++
  bumpChest()
  toast(t('keptMsg', { n: label(it) }), 'lucide:package-open')
  cur.value = null
  restorePile()
  buildDeck()
  setPhase('')
  phase.value = 'idle'
  busy = false
}

async function back() {
  if (phase.value !== 'reveal' || busy || !cur.value) return
  busy = true
  phase.value = 'busy'
  const it = cur.value
  await closeCap()
  const R = 24
  const top = scr(50, 50, 150)
  const p0 = bigPos
  const p1 = { x: top.x - R, y: top.y - R }
  const sc = 6 / R
  const lidEl = svg.querySelector('[data-p="lid"]')!
  const kf: Keyframe[] = []
  for (let n = 0; n <= 16; n++) {
    const tt = n / 16
    const u = 1 - tt
    const cx = (p0.x + p1.x) / 2
    const cy = Math.min(p0.y, p1.y) - 80
    kf.push({ transform: `translate(${u * u * p0.x + 2 * u * tt * cx + tt * tt * p1.x}px,${u * u * p0.y + 2 * u * tt * cy + tt * tt * p1.y}px) scale(${1 + (sc - 1) * tt}) rotate(${-tt * 300}deg)`, opacity: tt > 0.9 ? 0 : 1 })
  }
  tween(700, (_e, tt) => { const q = P3(0, 0, Math.sin(tt * Math.PI) * 16); lidEl.setAttribute('transform', `translate(${ISO.f(q[0])},${ISO.f(q[1])})`) }, q => q)
  if (big) { await anim(big, kf, { duration: 660, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished; big.remove(); big = null }
  restorePile()
  const pile = svg.querySelector('.pile')
  pile?.classList.add('shake')
  await sleep(420)
  pile?.classList.remove('shake')
  putBack(it.id)
  cur.value = null
  toast(t('putBackMsg'), 'lucide:undo-2')
  phase.value = 'idle'
  busy = false
}

const label = (it: Item) => it.k === 'set' ? shortName(it.v) : it.k === 'comp' ? `${UI(it.v.split('/')[0]).name} ${ukl(it.v.split('/')[1])}` : UI(it.v).name
const kindK = (it: Item) => t(it.k === 'set' ? 'kSet' : it.k === 'comp' ? 'kComp' : 'kLib')
const dotOf = (it: Item) => it.k === 'set' ? '' : UICOL[it.v.split('/')[0]] || ''

onMounted(() => {
  svg = svgEl.value!
  ISO.setSfx(`${sfx}g`)
  svg.innerHTML = gachaScene(`${sfx}g`, { withCase: true })
  paintCase(0, 0)
  setT(0)
  bindCrank()
  swipeApi.space = turn
  swipeApi.keep = keep
  swipeApi.back = back
  if (!D.list.length) buildDeck()
  const flip = gachaFx.flip
  gachaFx.flip = null
  const first = !gachaFx.exploded
  gachaFx.exploded = true
  ;(async () => {
    if (flip && !reduced()) await flipIn(flip)
    if (first) await explodeIntro()
  })()
})
onBeforeUnmount(() => {
  swipeApi.space = () => {}
  swipeApi.keep = () => {}
  swipeApi.back = () => {}
  big?.remove()
  document.querySelectorAll('.flipov').forEach(e => e.remove())
})
</script>

<template>
  <div ref="root" class="anat g101">
    <div class="gstage"><svg ref="svgEl" class="isosvg iso10 gsvg" preserveAspectRatio="xMidYMid meet" /></div>
    <div class="rdout">
      <span>{{ t('stock') }} <b>{{ stats.stock }}</b> {{ t('mei') }}</span>
      <span>{{ t('gToday') }} <b>{{ stats.today }}</b></span>
      <span>{{ t('gKept') }} <b :key="stats.kept" class="tick">{{ stats.kept }}</b></span>
      <span>{{ t('crank') }} <b>{{ angTxt }}</b></span>
    </div>
    <div class="corner bl" v-html="t('gHint')" />
    <div class="gidle" :class="{ dim: phase !== 'idle' }">
      <template v-if="D.list.length">
        <h4>{{ t('gName') }}</h4>
        <button class="btn pri go" @click="turn"><span class="tgi" v-html="GLYPH_GACHA" />{{ t('pull') }}<kbd>Space</kbd></button>
      </template>
      <template v-else>
        <h4>{{ t('gEmpty') }}</h4>
        <button class="btn sec go" @click="restart">{{ t('restart') }}</button>
      </template>
    </div>
    <div v-if="cur" ref="card" class="gcard" :class="{ show: phase === 'reveal' }">
      <span class="k">{{ kindK(cur) }}</span>
      <div class="h"><i v-if="dotOf(cur)" class="fdot" :style="{ background: dotOf(cur) }" /><b>{{ cur.k === 'set' ? (INFO[cur.v]?.name || cur.v) : cur.k === 'comp' ? ukl(cur.v.split('/')[1]) : UI(cur.v).name }}</b><small v-if="cur.k === 'comp'">{{ UI(cur.v.split('/')[0]).name }}</small></div>
      <template v-if="cur.k === 'set'">
        <div class="g"><span v-for="ic in curIcons" :key="ic"><UiIcon :name="ic" /></span></div>
        <div class="m">{{ [INFO[cur.v]?.category, INFO[cur.v]?.license?.title].filter(Boolean).join(' · ') }}</div>
      </template>
      <template v-else-if="cur.k === 'comp'">
        <div class="gdemo"><DemoFrame :lib="cur.v.split('/')[0]" :keys="[cur.v.split('/')[1]]" cls="one" /></div>
      </template>
      <template v-else>
        <div class="gsnap"><img v-if="SNAP[cur.v]" :src="SNAP[cur.v]" alt=""></div>
        <div class="m">{{ UI(cur.v).fw }}</div>
      </template>
      <div class="bt">
        <button class="btn sec" @click="back"><UiIcon name="lucide:undo-2" />{{ t('putBack') }} <kbd>←</kbd></button>
        <button class="btn pri" @click="keep"><UiIcon name="lucide:check" />{{ t('keepIt') }} <kbd>→</kbd></button>
      </div>
    </div>
  </div>
</template>
