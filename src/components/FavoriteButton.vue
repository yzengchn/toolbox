<template>
  <n-button
    text
    size="small"
    class="favorite-btn"
    :class="{ active: favoriteActive }"
    :title="favoriteActive ? '取消收藏' : '收藏工具'"
    :aria-label="favoriteActive ? '取消收藏' : '收藏工具'"
    @click="handleToggleFavorite"
  >
    <template #icon>
      <n-icon :size="18">
        <svg viewBox="0 0 24 24">
          <path
            :fill="favoriteActive ? 'currentColor' : 'none'"
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
import { computed, inject, type ComputedRef } from 'vue'
import { NButton, NIcon } from 'naive-ui'

const isFavorite = inject<ComputedRef<boolean>>('isFavorite')
const toggleFavorite = inject<() => void>('toggleFavorite')

const favoriteActive = computed(() => isFavorite?.value ?? false)

const handleToggleFavorite = () => {
  toggleFavorite?.()
}
</script>

<style scoped>
.favorite-btn {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border-radius: var(--radius-sm) !important;
  background: transparent;
  border: 0 !important;
  color: var(--color-text-tertiary);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.favorite-btn:hover {
  color: var(--color-favorite);
  background: var(--color-surface-hover);
}

.favorite-btn.active {
  color: var(--color-favorite);
  background: var(--color-favorite-soft);
}

.favorite-btn.active:hover {
  color: var(--color-favorite);
}
</style>
