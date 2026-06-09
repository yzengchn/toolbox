<template>
  <div class="json-node" role="treeitem" :aria-expanded="isContainer && !isEmpty ? !collapsed : undefined">
    <div class="json-line" :style="lineStyle">
      <button
        v-if="isContainer && !isEmpty"
        class="fold-toggle"
        type="button"
        :aria-label="collapsed ? '展开 JSON 节点' : '折叠 JSON 节点'"
        @click="toggleCollapsed"
      >
        <span class="fold-chevron" :class="{ 'fold-chevron--open': !collapsed }"></span>
      </button>
      <span v-else class="fold-spacer"></span>

      <template v-if="hasName">
        <span class="json-key">{{ displayName }}</span>
        <span class="json-punctuation">: </span>
      </template>

      <template v-if="isContainer">
        <span class="json-punctuation">{{ openToken }}</span>
        <template v-if="isEmpty">
          <span class="json-punctuation">{{ closeToken }}</span>
          <span v-if="trailingComma" class="json-punctuation">,</span>
        </template>
        <template v-else-if="collapsed">
          <span class="json-fold-placeholder"> ... {{ children.length }} 项 </span>
          <span class="json-punctuation">{{ closeToken }}</span>
          <span v-if="trailingComma" class="json-punctuation">,</span>
        </template>
      </template>

      <template v-else>
        <span class="json-value" :class="primitiveClass">{{ primitiveText }}</span>
        <span v-if="trailingComma" class="json-punctuation">,</span>
      </template>
    </div>

    <template v-if="isContainer && !isEmpty && !collapsed">
      <JsonTreeNode
        v-for="child in children"
        :key="child.id"
        :value="child.value"
        :name="child.name"
        :depth="depth + 1"
        :trailing-comma="child.index < children.length - 1"
        :collapse-mode="collapseMode"
        :collapse-signal="collapseSignal"
      />

      <div class="json-line" :style="lineStyle">
        <span class="fold-spacer"></span>
        <span class="json-punctuation">{{ closeToken }}</span>
        <span v-if="trailingComma" class="json-punctuation">,</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { JsonValue } from './utils'

type TreeCollapseMode = 'expanded' | 'collapsed'

interface JsonTreeChild {
  id: string
  name?: string
  value: JsonValue
  index: number
}

const props = withDefaults(defineProps<{
  value: JsonValue
  name?: string
  depth?: number
  trailingComma?: boolean
  collapseMode: TreeCollapseMode
  collapseSignal: number
}>(), {
  depth: 0,
  trailingComma: false
})

const collapsed = ref(false)

const isArray = computed(() => Array.isArray(props.value))
const isObject = computed(() => {
  return props.value !== null && typeof props.value === 'object' && !Array.isArray(props.value)
})
const isContainer = computed(() => isArray.value || isObject.value)

const children = computed<JsonTreeChild[]>(() => {
  const value = props.value

  if (Array.isArray(value)) {
    return value.map((childValue, index) => ({
      id: String(index),
      value: childValue,
      index
    }))
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value).map((name, index) => ({
      id: name,
      name,
      value: value[name],
      index
    }))
  }

  return []
})

const isEmpty = computed(() => children.value.length === 0)
const hasName = computed(() => props.name !== undefined)
const displayName = computed(() => props.name === undefined ? '' : JSON.stringify(props.name))
const openToken = computed(() => isArray.value ? '[' : '{')
const closeToken = computed(() => isArray.value ? ']' : '}')
const lineStyle = computed<CSSProperties>(() => ({
  paddingLeft: `${props.depth * 18}px`
}))

const primitiveText = computed(() => {
  if (props.value === null) return 'null'
  if (typeof props.value === 'string') return JSON.stringify(props.value)
  return String(props.value)
})

const primitiveClass = computed(() => {
  if (props.value === null) return 'json-value--null'
  return `json-value--${typeof props.value}`
})

const syncCollapseMode = () => {
  collapsed.value = props.collapseMode === 'collapsed' && isContainer.value && !isEmpty.value
}

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

watch(() => props.collapseSignal, syncCollapseMode, { immediate: true })
</script>

<style scoped>
.json-node {
  min-width: max-content;
}

.json-line {
  display: flex;
  align-items: center;
  min-height: 24px;
  padding-right: var(--spacing-md);
  white-space: pre;
}

.json-line:hover {
  background: var(--color-surface-muted);
}

.fold-toggle,
.fold-spacer {
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
}

.fold-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.fold-toggle:hover {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.fold-chevron {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  transition: transform var(--transition-fast);
}

.fold-chevron--open {
  transform: rotate(45deg);
}

.json-key {
  color: var(--color-primary);
}

.json-punctuation {
  color: var(--color-text-secondary);
}

.json-fold-placeholder {
  color: var(--color-text-tertiary);
}

.json-value--string {
  color: var(--color-success);
}

.json-value--number {
  color: var(--color-warning);
}

.json-value--boolean {
  color: var(--color-info);
}

.json-value--null {
  color: var(--color-text-tertiary);
}
</style>
