<template>
  <div class="tool-container base64-tool">
    <ToolHeader
      title="Base64 编码/解码"
      description="支持 Hex、Base64、Base64URL、Base58、Base58Check、Bech32 的文本编码、解码与校验"
    />

    <div class="tool-content">
      <PageTabs v-model:value="encodingType" class="base64-tabs">
        <n-tab-pane
          v-for="item in encodingTabs"
          :key="item.value"
          :name="item.value"
          :tab="item.label"
        >
          <div class="encoding-pane" :class="{ 'has-options': showEncodingOptions }">
            <div class="action-bar">
              <n-radio-group v-model:value="mode" name="encoding-mode">
                <n-space :size="16">
                  <n-radio value="encode">
                    编码
                  </n-radio>
                  <n-radio value="decode">
                    解码
                  </n-radio>
                </n-space>
              </n-radio-group>

              <n-space :size="10">
                <n-button @click="handleSwap" :disabled="!output">
                  交换
                </n-button>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </div>

            <div v-if="showEncodingOptions" class="format-options">
              <n-form-item
                v-if="encodingType === 'base58check'"
                label="版本字节"
                :show-feedback="false"
              >
                <n-input
                  v-model:value="base58CheckVersionHex"
                  placeholder="00"
                  maxlength="2"
                  clearable
                />
              </n-form-item>

              <n-form-item
                v-if="encodingType === 'bech32'"
                label="HRP"
                :show-feedback="false"
              >
                <n-input
                  v-model:value="bech32Hrp"
                  placeholder="tool"
                  maxlength="24"
                  clearable
                />
              </n-form-item>
            </div>

            <div class="editor-grid">
              <n-card title="输入" class="editor-card">
                <n-input
                  v-model:value="input"
                  type="textarea"
                  :placeholder="inputPlaceholder"
                  :rows="18"
                  class="editor-input"
                  clearable
                />
              </n-card>

              <n-card title="输出" class="editor-card">
                <template #header-extra>
                  <n-button text :disabled="!output" @click="copy(output)">
                    复制
                  </n-button>
                </template>

                <n-input
                  v-model:value="output"
                  type="textarea"
                  placeholder="结果将显示在这里"
                  :rows="18"
                  class="editor-input"
                  readonly
                />
              </n-card>
            </div>

            <n-alert v-if="error" type="error" class="status-card">
              {{ error }}
            </n-alert>

            <n-alert
              v-else-if="output"
              :type="outputStatusType"
              :bordered="false"
              class="status-card"
            >
              {{ outputStatusText }}
            </n-alert>
          </div>
        </n-tab-pane>
      </PageTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NFormItem,
  NInput,
  NRadio,
  NRadioGroup,
  NSpace,
  NTabPane
} from 'naive-ui'
import { useClipboard } from '@/composables/useClipboard'
import {
  decodeTextByEncoding,
  encodeTextByEncoding,
  isValidEncodedText,
  type TextEncodingType
} from './utils'
import ToolHeader from '@/components/ToolHeader.vue'
import PageTabs from '@/components/PageTabs.vue'
import { debounce } from '@/utils/debounce'

const { copy } = useClipboard()

const encodingTabs: Array<{ value: TextEncodingType, label: string }> = [
  { value: 'hex', label: 'Hex (Base16)' },
  { value: 'base64', label: 'BASE64' },
  { value: 'base64url', label: 'Base64URL' },
  { value: 'base58', label: 'Base58' },
  { value: 'base58check', label: 'Base58Check' },
  { value: 'bech32', label: 'Bech32' }
]

const input = ref('')
const output = ref('')
const error = ref('')
const mode = ref<'encode' | 'decode'>('encode')
const encodingType = ref<TextEncodingType>('base64')
const base58CheckVersionHex = ref('00')
const bech32Hrp = ref('tool')

const activeEncodingLabel = computed(() => {
  return encodingTabs.find(item => item.value === encodingType.value)?.label ?? 'BASE64'
})

const showEncodingOptions = computed(() => {
  return encodingType.value === 'base58check' || encodingType.value === 'bech32'
})

const inputPlaceholder = computed(() => (
  mode.value === 'encode'
    ? `输入要编码为 ${activeEncodingLabel.value} 的文本`
    : `输入要解码的 ${activeEncodingLabel.value} 内容`
))

const outputStatusType = computed(() => (
  mode.value === 'encode' || isValidEncodedText(output.value, encodingType.value) ? 'success' : 'info'
))

const outputStatusText = computed(() => (
  mode.value === 'encode'
    ? `当前输出是有效的 ${activeEncodingLabel.value} 文本`
    : '当前输出是解码后的 UTF-8 文本'
))

const updateOutput = () => {
  error.value = ''

  if (!input.value.trim()) {
    output.value = ''
    return
  }

  try {
    output.value = mode.value === 'encode'
      ? encodeTextByEncoding(input.value, encodingType.value, {
        base58CheckVersionHex: base58CheckVersionHex.value,
        bech32Hrp: bech32Hrp.value
      })
      : decodeTextByEncoding(input.value, encodingType.value)
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

watch([input, mode, encodingType, base58CheckVersionHex, bech32Hrp], debouncedUpdateOutput)
</script>

<style scoped>
.base64-tool.tool-container {
  height: 100%;
  min-height: 0;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.tool-content {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.base64-tabs {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.base64-tabs :deep(.n-tabs-nav) {
  flex: 0 0 auto;
}

.base64-tabs :deep(.n-tabs-pane-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.base64-tabs :deep(.n-tab-pane) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.encoding-pane {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: var(--spacing-sm);
  overflow: hidden;
}

.encoding-pane.has-options {
  grid-template-rows: auto auto minmax(0, 1fr) auto;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  min-height: 42px;
  padding: 6px var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.format-options {
  display: grid;
  grid-template-columns: minmax(160px, 260px);
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.format-options :deep(.n-form-item) {
  margin-bottom: 0;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: clamp(520px, 64vh, 760px);
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  overflow: hidden;
}

.editor-card {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-strong) !important;
  border-radius: var(--radius-md);
  box-shadow: none !important;
  background: var(--color-surface) !important;
}

.editor-card :deep(.n-card-header) {
  flex: 0 0 auto;
  min-height: 38px;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-xs) !important;
}

.editor-card :deep(.n-card__content) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  padding: 0 var(--spacing-md) var(--spacing-md) !important;
  display: flex;
}

.editor-input {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
}

.editor-card :deep(.n-input) {
  height: 100%;
  min-height: 0;
}

.editor-input :deep(.n-input-wrapper),
.editor-input :deep(.n-input__textarea) {
  height: 100%;
  min-height: 0;
}

.editor-input :deep(.n-input__textarea-el) {
  min-height: 0 !important;
  height: 100% !important;
  font-family: var(--font-mono);
  line-height: 1.45;
  resize: none;
}

.status-card {
  margin-top: 0;
  min-height: 0;
}

@media (max-width: 768px) {
  .base64-tool.tool-container {
    padding: var(--spacing-md);
  }

  .action-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .editor-grid {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(320px, 1fr) minmax(320px, 1fr);
    min-height: 700px;
  }
}

@media (max-height: 760px) {
  .base64-tool.tool-container {
    padding: var(--spacing-xs) var(--spacing-md) var(--spacing-sm);
  }

  .base64-tool :deep(.tool-header) {
    margin-bottom: var(--spacing-xs);
    padding: 6px var(--spacing-md);
  }

  .base64-tool :deep(.description) {
    display: none;
  }

  .encoding-pane {
    gap: var(--spacing-xs);
  }

  .action-bar {
    min-height: 36px;
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .format-options {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .editor-grid {
    min-height: clamp(440px, 58vh, 620px);
    padding: var(--spacing-xs);
  }

  .editor-card :deep(.n-card-header) {
    min-height: 32px;
    padding: var(--spacing-xs) var(--spacing-sm) 2px !important;
  }

  .editor-card :deep(.n-card__content) {
    padding: 0 var(--spacing-sm) var(--spacing-sm) !important;
  }
}
</style>
