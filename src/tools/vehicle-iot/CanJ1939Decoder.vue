<template>
  <div class="tool-container">
    <ToolHeader
      title="CAN / J1939 / DBC 解码器"
      description="解析 CAN 日志、J1939 29 位标识符、DM1 故障码，并按 DBC 信号定义换算物理值"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <section class="input-stack">
          <n-card class="panel-card" title="CAN 日志">
            <n-space vertical :size="14">
              <div class="actions-row">
                <n-button type="primary" @click="handleDecode">解码</n-button>
                <n-button @click="loadDemo">示例</n-button>
                <n-button @click="clearInput">清空</n-button>
                <n-button :disabled="!frames.length" @click="copyDecoded">复制结果</n-button>
              </div>

              <n-input
                v-model:value="canInput"
                type="textarea"
                :rows="11"
                placeholder="支持 candump、ASC、ID#DATA，例如：&#10;(1717747200.123456) can0 18FECA00#C0FFFFFFE8031A05"
                clearable
              />

              <n-alert type="info" :bordered="false" size="small">
                支持 `18FECA00#...`、`can0 18FECA00 [8] ...`、ASC `1.0 1 18FECA00x Rx d 8 ...` 等常见格式。
              </n-alert>
            </n-space>
          </n-card>

          <n-card class="panel-card" title="DBC 信号定义">
            <n-space vertical :size="12">
              <n-input
                v-model:value="dbcInput"
                type="textarea"
                :rows="9"
                placeholder="可选。支持 BO_ / SG_ 常见定义，用于把 CAN 数据换算为物理值。"
                clearable
              />
              <div class="dbc-meta">
                <n-tag size="small" :bordered="false">已识别 {{ dbcMessages.length }} 个报文定义</n-tag>
                <n-tag v-if="dbcErrors.length" size="small" type="warning" :bordered="false">
                  {{ dbcErrors.length }} 条 DBC 提示
                </n-tag>
              </div>
            </n-space>
          </n-card>
        </section>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!frames.length && !parseError" description="解码结果将在这里展示" />

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

          <n-alert v-if="dbcErrors.length" type="warning">
            {{ dbcErrors.join('；') }}
          </n-alert>

          <n-card
            v-for="frame in frames"
            :key="`${frame.order}-${frame.rawLine}`"
            class="result-card"
            :title="`第 ${frame.order} 帧`"
          >
            <template #header-extra>
              <n-tag :type="frame.error ? 'error' : frame.extended ? 'success' : 'default'" size="small">
                {{ frame.error ? '异常' : frame.extended ? '扩展帧' : '标准帧' }}
              </n-tag>
            </template>

            <n-alert v-if="frame.error" type="error" class="section-gap">
              {{ frame.error }}
            </n-alert>

            <n-descriptions v-else bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item label="CAN ID">
                0x{{ frame.idHex }}
              </n-descriptions-item>
              <n-descriptions-item label="DLC">
                {{ frame.dlc }}
              </n-descriptions-item>
              <n-descriptions-item label="通道">
                {{ frame.channel || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="时间戳">
                {{ frame.timestamp || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="数据">
                {{ frame.dataHex || '空' }}
              </n-descriptions-item>
              <n-descriptions-item label="格式">
                {{ frame.format }}
              </n-descriptions-item>
            </n-descriptions>

            <div v-if="frame.j1939" class="field-list">
              <div class="field-row">
                <span class="field-label">PGN</span>
                <span class="field-value">0x{{ frame.j1939.pgnHex }}</span>
                <span class="field-remark">{{ frame.j1939.pgnName }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">优先级</span>
                <span class="field-value">{{ frame.j1939.priority }}</span>
                <span class="field-remark">R={{ frame.j1939.reserved }} / DP={{ frame.j1939.dataPage }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">PF / PS / SA</span>
                <span class="field-value">
                  {{ frame.j1939.pduFormat }} / {{ frame.j1939.pduSpecific }} / {{ frame.j1939.sourceAddress }}
                </span>
                <span class="field-remark">
                  {{ frame.j1939.isPdu1 ? `PDU1 目标地址 ${frame.j1939.destinationAddress}` : 'PDU2 广播/组扩展' }}
                </span>
              </div>
            </div>

            <section v-if="frame.j1939?.dm1" class="dm1-panel">
              <div class="section-heading">
                <strong>DM1 故障码</strong>
                <n-tag size="small" :bordered="false">灯状态 {{ frame.j1939.dm1.lampStatus }}</n-tag>
              </div>

              <div v-if="frame.j1939.dm1.dtcs.length" class="dtc-grid">
                <div v-for="dtc in frame.j1939.dm1.dtcs" :key="`${dtc.spn}-${dtc.fmi}-${dtc.occurrenceCount}`" class="dtc-card">
                  <span>SPN {{ dtc.spn }}</span>
                  <strong>FMI {{ dtc.fmi }}</strong>
                  <small>次数 {{ dtc.occurrenceCount }} / CM {{ dtc.conversionMethod }}</small>
                </div>
              </div>
              <n-text v-else depth="3">未解析到有效 DTC。</n-text>
            </section>

            <section v-if="frame.dbcMessage" class="dbc-panel">
              <div class="section-heading">
                <strong>{{ frame.dbcMessage.name }}</strong>
                <n-tag size="small" :bordered="false">DBC 0x{{ frame.dbcMessage.idHex }}</n-tag>
              </div>

              <div v-if="frame.dbcSignals.length" class="signal-grid">
                <div v-for="signal in frame.dbcSignals" :key="signal.name" class="signal-card">
                  <span>{{ signal.name }}</span>
                  <strong>{{ signal.displayValue }} {{ signal.unit }}</strong>
                  <small>raw {{ signal.raw }}</small>
                </div>
              </div>
              <n-text v-else depth="3">DBC 报文已匹配，但没有可解码信号。</n-text>
            </section>
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
  NTag,
  NText
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { parseCanInput, type CanFrame, type DbcMessage } from './canJ1939'

const { copy } = useClipboard()

const demoCan = [
  '(1717747200.123456) can0 18FECA00#C0FFFFFFE8031A05',
  'can0 18FEF100 [8] FF FF 68 13 FF FF FF FF',
  '18F00400#FF7D7D6823FFFF00'
].join('\n')

const demoDbc = [
  'BO_ 419361024 EEC1: 8 Vector__XXX',
  ' SG_ EngineSpeed : 24|16@1+ (0.125,0) [0|8031.875] "rpm" Vector__XXX',
  ' SG_ ActualEnginePercentTorque : 16|8@1- (1,-125) [-125|125] "%" Vector__XXX',
  'BO_ 419426560 CCVS: 8 Vector__XXX',
  ' SG_ WheelBasedVehicleSpeed : 16|16@1+ (0.00390625,0) [0|250.996] "km/h" Vector__XXX'
].join('\n')

const canInput = ref(demoCan)
const dbcInput = ref(demoDbc)
const frames = ref<CanFrame[]>([])
const dbcMessages = ref<DbcMessage[]>([])
const dbcErrors = ref<string[]>([])
const parseError = ref('')

const summaryCards = computed(() => {
  const total = frames.value.length
  const abnormal = frames.value.filter(frame => frame.error).length
  const j1939Count = frames.value.filter(frame => frame.j1939).length
  const dm1Count = frames.value.reduce((sum, frame) => sum + (frame.j1939?.dm1?.dtcs.length ?? 0), 0)
  const dbcMatched = frames.value.filter(frame => frame.dbcMessage).length

  return [
    { label: '总帧数', value: total },
    { label: 'J1939', value: j1939Count },
    { label: 'DM1 DTC', value: dm1Count },
    { label: 'DBC 匹配', value: dbcMatched },
    {
      label: '异常',
      value: abnormal,
      status: abnormal ? 'error' : 'success'
    }
  ]
})

const handleDecode = () => {
  parseError.value = ''
  try {
    const result = parseCanInput(canInput.value, dbcInput.value)
    frames.value = result.frames
    dbcMessages.value = result.dbcMessages
    dbcErrors.value = result.dbcErrors
    if (!frames.value.length) parseError.value = '请输入 CAN 日志'
  } catch (err) {
    frames.value = []
    dbcMessages.value = []
    dbcErrors.value = []
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  canInput.value = demoCan
  dbcInput.value = demoDbc
  handleDecode()
}

const clearInput = () => {
  canInput.value = ''
  dbcInput.value = ''
  frames.value = []
  dbcMessages.value = []
  dbcErrors.value = []
  parseError.value = ''
}

const copyDecoded = () => {
  const lines = frames.value.map(frame => {
    if (frame.error) return `#${frame.order} ${frame.rawLine}\n异常: ${frame.error}`
    const j1939 = frame.j1939
    const signals = frame.dbcSignals.map(signal => `${signal.name}=${signal.displayValue}${signal.unit}`).join(', ')
    return [
      `#${frame.order} ID=0x${frame.idHex} DLC=${frame.dlc} DATA=${frame.dataHex}`,
      j1939 ? `PGN=0x${j1939.pgnHex} ${j1939.pgnName} SA=${j1939.sourceAddress}${j1939.destinationAddress !== undefined ? ` DA=${j1939.destinationAddress}` : ''}` : '',
      frame.j1939?.dm1 ? `DM1=${frame.j1939.dm1.dtcs.map(dtc => `SPN${dtc.spn}/FMI${dtc.fmi}`).join(', ') || '-'}` : '',
      signals ? `DBC=${signals}` : ''
    ].filter(Boolean).join('\n')
  })
  copy(lines.join('\n\n'), '已复制 CAN 解码结果')
}

handleDecode()
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
  grid-template-columns: minmax(360px, 0.85fr) minmax(500px, 1.15fr);
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

.actions-row,
.dbc-meta,
.section-heading {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.section-heading {
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.section-heading strong {
  color: var(--color-text-primary);
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
  font-weight: 700;
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

.summary-tile--error {
  border-color: rgba(244, 33, 46, 0.38);
  background: rgba(244, 33, 46, 0.08);
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
  grid-template-columns: minmax(120px, 0.28fr) minmax(0, 1fr) minmax(150px, 0.5fr);
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

.dm1-panel,
.dbc-panel {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.dtc-grid,
.signal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-sm);
}

.dtc-card,
.signal-card {
  min-height: 76px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
}

.dtc-card span,
.signal-card span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.dtc-card strong,
.signal-card strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  line-height: 1.35;
  word-break: break-word;
}

.dtc-card small,
.signal-card small {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
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
