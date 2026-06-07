<template>
  <div class="tool-header">
    <div class="title-copy">
      <div class="title-row">
        <div class="tool-title" role="heading" aria-level="2">{{ title }}</div>
        <FavoriteButton />
      </div>
      <p v-if="description" class="description">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import FavoriteButton from './FavoriteButton.vue'

defineProps<{
  title: string
  description?: string
}>()
</script>

<style scoped>
.tool-header {
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: none;
}

.title-copy {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-xs);
}

.tool-title {
  min-width: 0;
  font-size: var(--font-size-lg);
  line-height: 1.3;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  margin: var(--spacing-xs) 0 0;
}

@media (max-width: 720px) {
  .tool-header {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .title-row {
    align-items: center;
  }

  .tool-title {
    font-size: var(--font-size-lg);
  }
}
</style>
