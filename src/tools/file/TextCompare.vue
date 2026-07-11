<template>
  <div class="tool-container">
    <ToolHeader
      title="文本比较"
      description="IDE 风格的逐行差异对比：两侧编辑、中间行号、同步滚动、实时高亮新增与删除行"
    />

    <div class="tool-content">
      <n-card class="options-card">
        <n-space align="center" :size="16" :wrap="true">
          <n-button @click="handleClear">
            清空
          </n-button>

          <n-button quaternary size="small" @click="loadSample">
            示例
          </n-button>

          <div class="stats-inline">
            <span class="stat-inline stat-inline--added">+{{ statAdded }}</span>
            <span class="stat-inline stat-inline--removed">-{{ statRemoved }}</span>
            <span class="stat-inline stat-inline--equal">={{ statEqual }}</span>
          </div>
        </n-space>
      </n-card>

      <n-card class="diff-card">
        <div ref="editorContainer" class="editor-container"></div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  NButton,
  NCard,
  NSpace,
} from 'naive-ui'
import { EditorView, lineNumbers } from '@codemirror/view'
import { MergeView, getChunks } from '@codemirror/merge'
import ToolHeader from '@/components/ToolHeader.vue'

const editorContainer = ref<HTMLDivElement | null>(null)

let mergeView: MergeView | null = null
let scrollSyncTeardown: (() => void) | null = null
/** 防抖更新统计的计时器句柄，用于在重新调度/卸载时清除，避免泄漏与过期触发 */
let statsTimer: ReturnType<typeof setTimeout> | null = null

const statAdded = ref(0)
const statRemoved = ref(0)
const statEqual = ref(0)

/**
 * 示例代码
 */
const SAMPLE_CODE = {
  a: `function greet(name) {
  return "Hello, " + name;
}

const x = 1;
const y = 2;
console.log(x + y);`,
  b: `function greet(name) {
  return \`Hi, \${name}\`;
}

const x = 1;
const z = 3;
console.log(x + z);`
} as const

/** 统计调度防抖间隔：编辑时频繁触发，实际 diff 较重，做一点节流 */
const STATS_DEBOUNCE_MS = 50

/**
 * 根据 MergeView 的 chunk 计算精确的 + / - / = 行数统计。
 * chunk 记录的是发生变化的位置区间：fromA..toA 是 A 侧被改动（删除）的范围，
 * fromB..toB 是 B 侧被改动（新增）的范围。等行数 = A 总行数 - 删除行数。
 */
const updateStats = () => {
  if (!mergeView) return

  // 两份都没内容时直接归零，语义更直观（否则目录单行空文档会显示 =1）
  const aText = mergeView.a.state.doc.toString()
  const bText = mergeView.b.state.doc.toString()
  if (!aText && !bText) {
    statAdded.value = 0
    statRemoved.value = 0
    statEqual.value = 0
    return
  }

  const chunks = getChunks(mergeView.a.state)?.chunks ?? []
  let removedLines = 0
  let addedLines = 0
  for (const chunk of chunks) {
    removedLines += lineCountBetween(mergeView.a.state, chunk.fromA, chunk.toA)
    addedLines += lineCountBetween(mergeView.b.state, chunk.fromB, chunk.toB)
  }

  statEqual.value = mergeView.a.state.doc.lines - removedLines
  statAdded.value = addedLines
  statRemoved.value = removedLines
}

/** 返回文档 [from, to) 区间内完整跨越的行数（单位/空区间返回 0） */
const lineCountBetween = (state: EditorView['state'], from: number, to: number) => {
  if (from >= to) return 0
  // to 是右开边界；落在某行行首时该行其实未受影响，故取 to-1 定位实际末行
  const firstLine = state.doc.lineAt(from).number
  const lastLine = state.doc.lineAt(to - 1).number
  return lastLine - firstLine + 1
}

/** 整体替换某侧编辑器文档内容 */
const setEditorDoc = (editor: EditorView, content: string) => {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: content }
  })
}

/** 清空两侧编辑器内容 */
const handleClear = () => {
  if (!mergeView) return
  setEditorDoc(mergeView.a, '')
  setEditorDoc(mergeView.b, '')
}

/** 加载示例代码 */
const loadSample = () => {
  if (!mergeView) return
  setEditorDoc(mergeView.a, SAMPLE_CODE.a)
  setEditorDoc(mergeView.b, SAMPLE_CODE.b)
}

/** 调度统计更新（防抖）；每次触发都先清掉上一个待执行的，避免并发过期回调 */
const scheduleStats = () => {
  if (statsTimer !== null) clearTimeout(statsTimer)
  statsTimer = setTimeout(() => {
    statsTimer = null
    updateStats()
  }, STATS_DEBOUNCE_MS)
}

/** 创建编辑器扩展 */
const createEditorExtensions = () => [
  lineNumbers(),
  EditorView.updateListener.of((update) => {
    if (update.docChanged) scheduleStats()
  })
]

/**
 * 设置左右编辑器滚动同步。
 * 直接用 EditorView.scrollDOM（已是真实滚动容器），无需 querySelector，
 * 并用 isSyncing 标志打破互相触发导致的循环。
 */
const setupSyncScroll = () => {
  if (!mergeView) return null

  const leftScroller = mergeView.a.scrollDOM
  const rightScroller = mergeView.b.scrollDOM
  let isSyncing = false

  const sync = (source: HTMLElement, target: HTMLElement) => {
    if (isSyncing) return
    isSyncing = true
    target.scrollTop = source.scrollTop
    target.scrollLeft = source.scrollLeft
    requestAnimationFrame(() => { isSyncing = false })
  }

  const onLeft = () => sync(leftScroller, rightScroller)
  const onRight = () => sync(rightScroller, leftScroller)
  leftScroller.addEventListener('scroll', onLeft)
  rightScroller.addEventListener('scroll', onRight)

  return () => {
    leftScroller.removeEventListener('scroll', onLeft)
    rightScroller.removeEventListener('scroll', onRight)
  }
}

/** 初始化编辑器 */
const initializeEditor = () => {
  if (!editorContainer.value) return

  mergeView = new MergeView({
    a: {
      doc: '',
      extensions: createEditorExtensions()
    },
    b: {
      doc: '',
      extensions: createEditorExtensions()
    },
    parent: editorContainer.value,
  })

  updateStats()
  scrollSyncTeardown = setupSyncScroll()
}

/** 清理资源 */
const cleanup = () => {
  if (statsTimer !== null) {
    clearTimeout(statsTimer)
    statsTimer = null
  }
  scrollSyncTeardown?.()
  scrollSyncTeardown = null
  if (mergeView) {
    mergeView.destroy()
    mergeView = null
  }
}

onMounted(initializeEditor)
onBeforeUnmount(cleanup)
</script>

<style scoped>
.tool-container {
  /* 文本对比采用独立的全屏布局：撑满应用可视区，编辑器区域内部滚动（类似 IDEA diff） */
  padding: var(--spacing-lg);
  /* 用视口高度强制撑出内在高度，绕开 .tool-view 高度链断裂导致的塌缩 */
  min-height: calc(100vh - 56px) !important;
  max-width: none !important;
  margin-inline: 0 !important;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  box-sizing: border-box;
}

/* ToolHeader 自带 margin-bottom，会在本页多包一层 .tool-content 时导致其与下方间距不一致，这里置零让三段间距统一为 gap(12px) */
.tool-container :deep(.tool-header) {
  margin-bottom: 0;
}

.tool-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.options-card {
  flex-shrink: 0;
}

.stats-inline {
  display: flex;
  gap: var(--spacing-sm);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-left: auto;
}

.stat-inline {
  padding: 2px 8px;
  border-radius: 4px;
  min-width: 40px;
  text-align: center;
}

.stat-inline--added {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.14);
}

.stat-inline--removed {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.14);
}

.stat-inline--equal {
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
}

.diff-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.diff-card :deep(.n-card-content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* CodeMirror 主题适配 */
.editor-container :deep(.cm-editor) {
  flex: 1;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  font-size: var(--font-size-sm);
  font-family: var(--font-mono);
  display: flex;
  flex-direction: column;
}

.editor-container :deep(.cm-scroller) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.editor-container :deep(.cm-gutters) {
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.editor-container :deep(.cm-lineNumbers .cm-gutterElement) {
  color: var(--color-text-secondary);
  padding: 0 8px;
}

.editor-container :deep(.cm-content) {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  caret-color: var(--color-primary);
  min-height: 100%;
  padding-bottom: 0;
}

.editor-container :deep(.cm-line) {
  padding: 0 8px;
}

.editor-container :deep(.cm-cursor) {
  border-left-color: var(--color-primary);
}

.editor-container :deep(.cm-selectionBackground) {
  background: var(--color-primary-soft, rgba(59, 130, 246, 0.2)) !important;
}

/* Merge view 容器 */
.editor-container :deep(.cm-mergeView) {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
}

.editor-container :deep(.cm-mergeViewEditors) {
  display: flex;
  width: 100%;
  height: 100%;
}

.editor-container :deep(.cm-mergeViewEditor) {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Diff 差异高亮 */
.editor-container :deep(.cm-deletedChunk) {
  background: rgba(239, 68, 68, 0.16);
}

.editor-container :deep(.cm-insertedChunk) {
  background: rgba(34, 197, 94, 0.16);
}

.editor-container :deep(.cm-changedLine) {
  background: rgba(251, 191, 36, 0.12);
}
</style>
