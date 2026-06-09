<template>
  <header class="app-header">
    <div class="header-left">
      <button
        type="button"
        class="menu-btn"
        :aria-label="appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="appStore.toggleSidebar"
      >
        <svg viewBox="0 0 24 24" class="header-icon" aria-hidden="true">
          <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
        </svg>
      </button>
      <router-link to="/" class="logo" aria-label="返回首页">
        <img src="/logo-icon.png" alt="ToolBox" class="logo-icon" />
        <span class="logo-copy">
          <span class="logo-text">ToolBox</span>
          <span class="logo-subtitle">Developer Toolkit</span>
        </span>
      </router-link>

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
      <div class="search-wrapper" @keydown="handleSearchKeydown">
        <label class="search-field" :class="{ active: searchFocused }">
          <svg viewBox="0 0 24 24" class="search-icon" aria-hidden="true">
            <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
          </svg>
          <input
            v-model="searchQuery"
            class="search-input"
            type="search"
            placeholder="搜索工具..."
            autocomplete="off"
            aria-label="搜索工具"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="search-clear"
            aria-label="清空搜索"
            @mousedown.prevent
            @click="clearSearch"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M18.3,5.71L12,12L18.3,18.29L16.89,19.7L10.59,13.41L4.29,19.7L2.88,18.29L9.17,12L2.88,5.71L4.29,4.3L10.59,10.59L16.89,4.3L18.3,5.71Z" />
            </svg>
          </button>
        </label>

        <div
          v-if="showSearchDropdown"
          class="search-dropdown"
          role="listbox"
        >
          <button
            v-for="(option, index) in searchOptions"
            :key="option.value"
            type="button"
            class="search-option"
            :class="{ highlighted: index === highlightedSearchIndex }"
            role="option"
            :aria-selected="index === highlightedSearchIndex"
            @mousedown.prevent="handleSelectTool(option.value)"
          >
            <span class="search-option__main">
              <span class="search-option__name">{{ option.tool?.name ?? option.label }}</span>
              <span v-if="option.categoryName" class="search-option__category">
                {{ option.categoryName }}
              </span>
            </span>
            <span v-if="option.description" class="search-option__description">
              {{ option.description }}
            </span>
          </button>
        </div>
      </div>

      <a
        href="https://github.com/yzengchn/toolbox"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
        title="View on GitHub"
      >
        <svg viewBox="0 0 24 24" class="header-icon" aria-hidden="true">
          <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z" />
        </svg>
      </a>

      <div class="theme-switch" role="group" aria-label="主题切换">
        <button
          type="button"
          class="theme-btn"
          :class="{ active: !isDark }"
          aria-label="切换到浅色模式"
          @click="setTheme('light')"
        >
          <svg viewBox="0 0 24 24" class="header-icon" aria-hidden="true">
            <path fill="currentColor" d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />
          </svg>
        </button>
        <button
          type="button"
          class="theme-btn"
          :class="{ active: isDark }"
          aria-label="切换到深色模式"
          @click="setTheme('dark')"
        >
          <svg viewBox="0 0 24 24" class="header-icon" aria-hidden="true">
            <path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useAppStore } from '@/stores/app'
import { getToolByPath, getToolCategoryName, getToolsByIds } from '@/tools/catalog'
import type { ToolInfo } from '@/types'

const router = useRouter()
const { isDark, setTheme } = useTheme()
const appStore = useAppStore()

const favoriteTools = computed(() => {
  return getToolsByIds(appStore.favorites)
})

// 搜索功能
const searchQuery = ref('')
const searchFocused = ref(false)
const highlightedSearchIndex = ref(0)
const searchResults = ref<ToolInfo[]>([])
let searchToolsModulePromise: Promise<typeof import('@/tools/search')> | null = null
let searchRequestId = 0

type SearchOption = {
  label: string
  value: string
  tool: ToolInfo
  description: string
  categoryName: string
}

const createToolSearchOption = (tool: ToolInfo): SearchOption => ({
  label: tool.name,
  value: tool.path,
  tool,
  description: tool.description,
  categoryName: getToolCategoryName(tool.category)
})

const loadSearchToolsModule = () => {
  searchToolsModulePromise ??= import('@/tools/search')
  return searchToolsModulePromise
}

const searchOptions = computed(() => {
  const query = searchQuery.value.trim()

  if (!query) {
    const recentToolIds = [...appStore.searchHistory, ...appStore.recentTools]
    const uniqueToolIds = [...new Set(recentToolIds)].slice(0, 6)

    return getToolsByIds(uniqueToolIds).map(tool => createToolSearchOption(tool))
  }

  return searchResults.value.map(tool => createToolSearchOption(tool))
})

const showSearchDropdown = computed(() => searchFocused.value && searchOptions.value.length > 0)

watch(searchOptions, () => {
  highlightedSearchIndex.value = 0
})

watch(
  () => searchQuery.value.trim(),
  async query => {
    const requestId = ++searchRequestId

    if (!query) {
      searchResults.value = []
      return
    }

    try {
      const { searchTools } = await loadSearchToolsModule()

      if (requestId === searchRequestId && query === searchQuery.value.trim()) {
        searchResults.value = searchTools(query, 8)
      }
    } catch (error) {
      console.error('Load tool search failed:', error)

      if (requestId === searchRequestId) {
        searchResults.value = []
      }
    }
  }
)

const handleSearchFocus = () => {
  searchFocused.value = true
  void loadSearchToolsModule()
}

const handleSearchBlur = () => {
  window.setTimeout(() => {
    searchFocused.value = false
  }, 120)
}

const clearSearch = () => {
  searchQuery.value = ''
  highlightedSearchIndex.value = 0
}

const handleSelectTool = async (value: string) => {
  const selectedTool = getToolByPath(value)
  if (selectedTool) {
    appStore.addSearchHistory(selectedTool.id)
  }

  await router.push(value)
  await nextTick()
  searchQuery.value = ''
  searchFocused.value = false
}

const handleSearchKeydown = (event: KeyboardEvent) => {
  const optionCount = searchOptions.value.length

  if (!optionCount) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    searchFocused.value = true
    highlightedSearchIndex.value = (highlightedSearchIndex.value + 1) % optionCount
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    searchFocused.value = true
    highlightedSearchIndex.value = (highlightedSearchIndex.value - 1 + optionCount) % optionCount
    return
  }

  if (event.key === 'Enter' && showSearchDropdown.value) {
    event.preventDefault()
    const selectedOption = searchOptions.value[highlightedSearchIndex.value]
    if (selectedOption) {
      void handleSelectTool(selectedOption.value)
    }
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    searchFocused.value = false
  }
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: var(--radius-sm) !important;
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
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
  border-radius: var(--radius-sm);
  text-decoration: none;
  cursor: pointer;
  outline: none;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.logo:hover,
.logo:focus-visible {
  color: var(--color-primary);
  background: var(--color-surface-hover);
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
  font-weight: 600;
  letter-spacing: 0;
}

.logo-subtitle {
  margin-top: 1px;
  color: var(--color-text-tertiary);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
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
  font-weight: 500;
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

.header-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.search-wrapper {
  width: clamp(210px, 24vw, 340px);
  position: relative;
  z-index: 3;
}

.search-field {
  height: 34px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.search-field.active {
  background: var(--color-surface);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.search-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  color: var(--color-text-tertiary);
}

.search-input {
  min-width: 0;
  flex: 1;
  height: 100%;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.search-clear:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.search-clear svg {
  width: 14px;
  height: 14px;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: min(420px, 92vw);
  max-height: min(360px, 70vh);
  padding: 5px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.search-option {
  width: 100%;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 7px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
}

.search-option:hover,
.search-option.highlighted {
  background: var(--color-surface-hover);
}

.search-option__main {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  min-width: 0;
}

.search-option__name {
  min-width: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-option__category {
  flex: 0 0 auto;
  max-width: 86px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  color: var(--color-primary);
  background: var(--color-primary-soft);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-option__description {
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
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.theme-btn:hover {
  color: var(--color-text-primary);
}

.theme-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
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
