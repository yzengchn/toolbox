<template>
  <div class="app-layout">
    <AppHeader />
    <div class="layout-body">
      <AppSidebar />
      <button
        class="sidebar-backdrop"
        :class="{ visible: !appStore.sidebarCollapsed }"
        type="button"
        aria-label="关闭侧边栏"
        @click="closeSidebar"
      ></button>
      <AppContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { prefetchLikelyToolPages, warmToolPageShell } from '@/tools/prefetch'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppContent from './AppContent.vue'

const appStore = useAppStore()
const defaultWarmToolIds = [
  'json-formatter',
  'base64-encoder',
  'subnet-calculator',
  'timestamp-converter'
]

const mobileQuery = window.matchMedia('(max-width: 860px)')

const syncSidebarForViewport = () => {
  if (mobileQuery.matches) {
    appStore.setSidebarCollapsed(true)
  }
}

const closeSidebar = () => {
  if (mobileQuery.matches) {
    appStore.setSidebarCollapsed(true)
  }
}

const warmToolPageAfterIdle = () => {
  const warmLikelyTools = () => {
    prefetchLikelyToolPages([
      ...appStore.recentTools,
      ...appStore.favorites,
      ...appStore.searchHistory,
      ...defaultWarmToolIds
    ])
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => {
      warmToolPageShell()
      warmLikelyTools()
    }, { timeout: 2500 })
    return
  }

  window.setTimeout(() => {
    warmToolPageShell()
    warmLikelyTools()
  }, 800)
}

onMounted(() => {
  syncSidebarForViewport()
  mobileQuery.addEventListener('change', syncSidebarForViewport)
  warmToolPageAfterIdle()
})

onBeforeUnmount(() => {
  mobileQuery.removeEventListener('change', syncSidebarForViewport)
})
</script>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.layout-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 860px) {
  .layout-body {
    isolation: isolate;
  }

  .sidebar-backdrop {
    position: absolute;
    inset: 0;
    z-index: 8;
    display: block;
    border: 0;
    background: var(--color-overlay);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-base);
  }

  .sidebar-backdrop.visible {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
