<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import IconTile from '../components/IconTile.vue'
import UiIcon from '../components/UiIcon.vue'
import { R, S, toggleSet } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, collection, search, shortName } from '../lib/iconify'
import { zh2en } from '../lib/zh'
import { openUrl } from '../lib/native'
import { pick, setMode, toast } from '../lib/actions'

type State =
  | { k: 'hello' }
  | { k: 'set', total: number }
  | { k: 'results', n: number, sets: number, zh?: string }
  | { k: 'none' }
  | { k: 'zhNone', w: string }
  | { k: 'loading' }

const st = ref<State>({ k: 'hello' })
const shown = ref(240)
const body = ref<HTMLElement>()
const sentinel = ref<HTMLElement>()
const glyphs = ['lucide:feather', 'ph:leaf', 'tabler:wand', 'mingcute:sparkles-line', 'ri:quill-pen-line']
const visible = computed(() => R.list.slice(0, shown.value))
const info = computed(() => (R.set ? INFO[R.set] : undefined))
const N = (n?: number) => Number(n || 0).toLocaleString()

let tok = 0
let deb: ReturnType<typeof setTimeout> | undefined
async function run() {
  const my = ++tok
  const q = R.q.trim()
  shown.value = 240
  if (!q && !R.set) { st.value = { k: 'hello' }; R.list = S.recent.slice(0, 10); return }
  if (R.set && !q) {
    st.value = { k: 'set', total: 0 }
    const all = await collection(R.set)
    if (my !== tok) return
    R.list = all.map(n => `${R.set}:${n}`)
    st.value = { k: 'set', total: R.list.length }
    return
  }
  let pre = R.set || ''
  let qq = q
  const m = q.match(/^([a-z0-9-]+):(.*)$/)
  if (m) { pre = m[1]; qq = m[2] || 'a' }
  const tr = zh2en(qq)
  if (tr === '') { R.list = []; st.value = { k: 'zhNone', w: qq }; return }
  const zh = tr ? t('zhMap', { a: qq, b: tr }) : undefined
  if (tr) qq = tr
  const ic = await search(qq, { prefix: pre || undefined })
  if (my !== tok) return
  if (!ic.length) { R.list = []; st.value = { k: 'none' }; return }
  const rank = (id: string) => { const i = S.sets.indexOf(id.split(':')[0]); return i < 0 ? 99 : i }
  R.list = pre ? ic : ic.map((id, i) => [id, i] as const).sort((x, y) => (rank(x[0]) - rank(y[0])) || x[1] - y[1]).map(x => x[0])
  st.value = { k: 'results', n: ic.length, sets: new Set(ic.map(x => x.split(':')[0])).size, zh }
}
watch(() => R.set, () => { R.sel = null; R.q = ''; run(); body.value?.scrollTo(0, 0) })
watch(() => R.q, () => { clearTimeout(deb); deb = setTimeout(() => { R.sel = null; run() }, 200) })
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
function sugg(s: string) { R.q = s; nextTick() }
defineEmits<{ (e: 'copy', id: string): void }>()
</script>

<template>
  <nav class="rail">
    <button class="st" :class="{ on: !R.set }" @click="R.set = null">{{ t('all') }}</button>
    <span class="div" />
    <button v-for="p in S.sets" :key="p" class="st" :class="{ on: R.set === p }" @click="R.set = p">
      <UiIcon v-if="INFO[p]?.samples?.[0]" :name="`${p}:${INFO[p].samples![0]}`" />{{ shortName(p) }}
    </button>
    <button class="st add" :title="t('mSets')" @click="setMode('sets'); R.res = 'icons'; R.lib = null"><UiIcon name="lucide:plus" /></button>
  </nav>
  <div ref="body" class="body">
    <div v-if="st.k === 'hello'" class="empty">
      <div>
        <div class="glyphs"><UiIcon v-for="g in glyphs" :key="g" :name="g" /></div>
        <h2>{{ t('hello') }}</h2>
        <div>{{ t('helloSub') }}</div>
        <div class="sugg"><button v-for="s in ['arrow', 'home', 'user', 'github', 'check', '箭头']" :key="s" @click="sugg(s)">{{ s }}</button></div>
        <div v-if="R.list.length" class="strip">
          <IconTile v-for="id in R.list" :id="id" :key="id" :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" />
        </div>
      </div>
    </div>
    <div v-else-if="st.k === 'none'" class="empty"><div>{{ t('none') }}</div></div>
    <div v-else-if="st.k === 'zhNone'" class="empty"><div>{{ t('zhNone', { a: st.w }) }}</div></div>
    <template v-else>
      <div v-if="st.k === 'set'" class="meta">
        <b>{{ info?.name || R.set }}</b><span>{{ N(info?.total) }}</span><span>·</span><span>{{ info?.license?.title }}</span>
        <button class="ib" :title="t('like')" :style="{ color: S.sets.includes(R.set!) ? '#e5484d' : '' }" @click="likeSet">
          <UiIcon :name="S.sets.includes(R.set!) ? 'ph:heart-fill' : 'lucide:heart'" />
        </button>
        <span class="sp" />
        <a v-if="info?.author?.url" href="#" @click.prevent="openUrl(info.author.url!)">{{ info.author.name }} ↗</a>
      </div>
      <template v-if="st.k === 'results'">
        <div class="meta"><b>{{ t('results', { n: st.n }) }}</b><template v-if="!R.set"><span>·</span><span>{{ t('sets', { n: st.sets }) }}</span></template></div>
        <div v-if="st.zh" class="zh">{{ st.zh }}</div>
      </template>
      <div class="grid">
        <IconTile v-for="id in visible" :id="id" :key="id" :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" />
      </div>
      <div ref="sentinel" style="height:1px" />
    </template>
  </div>
</template>
