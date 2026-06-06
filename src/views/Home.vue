<template>
  <div class="home">
    <h1>ToolBox - 开发者工具箱</h1>
    <p class="description">选择左侧工具开始使用</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  document.title = 'ToolBox'
})
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-xl);
  text-align: center;
}

h1 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--color-text-primary);
}

.description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}
</style>
