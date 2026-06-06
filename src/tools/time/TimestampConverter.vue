<template>
  <div class="tool-container">
    <div class="tool-header">
      <h2>时间戳转换</h2>
      <p class="description">在秒级时间戳、毫秒级时间戳和常见日期时间格式之间快速转换</p>
    </div>

    <div class="tool-content">
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="输入">
            <n-space vertical :size="16">
              <n-input
                v-model:value="input"
                type="textarea"
                placeholder="输入时间戳或日期时间，例如 1717571696 / 1717571696000 / 2026-06-05 14:30:00"
                :rows="5"
                clearable
              />

              <n-space wrap>
                <n-button type="primary" @click="handleConvert">
                  转换
                </n-button>
                <n-button @click="fillNowMilliseconds">
                  当前毫秒
                </n-button>
                <n-button @click="fillNowSeconds">
                  当前秒级
                </n-button>
                <n-button @click="fillNowFormatted">
                  当前时间
                </n-button>
                <n-button @click="handlePaste">
                  粘贴
                </n-button>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </n-space>
          </n-card>

          <n-card title="支持格式" class="tips-card">
            <n-space vertical :size="8">
              <div>数字输入会自动识别为秒级或毫秒级时间戳</div>
              <div>支持格式：`YYYY-MM-DD HH:mm:ss`、`YYYY/MM/DD HH:mm:ss`、ISO 8601</div>
              <div>日期输入如 `2026-06-05` 会按当天 `00:00:00` 解析</div>
            </n-space>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card title="转换结果">
            <template #header-extra>
              <n-button text :disabled="!result" @click="handleCopySummary">
                复制摘要
              </n-button>
            </template>

            <n-empty v-if="!result && !error" description="输入内容后点击转换" />

            <n-descriptions v-else-if="result" :column="1" bordered label-placement="left">
              <n-descriptions-item label="秒级时间戳">
                <div class="result-line">
                  <span class="result-value">{{ result.timestamp }}</span>
                  <n-button text @click="copy(String(result.timestamp))">复制</n-button>
                </div>
              </n-descriptions-item>
              <n-descriptions-item label="毫秒级时间戳">
                <div class="result-line">
                  <span class="result-value">{{ result.timestampMs }}</span>
                  <n-button text @click="copy(String(result.timestampMs))">复制</n-button>
                </div>
              </n-descriptions-item>
              <n-descriptions-item label="本地时间">
                <div class="result-line">
                  <span class="result-value">{{ result.local }}</span>
                  <n-button text @click="copy(result.local)">复制</n-button>
                </div>
              </n-descriptions-item>
              <n-descriptions-item label="UTC">
                <div class="result-line">
                  <span class="result-value">{{ result.utc }}</span>
                  <n-button text @click="copy(result.utc)">复制</n-button>
                </div>
              </n-descriptions-item>
              <n-descriptions-item label="ISO 8601">
                <div class="result-line">
                  <span class="result-value break-all">{{ result.iso8601 }}</span>
                  <n-button text @click="copy(result.iso8601)">复制</n-button>
                </div>
              </n-descriptions-item>
              <n-descriptions-item label="相对时间">
                <div class="result-line">
                  <span class="result-value">{{ result.relative }}</span>
                </div>
              </n-descriptions-item>
            </n-descriptions>
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
import { onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NGrid,
  NGridItem,
  NInput,
  NSpace
} from 'naive-ui'
import { useClipboard } from '@/composables/useClipboard'
import { parseTimestampInput, type TimestampResult } from './utils'

const { copy, paste } = useClipboard()

const input = ref('')
const error = ref('')
const result = ref<TimestampResult | null>(null)

const handleConvert = () => {
  error.value = ''

  try {
    result.value = parseTimestampInput(input.value)
  } catch (err) {
    result.value = null
    error.value = (err as Error).message
  }
}

const fillNowMilliseconds = () => {
  input.value = String(Date.now())
  handleConvert()
}

onMounted(() => {
  fillNowMilliseconds()
})

const fillNowSeconds = () => {
  input.value = String(Math.floor(Date.now() / 1000))
  handleConvert()
}

const fillNowFormatted = () => {
  input.value = new Date().toLocaleString('sv-SE').replace('T', ' ')
  handleConvert()
}

const handlePaste = async () => {
  input.value = await paste()
  if (input.value.trim()) {
    handleConvert()
  }
}

const handleClear = () => {
  input.value = ''
  result.value = null
  error.value = ''
}

const handleCopySummary = async () => {
  if (!result.value) return

  const summary = [
    `秒级时间戳: ${result.value.timestamp}`,
    `毫秒级时间戳: ${result.value.timestampMs}`,
    `本地时间: ${result.value.local}`,
    `UTC: ${result.value.utc}`,
    `ISO 8601: ${result.value.iso8601}`,
    `相对时间: ${result.value.relative}`
  ].join('\n')

  await copy(summary)
}
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
  max-width: 1080px;
}

.tips-card,
.status-card {
  margin-top: 16px;
}

.result-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.result-value {
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.break-all {
  word-break: break-all;
}

@media (max-width: 768px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .result-line {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
