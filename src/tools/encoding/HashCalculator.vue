<template>
  <div class="tool-container">
    <ToolHeader
      title="哈希计算"
      description="计算文本或文件的 MD5、SHA1、SHA256、SHA512 摘要"
    />

    <div class="tool-content">
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="输入">
            <n-space vertical :size="16">
              <n-tabs v-model:value="mode" type="line" animated>
                <n-tab-pane name="text" tab="文本">
                  <n-input
                    v-model:value="textInput"
                    type="textarea"
                    placeholder="输入要计算哈希的文本"
                    :rows="8"
                    clearable
                  />
                </n-tab-pane>

                <n-tab-pane name="file" tab="文件">
                  <n-space vertical :size="12">
                    <input
                      ref="fileInputRef"
                      type="file"
                      class="file-input"
                      @change="handleFileChange"
                    >

                    <n-space wrap>
                      <n-button @click="handlePickFile">
                        选择文件
                      </n-button>
                      <n-button @click="clearSelectedFile" :disabled="!selectedFile">
                        移除文件
                      </n-button>
                    </n-space>

                    <n-alert v-if="selectedFile" type="info" :bordered="false">
                      已选择：{{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
                    </n-alert>
                  </n-space>
                </n-tab-pane>
              </n-tabs>

              <div>
                <n-text strong style="display: block; margin-bottom: 8px">哈希算法</n-text>
                <n-radio-group v-model:value="algorithm">
                  <n-space :size="16">
                    <n-radio value="MD5">MD5</n-radio>
                    <n-radio value="SHA1">SHA1</n-radio>
                    <n-radio value="SHA256">SHA256</n-radio>
                    <n-radio value="SHA512">SHA512</n-radio>
                  </n-space>
                </n-radio-group>
              </div>

              <n-space wrap align="center">
                <n-checkbox v-model:checked="uppercase">
                  大写输出
                </n-checkbox>
              </n-space>

              <n-space wrap>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </n-space>
          </n-card>

          <n-card title="说明" class="tips-card">
            <n-space vertical :size="8">
              <div>MD5 与 SHA1 适合兼容性场景，不建议用于新的安全校验。</div>
              <div>SHA256 与 SHA512 更适合校验和内容指纹。</div>
              <div>文件哈希仅在本地浏览器中计算，不会上传到服务端。</div>
            </n-space>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card title="结果">
            <template #header-extra>
              <n-button text :disabled="!displayOutput" @click="copy(displayOutput)">
                复制
              </n-button>
            </template>

            <n-empty v-if="!displayOutput && !error && !isCalculating" description="输入内容后自动计算" />

            <n-spin v-if="isCalculating" size="large" style="display: flex; justify-content: center; padding: 40px 0">
              <template #description>计算中...</template>
            </n-spin>

            <n-space v-else-if="displayOutput || error" vertical :size="16">
              <n-descriptions v-if="displayOutput" :column="1" bordered label-placement="left">
                <n-descriptions-item label="算法">
                  {{ algorithm }}
                </n-descriptions-item>
                <n-descriptions-item label="对象">
                  {{ sourceLabel }}
                </n-descriptions-item>
              </n-descriptions>

              <n-input
                v-if="displayOutput"
                :value="displayOutput"
                type="textarea"
                :rows="8"
                readonly
              />
            </n-space>
          </n-card>

          <n-alert v-if="error" type="error" class="status-card">
            {{ error }}
          </n-alert>
        </n-grid-item>
      </n-grid>
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
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NGrid,
  NGridItem,
  NInput,
  NRadio,
  NRadioGroup,
  NSpace,
  NSpin,
  NTabPane,
  NTabs,
  NText
} from 'naive-ui'
import { useClipboard } from '@/composables/useClipboard'
import { computeFileHash, computeHash, type HashAlgorithm } from './utils'
import ToolHeader from '@/components/ToolHeader.vue'
import { formatFileSize } from '@/utils/format'

const { copy } = useClipboard()

const mode = ref<'text' | 'file'>('text')
const algorithm = ref<HashAlgorithm>('SHA256')
const uppercase = ref(false)
const textInput = ref('')
const selectedFile = ref<File | null>(null)
const rawOutput = ref('')
const error = ref('')
const isCalculating = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const displayOutput = computed(() => {
  if (!rawOutput.value) {
    return ''
  }

  return uppercase.value ? rawOutput.value.toUpperCase() : rawOutput.value.toLowerCase()
})

const sourceLabel = computed(() => {
  if (mode.value === 'file' && selectedFile.value) {
    return `${selectedFile.value.name} (${formatFileSize(selectedFile.value.size)})`
  }

  return `文本 (${textInput.value.length} 字符)`
})

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const handlePickFile = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0] ?? null
  rawOutput.value = ''
  error.value = ''
}

const calculateHash = async () => {
  error.value = ''
  isCalculating.value = true

  try {
    if (mode.value === 'text') {
      if (!textInput.value) {
        rawOutput.value = ''
        return
      }

      rawOutput.value = computeHash(textInput.value, algorithm.value)
      return
    }

    if (!selectedFile.value) {
      rawOutput.value = ''
      return
    }

    rawOutput.value = await computeFileHash(selectedFile.value, algorithm.value)
  } catch (hashError) {
    rawOutput.value = ''
    error.value = (hashError as Error).message || '哈希计算失败'
  } finally {
    isCalculating.value = false
  }
}

const handleClear = () => {
  textInput.value = ''
  clearSelectedFile()
  rawOutput.value = ''
  error.value = ''
}

// 实时监听输入变化
watch([textInput, algorithm, mode], () => {
  if (mode.value === 'text') {
    calculateHash()
  }
})

// 监听文件和算法变化
watch([selectedFile, algorithm], () => {
  if (mode.value === 'file' && selectedFile.value) {
    calculateHash()
  }
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 1080px;
}

.tips-card,
.status-card {
  margin-top: 16px;
}

.file-input {
  display: none;
}

@media (max-width: 768px) {
  .tool-container {
    padding: var(--spacing-md);
  }
}
</style>
