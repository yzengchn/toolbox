<template>
  <aside
    class="app-sidebar"
    :class="{ collapsed: appStore.sidebarCollapsed }"
  >
    <div class="sidebar-content">
      <n-scrollbar>
        <div class="tools-list">
          <div
            v-for="category in toolCategories"
            :key="category.id"
            class="category-group"
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
      </n-scrollbar>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { NScrollbar } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { toolCategories, allTools } from '@/tools'

const appStore = useAppStore()
</script>

<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  transition: width 0.3s ease;
}

.app-sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-content {
  height: 100%;
  padding: var(--spacing-md) 0;
}

.tools-list {
  padding: 0 var(--spacing-sm) 0 0;
}

.category-group {
  margin-bottom: var(--spacing-md);
}

.category-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) 0;
  margin-bottom: 6px;
}

.category-title__mark {
  width: 3px;
  height: 14px;
  flex: 0 0 3px;
  border-radius: 999px;
  background: var(--color-accent);
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
  gap: 2px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.tool-icon {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
}

.tool-item:hover .tool-icon {
  background-color: var(--color-bg-quaternary);
}

.tool-item.active .tool-icon {
  background-color: rgba(255, 255, 255, 0.2);
}

.tool-item:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.tool-item.active {
  background-color: var(--color-accent);
  color: white;
}

.tool-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: currentColor;
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
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.collapsed .category-title {
  display: none;
}

.collapsed .tool-name {
  display: none;
}

.collapsed .tool-item {
  justify-content: center;
  padding: var(--spacing-sm);
}

.collapsed .category-tools {
  gap: var(--spacing-xs);
}
</style>
