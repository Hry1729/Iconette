import { CHEST, INK } from './iso'

// v0.4.3 · 收纳盒里的胶囊堆 = a tiny deterministic "physics" heap.
// Every capsule is a token (key + colour) in a stack (placement order, bottom → top). Positions are simulated, never
// hand-placed: each capsule is dropped in turn at its preferred spot (a hash of its key, biased to the back-centre of
// the cavity, where it can be seen), rests on the cavity bed or on capsules placed before it, then rolls downhill
// while the drop is steep enough to beat friction. So nothing floats or overlaps, and the same stack always gives
// the same heap. Pulling a capsule out of the middle and re-simulating lets the ones above fall into the gap;
// putting one back = pushing it on top (it lands on the heap). Only capsules near the top are simulated/drawn
// (`deep` ones below are represented by a raised bed), see FavView.

export interface Tok { k: string, c: string }
export interface Cap { k: string, c: string, x: number, y: number, z: number, r: number, th: number, m: number }

const C = CHEST.BIG
const { P, f, hsh } = INK
const K = C.w / 104
const T = Math.max(1.2, C.w * 0.05)
const ZT = C.z + C.h
const RC = 5.2 * K
const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Stable 0…1 numbers from a key. */
function kh(k: string, salt: number) { let h = 2166136261 ^ salt; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return ((h >>> 0) % 100003) / 100003 }

const X0 = C.x + T
const X1 = C.x + C.w - T
const Y0 = C.y + T
const Y1 = C.y + C.d - T
const CX = C.x + C.w * 0.44
const CY = C.y + C.d * 0.36

/** Cavity bed: the visible floor sits at half depth; a big collection (`lift` 0…1 = how much lies deeper) raises it
 *  in a soft dome so the drawn heap stays in view. */
function bed(px: number, py: number, lift: number) {
  const u = (px - CX) / ((X1 - X0) / 2)
  const v = (py - CY) / ((Y1 - Y0) / 2)
  // the strip along the front / right walls is hidden by them, so the bed slopes up there (like the side of a
  // sack): capsules roll back to where they can be seen instead of vanishing behind the wall
  const ramp = 0.9 * (Math.max(0, py - (C.y + C.d * 0.47)) + Math.max(0, px - (C.x + C.w * 0.72)))
  return ZT - C.h * 0.5 + ramp + C.h * 0.16 * lift + C.h * 0.3 * lift * Math.max(0, 1 - u * u * 0.7) * Math.max(0, 1 - v * v * 0.7)
}
function restZ(px: number, py: number, r: number, below: Cap[], lift: number) {
  let z = bed(px, py, lift) + r * 0.85
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

/** Settle a stack (bottom → top). Deterministic; memoised on the stack's keys. */
const memo = new Map<string, Cap[]>()
export function settle(stack: Tok[], lift = 0): Cap[] {
  const key = `${lift.toFixed(2)}|${stack.map(t => t.k + t.c).join(',')}`
  const hit = memo.get(key)
  if (hit) return hit
  const out: Cap[] = []
  stack.forEach((t, i) => {
    const r = RC * (0.92 + kh(t.k, 1) * 0.16)
    const lo = (a: number, b: number) => [a + r * 0.9, b - r * 0.9]
    const [xa, xb] = lo(X0, X1)
    const [ya, yb] = lo(Y0, Y1)
    // preferred drop spot: back-centre, a little wider for the first few (they spread over the floor)
    const sp = 0.95 - 0.3 * cl(i / 18)
    let x = Math.min(xb, Math.max(xa, CX + (kh(t.k, 2) - 0.5) * (X1 - X0) * sp))
    let y = Math.min(yb, Math.max(ya, CY + (kh(t.k, 3) - 0.5) * (Y1 - Y0) * sp))
    let z = restZ(x, y, r, out, lift)
    // roll downhill while the slope beats friction
    for (let it = 0; it < 24; it++) {
      let best: [number, number, number] | null = null
      for (const [dx, dy] of DIRS) {
        const nx = Math.min(xb, Math.max(xa, x + dx * r * 0.4))
        const ny = Math.min(yb, Math.max(ya, y + dy * r * 0.4))
        const nz = restZ(nx, ny, r, out, lift)
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
export function capInner(c: Cap) {
  return INK.capsule(c.r * 1.2247, c.c, { th: c.th, m: c.m, lw: Math.max(0.16, 0.62 * K) })
}
/** Fallback exit/landing point: top of the bed in the middle of the cavity. */
export function bedTop(lift = 0) { return P(CX, CY, bed(CX, CY, lift) + RC) }
export { f as fmt, hsh }
