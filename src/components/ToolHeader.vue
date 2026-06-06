<template>
  <div class="tool-header">
    <div class="title-row">
      <h2>{{ title }}</h2>
      <FavoriteButton />
    </div>
    <p v-if="description" class="description">{{ description }}</p>
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
  margin-bottom: var(--spacing-xl);
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.tool-header h2 {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
