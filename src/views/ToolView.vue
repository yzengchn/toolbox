<template>
  <div class="tool-view">
    <n-button
      v-if="tool"
      circle
      quaternary
      size="large"
      class="favorite-button"
      :class="{ active: isFavorite }"
      :title="isFavorite ? '取消收藏' : '收藏工具'"
      @click="toggleFavorite"
    >
      <template #icon>
        <n-icon size="22">
          <svg viewBox="0 0 24 24">
            <path :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 2.8L14.9 8.68L21.4 9.63L16.7 14.21L17.81 20.68L12 17.62L6.19 20.68L7.3 14.21L2.6 9.63L9.1 8.68L12 2.8Z" />
          </svg>
        </n-icon>
      </template>
    </n-button>

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
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NResult, NButton, NIcon } from 'naive-ui'
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

const toolComponent = computed(() => {
  if (!tool.value) return null

  // 记录最近使用
  appStore.addRecentTool(props.toolId)

  return tool.value.component
})

// 更新页面标题和meta描述
watch(
  tool,
  (newTool) => {
    if (newTool) {
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
}

.favorite-button {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 5;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.favorite-button.active {
  color: #f5a524;
}

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
