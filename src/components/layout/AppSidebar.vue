<template>
  <aside
    class="app-sidebar"
    :class="{ collapsed: appStore.sidebarCollapsed, resizing: isResizing }"
    :style="sidebarStyle"
  >
    <div class="sidebar-content">
      <div class="sidebar-scroll">
        <div class="tools-list">
          <div
            v-for="category in sidebarCategories"
            :key="category.id"
            class="category-group"
            :style="{ '--category-color': category.color }"
          >
            <div class="category-title">
              <router-link
                :to="`/category/${category.id}`"
                class="category-link"
                :class="{ active: isActiveCategory(category.id) }"
                :title="`${category.name}分类`"
                @click="closeSidebarOnMobile"
              >
                <span class="category-title__mark"></span>
                <span class="category-title__text">{{ category.name }}</span>
              </router-link>
              <button
                type="button"
                class="category-toggle"
                :aria-controls="`category-tools-${category.id}`"
                :aria-expanded="!isCategoryCollapsed(category.id)"
                :aria-label="isCategoryCollapsed(category.id) ? `展开${category.name}` : `折叠${category.name}`"
                @click.stop="toggleCategory(category.id)"
              >
                <span
                  class="category-toggle__icon"
                  :class="{ collapsed: isCategoryCollapsed(category.id) }"
                  aria-hidden="true"
                ></span>
              </button>
            </div>
            <div
              v-show="!isCategoryCollapsed(category.id)"
              :id="`category-tools-${category.id}`"
              class="category-tools"
            >
              <router-link
                v-for="tool in category.tools"
                :key="tool.id"
                :to="`/tool/${tool.id}`"
                class="tool-item"
                active-class="active"
                :title="tool.name"
                @mouseenter="prefetchToolPage(tool.id)"
                @focus="prefetchToolPage(tool.id)"
                @pointerdown="prefetchToolPage(tool.id)"
                @click="closeSidebarOnMobile"
              >
                <span class="tool-icon">{{ tool.name.charAt(0) }}</span>
                <span class="tool-name">{{ tool.name }}</span>
              </router-link>
            </div>
          </div>

          <div v-if="allTools.length === 0" class="empty-tips">
            <p>工具开发中...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 桌面端拖动手柄：折叠/展开均可拖 -->
    <div
      class="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="拖动调整侧边栏宽度"
      :aria-valuenow="displayWidth"
      :aria-valuemin="SIDEBAR_COLLAPSED_WIDTH"
      :aria-valuemax="SIDEBAR_MAX_WIDTH"
      tabindex="0"
      @pointerdown="onResizeStart"
      @keydown="onResizeKeydown"
    ></div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useSidebarResize } from '@/composables/useSidebarResize'
import { toolCategories, allTools, getToolCategoryColor } from '@/tools/catalog'
import { prefetchToolPage } from '@/tools/prefetch'
import type { ToolCategory } from '@/types'

const appStore = useAppStore()
const route = useRoute()
const mobileQuery = window.matchMedia('(max-width: 860px)')
/** 侧栏内各分类折叠状态（仅本会话，不持久化） */
const collapsedCategoryIds = ref(new Set<ToolCategory>())

const {
  isResizing,
  displayWidth,
  sidebarStyle,
  onResizeStart,
  onResizeKeydown,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MAX_WIDTH
} = useSidebarResize(() => mobileQuery.matches)

const sidebarCategories = toolCategories.map(category => ({
  ...category,
  color: getToolCategoryColor(category.id)
}))

const activeCategoryId = computed(() => {
  if (route.name !== 'category') return undefined
  const { categoryId } = route.params
  return Array.isArray(categoryId) ? categoryId[0] : categoryId
})

const isActiveCategory = (categoryId: ToolCategory) => activeCategoryId.value === categoryId
const isCategoryCollapsed = (categoryId: ToolCategory) => collapsedCategoryIds.value.has(categoryId)

const toggleCategory = (categoryId: ToolCategory) => {
  const next = new Set(collapsedCategoryIds.value)
  if (next.has(categoryId)) next.delete(categoryId)
  else next.add(categoryId)
  collapsedCategoryIds.value = next
}

/** 移动端点分类/工具后收起抽屉 */
const closeSidebarOnMobile = () => {
  if (mobileQuery.matches) appStore.setSidebarCollapsed(true)
}
</script>

<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  height: 100%;
  flex: 0 0 auto;
  background: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-sidebar-border);
  color: var(--color-sidebar-text);
  transition:
    width var(--transition-slow),
    transform var(--transition-slow);
  position: relative;
  z-index: 12;
  overflow: hidden;
}

.app-sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

/* 拖动中关掉 width 过渡，避免跟手延迟 */
.app-sidebar.resizing {
  transition: none;
}

.sidebar-content {
  height: 100%;
  padding: var(--spacing-lg) 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-sidebar-muted) 44%, transparent) transparent;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-sidebar-muted) 42%, transparent);
  background-clip: content-box;
}

.tools-list {
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.category-group {
  margin-bottom: var(--spacing-lg);
}

.category-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: var(--spacing-xs);
}

.category-link {
  flex: 1;
  min-width: 0;
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-muted);
  text-decoration: none;
  text-transform: uppercase;
  font-size: var(--font-size-xs);
  font-weight: 500;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.category-link:hover,
.category-link.active {
  color: var(--color-sidebar-text);
  background: var(--color-sidebar-hover);
  border-color: var(--color-sidebar-border);
}

.category-link.active .category-title__mark {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--category-color) 20%, transparent);
}

.category-toggle {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-sidebar-muted);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.category-toggle:hover,
.category-toggle:focus-visible {
  color: var(--color-sidebar-text);
  background: var(--color-sidebar-hover);
  border-color: var(--color-sidebar-border);
}

.category-toggle:focus-visible {
  outline: none;
}

.category-toggle__icon {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translate(-1px, -1px);
  transform-origin: center;
  transition: transform var(--transition-fast);
}

.category-toggle__icon.collapsed {
  transform: rotate(-45deg);
}

.category-title__mark {
  width: 5px;
  height: 5px;
  flex: 0 0 5px;
  border-radius: 999px;
  background: var(--category-color);
}

.category-title__text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-tools {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-height: 40px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  color: var(--color-sidebar-text);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
  cursor: pointer;
  position: relative;
  outline-offset: -2px;
}

.tool-icon {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: var(--color-sidebar-surface);
  color: var(--color-sidebar-muted);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.tool-item:hover .tool-icon {
  background: var(--color-sidebar-surface);
  color: var(--color-sidebar-text);
}

.tool-item.active .tool-icon {
  background: var(--color-sidebar-active);
  color: var(--color-sidebar-active-contrast);
}

.tool-item:hover {
  background: var(--color-sidebar-hover);
  color: var(--color-sidebar-text);
  border-color: var(--color-sidebar-border);
}

.tool-item.active {
  background: var(--color-sidebar-active-soft);
  color: var(--color-sidebar-active-text);
  border-color: color-mix(in srgb, var(--color-sidebar-active) 22%, var(--color-sidebar-border));
}

.tool-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--color-sidebar-active);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.tool-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-tips {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-sm);
}

.collapsed .category-title,
.collapsed .tool-name {
  display: none;
}

.collapsed .tool-item {
  justify-content: center;
  min-height: 44px;
  padding: var(--spacing-sm);
}

.collapsed .category-tools {
  gap: var(--spacing-xs);
}

.collapsed .tools-list {
  padding-inline: var(--spacing-sm);
}

.collapsed .tool-item.active::before {
  width: 0;
}

/* 右侧拖动手柄：默认细线，hover/active 时加粗高亮 */
.sidebar-resizer {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  z-index: 20;
  cursor: col-resize;
  touch-action: none;
  background: transparent;
}

.sidebar-resizer::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  border-radius: var(--radius-pill);
  background: transparent;
  transition:
    background-color var(--transition-fast),
    width var(--transition-fast);
}

.sidebar-resizer:hover::after,
.sidebar-resizer:focus-visible::after,
.app-sidebar.resizing .sidebar-resizer::after {
  width: 3px;
  background: var(--color-sidebar-active, var(--color-primary));
}

.sidebar-resizer:focus-visible {
  outline: none;
}

@media (max-width: 860px) {
  .app-sidebar,
  .app-sidebar.collapsed {
    position: absolute;
    inset: 0 auto 0 0;
    width: min(var(--sidebar-width), 84vw);
    max-width: 320px;
    box-shadow: none;
  }

  .app-sidebar.collapsed {
    transform: translateX(-104%);
  }

  .app-sidebar:not(.collapsed) {
    transform: translateX(0);
  }

  .sidebar-resizer {
    display: none;
  }
}
</style>
