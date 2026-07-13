<template>
  <li class="node-row" role="treeitem">
    <div class="node-line">
      <button
        type="button"
        class="node-toggle"
        :class="{ 'is-empty': !node.children.length }"
        :title="node.children.length ? (node.collapsed ? '展开' : '折叠') : ''"
        @click="toggle"
      >
        {{ toggleLabel }}
      </button>

      <span class="node-icon">{{ node.isDirectory ? '📁' : '📝' }}</span>

      <input
        v-if="editing"
        ref="inputEl"
        v-model="draft"
        class="node-input"
        @keydown.enter.prevent="commit"
        @keydown.escape.prevent="cancel"
        @blur="commit"
      >

      <span
        v-else
        class="node-name"
        title="双击重命名"
        @dblclick="startEdit"
      >{{ node.name }}</span>

      <span class="node-actions">
        <button type="button" class="node-act" title="添加子目录" @click="onAddChild(true)">+ 📁</button>
        <button type="button" class="node-act" title="添加子文件" @click="onAddChild(false)">+ 📝</button>
        <button type="button" class="node-act" title="添加同级目录" @click="onAddSibling">+∴</button>
        <button type="button" class="node-act node-act--del" title="删除" @click="onRemove">✕</button>
      </span>
    </div>

    <ul v-if="!node.collapsed && node.children.length" class="node-tree" role="group">
      <TreeNodeRow
        v-for="(child, i) in node.children"
        :key="child.id"
        :node="child"
        :parent-list="node.children"
        :index="i"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref } from 'vue'
import { treeOpsKey, type TreeNode } from './treeTypes'

const props = defineProps<{
  node: TreeNode
  parentList: TreeNode[]
  index: number
}>()

const ops = inject(treeOpsKey)
if (!ops) throw new Error('TreeNodeRow must be used under TreeGenerator')

const editing = ref(false)
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

const toggleLabel = computed(() => {
  if (!props.node.children.length) return ''
  return props.node.collapsed ? '▶' : '▼'
})

const startEdit = async () => {
  draft.value = props.node.name
  editing.value = true
  await nextTick()
  inputEl.value?.focus()
  inputEl.value?.select()
}

const commit = () => {
  if (!editing.value) return
  const value = draft.value.trim()
  if (value) props.node.name = value
  editing.value = false
}

const cancel = () => {
  editing.value = false
}

const toggle = () => {
  if (props.node.children.length) props.node.collapsed = !props.node.collapsed
}

const onAddChild = (dir: boolean) => ops.appendChild(props.node, dir)
const onAddSibling = () => ops.insertSibling(props.parentList, props.index)
const onRemove = () => ops.removeAt(props.parentList, props.index)

onMounted(() => {
  if (ops.shouldAutoEdit(props.node.id)) void startEdit()
})
</script>

<style scoped>
.node-row {
  margin: 0;
}

.node-tree {
  list-style: none;
  margin: 0;
  padding: 0 0 0 20px;
}

.node-line {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: var(--radius-sm);
  min-height: 28px;
}

.node-line:hover {
  background: var(--color-bg-secondary);
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
  flex: 0 1 auto;
  min-width: 0;
  max-width: 45%;
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
  background: var(--color-bg-tertiary, rgba(0, 0, 0, 0.05));
}

.node-input {
  flex: 0 1 auto;
  min-width: 80px;
  max-width: 45%;
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
  display: none;
  flex-wrap: nowrap;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 2px;
}

.node-line:hover > .node-actions {
  display: inline-flex;
}

.node-act {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  line-height: 1.2;
  white-space: nowrap;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background var(--transition-fast);
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
</style>
