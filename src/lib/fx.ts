// Motion helpers shared by every view: the title-bar capsule case (扭蛋收纳盒), flights into it, combo particles,
// and popovers anchored to the element that opened them.
import { reactive } from 'vue'
import { R, S } from './store'
import { ISO } from './iso'

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Badge state of the title-bar chest; `tick` bumps to replay the digit animation. */
export const chest = reactive({ tick: 0 })
export const chestCount = () => S.favs.length + S.sets.length + S.uiFav.length

// Remember the last element the user pressed, so a save triggered by click or keyboard can fly from it.
let lastEl: Element | null = null
if (typeof document !== 'undefined') document.addEventListener('pointerdown', e => { lastEl = e.target as Element }, true)
export const lastPressed = () => (lastEl && document.contains(lastEl) ? lastEl : null)

const caseGlyph = () => document.querySelector<HTMLElement>('.chestbtn .tgi')

/** Case glyph squash + lid pop + badge tick, without a flight. */
export function bumpChest() {
  chest.tick++
  const g = caseGlyph()
  if (!g || reduced()) return
  g.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(1.5px) scale(1.12,.88)' }, { transform: 'translateY(-2px) scale(.96,1.06)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' })
  const lid = g.querySelector('.glid')
  lid?.animate([{ transform: 'none' }, { transform: 'translateY(-3.5px) rotate(-8deg)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' })
}

/**
 * Save flight: the icon (`html`, an svg string) shrinks into a small red capsule at `from`,
 * which arcs into the title-bar capsule case; then the case pops its lid and the badge ticks.
 */
export function flyToChest(from: Element | null | undefined, html: string, o: { size?: number, dur?: number } = {}): Promise<void> {
  const to = caseGlyph()
  if (!from || !to || reduced()) { bumpChest(); return Promise.resolve() }
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const sz = o.size || 26
  const R = 11
  const d = document.createElement('div')
  d.className = 'fly'
  d.style.cssText = `width:${sz}px;height:${sz}px;font-size:${sz}px`
  d.innerHTML = `<span class="fi">${html || ''}</span><svg class="iso10 fcap" viewBox="-${R} -${R} ${2 * R} ${2 * R}">${ISO.capsule(R * 0.92, 'r', '')}</svg>`
  document.querySelector('.win')!.appendChild(d)
  const x0 = a.left + a.width / 2 - sz / 2
  const y0 = a.top + a.height / 2 - sz / 2
  const x1 = b.left + b.width / 2 - sz / 2
  const y1 = b.top + b.height / 2 - sz / 2
  const cx = (x0 + x1) / 2 - 50
  const cy = Math.min(y0, y1) + 34
  const kf: Keyframe[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1
    kf.push({ transform: `translate(${x}px,${y}px) scale(${1 - t * 0.55}) rotate(${t * -200}deg)`, opacity: t > 0.94 ? 0 : 1 })
  }
  d.querySelector('.fi')!.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.4)' }], { duration: 200, fill: 'forwards' })
  d.querySelector('.fcap')!.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, fill: 'forwards' })
  return d.animate(kf, { duration: o.dur || 700, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished.then(() => { d.remove(); bumpChest() })
}

/** Little red particles bursting out of an element (combo). */
export function burst(el: Element | null, n = 10) {
  if (!el || reduced()) return
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2 - 3
  const cy = r.top + r.height / 2 - 3
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i')
    d.className = 'burst'
    document.querySelector('.win')!.appendChild(d)
    const a = Math.PI * 2 * i / n + Math.random() * 0.4
    const R0 = 34 + Math.random() * 16
    d.animate([{ transform: `translate(${cx}px,${cy}px) scale(1)`, opacity: 1 }, { transform: `translate(${cx + Math.cos(a) * R0}px,${cy + Math.sin(a) * R0}px) scale(.2)`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => d.remove())
  }
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' })
}

/** Toggle a popover anchored under (or above) the element that was clicked. */
export function openPop(id: string, e?: Event) {
  if (R.pop === id) { R.pop = null; return }
  const el = (e?.currentTarget || e?.target) as HTMLElement | undefined
  if (el?.getBoundingClientRect) { const r = el.getBoundingClientRect(); R.popAt = { l: r.left, t: r.top, r: r.right, b: r.bottom } }
  else R.popAt = null
  R.pop = id
}
