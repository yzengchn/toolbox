<template>
  <div class="tool-container">
    <ToolHeader
      title="OBD-II / UDS 诊断工具"
      description="解析 OBD-II PID、DTC 故障码、UDS 服务和 ISO-TP 单帧/多帧诊断载荷"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="诊断数据输入">
          <n-space vertical :size="14">
            <div class="actions-row">
              <n-button type="primary" @click="handleParse">解析</n-button>
              <n-button @click="loadDemo">示例</n-button>
              <n-button @click="clearInput">清空</n-button>
              <n-button :disabled="!results.length" @click="copyResult">复制结果</n-button>
            </div>

            <n-input
              v-model:value="diagnosticInput"
              type="textarea"
              :rows="18"
              placeholder="支持 OBD/UDS Hex、CAN ID + 数据、DTC 文本，例如：&#10;7E8 04 41 0C 1A F8&#10;7E8 06 43 01 33 03 01 00&#10;7E8 03 7F 22 31&#10;P0301 P0420"
              clearable
            />

            <n-alert type="info" :bordered="false" size="small">
              自动识别 ISO-TP 单帧、OBD Mode 01/03/07/09/0A、UDS 正响应/负响应，以及直接粘贴的 P/C/B/U 类 DTC。
            </n-alert>
          </n-space>
        </n-card>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!results.length && !parseError" description="解析结果将在这里展示" />

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
            v-for="item in results"
            :key="`${item.order}-${item.rawLine}`"
            class="result-card"
            :title="`第 ${item.order} 条`"
          >
            <template #header-extra>
              <n-tag :type="item.error ? 'error' : item.dtcs.length ? 'warning' : 'success'" size="small">
                {{ item.error ? '异常' : item.protocol }}
              </n-tag>
            </template>

            <n-alert v-if="item.error" type="error" class="section-gap">
              {{ item.error }}
            </n-alert>

            <n-descriptions v-else bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item label="协议">
                {{ item.protocol }}
              </n-descriptions-item>
              <n-descriptions-item label="CAN ID">
                {{ item.canId || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="原始字节">
                {{ item.bytesHex || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="诊断载荷">
                {{ item.payloadHex || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="ISO-TP">
                {{ item.isoTp ? item.isoTp.type : '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="载荷长度">
                {{ item.isoTp?.length ?? '-' }}
              </n-descriptions-item>
            </n-descriptions>

            <div v-if="item.fields.length" class="field-list">
              <div v-for="field in item.fields" :key="field.label" class="field-row">
                <span class="field-label">{{ field.label }}</span>
                <span class="field-value">{{ field.value }}</span>
                <span v-if="field.remark" class="field-remark">{{ field.remark }}</span>
              </div>
            </div>

            <section v-if="item.pids.length" class="detail-panel">
              <div class="section-heading">
                <strong>PID 物理值</strong>
                <n-tag size="small" :bordered="false">{{ item.pids.length }} 项</n-tag>
              </div>
              <div class="metric-grid">
                <div v-for="pid in item.pids" :key="pid.pid" class="metric-card">
                  <span>PID 0x{{ pid.pid }}</span>
                  <strong>{{ pid.value }}</strong>
                  <small>{{ pid.name }} / Raw {{ pid.raw }}</small>
                </div>
              </div>
            </section>

            <section v-if="item.dtcs.length" class="detail-panel">
              <div class="section-heading">
                <strong>DTC 故障码</strong>
                <n-tag size="small" type="warning" :bordered="false">{{ item.dtcs.length }} 个</n-tag>
              </div>
              <div class="dtc-grid">
                <div v-for="dtc in item.dtcs" :key="dtc.code" class="dtc-card">
                  <span>{{ dtc.system }}</span>
                  <strong>{{ dtc.code }}</strong>
                  <small>{{ dtc.type }}</small>
                  <p>{{ dtc.description }}</p>
                </div>
              </div>
            </section>

            <section v-if="item.uds" class="detail-panel">
              <div class="section-heading">
                <strong>UDS 服务</strong>
                <n-tag :type="item.uds.positive ? 'success' : 'error'" size="small" :bordered="false">
                  {{ item.uds.positive ? '正响应/请求' : '负响应' }}
                </n-tag>
              </div>
              <div class="field-list field-list--compact">
                <div class="field-row">
                  <span class="field-label">SID</span>
                  <span class="field-value">0x{{ item.uds.sid }}</span>
                  <span class="field-remark">{{ item.uds.service }}</span>
                </div>
                <div v-if="item.uds.requestSid" class="field-row">
                  <span class="field-label">请求 SID</span>
                  <span class="field-value">0x{{ item.uds.requestSid }}</span>
                  <span class="field-remark">原始服务</span>
                </div>
                <div v-if="item.uds.nrc" class="field-row">
                  <span class="field-label">NRC</span>
                  <span class="field-value">0x{{ item.uds.nrc }}</span>
                  <span class="field-remark">{{ item.uds.nrcName }}</span>
                </div>
                <div v-if="item.uds.did" class="field-row">
                  <span class="field-label">DID</span>
                  <span class="field-value">0x{{ item.uds.did }}</span>
                  <span class="field-remark">数据标识符</span>
                </div>
              </div>
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
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { parseDiagnosticInput, type DiagnosticParseResult } from './obdUds'

const { copy } = useClipboard()

const demoInput = [
  '7E8 04 41 0C 1A F8',
  '7E8 03 41 0D 58',
  '7E8 06 43 01 33 03 01 00',
  '7E8 03 7F 22 31',
  '7E8 06 62 F1 90 4C 47 42',
  'P0301 P0420'
].join('\n')

const diagnosticInput = ref(demoInput)
const results = ref<DiagnosticParseResult[]>([])
const parseError = ref('')

const summaryCards = computed(() => {
  const total = results.value.length
  const abnormal = results.value.filter(item => item.error).length
  const dtcCount = results.value.reduce((sum, item) => sum + item.dtcs.length, 0)
  const pidCount = results.value.reduce((sum, item) => sum + item.pids.length, 0)
  const udsCount = results.value.filter(item => item.uds).length

  return [
    { label: '总条数', value: total },
    { label: 'PID', value: pidCount },
    { label: 'DTC', value: dtcCount },
    { label: 'UDS', value: udsCount },
    {
      label: '异常',
      value: abnormal,
      status: abnormal ? 'error' : 'success'
    }
  ]
})

const handleParse = () => {
  parseError.value = ''
  try {
    results.value = parseDiagnosticInput(diagnosticInput.value)
    if (!results.value.length) parseError.value = '请输入诊断 Hex 或 DTC 文本'
  } catch (err) {
    results.value = []
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  diagnosticInput.value = demoInput
  handleParse()
}

const clearInput = () => {
  diagnosticInput.value = ''
  results.value = []
  parseError.value = ''
}

const copyResult = () => {
  const lines = results.value.map(item => {
    if (item.error) return `#${item.order} ${item.rawLine}\n异常: ${item.error}`
    const pids = item.pids.map(pid => `${pid.name}=${pid.value}`).join(', ')
    const dtcs = item.dtcs.map(dtc => `${dtc.code} ${dtc.description}`).join(', ')
    const uds = item.uds ? `UDS=${item.uds.sid} ${item.uds.service}${item.uds.nrc ? ` NRC=${item.uds.nrc} ${item.uds.nrcName}` : ''}` : ''
    return [
      `#${item.order} ${item.protocol}`,
      `CAN ID=${item.canId || '-'} Payload=${item.payloadHex || '-'}`,
      pids ? `PID=${pids}` : '',
      dtcs ? `DTC=${dtcs}` : '',
      uds
    ].filter(Boolean).join('\n')
  })
  copy(lines.join('\n\n'), '已复制诊断解析结果')
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

.actions-row,
.section-heading {
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

.field-list--compact {
  margin-top: 0;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.3fr) minmax(0, 1fr) minmax(150px, 0.5fr);
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

.detail-panel {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.metric-grid,
.dtc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--spacing-sm);
}

.metric-card,
.dtc-card {
  min-height: 90px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.metric-card span,
.dtc-card span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.metric-card strong,
.dtc-card strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  line-height: 1.35;
}

.metric-card small,
.dtc-card small {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.dtc-card p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.45;
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
