<template>
  <div class="tool-container" :class="{ 'tool-container--long-output': hasLongOutput }">
    <ToolHeader
      title="JSON 格式化"
      description="格式化、压缩和验证 JSON 数据"
    />

    <div class="tool-content">
      <div class="editor-layout">
        <n-card title="输入" class="editor-panel">
          <div class="editor-body">
            <n-input
              v-model:value="input"
              type="textarea"
              placeholder="输入 JSON 数据"
              :rows="15"
              clearable
              @input="debouncedHandleInput"
            />

            <div class="controls">
              <n-space :size="16" wrap>
                <n-button-group>
                  <n-button type="primary" @click="handleFormat">
                    格式化
                  </n-button>
                  <n-button @click="handleCompress">
                    压缩
                  </n-button>
                  <n-button @click="handleValidate">
                    验证
                  </n-button>
                </n-button-group>

                <n-button-group>
                  <n-button @click="handleEscape">
                    转义
                  </n-button>
                  <n-button @click="handleUnescape">
                    反转义
                  </n-button>
                </n-button-group>

                <n-button @click="handleClear">
                  清空
                </n-button>

                <n-divider vertical />

                <div class="format-configs">
                  <div class="config-group">
                    <n-text strong style="font-size: 13px">缩进:</n-text>
                    <n-input-number
                      v-model:value="indentSize"
                      :min="0"
                      :max="8"
                      size="small"
                      style="width: 80px"
                      @update:value="debouncedHandleInput"
                    />
                  </div>

                  <div class="config-group config-group--checkbox">
                    <n-checkbox v-model:checked="sortKeys" @update:checked="debouncedHandleInput">
                      排序键
                    </n-checkbox>
                  </div>
                </div>
              </n-space>
            </div>

            <n-alert v-if="error" type="error" class="feedback-alert">
              {{ error }}
            </n-alert>

            <n-alert v-else-if="valid" type="success" class="feedback-alert">
              JSON 格式正确
            </n-alert>
          </div>
        </n-card>

        <n-card
          title="输出"
          class="editor-panel output-panel"
          :class="{ 'output-panel--full-height': hasLongOutput }"
        >
          <template #header-extra>
            <div v-if="output" class="output-actions">
              <n-button-group v-if="parsedOutput" size="small">
                <n-button
                  size="small"
                  :type="outputDisplayMode === 'tree' ? 'primary' : 'default'"
                  secondary
                  @click="outputDisplayMode = 'tree'"
                >
                  树形
                </n-button>
                <n-button
                  size="small"
                  :type="outputDisplayMode === 'text' ? 'primary' : 'default'"
                  secondary
                  @click="outputDisplayMode = 'text'"
                >
                  文本
                </n-button>
              </n-button-group>

              <template v-if="hasCollapsibleJsonOutput && outputDisplayMode === 'tree'">
                <n-button size="small" quaternary @click="handleCollapseOutputTree">
                  全部折叠
                </n-button>
                <n-button size="small" quaternary @click="handleExpandOutputTree">
                  全部展开
                </n-button>
              </template>
              <n-button
                size="small"
                secondary
                class="copy-button"
                @click="handleCopyOutput"
              >
                复制
              </n-button>
            </div>
          </template>

          <div class="output-input-wrap">
            <div
              v-if="parsedOutput && outputDisplayMode === 'tree'"
              class="json-tree-viewer"
              role="tree"
              aria-label="JSON 输出"
            >
              <JsonTreeNode
                :value="parsedOutput.value"
                :collapse-mode="treeCollapseMode"
                :collapse-signal="treeCollapseSignal"
              />
            </div>

            <n-input
              v-else
              v-model:value="output"
              type="textarea"
              placeholder="结果将实时显示在这里"
              :rows="15"
              class="output-textarea"
              readonly
            />
          </div>
        </n-card>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NCard, NInput, NInputNumber, NCheckbox, NButton, NButtonGroup, NDivider, NSpace, NAlert, NText } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import JsonTreeNode from './JsonTreeNode.vue'
import { useClipboard } from '@/composables/useClipboard'
import { debounce } from '@/utils/debounce'
import type { JsonValue } from './utils'
import {
  compressJson,
  escapeJsonString,
  formatJson,
  getErrorMessage,
  parseJsonValue,
  unescapeJsonString
} from './utils'

type OutputDisplayMode = 'tree' | 'text'
type TreeCollapseMode = 'expanded' | 'collapsed'

interface ParsedOutput {
  value: JsonValue
}

const { copy } = useClipboard()

const input = ref('')
const output = ref('')
const error = ref('')
const valid = ref(false)
const indentSize = ref(4)
const sortKeys = ref(false)
const longOutputLineLimit = 24
const longOutputCharacterLimit = 1600
const outputDisplayMode = ref<OutputDisplayMode>('tree')
const treeCollapseMode = ref<TreeCollapseMode>('expanded')
const treeCollapseSignal = ref(0)

const hasLongOutput = computed(() => {
  const value = output.value

  if (!value) return false

  return value.length > longOutputCharacterLimit || value.split('\n').length > longOutputLineLimit
})

const parsedOutput = computed<ParsedOutput | null>(() => {
  const value = output.value.trim()

  if (!value) return null

  try {
    return { value: parseJsonValue(value) }
  } catch {
    return null
  }
})

const hasCollapsibleJsonOutput = computed(() => {
  const parsed = parsedOutput.value

  if (!parsed || parsed.value === null || typeof parsed.value !== 'object') {
    return false
  }

  return Array.isArray(parsed.value) ? parsed.value.length > 0 : Object.keys(parsed.value).length > 0
})

const resetFeedback = () => {
  error.value = ''
  valid.value = false
}

const ensureInput = (message: string): boolean => {
  if (input.value.trim()) return true

  error.value = message
  return false
}

const handleInput = () => {
  resetFeedback()

  if (!input.value.trim()) {
    output.value = ''
    return
  }

  try {
    output.value = formatJson(input.value, {
      indentSize: indentSize.value,
      sortKeys: sortKeys.value
    })
    outputDisplayMode.value = 'tree'
  } catch {
    // 实时预览时不显示错误，只在用户点击验证时显示
    output.value = ''
  }
}

// 创建防抖版本用于实时输入
const debouncedHandleInput = debounce(handleInput, 300)

const handleFormat = () => {
  resetFeedback()

  if (!ensureInput('请输入 JSON 数据')) return

  try {
    output.value = formatJson(input.value, {
      indentSize: indentSize.value,
      sortKeys: sortKeys.value
    })
    outputDisplayMode.value = 'tree'
  } catch (err) {
    error.value = `JSON 格式错误: ${getErrorMessage(err, '未知错误')}`
  }
}

const handleCompress = () => {
  resetFeedback()

  if (!ensureInput('请输入 JSON 数据')) return

  try {
    output.value = compressJson(input.value)
    outputDisplayMode.value = 'text'
  } catch (err) {
    error.value = `JSON 格式错误: ${getErrorMessage(err, '未知错误')}`
  }
}

const handleValidate = () => {
  resetFeedback()

  if (!ensureInput('请输入 JSON 数据')) return

  try {
    parseJsonValue(input.value)
    valid.value = true
  } catch (err) {
    error.value = `JSON 格式错误: ${getErrorMessage(err, '未知错误')}`
  }
}

const handleEscape = () => {
  resetFeedback()

  if (!ensureInput('请输入数据')) return

  output.value = escapeJsonString(input.value)
  outputDisplayMode.value = 'text'
}

const handleUnescape = () => {
  resetFeedback()

  if (!ensureInput('请输入数据')) return

  try {
    output.value = unescapeJsonString(input.value)
    outputDisplayMode.value = 'text'
  } catch (err) {
    error.value = `反转义失败: ${getErrorMessage(err, '未知错误')}`
  }
}

const handleClear = () => {
  input.value = ''
  output.value = ''
  outputDisplayMode.value = 'tree'
  resetFeedback()
}

const handleCopyOutput = () => {
  copy(output.value)
}

const syncOutputTreeCollapse = (mode: TreeCollapseMode) => {
  treeCollapseMode.value = mode
  treeCollapseSignal.value += 1
}

const handleCollapseOutputTree = () => {
  syncOutputTreeCollapse('collapsed')
}

const handleExpandOutputTree = () => {
  syncOutputTreeCollapse('expanded')
}

watch(output, () => {
  syncOutputTreeCollapse('expanded')
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(420px, 1.15fr);
  gap: var(--spacing-md);
  align-items: stretch;
  flex: 1;
  height: 100%;
  min-height: 0;
}

.tool-container--long-output .editor-layout {
  min-height: calc(100dvh - var(--header-height) - 128px);
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-height: 0;
}

.editor-panel :deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
}

.output-input-wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.output-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.feedback-alert {
  flex: 0 0 auto;
}

.json-tree-viewer {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--spacing-sm) 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.output-textarea,
:deep(.output-textarea.n-input) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.output-textarea :deep(.n-input__state-border),
.output-textarea :deep(.n-input__state-border--disabled) {
  height: 100%;
}

.output-textarea :deep(.n-input-wrapper),
.output-textarea :deep(.n-input__textarea) {
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
}

.output-textarea :deep(.n-input__textarea-el) {
  height: 100% !important;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  resize: none;
}

.output-panel {
  height: 100%;
  min-height: 0;
}

.output-panel--full-height {
  min-height: calc(100dvh - var(--header-height) - 128px);
}

.output-panel :deep(.n-card__content) {
  overflow: hidden;
}

.controls {
  padding: var(--spacing-md) 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: none;
}

.config-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: 34px;
  padding: 4px 12px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.format-configs {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  vertical-align: middle;
}

.config-group--checkbox {
  justify-content: center;
}

.config-group--checkbox :deep(.n-checkbox) {
  align-items: center;
}

.config-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

:deep(.n-button) {
  font-weight: 500;
}

:deep(.n-checkbox) {
  font-weight: 500;
}
</style>
