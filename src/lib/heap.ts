import { CHEST, INK } from './iso'
import { S } from './store'

// 收纳盒里的胶囊堆 = a tiny deterministic "physics" heap (v0.4.3, sunk into the box in v0.4.4).
// Every capsule is a token (key + colour) in a stack (placement order, bottom → top). Positions are simulated, never
// hand-placed: each capsule is dropped in turn at its preferred spot (a hash of its key, biased to the back-centre of
// the cavity, where it can be seen), rests on the cavity floor or on capsules placed before it, then rolls downhill
// while the drop is steep enough to beat friction. So nothing floats or overlaps, and the same stack always gives
// the same heap. Pulling a capsule out of the middle and re-simulating lets the ones above fall into the gap;
// putting one back = pushing it on top (it lands on the heap).
// v0.4.4: the floor sits deep in the box (0.6 × the wall height below the rim) with a mound in the back-centre
// (the rest of the box's contents), and nothing is pushed up along the front / right walls any more: the bulk of the heap is below the
// rim, the front wall + rim (painted over the pile, see CHEST.bodyFront) hide what is behind them, and only the top
// of the mound peeks out. Works for any chest box (CHEST.BIG in 收藏, CHEST.SMALL beside the gashapon).

export interface Tok { k: string, c: string }
export interface Cap { k: string, c: string, x: number, y: number, z: number, r: number, th: number, m: number }
type Box = typeof CHEST.BIG

const { P, f, hsh } = INK
const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Stable 0…1 numbers from a key. */
function kh(k: string, salt: number) { let h = 2166136261 ^ salt; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return ((h >>> 0) % 100003) / 100003 }

/** Cavity geometry of a chest box. */
function geo(C: Box) {
  const K = C.w / 104
  const T = Math.max(1.2, C.w * 0.05)
  const ZT = C.z + C.h
  const X0 = C.x + T
  const X1 = C.x + C.w - T
  const Y0 = C.y + T
  const Y1 = C.y + C.d - T
  return { C, K, T, ZT, RC: 5.2 * K, ZF: ZT - C.h * 0.6, X0, X1, Y0, Y1, CX: C.x + C.w * 0.48, CY: C.y + C.d * 0.46 }
}
type Geo = ReturnType<typeof geo>
const GEOS = new Map<Box, Geo>()
const G = (C: Box) => { let g = GEOS.get(C); if (!g) GEOS.set(C, g = geo(C)); return g }

/** Floor the capsules rest on: deep in the box, with a low mound in the back-centre (where it can be seen). */
function bed(g: Geo, px: number, py: number) {
  const u = (px - g.CX) / ((g.X1 - g.X0) / 2)
  const v = (py - g.CY) / ((g.Y1 - g.Y0) / 2)
  return g.ZF + g.C.h * 0.3 * Math.max(0, 1 - u * u * 0.6) * Math.max(0, 1 - v * v * 0.75)
}
function restZ(g: Geo, px: number, py: number, r: number, below: Cap[]) {
  let z = bed(g, px, py) + r * 0.85
  for (const c of below) {
    const dx = c.x - px
    const dy = c.y - py
    const mn = (c.r + r) * 0.92
    const dd = dx * dx + dy * dy
    if (dd < mn * mn) z = Math.max(z, c.z + Math.sqrt(mn * mn - dd))
  }
  return z
}
const DIRS = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)])

/** Settle a stack (bottom → top) in chest `C`. Deterministic; memoised on the stack's keys. */
const memo = new Map<string, Cap[]>()
export function settle(stack: Tok[], C: Box = CHEST.BIG): Cap[] {
  const key = `${C.w}|${stack.map(t => t.k + t.c).join(',')}`
  const hit = memo.get(key)
  if (hit) return hit
  const g = G(C)
  const out: Cap[] = []
  stack.forEach((t, i) => {
    const r = g.RC * (0.92 + kh(t.k, 1) * 0.16)
    const lo = (a: number, b: number) => [a + r * 0.9, b - r * 0.9]
    const [xa, xb] = lo(g.X0, g.X1)
    const [ya, yb] = lo(g.Y0, g.Y1)
    // preferred drop spot: back-centre, a little wider for the first few (they spread over the floor)
    const sp = 1.05 - 0.3 * cl(i / 18)
    let x = Math.min(xb, Math.max(xa, g.CX + (kh(t.k, 2) - 0.5) * (g.X1 - g.X0) * sp))
    let y = Math.min(yb, Math.max(ya, g.CY + (kh(t.k, 3) - 0.5) * (g.Y1 - g.Y0) * sp))
    let z = restZ(g, x, y, r, out)
    // roll downhill while the slope beats friction
    for (let it = 0; it < 24; it++) {
      let best: [number, number, number] | null = null
      for (const [dx, dy] of DIRS) {
        const nx = Math.min(xb, Math.max(xa, x + dx * r * 0.4))
        const ny = Math.min(yb, Math.max(ya, y + dy * r * 0.4))
        const nz = restZ(g, nx, ny, r, out)
        if (nz < z - r * 0.09 && (!best || nz < best[2])) best = [nx, ny, nz]
      }
      if (!best) break
      ;[x, y, z] = best
    }
    out.push({ k: t.k, c: t.c, x, y, z, r, th: Math.floor(kh(t.k, 4) * 360) - 180, m: 0.22 + kh(t.k, 5) * 0.5 })
  })
  if (memo.size > 400) memo.clear()
  memo.set(key, out)
  return out
}
/** Screen (svg user) point of a capsule. */
export const capXY = (c: Cap) => P(c.x, c.y, c.z)
/** Depth order for painting (far → near). */
export const depth = (c: Cap) => c.x + c.y + c.z
/** Inner svg of one capsule (centred at 0,0). */
export function capInner(c: Cap, C: Box = CHEST.BIG) {
  // a soft contact shadow under each capsule (on the floor or the capsules below), so the heap sits in the box
  const sh = `<ellipse class="nst" cx="0" cy="${f(c.r * 0.55)}" rx="${f(c.r * 1.25)}" ry="${f(c.r * 0.62)}" fill="#000" opacity=".26"/>`
  return sh + INK.capsule(c.r * 1.2247, c.c, { th: c.th, m: c.m, lw: Math.max(0.16, 0.62 * C.w / 104) })
}
/** Fallback exit/landing point: top of the bed in the middle of the cavity. */
export function bedTop(C: Box = CHEST.BIG) { const g = G(C); return P(g.CX, g.CY, bed(g, g.CX, g.CY) + g.RC) }
/** Whole heap as svg markup (static), e.g. the small chest beside the gashapon. */
export function heapSVG(stack: Tok[], C: Box = CHEST.BIG) {
  return settle(stack, C).slice().sort((a, b) => depth(a) - depth(b))
    .map(c => { const q = capXY(c); return `<g transform="translate(${f(q[0])},${f(q[1])})">${capInner(c, C)}</g>` }).join('')
}

// ---- v0.4.4 count rule: the box is a decorative, mostly-full box. Its resting heap = min(all favourites, MAXPILE)
// capsules (icons + sets + UI, whatever tab / page is shown); 0 favourites = empty. Page turns and tab switches only
// borrow capsules for the flight and give them back.
export const PILE_MAX = CHEST.MAXPILE
export const pileN = (total: number) => Math.max(0, Math.min(PILE_MAX, Math.floor(total || 0)))
/** Colour of a favourite id (stable). */
export const colOf = (id: string) => INK.CAPCOL[Math.floor(kh(id, 9) * INK.CAPCOL.length)]
/** Every favourite (icons, icon sets, UI libraries / components), tab-independent. */
export const favIds = () => [...S.favs.map(x => `i:${x}`), ...S.sets.map(x => `s:${x}`), ...S.uiFav.map(x => `u:${x}`)]
/** The resting heap's tokens: one per favourite (most recent last = on top), capped at MAXPILE. */
export function restTokens(ids: string[]): Tok[] {
  return ids.slice(-PILE_MAX).map(id => ({ k: `f:${id}`, c: colOf(id) }))
}
export { f as fmt, hsh }
