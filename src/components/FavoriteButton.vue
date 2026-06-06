<template>
  <n-button
    text
    size="small"
    class="favorite-btn"
    :class="{ active: isFavorite }"
    :title="isFavorite ? '取消收藏' : '收藏工具'"
    @click="toggleFavorite"
  >
    <template #icon>
      <n-icon :size="20">
        <svg viewBox="0 0 24 24">
          <path
            :fill="isFavorite ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
            d="M12 2.8L14.9 8.68L21.4 9.63L16.7 14.21L17.81 20.68L12 17.62L6.19 20.68L7.3 14.21L2.6 9.63L9.1 8.68L12 2.8Z"
          />
        </svg>
      </n-icon>
    </template>
  </n-button>
</template>

<script setup lang="ts">
import { inject, type ComputedRef } from 'vue'
import { NButton, NIcon } from 'naive-ui'

const isFavorite = inject<ComputedRef<boolean>>('isFavorite')
const toggleFavorite = inject<() => void>('toggleFavorite')
</script>

<style scoped>
.favorite-btn {
  color: var(--color-text-tertiary);
  transition: all 0.2s ease;
}

.favorite-btn:hover {
  color: var(--color-text-secondary);
}

.favorite-btn.active {
  color: #f5a524;
}

.favorite-btn.active:hover {
  color: #e09616;
}
</style>
