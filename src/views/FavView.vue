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
import { CHEST, GM, INK, TAGC, anim, clamp01, easeOut, tween } from '../lib/iso'

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
// v0.4.1: slower, deliberate flights — each capsule ~680 ms on an arc, 55 ms stagger (6 cards ≈ 0.95 s);
// ease-out leaving the chest, ease-in returning to it. A page turn overlaps both (the new page starts 140 ms in).
const FLY = { out: 680, back: 640, stag: 55, overlap: 140 }
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

/** Chest mouth in client coordinates. */
function mouth(svg = svgEl.value!, k = 0) {
  const q = CHEST.pileTop(CHEST.BIG)
  const m = svg.getScreenCTM()!
  // spread the exits / landings over the heap so the capsules seem to come from (and sink into) different spots
  const sx = [-26, 18, -6, 30, -18, 6][k % 6]
  const sy = [4, -2, 6, 3, -3, 1][k % 6]
  return { x: m.a * (q[0] + sx) + m.e, y: m.d * (q[1] + sy) + m.f, s: m.a }
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
/** Point on a quadratic arc from (dx,dy) to (0,0), apex lifted `lift` px above the higher end. */
function arcAt(dx: number, dy: number, lift: number, tt: number) {
  const cx = dx * 0.5
  const cy = Math.min(dy, 0) - lift
  const u = 1 - tt
  return { x: u * u * dx + 2 * u * tt * cx, y: u * u * dy + 2 * u * tt * cy }
}
const tr = (p: { x: number, y: number }) => `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`
/** Capsules leave the heap in the chest one by one, arc over to their card spots and bloom into the cards. */
function flyOut(delay = 0) {
  const g = grid.value
  if (!g || !svgEl.value) return Promise.resolve()
  const cards = [...g.querySelectorAll<HTMLElement>('.fc')]
  const S0 = 30
  const jobs: Promise<unknown>[] = []
  const T = FLY.out
  const ARR = 0.7 // the capsule reaches the card at 70 %, then blooms
  cards.forEach((c, k) => {
    const r = c.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const d0 = delay + k * FLY.stag
    if (c.classList.contains('empty')) { jobs.push(anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: d0 + T * 0.55, fill: 'backwards' }).finished); return }
    const M = mouth(undefined, k)
    const s0 = Math.max(0.3, (M.s * 6.4 * 2) / S0) // starts at the size of a capsule in the heap
    const cp = capEl(c.dataset.c || '', S0)
    cp.style.left = `${cx - S0 / 2}px`
    cp.style.top = `${cy - S0 / 2}px`
    const lift = 60 + (k % 3) * 14
    const N = 14
    const kf: Keyframe[] = []
    for (let i = 0; i <= N; i++) {
      const tt = 1 - (1 - i / N) ** 2.2 // ease-out baked into the path, so the bloom keeps linear time
      kf.push({ transform: `${tr(arcAt(M.x - cx, M.y - cy, lift, tt))} scale(${(s0 + (1.06 - s0) * tt).toFixed(3)}) rotate(${(-220 * (1 - tt)).toFixed(0)}deg)`, opacity: 1, offset: ARR * (i / N) })
    }
    kf.push({ transform: 'translate(0px,0px) scale(1.5) rotate(0deg)', opacity: 0, offset: 1 })
    cp.style.opacity = '0'
    anim(cp, kf, { duration: T, delay: d0, easing: 'linear', fill: 'forwards' }).finished.then(() => cp.remove(), () => cp.remove())
    jobs.push(anim(c, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(.3)', offset: ARR - 0.04, easing: 'cubic-bezier(.2,.8,.3,1)' }, { opacity: 1, transform: 'scale(1.02)', offset: 0.92, easing: 'ease-out' }, { opacity: 1, transform: 'none' }], { duration: T, delay: d0, easing: 'linear', fill: 'backwards' }).finished)
  })
  pulse(delay)
  return Promise.all(jobs).catch(() => {})
}
/** Cards (in `layer`, a frozen copy) fold into capsules that arc back and sink into the heap. */
function flyBack(layer: Element, svg = svgEl.value!, dur = FLY.back) {
  const cards = [...layer.querySelectorAll<HTMLElement>('.fc')].reverse()
  const S0 = 30
  const jobs: Promise<unknown>[] = []
  const FOLD = 0.24 // the card folds into its capsule during the first 24 %
  cards.forEach((c, k) => {
    const r = c.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const d0 = k * FLY.stag
    jobs.push(anim(c, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.3)', offset: FOLD }, { opacity: 0, transform: 'scale(.3)' }], { duration: dur, delay: d0, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' }).finished)
    if (c.classList.contains('empty')) return
    const M = mouth(svg, 5 - k)
    const s1 = Math.max(0.3, (M.s * 6.4 * 2) / S0)
    const cp = capEl(c.dataset.c || '', S0)
    cp.style.left = `${cx - S0 / 2}px`
    cp.style.top = `${cy - S0 / 2}px`
    const lift = 56 + (k % 3) * 12
    const kf: Keyframe[] = [{ transform: 'translate(0px,0px) scale(.4)', opacity: 0, offset: 0 }, { transform: 'translate(0px,0px) scale(1.04)', opacity: 1, offset: FOLD }]
    for (let i = 1; i <= 14; i++) {
      const tt = (i / 14) ** 1.9 // ease-in baked into the path
      const off = FOLD + (1 - FOLD) * (i / 14)
      kf.push({ transform: `${tr(arcAt(M.x - cx, M.y - cy, lift, 1 - tt))} scale(${(1.04 + (s1 - 1.04) * tt).toFixed(3)}) rotate(${(240 * tt).toFixed(0)}deg)`, opacity: i === 14 ? 0 : 1, offset: off })
    }
    const a = anim(cp, kf, { duration: dur, delay: d0, easing: 'linear', fill: 'both' })
    a.finished.then(() => cp.remove(), () => cp.remove())
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
  anim(fchest.value!, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
  anim(fmach.value!, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 40, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
  const rest = rootEl.value!.querySelectorAll<HTMLElement>('.vs, .fempty')
  rest.forEach(e => anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 60, fill: 'backwards' }))
  if (caseMode.value) flyOut(60)
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
  if (caseMode.value) flyOut(300)
  else flatIn()
}
async function goPage(n: number) {
  if (!caseMode.value || busy || n < 1 || n > nPages.value || n === curPage.value) return
  busy = true
  const g = ghost()
  page[R.favTab] = n
  await nextTick()
  const b = g ? flyBack(g).then(() => g.remove()) : Promise.resolve()
  await Promise.all([b, flyOut(FLY.overlap)])
  busy = false
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
  const b = g ? flyBack(g).then(() => g.remove()) : Promise.resolve()
  const o = caseMode.value ? flyOut(g ? FLY.overlap : 0) : (flatIn(), Promise.resolve())
  await Promise.all([b, o])
  busy = false
}
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
  if (cm && svg) jobs.push(flyBack(layer.querySelector('.fbody10 .fgrid10')!, svg, 420))
  else layer.querySelectorAll<HTMLElement>('.vs').forEach(e => anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }))
  const lid = svg?.querySelector('.clid')
  const glow = svg?.querySelector<SVGElement>('.c-glow')
  if (lid) jobs.push(tween(300, (e) => { CHEST.setLid(lid, CHEST.BIG, 104 * (1 - e)); if (glow) glow.style.opacity = String(1 - e) }, easeOut))
  jobs.push(anim(layer, [{ opacity: 1 }, { opacity: 0.8, offset: 0.3 }, { opacity: 0 }], { duration: 340, fill: 'forwards' }).finished)
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
  W.__fav = { get busy() { return busy }, goPage, tab, get page() { return curPage.value } }
  const src = chestFx.from
  const msrc = machFx.from
  chestFx.from = null
  machFx.from = null
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
            <div v-else-if="R.favTab === 'sets'" class="fc set" :data-i="c.i" :data-c="cardTag(c.idx)" @click="openCard(c.id)">
              <div class="fh"><i class="fdot" :style="{ background: cardTag(c.idx) }" /><b>{{ INFO[c.id]?.name || c.id }}</b><small>{{ N(INFO[c.id]?.total) }}</small>
                <button class="ib hrt" :title="t('unfavd')" @click.stop="likeSet(c.id)"><Heart on /></button></div>
              <div class="fi"><UiIcon v-for="n in (setIcons[c.id] || (INFO[c.id]?.samples || []).map(x => `${c.id}:${x}`)).slice(0, 10)" :key="n" :name="n" /></div>
              <div class="fm">{{ [INFO[c.id]?.author?.name, INFO[c.id]?.license?.title].filter(Boolean).join(' · ') }}</div>
            </div>
            <div v-else class="fc lib" :data-i="c.i" :data-c="cardTag(c.idx)" @click="openCard(c.id)">
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
