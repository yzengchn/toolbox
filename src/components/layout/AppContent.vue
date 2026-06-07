<template>
  <main class="app-content">
    <router-view />
  </main>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-content {
  flex: 1;
  height: 100%;
  overflow: auto;
  min-width: 0;
  background: var(--color-bg-primary);
  position: relative;
}

.app-content::before {
  content: '';
  position: sticky;
  top: 0;
  z-index: 1;
  display: block;
  height: 1px;
  background: var(--color-border);
  pointer-events: none;
}

@media (max-width: 860px) {
  .app-content {
    width: 100%;
  }
}
</style>
