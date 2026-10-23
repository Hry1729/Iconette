// 划一划 decks, shared by the swipe cards and the gacha machine.
// Icon sets (unseen, unsaved, five daily picks first), components, component libraries, and
// "my chest" (review what you saved: keep it, or take it out).
import { reactive } from 'vue'
import { INFO, collection, load } from './iconify'
import { S } from './store'
import { DEMOS, UIK, UIL } from './ui-libs'
import { OKLIC, type SwipeAct, TOP, hash, rng } from './swipe'

export type Kind = 'set' | 'lib' | 'comp'
export interface Item { id: string, k: Kind, v: string }

interface Hist { id: string, a: SwipeAct, deck: string }
// Undo history and per-session state survive switching modes.
const W = window as any
const hist: Hist[] = W.__swHist ||= []
const later: Set<string> = W.__swLater ||= new Set()
const chestSeen: Set<string> = W.__swChestSeen ||= new Set()

export const D = reactive({ list: [] as string[], total: 0, today: [] as string[], ver: 0 })

/** Decode a deck id into its kind. Chest ids are prefixed ("set:lucide", "ui:shadcn/button"). */
export function item(id: string, deck = S.deck): Item {
  if (deck === 'chest') {
    const [k, ...r] = id.split(':')
    const v = r.join(':')
    return k === 'set' ? { id, k: 'set', v } : { id, k: v.includes('/') ? 'comp' : 'lib', v }
  }
  if (deck === 'icons') return { id, k: 'set', v: id }
  return { id, k: id.includes('/') ? 'comp' : 'lib', v: id }
}

function iconDeckAll() {
  const f = S.swf
  return Object.entries(INFO).filter(([, s]) => !s.hidden && s.category !== 'Archive / Unmaintained'
    && (f.color === 'any' || (f.color === 'multi') === !!s.palette) && (!f.cat || s.category === f.cat) && (!f.lic || OKLIC.test(s.license?.spdx || ''))).map(([p]) => p)
}

export function buildDeck() {
  let d: string[] = []
  if (S.deck === 'icons') {
    const all = iconDeckAll()
    d = all.filter(p => !S.seen.includes(p) && !S.sets.includes(p)).sort((a, b) => hash(`${a}x`) - hash(`${b}x`))
    // 今日推荐: five popular sets that rotate daily, always first in the deck.
    const day = Math.floor(Date.now() / 864e5)
    const pool = TOP.filter(p => d.includes(p))
    const td: string[] = []
    for (let i = 0; i < pool.length && td.length < 5; i++) td.push(pool[(day * 5 + i) % pool.length])
    D.today = [...new Set(td)]
    d = [...D.today, ...d.filter(p => !D.today.includes(p))]
    D.total = all.length
  }
  else if (S.deck === 'chest') {
    const all = [...S.sets.map(p => `set:${p}`), ...S.uiFav.filter(x => UIL.some(l => l.id === x.split('/')[0])).map(x => `ui:${x}`)]
    d = all.filter(x => !chestSeen.has(x))
    D.total = all.length
    D.today = []
  }
  else {
    const all: string[] = S.deck === 'lib' ? DEMOS.map(l => l.id) : DEMOS.flatMap(l => UIK.map(([k]) => `${l.id}/${k}`))
    d = all.filter(id => !S.uiSeen.includes(id)).sort((a, b) => S.deck === 'lib' ? 0 : hash(`${a}u`) - hash(`${b}u`))
    D.total = all.length
    D.today = []
  }
  // "放回" in the gacha sends an item to the back of the deck for this session.
  D.list = [...d.filter(x => !later.has(x)), ...d.filter(x => later.has(x))]
  D.ver++
  for (const id of D.list.slice(0, 3)) { const it = item(id); if (it.k === 'set') pickIcons(it.v) }
}

/** Apply a decision. Returns true when the item was saved to the chest. */
export function decide(id: string, a: SwipeAct): boolean {
  const deck = S.deck
  const it = item(id)
  hist.push({ id, a, deck })
  later.delete(id)
  let saved = false
  if (deck === 'chest') {
    chestSeen.add(id)
    if (a === 'nope') {
      if (it.k === 'set') S.sets = S.sets.filter(x => x !== it.v)
      else S.uiFav = S.uiFav.filter(x => x !== it.v)
    }
  }
  else if (it.k === 'set') {
    if (a === 'like' && !S.sets.includes(id)) { S.sets.push(id); saved = true }
    if (!S.seen.includes(id)) S.seen.push(id)
  }
  else {
    if (a === 'like' && !S.uiFav.includes(id)) { S.uiFav.push(id); saved = true }
    if (!S.uiSeen.includes(id)) S.uiSeen.push(id)
  }
  return saved
}

/** Gacha "put back": the item goes to the end of the deck. */
export function putBack(id: string) { later.add(id); buildDeck() }

export function undo() {
  const i = hist.map(h => h.deck).lastIndexOf(S.deck)
  if (i < 0) return
  const [h] = hist.splice(i, 1)
  const it = item(h.id, h.deck as any)
  if (h.deck === 'chest') {
    chestSeen.delete(h.id)
    if (h.a === 'nope') { if (it.k === 'set') { if (!S.sets.includes(it.v)) S.sets.push(it.v) } else if (!S.uiFav.includes(it.v)) S.uiFav.push(it.v) }
  }
  else if (it.k === 'set') {
    S.seen = S.seen.filter(x => x !== h.id)
    if (h.a === 'like') S.sets = S.sets.filter(x => x !== h.id)
  }
  else {
    S.uiSeen = S.uiSeen.filter(x => x !== h.id)
    if (h.a === 'like') S.uiFav = S.uiFav.filter(x => x !== h.id)
  }
  buildDeck()
}
export const canUndo = () => { void D.ver; return hist.some(h => h.deck === S.deck) }
/** Decisions made in this deck during this session, oldest first (for the dot progress). */
export const histOf = () => { void D.ver; return hist.filter(h => h.deck === S.deck) }

export function restart() {
  if (S.deck === 'icons') S.seen = []
  else if (S.deck === 'chest') chestSeen.clear()
  else S.uiSeen = S.uiSeen.filter(x => (S.deck === 'lib' ? x.includes('/') : !x.includes('/')))
  later.clear()
  buildDeck()
}

// ---- icons shown on a set card (shuffled per card; R / shuffle re-rolls)
const seed: Record<string, number> = {}
export const icons = reactive<Record<string, string[]>>({})
export const fading = reactive<Record<string, boolean>>({})
export async function pickIcons(p: string, reroll = false, n = 15) {
  if (icons[p] && !reroll) return icons[p]
  const names = await collection(p)
  const r = rng(hash(p) + (seed[p] || 0) * 7919)
  const a = names.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  const ids = a.slice(0, n).map(x => `${p}:${x}`)
  await load(ids)
  if (reroll) { fading[p] = true; setTimeout(() => { icons[p] = ids; fading[p] = false }, 120) }
  else icons[p] = ids
  return ids
}
export function shuffleIcons(p: string) { seed[p] = (seed[p] || 0) + 1; return pickIcons(p, true) }

/** Gacha stats for today. */
export function gachaToday() {
  const day = Math.floor(Date.now() / 864e5)
  if (S.gacha.day !== day) S.gacha = { day, n: 0, kept: S.gacha.kept }
  return S.gacha
}
