<template>
  <div class="tool-container">
    <ToolHeader
      title="XML/HTML 格式化"
      description="格式化 XML 和 HTML 代码"
    />

    <div class="tool-content">
      <n-card class="editor-panel">
        <div class="editor-body">
          <div class="controls">
            <n-space :size="16" wrap>
              <n-button-group>
                <n-button type="primary" @click="handleFormat">
                  格式化
                </n-button>
                <n-button @click="handleCompress">
                  压缩
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
                  />
                </div>
              </div>
            </n-space>
          </div>

          <div class="editor-input-wrap">
            <n-button
              text
              size="small"
              class="copy-button"
              :disabled="!input"
              @click="handleCopyInput"
            >
              复制
            </n-button>

            <n-input
              v-model:value="input"
              type="textarea"
              placeholder="输入 XML 或 HTML 代码"
              :rows="15"
              class="editor-textarea"
              clearable
            />
          </div>
        </div>
      </n-card>

      <n-alert v-if="error" type="error" style="margin-top: 16px">
        {{ error }}
      </n-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NInput, NInputNumber, NButton, NButtonGroup, NDivider, NSpace, NAlert, NText } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copy } = useClipboard()

const input = ref('')
const error = ref('')
const indentSize = ref(2)

const handleFormat = () => {
  error.value = ''

  if (!input.value.trim()) {
    error.value = '请输入 XML 或 HTML 代码'
    return
  }

  try {
    input.value = formatXml(input.value, indentSize.value)
  } catch (err) {
    error.value = '格式化失败: ' + (err as Error).message
  }
}

const formatXml = (xml: string, indent: number): string => {
  const PADDING = ' '.repeat(indent)
  const reg = /(>)(<)(\/*)/g
  let formatted = ''
  let pad = 0

  xml = xml.replace(reg, '$1\n$2$3')

  xml.split('\n').forEach((node) => {
    let indent = 0
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) {
        pad -= 1
      }
    } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
      indent = 1
    } else {
      indent = 0
    }

    formatted += PADDING.repeat(pad) + node + '\n'
    pad += indent
  })

  return formatted.trim()
}

const handleCompress = () => {
  error.value = ''

  if (!input.value.trim()) {
    error.value = '请输入 XML 或 HTML 代码'
    return
  }

  input.value = input.value
    .replace(/>\s+</g, '><')
    .replace(/\n/g, '')
    .trim()
}

const handleClear = () => {
  input.value = ''
  error.value = ''
}

const handleCopyInput = () => {
  copy(input.value)
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

.editor-input-wrap {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}

.copy-button {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 1;
}

.editor-textarea {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
}

.editor-textarea :deep(.n-input) {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
}

.editor-textarea :deep(.n-input__state-border),
.editor-textarea :deep(.n-input__state-border--disabled) {
  height: 100%;
}

.editor-textarea :deep(.n-input-wrapper),
.editor-textarea :deep(.n-input__textarea) {
  flex: 1;
  height: 100%;
}

.editor-textarea :deep(.n-input__textarea-el) {
  height: 100% !important;
  min-height: 400px;
  padding-top: 34px;
}

.controls {
  padding: var(--spacing-md) 0;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.format-configs {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  vertical-align: middle;
  flex-wrap: wrap;
}

.config-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: 34px;
  padding: 4px 12px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.config-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

:deep(.n-button) {
  font-weight: 500;
}
</style>
