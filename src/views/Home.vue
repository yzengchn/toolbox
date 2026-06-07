<template>
  <div class="home">
    <section class="home-hero">
      <div class="hero-copy">
        <p class="eyebrow">Developer Workbench</p>
        <h1>ToolBox</h1>
        <p class="description">编码、格式化、网络、时间和车联网调试工具集中工作台。</p>
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
            :to="category.tools[0]?.path || '/home'"
            class="category-card"
          >
            <span class="category-mark">{{ category.name.charAt(0) }}</span>
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
import { allTools, toolCategories } from '@/tools'

const populatedCategories = toolCategories.filter(category => category.tools.length > 0)
const featuredTools = allTools.slice(0, 8)

onMounted(() => {
  document.title = 'ToolBox'
})
</script>

<style scoped>
.home {
  width: min(100%, var(--content-max-width));
  min-height: 100%;
  margin: 0 auto;
  padding: var(--spacing-2xl);
  color: var(--color-text-primary);
}

.home-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-xl);
  min-height: 220px;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-2xl);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: none;
}

.eyebrow {
  margin: 0 0 var(--spacing-sm);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(36px, 6vw, 68px);
  line-height: 0.95;
  font-weight: 850;
  color: var(--color-text-primary);
  letter-spacing: 0;
}

.description {
  max-width: 560px;
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.hero-stats {
  display: flex;
  gap: var(--spacing-md);
  flex: 0 0 auto;
}

.stat {
  min-width: 104px;
  padding: var(--spacing-lg);
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
  font-size: var(--font-size-3xl);
  font-weight: 850;
  line-height: 1;
}

.stat-label {
  margin-top: var(--spacing-xs);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.35fr);
  gap: var(--spacing-xl);
  align-items: start;
}

.panel {
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
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--color-border);
}

.panel-heading h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.panel-heading span {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.category-list,
.tool-grid {
  display: grid;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
}

.category-card,
.tool-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
  padding: var(--spacing-md);
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
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 850;
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
}

.category-copy small,
.tool-copy small {
  margin-top: 2px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 980px) {
  .home {
    padding: var(--spacing-xl);
  }

  .home-hero,
  .home-grid {
    grid-template-columns: 1fr;
  }

  .home-grid {
    display: grid;
  }

  .home-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .home {
    padding: var(--spacing-lg);
  }

  .home-hero {
    padding: var(--spacing-xl);
  }

  .hero-stats,
  .tool-grid {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .hero-stats {
    display: grid;
  }
}
</style>
