<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :hljs="hljs">
    <n-message-provider>
      <div class="tool-view">
        <component :is="toolComponent" v-if="toolComponent" />

        <div v-else-if="tool && toolLoading" class="tool-loading" role="status" aria-live="polite">
          <span class="tool-loading-spinner"></span>
          <span>工具加载中...</span>
        </div>

        <div v-else-if="tool && toolLoadError" class="not-found">
          <div class="not-found-panel" role="status">
            <p class="not-found-title">工具加载失败</p>
            <p class="not-found-description">{{ toolLoadError }}</p>
            <button type="button" class="not-found-action" @click="reloadToolComponent">
              重新加载
            </button>
          </div>
        </div>

        <div v-if="!tool" class="not-found">
          <div class="not-found-panel" role="status">
            <p class="not-found-code">404</p>
            <p class="not-found-title">工具未找到</p>
            <p class="not-found-description">抱歉，找不到该工具</p>
            <button type="button" class="not-found-action" @click="router.push('/')">
              返回首页
            </button>
          </div>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, watch, provide, shallowRef, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import type { HLJSApi } from 'highlight.js'
import { getToolById, getToolCategoryName } from '@/tools/catalog'
import { loadToolComponent } from '@/tools/componentLoaders'
import { useAppStore } from '@/stores/app'
import { useNaiveTheme } from '@/composables/useNaiveTheme'
import { getAbsoluteUrl, setSeo, siteConfig } from '@/utils/seo'

const props = defineProps<{
  toolId: string
}>()

const router = useRouter()
const appStore = useAppStore()
const { naiveTheme, naiveThemeOverrides } = useNaiveTheme()

const tool = computed(() => getToolById(props.toolId))
const isFavorite = computed(() => appStore.isFavorite(props.toolId))

const toggleFavorite = () => {
  appStore.toggleFavorite(props.toolId)
}

// 通过 provide 提供给子组件使用
provide('toolId', props.toolId)
provide('isFavorite', isFavorite)
provide('toggleFavorite', toggleFavorite)

const toolComponent = shallowRef<Component | null>(null)
const toolLoading = shallowRef(false)
const toolLoadError = shallowRef('')
const hljs = shallowRef<HLJSApi>()
let hljsLoading: Promise<void> | null = null
let toolLoadRequestId = 0
const highlightToolIds = new Set([
  'url-encoder',
  'jt808-jt809-parser',
  'jt1078-stream-parser',
  'gb32960-parser'
])

const loadHighlight = () => {
  if (hljs.value) {
    return Promise.resolve()
  }

  if (hljsLoading) {
    return hljsLoading
  }

  hljsLoading = Promise.all([
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/javascript'),
    import('highlight.js/lib/languages/plaintext')
  ])
    .then(([coreModule, javascriptModule, plaintextModule]) => {
      const instance = coreModule.default

      instance.registerLanguage('javascript', javascriptModule.default)
      instance.registerLanguage('plaintext', plaintextModule.default)
      instance.registerLanguage('text', plaintextModule.default)
      hljs.value = instance
    })
    .catch((error) => {
      console.error('Load highlight.js failed:', error)
    })
    .finally(() => {
      hljsLoading = null
    })

  return hljsLoading
}

watch(
  tool,
  async (newTool) => {
    const requestId = ++toolLoadRequestId
    toolComponent.value = null
    toolLoadError.value = ''

    if (!newTool) {
      toolLoading.value = false
      return
    }

    toolLoading.value = true

    if (highlightToolIds.has(newTool.id)) {
      void loadHighlight()
    }

    try {
      const component = await loadToolComponent(newTool.id)

      if (requestId !== toolLoadRequestId) {
        return
      }

      toolComponent.value = component ?? null
      if (!component) {
        toolLoadError.value = '没有找到该工具组件'
      }
    } catch (error) {
      if (requestId !== toolLoadRequestId) {
        return
      }

      toolLoadError.value = error instanceof Error ? error.message : '工具组件加载失败'
      console.error('Load tool component failed:', error)
    } finally {
      if (requestId === toolLoadRequestId) {
        toolLoading.value = false
      }
    }
  },
  { immediate: true }
)

const reloadToolComponent = () => {
  const currentTool = tool.value
  if (!currentTool) return

  const requestId = ++toolLoadRequestId
  toolComponent.value = null
  toolLoadError.value = ''
  toolLoading.value = true

  void loadToolComponent(currentTool.id)
    .then((component) => {
      if (requestId !== toolLoadRequestId) return

      toolComponent.value = component ?? null
      if (!component) {
        toolLoadError.value = '没有找到该工具组件'
      }
    })
    .catch((error) => {
      if (requestId !== toolLoadRequestId) return

      toolLoadError.value = error instanceof Error ? error.message : '工具组件加载失败'
      console.error('Reload tool component failed:', error)
    })
    .finally(() => {
      if (requestId === toolLoadRequestId) {
        toolLoading.value = false
      }
    })
}

// 更新页面标题和meta描述
watch(
  tool,
  (newTool) => {
    if (newTool) {
      appStore.addRecentTool(newTool.id)
      const categoryName = getToolCategoryName(newTool.category)
      const title = `${newTool.name} - 在线${categoryName} - ToolBox DevTool`
      const description = `${newTool.description}。ToolBox 在线开发者工具箱，提供 ${newTool.name}、在线工具、开发者工具和常用 DevTool 能力。`
      const keywords = [
        newTool.name,
        `${newTool.name}在线`,
        categoryName,
        ...newTool.keywords,
        '在线工具',
        '开发者工具',
        'DevTool',
        'ToolBox'
      ]

      setSeo({
        title,
        description,
        keywords,
        path: newTool.path,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: newTool.name,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          url: getAbsoluteUrl(newTool.path),
          inLanguage: 'zh-CN',
          description,
          keywords: keywords.join(','),
          isPartOf: {
            '@type': 'WebApplication',
            name: siteConfig.name,
            url: getAbsoluteUrl('/')
          },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'CNY'
          }
        }
      })
    } else {
      setSeo({
        title: '工具未找到 - ToolBox 在线工具',
        description: 'ToolBox 在线开发者工具箱未找到该工具，请返回首页选择 JSON 格式化、Base64 编码、JWT 解码、时间戳转换等在线工具。',
        keywords: ['工具未找到', '在线工具', '开发者工具', 'DevTool', 'ToolBox'],
        path: '/'
      })
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.tool-view {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  background: var(--color-bg-primary);
}

.tool-view :deep(.tool-container) {
  width: 100%;
  max-width: var(--content-max-width);
  margin-inline: 0 auto;
  min-height: 100%;
  padding-top: var(--spacing-sm);
}

.tool-loading {
  min-height: min(320px, 48vh);
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.tool-loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 999px;
  animation: tool-loading-spin 0.78s linear infinite;
}

@keyframes tool-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
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

</style>
