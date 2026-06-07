<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :hljs="hljs">
    <n-message-provider>
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
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { useTheme } from '@/composables/useTheme'
import { useAppStore } from '@/stores/app'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppContent from './AppContent.vue'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('plaintext', plaintext)

const { naiveTheme, naiveThemeOverrides } = useTheme()
const appStore = useAppStore()

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

onMounted(() => {
  syncSidebarForViewport()
  mobileQuery.addEventListener('change', syncSidebarForViewport)
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
