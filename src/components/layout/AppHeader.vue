<template>
  <header class="app-header">
    <div class="header-left">
      <n-button
        text
        class="menu-btn"
        :aria-label="appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
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
        <img src="/logo-icon.png" alt="ToolBox" class="logo-icon" />
        <span class="logo-copy">
          <span class="logo-text">ToolBox</span>
          <span class="logo-subtitle">Developer Toolkit</span>
        </span>
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
      <!-- 搜索框 -->
      <div class="search-wrapper">
        <n-auto-complete
          :value="searchQuery"
          :options="searchOptions"
          :render-label="renderSearchLabel"
          :get-show="getSearchDropdownShow"
          :menu-props="{ class: 'tool-search-menu' }"
          placeholder="搜索工具..."
          clearable
          size="small"
          class="tool-search"
          @update:value="handleSearchUpdate"
          @select="handleSelectTool"
        >
          <template #prefix>
            <n-icon size="16" style="margin-right: 4px">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
              </svg>
            </n-icon>
          </template>
        </n-auto-complete>
      </div>

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
          aria-label="切换到浅色模式"
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
          aria-label="切换到深色模式"
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
import { computed, h, nextTick, ref, type VNodeChild } from 'vue'
import { useRouter } from 'vue-router'
import { NAutoComplete, NButton, NButtonGroup, NIcon, type AutoCompleteOption } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import { useAppStore } from '@/stores/app'
import { getToolByPath, getToolCategoryName, getToolsByIds, searchTools } from '@/tools'
import type { Tool } from '@/types'

const router = useRouter()
const { isDark, setTheme } = useTheme()
const appStore = useAppStore()

const favoriteTools = computed(() => {
  return getToolsByIds(appStore.favorites)
})

// 搜索功能
const searchQuery = ref('')

type SearchOption = AutoCompleteOption & {
  tool?: Tool
  description?: string
  categoryName?: string
}

const createToolSearchOption = (tool: Tool): SearchOption => ({
  label: tool.name,
  value: tool.path,
  tool,
  description: tool.description,
  categoryName: getToolCategoryName(tool.category)
})

const searchOptions = computed(() => {
  const query = searchQuery.value.trim()

  if (!query) {
    const searchHistoryList = getToolsByIds(appStore.searchHistory)
      .slice(0, 3)
      .map(tool => createToolSearchOption(tool))

    const recentToolsList = getToolsByIds(appStore.recentTools)
      .slice(0, 3)
      .map(tool => createToolSearchOption(tool))

    return [...searchHistoryList, ...recentToolsList]
  }

  return searchTools(query, 8).map(tool => createToolSearchOption(tool))
})

const renderSearchLabel = (option: AutoCompleteOption): VNodeChild => {
  const searchOption = option as SearchOption

  return h('div', { class: 'search-option' }, [
    h('div', { class: 'search-option__main' }, [
      h('span', { class: 'search-option__name' }, String(searchOption.tool?.name ?? searchOption.label ?? '')),
      searchOption.categoryName
        ? h('span', { class: 'search-option__category' }, searchOption.categoryName)
        : null
    ]),
    searchOption.description
      ? h('div', { class: 'search-option__description' }, searchOption.description)
      : null
  ])
}

const getSearchDropdownShow = () => searchOptions.value.length > 0

const handleSearchUpdate = (value: string | null) => {
  searchQuery.value = value ?? ''
}

const handleSelectTool = async (value: string) => {
  // 忽略标题行
  if (value.startsWith('header-')) {
    return
  }

  const selectedTool = getToolByPath(value)
  if (selectedTool) {
    appStore.addSearchHistory(selectedTool.id)
  }

  router.push(value)
  await nextTick()
  searchQuery.value = ''
}
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: none;
  position: relative;
  z-index: 20;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
  flex: 1;
}

.menu-btn {
  font-size: 18px;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm) !important;
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}

.menu-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  color: var(--color-text-primary);
  min-width: 0;
}

.logo-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  background: transparent;
  border-radius: var(--radius-sm);
  box-shadow: none;
}

.logo-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.1;
}

.logo-text {
  font-size: var(--font-size-base);
  font-weight: 800;
  letter-spacing: 0;
}

.logo-subtitle {
  margin-top: 1px;
  color: var(--color-text-tertiary);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.quick-bookmarks {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
  max-width: min(38vw, 620px);
  overflow-x: auto;
  padding: 2px 0;
  scrollbar-width: none;
}

.quick-bookmarks::-webkit-scrollbar {
  display: none;
}

.bookmark-link {
  flex: 0 0 auto;
  max-width: 140px;
  padding: 6px 11px;
  border-radius: var(--radius-pill);
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  text-decoration: none;
  font-size: var(--font-size-xs);
  font-weight: 650;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.bookmark-link:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.bookmark-link.active {
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border-color: var(--color-border-strong);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 0 0 auto;
}

.search-wrapper {
  width: clamp(210px, 24vw, 340px);
}

.tool-search {
  width: 100%;
}

.tool-search :deep(.n-input) {
  background: var(--color-surface-muted) !important;
  border-radius: var(--radius-pill) !important;
}

:global(.tool-search-menu) {
  padding: 5px 0;
}

:global(.tool-search-menu .n-base-select-option) {
  min-height: 48px;
  margin: 2px 6px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
}

:global(.tool-search-menu .n-base-select-option::before) {
  inset: 0;
  border-radius: var(--radius-sm);
}

:global(.tool-search-menu .n-virtual-list) {
  padding: 2px 0;
}

.tool-search :deep(.search-option) {
  min-width: 0;
  padding: 1px 0;
}

.tool-search :deep(.search-option__main) {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
}

.tool-search :deep(.search-option__name) {
  min-width: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-search :deep(.search-option__category) {
  flex: 0 0 auto;
  max-width: 86px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  color: var(--color-primary);
  background: var(--color-primary-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-search :deep(.search-option__description) {
  margin-top: 2px;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
  text-decoration: none;
}

.github-link:hover {
  color: var(--color-text-primary);
  background-color: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.theme-switch {
  display: flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.theme-btn {
  width: 28px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .search-wrapper {
    width: 190px;
  }

  .quick-bookmarks {
    max-width: 28vw;
  }
}

@media (max-width: 900px) {
  .quick-bookmarks {
    max-width: 24vw;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .logo-subtitle {
    display: none;
  }

  .search-wrapper {
    width: min(38vw, 190px);
  }
}

@media (max-width: 680px) {
  .quick-bookmarks {
    display: none;
  }

  .search-wrapper {
    width: 42vw;
  }

  .github-link {
    display: none;
  }
}

@media (max-width: 500px) {
  .logo-copy {
    display: none;
  }

  .search-wrapper {
    width: min(48vw, 190px);
  }

  .theme-switch {
    display: none;
  }
}
</style>
