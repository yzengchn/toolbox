<template>
  <div class="home">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="eyebrow">在线工具 · DevTool</p>
        <p id="home-title" class="home-title">ToolBox 在线开发者工具箱</p>
        <p class="description">
          面向开发者的在线工具集合，覆盖 JSON 格式化、Base64 编码解码、JWT 解码、时间戳转换、正则表达式、CIDR 网段计算器、端口扫描，以及 JT808、GB32960、CAN/J1939、OCPP、VIN 等车联网工具场景。
        </p>
      </div>

      <div class="hero-stats" aria-label="工具统计">
        <div class="stat">
          <span class="stat-value">{{ allTools.length }}</span>
          <span class="stat-label">工具</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ toolCategories.length }}</span>
          <span class="stat-label">分类</span>
        </div>
      </div>
    </section>

    <section class="home-grid">
      <div class="panel categories-panel">
        <div class="panel-heading">
          <h2>分类</h2>
          <span>{{ toolCategories.length }} groups</span>
        </div>

        <div class="category-list">
          <router-link
            v-for="category in populatedCategories"
            :key="category.id"
            :to="`/category/${category.id}`"
            class="category-card"
            :style="{ '--category-color': category.color }"
          >
            <span class="category-mark" aria-hidden="true"></span>
            <span class="category-copy">
              <strong>{{ category.name }}</strong>
              <small>{{ category.tools.length }} 个工具</small>
            </span>
          </router-link>
        </div>
      </div>

      <div class="panel tools-panel">
        <div class="panel-heading">
          <h2>快速开始</h2>
          <span>常用入口</span>
        </div>

        <div class="tool-grid">
          <router-link
            v-for="tool in featuredTools"
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
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { allTools, getToolCategoryColor, getToolsByIds, toolCategories } from '@/tools/catalog'
import { prefetchToolPage } from '@/tools/prefetch'

const populatedCategories = toolCategories
  .filter(category => category.tools.length > 0)
  .map(category => ({
    ...category,
    color: getToolCategoryColor(category.id)
  }))

const featuredTools = getToolsByIds([
  'json-formatter',
  'base64-encoder',
  'jwt-decoder',
  'timestamp-converter',
  'subnet-calculator',
  'password-generator',
  'regex-tester',
  'geohash-tool',
  'qrcode-generator'
]).slice(0, 9)

const updateHomeSeo = async () => {
  const { setSeo, siteConfig } = await import('@/utils/seo')

  setSeo({
    title: siteConfig.title,
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    path: '/'
  })
}

onMounted(() => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      void updateHomeSeo()
    }, { timeout: 2000 })
    return
  }

  globalThis.setTimeout(() => {
    void updateHomeSeo()
  }, 0)
})
</script>

<style scoped>
.home {
  height: calc(100vh - var(--header-height) - 1px);
  height: calc(100dvh - var(--header-height) - 1px);
  padding: clamp(16px, 2vw, 24px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--spacing-lg);
  overflow: hidden;
  color: var(--color-text-primary);
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: clamp(16px, 3vw, 32px);
  min-height: 0;
  padding: clamp(16px, 2vw, 22px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: none;
}

.eyebrow {
  margin: 0 0 var(--spacing-sm);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.home-title {
  margin: 0;
  font-size: clamp(22px, 2.2vw, 30px);
  line-height: 1.18;
  font-weight: 500;
  color: var(--color-text-primary);
  letter-spacing: 0;
}

.description {
  max-width: 820px;
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-base);
  line-height: 1.55;
  color: var(--color-text-secondary);
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(84px, 1fr));
  gap: var(--spacing-sm);
  flex: 0 0 auto;
}

.stat {
  min-width: 84px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.stat-value,
.stat-label {
  display: block;
}

.stat-value {
  color: var(--color-primary);
  font-size: 22px;
  font-weight: 500;
  line-height: 1;
}

.stat-label {
  margin-top: var(--spacing-xs);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: var(--spacing-lg);
  align-items: start;
  min-height: 0;
}

.panel {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: none;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex: 0 0 auto;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--color-border);
}

.panel-heading h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  font-weight: 500;
}

.panel-heading span {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.category-list,
.tool-grid {
  display: grid;
  gap: var(--spacing-sm);
  min-height: 0;
  padding: var(--spacing-md);
  overflow: hidden;
}

.category-list {
  grid-auto-rows: minmax(44px, 1fr);
}

.category-card,
.tool-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
  padding: 10px 12px;
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

.category-card:hover,
.tool-card:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

.category-mark,
.tool-icon {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 500;
}

.category-mark {
  flex-basis: 8px;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--category-color);
}

.tool-icon {
  flex-basis: 24px;
  width: 24px;
  height: 24px;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.tool-card:hover .tool-icon {
  color: var(--color-text-primary);
}

.category-copy,
.tool-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.category-copy strong,
.tool-copy strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.35;
  font-weight: 500;
}

.category-copy small,
.tool-copy small {
  margin-top: 2px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.tool-grid {
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
}

.tool-card {
  min-height: 0;
}

@media (max-width: 980px) {
  .home {
    padding: var(--spacing-lg);
    gap: var(--spacing-md);
  }

  .home-grid {
    grid-template-columns: minmax(200px, 240px) minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .home-hero {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .hero-stats {
    width: min(100%, 220px);
  }
}

@media (max-height: 720px) {
  .home {
    padding: var(--spacing-lg);
    gap: var(--spacing-md);
  }

  .home-hero {
    padding: var(--spacing-lg);
  }

  .description {
    -webkit-line-clamp: 1;
  }

  .panel-heading {
    padding: 12px 14px 8px;
  }

  .category-list,
  .tool-grid {
    padding: 10px;
  }
}

@media (max-width: 640px) {
  .home {
    padding: var(--spacing-md);
  }

  .home-hero {
    padding: var(--spacing-md);
  }

  .home-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .hero-stats {
    width: 100%;
    display: grid;
  }

  .categories-panel {
    height: auto;
  }

  .category-list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: 36px;
  }

  .category-card {
    justify-content: center;
    padding: 8px;
  }

  .category-mark,
  .category-copy small {
    display: none;
  }

  .category-copy {
    align-items: center;
  }

  .category-copy strong {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
  }

  .tool-card {
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: 8px;
    text-align: center;
  }

  .tool-copy {
    align-items: center;
  }

  .tool-copy strong {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tool-copy small {
    -webkit-line-clamp: 1;
  }
}

@media (max-width: 420px), (max-height: 620px) {
  .eyebrow,
  .description,
  .categories-panel .panel-heading span,
  .category-copy small {
    display: none;
  }

  .home-title {
    font-size: clamp(20px, 5.5vw, 24px);
  }

  .category-list {
    grid-auto-rows: 32px;
  }

  .category-mark {
    flex-basis: 8px;
    width: 8px;
    height: 8px;
  }

  .tool-card {
    padding: 8px;
  }
}
</style>
