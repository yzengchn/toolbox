<template>
  <div class="tool-container">
    <div class="tool-header">
      <h2>Cron 表达式解析</h2>
      <p class="description">校验 Cron 表达式，查看标准化结果和接下来几次执行时间</p>
    </div>

    <div class="tool-content">
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="表达式">
            <n-space vertical :size="16">
              <n-input
                v-model:value="expression"
                placeholder="输入 5 位或 6 位 Cron 表达式，例如 0 9 * * 1-5"
                clearable
                @keyup.enter="handleParse"
              />

              <n-space wrap>
                <n-button type="primary" @click="handleParse">
                  解析
                </n-button>
                <n-button @click="applyTemplate('0 9 * * 1-5')">
                  工作日 09:00
                </n-button>
                <n-button @click="applyTemplate('*/5 * * * *')">
                  每 5 分钟
                </n-button>
                <n-button @click="applyTemplate('0 0 * * *')">
                  每天 00:00
                </n-button>
                <n-button @click="applyTemplate('@daily')">
                  @daily
                </n-button>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </n-space>
          </n-card>

          <n-card title="说明" class="tips-card">
            <n-space vertical :size="8">
              <div>支持标准 5 位 Cron，内部会补齐秒字段。</div>
              <div>也支持 6 位表达式和预定义表达式，如 `@daily`、`@hourly`。</div>
              <div>标准化结果始终按 `秒 分 时 日 月 周` 展示。</div>
            </n-space>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card title="解析结果">
            <template #header-extra>
              <n-button text :disabled="!result" @click="handleCopyResult">
                复制结果
              </n-button>
            </template>

            <n-empty v-if="!result && !error" description="输入表达式后点击解析" />

            <n-space v-else-if="result" vertical :size="16">
              <n-descriptions :column="1" bordered label-placement="left">
                <n-descriptions-item label="标准化表达式">
                  <span class="mono">{{ result.normalized }}</span>
                </n-descriptions-item>
                <n-descriptions-item label="可读说明">
                  {{ result.description }}
                </n-descriptions-item>
              </n-descriptions>

              <n-card size="small" title="接下来 5 次执行时间" embedded>
                <n-space vertical :size="8">
                  <div
                    v-for="(run, index) in result.nextRuns"
                    :key="`${run}-${index}`"
                    class="next-run-item"
                  >
                    <span class="run-index">#{{ index + 1 }}</span>
                    <span class="mono">{{ run }}</span>
                  </div>
                </n-space>
              </n-card>
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
import { ref } from 'vue'
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
import { parseCronExpression, type CronParseResult } from './utils'

const { copy } = useClipboard()

const expression = ref('0 9 * * 1-5')
const error = ref('')
const result = ref<CronParseResult | null>(null)

const handleParse = () => {
  error.value = ''

  try {
    result.value = parseCronExpression(expression.value)
  } catch (err) {
    result.value = null
    error.value = (err as Error).message
  }
}

const applyTemplate = (value: string) => {
  expression.value = value
  handleParse()
}

const handleClear = () => {
  expression.value = ''
  result.value = null
  error.value = ''
}

const handleCopyResult = async () => {
  if (!result.value) return

  await copy([
    `标准化表达式: ${result.value.normalized}`,
    `可读说明: ${result.value.description}`,
    '接下来 5 次执行时间:',
    ...result.value.nextRuns.map((run, index) => `#${index + 1} ${run}`)
  ].join('\n'))
}

handleParse()
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

.mono {
  font-family: var(--font-mono);
}

.next-run-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.run-index {
  min-width: 32px;
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .next-run-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
