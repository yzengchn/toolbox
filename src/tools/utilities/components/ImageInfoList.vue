<template>
  <div class="image-info">
    <span v-if="info.name">文件名: {{ info.name }}</span>
    <span>格式: {{ info.type }}</span>
    <span>尺寸: {{ info.width }} × {{ info.height }}</span>
    <span>大小: {{ info.size }}</span>
  </div>
</template>

<script setup lang="ts">
import type { ImageInfo } from '../base64Image'

defineProps<{
  info: ImageInfo
}>()
</script>

<style scoped>
.image-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
</style>
