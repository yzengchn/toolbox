<template>
  <div class="tool-container">
    <ToolHeader
      title="GB/T 27930 解析"
      description="电动汽车非车载充电机与 BMS 通信 CAN 报文解析，覆盖握手、辨识、配置、充电、结束和错误阶段"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="充电 CAN 日志">
          <n-space vertical :size="14">
            <div class="actions-row">
              <n-button type="primary" @click="handleParse">解析</n-button>
              <n-button @click="loadDemo">示例</n-button>
              <n-button @click="clearInput">清空</n-button>
              <n-button :disabled="!frames.length" @click="copyResult">复制结果</n-button>
            </div>

            <n-input
              v-model:value="input"
              type="textarea"
              :rows="18"
              placeholder="支持 candump、ASC、ID#DATA，例如：&#10;1826F456#010100FFFFFFFFFF&#10;1827F456#8813FFFFFFFFFFFF"
              clearable
            />

            <n-alert type="info" :bordered="false" size="small">
              基于 29 位扩展 CAN ID 拆解 PGN、源地址、目标地址，并按常见 27930 报文模板换算电压、电流、SOC、状态和错误位。
            </n-alert>
          </n-space>
        </n-card>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!frames.length && !parseError" description="解析结果将在这里展示" />

          <div v-if="frames.length" class="parse-summary">
            <div
              v-for="item in summaryCards"
              :key="item.label"
              class="summary-tile"
              :class="item.status ? `summary-tile--${item.status}` : undefined"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>

          <div v-if="frames.length" class="stage-strip">
            <div
              v-for="stage in stageSummary"
              :key="stage.name"
              class="stage-pill"
            >
              <span>{{ stage.name }}</span>
              <strong>{{ stage.count }}</strong>
            </div>
          </div>

          <n-card
            v-for="frame in frames"
            :key="`${frame.order}-${frame.rawLine}`"
            class="result-card"
            :title="`第 ${frame.order} 帧`"
          >
            <template #header-extra>
              <n-tag :type="tagType(frame)" size="small">
                {{ frame.messageCode }}
              </n-tag>
            </template>

            <n-alert v-if="frame.error" type="error" class="section-gap">
              {{ frame.error }}
            </n-alert>
            <n-alert v-if="frame.warning" type="warning" class="section-gap">
              {{ frame.warning }}
            </n-alert>

            <n-descriptions bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item label="CAN ID">
                0x{{ frame.canId }}
              </n-descriptions-item>
              <n-descriptions-item label="PGN">
                {{ frame.pgn === '-' ? '-' : `0x${frame.pgn}` }}
              </n-descriptions-item>
              <n-descriptions-item label="报文">
                {{ frame.messageCode }} {{ frame.messageName }}
              </n-descriptions-item>
              <n-descriptions-item label="阶段">
                {{ frame.stage }}
              </n-descriptions-item>
              <n-descriptions-item label="源地址">
                {{ frame.source }}
              </n-descriptions-item>
              <n-descriptions-item label="目标地址">
                {{ frame.destination }}
              </n-descriptions-item>
              <n-descriptions-item label="数据">
                {{ frame.dataHex || '空' }}
              </n-descriptions-item>
              <n-descriptions-item label="原始行">
                {{ frame.rawLine }}
              </n-descriptions-item>
            </n-descriptions>

            <div v-if="frame.fields.length" class="field-list">
              <div v-for="field in frame.fields" :key="field.label" class="field-row">
                <span class="field-label">{{ field.label }}</span>
                <span class="field-value">{{ field.value }}</span>
                <span v-if="field.remark" class="field-remark">{{ field.remark }}</span>
              </div>
            </div>
          </n-card>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NInput,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { todayAt } from '@/utils/demoTime'
import { parseGbt27930Input, type Gbt27930Frame } from './gbt27930'

const { copy } = useClipboard()

const buildDemoInput = () => {
  const sampleTime = todayAt(9, 30)
  const weekday = sampleTime.getDay() || 7
  const ctsData = [
    sampleTime.getSeconds(),
    sampleTime.getMinutes(),
    sampleTime.getHours(),
    weekday,
    sampleTime.getDate(),
    sampleTime.getMonth() + 1,
    Number(String(sampleTime.getFullYear()).slice(-2))
  ].map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join('')

  return [
    '1826F456#010100FFFFFFFFFF',
    '1827F456#8813FFFFFFFFFFFF',
    '1801F456#AA43384730303131',
    '1806F456#8813F4011027E8035A50',
    `1807F456#${ctsData}`,
    '1810F456#8813F40102FFFFFF',
    '1811F456#7413F30126015A3C1E00',
    '1812F456#7013F2012D00AAFFFF',
    '18190056#0100000000000000'
  ].join('\n')
}

const input = ref(buildDemoInput())
const frames = ref<Gbt27930Frame[]>([])
const parseError = ref('')

const summaryCards = computed(() => {
  const total = frames.value.length
  const abnormal = frames.value.filter(item => item.error || item.warning).length
  const known = frames.value.filter(item => item.messageCode !== 'UNKNOWN' && item.messageCode !== '-').length
  const stages = new Set(frames.value.map(item => item.stage).filter(stage => stage !== '异常' && stage !== '未知'))

  return [
    { label: '总帧数', value: total },
    { label: '已识别', value: known },
    { label: '阶段数', value: stages.size },
    { label: '异常/提示', value: abnormal, status: abnormal ? 'warning' : 'success' },
    { label: '协议', value: 'GB/T 27930' }
  ]
})

const stageSummary = computed(() => {
  const order = ['握手', '辨识', '参数配置', '充电', '结束', '统计', '错误', '多包传输', '未知', '异常']
  return order
    .map(name => ({ name, count: frames.value.filter(item => item.stage === name).length }))
    .filter(item => item.count > 0)
})

const handleParse = () => {
  parseError.value = ''
  try {
    frames.value = parseGbt27930Input(input.value)
    if (!frames.value.length) parseError.value = '请输入 GB/T 27930 CAN 日志'
  } catch (err) {
    frames.value = []
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  input.value = buildDemoInput()
  handleParse()
}

const clearInput = () => {
  input.value = ''
  frames.value = []
  parseError.value = ''
}

const copyResult = () => {
  const lines = frames.value.map(frame => {
    const fields = frame.fields.map(field => `${field.label}=${field.value}`).join(', ')
    return [
      `#${frame.order} ${frame.messageCode} ${frame.messageName}`,
      `CAN=0x${frame.canId} PGN=${frame.pgn} ${frame.source} -> ${frame.destination}`,
      fields ? `字段: ${fields}` : '',
      frame.warning ? `提示: ${frame.warning}` : '',
      frame.error ? `异常: ${frame.error}` : ''
    ].filter(Boolean).join('\n')
  })
  copy(lines.join('\n\n'), '已复制 27930 解析结果')
}

const tagType = (frame: Gbt27930Frame) => {
  if (frame.error) return 'error'
  if (frame.warning) return 'warning'
  if (frame.stage === '错误') return 'error'
  if (frame.stage === '充电') return 'success'
  return 'info'
}

handleParse()
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
  min-height: 0;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(360px, 0.86fr) minmax(500px, 1.14fr);
  gap: var(--spacing-md);
  align-items: start;
}

.panel-card,
.result-card {
  border-radius: var(--radius-md);
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.result-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.parse-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--spacing-sm);
}

.summary-tile {
  min-height: 70px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.summary-tile span,
.stage-pill span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.summary-tile strong,
.stage-pill strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  line-height: 1.35;
}

.summary-tile--success {
  border-color: rgba(0, 186, 124, 0.38);
  background: rgba(0, 186, 124, 0.08);
}

.summary-tile--warning {
  border-color: rgba(240, 162, 58, 0.42);
  background: rgba(240, 162, 58, 0.1);
}

.stage-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.stage-pill {
  min-width: 90px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.section-gap {
  margin-bottom: var(--spacing-md);
}

.field-list {
  margin-top: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(140px, 0.32fr) minmax(0, 1fr) minmax(150px, 0.48fr);
  gap: var(--spacing-sm);
  align-items: start;
  padding: 9px 12px;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.field-row:last-child {
  border-bottom: none;
}

.field-label {
  color: var(--color-text-secondary);
  font-weight: 700;
}

.field-value {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  word-break: break-all;
}

.field-remark {
  color: var(--color-text-tertiary);
}

:deep(.n-card__content) {
  min-width: 0;
}

@media (max-width: 1180px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .parse-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .field-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .parse-summary {
    grid-template-columns: 1fr;
  }
}
</style>
