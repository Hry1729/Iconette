<script setup lang="ts">
import UiIcon from './UiIcon.vue'
import { toastState } from '../lib/actions'
</script>

<template>
  <div class="toast" :class="{ show: toastState.show }">
    <UiIcon :name="toastState.icon" />
    <span>{{ toastState.msg }}</span>
  </div>
</template>
