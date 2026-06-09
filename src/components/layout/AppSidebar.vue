<template>
  <aside
    class="app-sidebar"
    :class="{ collapsed: appStore.sidebarCollapsed }"
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
              <span class="category-title__mark"></span>
              <span class="category-title__text">{{ category.name }}</span>
            </div>
            <div class="category-tools">
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
                @click="handleToolClick"
              >
                <span class="tool-icon">{{ tool.name.charAt(0) }}</span>
                <span class="tool-name">{{ tool.name }}</span>
              </router-link>
            </div>
          </div>

          <!-- 当没有工具时显示提示 -->
          <div v-if="allTools.length === 0" class="empty-tips">
            <p>工具开发中...</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { toolCategories, allTools, getToolCategoryColor } from '@/tools/catalog'
import { prefetchToolPage } from '@/tools/prefetch'

const appStore = useAppStore()

const mobileQuery = window.matchMedia('(max-width: 860px)')

const sidebarCategories = toolCategories.map(category => ({
  ...category,
  color: getToolCategoryColor(category.id)
}))

const handleToolClick = () => {
  if (mobileQuery.matches) {
    appStore.setSidebarCollapsed(true)
  }
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

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  min-height: 56px;
  margin: 0 var(--spacing-md) var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-border) 76%, transparent);
  border-radius: var(--radius-md);
  background: var(--color-sidebar-surface);
}

.sidebar-eyebrow {
  margin: 0 0 2px;
  color: var(--color-sidebar-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
}

.sidebar-head h2 {
  margin: 0;
  color: var(--color-sidebar-text);
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: 1.25;
}

.tool-count {
  flex: 0 0 auto;
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-sidebar-active) 14%, transparent);
  color: var(--color-sidebar-active);
  font-size: var(--font-size-xs);
  font-weight: 600;
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
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-sidebar-muted);
  text-transform: uppercase;
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
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

.collapsed .sidebar-head {
  justify-content: center;
  padding: var(--spacing-sm);
}

.collapsed .sidebar-head > div,
.collapsed .tool-count {
  display: none;
}

.collapsed .category-title {
  display: none;
}

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
}
</style>
