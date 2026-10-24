<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIcon from '../components/UiIcon.vue'
import DemoFrame from '../components/DemoFrame.vue'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, shortName } from '../lib/iconify'
import { SNAP, UI, UICOL, ukl } from '../lib/ui-libs'
import { setMode, toast } from '../lib/actions'
import { gachaFx, swipeApi } from '../lib/swipe'
import { D, type Item, buildDeck, decide, gachaToday, item, pickIcons, putBack, restart } from '../lib/deck'
import { bumpChest, chestFx, machFx, pageFx, reduced } from '../lib/fx'
import { CHEST, GLYPH_GACHA, GM, INK, anim, clamp01, easeIO, easeOut, easeOutBack, sleep, tween } from '../lib/iso'
import { capD, favIds, heapSVG, restTokens } from '../lib/heap'

// 图标扭蛋机 (v11): a hand-inked isometric gashapon. Turn the knob (drag a full turn, Space, or the button): the body
// shakes and the capsules jiggle → the exit flap swings out and a capsule rolls onto the tray → it pops up, flies to the
// card's top-right corner and splits open into the card; the opened capsule stays perched there until the card is
// kept / put back (v0.4.1). Idle: the machine is centred with the 扭一下 button beside its knob; a turn slides the
// machine (scaled down) to the left for the card. v0.4.7: after 收下 / 放回 the machine stays on the left and a
// 「再扭一下」 button (same look) takes the card's place; only a fresh entry (no result yet) is centred. Keep → it hops into the small chest beside the machine; put back → it flies
// back into the globe. Shared elements: home mini machine → this machine (FLIP); 收藏 ↔ here (chest + machine).
const root = ref<HTMLElement>()
const svgEl = ref<SVGSVGElement>()
const card = ref<HTMLElement>()
const stage = ref<HTMLElement>()
/** v0.4.1: idle = machine centred; a turn slides it (scaled down) to the left to make room for the card. */
const aside = ref(false)
const lay = ref({ bx: 0, by: 0, cy: 0, ax: 0, ay: 0 })
const phase = ref<'idle' | 'busy' | 'reveal'>('idle')
const ang = ref(0)
const cur = ref<Item | null>(null)
const curIcons = ref<string[]>([])
const stats = computed(() => ({ stock: D.list.length, today: gachaToday().n, kept: S.gacha.kept }))
const angTxt = computed(() => `${Math.round(((ang.value % 360) + 360) % 360)}°`)
let busy = false
let svg: SVGSVGElement
let big: HTMLElement | null = null
let bigPos = { x: 0, y: 0 }
let hiddenPc: SVGGElement | null = null
let cap = { c: '#e5484d', th: -24, m: 0.4 }
/** Resting rotation of the flying capsule: turns its seam to the default −24° so the coloured half points up-left. */
let capRot = 0
const BR = 24
const W = window as any
/** Exposed for screenshots/tests: animation phase. */
const setPhase = (p: string) => { if (W.__gacha) W.__gacha.phase = p }
const $ = <T extends Element = SVGGElement>(sel: string) => svg.querySelector(sel) as T
const win = () => document.querySelector('.win')!

/** World point → client coordinates. */
function scr(x: number, y: number, z: number) {
  const q = INK.P(x, y, z)
  const m = svg.getScreenCTM()!
  return { x: m.a * q[0] + m.c * q[1] + m.e, y: m.b * q[0] + m.d * q[1] + m.f, s: m.a }
}
function flycap(R: number, c = cap, lw = 1.3) {
  const d = document.createElement('div')
  d.className = 'flycap big'
  d.style.cssText = `width:${R * 2}px;height:${R * 2}px`
  d.innerHTML = `<svg class="ink" viewBox="${-R} ${-R} ${2 * R} ${2 * R}" style="overflow:visible">${INK.capsule(R, c.c, { th: c.th, m: c.m, lw })}</svg>`
  win().appendChild(d)
  return d
}
const arc = (p0: { x: number, y: number }, p1: { x: number, y: number }, lift: number, n: number, f: (t: number) => string, op?: (t: number) => number) => {
  const kf: Keyframe[] = []
  for (let i = 0; i <= n; i++) {
    const tt = i / n
    const u = 1 - tt
    const cx = (p0.x + p1.x) / 2
    const cy = Math.min(p0.y, p1.y) - lift
    const k: Keyframe = { transform: `translate(${u * u * p0.x + 2 * u * tt * cx + tt * tt * p1.x}px,${u * u * p0.y + 2 * u * tt * cy + tt * tt * p1.y}px) ${f(tt)}` }
    if (op) k.opacity = op(tt)
    kf.push(k)
  }
  return kf
}
const fades = () => {
  const host = root.value!
  const rest = [...(host.parentElement?.children || [])].filter(c => c !== host && !c.classList.contains('pop')) as HTMLElement[]
  const inner = [...host.children].filter(c => !c.classList.contains('gstage') && !c.classList.contains('gcard')) as HTMLElement[]
  return [...rest, ...inner, ...host.querySelectorAll<HTMLElement>('.gknob')]
}

// ---- layout (v0.4.1)
// The stage covers the whole page; the viewBox is computed so the machine (not machine + chest) is centred
// horizontally and sits optically centred under the header. Moving left is a CSS transform on the stage
// (transform only), so getScreenCTM-based geometry (knob drag, capsule paths) keeps working while it moves.
const MC = { x: 0, y: -20 } // machine centre in scene units (globe top ≈ −84, base + shadow ≈ +47)
const MK = 0.8 // scale when moved left
function layout() {
  const el = stage.value
  if (!el || !svg) return
  const W = el.clientWidth
  const H = el.clientHeight
  if (!W || !H) return
  const s = Math.min(2.55, (H * 0.8) / 134, (W * 0.62) / 134)
  const cy = H * 0.46
  svg.setAttribute('viewBox', [MC.x - W / 2 / s, MC.y - cy / s, W / s, H / s].map(INK.f).join(' '))
  // the 扭一下 button sits right next to the knob (knob centre ≈ scene (19, 2.6); its right edge ≈ x 27)
  const kq = INK.P(GM.W + 2, GM.DP - GM.DIAL.u, GM.BH - GM.DIAL.v)
  lay.value = { ...lay.value, bx: W / 2 + (kq[0] + 12 - MC.x) * s, by: cy + (kq[1] - MC.y) * s, cy }
  // v0.4.3 moved layout: [machine + small chest] gap [card] is centred as one group with equal outer margins
  // (right margin ≥ 32 px); the card is vertically centred on the machine's visual centre, clear of the header.
  // horizontal extent from the drawn shadow/machine/chest; clamped to the design range (scene x −40…80) in case a
  // transient element (drop capsule, open flap) is measured mid-animation
  const g0 = groupBox()
  const bb = { x0: Math.max(W / 2 - 42 * s, Math.min(W / 2 - 30 * s, g0?.x0 ?? -Infinity)), x1: Math.min(W / 2 + 80 * s, Math.max(W / 2 + 70 * s, g0?.x1 ?? Infinity)) }
  const gw = (bb.x1 - bb.x0) * MK
  const cw = Math.round(Math.min(316, Math.max(262, W * 0.25)))
  const gap = Math.round(Math.min(84, Math.max(36, W * 0.06)))
  const side = Math.max(32, (W - gw - gap - cw) / 2)
  // the move is translateX(dx) scale(MK) about (W/2, cy): x' = W/2 + (x − W/2)·MK + dx
  const dx = side + gw / 2 - (W / 2 + ((bb.x0 + bb.x1) / 2 - W / 2) * MK)
  el.style.setProperty('--gdx', `${INK.f(dx)}px`)
  el.style.setProperty('--gk', String(MK))
  el.style.setProperty('--gox', `${INK.f(W / 2)}px`)
  el.style.setProperty('--goy', `${INK.f(cy)}px`)
  root.value?.style.setProperty('--gcy', `${INK.f(cy)}px`)
  // visual centre of the machine after the move (globe top −84 … base +47 in scene units ≈ MC.y)
  const mvy = cy + (-18.5 - MC.y) * s * MK
  cardBox = { l: W - side - cw, w: cw, cy: mvy, H }
  // v0.4.7: 「再扭一下」 sits in the middle of the card slot
  lay.value.ax = cardBox.l + cw / 2
  lay.value.ay = Math.max(CARD_TOP + 18, Math.min(mvy, H - 30))
  placeCard()
  if (big && phase.value === 'reveal') parkCap()
}
/** Horizontal extent of the machine (+ its shadow) and small chest in unmoved stage pixels: getBBox in each
 *  element's own space mapped through getCTM (element → svg viewport, which fills the stage; the stage's CSS move
 *  transform is not included). */
function groupBox() {
  let x0 = Infinity
  let x1 = -Infinity
  for (const q of ['.mach', '.m-sh', '.chestg']) {
    const e = svg.querySelector(q) as SVGGraphicsElement | null
    try {
      const b = e?.getBBox()
      const m = e?.getCTM()
      if (!b || !b.width || !m) continue
      for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height], [b.x + b.width, b.y]]) { const X = m.a * x + m.c * y + m.e; x0 = Math.min(x0, X); x1 = Math.max(x1, X) }
    }
    catch {}
  }
  return Number.isFinite(x0) ? { x0, x1 } : null
}
/** Card geometry in stage (= .anat) coordinates, computed by layout(). */
let cardBox = { l: 0, w: 262, cy: 200, H: 400 }
const CARD_TOP = 48 // leaves room for the capsule resting on the corner below the header row
function placeCard() {
  const c = card.value
  if (!c) return
  const h = c.offsetHeight || 240
  const top = Math.max(CARD_TOP, Math.min(cardBox.cy - h / 2, cardBox.H - 12 - h))
  c.style.left = `${Math.round(cardBox.l)}px`
  c.style.right = 'auto'
  c.style.width = `${cardBox.w}px`
  c.style.top = `${Math.round(top)}px`
}
let ro: ResizeObserver | null = null
// the move is a CSS transition; scale its duration with the screenshot SLOW factor
watch(aside, () => { if (stage.value) stage.value.style.transitionDuration = `${720 * (W.SLOW || 1)}ms` }, { flush: 'sync' })

// ---- shared elements
/** Home mini machine → this machine (FLIP); the rest of the page fades in; the small chest drops in after. */
async function flipIn(f: NonNullable<typeof gachaFx.flip>) {
  busy = true
  setPhase('flip')
  const mb = svg.getScreenCTM()!
  const ov = document.createElement('div')
  ov.className = 'flipov'
  ov.innerHTML = f.html
  win().appendChild(ov)
  ov.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px`
  const m1 = f.m
  const k = mb.a / m1.a
  const dx = mb.e - f.x - k * (m1.e - f.x)
  const dy = mb.f - f.y - k * (m1.f - f.y)
  svg.style.opacity = '0'
  const ch = $('.chestg')
  const chs = $('.chest-sh')
  const fs = fades()
  fs.forEach((c) => { c.style.opacity = '0' })
  W.__gacha.flipT = 0
  await tween(620, (e, tt) => {
    W.__gacha.flipT = tt
    const a = Math.sin(tt * Math.PI) * -12
    ov.style.transform = `translate(${dx * e}px,${dy * e + a}px) scale(${1 + (k - 1) * e})`
    fs.forEach((c, i) => { const d = clamp01((tt - 0.25 - i * 0.025) / 0.45); c.style.opacity = String(d); c.style.transform = d < 1 ? `translateY(${(1 - d) * 8}px)` : '' })
  }, easeIO)
  ch.style.opacity = '0'
  chs.style.opacity = '0'
  svg.style.opacity = ''
  ov.remove()
  fs.forEach((c) => { c.style.opacity = ''; c.style.transform = '' })
  anim(ch, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.3,1.2)' }).finished.then(() => { ch.style.opacity = '' })
  anim(chs, [{ opacity: 0 }, { opacity: 1 }], { duration: 240 }).finished.then(() => { chs.style.opacity = '' })
  W.__gacha.flipT = 1
  setPhase('')
  busy = false
}
/** 收藏 → here: the big chest shrinks into the small chest (lid closing on the way) while the small machine beside it
 *  grows into this machine — one 420 ms tween; shadows fade in late. */
async function chestIn(src: DOMRect, msrc: DOMRect | null) {
  busy = true
  setPhase('chestIn')
  const g = $('.chestg')
  const body = g.querySelector('.cbody') as SVGGElement
  const C = CHEST.SMALL
  const b = body.getBBox()
  const m = svg.getScreenCTM()!
  const sx = (src.left - m.e) / m.a
  const sy = (src.top - m.f) / m.d
  const s0 = (src.width / m.a) / b.width
  const tx0 = sx - s0 * b.x
  const ty0 = sy - s0 * b.y
  const mach = $('.mach')
  fades().forEach((c, i) => anim(c, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 120 + i * 20, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' }))
  const csh = $('.chest-sh')
  const msh = $('.m-sh')
  csh.style.opacity = '0'
  anim(csh, [{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: 420 }).finished.then(() => { csh.style.opacity = '' })
  let mT: ((e: number) => void) | null = null
  if (msrc) {
    const mb = mach.getBBox()
    const ms0 = (msrc.width / m.a) / mb.width
    const mx0 = (msrc.left - m.e) / m.a - ms0 * mb.x
    const my0 = (msrc.top - m.f) / m.d - ms0 * mb.y
    mT = (e) => { const sc = ms0 + (1 - ms0) * e; mach.setAttribute('transform', `translate(${INK.f(mx0 * (1 - e))},${INK.f(my0 * (1 - e))}) scale(${INK.f(sc)})`) }
    mT(0)
    msh.style.opacity = '0'
    anim(msh, [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: 420 }).finished.then(() => { msh.style.opacity = '' })
  }
  else { anim(mach, [{ opacity: 0, transform: 'translateX(-26px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }) }
  const lid = g.querySelector('.clid') as SVGGElement
  const glow = g.querySelector('.c-glow') as SVGElement | null
  await tween(420, (e, tt) => {
    const sc = s0 + (1 - s0) * e
    g.setAttribute('transform', `translate(${INK.f(tx0 * (1 - e))},${INK.f(ty0 * (1 - e))}) scale(${INK.f(sc)})`)
    CHEST.setLid(lid, C, 104 * (1 - easeOut(clamp01(tt * 1.15))))
    if (glow) glow.style.opacity = String(1 - tt)
    mT?.(e)
  }, tt => 1 - (1 - tt) ** 3)
  g.removeAttribute('transform')
  mach.removeAttribute('transform')
  CHEST.setLid(lid, C, 0)
  anim(g, [{ transform: 'translateY(0)' }, { transform: 'translateY(.8px)' }, { transform: 'none' }], { duration: 200, easing: 'ease-out' })
  setPhase('')
  busy = false
}
function handoff(to: string) {
  if (to !== 'fav' || !svg) return
  chestFx.from = $('.chestg .cbody').getBoundingClientRect()
  machFx.from = $('.mach').getBoundingClientRect()
}
/** Leaving (non-blocking): to 收藏 the chest and machine travel as shared elements, so hide them here and slide the rest out. */
function exit(layer: HTMLElement, to: string) {
  big?.remove()
  big = null
  if (to === 'fav') layer.querySelectorAll<SVGElement>('.chestg,.mach,.m-sh,.chest-sh').forEach((e) => { e.style.opacity = '0' })
  const host = layer.querySelector('.anat')
  ;[...layer.children].filter(c => c !== host && !c.classList.contains('pop')).concat([...(host?.querySelectorAll(':scope>*:not(.gstage)') || [])])
    .forEach(c => anim(c as HTMLElement, [{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: 'forwards' }))
  return anim(layer, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: to === 'fav' ? 'translateX(-36px)' : 'translateY(-4px)' }], { duration: to === 'fav' ? 300 : 180, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).finished
}

// ---- knob · shake
function setKnob(a: number) {
  ang.value = a
  $('.knobg').innerHTML = GM.knob(a)
}
function jiggle(k: number) {
  const now = performance.now()
  svg.querySelectorAll('.pcj').forEach((c, i) => {
    const a = k ? (INK.hsh(i, now % 997) - 0.5) * 2.2 * k : 0
    const b = k ? (INK.hsh(now % 991, i) - 0.5) * 1.6 * k : 0
    if (k) c.setAttribute('transform', `translate(${INK.f(a)},${INK.f(b)})`)
    else c.removeAttribute('transform')
  })
}
/** Machine shake: transform only (body group + capsules); the ground shadow stays put. */
function shake(dur: number, amp = 1) {
  const shk = $('.shk')
  return tween(dur, (_e, tt) => {
    const env = Math.sin(Math.PI * tt) * amp
    const x = Math.sin(tt * Math.PI * 14) * 0.9 * env
    const y = Math.cos(tt * Math.PI * 18) * 0.35 * env
    const r = Math.sin(tt * Math.PI * 11) * 0.7 * env
    shk.setAttribute('transform', `translate(${INK.f(x)},${INK.f(y)}) rotate(${INK.f(r)} 0 40)`)
    jiggle(env * 1.4)
  }, q => q).then(() => { shk.removeAttribute('transform'); jiggle(0) })
}
function bindKnob() {
  const el = $('.knobg')
  let drag = false
  let last = 0
  let acc = 0
  let moved = false
  const ctr = () => scr(GM.W + 2, GM.DP - GM.DIAL.u, GM.BH - GM.DIAL.v)
  const angOf = (e: PointerEvent) => { const c = ctr(); return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI }
  el.addEventListener('pointerdown', (e) => { if (busy || phase.value !== 'idle' || !D.list.length) return; drag = true; moved = false; last = angOf(e); acc = 0; el.setPointerCapture(e.pointerId) })
  el.addEventListener('pointermove', (e) => {
    if (!drag) return
    const a = angOf(e)
    let d = a - last
    if (d > 180) d -= 360
    if (d < -180) d += 360
    last = a
    if (d > 0) { acc += d; moved = true; setKnob(ang.value + d); jiggle(Math.min(1, d / 12)) }
    if (acc >= 360) { drag = false; busy = true; aside.value = true; shake(380).then(() => { busy = false; dispense() }) }
  })
  el.addEventListener('pointerup', () => { if (!drag) return; drag = false; jiggle(0); if (!moved || acc < 12) turn() })
}
async function turn() {
  if (busy || phase.value !== 'idle' || !D.list.length) return
  busy = true
  phase.value = 'busy'
  aside.value = true
  setPhase('turn')
  const a0 = ang.value
  shake(900, 1)
  await tween(900, (e, tt) => {
    if (tt > 0.28 && tt < 0.8) setPhase('shake')
    setKnob(a0 + 360 * e + Math.sin(tt * Math.PI * 8) * 2 * (1 - tt))
  }, easeIO)
  setKnob(a0 + 360)
  busy = false
  await dispense()
}

// ---- dispense → open
async function dispense() {
  if (busy) return
  const id = D.list[0]
  if (!id) { phase.value = 'idle'; aside.value = false; return }
  busy = true
  phase.value = 'busy'
  setPhase('drop')
  const it = item(id)
  const g = gachaToday()
  g.n++
  // one capsule leaves the top of the pile; its colours are the capsule that comes out
  const hi = GM.PICK[(g.n * 7) % GM.PICK.length]
  hiddenPc = svg.querySelector(`.pc[data-i="${hi}"]`)
  if (hiddenPc) anim(hiddenPc, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })
  const pc = GM.PILE[hi]
  cap = { c: pc.c, th: pc.th, m: pc.m }
  const flapG = $('.flapg')
  const drop = $('.drop')
  drop.innerHTML = `<g class="dc">${INK.capsule(GM.CR * 1.2247, cap.c, { th: cap.th, m: cap.m, lw: 0.42 })}</g>`
  const dc = drop.firstChild as SVGGElement
  const yC = GM.DP - (GM.EXIT.u0 + GM.EXIT.u1) / 2
  tween(150, (e) => { flapG.innerHTML = GM.flap(62 * e) }, easeOut)
  await tween(400, (e, tt) => {
    const x = 36 + (44.6 - 36) * e
    const z = 11.5 + (2.2 + GM.CR - 11.5) * Math.min(1, tt * 1.25) ** 2 + (tt > 0.8 ? Math.sin((tt - 0.8) / 0.2 * Math.PI) * 0.9 : 0)
    const q = INK.P(x, yC, z)
    dc.setAttribute('transform', `translate(${INK.f(q[0])},${INK.f(q[1])}) rotate(${INK.f(tt * 220)})`)
  }, tt => 1 - (1 - tt) ** 2)
  tween(220, (e) => { flapG.innerHTML = GM.flap(62 * (1 - e)) }, easeOutBack)
  setPhase('out')
  await sleep(140)
  // the card (hidden until the capsule opens)
  cur.value = it
  curIcons.value = it.k === 'set' ? (await pickIcons(it.v)).slice(0, 10) : []
  await nextTick()
  placeCard()
  const r = dc.getBoundingClientRect()
  const R0 = r.width / 2
  const cr = card.value!.getBoundingClientRect()
  big = flycap(BR)
  drop.innerHTML = ''
  const p0 = { x: r.left + R0 - BR, y: r.top + R0 - BR }
  const p1 = capSpot(cr)
  capRot = (((-24 - cap.th) % 360) + 360) % 360
  const spin = capRot < 180 ? capRot + 360 : capRot
  setPhase('fly')
  await anim(big, arc(p0, p1, 80, 16, tt => `scale(${R0 / BR + (1 - R0 / BR) * tt}) rotate(${tt * spin}deg)`), { duration: 620, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished
  bigPos = p1
  parkCap()
  setPhase('open')
  await openCap()
  phase.value = 'reveal'
  setPhase('reveal')
  busy = false
}
/** The capsule rests on the card's top-right corner (opened) until the card is kept / put back. v0.4.3: tucked
 *  inward (centre 34 px in from the right edge, 8 px below the top) so the opened halves stay inside the page. */
const capSpot = (cr: DOMRect) => ({ x: cr.right - 34 - BR, y: cr.top + 8 - BR })
/** Pin the resting capsule in place with a plain style transform (no running animation), e.g. after a resize. */
function parkCap() {
  if (!big) return
  if (card.value && phase.value === 'reveal') bigPos = capSpot(card.value.getBoundingClientRect())
  big.getAnimations().forEach(a => a.cancel())
  big.style.transform = `translate(${bigPos.x}px,${bigPos.y}px) rotate(${capRot}deg)`
}
const capOff = () => { const a = (cap.th ?? -24) * Math.PI / 180; return [-Math.sin(a), Math.cos(a)] }
/** Opened pose: the coloured top half lifts off like a lid (up-left, tilted); the white bottom half stays seated. */
const OPEN_TOP = () => { const [nx, ny] = capOff(); return `translate(${(-nx * 13).toFixed(1)}px,${(-ny * 13).toFixed(1)}px) rotate(-26deg)` }
const OPEN_BOT = () => { const [nx, ny] = capOff(); return `translate(${(nx * 2).toFixed(1)}px,${(ny * 2).toFixed(1)}px) rotate(6deg)` }
function cardOrigin(c: HTMLElement) {
  const r = c.getBoundingClientRect()
  return `${(bigPos.x + BR - r.left).toFixed(0)}px ${(bigPos.y + BR - r.top).toFixed(0)}px`
}
async function openCap() {
  const c = card.value!
  if (big) {
    anim(big.querySelector('.ctop')!, [{ transform: 'none' }, { transform: OPEN_TOP() }], { duration: 440, easing: 'cubic-bezier(.3,1.35,.5,1)', fill: 'forwards' })
    anim(big.querySelector('.cbot')!, [{ transform: 'none' }, { transform: OPEN_BOT() }], { duration: 440, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'forwards' })
    anim(big.querySelector('.cseam')!, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
  }
  c.style.transformOrigin = cardOrigin(c)
  await anim(c, [{ transform: 'scale(.12)', opacity: 0, borderRadius: '50%' }, { transform: 'scale(1.03)', opacity: 1, borderRadius: '16px', offset: 0.72 }, { transform: 'scale(1)', opacity: 1, borderRadius: '16px' }], { duration: 460, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished
}
async function closeCap() {
  const c = card.value
  if (c) c.style.transformOrigin = cardOrigin(c)
  if (big) {
    anim(big.querySelector('.ctop')!, [{ transform: OPEN_TOP() }, { transform: 'none' }], { duration: 280, delay: 120, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })
    anim(big.querySelector('.cbot')!, [{ transform: OPEN_BOT() }, { transform: 'none' }], { duration: 280, delay: 120, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })
  }
  if (c) await anim(c, [{ transform: 'scale(1)', opacity: 1, borderRadius: '16px' }, { transform: 'scale(.12)', opacity: 0, borderRadius: '50%' }], { duration: 280, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished
  if (big) await anim(big.querySelector('.cseam')!, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, fill: 'forwards' }).finished
}
function restorePile() { if (hiddenPc) { hiddenPc.getAnimations().forEach(a => a.cancel()); hiddenPc.style.opacity = '' } hiddenPc = null }

/** Keep: the capsule hops into the small chest beside the machine (lid pops → in → closes with a bounce). */
async function keep() {
  if (phase.value !== 'reveal' || busy || !cur.value) return
  busy = true
  phase.value = 'busy'
  const it = cur.value
  await closeCap()
  const C = CHEST.SMALL
  const lid = $('.chestg .clid')
  const glow = $<SVGElement>('.chestg .c-glow')
  const mq = CHEST.mouthXY(C)
  const m = svg.getScreenCTM()!
  const mx = m.a * mq[0] + m.e
  const my = m.d * mq[1] + m.f
  const sc = (capD(C) / 2 * m.a) / BR // v0.4.5: ends at the size of a capsule in the small chest's heap
  setPhase('hop')
  tween(200, (e) => { CHEST.setLid(lid, C, 96 * e); if (glow) glow.style.opacity = String(e) }, easeOut)
  if (big) {
    await anim(big, arc(bigPos, { x: mx - BR, y: my - BR - 4 }, 70, 14, tt => `scale(${1 + (sc - 1) * tt}) rotate(${capRot - tt * 280}deg)`, tt => (tt > 0.92 ? 0 : 1)), { duration: 520, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' }).finished
    big.remove()
    big = null
  }
  await tween(260, (e) => { CHEST.setLid(lid, C, 96 * (1 - e)); if (glow) glow.style.opacity = String(1 - e) }, easeOutBack)
  CHEST.setLid(lid, C, 0)
  if (glow) glow.style.opacity = ''
  anim($('.chestg'), [{ transform: 'translateY(0)' }, { transform: 'translateY(.8px)' }, { transform: 'none' }], { duration: 200, easing: 'ease-out' })
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
/** Put back: the capsule flies back to the top of the globe, the machine shakes once. */
async function back() {
  if (phase.value !== 'reveal' || busy || !cur.value) return
  busy = true
  phase.value = 'busy'
  const it = cur.value
  await closeCap()
  const top = scr(GM.CX, GM.CY, GM.CAPZ + 8)
  const sc = (GM.CR * 1.2247 * top.s) / BR
  if (big) {
    await anim(big, arc(bigPos, { x: top.x - BR, y: top.y - BR }, 70, 16, tt => `scale(${1 + (sc - 1) * tt}) rotate(${capRot - tt * 300}deg)`, tt => (tt > 0.9 ? 0 : 1)), { duration: 560, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished
    big.remove()
    big = null
  }
  restorePile()
  await shake(320, 0.6)
  putBack(it.id)
  cur.value = null
  toast(t('putBackMsg'), 'lucide:undo-2')
  phase.value = 'idle'
  busy = false
}

// v0.4.4: the small chest's heap follows the same rule as 收藏: min(all favourites, CHEST.MAXPILE = 13 since v0.4.5) capsules, same physics
// (lib/heap.ts) and sunk into the box. It only shows while the lid is open (keep / arriving from 收藏); a kept capsule
// joins it after the lid closes.
const smallPile = () => heapSVG(restTokens(favIds()), CHEST.SMALL)
watch(() => favIds().length, () => { const g = svgEl.value?.querySelector('.chestg .cpile'); if (g) g.innerHTML = smallPile() })

/** v0.4.4: the small chest is the way to 收藏 — click it (idle or with a card out) → 收藏 with the chest/machine morph.
 *  A transparent hit box covers the whole chest so clicks between its strokes are not lost. */
function toFav() {
  if (busy) return
  setMode('fav')
}
function bindChest() {
  const g = $('.chestg')
  const ch = g.querySelector(':scope>.chest') as SVGGElement | null
  if (!ch) return
  const b = ch.getBBox()
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  hit.setAttribute('class', 'chit')
  ;[['x', b.x - 2], ['y', b.y - 3], ['width', b.width + 4], ['height', b.height + 5]].forEach(([k, v]) => hit.setAttribute(k as string, INK.f(v as number) as unknown as string))
  g.insertBefore(hit, g.firstChild)
  const tip = document.createElementNS('http://www.w3.org/2000/svg', 'title')
  tip.textContent = t('chestTip')
  g.appendChild(tip)
  g.addEventListener('click', toFav)
  // hover: the lid peeks open a little (only when nothing else is moving the lid)
  const lid = g.querySelector('.clid') as SVGGElement
  let peek = 0
  let seq = 0
  const to = (d: number) => {
    if (busy || reduced()) return
    const id = ++seq
    const a = peek
    void tween(180, (e) => { if (id !== seq || busy) return; peek = a + (d - a) * e; CHEST.setLid(lid, CHEST.SMALL, peek) }, easeOut)
  }
  g.addEventListener('pointerenter', () => to(20))
  g.addEventListener('pointerleave', () => to(0))
  g.addEventListener('pointerdown', () => { seq++; peek = 0 })
}

const label = (it: Item) => it.k === 'set' ? shortName(it.v) : it.k === 'comp' ? `${UI(it.v.split('/')[0]).name} ${ukl(it.v.split('/')[1])}` : UI(it.v).name
const kindK = (it: Item) => t(it.k === 'set' ? 'kSet' : it.k === 'comp' ? 'kComp' : 'kLib')
const dotOf = (it: Item) => it.k === 'set' ? '' : UICOL[it.v.split('/')[0]] || ''

onMounted(() => {
  svg = svgEl.value!
  svg.innerHTML = GM.scene({ chest: true, pile: smallPile() })
  bindChest()
  layout()
  ro = new ResizeObserver(() => layout())
  ro.observe(stage.value!)
  bindKnob()
  swipeApi.space = turn
  swipeApi.keep = keep
  swipeApi.back = back
  pageFx.exit.swipe = exit
  pageFx.handoff.swipe = handoff
  W.__gacha = { phase: '', flipT: 0, toFav, get again() { return aside.value && phase.value === 'idle' && !cur.value }, get moved() { return aside.value }, turn, keep, back, get busy() { return busy }, get revealed() { return phase.value === 'reveal' } }
  if (!D.list.length) buildDeck()
  const flip = gachaFx.flip
  gachaFx.flip = null
  const src = chestFx.from
  const msrc = machFx.from
  chestFx.from = null
  machFx.from = null
  if (flip && !reduced()) flipIn(flip)
  else if (src && !reduced()) chestIn(src, msrc)
})
onBeforeUnmount(() => {
  swipeApi.space = () => {}
  swipeApi.keep = () => {}
  swipeApi.back = () => {}
  if (pageFx.exit.swipe === exit) pageFx.exit.swipe = null
  if (pageFx.handoff.swipe === handoff) pageFx.handoff.swipe = null
  document.querySelectorAll('.flipov').forEach(e => e.remove())
  ro?.disconnect()
})
</script>

<template>
  <div ref="root" class="anat g101 g11">
    <div ref="stage" class="gstage" :class="{ moved: aside }">
      <svg ref="svgEl" class="ink gsvg" viewBox="-104 -108 208 160" preserveAspectRatio="xMidYMid meet" />
      <div class="gknob" :class="{ off: phase !== 'idle' || aside }" :style="{ left: `${lay.bx}px`, top: `${lay.by}px` }">
        <button v-if="D.list.length" class="gbtn" :title="t('gName')" @click="turn"><span class="tgi" v-html="GLYPH_GACHA" />{{ t('pull') }}<kbd>Space</kbd></button>
        <template v-else>
          <button class="gbtn sec" :title="t('gEmpty')" @click="restart">{{ t('restart') }}</button>
          <small class="gempty">{{ t('gEmpty') }}</small>
        </template>
      </div>
    </div>
    <div class="gknob gagain" :class="{ off: !aside || phase !== 'idle' || !!cur }" :style="{ left: `${lay.ax}px`, top: `${lay.ay}px` }">
      <button v-if="D.list.length" class="gbtn" :title="t('gName')" @click="turn"><span class="tgi" v-html="GLYPH_GACHA" />{{ t('pullAgain') }}<kbd>Space</kbd></button>
      <template v-else>
        <button class="gbtn sec" :title="t('gEmpty')" @click="restart">{{ t('restart') }}</button>
        <small class="gempty">{{ t('gEmpty') }}</small>
      </template>
    </div>
    <div class="rdout">
      <span>{{ t('stock') }} <b>{{ stats.stock }}</b> {{ t('mei') }}</span>
      <span>{{ t('gToday') }} <b>{{ stats.today }}</b></span>
      <span>{{ t('gKept') }} <b :key="stats.kept" class="tick">{{ stats.kept }}</b></span>
      <span>{{ t('crank') }} <b>{{ angTxt }}</b></span>
    </div>
    <div class="corner bl" v-html="t('gHint')" />
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
