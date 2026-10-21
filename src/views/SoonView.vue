<script setup lang="ts">
import { R } from '../lib/store'
import { t } from '../lib/i18n'
</script>

<template>
  <div class="body">
    <div class="soon">
      <div>
        <h2>{{ t(R.mode === 'sets' ? 'mSets' : 'swipe') }}</h2>
        <div>{{ R.mode === 'sets' ? '图标库 / 组件库 / 示例面板，正在从原型迁移' : '划一划卡片，正在从原型迁移' }}</div>
      </div>
    </div>
  </div>
</template>
