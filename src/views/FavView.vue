<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue'
import IconTile from '../components/IconTile.vue'
import DemoFrame from '../components/DemoFrame.vue'
import Heart from '../components/Heart.vue'
import UiIcon from '../components/UiIcon.vue'
import DetailBar from '../components/DetailBar.vue'
import { type FavTab, R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, ensureAll } from '../lib/iconify'
import { zh2en } from '../lib/zh'
import { UI, UICOL, ukl } from '../lib/ui-libs'
import { clearSel, likeSet, likeUI, openLib, openSet, pick, setMode } from '../lib/actions'
import { focusApi } from '../lib/swipe'
import { modKey } from '../lib/native'
import { chestFx, machFx, openPop, pageFx, reduced } from '../lib/fx'
import { icons as setIcons, pickIcons } from '../lib/deck'
import { CHEST, GM, INK, TAGC, anim, clamp01, easeOut, sleep, tween } from '../lib/iso'
import { type Tok, bedTop, capD, capInner, capXY, depth, favIds, pileN, restTokens, settle } from '../lib/heap'

// 收藏 = 灵感宝箱 (v11). The thick-ink chest from v9 stands open; saved icon sets and UI libraries/components are 6
// cards per page (3 × 2). The open chest holds a static heap of capsules (v0.4.1). Entering: 6 capsules leave the heap
// on arcs and bloom into the cards (~680 ms each, 55 ms stagger). Turning a page: the 6 cards fold into capsules that
// arc back into the heap (ease-in) while the next 6 fly out (ease-out), overlapping (transform/opacity only). The small gashapon machine stands behind-left of the chest; 收藏 ↔ 扭蛋 morph chest and machine as shared
// elements. Leaving never blocks the switch: the frozen page plays the fly-back + lid close on its own layer.
// Icons and recent copies are plain grids (with groups).
defineEmits<{ (e: 'copy', id: string): void }>()
ensureAll()

const q = computed(() => R.q.trim().toLowerCase())
const TABS: [FavTab, string][] = [['icons', 'tIcons'], ['sets', 'tSets'], ['ui', 'tUI'], ['recent', 'tRecent']]
const count = (k: FavTab) => ({ icons: S.favs.length, sets: S.sets.length, ui: S.uiFav.length, recent: S.recent.length })[k]
const caseMode = computed(() => R.favTab === 'sets' || R.favTab === 'ui')
const folders = computed(() => Object.keys(S.folders))

// ---- icons (optionally one group) and recent copies
const src = computed(() => (R.folder ? S.folders[R.folder] || [] : S.favs))
const iconList = computed(() => {
  if (R.favTab === 'recent') return S.recent.filter(x => !q.value || x.includes(q.value))
  const qe = zh2en(q.value) || q.value
  return src.value.filter(x => !q.value || x.includes(qe))
})
watchEffect(() => { R.list = R.favTab === 'icons' || R.favTab === 'recent' ? iconList.value : [] })
const adding = ref(false)
const nf = ref('')
const nfEl = ref<HTMLInputElement>()
async function startAdd() { adding.value = true; nf.value = ''; await nextTick(); nfEl.value?.focus() }
function okAdd() {
  const v = nf.value.trim()
  if (v && !S.folders[v]) { S.folders[v] = []; R.folder = v }
  adding.value = false
}
function delFolder(f: string) { delete S.folders[f]; if (R.folder === f) R.folder = null }
const CHECKER = 'conic-gradient(#999 0 25%,#ddd 0 50%,#999 0 75%,#ddd 0)'

// ---- the chest
// v0.4.4: a page turn folds the old 6 cards back into capsules FIRST (the return starts at once, no waiting for the
// cards to fade) and the new page's 6 capsules leave the heap LEAD ms later; out 620 ms, back 700 ms (a little slower,
// so the returning capsules land last, on top of the heap).
const FLY = { out: 620, back: 700, stag: 55, bstag: 40, lead: 50 }
const items = computed<string[]>(() => (R.favTab === 'ui' ? S.uiFav : R.favTab === 'sets' ? S.sets : []))
const page = reactive<Record<string, number>>({ sets: 1, ui: 1 })
const nPages = computed(() => Math.max(1, Math.ceil(items.value.length / 6)))
const curPage = computed(() => Math.max(1, Math.min(page[R.favTab] || 1, nPages.value)))
const rootEl = ref<HTMLElement>()
const svgEl = ref<SVGSVGElement>()
const msvg = ref<SVGSVGElement>()
const fchest = ref<HTMLElement>()
const fmach = ref<HTMLElement>()
const grid = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
let busy = false
let toGachaNext = false

const libOf = (id: string) => id.split('/')[0]
const tagOf = (idx: number) => {
  const id = items.value[idx]
  if (R.favTab === 'ui' && id) return UICOL[libOf(id)] || TAGC[idx % TAGC.length]
  return TAGC[(idx + 2 * Math.floor(idx / 6)) % TAGC.length]
}
const cardItems = computed(() => Array.from({ length: 6 }, (_, i) => { const idx = (curPage.value - 1) * 6 + i; return { i, idx, id: items.value[idx] || '' } }))
watch(cardItems, (cs) => { if (R.favTab === 'sets') cs.forEach(c => c.id && pickIcons(c.id)) }, { immediate: true })
const N = (n?: number) => Number(n || 0).toLocaleString()
const cardTag = (idx: number) => tagOf(idx)
function openCard(id: string) { if (!id) return; if (R.favTab === 'sets') openSet(id); else openLib(libOf(id)) }

// ---- the heap in the chest (v0.4.3 physics, see lib/heap.ts; v0.4.6 count rule)
// v0.4.6: the box base B = min(all favourites, 13) (icons + sets + UI). The cards on show came OUT of the box, so the
// resting heap = B − (cards on screen), floor 0. Entering a card tab: the page's capsules (the top of a B heap) fly out
// and the box stays that much lower. A page turn / a switch between card tabs: ALL old cards fly back in (landing on
// top) and the new ones fly out, so the count only dips during the flight. A grid tab / an empty card tab / leaving:
// every card flies back in → B. Nothing tops the heap back up after a flight (v0.4.4/0.4.5 put the page's capsules on
// top of a full B heap and snapped back to B after every flight — the "refill" bug).
let stack: Tok[] = []
/** Tokens that leave on this turn but whose flight has not started yet (still drawn in the heap). */
const outQ = new Set<string>()
/** card token → heap token it takes out (when the card's own capsule is not in the heap). */
const donor = new Map<string, string>()
const nodes = new Map<string, SVGGElement & { _q?: number[], _tw?: number }>()
const tokKey = (id: string) => `${R.favTab}:${id}`
const tokOf = (idx: number): Tok => ({ k: tokKey(items.value[idx]), c: tagOf(idx) })
const baseN = () => pileN(favIds().length)
/** Cards currently on screen (they came out of the box). */
const shownN = () => (caseMode.value ? cardItems.value.filter(c => c.id).length : 0)
/** Resting heap: B − cards out, floor 0. */
const restN = () => Math.max(0, baseN() - shownN())
/** The visible page's capsules (they are about to fly out to the cards). */
function pageToks() {
  const a = (curPage.value - 1) * 6
  const o: Tok[] = []
  for (let i = Math.min(a + 6, items.value.length) - 1; i >= a; i--) o.push(tokOf(i))
  return o
}
/** Rebuild the heap from data (no animation). `withPage`: the visible page's capsules lie on top of the resting heap. */
function buildHeap(withPage: boolean) {
  outQ.clear()
  donor.clear()
  // v0.4.6: B capsules in all; with cards about to fly out, the page's own capsules are the top ones of those B
  const all = restTokens(favIds())
  const pt = withPage && caseMode.value ? pageToks() : []
  stack = all.slice(0, Math.max(0, all.length - pt.length)).concat(pt.slice(0, all.length))
  nodes.forEach(n => n.remove())
  nodes.clear()
  renderHeap(false)
}
/** Favourites added / removed while nothing flies: add or take capsules on top so the resting count (B − cards out)
 *  is right. After a flight this is a no-op (the flights themselves keep the count). */
function syncCount() {
  const want = restN()
  if (stack.length === want) return
  if (stack.length > want) { stack = stack.slice(0, want); renderHeap(true); return }
  const have = new Set(stack.map(t => t.k))
  const add = restTokens(favIds()).filter(t => !have.has(t.k)).slice(-(want - stack.length))
  if (!add.length) return
  stack = stack.concat(add)
  renderHeap(true, new Set(add.map(t => t.k)))
}
const pileCount = () => stack.length
const tf = (q: number[]) => `translate(${INK.f(q[0])},${INK.f(q[1])})`
/** Bounce at the end of a settle: overshoots ~4 %. */
const settleEase = (t: number) => { const u = t - 1; return 1 + 2.1 * u * u * u + 1.1 * u * u }
let twSeq = 0
/** Draw the simulated heap. animate: capsules that moved fall / roll to their new spot (~300 ms, tiny bounce);
 *  `drop`: these new capsules arrive from a little above (a landing). */
function renderHeap(animate: boolean, drop?: Set<string>, fade?: Set<string>) {
  const g = svgEl.value?.querySelector(':scope>.chest>.cpile')
  if (!g) return
  const caps = settle(stack)
  const live = new Set(caps.map(c => c.k))
  nodes.forEach((n, k) => { if (!live.has(k)) { n.remove(); nodes.delete(k) } })
  const moves: { n: SVGGElement & { _q?: number[] }, a: number[], b: number[] }[] = []
  for (const c of caps) {
    const q = capXY(c)
    let n = nodes.get(c.k)
    if (!n) {
      n = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement & { _q?: number[] }
      n.dataset.k = c.k
      n.innerHTML = capInner(c)
      nodes.set(c.k, n)
      const from = drop?.has(c.k) && animate ? [q[0], q[1] - 5] : q
      n.setAttribute('transform', tf(from))
      n._q = from
      if (fade?.has(c.k) && !reduced()) anim(n, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' })
    }
    const a = n._q || q
    if (Math.abs(a[0] - q[0]) + Math.abs(a[1] - q[1]) > 0.05) {
      if (animate && !reduced()) moves.push({ n, a, b: q })
      else n.setAttribute('transform', tf(q))
    }
    n._q = q
  }
  // paint far → near
  caps.slice().sort((A, B) => depth(A) - depth(B)).forEach(c => g.appendChild(nodes.get(c.k)!))
  if (moves.length) {
    const id = ++twSeq
    moves.forEach(m => { (m.n as any)._tw = id })
    void tween(300, (e) => {
      for (const m of moves) if ((m.n as any)._tw === id) m.n.setAttribute('transform', tf([m.a[0] + (m.b[0] - m.a[0]) * e, m.a[1] + (m.b[1] - m.a[1]) * e]))
    }, settleEase)
  }
}
/** Take a capsule out of the heap for its flight: returns where it is on screen (centre, size, seam angle). The
 *  capsules above it then settle into the gap. A deep one comes up from the bed. */
function pull(k: string) {
  outQ.delete(k)
  const svg = svgEl.value
  if (!svg) return null
  const n = nodes.get(k)
  const cap = settle(stack).find(c => c.k === k)
  let at: { x: number, y: number, s: number, th: number } | null = null
  if (n && cap) {
    const m = svg.getScreenCTM()!
    const q = n._q || capXY(cap)
    at = { x: m.a * q[0] + m.e, y: m.d * q[1] + m.f, s: m.a * cap.r * 1.2247 * 2, th: cap.th }
  }
  const si = stack.findIndex(t => t.k === k)
  if (si >= 0) stack.splice(si, 1)
  else {
    const m = svg.getScreenCTM()!
    const q = bedTop()
    at = { x: m.a * q[0] + m.e, y: m.d * q[1] + m.f, s: m.a * capD(), th: -30 }
  }
  renderHeap(true)
  return at
}
/** Final resting spots of capsules put back (on top of the heap as it will be once this turn's capsules are out). */
function landing(ret: Tok[]) {
  const fin = settle(stack.filter(t => !outQ.has(t.k)).concat(ret))
  return new Map(fin.slice(fin.length - ret.length).map(c => [c.k, c]))
}
/** A capsule put back lands: it joins the top of the heap. */
function land(t: Tok) {
  if (stack.some(x => x.k === t.k)) return
  stack.push(t)
  renderHeap(true, new Set([t.k]))
}
/** Leaving 收藏: a capsule lands in the frozen copy's heap (drawn on top, static; the layer fades out). */
function landFrozen(svg: SVGSVGElement, c: ReturnType<typeof settle>[number]) {
  const g = svg.querySelector(':scope>.chest>.cpile')
  if (!g) return
  const n = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  n.dataset.k = c.k
  n.setAttribute('transform', tf(capXY(c)))
  n.innerHTML = capInner(c)
  g.appendChild(n)
}
/** Top of the heap in client coordinates (for capsules that only drop in and vanish: tab switch, leaving). */
function heapTop(svg: SVGSVGElement, k = 0) {
  const caps = settle(stack)
  let q = bedTop()
  let best = -Infinity
  for (const c of caps) if (c.z > best) { best = c.z; q = INK.P(c.x, c.y, c.z + c.r) }
  const m = svg.getScreenCTM()!
  const sx = [-14, 10, -4, 16, -10, 4][k % 6]
  return { x: m.a * (q[0] + sx * 1.6) + m.e, y: m.d * q[1] + m.f, s: m.a * capD() }
}

function capEl(col: string, size = 30) {
  const d = document.createElement('div')
  d.className = 'flycap fcap11'
  const r = size / 2
  d.style.cssText = `width:${size}px;height:${size}px`
  d.innerHTML = `<svg class="ink" viewBox="${-r} ${-r} ${size} ${size}" style="overflow:visible">${INK.capsule(r * 0.92, col || '#e5484d', { th: -30, m: 0.36, lw: 1.15 })}</svg>`
  document.querySelector('.win')!.appendChild(d)
  return d
}
// v0.4.4 · flying capsules dip INTO the box: while a capsule is still (or again) inside the chest it flies under a
// copy of the chest's front walls + rim (`.fcocc`, z 71, laid exactly over the chest); once it is out of the mouth it
// flies above everything (z 73). The z switch is baked into each flight's keyframes.
const Z_IN = 70
const Z_OUT = 73
/** z-index is interpolated by WAAPI (70 → 71 → 72 → 73 between two keyframes, and at 71 a capsule tied with the
 *  occluder). v0.4.5: make every z switch a jump, at the earlier keyframe (same offset twice). */
function zJumps(kf: Keyframe[]) {
  const o: Keyframe[] = []
  kf.forEach((k, i) => {
    const p = kf[i - 1]
    if (p && p.zIndex !== k.zIndex) o.push({ ...p, zIndex: k.zIndex })
    o.push(k)
  })
  return o
}
// v0.4.5: one occluder per chest svg, so the frozen copy of 收藏 that animates out when leaving gets one too (it fades
// with that layer), and the cards going home dip behind its front wall like on a page turn.
const occs = new Map<SVGSVGElement, { el: HTMLElement, n: number }>()
/** Leaving a card tab of 收藏: the frozen layer (and its occluder) stays up while the cards drop into the chest. */
const LEAVE_T = 620
const LEAVE_FADE: Keyframe[] = [{ opacity: 1 }, { opacity: 1, offset: 0.62 }, { opacity: 0 }]
function occOn(svg = svgEl.value, fade = false) {
  if (!svg || reduced()) return false
  let o = occs.get(svg)
  if (!o) {
    const fr = svg.querySelector(':scope>.chest>.cfront')
    if (!fr) return false
    const r = svg.getBoundingClientRect()
    const el = document.createElement('div')
    el.className = 'fcocc'
    el.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`
    el.innerHTML = `<svg class="ink" viewBox="${svg.getAttribute('viewBox')}" preserveAspectRatio="${svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet'}" style="width:100%;height:100%;overflow:visible"><g class="chest" style="--lw:${CHEST.BIG.lw}">${fr.outerHTML}</g></svg>`
    document.querySelector('.win')!.appendChild(el)
    if (fade) anim(el, LEAVE_FADE, { duration: LEAVE_T, fill: 'forwards' })
    occs.set(svg, o = { el, n: 0 })
  }
  o.n++
  return true
}
function occOff(svg = svgEl.value) {
  const o = svg && occs.get(svg)
  if (!o) return
  if (--o.n <= 0) { o.el.remove(); occs.delete(svg!) }
}
/** The chest's front rim as seen on screen (client px): y of the rim line above client x, or −∞ beside the chest.
 *  A capsule whose lower half is below this line (and over the chest) is inside the box, behind the front walls. */
function rimLine(svg = svgEl.value) {
  if (!svg) return () => -Infinity
  const m = svg.getScreenCTM()!
  const C = CHEST.BIG
  const zt = C.z + C.h
  const pt = (x: number, y: number) => { const q = INK.P(x, y, zt); return [m.a * q[0] + m.e, m.d * q[1] + m.f] }
  const a = pt(C.x, C.y + C.d)
  const b = pt(C.x + C.w, C.y + C.d)
  const c = pt(C.x + C.w, C.y)
  return (X: number) => {
    if (X < a[0] || X > c[0]) return -Infinity
    const [p, q] = X <= b[0] ? [a, b] : [b, c]
    return p[1] + (q[1] - p[1]) * (X - p[0]) / ((q[0] - p[0]) || 1)
  }
}
/** Point on a quadratic arc from (dx,dy) to (0,0), apex lifted `lift` px above the higher end. */
function arcAt(dx: number, dy: number, lift: number, tt: number) {
  const cx = dx * 0.5
  const cy = Math.min(dy, 0) - lift
  const u = 1 - tt
  return { x: u * u * dx + 2 * u * tt * cx, y: u * u * dy + 2 * u * tt * cy }
}
const tr = (p: { x: number, y: number }) => `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`
const S0 = 30
/** Capsules leave the heap one by one, arc over to their card slots and bloom into the cards. The start point is
 *  measured when each capsule actually leaves (after the chest has been laid out / finished its entrance), from the
 *  capsule as drawn in the heap. A card whose own capsule is not in the heap borrows one from the top (`donor`). */
function flyOut(delay = 0) {
  const g = grid.value
  if (!g || !svgEl.value) return Promise.resolve()
  const cards = [...g.querySelectorAll<HTMLElement>('.fc')]
  const jobs: Promise<unknown>[] = []
  const have = new Set(stack.map(t => t.k))
  const keys = cards.map(c => (c.classList.contains('empty') ? '' : c.dataset.k || ''))
  const mine = new Set(keys)
  // donors: from just below the top of the heap (the very top is where returning capsules land)
  // donors: the highest capsules of the heap (the ones you can see), not this page's own
  const pool = settle(stack).filter(c => !mine.has(c.k) && !outQ.has(c.k)).sort((A, B) => B.z - A.z).map(c => c.k)
  cards.forEach((c, k) => {
    const d0 = delay + k * FLY.stag
    if (!keys[k]) { jobs.push(anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: d0 + FLY.out * 0.55, fill: 'backwards' }).finished); return }
    let key = keys[k]
    if (!have.has(key)) { const dk = pool.shift(); if (dk) { donor.set(key, dk); key = dk } }
    outQ.add(key)
    c.style.opacity = '0'
    jobs.push(sleep(d0).then((): unknown => launchOut(c, key, k)))
  })
  pulse(delay)
  return Promise.all(jobs).catch(() => {})
}
function launchOut(c: HTMLElement, key: string, k: number): Promise<unknown> | undefined {
  c.style.opacity = ''
  if (!c.isConnected) { outQ.delete(key); return }
  const at = pull(key)
  const T = FLY.out
  const ARR = 0.7 // the capsule reaches the card at 70 %, then blooms
  const card = anim(c, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(.3)', offset: ARR - 0.04, easing: 'cubic-bezier(.2,.8,.3,1)' }, { opacity: 1, transform: 'scale(1.02)', offset: 0.92, easing: 'ease-out' }, { opacity: 1, transform: 'none' }], { duration: T, easing: 'linear', fill: 'backwards' }).finished
  if (!at) return card
  const r = c.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const s0 = Math.max(0.2, at.s / (S0 * 0.92)) // starts at the size of the capsule in the heap
  const rot0 = (((at.th + 30) % 360) + 360) % 360 - 360 // its seam angle in the heap, unwinding to the flight pose
  const cp = capEl(c.dataset.c || '', S0)
  cp.style.left = `${cx - S0 / 2}px`
  cp.style.top = `${cy - S0 / 2}px`
  const sv = svgEl.value
  const dip = occOn(sv)
  const rim = rimLine(sv)
  const lift = 60 + (k % 3) * 14
  const NK = 14
  const kf: Keyframe[] = []
  let out = !dip
  for (let i = 0; i <= NK; i++) {
    const tt = 1 - (1 - i / NK) ** 2.2 // ease-out baked into the path, so the bloom keeps linear time
    const p = arcAt(at.x - cx, at.y - cy, lift, tt)
    // inside the box (under the front walls) until its lower half has cleared the rim
    const rr = S0 / 2 * (s0 + (1.06 - s0) * tt)
    if (!out && cy + p.y + rr * 0.5 < rim(cx + p.x)) out = true
    kf.push({ transform: `${tr(p)} scale(${(s0 + (1.06 - s0) * tt).toFixed(3)}) rotate(${(rot0 * (1 - tt)).toFixed(0)}deg)`, opacity: 1, zIndex: out ? Z_OUT : Z_IN, offset: ARR * (i / NK) })
  }
  kf.push({ transform: 'translate(0px,0px) scale(1.5) rotate(0deg)', opacity: 0, zIndex: Z_OUT, offset: 1 })
  const fl = anim(cp, zJumps(kf), { duration: T, easing: 'linear', fill: 'forwards' }).finished
  const done = () => { cp.remove(); if (dip) occOff(sv) }
  fl.then(done, done)
  return Promise.all([card, fl])
}
/** Cards (in `layer`, a frozen copy) fold into capsules that arc back into the chest. `turn`: they land on top of
 *  the heap and join it; otherwise (switching to a grid tab / leaving) they drop in at the top of the heap and vanish.
 *  v0.4.4: the capsule is there from the first frame and starts moving at once (the card shrinks into it over the
 *  first ~10 %), so the way back never waits for the cards to fade. */
function flyBack(layer: Element, svg = svgEl.value!, dur = FLY.back, turn = false, join = 99) {
  const cards = [...layer.querySelectorAll<HTMLElement>('.fc')].reverse()
  const jobs: Promise<unknown>[] = []
  const FOLD = 0.1
  const ret: Tok[] = cards.filter(c => !c.classList.contains('empty') && c.dataset.k).map(c => ({ k: c.dataset.k!, c: c.dataset.c || '' }))
  // v0.4.6: every card going home joins the heap (they came out of it): the box ends at B − the new page's cards
  const spots = turn ? landing(ret.slice(0, join)) : null
  const m = svg.getScreenCTM()!
  const live = svg === svgEl.value
  let n = 0
  cards.forEach((c) => {
    const r = c.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const empty = c.classList.contains('empty')
    const k = empty ? 0 : n++
    const d0 = k * FLY.bstag
    jobs.push(anim(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.3)', offset: FOLD }, { opacity: 0, transform: 'scale(.3)' }], { duration: dur, delay: d0, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' }).finished)
    if (empty) return
    const key = c.dataset.k || ''
    const sp = spots?.get(key)
    let M: { x: number, y: number, s: number }
    if (sp) { const q = capXY(sp); M = { x: m.a * q[0] + m.e, y: m.d * q[1] + m.f, s: m.a * sp.r * 1.2247 * 2 } }
    else { const h = heapTop(svg, k); M = { x: h.x, y: h.y, s: h.s } }
    const s1 = Math.max(0.2, M.s / (S0 * 0.92))
    const cp = capEl(c.dataset.c || '', S0)
    cp.style.left = `${cx - S0 / 2}px`
    cp.style.top = `${cy - S0 / 2}px`
    const dip = occOn(svg, !live)
    const rim = rimLine(svg)
    const lift = 56 + (k % 3) * 12
    const kf: Keyframe[] = [{ transform: 'translate(0px,0px) scale(.45)', opacity: 0, zIndex: Z_OUT, offset: 0 }]
    const NK = 16
    let inside = false
    const pts: { p: { x: number, y: number }, tt: number }[] = []
    for (let i = 1; i <= NK; i++) { const tt = (i / NK) ** 1.7; pts.push({ p: arcAt(M.x - cx, M.y - cy, lift, 1 - tt), tt }) }
    // it dips behind the front wall for the last stretch (once it is about a capsule above its landing spot)
    pts.forEach(({ p, tt }, i) => {
      if (dip && !inside && tt > 0.5 && cy + p.y + S0 / 2 * (1.04 + (s1 - 1.04) * tt) * 0.5 > rim(cx + p.x)) inside = true
      const off = FOLD * 0.4 + (1 - FOLD * 0.4) * (i / (NK - 1)) // pops out of the card at once and is already moving
      kf.push({ transform: `${tr(p)} scale(${(1.04 + (s1 - 1.04) * tt).toFixed(3)}) rotate(${(240 * tt).toFixed(0)}deg)`, opacity: i === NK - 1 && !sp ? 0 : live ? 1 : Math.min(1, (1 - tt) / 0.3 + 0.15), zIndex: inside ? Z_IN : Z_OUT, offset: off })
    })
    const a = anim(cp, zJumps(kf), { duration: dur, delay: d0, easing: 'linear', fill: 'both' })
    const done = () => { cp.remove(); if (dip) occOff(svg) }
    a.finished.then(() => { done(); if (sp) { if (live) land({ k: key, c: sp.c }); else landFrozen(svg, sp) } }, done)
    jobs.push(a.finished)
  })
  return Promise.all(jobs).catch(() => {})
}
/** The chest reacts (transform only). */
function pulse(delay = 0) {
  if (fchest.value) anim(fchest.value, [{ transform: 'none' }, { transform: 'translateY(1px) scale(1.012,.985)', offset: 0.4 }, { transform: 'none' }], { duration: 260, delay: delay + 20, easing: 'ease-out' })
}
function wiggle() {
  const lid = svgEl.value?.querySelector('.clid')
  if (!lid || busy) return
  tween(420, (_e, tt) => { CHEST.setLid(lid, CHEST.BIG, 104 - Math.sin(tt * Math.PI) * 18 * (1 - tt * 0.4)) }, tt => tt).then(() => { CHEST.setLid(lid, CHEST.BIG, 104) })
}
/** Frozen copy of the current grid (the old cards fly back from it while the new grid is already rendered). */
function ghost() {
  const g = grid.value
  const host = rootEl.value
  if (!g || !host) return null
  const c = g.cloneNode(true) as HTMLElement
  c.querySelectorAll('iframe').forEach(f => f.remove())
  const r = g.getBoundingClientRect()
  const o = host.getBoundingClientRect()
  c.classList.add('ghost')
  c.removeAttribute('data-v-app')
  c.style.cssText = `position:absolute;left:${r.left - o.left}px;top:${r.top - o.top}px;width:${r.width}px;height:${r.height}px;margin:0;pointer-events:none;z-index:0`
  host.appendChild(c)
  return c
}
function flatIn() {
  if (reduced()) return
  document.querySelectorAll<HTMLElement>('.fav11 .fgrid .t').forEach((b, k) => { if (k < 80) anim(b, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: k * 6, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' }) })
}
function enter() {
  const fi = rootEl.value!.querySelector<HTMLElement>('.finfo')!
  anim(fi, [{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
  anim(fchest.value!, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out', fill: 'backwards' })
  anim(fmach.value!, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 40, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
  const rest = rootEl.value!.querySelectorAll<HTMLElement>('.vs, .fempty')
  rest.forEach(e => anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 60, fill: 'backwards' }))
  // the capsules leave once the chest is on screen and laid out (positions are measured at launch)
  if (caseMode.value) flyOut(180)
  else flatIn()
}
/** 扭蛋 → here: the big machine shrinks into the small machine behind the chest (same time and curve as the chest). */
function machIn(src: DOMRect) {
  const el = fmach.value!
  const E = el.getBoundingClientRect()
  const M = msvg.value!.querySelector('.mach')!.getBoundingClientRect()
  const s = src.width / M.width
  const tx = src.left - E.left - s * (M.left - E.left)
  const ty = src.top - E.top - s * (M.top - E.top)
  const sh = msvg.value!.querySelector<SVGGElement>('.m-sh')!
  sh.style.opacity = '0'
  el.style.transformOrigin = '0 0'
  anim(sh, [{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 440 }).finished.then(() => { sh.style.opacity = '' })
  return anim(el, [{ transform: `translate(${tx}px,${ty}px) scale(${s})` }, { transform: 'none' }], { duration: 440, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => {
    el.style.transformOrigin = ''
    anim(el, [{ transform: 'none' }, { transform: 'translateY(.6px)' }, { transform: 'none' }], { duration: 180, easing: 'ease-out' })
  })
}
/** 扭蛋 → here: the small chest beside the machine grows into this chest (lid opening on the way), then capsules fly out. */
function morphIn(src: DOMRect, msrc: DOMRect | null) {
  const el = fchest.value!
  const svg = svgEl.value!
  const E = el.getBoundingClientRect()
  const B = svg.querySelector('.cbody')!.getBoundingClientRect()
  const s = src.width / B.width
  const tx = src.left - E.left - s * (B.left - E.left)
  const ty = src.top - E.top - s * (B.top - E.top)
  el.style.transformOrigin = '0 0'
  if (msrc) machIn(msrc)
  else anim(fmach.value!, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 160, fill: 'backwards' })
  const lid = svg.querySelector('.clid')!
  const glow = svg.querySelector<SVGElement>('.c-glow')
  CHEST.setLid(lid, CHEST.BIG, 0)
  if (glow) glow.style.opacity = '0'
  anim(el, [{ transform: `translate(${tx}px,${ty}px) scale(${s})` }, { transform: 'none' }], { duration: 440, easing: 'cubic-bezier(.2,.8,.2,1)' })
  tween(440, (_e, tt) => { CHEST.setLid(lid, CHEST.BIG, 104 * easeOut(clamp01((tt - 0.15) / 0.85))); if (glow) glow.style.opacity = String(clamp01((tt - 0.4) / 0.6)) }, tt => tt)
    .then(() => { CHEST.setLid(lid, CHEST.BIG, 104); if (glow) glow.style.opacity = ''; el.style.transformOrigin = '' })
  const fi = rootEl.value!.querySelector<HTMLElement>('.finfo')!
  anim(fi, [{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
  rootEl.value!.querySelectorAll<HTMLElement>('.vs, .fempty').forEach(e => anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 160, fill: 'backwards' }))
  // after the chest has finished growing into place (440 ms), so the capsules start inside its heap
  if (caseMode.value) flyOut(470)
  else flatIn()
}
async function goPage(n: number) {
  if (!caseMode.value || busy || n < 1 || n > nPages.value || n === curPage.value) return
  busy = true
  const g = ghost()
  page[R.favTab] = n
  await nextTick()
  await swap(g)
  busy = false
}
/** Old cards (ghost) go back into the heap and the new page's capsules come out. The way back starts first; flyOut
 *  is called first only to register which capsules leave (FLY.lead ms later), so the returning ones aim for the top
 *  of the heap as it will be once those are out — and land last, on top. */
async function swap(g: HTMLElement | null) {
  const o = flyOut(FLY.lead)
  const b = g ? flyBack(g, undefined, FLY.back, true).then(() => g.remove()) : Promise.resolve()
  await Promise.all([b, o])
  donor.clear()
  syncCount()
}
async function tab(k: FavTab) {
  if (busy || k === R.favTab) return
  busy = true
  const wasCase = caseMode.value
  const g = wasCase ? ghost() : null
  R.favTab = k
  R.folder = null
  clearSel()
  await nextTick()
  // v0.4.6: old cards fly back in (and stay), new cards fly out (borrowing the top capsules): box = B − new cards
  if (wasCase && caseMode.value) await swap(g)
  else {
    const b = g ? flyBack(g, undefined, 640, true).then(() => g.remove()) : Promise.resolve()
    const o = caseMode.value ? flyOut(g ? 140 : 60) : (flatIn(), Promise.resolve())
    await Promise.all([b, o])
    donor.clear()
    syncCount()
  }
  busy = false
}
// favourites changed outside a flight (like / unlike, import): the resting heap follows B − cards out
watch(() => favIds().length, () => { if (!busy) syncCount() })
function toGacha() { S.swView = 'gacha'; setMode('swipe') }
function handoff(to: string) {
  toGachaNext = to === 'swipe' && S.swView === 'gacha' && !reduced()
  if (!toGachaNext || !svgEl.value || !msvg.value) return
  chestFx.from = svgEl.value.querySelector('.cbody')!.getBoundingClientRect()
  machFx.from = msvg.value.querySelector('.mach')!.getBoundingClientRect()
}
/** Leaving 收藏 never blocks: the frozen layer animates while the next page is already live. */
function exit(layer: HTMLElement, _to: string) {
  const jobs: Promise<unknown>[] = []
  const svg = layer.querySelector<SVGSVGElement>('.csvg')
  layer.querySelectorAll('.ghost').forEach(g => g.remove())
  const cm = !!layer.querySelector('.fbody10 .fgrid10')
  if (toGachaNext) {
    layer.querySelectorAll<HTMLElement>('.fchest,.fmach').forEach((e) => { e.style.opacity = '0' })
    layer.querySelectorAll<HTMLElement>('.fc,.t').forEach((c, k) => jobs.push(anim(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 180, delay: Math.min(k, 30) * 10, easing: 'ease-in', fill: 'forwards' }).finished))
    jobs.push(anim(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 80, fill: 'forwards' }).finished)
    return Promise.all(jobs)
  }
  layer.querySelectorAll<HTMLElement>('.finfo,.dbar').forEach(e => jobs.push(anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).finished))
  // v0.4.6: the cards go home and stay in the box (the frozen heap ends at B again)
  if (cm && svg) jobs.push(flyBack(layer.querySelector('.fbody10 .fgrid10')!, svg, 420, true))
  else layer.querySelectorAll<HTMLElement>('.vs').forEach(e => anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }))
  const lid = svg?.querySelector('.clid')
  const glow = svg?.querySelector<SVGElement>('.c-glow')
  // v0.4.5: with cards on show, the chest stays open while they drop in behind its front wall, then fades (closing
  // the lid would cover capsules that are still on their way in)
  if (lid && !cm) jobs.push(tween(300, (e) => { CHEST.setLid(lid, CHEST.BIG, 104 * (1 - e)); if (glow) glow.style.opacity = String(1 - e) }, easeOut))
  jobs.push(anim(layer, cm ? LEAVE_FADE : [{ opacity: 1 }, { opacity: 0.8, offset: 0.3 }, { opacity: 0 }], { duration: cm ? LEAVE_T : 340, fill: 'forwards' }).finished)
  return Promise.all(jobs)
}
// Arrow keys turn pages (only in the card tabs).
function onKey(e: KeyboardEvent) {
  if (!caseMode.value || ['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) return
  if (e.key === 'ArrowRight') { e.preventDefault(); goPage(curPage.value + 1) }
  if (e.key === 'ArrowLeft') { e.preventDefault(); goPage(curPage.value - 1) }
}

onMounted(() => {
  focusApi.focus = () => input.value?.focus()
  document.addEventListener('keydown', onKey, true)
  svgEl.value!.innerHTML = CHEST.svg(CHEST.BIG, 104)
  msvg.value!.innerHTML = GM.scene({})
  pageFx.exit.fav = exit
  pageFx.handoff.fav = handoff
  W.__fav = { get busy() { return busy }, goPage, tab, get page() { return curPage.value }, get pile() { return pileCount() }, get base() { return baseN() }, get shown() { return shownN() }, get drawn() { return nodes.size } }
  const src = chestFx.from
  const msrc = machFx.from
  chestFx.from = null
  machFx.from = null
  buildHeap(caseMode.value)
  if (src && !reduced()) morphIn(src, msrc)
  else enter()
})
onBeforeUnmount(() => {
  focusApi.focus = () => {}
  document.removeEventListener('keydown', onKey, true)
  if (pageFx.exit.fav === exit) pageFx.exit.fav = null
  if (pageFx.handoff.fav === handoff) pageFx.handoff.fav = null
})
const W = window as any
</script>

<template>
  <div class="body fav-v">
    <div ref="rootEl" class="fav101 fav11">
      <div class="fhead">
        <div ref="fchest" class="fchest" @click="wiggle"><svg ref="svgEl" class="ink csvg" viewBox="-70 -128 178 214" preserveAspectRatio="xMidYMid meet" /></div>
        <button ref="fmach" class="fmach" :title="t('toGacha')" @click="toGacha"><svg ref="msvg" class="ink msvg" :viewBox="GM.VB.mini.join(' ')" preserveAspectRatio="xMidYMax meet" /></button>
        <div class="finfo">
          <h3>{{ t('chestT') }}</h3>
          <div class="ftabs">
            <button v-for="[k, l] in TABS" :key="k" :class="{ on: R.favTab === k }" @click="tab(k)">{{ t(l) }}<small>{{ count(k) }}</small></button>
          </div>
          <div class="frow">
            <template v-if="caseMode">
              <span class="sp" />
              <div class="fpager">
                <button class="pg" :disabled="curPage <= 1" :title="t('prevPage')" @click="goPage(curPage - 1)"><UiIcon name="lucide:chevron-left" /></button>
                <span class="pl"><b>{{ curPage }}</b> / {{ nPages }}</span>
                <button class="pg" :disabled="curPage >= nPages" :title="t('nextPage')" @click="goPage(curPage + 1)"><UiIcon name="lucide:chevron-right" /></button>
              </div>
            </template>
            <label v-else class="isearch sm"><UiIcon name="lucide:search" /><input ref="input" v-model="R.q" :placeholder="t('phFav')" spellcheck="false"><kbd>{{ modKey.trim() }}K</kbd></label>
          </div>
        </div>
      </div>

      <!-- saved icon sets / UI libraries: 6 cards per layer -->
      <div v-if="caseMode" class="fbody10">
        <div ref="grid" class="fgrid10">
          <template v-for="c in cardItems" :key="`${R.favTab}:${curPage}:${c.i}`">
            <div v-if="!c.id" class="fc empty" :data-i="c.i" />
            <div v-else-if="R.favTab === 'sets'" class="fc set" :data-i="c.i" :data-c="cardTag(c.idx)" :data-k="tokKey(c.id)" @click="openCard(c.id)">
              <div class="fh"><i class="fdot" :style="{ background: cardTag(c.idx) }" /><b>{{ INFO[c.id]?.name || c.id }}</b><small>{{ N(INFO[c.id]?.total) }}</small>
                <button class="ib hrt" :title="t('unfavd')" @click.stop="likeSet(c.id)"><Heart on /></button></div>
              <div class="fi"><UiIcon v-for="n in (setIcons[c.id] || (INFO[c.id]?.samples || []).map(x => `${c.id}:${x}`)).slice(0, 10)" :key="n" :name="n" /></div>
              <div class="fm">{{ [INFO[c.id]?.author?.name, INFO[c.id]?.license?.title].filter(Boolean).join(' · ') }}</div>
            </div>
            <div v-else class="fc lib" :data-i="c.i" :data-c="cardTag(c.idx)" :data-k="tokKey(c.id)" @click="openCard(c.id)">
              <div class="fh"><i class="fdot" :style="{ background: cardTag(c.idx) }" /><b>{{ c.id.includes('/') ? ukl(c.id.split('/')[1]) : UI(c.id)?.name }}</b><small>{{ c.id.includes('/') ? UI(libOf(c.id))?.name : UI(c.id)?.fw }}</small>
                <button class="ib hrt" :title="t('unfavd')" @click.stop="likeUI(c.id)"><Heart on /></button></div>
              <div v-if="c.id.includes('/')" class="fdemo"><DemoFrame :lib="libOf(c.id)" :keys="[c.id.split('/')[1]]" cls="one" /></div>
              <div v-else-if="!c.id.includes('/')" class="uiprev" :style="{ '--lc': cardTag(c.idx) }"><span class="u-btn">Button</span><span class="u-tog"><i /></span><span class="u-inp" /><span class="u-chk"><UiIcon name="lucide:check" /></span><span class="u-tab"><b /><i /><i /></span><span class="u-sld"><b /><i /></span></div>
            </div>
          </template>
        </div>
        <div v-if="!items.length" class="fempty"><div><h2>{{ R.favTab === 'sets' ? t('noSets') : t('noUI') }}</h2><div>{{ R.favTab === 'sets' ? t('noSetsSub') : t('noUISub') }}</div></div></div>
      </div>

      <!-- icons (by group) / recently copied -->
      <div v-else class="vs">
        <div class="fbody">
          <div class="meta">
            <template v-if="R.favTab === 'icons'">
              <button class="gc" :class="{ on: !R.folder }" @click="R.folder = null">{{ t('ungrouped') }}<small>{{ S.favs.length }}</small></button>
              <button v-for="f in folders" :key="f" class="gc" :class="{ on: R.folder === f }" @click="R.folder = f"><UiIcon name="lucide:folder" />{{ f }}<small>{{ S.folders[f].length }}</small></button>
              <span v-if="adding" class="gc on"><UiIcon name="lucide:folder" /><input ref="nfEl" v-model="nf" :placeholder="t('folderName')" @keydown.stop.enter="okAdd" @keydown.stop.esc="adding = false" @blur="okAdd"></span>
              <button v-else class="gc add" :title="t('newFolder')" @click="startAdd"><UiIcon name="lucide:plus" /></button>
              <span class="sp" />
              <button v-if="R.folder" class="lk" @click="delFolder(R.folder!)">{{ t('delFolder') }}</button>
            </template>
            <template v-else>
              <span class="sp" />
              <button v-if="S.recent.length" class="lk" @click="S.recent = []; clearSel()">{{ t('clear') }}</button>
            </template>
            <span class="vsep" />
            <button class="qbtn" :title="t('iconColor')" @click.stop="openPop('color', $event)"><span class="dot" :style="{ background: S.color || CHECKER }" />{{ t('color') }}</button>
            <button class="qbtn" :title="t('size')" @click.stop="openPop('size', $event)"><UiIcon name="lucide:maximize-2" /><b>{{ S.size }}</b></button>
          </div>
          <div v-if="R.favTab === 'recent' && !S.recent.length" class="rempty"><div><h2>{{ t('noRecent') }}</h2></div></div>
          <div v-else-if="R.favTab === 'icons' && !src.length" class="rempty"><div><h2>{{ R.folder || t('noFavIcons') }}</h2><div>{{ t('noFavIconsSub') }}</div><button v-if="R.folder" class="btn sec" @click="delFolder(R.folder!)">{{ t('delFolder') }}</button></div></div>
          <div v-else class="fgrid"><IconTile v-for="id in iconList" :id="id" :key="id" :heart="R.favTab === 'recent'" :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" /></div>
        </div>
      </div>
    </div>
    <DetailBar v-if="!caseMode" />
  </div>
</template>
