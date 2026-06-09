<template>
  <div class="tool-container">
    <ToolHeader
      title="SQL 格式化"
      description="格式化 SQL 查询语句，支持多种数据库方言"
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
                  <n-text strong style="font-size: 13px">方言:</n-text>
                  <n-select
                    v-model:value="language"
                    :options="languageOptions"
                    size="small"
                    style="width: 150px"
                  />
                </div>

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

                <div class="config-group config-group--checkbox">
                  <n-checkbox v-model:checked="uppercase">
                    关键字大写
                  </n-checkbox>
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
              placeholder="输入 SQL 语句"
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
import { NCard, NInput, NInputNumber, NSelect, NCheckbox, NButton, NButtonGroup, NDivider, NSpace, NAlert, NText } from 'naive-ui'
import type { SqlLanguage } from 'sql-formatter'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { compressWhitespace, getErrorMessage } from './utils'

const { copy } = useClipboard()

const input = ref('')
const error = ref('')
const language = ref<SqlLanguage>('sql')
const indentSize = ref(2)
const uppercase = ref(true)
let sqlFormatterModulePromise: Promise<typeof import('sql-formatter')> | null = null

const languageOptions: Array<{ label: string, value: SqlLanguage }> = [
  { label: 'SQL (通用)', value: 'sql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'MariaDB', value: 'mariadb' },
  { label: 'SQL Server', value: 'tsql' },
  { label: 'Oracle PL/SQL', value: 'plsql' }
]

const resetError = () => {
  error.value = ''
}

const ensureInput = (): boolean => {
  if (input.value.trim()) return true

  error.value = '请输入 SQL 语句'
  return false
}

const loadSqlFormatter = () => {
  sqlFormatterModulePromise ??= import('sql-formatter')
  return sqlFormatterModulePromise
}

const handleFormat = async () => {
  resetError()

  if (!ensureInput()) return

  try {
    const { format } = await loadSqlFormatter()
    input.value = format(input.value, {
      language: language.value,
      tabWidth: indentSize.value,
      keywordCase: uppercase.value ? 'upper' : 'lower'
    })
  } catch (err) {
    error.value = `格式化失败: ${getErrorMessage(err, '未知错误')}`
  }
}

const handleCompress = () => {
  resetError()

  if (!ensureInput()) return

  input.value = compressWhitespace(input.value)
}

const handleClear = () => {
  input.value = ''
  resetError()
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
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: none;
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
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
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
