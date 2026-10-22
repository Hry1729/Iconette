<script setup lang="ts">
import { computed } from 'vue'
import Heart from './Heart.vue'
import { S } from '../lib/store'
import { t } from '../lib/i18n'
import { SNAP, type UILib, udesc } from '../lib/ui-libs'
import { likeUI, openLib } from '../lib/actions'

const props = defineProps<{ l: UILib }>()
const on = computed(() => S.uiFav.includes(props.l.id))
</script>

<template>
  <div class="sc uic" :data-lib="l.id" @click="openLib(l.id)">
    <div class="snap"><img v-if="SNAP[l.id]" :src="SNAP[l.id]" alt=""><span v-else>{{ t('snapSoon') }}</span></div>
    <b>{{ l.name }}</b>
    <button class="ib" :class="{ on }" :title="t('like')" @click.stop="likeUI(l.id)"><Heart :on="on" /></button>
    <div class="ud">{{ udesc(l) }}</div>
    <small><span class="fw">{{ l.fw }}</span><template v-if="l.demo"> · <span class="live">● {{ t('livePv') }}</span></template><template v-else> · {{ t('soon') }}</template></small>
  </div>
</template>
