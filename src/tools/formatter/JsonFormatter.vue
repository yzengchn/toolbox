<template>
  <div class="tool-container">
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
          </div>
        </n-card>

        <n-card title="输出" class="editor-panel output-panel">
          <div class="output-input-wrap">
            <n-button
              v-if="output"
              text
              size="small"
              class="copy-button"
              @click="handleCopyOutput"
            >
              复制
            </n-button>

            <n-input
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

      <n-alert v-if="error" type="error" style="margin-top: 16px">
        {{ error }}
      </n-alert>

      <n-alert v-if="valid" type="success" style="margin-top: 16px">
        JSON 格式正确
      </n-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NInput, NInputNumber, NCheckbox, NButton, NButtonGroup, NDivider, NSpace, NAlert, NText } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { debounce } from '@/utils/debounce'
import {
  compressJson,
  escapeJsonString,
  formatJson,
  getErrorMessage,
  parseJsonValue,
  unescapeJsonString
} from './utils'

const { copy } = useClipboard()

const input = ref('')
const output = ref('')
const error = ref('')
const valid = ref(false)
const indentSize = ref(4)
const sortKeys = ref(false)

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
  } catch (err) {
    error.value = `JSON 格式错误: ${getErrorMessage(err, '未知错误')}`
  }
}

const handleCompress = () => {
  resetFeedback()

  if (!ensureInput('请输入 JSON 数据')) return

  try {
    output.value = compressJson(input.value)
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
}

const handleUnescape = () => {
  resetFeedback()

  if (!ensureInput('请输入数据')) return

  try {
    output.value = unescapeJsonString(input.value)
  } catch (err) {
    error.value = `反转义失败: ${getErrorMessage(err, '未知错误')}`
  }
}

const handleClear = () => {
  input.value = ''
  output.value = ''
  resetFeedback()
}

const handleCopyOutput = () => {
  copy(output.value)
}
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
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.copy-button {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 1;
}

.output-textarea {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.output-textarea :deep(.n-input) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
}

.output-textarea :deep(.n-input__state-border),
.output-textarea :deep(.n-input__state-border--disabled) {
  height: 100%;
}

.output-textarea :deep(.n-input-wrapper),
.output-textarea :deep(.n-input__textarea) {
  flex: 1;
  height: 100%;
}

.output-textarea :deep(.n-input__textarea-el) {
  height: 100% !important;
  min-height: 400px;
  padding-top: 34px;
}

.output-panel {
  height: 100%;
  min-height: 0;
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
