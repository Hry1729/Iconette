<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from './UiIcon.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { iconVer, setName, svg } from '../lib/iconify'
import { en2zh } from '../lib/zh'
import { fmtLabel } from '../lib/format'
import { copy, copyRaw, like } from '../lib/actions'
import { dragStart } from '../lib/drag'
import { openPop } from '../lib/fx'

// Floating glass detail bar for the selected icon (search results, saved icons, recent).
const id = computed(() => R.sel)
const pv = computed(() => { void iconVer.value; return id.value ? svg(id.value) : '' })
const name = computed(() => id.value?.split(':')[1] || '')
const zh = computed(() => (id.value ? en2zh(name.value) : ''))
const sub = computed(() => (id.value ? setName(id.value.split(':')[0]) : ''))
const liked = computed(() => !!id.value && S.favs.includes(id.value))
</script>

<template>
  <div class="dbar" :class="{ open: !!id }">
    <div class="pv" draggable="true" :title="t('dragHint')" @dragstart="id && dragStart($event, id)" @mousedown="id && dragStart($event, id)" v-html="pv" />
    <div class="nm"><code>{{ name }}</code><span v-if="zh" class="nmzh">{{ zh }}</span><small>{{ sub }}</small></div>
    <span class="sp" />
    <button class="ib" :class="{ on: R.pop === 'cmp' }" :title="t('other', { n: '' }).replace(' · ', '')" @click.stop="openPop('cmp', $event)"><UiIcon name="lucide:shapes" /></button>
    <button class="btn ghost" :title="id || ''" @click="id && copyRaw(id, `${t('copied')} · ${id}`)"><UiIcon name="lucide:copy" />{{ t('copyName') }}</button>
    <button id="likeBtn" class="btn ghost" :class="{ on: liked }" :title="`${t('save')} (F)`" @click="like()"><UiIcon :name="liked ? 'ph:heart-fill' : 'lucide:heart'" />{{ t('save') }}</button>
    <button v-if="liked" class="ib" :class="{ on: R.pop === 'folder' }" :title="t('moveTo')" @click.stop="openPop('folder', $event)"><UiIcon name="lucide:folder-plus" /></button>
    <div class="cpg">
      <button class="btn pri" @click="copy()"><UiIcon name="lucide:corner-down-left" />{{ t('copyF', { f: fmtLabel() }) }}</button>
      <button class="btn pri fmtb" :title="t('format')" @click.stop="openPop('fmt', $event)"><UiIcon name="lucide:chevron-down" /></button>
    </div>
  </div>
</template>
