<script setup lang="ts">
import { R } from '../lib/store'
defineProps<{ id: string }>()
</script>

<template>
  <div class="pop" :class="{ open: R.pop === id }" @click.stop>
    <slot v-if="R.pop === id" />
  </div>
</template>
