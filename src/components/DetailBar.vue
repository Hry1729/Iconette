<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from './UiIcon.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { INFO, iconVer, setName, svg } from '../lib/iconify'
import { en2zh } from '../lib/zh'
import { fmtLabel } from '../lib/format'
import { copy, like } from '../lib/actions'
import { dragStart } from '../lib/drag'

const id = computed(() => R.sel)
const pv = computed(() => { void iconVer.value; return id.value ? svg(id.value) : '' })
const zh = computed(() => (id.value ? en2zh(id.value.split(':')[1]) : ''))
const sub = computed(() => {
  if (!id.value) return ''
  const p = id.value.split(':')[0]
  return `${setName(p)}${INFO[p]?.license?.title ? ` · ${INFO[p].license!.title}` : ''}`
})
const liked = computed(() => !!id.value && S.favs.includes(id.value))
const pop = (k: string) => { R.pop = R.pop === k ? null : k }
</script>

<template>
  <div class="bar" :class="{ open: !!id }">
    <div class="bar-in">
      <div class="pv" draggable="true" :title="t('dragHint')" @dragstart="id && dragStart($event, id)" @mousedown="id && dragStart($event, id)" v-html="pv" />
      <div class="nm"><code>{{ id }}<span v-if="zh" class="nmzh">{{ zh }}</span></code><small>{{ sub }}</small></div>
      <button class="ib" :class="{ on: R.pop === 'cmp' }" :title="t('other', { n: '' }).replace(' · ', '')" @click.stop="pop('cmp')"><UiIcon name="lucide:shapes" /></button>
      <button id="likeBtn" class="ib" :class="{ on: liked }" :title="`${t('like')} (F)`" @click="like()">
        <UiIcon :name="liked ? 'ph:heart-fill' : 'lucide:heart'" />
      </button>
      <button v-if="liked" class="ib" :class="{ on: R.pop === 'folder' }" :title="t('moveTo')" @click.stop="pop('folder')"><UiIcon name="lucide:folder-plus" /></button>
      <button class="ib" :title="`${t('color')} / ${t('size')}`" @click.stop="pop('tune')"><UiIcon name="lucide:sliders-horizontal" /></button>
      <div class="fmt"><button @click.stop="pop('fmt')">{{ fmtLabel() }}<UiIcon name="lucide:chevron-down" /></button></div>
      <button class="copy" @click="copy()">{{ t('copy') }}<kbd>↵</kbd></button>
    </div>
  </div>
</template>
