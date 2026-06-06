<template>
  <div class="tool-container">
    <ToolHeader
      title="Base64 编码/解码"
      description="支持普通 Base64 和 URL Safe Base64 的文本编码、解码与校验"
    />

    <div class="tool-content">
      <n-card title="输入" class="input-card">
        <template #header-extra>
          <n-space wrap :size="16" align="center">
            <n-radio-group v-model:value="mode" name="base64-mode">
              <n-space :size="16">
                <n-radio value="encode">
                  编码
                </n-radio>
                <n-radio value="decode">
                  解码
                </n-radio>
              </n-space>
            </n-radio-group>

            <n-checkbox v-model:checked="urlSafe">
              使用 URL Safe Base64
            </n-checkbox>

            <n-button @click="handleSwap" :disabled="!output">
              交换
            </n-button>
            <n-button @click="handleClear">
              清空
            </n-button>
          </n-space>
        </template>

        <n-space vertical :size="16" class="editor-stack">
          <n-input
            v-model:value="input"
            type="textarea"
            :placeholder="inputPlaceholder"
            :rows="6"
            class="editor-input"
            clearable
          />
        </n-space>
      </n-card>

      <n-card title="输出" class="output-card">
        <template #header-extra>
          <n-button text :disabled="!output" @click="copy(output)">
            复制
          </n-button>
        </template>

        <n-space vertical :size="16" class="editor-stack">
          <n-input
            v-model:value="output"
            type="textarea"
            placeholder="结果将显示在这里"
            :rows="8"
            class="editor-input"
            readonly
          />

          <n-alert
            v-if="output"
            :type="isValidBase64Output ? 'success' : 'info'"
            :bordered="false"
          >
            {{ isValidBase64Output ? '当前输出是有效的 Base64 文本' : '当前输出是普通文本结果' }}
          </n-alert>
        </n-space>
      </n-card>

      <n-alert v-if="error" type="error" class="status-card">
        {{ error }}
      </n-alert>

      <n-card title="说明" class="tips-card">
        <n-space vertical :size="8">
          <div>普通 Base64 会保留 `=` 补位字符。</div>
          <div>URL Safe Base64 会将 `+` 和 `/` 替换为 `-` 和 `_`，并移除末尾补位。</div>
          <div>解码时会自动兼容普通 Base64 与 URL Safe Base64。</div>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NInput,
  NRadio,
  NRadioGroup,
  NSpace
} from 'naive-ui'
import { useClipboard } from '@/composables/useClipboard'
import { decodeBase64, encodeBase64, isValidBase64 } from './utils'
import ToolHeader from '@/components/ToolHeader.vue'
import { debounce } from '@/utils/debounce'

const { copy } = useClipboard()

const input = ref('')
const output = ref('')
const error = ref('')
const urlSafe = ref(false)
const mode = ref<'encode' | 'decode'>('encode')

const isValidBase64Output = computed(() => output.value.trim() ? isValidBase64(output.value) : false)
const inputPlaceholder = computed(() => (
  mode.value === 'encode'
    ? '输入要编码的文本'
    : '输入要解码的 Base64 内容'
))

const updateOutput = () => {
  error.value = ''

  if (!input.value.trim()) {
    output.value = ''
    return
  }

  try {
    output.value = mode.value === 'encode'
      ? encodeBase64(input.value, urlSafe.value)
      : decodeBase64(input.value)
  } catch (decodeError) {
    output.value = ''
    error.value = (decodeError as Error).message
  }
}

const handleSwap = () => {
  if (!output.value) return

  input.value = output.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  error.value = ''
}

const handleClear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
}

// 创建防抖版本用于输入变化
const debouncedUpdateOutput = debounce(updateOutput, 300)

watch([input, mode, urlSafe], debouncedUpdateOutput)
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-header {
  margin-bottom: var(--spacing-xl);
}

.tool-header h2 {
  font-size: var(--font-size-2xl, 28px);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.tool-content {
  width: 100%;
}

.editor-stack {
  width: 100%;
}

.editor-input {
  width: 100%;
}

.input-card :deep(.n-card-header) {
  gap: 12px;
}

.input-card :deep(.n-card-header__extra) {
  display: flex;
  align-items: center;
}

.input-card :deep(.n-card__content),
.output-card :deep(.n-card__content) {
  width: 100%;
}

.editor-stack :deep(.n-space-item) {
  width: 100%;
}

.output-card,
.tips-card,
.status-card {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .tool-container {
    padding: var(--spacing-md);
  }
}
</style>
