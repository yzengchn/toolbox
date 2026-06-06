<template>
  <n-config-provider :theme="naiveTheme">
    <n-message-provider>
      <div class="app-layout">
        <AppHeader />
        <div class="layout-body">
          <AppSidebar />
          <AppContent />
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppContent from './AppContent.vue'

const { naiveTheme } = useTheme()
</script>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
}

.layout-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
