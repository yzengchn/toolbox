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
  background-color: var(--color-bg-primary);
}
</style>
