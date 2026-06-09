<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides" :hljs="hljs">
    <n-message-provider>
      <div class="tool-view">
        <component :is="toolComponent" v-if="toolComponent" />

        <div v-if="!tool" class="not-found">
          <n-result
            status="404"
            title="工具未找到"
            description="抱歉，找不到该工具"
          >
            <template #footer>
              <n-button @click="router.push('/')">返回首页</n-button>
            </template>
          </n-result>
        </div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, watch, provide, shallowRef, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NConfigProvider, NMessageProvider, NResult } from 'naive-ui'
import type { HLJSApi } from 'highlight.js'
import { getToolById, getToolCategoryName } from '@/tools/catalog'
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
const hljs = shallowRef<HLJSApi>()
let componentLoadVersion = 0
let hljsLoading: Promise<void> | null = null

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
    const version = ++componentLoadVersion
    toolComponent.value = null

    if (!newTool) {
      return
    }

    void loadHighlight()

    const { getToolComponentById } = await import('@/tools')

    if (version === componentLoadVersion) {
      toolComponent.value = getToolComponentById(newTool.id) ?? null
    }
  },
  { immediate: true }
)

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
  width: min(100%, var(--content-max-width));
  margin: 0 auto;
  min-height: 100%;
  padding-top: var(--spacing-sm);
}

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-xl);
}

@media (max-width: 720px) {
  .tool-view :deep(.tool-container) {
    width: 100%;
  }
}
</style>
