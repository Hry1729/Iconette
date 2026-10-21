<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import IconTile from '../components/IconTile.vue'
import { R, S } from '../lib/store'
import { t } from '../lib/i18n'
import { pick } from '../lib/actions'

defineEmits<{ (e: 'copy', id: string): void }>()
const list = computed(() => { const q = R.q.trim().toLowerCase(); return q ? S.favs.filter(x => x.includes(q)) : S.favs })
watchEffect(() => { R.list = list.value })
</script>

<template>
  <div class="body">
    <div v-if="!S.favs.length" class="empty"><div><h2>{{ t('noFavIcons') }}</h2><div>{{ t('noFavIconsSub') }}</div></div></div>
    <template v-else>
      <div class="meta"><b>{{ t('tIcons') }}</b><span>{{ list.length }}</span></div>
      <div class="grid">
        <IconTile v-for="id in list" :id="id" :key="id" :sel="R.sel === id" @click="pick(id)" @dblclick="$emit('copy', id)" />
      </div>
    </template>
  </div>
</template>
