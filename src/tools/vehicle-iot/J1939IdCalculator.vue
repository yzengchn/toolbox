<template>
  <div class="tool-container">
    <ToolHeader
      title="J1939 ID/PGN 计算器"
      description="29 位 CAN ID 与 J1939 PGN、优先级、源地址、目标地址互转"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <section class="input-stack">
          <n-card class="panel-card" title="解析 CAN ID">
            <n-space vertical :size="14">
              <div class="actions-row">
                <n-button type="primary" @click="handleDecode">解析</n-button>
                <n-button @click="loadDemo">示例</n-button>
                <n-button @click="clearDecode">清空</n-button>
                <n-button :disabled="!decodeResult" @click="copyDecode">复制解析</n-button>
              </div>

              <n-input
                v-model:value="canIdInput"
                placeholder="18FEF100、0x18FEF100 或 candump 行"
                clearable
                @keyup.enter="handleDecode"
              />

              <n-alert type="info" :bordered="false" size="small">
                支持从 `can0 18FEF100 [8] ...`、`18FEF100#...` 这类日志行中提取 29 位 ID。
              </n-alert>
            </n-space>
          </n-card>

          <n-card class="panel-card" title="按 PGN 构造">
            <n-space vertical :size="14">
              <div class="actions-row">
                <n-button type="primary" @click="handleBuild">构造</n-button>
                <n-button @click="resetBuild">重置</n-button>
                <n-button :disabled="!buildResult" @click="copyBuild">复制构造</n-button>
              </div>

              <div class="field-form">
                <label class="form-row">
                  <span class="form-label">优先级</span>
                  <n-input-number
                    :value="priority"
                    :min="0"
                    :max="7"
                    :step="1"
                    class="number-input"
                    @update:value="setPriority"
                  />
                </label>

                <label class="form-row">
                  <span class="form-label">PGN</span>
                  <n-input
                    v-model:value="pgnInput"
                    placeholder="F004 或 61444"
                    clearable
                    @keyup.enter="handleBuild"
                  />
                </label>

                <label class="form-row">
                  <span class="form-label">源地址 SA</span>
                  <n-input
                    v-model:value="sourceAddressInput"
                    placeholder="00"
                    clearable
                    @keyup.enter="handleBuild"
                  />
                </label>

                <label class="form-row">
                  <span class="form-label">目标/组扩展</span>
                  <n-input
                    v-model:value="destinationAddressInput"
                    placeholder="PDU1 目标地址，PDU2 可作为组扩展"
                    clearable
                    @keyup.enter="handleBuild"
                  />
                </label>
              </div>
            </n-space>
          </n-card>
        </section>

        <section class="result-stack">
          <n-alert v-if="decodeError" type="error">{{ decodeError }}</n-alert>
          <n-alert v-if="buildError" type="error">{{ buildError }}</n-alert>
          <n-empty v-if="!decodeResult && !buildResult && !decodeError && !buildError" description="解析和构造结果将在这里展示" />

          <div v-if="latestResult" class="parse-summary">
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

          <n-card v-if="decodeResult" class="result-card" title="解析结果">
            <template #header-extra>
              <n-tag :type="resultTagType(decodeResult)" size="small">
                {{ decodeResult.pduType }}
              </n-tag>
            </template>

            <n-alert
              v-for="warning in decodeResult.warnings"
              :key="warning"
              type="warning"
              :bordered="false"
              class="section-gap"
            >
              {{ warning }}
            </n-alert>

            <n-descriptions bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item label="CAN ID">
                0x{{ decodeResult.canIdHex }}
              </n-descriptions-item>
              <n-descriptions-item label="PGN">
                0x{{ decodeResult.pgnHex }} {{ decodeResult.pgnName }}
              </n-descriptions-item>
              <n-descriptions-item label="优先级">
                {{ decodeResult.priority }}
              </n-descriptions-item>
              <n-descriptions-item label="地址模式">
                {{ decodeResult.addressMode }}
              </n-descriptions-item>
              <n-descriptions-item label="源地址">
                0x{{ byteHex(decodeResult.sourceAddress) }}
              </n-descriptions-item>
              <n-descriptions-item label="目标地址">
                {{ addressText(decodeResult.destinationAddress) }}
              </n-descriptions-item>
            </n-descriptions>

            <div class="field-list">
              <div v-for="row in decodeResult.rows" :key="row.label" class="field-row">
                <span class="field-label">{{ row.label }}</span>
                <span class="field-value">{{ row.value }}</span>
                <span class="field-remark">{{ row.remark || '' }}</span>
              </div>
            </div>
          </n-card>

          <n-card v-if="buildResult" class="result-card" title="构造结果">
            <template #header-extra>
              <n-tag :type="resultTagType(buildResult)" size="small">
                0x{{ buildResult.canIdHex }}
              </n-tag>
            </template>

            <n-space vertical :size="14">
              <n-input :value="builtOutput" type="textarea" :rows="4" readonly />

              <n-alert
                v-for="warning in buildResult.warnings"
                :key="warning"
                type="warning"
                :bordered="false"
              >
                {{ warning }}
              </n-alert>

              <div class="field-list field-list--compact">
                <div v-for="row in buildResult.rows" :key="row.label" class="field-row">
                  <span class="field-label">{{ row.label }}</span>
                  <span class="field-value">{{ row.value }}</span>
                  <span class="field-remark">{{ row.remark || '' }}</span>
                </div>
              </div>
            </n-space>
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
  NInputNumber,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  buildJ1939DemoValues,
  buildJ1939Id,
  decodeJ1939Id,
  type J1939BuildOptions,
  type J1939IdResult
} from './j1939Id'

type TagType = 'success' | 'warning'

const { copy } = useClipboard()

const demoValues = buildJ1939DemoValues()
const canIdInput = ref('18FEF100')
const priority = ref(demoValues.priority)
const pgnInput = ref(demoValues.pgnInput)
const sourceAddressInput = ref(demoValues.sourceAddressInput)
const destinationAddressInput = ref(demoValues.destinationAddressInput)
const decodeResult = ref<J1939IdResult | null>(null)
const buildResult = ref<J1939IdResult | null>(null)
const latestResult = ref<J1939IdResult | null>(null)
const decodeError = ref('')
const buildError = ref('')

const summaryCards = computed(() => {
  if (!latestResult.value) return []
  const result = latestResult.value
  return [
    { label: 'CAN ID', value: `0x${result.canIdHex}` },
    { label: 'PGN', value: `0x${result.pgnHex}` },
    { label: 'PDU', value: result.pduType },
    { label: '源地址', value: `0x${byteHex(result.sourceAddress)}` },
    { label: '提示', value: result.warnings.length, status: result.warnings.length ? 'warning' : 'success' }
  ]
})

const builtOutput = computed(() => {
  if (!buildResult.value) return ''
  return [
    `0x${buildResult.value.canIdHex}`,
    `${buildResult.value.canIdHex}#`,
    `PGN=0x${buildResult.value.pgnHex} SA=0x${byteHex(buildResult.value.sourceAddress)}`
  ].join('\n')
})

const handleDecode = () => {
  decodeError.value = ''
  try {
    decodeResult.value = decodeJ1939Id(canIdInput.value)
    latestResult.value = decodeResult.value
  } catch (err) {
    decodeResult.value = null
    decodeError.value = (err as Error).message
  }
}

const handleBuild = () => {
  buildError.value = ''
  try {
    const options: J1939BuildOptions = {
      priority: priority.value,
      pgnInput: pgnInput.value,
      sourceAddressInput: sourceAddressInput.value,
      destinationAddressInput: destinationAddressInput.value
    }
    buildResult.value = buildJ1939Id(options)
    latestResult.value = buildResult.value
  } catch (err) {
    buildResult.value = null
    buildError.value = (err as Error).message
  }
}

const loadDemo = () => {
  canIdInput.value = '18FEF100'
  resetBuild()
  handleDecode()
}

const clearDecode = () => {
  const wasLatestDecode = latestResult.value === decodeResult.value
  canIdInput.value = ''
  decodeResult.value = null
  decodeError.value = ''
  if (wasLatestDecode) latestResult.value = buildResult.value
}

const resetBuild = () => {
  const values = buildJ1939DemoValues()
  priority.value = values.priority
  pgnInput.value = values.pgnInput
  sourceAddressInput.value = values.sourceAddressInput
  destinationAddressInput.value = values.destinationAddressInput
  handleBuild()
}

const setPriority = (value: number | null) => {
  priority.value = value ?? 0
}

const copyDecode = () => {
  if (!decodeResult.value) return
  copy(resultToText(decodeResult.value), '已复制 J1939 解析结果')
}

const copyBuild = () => {
  if (!buildResult.value) return
  copy([builtOutput.value, resultToText(buildResult.value)].join('\n\n'), '已复制 J1939 构造结果')
}

const resultToText = (result: J1939IdResult): string => {
  const rows = result.rows.map(row => `${row.label}: ${row.value}${row.remark ? ` (${row.remark})` : ''}`)
  const warnings = result.warnings.length ? [`提示: ${result.warnings.join('；')}`] : []
  return rows.concat(warnings).join('\n')
}

const resultTagType = (result: J1939IdResult): TagType => {
  return result.warnings.length ? 'warning' : 'success'
}

const addressText = (value?: number): string => {
  return value === undefined ? '-' : `0x${byteHex(value)}`
}

const byteHex = (value: number): string => {
  return value.toString(16).toUpperCase().padStart(2, '0')
}

handleDecode()
handleBuild()
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
  grid-template-columns: minmax(360px, 0.85fr) minmax(520px, 1.15fr);
  gap: var(--spacing-md);
  align-items: start;
}

.input-stack,
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

.field-form {
  display: grid;
  gap: var(--spacing-sm);
}

.form-row {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: var(--spacing-sm);
  align-items: center;
}

.form-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.number-input {
  width: 100%;
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
  word-break: break-word;
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

.field-list--compact {
  margin-top: 0;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.26fr) minmax(0, 0.8fr) minmax(180px, 0.52fr);
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

  .parse-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .form-row,
  .field-row,
  .parse-summary {
    grid-template-columns: 1fr;
  }
}
</style>
