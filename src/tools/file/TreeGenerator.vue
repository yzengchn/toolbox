<template>
  <div class="tool-container">
    <ToolHeader
      title="树形目录生成器"
      description="像文件管理器一样添加目录与文件节点，实时生成可复制的树形目录结构，支持 GitHub 风格、连接线与缩进输出"
    />

    <div class="tool-content">
      <n-card class="options-card">
        <n-space align="center" :size="16" :wrap="true">
          <span class="opt-label">输出风格</span>
          <n-radio-group v-model:value="optStyle" size="small">
            <n-radio-button value="github">GitHub</n-radio-button>
            <n-radio-button value="simple">连接线</n-radio-button>
            <n-radio-button value="space">纯缩进</n-radio-button>
          </n-radio-group>

          <n-checkbox v-model:checked="optTrailingSlash">目录名补 / 后缀</n-checkbox>
          <n-checkbox v-model:checked="optShowFiles">仅目录</n-checkbox>

          <div class="stats-inline">
            <span class="stat-inline stat-inline--dir">📁 {{ stats.dirs }}</span>
            <span class="stat-inline stat-inline--file">📝 {{ stats.files }}</span>
            <span class="stat-inline stat-inline--depth">⇅ {{ stats.maxDepth }}</span>
          </div>
        </n-space>
      </n-card>

      <div class="split-grid">
        <n-card title="结构编辑" class="input-card">
          <template #header-extra>
            <n-space :size="8">
              <n-button quaternary size="small" @click="setCollapsed(false)">展开</n-button>
              <n-button quaternary size="small" @click="setCollapsed(true)">折叠</n-button>
              <n-button quaternary size="small" @click="importOpen = !importOpen">导入文本</n-button>
              <n-button quaternary size="small" @click="loadSample">示例</n-button>
              <n-button quaternary size="small" @click="clearAll">清空</n-button>
            </n-space>
          </template>

          <template v-if="importOpen">
            <n-input
              v-model:value="importText"
              type="textarea"
              placeholder="粘贴目录树或缩进文本，点击下方解析后生成节点结构"
              :autosize="{ minRows: 6, maxRows: 14 }"
              class="import-input"
            />
            <n-space :size="8" class="import-actions">
              <n-button size="small" type="primary" @click="applyImport">解析为节点</n-button>
              <n-button size="small" quaternary @click="importOpen = false">取消</n-button>
            </n-space>
          </template>

          <button
            v-else-if="roots.length === 0"
            type="button"
            class="empty-hint"
            title="点击创建第一个目录"
            @click="addRoot"
          >
            点击此处添加第一个节点
          </button>

          <ul v-else class="node-tree" role="tree" aria-label="目录结构">
            <TreeNodeRow
              v-for="(node, i) in roots"
              :key="node.id"
              :node="node"
              :parent-list="roots"
              :index="i"
            />
          </ul>
        </n-card>

        <n-card title="预览" class="preview-card">
          <template #header-extra>
            <n-space :size="8">
              <n-button secondary size="small" :disabled="!outputText" @click="copyOutput">
                复制
              </n-button>
              <n-button type="primary" size="small" :disabled="!outputText" @click="copyAsMarkdown">
                复制为 Markdown
              </n-button>
            </n-space>
          </template>
          <pre class="tree-preview" aria-label="树形目录预览">{{
            outputText || '在左侧添加节点，此处实时生成树形预览'
          }}</pre>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import {
  NButton,
  NCard,
  NCheckbox,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSpace,
  useMessage
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useStorage } from '@/composables/useStorage'
import TreeNodeRow from './TreeNodeRow.vue'
import {
  appendChild,
  insertSibling,
  makeNode,
  parseTextToTree,
  removeAt,
  renderTree,
  replaceRoots,
  SAMPLE_TREE,
  statTree,
  treeOpsKey,
  walk,
  type TreeNode,
  type TreeOps,
  type TreeStyle
} from './treeTypes'

const message = useMessage()
const { copy } = useClipboard()

const optStyle = ref<TreeStyle>('github')
const optTrailingSlash = ref(true)
const optShowFiles = ref(false)

const { data: roots } = useStorage<TreeNode[]>('tree-generator-nodes', [])
const importOpen = ref(false)
const importText = ref('')

/** 新建节点 id：挂载后自动就地编辑，不持久化 */
const pendingAutoEdit = new Set<string>()
const markAutoEdit = (node: TreeNode) => {
  pendingAutoEdit.add(node.id)
  return node
}

const treeOps: TreeOps = {
  shouldAutoEdit: (id) => pendingAutoEdit.has(id),
  insertSibling: (arr, index) => {
    markAutoEdit(insertSibling(arr, index))
  },
  appendChild: (parent, dir) => {
    markAutoEdit(appendChild(parent, dir))
  },
  removeAt
}
provide(treeOpsKey, treeOps)

const addRoot = () => {
  roots.value.push(markAutoEdit(makeNode(true)))
}

const setCollapsed = (collapsed: boolean) => {
  walk(roots.value, (node) => {
    node.collapsed = collapsed
  })
}

const clearAll = () => replaceRoots(roots.value, [])

const applyImport = () => {
  const parsed = parseTextToTree(importText.value)
  if (parsed.length === 0) {
    message.warning('未解析到任何节点')
    return
  }
  replaceRoots(roots.value, parsed)
  importOpen.value = false
  importText.value = ''
  message.success(`已导入 ${parsed.length} 个根节点`)
}

const loadSample = () => {
  replaceRoots(roots.value, parseTextToTree(SAMPLE_TREE))
  message.success('已加载示例结构')
}

const stats = computed(() => statTree(roots.value))
const outputText = computed(() => {
  if (roots.value.length === 0) return ''
  return renderTree(roots.value, optStyle.value, optTrailingSlash.value, optShowFiles.value)
})

const copyOutput = () => {
  if (!outputText.value) return
  copy(outputText.value, '已复制树形结构到剪贴板')
}

const copyAsMarkdown = () => {
  if (!outputText.value) return
  copy(`\`\`\`tree\n${outputText.value}\n\`\`\``, '已复制为 Markdown 代码块到剪贴板')
}
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.options-card {
  flex-shrink: 0;
}

.opt-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stats-inline {
  display: flex;
  gap: var(--spacing-sm);
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.stat-inline {
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  min-width: 64px;
  text-align: center;
}

.stat-inline--dir {
  color: #f59e0b;
}

.stat-inline--file {
  color: #60a5fa;
}

.stat-inline--depth {
  color: var(--color-text-secondary);
}

.split-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  align-items: stretch;
}

.input-card,
.preview-card {
  display: flex;
  flex-direction: column;
}

.input-card :deep(.n-card__content),
.preview-card :deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.import-input {
  margin-bottom: var(--spacing-sm);
}

.import-actions {
  margin-bottom: var(--spacing-sm);
}

.empty-hint {
  display: block;
  width: 100%;
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-tertiary);
  font: inherit;
  font-size: var(--font-size-sm);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background var(--transition-fast);
}

.empty-hint:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.node-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree-preview {
  flex: 1;
  margin: 0;
  padding: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-primary);
  white-space: pre;
  overflow: auto;
  min-height: 420px;
  max-height: 70vh;
}

@media (max-width: 900px) {
  .split-grid {
    grid-template-columns: 1fr;
  }
}
</style>
