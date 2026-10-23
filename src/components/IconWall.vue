<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { load, svg } from '../lib/iconify'
import { reduced } from '../lib/fx'

// 会呼吸的图标墙: a slowly drifting field of icons behind the home hero, faded out in the centre.
// A few cells light up every 0.7s, about one in six of them red. Static when reduced motion is on.
const FIELD = ['lucide:house', 'tabler:heart', 'lucide:camera', 'tabler:music', 'lucide:cloud', 'tabler:bell', 'lucide:user', 'tabler:settings', 'lucide:calendar', 'tabler:map-pin', 'lucide:coffee', 'tabler:rocket',
  'tabler:leaf', 'lucide:sun', 'tabler:moon', 'lucide:zap', 'tabler:gift', 'lucide:globe', 'tabler:brand-github', 'lucide:image', 'tabler:mail', 'lucide:lock', 'tabler:key', 'lucide:wifi',
  'lucide:umbrella', 'tabler:anchor', 'lucide:palette', 'tabler:scissors', 'lucide:pen-tool', 'tabler:bike', 'lucide:car', 'tabler:plane', 'lucide:trophy', 'tabler:crown', 'lucide:diamond', 'tabler:flower',
  'lucide:cat', 'tabler:dog', 'lucide:fish', 'tabler:apple', 'lucide:pizza', 'tabler:ghost', 'lucide:compass', 'tabler:puzzle', 'lucide:feather', 'tabler:mood-smile', 'lucide:bookmark', 'tabler:planet',
  'lucide:star', 'tabler:atom', 'lucide:music', 'tabler:headphones', 'lucide:battery', 'tabler:device-gamepad-2', 'lucide:bird', 'tabler:brand-figma', 'lucide:cherry', 'tabler:brand-vue', 'lucide:phone', 'tabler:photo',
  'lucide:ship', 'tabler:pizza', 'lucide:crown', 'tabler:sun', 'lucide:brush', 'tabler:world', 'lucide:mail', 'tabler:star', 'lucide:apple', 'tabler:cloud', 'lucide:flower-2', 'tabler:camera']
const ROWS = 22
const COLS = 40
const lay = ref<HTMLElement>()
let timer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  await load(FIELD)
  if (!lay.value) return
  let h = ''
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) h += `<span>${svg(FIELD[(c % 12) + 12 * (r % 6)])}</span>`
  lay.value.innerHTML = h
  if (reduced()) return
  const spans = lay.value.children
  const tick = () => {
    for (let k = 0; k < 3; k++) {
      const s = spans[Math.floor(Math.random() * spans.length)]
      s.classList.add(Math.random() < 0.18 ? 'hot' : 'on')
      setTimeout(() => s.classList.remove('on', 'hot'), 2200)
    }
  }
  for (let k = 0; k < 4; k++) tick()
  timer = setInterval(tick, 700)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="field" aria-hidden="true"><div ref="lay" class="lay" /></div>
</template>
