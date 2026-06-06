<template>
  <header class="app-header">
    <div class="header-left">
      <n-button
        text
        class="menu-btn"
        @click="appStore.toggleSidebar"
      >
        <template #icon>
          <n-icon size="20">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
            </svg>
          </n-icon>
        </template>
      </n-button>
      <div class="logo">
        <span class="logo-icon">🧰</span>
        <span class="logo-text">ToolBox</span>
      </div>

      <nav v-if="favoriteTools.length" class="quick-bookmarks" aria-label="快速书签">
        <router-link
          v-for="tool in favoriteTools"
          :key="tool.id"
          :to="tool.path"
          class="bookmark-link"
          active-class="active"
          :title="tool.name"
        >
          {{ tool.name }}
        </router-link>
      </nav>
    </div>

    <div class="header-right">
      <a
        href="https://github.com/yzengchn/toolbox"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
        title="View on GitHub"
      >
        <n-icon size="22">
          <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        </n-icon>
      </a>

      <n-button-group class="theme-switch">
        <n-button
          size="small"
          :type="!isDark ? 'primary' : 'default'"
          :secondary="isDark"
          class="theme-btn"
          @click="setTheme('light')"
        >
          <template #icon>
            <n-icon size="18">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />
              </svg>
            </n-icon>
          </template>
        </n-button>
        <n-button
          size="small"
          :type="isDark ? 'primary' : 'default'"
          :secondary="!isDark"
          class="theme-btn"
          @click="setTheme('dark')"
        >
          <template #icon>
            <n-icon size="18">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />
              </svg>
            </n-icon>
          </template>
        </n-button>
      </n-button-group>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NButtonGroup, NIcon } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import { useAppStore } from '@/stores/app'
import { allTools } from '@/tools'

const { isDark, setTheme } = useTheme()
const appStore = useAppStore()

const favoriteTools = computed(() => {
  return appStore.favorites
    .map(id => allTools.find(tool => tool.id === id))
    .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined)
})
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

.menu-btn {
  font-size: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.logo-icon {
  font-size: 24px;
}

.quick-bookmarks {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: min(52vw, 720px);
  overflow-x: auto;
  padding: 2px 0;
}

.bookmark-link {
  flex: 0 0 auto;
  max-width: 128px;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  text-decoration: none;
  font-size: var(--font-size-xs);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-link:hover,
.bookmark-link.active {
  color: white;
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 0 0 auto;
}

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  text-decoration: none;
}

.github-link:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-tertiary);
}

.theme-switch {
  display: flex;
  align-items: center;
}

.theme-btn {
  font-weight: 500;
}

@media (max-width: 900px) {
  .quick-bookmarks {
    max-width: 36vw;
  }
}

@media (max-width: 680px) {
  .quick-bookmarks {
    display: none;
  }
}
</style>
