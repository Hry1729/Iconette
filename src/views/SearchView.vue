<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import IconTile from '../components/IconTile.vue'
import IconWall from '../components/IconWall.vue'
import UiIcon from '../components/UiIcon.vue'
import Pop from '../components/Pop.vue'
import ScopePop from '../components/ScopePop.vue'
import DetailBar from '../components/DetailBar.vue'
import { R, S, toggleFav, toggleSet } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, collection, ensureAll, ensureSet, localNames, search, shortName, svg } from '../lib/iconify'
import { zh2en } from '../lib/zh'
import { openUrl } from '../lib/native'
import { copy, pick, setMode, toast } from '../lib/actions'
import { fmtLabel } from '../lib/format'
import { focusApi, gachaFx } from '../lib/swipe'
import { flyToChest, openPop } from '../lib/fx'
import { GM } from '../lib/iso'
import { modKey } from '../lib/native'

type State =
  | { k: 'hello' }
  | { k: 'set', total: number }
  | { k: 'results', n: number, sets: number, zh?: string }
  | { k: 'none' }
  | { k: 'zhNone', w: string }

const emit = defineEmits<{ (e: 'copy', id: string): void, (e: 'enter'): void }>()
const st = ref<State>({ k: 'hello' })
const shown = ref(240)
const body = ref<HTMLElement>()
const sentinel = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const scrolled = ref(false)
const N = (n?: number) => Number(n || 0).toLocaleString()

// ---- home hero
ensureAll()
const stats = computed(() => {
  const sets = Object.values(INFO).filter(s => !s.hidden)
  const total = sets.reduce((a, s) => a + (s.total || 0), 0)
  return { sets: sets.length, total }
})
/** 412345 → "41.2 万" (zh) / "412k" (en). */
const big = (n: number) => S.lang === 'zh' ? `${(n / 1e4).toFixed(n >= 1e6 ? 0 : 1).replace(/\.0$/, '')} 万` : `${Math.round(n / 1e3)}k`
const TREND: [string, string, string][] = [['箭头', 'arrow', 'ph:arrow-right'], ['用户', 'user', 'lucide:user'], ['设置', 'settings', 'lucide:settings'], ['心形', 'heart', 'ph:heart'], ['github', 'github', 'tabler:brand-github'], ['天气', 'weather', 'lucide:sun']]
const TODAY = ['ph:planet-duotone', 'ph:paper-plane-tilt-duotone', 'tabler:rocket', 'lucide:sparkles', 'ph:butterfly-duotone', 'mingcute:moon-stars-line', 'ph:coffee-duotone', 'tabler:ghost', 'lucide:feather', 'ph:lightning-duotone', 'tabler:puzzle', 'lucide:compass', 'ph:cat-duotone', 'ph:flower-lotus-duotone', 'mingcute:cake-line', 'tabler:planet', 'lucide:leaf', 'ph:cloud-sun-duotone', 'tabler:mood-smile', 'lucide:gem', 'ph:music-notes-duotone']
const today = TODAY[Math.floor(Date.now() / 864e5) % TODAY.length]
const recent = computed(() => S.recent.slice(0, 7))

// ---- bottom-left dock: one card open at a time (today's icon by default), × collapses it; remembered in settings
const dockInstant = ref(true)
function setDock(v: 'today' | 'recent' | 'none') { dockInstant.value = false; S.dock = v }
const todayFav = computed(() => S.favs.includes(today))
const tbig = ref<HTMLElement>()
function saveToday() { const on = toggleFav(today); if (on) flyToChest(tbig.value, svg(today)) }

// ---- bottom-right mini gacha machine → 划一划 · 扭蛋 (shared-element transition, see GachaView)
const miniSVG = `<svg class="ink mgsvg" viewBox="${GM.VB.mini.join(' ')}" preserveAspectRatio="xMidYMid meet">${GM.scene({})}</svg>`
const mini = ref<HTMLElement>()
function toGacha() {
  const el = mini.value?.querySelector('svg') as SVGSVGElement | null
  if (el) { const r = el.getBoundingClientRect(); gachaFx.flip = { x: r.left, y: r.top, w: r.width, h: r.height, m: el.getScreenCTM()!, html: el.outerHTML }; mini.value!.style.opacity = '0' }
  S.swView = 'gacha'
  setMode('swipe')
}
function typeIn(q: string) {
  R.q = ''
  let i = 0
  const go = () => { R.q = q.slice(0, ++i); if (i < q.length) setTimeout(go, 70) }
  go()
  input.value?.focus()
}

// ---- docking: the hero search slides up into a compact sticky bar while there is a query or a set
const docked = computed(() => !!R.q.trim() || !!R.set)

// ---- results
const STY = {
  duo: /(^|-)(duotone|twotone|two-tone|duo|bulk|tone)(-|$)/,
  fill: /(^|-)(fill|filled|solid|bold|fat|glyph)(-|$)/,
}
const SOLID_SETS = /^(mdi|material-symbols|ic|fa6-solid|fa-solid|heroicons-solid|mingcute-fill|bxs|zondicons|el|gridicons)$/
function styleOf(id: string): 'line' | 'fill' | 'duo' {
  const [p, n] = id.split(':')
  if (STY.duo.test(n)) return 'duo'
  if (STY.fill.test(n)) return 'fill'
  if (SOLID_SETS.test(p) && !/outline|line|thin|light/.test(n)) return 'fill'
  return 'line'
}
const raw = ref<string[]>([])
watch([raw, () => S.style], () => { R.list = S.style === 'all' || st.value.k === 'hello' ? raw.value : raw.value.filter(id => styleOf(id) === S.style) })
const visible = computed(() => R.list.slice(0, shown.value))
const groups = computed(() => {
  const g = new Map<string, string[]>()
  for (const id of visible.value) { const p = id.split(':')[0]; if (!g.has(p)) g.set(p, []); g.get(p)!.push(id) }
  return [...g.entries()]
})
const info = computed(() => (R.set ? INFO[R.set] : undefined))
const scopeIds = computed(() => (S.scopeAll ? [] : S.scope.filter(p => S.sets.includes(p))))

let tok = 0
let deb: ReturnType<typeof setTimeout> | undefined
async function run() {
  const my = ++tok
  const q = R.q.trim()
  shown.value = 240
  if (!q && !R.set) { st.value = { k: 'hello' }; raw.value = []; return }
  if (R.set && !q) {
    // 打开整套时把全文 JSON 拉到本地。名称列表仍先走原来的接口，失败再改用本地全文。
    const p = R.set
    const job = ensureSet(p)
    const all = await collection(p)
    if (my !== tok) return
    const publish = (names: string[]) => {
      st.value = { k: 'set', total: names.length }
      raw.value = names.map(n => `${p}:${n}`)
    }
    publish(all)
    const total = INFO[p]?.total || 0
    if (total && all.length < total) {
      void job.then(async (ok) => {
        if (!ok || my !== tok || R.set !== p) return
        const again = await localNames(p)
        if (!again || my !== tok || R.set !== p || again.length <= all.length) return
        publish(again)
      })
    }
    return
  }
  let pre = R.set || scopeIds.value.join(',')
  let qq = q
  const m = q.match(/^([a-z0-9-]+):(.*)$/)
  if (m) { pre = m[1]; qq = m[2] || 'a' }
  const tr = zh2en(qq)
  if (tr === '') { raw.value = []; st.value = { k: 'zhNone', w: qq }; return }
  const zh = tr ? t('zhMap', { a: qq, b: tr }) : undefined
  if (tr) qq = tr
  const ic = await search(qq, { prefix: pre || undefined, limit: pre || S.style !== 'all' ? 999 : 480 })
  if (my !== tok) return
  if (!ic.length) { raw.value = []; st.value = { k: 'none' }; return }
  const rank = (id: string) => { const i = S.sets.indexOf(id.split(':')[0]); return i < 0 ? 99 : i }
  const list = pre && !pre.includes(',') ? ic : ic.map((id, i) => [id, i] as const).sort((x, y) => (rank(x[0]) - rank(y[0])) || x[1] - y[1]).map(x => x[0])
  st.value = { k: 'results', n: ic.length, sets: new Set(ic.map(x => x.split(':')[0])).size, zh }
  raw.value = list
}
watch(() => R.set, () => { R.sel = null; R.q = ''; run(); body.value?.scrollTo(0, 0) })
watch(() => R.q, () => { clearTimeout(deb); deb = setTimeout(() => { R.sel = null; run() }, 200) })
watch(() => [S.scopeAll, scopeIds.value.join(), S.style === 'all'], () => { if (R.q.trim()) run() })
watch(() => S.sets.join(), () => { if (R.q.trim() && !R.set) run() })
run()

// infinite scroll for big sets
let so: IntersectionObserver | undefined
watch(sentinel, (el) => {
  so?.disconnect()
  if (!el) return
  so = new IntersectionObserver((e) => { if (e[0].isIntersecting && shown.value < R.list.length) shown.value += 240 }, { root: body.value, rootMargin: '300px' })
  so.observe(el)
})
onBeforeUnmount(() => so?.disconnect())

function likeSet() { if (!R.set) return; const on = toggleSet(R.set); toast(on ? t('likedSet', { n: shortName(R.set) }) : t('unlikedSet')) }

// ---- scope pill
const scopeLabel = computed(() => {
  if (R.set) return shortName(R.set)
  return S.scopeAll || !scopeIds.value.length ? t('allSets') : scopeIds.value.length === 1 ? shortName(scopeIds.value[0]) : t('nSets', { n: scopeIds.value.length })
})
const stack = computed(() => {
  const ps = R.set ? [R.set] : S.scopeAll || !scopeIds.value.length ? S.sets.slice(0, 3) : scopeIds.value.slice(0, 3)
  return ps.filter(p => INFO[p]?.samples?.[0]).map(p => `${p}:${INFO[p].samples![0]}`)
})
/** Tab / Shift+Tab: all sets → each pinned set → all. */
function cycleScope(dir: number) {
  const opts = ['*', ...S.sets]
  const cur = R.set ? -1 : S.scopeAll || scopeIds.value.length !== 1 ? 0 : opts.indexOf(scopeIds.value[0])
  R.set = null
  const nx = opts[(Math.max(0, cur) + dir + opts.length) % opts.length]
  if (nx === '*') S.scopeAll = true
  else { S.scopeAll = false; S.scope = [nx] }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Backspace' && !R.q && R.set) R.set = null
  if (e.key === 'Tab') { e.preventDefault(); cycleScope(e.shiftKey ? -1 : 1); return }
  if ((e.key === 'ArrowDown' || e.key === 'Enter') && R.list[0] && !R.sel) { e.preventDefault(); e.stopPropagation(); input.value?.blur(); emit('enter') }
}

const CHECKER = 'conic-gradient(#999 0 25%,#ddd 0 50%,#999 0 75%,#ddd 0)'
const dispSize = computed(() => `${Math.max(16, Math.min(40, S.size))}px`)
const STYLES: ['line' | 'fill' | 'duo', string][] = [['line', 'stLine'], ['fill', 'stFill'], ['duo', 'stDuo']]
const styleName = computed(() => t(STYLES.find(x => x[0] === S.style)?.[1] || 'stLine'))
const setStyle = (k: 'line' | 'fill' | 'duo') => { S.style = S.style === k ? 'all' : k }

onMounted(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => { dockInstant.value = false }))
  focusApi.focus = () => input.value?.focus()
  nextTick(() => input.value?.focus())
})
onBeforeUnmount(() => { focusApi.focus = () => {} })
</script>

<template>
  <div class="body find" :class="{ docked, scrolled: docked && scrolled }">
    <IconWall />
    <div class="hero">
      <div class="eyebrow">
        <i /><template v-if="stats.total"><b>{{ big(stats.total) }}</b>{{ t('stIcons') }}<span class="dt">·</span><b>{{ stats.sets }}</b>{{ t('stSets') }}<span class="dt">·</span></template>{{ t('stCopy') }}
      </div>
      <div class="htitle">{{ t('hello') }}</div>
    </div>

    <label class="sbox vA" :class="{ has: !!R.q }">
      <span class="sic"><UiIcon name="lucide:search" /></span>
      <span v-if="R.set" class="tag">{{ shortName(R.set) }}<button @click.prevent="R.set = null"><UiIcon name="lucide:x" /></button></span>
      <input ref="input" v-model="R.q" :placeholder="R.set ? t('phSet', { n: shortName(R.set) }) : t('ph')" autocomplete="off" spellcheck="false" @keydown="onKey">
      <button class="clr" tabindex="-1" @click.prevent="R.q = ''; input?.focus()"><UiIcon name="lucide:x" /></button>
      <span class="kbd"><kbd>{{ modKey.trim() }}</kbd><kbd>K</kbd></span>
      <button class="scope" :class="{ open: R.pop === 'scope' }" @click.prevent.stop="openPop('scope', $event)">
        <span class="stk"><UiIcon v-for="x in stack" :key="x" class="ic" :name="x" /></span>{{ scopeLabel }}<UiIcon class="cv" name="lucide:chevron-down" />
      </button>
    </label>

    <div class="chips">
      <span class="lb"><UiIcon name="lucide:trending-up" />{{ t('hot') }}</span>
      <button v-for="[zh, en, ic] in TREND" :key="en" class="chip" @click="typeIn(S.lang === 'zh' ? zh : en)"><UiIcon class="ic" :name="ic" />{{ S.lang === 'zh' ? zh : en }}</button>
    </div>
    <div class="dock" :class="{ instant: dockInstant }" :data-open="S.dock">
      <div class="dk-rail">
        <button class="dkb" :class="{ on: S.dock === 'recent' }" :title="t('recentT')" @click.stop="setDock(S.dock === 'recent' ? 'none' : 'recent')"><UiIcon name="lucide:history" /><i v-if="recent.length" class="cdot" /></button>
        <button class="dkb today" :class="{ on: S.dock === 'today' }" :title="t('todayIcon')" @click.stop="setDock(S.dock === 'today' ? 'none' : 'today')"><span class="tdi"><UiIcon :name="today" /></span><i class="cdot" /></button>
      </div>
      <div class="dk-card c-today" :class="{ open: S.dock === 'today' }">
        <button class="dkx" :title="t('close')" @click.stop="setDock('none')"><UiIcon name="lucide:x" /></button>
        <div ref="tbig" class="tbig"><UiIcon :name="today" /></div>
        <div class="meta">
          <span class="k">{{ t('todayIcon') }}</span><span class="nm">{{ today.split(':')[1] }}</span>
          <div class="bts">
            <button class="btn pri" @click="copy(today)"><UiIcon name="lucide:copy" />{{ t('copyF', { f: fmtLabel() }) }}</button>
            <button class="btn ghost" :style="{ color: todayFav ? 'var(--red)' : '' }" :title="t('save')" @click="saveToday"><UiIcon :name="todayFav ? 'ph:heart-fill' : 'lucide:heart'" /></button>
          </div>
        </div>
      </div>
      <div class="dk-card c-recent" :class="{ open: S.dock === 'recent' }">
        <button class="dkx" :title="t('close')" @click.stop="setDock('none')"><UiIcon name="lucide:x" /></button>
        <div class="ph"><b>{{ t('recentT') }}</b><span class="sp" /><a href="#" @click.prevent="setMode('fav', () => { R.favTab = 'recent' })">{{ t('allHist') }}</a></div>
        <div v-if="recent.length" class="rrow">
          <button v-for="id in recent" :key="id" class="rt" :title="`${id} · ${t('copy')}`" @click="copy(id)"><UiIcon :name="id" /></button>
        </div>
        <div v-else class="rnone">{{ t('recentNone') }}</div>
      </div>
    </div>
    <button ref="mini" class="minig" :title="`${t('swipe')} · ${t('vGacha')}`" @click="toGacha" v-html="miniSVG" />

    <div class="res">
      <div class="rhead">
        <span v-if="st.k === 'set'" class="rtt">
          <b>{{ info?.name || R.set }}</b> · {{ N(st.total) }} · {{ info?.license?.title }}
          <button class="lk" :style="{ color: S.sets.includes(R.set!) ? 'var(--red)' : '' }" :title="t('pin')" @click="likeSet"><UiIcon :name="S.sets.includes(R.set!) ? 'lucide:pin' : 'lucide:pin'" /></button>
          <a v-if="info?.author?.url" href="#" class="lk" @click.prevent="openUrl(info.author.url!)">{{ info.author.name }} ↗</a>
        </span>
        <span v-else-if="st.k === 'results'" class="rtt"><b>“{{ R.q.trim() }}”</b> · {{ t('resN', { n: N(st.n) }) }}<template v-if="!R.set"> · {{ t('resSets', { n: st.sets }) }}</template><template v-if="st.zh"> · {{ st.zh }}</template></span>
        <span v-else class="rtt" />
        <span class="sp" />
        <div class="qseg" :title="t('stTip')">
          <button v-for="[k, l] in STYLES" :key="k" :class="{ on: S.style === k }" @click="setStyle(k)">{{ t(l) }}</button>
        </div>
        <span class="vsep" />
        <button class="qbtn" :class="{ on: R.pop === 'color' }" :title="t('iconColor')" @click.stop="openPop('color', $event)"><span class="dot" :style="{ background: S.color || CHECKER }" />{{ t('color') }}</button>
        <button class="qbtn" :class="{ on: R.pop === 'size' }" :title="t('size')" @click.stop="openPop('size', $event)"><UiIcon name="lucide:maximize-2" /><b>{{ S.size }}</b></button>
      </div>
      <div ref="body" class="grid-wrap" :style="{ '--isz': dispSize }" @scroll="scrolled = ($event.target as HTMLElement).scrollTop > 4">
        <div v-if="st.k === 'none'" class="rempty">{{ t('none') }}</div>
        <div v-else-if="st.k === 'zhNone'" class="rempty">{{ t('zhNone', { a: st.w }) }}</div>
        <div v-else-if="!R.list.length && raw.length" class="rempty">{{ t('styleNone', { s: styleName }) }}</div>
        <template v-for="[p, ids] in groups" v-else :key="p">
          <div v-if="!R.set" class="gh"><b>{{ shortName(p) }}</b>{{ ids.length }}</div>
          <div class="igrid">
            <IconTile v-for="id in ids" :id="id" :key="id" heart :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" />
          </div>
        </template>
        <div ref="sentinel" style="height:1px" />
      </div>
      <div class="khint">
        <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>{{ t('kSel') }}</span><span><kbd>↵</kbd>{{ t('kCopy', { f: fmtLabel() }) }}</span><span><kbd>⇥</kbd>{{ t('kTab') }}</span><span><kbd>F</kbd>{{ t('save') }}</span><span><kbd>Esc</kbd>{{ t('clear') }}</span>
        <span class="sp" /><span class="kr"><kbd>{{ modKey.trim() }}</kbd><kbd>K</kbd>{{ t('kAny') }}</span>
      </div>
    </div>
    <DetailBar />

    <Pop id="scope" :w="304"><ScopePop /></Pop>
  </div>
</template>
