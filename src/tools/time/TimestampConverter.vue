<template>
  <div class="tool-container">
    <ToolHeader
      title="时间戳转换"
      description="在时间戳、本地时间、UTC 和 ISO 8601 之间快速转换"
    />

    <div class="tool-content">
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="输入">
            <n-space vertical :size="16">
              <n-input
                v-model:value="input"
                type="textarea"
                :placeholder="inputPlaceholder"
                :rows="5"
                clearable
              />

              <n-space wrap>
                <n-button @click="fillNowMilliseconds">
                  当前毫秒
                </n-button>
                <n-button @click="fillNowSeconds">
                  当前秒级
                </n-button>
                <n-button @click="fillNowFormatted">
                  当前时间
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
              <div>日期输入如 `{{ todayDateText }}` 会按当天 `00:00:00` 解析</div>
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

            <n-empty v-if="!result && !error" description="输入内容后自动转换" />

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
import { computed, onMounted, ref, watch } from 'vue'
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
import { formatDate, formatDateTime, todayAt, unixSeconds } from '@/utils/demoTime'
import { parseTimestampInput, type TimestampResult } from './timestampUtils'
import ToolHeader from '@/components/ToolHeader.vue'

const { copy } = useClipboard()

const input = ref('')
const error = ref('')
const result = ref<TimestampResult | null>(null)
const todayDateText = computed(() => formatDate())
const inputPlaceholder = computed(() => {
  const sampleTime = todayAt(14, 30)
  return `输入时间戳或日期时间，例如 ${unixSeconds(sampleTime)} / ${sampleTime.getTime()} / ${formatDateTime(sampleTime)}`
})

const handleConvert = () => {
  error.value = ''

  if (!input.value.trim()) {
    result.value = null
    return
  }

  try {
    result.value = parseTimestampInput(input.value)
  } catch (err) {
    result.value = null
    error.value = (err as Error).message
  }
}

const fillNowMilliseconds = () => {
  input.value = String(Date.now())
}

onMounted(() => {
  fillNowMilliseconds()
})

const fillNowSeconds = () => {
  input.value = String(Math.floor(Date.now() / 1000))
}

const fillNowFormatted = () => {
  input.value = new Date().toLocaleString('sv-SE').replace('T', ' ')
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

// 实时监听输入变化
watch(input, () => {
  handleConvert()
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
