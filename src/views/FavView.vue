<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import IconTile from '../components/IconTile.vue'
import SetCard from '../components/SetCard.vue'
import UICard from '../components/UICard.vue'
import DemoFrame from '../components/DemoFrame.vue'
import Heart from '../components/Heart.vue'
import UiIcon from '../components/UiIcon.vue'
import DetailBar from '../components/DetailBar.vue'
import { type FavTab, R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { ensureAll, setName } from '../lib/iconify'
import { zh2en } from '../lib/zh'
import { UI, ukl } from '../lib/ui-libs'
import { clearSel, likeUI, openLib, pick } from '../lib/actions'
import { focusApi } from '../lib/swipe'
import { modKey } from '../lib/native'
import { openPop, reduced } from '../lib/fx'
import { ISO, easeOutBack, sleep, tween } from '../lib/iso'

defineEmits<{ (e: 'copy', id: string): void }>()
ensureAll()

const q = computed(() => R.q.trim().toLowerCase())
const TABS: [FavTab, string][] = [['icons', 'tIcons'], ['sets', 'tSets'], ['ui', 'tUI'], ['recent', 'tRecent']]
const count = (k: FavTab) => ({ icons: S.favs.length, sets: S.sets.length, ui: S.uiFav.length, recent: S.recent.length })[k]
function tab(k: FavTab) { R.favTab = k; R.folder = null; clearSel() }
const folders = computed(() => Object.keys(S.folders))
const total = computed(() => S.favs.length + S.sets.length + S.uiFav.length)

// icons (optionally one group), recent
const src = computed(() => (R.folder ? S.folders[R.folder] || [] : S.favs))
const icons = computed(() => {
  if (R.favTab === 'recent') return S.recent.filter(x => !q.value || x.includes(q.value))
  const qe = zh2en(q.value) || q.value
  return src.value.filter(x => !q.value || x.includes(qe))
})
watchEffect(() => { R.list = R.favTab === 'icons' || R.favTab === 'recent' ? icons.value : [] })

const sets = computed(() => S.sets.filter(p => !q.value || (p + setName(p)).toLowerCase().includes(q.value)))
const uiLibs = computed(() => S.uiFav.filter(x => !x.includes('/')).map(UI).filter(Boolean).filter(l => !q.value || l.name.toLowerCase().includes(q.value)))
const uiComps = computed(() => S.uiFav.filter(x => x.includes('/')))

// new group: inline input
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

// ---- the big chest: lid opens with a glow and the saved items rise out of it into the grid
const C = { x: 0, y: 0, z: 0, w: 104, d: 56, h: 46, lh: 14 }
const sfx = `fz${Math.random().toString(36).slice(2, 6)}`
const chestHost = ref<HTMLElement>()
const grid = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const open = ref(false)
let busy = false
let lid: SVGGElement
let glow: SVGEllipseElement

function chestSVG() {
  ISO.setSfx(sfx)
  const m = ISO.P(C.w / 2, C.d / 2, C.h)
  return `<svg class="isosvg iso" viewBox="-66 -126 172 214" preserveAspectRatio="xMidYMid meet">${ISO.defs()}
    <defs><radialGradient id="${sfx}gl"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    ${ISO.halo(C.w / 2, C.d / 2, 0, 62)}${ISO.chestBody(C, `${sfx}c`)}<ellipse class="glow" cx="${m[0].toFixed(1)}" cy="${(m[1] - 4).toFixed(1)}" rx="60" ry="30" fill="url(#${sfx}gl)" opacity="0"/>${ISO.chestFront(C)}<g class="lidb">${ISO.lidSVG(C, 0)}</g></svg>`
}

/** Items visible in the grid fly out of the chest mouth to their place. */
async function rise() {
  const g = grid.value
  if (!g) return
  const cells = [...g.querySelectorAll<HTMLElement>('.t, .sc, .cf')]
  if (reduced()) { cells.forEach(c => c.classList.add('in')); return }
  const mouth = glow.getBoundingClientRect()
  const mx = mouth.left + mouth.width / 2
  const my = mouth.top + mouth.height / 2
  const H = innerHeight
  cells.forEach(c => c.classList.remove('in'))
  const vis = cells.filter(c => c.getBoundingClientRect().top < H).slice(0, 44)
  cells.filter(c => !vis.includes(c)).forEach(c => c.classList.add('in'))
  await Promise.all(vis.map((c, i) => new Promise<void>(res => setTimeout(() => {
    const r = c.getBoundingClientRect()
    const tile = c.classList.contains('t')
    const d = document.createElement('div')
    d.className = 'fly fbox'
    d.style.cssText = `width:${r.width}px;height:${r.height}px;font-size:${tile ? 22 : 13}px`
    d.innerHTML = tile ? c.innerHTML : `<b>${(c.querySelector('b')?.textContent || '')}</b>`
    document.querySelector('.win')!.appendChild(d)
    const x0 = mx - r.width / 2
    const y0 = my - r.height / 2
    const cx = (x0 + r.left) / 2
    const cy = Math.min(y0, r.top) - 60 - Math.random() * 30
    const kf: Keyframe[] = []
    for (let k = 0; k <= 14; k++) {
      const tt = k / 14
      const u = 1 - tt
      kf.push({ transform: `translate(${u * u * x0 + 2 * u * tt * cx + tt * tt * r.left}px,${u * u * y0 + 2 * u * tt * cy + tt * tt * r.top}px) scale(${0.25 + 0.75 * Math.min(1, tt * 1.4)})`, opacity: Math.min(1, tt * 4) })
    }
    d.animate(kf, { duration: 620, easing: 'cubic-bezier(.3,0,.2,1)' }).finished.then(() => { c.classList.add('in'); d.remove(); res() })
  }, i * 38))))
}
async function openUp() {
  if (busy) return
  busy = true
  open.value = true
  if (!reduced()) await tween(650, (e) => { lid.innerHTML = ISO.lidSVG(C, e * 104); glow.setAttribute('opacity', (e * 0.9).toFixed(2)) }, easeOutBack)
  else { lid.innerHTML = ISO.lidSVG(C, 104) }
  await rise()
  glow.setAttribute('opacity', '.35')
  busy = false
}
async function close() {
  if (busy) return
  busy = true
  open.value = false
  const cells = [...(grid.value?.querySelectorAll('.t, .sc, .cf') || [])]
  cells.forEach((c, i) => setTimeout(() => c.classList.remove('in'), Math.min(i, 40) * 12))
  await sleep(250)
  await tween(420, (e) => { lid.innerHTML = ISO.lidSVG(C, Math.max(0, 104 * (1 - e))); glow.setAttribute('opacity', ((1 - e) * 0.35).toFixed(2)) }, (x: number) => x * x)
  await tween(300, (_e, tt) => { lid.innerHTML = ISO.lidSVG(C, Math.sin(tt * Math.PI) * 7 * (1 - tt)) })
  lid.innerHTML = ISO.lidSVG(C, 0)
  busy = false
}
const toggle = () => (open.value ? close() : openUp())
// Switching tabs / groups while open: new items rise again.
watch(() => [R.favTab, R.folder], async () => { if (!open.value || busy) return; await nextTick(); busy = true; await rise(); busy = false })
// Items added while open (e.g. saved from the detail bar) just appear.
watch(() => [S.favs.length, S.sets.length, S.uiFav.length, S.recent.length, q.value], async () => { await nextTick(); if (open.value && !busy) grid.value?.querySelectorAll('.t, .sc, .cf').forEach(c => c.classList.add('in')) })

onMounted(() => {
  chestHost.value!.innerHTML = chestSVG()
  lid = chestHost.value!.querySelector('.lidb') as SVGGElement
  glow = chestHost.value!.querySelector('.glow') as SVGEllipseElement
  focusApi.focus = () => input.value?.focus()
  setTimeout(openUp, 260)
})
onBeforeUnmount(() => { focusApi.focus = () => {} })
</script>

<template>
  <div class="body fav-v" :class="{ shut: !open }">
    <div class="vs">
      <div class="fhead">
        <div ref="chestHost" class="fchest" @click="toggle" />
        <div class="finfo">
          <span class="k">FIG.06 · {{ t('cFig') }}</span>
          <h3>{{ t('chestT') }}</h3>
          <p v-html="t('chestSum', { n: total, a: S.favs.length, b: S.sets.length, c: S.uiFav.length })" />
          <div class="ftabs">
            <button v-for="[k, l] in TABS" :key="k" :class="{ on: R.favTab === k }" @click="tab(k)">{{ t(l) }}<small>{{ count(k) }}</small></button>
          </div>
          <div class="frow">
            <button class="btn pri tg" @click="toggle"><UiIcon name="lucide:package-open" /><span>{{ open ? t('closeChest') : t('openChest') }}</span></button>
            <label class="isearch sm"><UiIcon name="lucide:search" /><input ref="input" v-model="R.q" :placeholder="t('phFav')" spellcheck="false"><kbd>{{ modKey.trim() }}K</kbd></label>
          </div>
        </div>
      </div>

      <div ref="grid" class="fbody">
        <!-- saved icon sets -->
        <template v-if="R.favTab === 'sets'">
          <div v-if="!S.sets.length" class="rempty"><div><h2>{{ t('noSets') }}</h2><div>{{ t('noSetsSub') }}</div></div></div>
          <div v-else class="sgrid"><SetCard v-for="p in sets" :key="p" :p="p" /></div>
        </template>

        <!-- saved component libraries & components -->
        <template v-else-if="R.favTab === 'ui'">
          <div v-if="!S.uiFav.length" class="rempty"><div><h2>{{ t('noUI') }}</h2><div>{{ t('noUISub') }}</div></div></div>
          <template v-else>
            <template v-if="uiLibs.length">
              <div class="secth"><b>{{ t('tUI') }}</b><span>{{ uiLibs.length }}</span></div>
              <div class="sgrid"><UICard v-for="l in uiLibs" :key="l.id" :l="l" /></div>
            </template>
            <template v-if="uiComps.length">
              <div class="secth"><b>{{ t('dComp') }}</b><span>{{ uiComps.length }}</span></div>
              <div class="cfs">
                <div v-for="id in uiComps" :key="id" class="cf">
                  <div class="cfh" @click="openLib(id.split('/')[0])">
                    <b>{{ ukl(id.split('/')[1]) }}</b><small>{{ UI(id.split('/')[0]).name }}</small><span class="sp" />
                    <button class="ib on" @click.stop="likeUI(id)"><Heart on /></button>
                  </div>
                  <div class="cfb"><DemoFrame :lib="id.split('/')[0]" :keys="[id.split('/')[1]]" cls="one" /></div>
                </div>
              </div>
            </template>
          </template>
        </template>

        <!-- icons: saved (by group) or recently copied -->
        <template v-else>
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
              <b>{{ t('tRecent') }}</b><span>{{ S.recent.length }}</span><span class="sp" />
              <button v-if="S.recent.length" class="lk" @click="S.recent = []; clearSel()">{{ t('clear') }}</button>
            </template>
            <span class="vsep" />
            <button class="qbtn" :title="t('iconColor')" @click.stop="openPop('color', $event)"><span class="dot" :style="{ background: S.color || CHECKER }" />{{ t('color') }}</button>
            <button class="qbtn" :title="t('size')" @click.stop="openPop('size', $event)"><UiIcon name="lucide:maximize-2" /><b>{{ S.size }}</b></button>
          </div>
          <div v-if="R.favTab === 'recent' && !S.recent.length" class="rempty"><div><h2>{{ t('noRecent') }}</h2></div></div>
          <div v-else-if="R.favTab === 'icons' && !src.length" class="rempty"><div><h2>{{ R.folder || t('noFavIcons') }}</h2><div>{{ t('noFavIconsSub') }}</div><button v-if="R.folder" class="btn sec" @click="delFolder(R.folder!)">{{ t('delFolder') }}</button></div></div>
          <div v-else class="fgrid"><IconTile v-for="id in icons" :id="id" :key="id" :heart="R.favTab === 'recent'" :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" /></div>
        </template>
      </div>
    </div>
    <DetailBar />
  </div>
</template>
