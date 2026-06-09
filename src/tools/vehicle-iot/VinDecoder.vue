<template>
  <div class="tool-container">
    <ToolHeader
      title="VIN 解析/校验"
      description="解析车架号 WMI、年份码、工厂与序列号，并按 ISO 3779 规则校验第 9 位校验位"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="VIN 输入">
          <n-space vertical :size="14">
            <div class="actions-row">
              <n-button type="primary" @click="handleParse">解析</n-button>
              <n-button @click="loadDemo">示例</n-button>
              <n-button @click="clearInput">清空</n-button>
              <n-button :disabled="!results.length" @click="copyResult">复制结果</n-button>
            </div>

            <n-input
              v-model:value="vinInput"
              type="textarea"
              :rows="14"
              placeholder="每行一个 VIN，例如：&#10;1M8GDM9AXKP042788&#10;1HGCM82633A004352"
              clearable
            />

            <n-alert type="info" :bordered="false" size="small">
              会自动移除空格和短横线，VIN 中 I/O/Q 为禁用字符；年份码存在 30 年循环，需结合车辆年代判断。
            </n-alert>
          </n-space>
        </n-card>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!results.length && !parseError" description="VIN 解析结果将在这里展示" />

          <div v-if="results.length" class="parse-summary">
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

          <n-card
            v-for="result in results"
            :key="`${result.order}-${result.normalized}`"
            class="result-card"
            :title="`第 ${result.order} 个 VIN`"
          >
            <template #header-extra>
              <n-tag :type="resultTagType(result)" size="small">
                {{ result.valid ? '校验通过' : '需核对' }}
              </n-tag>
            </template>

            <n-alert
              v-for="warning in result.warnings"
              :key="warning"
              type="warning"
              :bordered="false"
              class="section-gap"
            >
              {{ warning }}
            </n-alert>

            <n-descriptions bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item label="VIN">
                {{ result.normalized || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="长度">
                {{ result.normalized.length }} / 17
              </n-descriptions-item>
              <n-descriptions-item label="校验位">
                {{ result.checkDigit.actual }} / 应为 {{ result.checkDigit.expected }}
              </n-descriptions-item>
              <n-descriptions-item label="年份">
                {{ modelYearText(result) }}
              </n-descriptions-item>
              <n-descriptions-item label="区域">
                {{ result.region }} / {{ result.country }}
              </n-descriptions-item>
              <n-descriptions-item label="厂商">
                {{ result.manufacturer }}
              </n-descriptions-item>
            </n-descriptions>

            <div class="field-list">
              <div v-for="row in result.rows" :key="row.label" class="field-row">
                <span class="field-label">{{ row.label }}</span>
                <span class="field-value">{{ row.value }}</span>
                <span class="field-remark">{{ row.remark || '' }}</span>
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
import { buildVinDemoInput, parseVinInput, type VinAnalysisResult } from './vin'

type TagType = 'success' | 'warning' | 'error'

const { copy } = useClipboard()

const vinInput = ref(buildVinDemoInput())
const results = ref<VinAnalysisResult[]>([])
const parseError = ref('')

const summaryCards = computed(() => {
  const total = results.value.length
  const passed = results.value.filter(result => result.valid).length
  const checkPassed = results.value.filter(result => result.checkDigit.matched).length
  const warnings = results.value.reduce((sum, result) => sum + result.warnings.length, 0)

  return [
    { label: '总数', value: total },
    { label: '有效 VIN', value: passed, status: passed === total ? 'success' : 'warning' },
    { label: '校验通过', value: checkPassed },
    { label: '提示', value: warnings, status: warnings ? 'warning' : 'success' }
  ]
})

const handleParse = () => {
  parseError.value = ''
  results.value = parseVinInput(vinInput.value)
  if (!results.value.length) parseError.value = '请输入至少一个 VIN'
}

const loadDemo = () => {
  vinInput.value = buildVinDemoInput()
  handleParse()
}

const clearInput = () => {
  vinInput.value = ''
  results.value = []
  parseError.value = ''
}

const copyResult = () => {
  const lines = results.value.map(result => {
    const warnings = result.warnings.length ? `提示: ${result.warnings.join('；')}` : ''
    return [
      `#${result.order} ${result.normalized}`,
      `WMI=${result.wmi} 厂商=${result.manufacturer} 区域=${result.region}/${result.country}`,
      `校验位=${result.checkDigit.actual} 计算=${result.checkDigit.expected} ${result.checkDigit.matched ? '通过' : '不通过'}`,
      `年份=${modelYearText(result)} 工厂=${result.plantCode || '-'} 序列号=${result.serialNumber || '-'}`,
      warnings
    ].filter(Boolean).join('\n')
  })
  copy(lines.join('\n\n'), '已复制 VIN 解析结果')
}

const resultTagType = (result: VinAnalysisResult): TagType => {
  if (result.valid) return 'success'
  if (result.checkDigit.applicable || result.warnings.length) return 'warning'
  return 'error'
}

const modelYearText = (result: VinAnalysisResult): string => {
  return result.modelYears.length ? result.modelYears.join(' / ') : '-'
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
  grid-template-columns: minmax(360px, 0.82fr) minmax(520px, 1.18fr);
  gap: var(--spacing-md);
  align-items: start;
}

.result-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
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

.parse-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.summary-tile span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.summary-tile strong {
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
  border-color: rgba(245, 159, 0, 0.38);
  background: rgba(245, 159, 0, 0.08);
}

.section-gap {
  margin-bottom: var(--spacing-sm);
}

.field-list {
  margin-top: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.26fr) minmax(0, 0.8fr) minmax(170px, 0.5fr);
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
  font-weight: 600;
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
}

@media (max-width: 720px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .parse-summary,
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
