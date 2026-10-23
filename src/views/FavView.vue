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
import { clearSel, leaveHook, likeSet, likeUI, openLib, openSet, pick } from '../lib/actions'
import { focusApi } from '../lib/swipe'
import { modKey } from '../lib/native'
import { openPop } from '../lib/fx'
import { icons as setIcons, pickIcons } from '../lib/deck'
import { CASE, ISO, P3, TAGC, anim, clamp01, easeIO, easeOut, easeOutBack, sleep, tween } from '../lib/iso'

// 收藏 = 扭蛋收纳盒. A multi-layer capsule case: one tray of 6 capsules = one page of 6 cards (3 × 2) for saved
// icon sets and UI libraries/components. Open: latch flips, lid lifts aside, capsules fly out and open into cards.
// Next layer: cards fold back into capsules → the tray is lifted and stacked to the right → next tray's capsules fly
// out. Icons and recent copies are plain grids (with groups) under the closed case.
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

// ---- the case
const items = computed<string[]>(() => (R.favTab === 'ui' ? S.uiFav : R.favTab === 'sets' ? S.sets : []))
const page = reactive<Record<string, number>>({ sets: 1, ui: 1 })
const curPage = () => Math.max(1, Math.min(page[R.favTab] || 1, Cg.N))
const shown = ref(1) // page whose cards are in the grid
const vis = reactive<boolean[]>(Array(6).fill(false)) // card i visible (else a dashed slot)
const isOpen = ref(false)
const nLayers = ref(2)
const busy = ref(false)
const sfx = `fc${Math.random().toString(36).slice(2, 6)}`
const svgEl = ref<SVGSVGElement>()
const grid = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
let Cg: any = { x0: 0, y0: 0, W: 96, N: 2, K: 6, th: 14, base: 6, lidH: 9 }
let L: any = null

const libOf = (id: string) => id.split('/')[0]
const tagOf = (idx: number) => {
  const id = items.value[idx]
  if (R.favTab === 'ui' && id) return UICOL[libOf(id)] || TAGC[idx % TAGC.length]
  return TAGC[(idx + 2 * Math.floor(idx / 6)) % TAGC.length]
}
const capFor = (idx: number) => (items.value[idx] ? { top: tagOf(idx), tag: '', rot: -24 + (idx * 37 % 40) } : null)
const cardItems = computed(() => Array.from({ length: 6 }, (_, i) => { const idx = (shown.value - 1) * 6 + i; return { i, idx, id: items.value[idx] || '' } }))
watch(cardItems, (cs) => { if (R.favTab === 'sets') cs.forEach(c => c.id && pickIcons(c.id)) }, { immediate: true })
const N = (n?: number) => Number(n || 0).toLocaleString()

function makeC() { Cg = { x0: 0, y0: 0, W: 96, N: Math.max(2, Math.ceil(items.value.length / 6)), K: 6, th: 14, base: 6, lidH: 9 }; nLayers.value = Cg.N }
function reset(open: boolean) {
  makeC()
  isOpen.value = open
  const p = curPage()
  L = CASE.layout(Cg, p, open)
  L.active = p
  L.caps = {}
  L.show = {}
  for (let j = 1; j <= Cg.N; j++) {
    L.caps[j] = []
    L.show[j] = []
    for (let i = 0; i < 6; i++) { L.caps[j][i] = caseMode.value ? capFor((j - 1) * 6 + i) : null; L.show[j][i] = true }
  }
  paint()
}
function paint() {
  const svg = svgEl.value
  if (!svg || !L) return
  ISO.setSfx(sfx)
  svg.innerHTML = ISO.defs() + CASE.svg(Cg, L, { tabs: true })
  const G = CASE.geo(Cg)
  const k = clamp01(Math.max(L.lid.dx, ...Object.values(L.trays).map((x: any) => x.dx)) / G.stashDX)
  const lift = clamp01((L.lid.z - G.caseTop) / 18)
  const ex = Math.max(0, Cg.N * Cg.th - 45)
  const A = [-100, -84 - ex, 200, 190 + ex]
  const B = [-94, -82 - ex, 286, 238 + ex]
  const kk = Math.max(k, lift * 0.35)
  svg.setAttribute('viewBox', A.map((v, i) => ISO.f(v + (B[i] - v) * kk)).join(' '))
}
/** World point → client coordinates. */
function scr(x: number, y: number, z: number) {
  const q3 = P3(x, y, z)
  const m = svgEl.value!.getScreenCTM()!
  return { x: m.a * q3[0] + m.c * q3[1] + m.e, y: m.b * q3[0] + m.d * q3[1] + m.f, s: m.a }
}
function pocketScr(j: number, i: number) {
  const tr = L.trays[j]
  const [px, py] = CASE.pocketXY(Cg, j, i, tr.dx)
  const pr = ((Cg.W - 6) / 3) * 0.36
  const p = scr(px, py, tr.z + Cg.th - 2)
  return { x: p.x, y: p.y - pr * 1.02 * 0.52 * p.s, r: pr * 1.02 * p.s }
}
const cardEl = (i: number) => grid.value?.querySelector<HTMLElement>(`.fc[data-i="${i}"]`)
function flycap(r: number, cap: { top: string, tag: string }) {
  const d = document.createElement('div')
  d.className = 'flycap'
  d.style.cssText = `width:${r * 2}px;height:${r * 2}px`
  d.innerHTML = `<svg class="iso10" viewBox="${-r} ${-r} ${2 * r} ${2 * r}" style="overflow:visible">${ISO.capsule(r, cap.top, cap.tag)}</svg>`
  document.querySelector('.win')!.appendChild(d)
  return d
}
/** Lid / tray path: lift → slide → set down. */
async function movePart(get: () => any, set: (v: any) => void, to: { dx: number, z: number }, lift: number, dur = 640) {
  const from = { ...get() }
  const zUp = Math.max(from.z, to.z, lift)
  await tween(dur, (_e, tt) => {
    let dx: number
    let z: number
    if (tt < 0.3) { const k = easeOut(tt / 0.3); dx = from.dx; z = from.z + (zUp - from.z) * k }
    else if (tt < 0.72) { const k = easeIO((tt - 0.3) / 0.42); dx = from.dx + (to.dx - from.dx) * k; z = zUp }
    else { const k = easeOutBack((tt - 0.72) / 0.28); dx = to.dx; z = zUp + (to.z - zUp) * k }
    set({ dx, z })
    paint()
  }, x => x)
}
/** Capsules fly out of tray p and open into the cards. */
async function flyOut(p: number) {
  shown.value = p
  for (let i = 0; i < 6; i++) vis[i] = false
  await nextTick()
  const its = [0, 1, 2, 3, 4, 5].filter(i => L.caps[p]?.[i])
  await Promise.all(its.map((i, k) => (async () => {
    await sleep(k * 70)
    const cap = L.caps[p][i]
    const a = pocketScr(p, i)
    L.show[p][i] = false
    paint()
    const c = cardEl(i)
    if (!c) return
    const b = c.getBoundingClientRect()
    const d = flycap(a.r, cap)
    const sx = a.x - a.r
    const sy = a.y - a.r
    const ex = b.left + b.width / 2 - a.r
    const ey = b.top + b.height / 2 - a.r
    const sc = 20 / a.r
    const kf: Keyframe[] = []
    for (let n = 0; n <= 14; n++) {
      const tt = n / 14
      const u = 1 - tt
      const cx = (sx + ex) / 2
      const cy = Math.min(sy, ey) - 60 - k * 4
      kf.push({ transform: `translate(${u * u * sx + 2 * u * tt * cx + tt * tt * ex}px,${u * u * sy + 2 * u * tt * cy + tt * tt * ey}px) scale(${1 + (sc - 1) * tt}) rotate(${tt * 300 - 24}deg)` })
    }
    await anim(d, kf, { duration: 560, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished
    anim(d.querySelector('.ctop')!, [{ transform: 'none', opacity: 1 }, { transform: 'translate(-6px,-14px) rotate(-40deg)', opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' })
    anim(d.querySelector('.cbot')!, [{ transform: 'none', opacity: 1 }, { transform: 'translate(5px,10px) rotate(25deg)', opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' })
    vis[i] = true
    anim(c, [{ transform: 'scale(.35)', opacity: 0, borderRadius: '50%' }, { transform: 'scale(1.04)', opacity: 1, borderRadius: '14px', offset: 0.7 }, { transform: 'scale(1)', opacity: 1, borderRadius: '14px' }], { duration: 360, easing: 'cubic-bezier(.3,.7,.3,1)' })
    await sleep(300)
    d.remove()
  })()))
}
/** Cards fold into capsules and fly back into tray p. */
async function flyIn(p: number) {
  const its = [0, 1, 2, 3, 4, 5].filter(i => L.caps[p]?.[i] && vis[i])
  await Promise.all(its.slice().reverse().map((i, k) => (async () => {
    await sleep(k * 55)
    const cap = L.caps[p][i]
    const c = cardEl(i)
    if (!c) { L.show[p][i] = true; return }
    const b = c.getBoundingClientRect()
    const a = pocketScr(p, i)
    await anim(c, [{ transform: 'scale(1)', opacity: 1, borderRadius: '14px' }, { transform: 'scale(.3)', opacity: 0, borderRadius: '50%' }], { duration: 240, easing: 'ease-in', fill: 'forwards' }).finished
    c.getAnimations().forEach(x => x.cancel())
    vis[i] = false
    const d = flycap(a.r, cap)
    const sx = b.left + b.width / 2 - a.r
    const sy = b.top + b.height / 2 - a.r
    const ex = a.x - a.r
    const ey = a.y - a.r
    const sc = 20 / a.r
    const kf: Keyframe[] = []
    for (let n = 0; n <= 14; n++) {
      const tt = n / 14
      const u = 1 - tt
      const cx = (sx + ex) / 2
      const cy = Math.min(sy, ey) - 50
      kf.push({ transform: `translate(${u * u * sx + 2 * u * tt * cx + tt * tt * ex}px,${u * u * sy + 2 * u * tt * cy + tt * tt * ey}px) scale(${sc + (1 - sc) * tt}) rotate(${(1 - tt) * -260 - 24}deg)` })
    }
    await anim(d, kf, { duration: 480, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished
    L.show[p][i] = true
    paint()
    d.remove()
  })()))
  for (let i = 0; i < 6; i++) vis[i] = false
}
function instantOpen() {
  const p = curPage()
  reset(true)
  for (let j = 1; j <= Cg.N; j++) L.show[j] = L.show[j].map(() => j !== p)
  paint()
  shown.value = p
  for (let i = 0; i < 6; i++) vis[i] = true
}
async function open() {
  if (busy.value || isOpen.value || !caseMode.value || !items.value.length) return
  busy.value = true
  const G = CASE.geo(Cg)
  const p = curPage()
  for (let i = 0; i < 6; i++) vis[i] = false
  await tween(200, (e) => { L.latch = e; paint() })
  await movePart(() => L.lid, (v) => { L.lid = v }, { dx: G.stashDX, z: 0 }, G.caseTop + 16, 720)
  let zz = Cg.lidH
  for (let j = 1; j < p; j++) { await movePart(() => L.trays[j], (v) => { L.trays[j] = v }, { dx: G.stashDX, z: zz }, G.caseTop + 16 + zz, 560); zz += Cg.th - 2 }
  isOpen.value = true
  await flyOut(p)
  busy.value = false
}
async function close(fast = false) {
  if (busy.value || !isOpen.value) return
  busy.value = true
  const G = CASE.geo(Cg)
  const p = curPage()
  await flyIn(p)
  for (let j = p - 1; j >= 1; j--) await movePart(() => L.trays[j], (v) => { L.trays[j] = v }, { dx: 0, z: G.home(j) }, G.caseTop + 20 + Cg.lidH + (j - 1) * (Cg.th - 2), fast ? 380 : 520)
  await movePart(() => L.lid, (v) => { L.lid = v }, { dx: 0, z: G.caseTop }, G.caseTop + 18, fast ? 460 : 640)
  await tween(220, (e) => { L.latch = 1 - e; paint() }, easeOutBack)
  if (svgEl.value) anim(svgEl.value, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px) scaleY(.985)' }, { transform: 'translateY(0)' }], { duration: 240, easing: 'ease-out' })
  isOpen.value = false
  busy.value = false
}
async function goPage(n: number) {
  const p = curPage()
  if (!caseMode.value || busy.value || n < 1 || n > Cg.N || n === p) return
  if (!isOpen.value) { page[R.favTab] = n; reset(false); return open() }
  busy.value = true
  const G = CASE.geo(Cg)
  await flyIn(p)
  if (n > p) {
    let zz = Cg.lidH + (p - 1) * (Cg.th - 2)
    for (let j = p; j < n; j++) { await movePart(() => L.trays[j], (v) => { L.trays[j] = v }, { dx: G.stashDX, z: zz }, G.caseTop + 16 + zz, 620); zz += Cg.th - 2 }
  }
  else {
    for (let j = p - 1; j >= n; j--) await movePart(() => L.trays[j], (v) => { L.trays[j] = v }, { dx: 0, z: G.home(j) }, G.caseTop + 20 + Cg.lidH + (j - 1) * (Cg.th - 2), 620)
  }
  page[R.favTab] = n
  L.active = n
  paint()
  await flyOut(n)
  busy.value = false
}
const toggle = () => (isOpen.value ? close() : open())
async function tab(k: FavTab) {
  if (busy.value || k === R.favTab) return
  if (isOpen.value) await close(true)
  R.favTab = k
  R.folder = null
  clearSel()
  await nextTick()
  reset(false)
  if (caseMode.value) open()
}
// Something saved / removed while the case is open: redraw in place.
watch(() => items.value.length, async () => {
  if (!caseMode.value || busy.value) return
  await nextTick()
  if (isOpen.value) instantOpen()
  else reset(false)
})
// Arrow keys flip layers (only when no icon is selected in a flat tab).
function onKey(e: KeyboardEvent) {
  if (!caseMode.value || ['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) return
  if (e.key === 'ArrowRight') { e.preventDefault(); goPage(curPage() + 1) }
  if (e.key === 'ArrowLeft') { e.preventDefault(); goPage(curPage() - 1) }
}
function onSvgClick(e: MouseEvent) { const tb = (e.target as Element).closest('.ltab') as SVGGElement | null; if (tb) goPage(+tb.dataset.l!) }

const cardTag = (idx: number) => tagOf(idx)
function openCard(id: string) { if (!id) return; if (R.favTab === 'sets') openSet(id); else openLib(libOf(id)) }

onMounted(() => {
  focusApi.focus = () => input.value?.focus()
  document.addEventListener('keydown', onKey, true)
  W.__fav = { get isOpen() { return isOpen.value }, get busy() { return busy.value }, get L() { return L }, get C() { return Cg }, goPage, open, close, tab }
  reset(false)
  if (caseMode.value) setTimeout(open, 200)
  leaveHook.fav = async () => { if (isOpen.value) { while (busy.value) await sleep(40); await close(true) } }
})
onBeforeUnmount(() => {
  focusApi.focus = () => {}
  document.removeEventListener('keydown', onKey, true)
  leaveHook.fav = null
  document.querySelectorAll('.flycap').forEach(e => e.remove())
})
const W = window as any
</script>

<template>
  <div class="body fav-v">
    <div class="fav101">
      <div class="fhead">
        <div class="fchest cstage"><svg ref="svgEl" class="isosvg iso10 csvg" preserveAspectRatio="xMidYMid meet" @click="onSvgClick" /></div>
        <div class="finfo">
          <h3>{{ t('chestT') }}</h3>
          <div class="ftabs">
            <button v-for="[k, l] in TABS" :key="k" :class="{ on: R.favTab === k }" @click="tab(k)">{{ t(l) }}<small>{{ count(k) }}</small></button>
          </div>
          <div class="frow">
            <template v-if="caseMode">
              <button class="btn pri" :disabled="!items.length" @click="toggle"><UiIcon name="lucide:package-open" /><span>{{ isOpen ? t('closeChest') : t('openChest') }}</span></button>
              <span class="sp" />
              <div class="fpager">
                <button class="pg" :disabled="curPage() <= 1 || busy" :title="t('prevLayer')" @click="goPage(curPage() - 1)"><UiIcon name="lucide:chevron-left" /></button>
                <span class="pl"><b>{{ curPage() }}</b> / {{ nLayers }}</span>
                <span class="pdots"><i v-for="n in nLayers" :key="n" :class="{ on: n === curPage() }" /></span>
                <button class="pg" :disabled="curPage() >= nLayers || busy" :title="t('nextLayer')" @click="goPage(curPage() + 1)"><UiIcon name="lucide:chevron-right" /></button>
              </div>
            </template>
            <label v-else class="isearch sm"><UiIcon name="lucide:search" /><input ref="input" v-model="R.q" :placeholder="t('phFav')" spellcheck="false"><kbd>{{ modKey.trim() }}K</kbd></label>
          </div>
        </div>
      </div>

      <!-- saved icon sets / UI libraries: 6 cards per layer -->
      <div v-if="caseMode" class="fbody10">
        <div ref="grid" class="fgrid10">
          <template v-for="c in cardItems" :key="`${R.favTab}:${c.i}`">
            <div v-if="!c.id" class="fc empty" :data-i="c.i" />
            <div v-else-if="R.favTab === 'sets'" class="fc set" :class="{ hid: !vis[c.i] }" :data-i="c.i" @click="vis[c.i] && openCard(c.id)">
              <div class="fh"><i class="fdot" :style="{ background: cardTag(c.idx) }" /><b>{{ INFO[c.id]?.name || c.id }}</b><small>{{ N(INFO[c.id]?.total) }}</small>
                <button class="ib hrt" :title="t('unfavd')" @click.stop="likeSet(c.id)"><Heart on /></button></div>
              <div class="fi"><UiIcon v-for="n in (setIcons[c.id] || (INFO[c.id]?.samples || []).map(x => `${c.id}:${x}`)).slice(0, 10)" :key="n" :name="n" /></div>
              <div class="fm">{{ [INFO[c.id]?.author?.name, INFO[c.id]?.license?.title].filter(Boolean).join(' · ') }}</div>
            </div>
            <div v-else class="fc lib" :class="{ hid: !vis[c.i] }" :data-i="c.i" @click="vis[c.i] && openCard(c.id)">
              <div class="fh"><i class="fdot" :style="{ background: cardTag(c.idx) }" /><b>{{ c.id.includes('/') ? ukl(c.id.split('/')[1]) : UI(c.id)?.name }}</b><small>{{ c.id.includes('/') ? UI(libOf(c.id))?.name : UI(c.id)?.fw }}</small>
                <button class="ib hrt" :title="t('unfavd')" @click.stop="likeUI(c.id)"><Heart on /></button></div>
              <div v-if="c.id.includes('/') && vis[c.i]" class="fdemo"><DemoFrame :lib="libOf(c.id)" :keys="[c.id.split('/')[1]]" cls="one" /></div>
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
