<template>
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
</template>

<script setup lang="ts">
import { computed, watch, provide } from 'vue'
import { useRouter } from 'vue-router'
import { NResult, NButton } from 'naive-ui'
import { getToolById } from '@/tools'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  toolId: string
}>()

const router = useRouter()
const appStore = useAppStore()

const tool = computed(() => getToolById(props.toolId))
const isFavorite = computed(() => appStore.isFavorite(props.toolId))

const toggleFavorite = () => {
  appStore.toggleFavorite(props.toolId)
}

// 通过 provide 提供给子组件使用
provide('toolId', props.toolId)
provide('isFavorite', isFavorite)
provide('toggleFavorite', toggleFavorite)

const toolComponent = computed(() => {
  if (!tool.value) return null

  return tool.value.component
})

// 更新页面标题和meta描述
watch(
  tool,
  (newTool) => {
    if (newTool) {
      appStore.addRecentTool(newTool.id)
      document.title = `${newTool.name} - ToolBox`

      // 更新meta描述
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', `${newTool.description} - ToolBox 在线开发者工具箱`)

      // 更新meta关键词
      let metaKeywords = document.querySelector('meta[name="keywords"]')
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta')
        metaKeywords.setAttribute('name', 'keywords')
        document.head.appendChild(metaKeywords)
      }
      const keywords = [...newTool.keywords, newTool.name, 'ToolBox', '在线工具'].join(',')
      metaKeywords.setAttribute('content', keywords)
    } else {
      document.title = 'ToolBox'
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
