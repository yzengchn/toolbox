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

          <n-checkbox v-model:checked="optTrailingSlash">
            目录名补 / 后缀
          </n-checkbox>
          <n-checkbox v-model:checked="optShowFiles">
            仅目录
          </n-checkbox>

          <div class="stats-inline">
            <span class="stat-inline stat-inline--dir">📁 {{ statDirs }}</span>
            <span class="stat-inline stat-inline--file">📝 {{ statFiles }}</span>
            <span class="stat-inline stat-inline--depth">⇅ {{ statDepth }}</span>
          </div>
        </n-space>
      </n-card>

      <div class="split-grid">
        <n-card title="结构编辑" class="input-card">
          <template #header-extra>
            <n-space :size="8">
              <n-button quaternary size="small" @click="expandAll">展开</n-button>
              <n-button quaternary size="small" @click="collapseAll">折叠</n-button>
              <n-button quaternary size="small" @click="toggleImport">导入文本</n-button>
              <n-button quaternary size="small" @click="loadSample">示例</n-button>
              <n-button quaternary size="small" @click="handleClearAll">清空</n-button>
            </n-space>
          </template>

          <n-input
            v-if="importOpen"
            v-model:value="importText"
            type="textarea"
            placeholder="粘贴目录树或缩进文本，点击下方解析后生成节点结构"
            :autosize="{ minRows: 6, maxRows: 14 }"
            class="import-input"
          />
          <n-space v-if="importOpen" :size="8" style="margin-bottom: var(--spacing-sm)">
            <n-button size="small" type="primary" @click="applyImport">解析为节点</n-button>
            <n-button size="small" quaternary @click="importOpen = false">取消</n-button>
          </n-space>

          <button
            v-if="roots.length === 0 && !importOpen"
            type="button"
            class="empty-hint"
            title="点击创建第一个目录"
            @click="addRoot(true)"
          >
            点击此处添加第一个节点
          </button>

          <ul v-if="roots.length" class="node-tree" role="tree" aria-label="目录结构">
            <NodeRow
              v-for="(node, i) in roots"
              :key="node.id"
              :node="node"
              :is-last="i === roots.length - 1"
              :auto-edit="pendingAutoEdit.has(node.id)"
              :add-sibling="() => addSiblingAt(roots, i)"
              :add-child="(dir) => addChild(node, dir)"
              :remove="() => removeAt(roots, i)"
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
          <pre ref="previewRef" class="tree-preview" aria-label="树形目录预览">{{ outputText || '在左侧添加节点，此处实时生成树形预览' }}</pre>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, nextTick, onMounted } from 'vue'
import { NButton, NCard, NCheckbox, NInput, NRadioGroup, NRadioButton, NSpace, useMessage } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useStorage } from '@/composables/useStorage'

const message = useMessage()
const { copy } = useClipboard()

type Style = 'github' | 'simple' | 'space'

interface TreeNode {
  id: string
  name: string
  isDirectory: boolean
  /** 折叠状态：仅目录有意义；折叠时子节点不渲染但仍参与输出 */
  collapsed: boolean
  children: TreeNode[]
}

/** 递归生成 id：内部计数器，不依赖 Math.random 以保证 SSR/快照一致 */
let idSeq = 1
const newId = () => `tn-${idSeq++}`

const optStyle = ref<Style>('github')
const optTrailingSlash = ref(true)
const optShowFiles = ref(false)

/** 节点树本体 + 持久化 */
const { data: roots } = useStorage<TreeNode[]>('tree-generator-nodes', [])

/** 文本导入面板 */
const importOpen = ref(false)
const importText = ref('')

const previewRef = ref<HTMLPreElement | null>(null)

/* ---------- 节点编辑 ---------- */

/** 待自动进入就地编辑的节点 id 集合：新建节点入列，开始编辑后移除。不持久化——仅本次会话有效。 */
const pendingAutoEdit = new Set<string>()

const makeNode = (dir: boolean): TreeNode => ({
  id: newId(),
  name: dir ? '新建目录' : '新建文件',
  isDirectory: dir,
  collapsed: false,
  children: []
})

const addRoot = (dir: boolean) => {
  const node = makeNode(dir)
  pendingAutoEdit.add(node.id)
  roots.value.push(node)
}

/** 在数组第 i 个节点后插入同级节点 */
const addSiblingAt = (arr: TreeNode[], i: number) => {
  const node = makeNode(true)
  pendingAutoEdit.add(node.id)
  arr.splice(i + 1, 0, node)
}

const addChild = (parent: TreeNode, dir: boolean) => {
  parent.isDirectory = true
  parent.collapsed = false
  const node = makeNode(dir)
  pendingAutoEdit.add(node.id)
  parent.children.push(node)
}

const removeAt = (arr: TreeNode[], i: number) => {
  arr.splice(i, 1)
}

const expandAll = () => { walk(roots.value, (n) => { n.collapsed = false }) }
const collapseAll = () => { walk(roots.value, (n) => { n.collapsed = true }) }
const walk = (nodes: TreeNode[], fn: (n: TreeNode) => void) => {
  for (const n of nodes) { fn(n); if (n.children.length) walk(n.children, fn) }
}

const handleClearAll = () => {
  roots.value.splice(0, roots.value.length)
}

const toggleImport = () => { importOpen.value = !importOpen.value }

const applyImport = () => {
  const parsed = parseTextToTree(importText.value)
  if (parsed.length === 0) { message.warning('未解析到任何节点'); return }
  roots.value.splice(0, roots.value.length, ...parsed)
  importOpen.value = false
  importText.value = ''
  message.success(`已导入 ${parsed.length} 个根节点`)
}

/* ---------- 文本 → 节点树 解析（兼容 GitHub 树 / 缩进） ---------- */
function parseTextToTree(text: string): TreeNode[] {
  const rawLines = text.split(/\r\n|\r|\n/)
  const entries: { depth: number; name: string }[] = []
  for (const raw of rawLines) {
    let line = raw.replace(/^[│| ]*[├└]──[ ]?/, '').replace(/^[│| ]*[├└]─[ ]?/, '')
    line = line.replace(/^[│|]+\s*/, '')
    const tabMatch = line.match(/^[\t]+/)
    if (tabMatch) {
      const leading = tabMatch[0]
      const name = line.slice(leading.length).trim()
      if (name) entries.push({ depth: leading.replace(/\t/g, '  ').length / 2, name })
      continue
    }
    const spaceMatch = line.match(/^ +/)
    if (spaceMatch) {
      const spaces = spaceMatch[0].length
      const name = line.slice(spaces).trim()
      if (name) entries.push({ depth: Math.floor(spaces / 2), name })
      continue
    }
    const name = line.trim()
    if (name) entries.push({ depth: 0, name })
  }

  const result: TreeNode[] = []
  const stack: TreeNode[] = []
  for (let i = 0; i < entries.length; i++) {
    const { depth, name } = entries[i]
    const isDirectory = name.endsWith('/') || (i + 1 < entries.length && entries[i + 1].depth > depth)
    const node: TreeNode = {
      id: newId(),
      name: name.replace(/\/$/, ''),
      isDirectory,
      collapsed: false,
      children: []
    }
    stack.length = Math.max(0, depth)
    if (depth === 0) result.push(node)
    else if (stack[depth - 1]) stack[depth - 1].children.push(node)
    else result.push(node)
    stack[depth] = node
  }
  return result
}

/* ---------- 统计 + 输出 ---------- */
function statTree(nodes: TreeNode[], depth = 1): { dirs: number; files: number; maxDepth: number } {
  let dirs = 0, files = 0, maxDepth = depth
  for (const n of nodes) {
    if (n.isDirectory) {
      dirs += 1
      const c = statTree(n.children, depth + 1)
      dirs += c.dirs; files += c.files
      if (c.maxDepth > maxDepth) maxDepth = c.maxDepth
    } else files += 1
  }
  return { dirs, files, maxDepth }
}

function connectors(style: Style) {
  if (style === 'simple') return { mid: '+-- ', last: '\\-- ', vert: '|   ', empty: '    ' }
  if (style === 'space') return { mid: '  ', last: '  ', vert: '  ', empty: '  ' }
  return { mid: '├── ', last: '└── ', vert: '│   ', empty: '    ' }
}

function render(nodes: TreeNode[], style: Style, trailingSlash: boolean, onlyDirs: boolean, prefix = ''): string {
  const c = connectors(style)
  const visible = onlyDirs ? nodes.filter(n => n.isDirectory) : nodes
  const out: string[] = []
  visible.forEach((node, i) => {
    const isLast = i === visible.length - 1
    const branch = isLast ? c.last : c.mid
    const childPrefix = prefix + (isLast ? c.empty : c.vert)
    const label = node.isDirectory && trailingSlash ? `${node.name}/` : node.name
    out.push(prefix + branch + label)
    if (node.children.length) {
      out.push(render(node.children, style, trailingSlash, onlyDirs, childPrefix))
    }
  })
  return out.join('\n')
}

const stats = computed(() => statTree(roots.value))
const statDirs = computed(() => stats.value.dirs)
const statFiles = computed(() => stats.value.files)
const statDepth = computed(() => stats.value.maxDepth)

const outputText = computed(() => {
  if (roots.value.length === 0) return ''
  return render(roots.value, optStyle.value, optTrailingSlash.value, optShowFiles.value)
})

const copyOutput = () => {
  if (!outputText.value) return
  copy(outputText.value, '已复制树形结构到剪贴板')
}

const copyAsMarkdown = () => {
  if (!outputText.value) return
  copy('```tree\n' + outputText.value + '\n```', '已复制为 Markdown 代码块到剪贴板')
}

/* ---------- 示例 ---------- */
const loadSample = () => {
  const sample = `src
  components
    ToolHeader.vue
    FavoriteButton.vue
  views
    Home.vue
    ToolView.vue
  tools
    file
      TreeGenerator.vue
      FileDedup.vue
  router
    index.ts
  main.ts
  App.vue`
  const parsed = parseTextToTree(sample)
  roots.value.splice(0, roots.value.length, ...parsed)
  message.success('已加载示例结构')
}

/* ---------- NodeRow 子组件（就地编辑 + 增删） ---------- */
const NodeRow = defineComponent({
  name: 'NodeRow',
  props: {
    node: { type: Object as () => TreeNode, required: true },
    isLast: { type: Boolean, default: false },
    autoEdit: { type: Boolean, default: false },
    addSibling: { type: Function as () => () => void, required: true },
    addChild: { type: Function as () => (dir: boolean) => void, required: true },
    remove: { type: Function as () => () => void, required: true }
  },
  setup(props) {
    const editing = ref(false)
    const draft = ref('')
    const inputEl = ref<HTMLInputElement | null>(null)

    const startEdit = () => {
      draft.value = props.node.name
      editing.value = true
      nextTick(() => { inputEl.value?.focus(); inputEl.value?.select() })
    }
    const commit = () => {
      const v = draft.value.trim()
      if (v) props.node.name = v
      editing.value = false
    }
    const cancel = () => { editing.value = false }

    onMounted(() => {
      if (props.autoEdit) startEdit()
    })

    return () => {
      const n = props.node
      const childRows = (n.collapsed || !n.children.length)
        ? null
        : h('ul', { class: 'node-tree', role: 'group' },
            n.children.map((c, i) => h(NodeRow, {
              key: c.id,
              node: c,
              isLast: i === n.children.length - 1,
              autoEdit: pendingAutoEdit.has(c.id),
              addSibling: () => addSiblingInto(n.children, i),
              addChild: (dir: boolean) => addChild(c, dir),
              remove: () => removeAt(n.children, i)
            }))
          )

      return h('li', { class: 'node-row', role: 'treeitem' }, [
        h('div', { class: 'node-line' }, [
          h('button', {
            class: ['node-toggle', { 'is-empty': !n.children.length, 'is-collapsed': n.collapsed && n.children.length }],
            title: n.children.length ? (n.collapsed ? '展开' : '折叠') : '',
            onClick: () => { if (n.children.length) n.collapsed = !n.collapsed }
          }, n.collapsed && n.children.length ? '▶' : (n.children.length ? '▼' : '')),
          h('span', { class: ['node-icon', n.isDirectory ? 'is-dir' : 'is-file'] },
            n.isDirectory ? '📁' : '📝'),
          editing.value
            ? h('input', {
                ref: inputEl,
                class: 'node-input',
                value: draft.value,
                onInput: (e: Event) => { draft.value = (e.target as HTMLInputElement).value },
                onKeydown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter') { e.preventDefault(); commit() }
                  else if (e.key === 'Escape') { e.preventDefault(); cancel() }
                },
                onBlur: commit
              })
            : h('span', {
                class: 'node-name',
                title: '双击重命名',
                onDblclick: startEdit
              }, n.name),
          h('span', { class: 'node-actions' }, [
            h('button', { class: 'node-act', title: '添加子目录', onClick: () => props.addChild(true) }, '+ 📁'),
            h('button', { class: 'node-act', title: '添加子文件', onClick: () => props.addChild(false) }, '+ 📝'),
            h('button', { class: 'node-act', title: '添加同级目录', onClick: props.addSibling }, '+∴'),
            h('button', { class: 'node-act node-act--del', title: '删除', onClick: props.remove }, '✕')
          ])
        ]),
        childRows
      ])
    }
  }
})

/** 在指定数组第 i 个节点后插入同级目录，并标记为待自动编辑 */
const addSiblingInto = (arr: TreeNode[], i: number) => {
  const node = makeNode(true)
  pendingAutoEdit.add(node.id)
  arr.splice(i + 1, 0, node)
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

.stat-inline--dir { color: #f59e0b; }
.stat-inline--file { color: #60a5fa; }
.stat-inline--depth { color: var(--color-text-secondary); }

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

.empty-hint {
  display: block;
  width: 100%;
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  font: inherit;
  font-size: var(--font-size-sm);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}

.empty-hint:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg-secondary);
}

/* 始终可见的操作引导：悬停节点行前的说明 */
.edit-hint {
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  line-height: 1.6;
}

.edit-hint-key {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* 节点树 */
.node-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.node-tree :deep(.node-tree) {
  padding-left: 20px;
}

.node-row {
  margin: 0;
}

.node-line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: var(--radius-sm);
  min-height: 28px;
}

.node-line:hover {
  background: var(--color-bg-secondary);
}

.node-line:hover :deep(.node-actions) {
  opacity: 1;
}

.node-toggle {
  width: 14px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: 0;
}

.node-toggle.is-empty {
  cursor: default;
}

.node-icon {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

.node-name {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: text;
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-name:hover {
  background: var(--color-bg-tertiary, rgba(0,0,0,0.05));
}

:deep(.node-input) {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  padding: 1px 6px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  outline: none;
  height: 24px;
}

.node-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}

/* 节点行的操作按钮：始终可见，不用 hover 才出现 */
:deep(.node-actions) {
  opacity: 1;
}

.node-line:hover :deep(.node-actions) {
  opacity: 1;
}

.node-act {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: 11px;
  color: var(--color-text-secondary);
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  line-height: 1;
  white-space: nowrap;
  transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}

.node-act:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.node-act--del:hover {
  border-color: #ef4444;
  color: #ef4444;
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
