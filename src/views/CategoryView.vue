<template>
  <div class="category-view">
    <section
      v-if="category"
      class="category-panel"
      :style="{ '--category-color': categoryColor }"
      aria-labelledby="category-title"
    >
      <header class="category-heading">
        <div class="category-heading__main">
          <span class="category-heading__mark" aria-hidden="true"></span>
          <div class="category-heading__copy">
            <p class="category-kicker">工具分类</p>
            <h1 id="category-title">{{ category.name }}</h1>
          </div>
        </div>
        <span class="category-count">{{ category.tools.length }} 个工具</span>
      </header>

      <div v-if="category.tools.length" class="tool-grid" aria-label="分类工具列表">
        <router-link
          v-for="tool in category.tools"
          :key="tool.id"
          :to="tool.path"
          class="tool-card"
          @mouseenter="prefetchToolPage(tool.id)"
          @focus="prefetchToolPage(tool.id)"
          @pointerdown="prefetchToolPage(tool.id)"
        >
          <span class="tool-icon">{{ tool.name.charAt(0) }}</span>
          <span class="tool-copy">
            <strong>{{ tool.name }}</strong>
            <small>{{ tool.description }}</small>
          </span>
        </router-link>
      </div>

      <div v-else class="empty-state" role="status">
        <p>该分类暂无工具</p>
      </div>
    </section>

    <div v-else class="not-found">
      <div class="not-found-panel" role="status">
        <p class="not-found-code">404</p>
        <p class="not-found-title">分类未找到</p>
        <p class="not-found-description">抱歉，找不到该工具分类</p>
        <button type="button" class="not-found-action" @click="router.push('/')">
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getToolCategoryById, getToolCategoryColor } from '@/tools/catalog'
import { prefetchToolPage } from '@/tools/prefetch'
import { getAbsoluteUrl, setSeo, siteConfig } from '@/utils/seo'

const props = defineProps<{
  categoryId: string
}>()

const router = useRouter()
const category = computed(() => getToolCategoryById(props.categoryId))
const categoryColor = computed(() =>
  category.value ? getToolCategoryColor(category.value.id) : 'var(--color-primary)'
)

watch(
  category,
  (current) => {
    if (!current) {
      setSeo({
        title: '分类未找到 - ToolBox 在线工具',
        description: 'ToolBox 在线开发者工具箱未找到该工具分类，请返回首页选择在线开发者工具。',
        keywords: ['分类未找到', '在线工具', '开发者工具', 'DevTool', 'ToolBox'],
        path: `/category/${props.categoryId}`
      })
      return
    }

    const path = `/category/${current.id}`
    const toolNames = current.tools.map(tool => tool.name)
    const keywords = [
      ...new Set([
        current.name,
        `${current.name}在线`,
        ...toolNames,
        ...current.tools.flatMap(tool => tool.keywords),
        '在线工具',
        '开发者工具',
        'DevTool',
        'ToolBox'
      ])
    ]
    const description = `ToolBox ${current.name}分类，包含 ${toolNames.join('、')} 等在线开发者工具。`

    setSeo({
      title: `${current.name} - ToolBox 在线工具`,
      description,
      keywords,
      path,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${current.name} - ${siteConfig.name}`,
        url: getAbsoluteUrl(path),
        inLanguage: 'zh-CN',
        description,
        isPartOf: {
          '@type': 'WebApplication',
          name: siteConfig.name,
          url: getAbsoluteUrl('/')
        },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: current.tools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: tool.name,
            description: tool.description,
            url: getAbsoluteUrl(tool.path)
          }))
        }
      }
    })
  },
  { immediate: true }
)
</script>

<style scoped>
.category-view {
  min-height: calc(100vh - var(--header-height) - 1px);
  min-height: calc(100dvh - var(--header-height) - 1px);
  padding: clamp(16px, 2vw, 24px);
  color: var(--color-text-primary);
}

.category-panel {
  min-height: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  overflow: hidden;
}

.category-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--color-border);
}

.category-heading__main {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

.category-heading__mark {
  width: 10px;
  height: 34px;
  flex: 0 0 10px;
  border-radius: var(--radius-pill);
  background: var(--category-color);
}

.category-heading__copy {
  min-width: 0;
}

.category-kicker {
  margin: 0 0 4px;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.category-heading h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(22px, 2vw, 28px);
  line-height: 1.2;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-count {
  flex: 0 0 auto;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--category-color) 26%, var(--color-border));
  border-radius: var(--radius-pill);
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--category-color) 8%, var(--color-surface));
  font-size: var(--font-size-xs);
  font-weight: 500;
}

/* 与首页快速开始同风格：一行四列 */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.tool-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  min-width: 0;
  min-height: 96px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  text-decoration: none;
  background: var(--color-surface);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.tool-card:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

.tool-icon {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: color var(--transition-fast);
}

.tool-card:hover .tool-icon {
  color: var(--color-text-primary);
}

.tool-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tool-copy strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.35;
  font-weight: 500;
}

.tool-copy small {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.empty-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.empty-state p {
  margin: 0;
}

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height) - 1px);
  min-height: calc(100dvh - var(--header-height) - 1px);
  padding: var(--spacing-xl);
}

.not-found-panel {
  width: min(100%, 360px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
}

.not-found-code {
  margin: 0;
  color: var(--color-primary);
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
}

.not-found-title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: 1.35;
}

.not-found-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.not-found-action {
  min-height: 36px;
  margin-top: var(--spacing-sm);
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background-color var(--transition-fast);
}

.not-found-action:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg-secondary);
}

@media (max-width: 1180px) {
  .tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .category-view {
    padding: var(--spacing-lg);
  }

  .category-heading {
    align-items: flex-start;
    padding: 16px;
  }

  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .category-view {
    padding: var(--spacing-md);
  }

  .category-heading {
    flex-direction: column;
  }

  .tool-grid {
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .tool-card {
    min-height: 76px;
  }
}
</style>
