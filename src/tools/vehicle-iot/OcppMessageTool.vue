<template>
  <div class="tool-container">
    <ToolHeader
      title="OCPP 报文校验 / 构造工具"
      description="校验 OCPP 1.6J / 2.0.1 JSON 数组报文结构，并按常用 Action 快速构造 CALL、CALLRESULT 和 CALLERROR"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <section class="input-stack">
          <n-card class="panel-card" title="OCPP-J 报文输入">
            <n-space vertical :size="14">
              <div class="control-row">
                <label class="control-field control-field--version">
                  <span>版本</span>
                  <n-select v-model:value="version" :options="versionOptions" />
                </label>
                <div class="actions-row">
                  <n-button type="primary" @click="handleValidate">校验</n-button>
                  <n-button @click="loadDemo">示例</n-button>
                  <n-button @click="clearInput">清空</n-button>
                  <n-button :disabled="!frames.length" @click="copyResult">复制结果</n-button>
                </div>
              </div>

              <n-input
                v-model:value="ocppInput"
                type="textarea"
                :rows="15"
                placeholder="支持单条 OCPP-J 数组、多条数组连续粘贴或外层数组批量输入，例如：&#10;[2,&quot;uid-001&quot;,&quot;BootNotification&quot;,{&quot;chargePointVendor&quot;:&quot;ACME&quot;,&quot;chargePointModel&quot;:&quot;AC-7K&quot;}]"
                clearable
              />

              <n-alert type="info" :bordered="false" size="small">
                重点校验消息类型、UniqueId、Action、Payload 对象结构和常用 Action 必填字段；完整业务枚举仍需结合平台侧 schema。
              </n-alert>
            </n-space>
          </n-card>

          <n-card class="panel-card" title="报文构造器">
            <n-space vertical :size="12">
              <div class="builder-grid">
                <label class="control-field">
                  <span>消息类型</span>
                  <n-select v-model:value="messageKind" :options="messageKindOptions" />
                </label>
                <label class="control-field">
                  <span>Action</span>
                  <n-select v-model:value="selectedAction" :options="actionOptions" filterable />
                </label>
                <label class="control-field">
                  <span>UniqueId</span>
                  <n-input v-model:value="uniqueId" />
                </label>
              </div>

              <div v-if="selectedTemplate" class="template-card">
                <div class="template-main">
                  <strong>{{ selectedTemplate.label }}</strong>
                  <span>{{ selectedTemplate.direction }}</span>
                  <p>{{ selectedTemplate.description }}</p>
                </div>
                <div class="required-tags">
                  <n-tag
                    v-for="field in activeRequiredFields"
                    :key="field"
                    size="small"
                    :bordered="false"
                  >
                    {{ field }}
                  </n-tag>
                  <n-tag v-if="!activeRequiredFields.length" size="small" :bordered="false">
                    无必填字段
                  </n-tag>
                </div>
              </div>

              <div class="actions-row">
                <n-button type="primary" secondary @click="appendBuiltMessage">追加到输入</n-button>
                <n-button @click="replaceWithBuiltMessage">替换输入</n-button>
                <n-button @click="copyBuiltMessage">复制构造报文</n-button>
              </div>

              <pre class="code-preview">{{ builtMessage }}</pre>
            </n-space>
          </n-card>
        </section>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!frames.length && !parseError" description="校验结果将在这里展示" />

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

          <n-card
            v-for="frame in frames"
            :key="`${frame.order}-${frame.rawText}`"
            class="result-card"
            :title="`第 ${frame.order} 条`"
          >
            <template #header-extra>
              <n-tag :type="frame.valid ? 'success' : 'error'" size="small">
                {{ frame.valid ? frame.messageType : '异常' }}
              </n-tag>
            </template>

            <n-descriptions bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item
                v-for="field in frame.fields"
                :key="field.label"
                :label="field.label"
              >
                <span class="mono-value">{{ field.value }}</span>
                <small v-if="field.remark" class="inline-remark">{{ field.remark }}</small>
              </n-descriptions-item>
            </n-descriptions>

            <div v-if="frame.issues.length" class="issue-list">
              <n-alert
                v-for="issue in frame.issues"
                :key="issue.message"
                :type="issueType(issue.severity)"
                :bordered="false"
              >
                {{ issue.message }}
              </n-alert>
            </div>

            <section class="payload-panel">
              <div class="section-heading">
                <strong>Payload</strong>
                <n-tag size="small" :bordered="false">{{ frame.payloadKind }}</n-tag>
              </div>
              <pre class="code-preview code-preview--result">{{ frame.payloadPreview }}</pre>
            </section>
          </n-card>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NInput,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { formatCompactDate } from '@/utils/demoTime'
import {
  buildOcppMessageText,
  getOcppActionTemplates,
  parseOcppInput,
  type OcppFrame,
  type OcppIssueSeverity,
  type OcppMessageKind,
  type OcppVersion
} from './ocpp'

const { copy } = useClipboard()

const versionOptions = [
  { label: 'OCPP 1.6J', value: '1.6' },
  { label: 'OCPP 2.0.1', value: '2.0.1' }
]

const messageKindOptions = [
  { label: 'CALL 请求', value: 'CALL' },
  { label: 'CALLRESULT 响应', value: 'CALLRESULT' },
  { label: 'CALLERROR 异常响应', value: 'CALLERROR' }
]

const version = ref<OcppVersion>('1.6')
const messageKind = ref<OcppMessageKind>('CALL')
const selectedAction = ref('BootNotification')
const defaultUniqueId = () => `uid-${formatCompactDate()}-0001`
const uniqueId = ref(defaultUniqueId())
const ocppInput = ref('')
const frames = ref<OcppFrame[]>([])
const parseError = ref('')

const templates = computed(() => getOcppActionTemplates(version.value))

const actionOptions = computed(() => templates.value.map(template => ({
  label: template.label,
  value: template.action
})))

const selectedTemplate = computed(() => templates.value.find(template => template.action === selectedAction.value))

const activeRequiredFields = computed(() => {
  if (!selectedTemplate.value) return []
  if (messageKind.value === 'CALL') return selectedTemplate.value.requestRequired
  if (messageKind.value === 'CALLRESULT') return selectedTemplate.value.responseRequired
  return ['errorCode', 'errorDescription', 'errorDetails']
})

const builtMessage = computed(() => buildOcppMessageText({
  version: version.value,
  messageKind: messageKind.value,
  action: selectedAction.value,
  uniqueId: uniqueId.value || defaultUniqueId()
}))

const summaryCards = computed(() => {
  const total = frames.value.length
  const errors = frames.value.filter(frame => !frame.valid).length
  const warnings = frames.value.reduce((sum, frame) => sum + frame.issues.filter(issue => issue.severity === 'warning').length, 0)
  const calls = frames.value.filter(frame => frame.messageType === 'CALL').length
  const actions = new Set(frames.value.map(frame => frame.action).filter(Boolean))

  return [
    { label: '总条数', value: total },
    { label: 'CALL', value: calls },
    { label: 'Action', value: actions.size },
    { label: '警告', value: warnings, status: warnings ? 'warning' : undefined },
    { label: '错误', value: errors, status: errors ? 'error' : 'success' }
  ]
})

watch(version, () => {
  if (!templates.value.some(template => template.action === selectedAction.value)) {
    selectedAction.value = templates.value[0]?.action ?? ''
  }
})

const handleValidate = () => {
  parseError.value = ''
  try {
    frames.value = parseOcppInput(ocppInput.value, version.value)
    if (!frames.value.length) parseError.value = '请输入 OCPP-J JSON 数组报文'
  } catch (err) {
    frames.value = []
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  ocppInput.value = [
    buildOcppMessageText({
      version: '1.6',
      messageKind: 'CALL',
      action: 'BootNotification',
      uniqueId: 'uid-demo-boot'
    }),
    buildOcppMessageText({
      version: '1.6',
      messageKind: 'CALL',
      action: 'MeterValues',
      uniqueId: 'uid-demo-meter'
    }),
    '[4,"uid-demo-error","FormationViolation","Payload is invalid",{"field":"connectorId"}]'
  ].join('\n')
  version.value = '1.6'
  handleValidate()
}

const clearInput = () => {
  ocppInput.value = ''
  frames.value = []
  parseError.value = ''
}

const appendBuiltMessage = () => {
  ocppInput.value = [ocppInput.value.trim(), builtMessage.value].filter(Boolean).join('\n')
  handleValidate()
}

const replaceWithBuiltMessage = () => {
  ocppInput.value = builtMessage.value
  handleValidate()
}

const copyBuiltMessage = () => {
  copy(builtMessage.value, '已复制 OCPP 构造报文')
}

const copyResult = () => {
  const lines = frames.value.map(frame => {
    const issues = frame.issues.map(issue => `${issue.severity}: ${issue.message}`).join('; ')
    return [
      `#${frame.order} ${frame.messageType} UID=${frame.uniqueId}`,
      frame.action ? `Action=${frame.action} Direction=${frame.direction}` : '',
      `Payload=${frame.payloadSummary}`,
      issues ? `Issues=${issues}` : 'Issues=none'
    ].filter(Boolean).join('\n')
  })
  copy(lines.join('\n\n'), '已复制 OCPP 校验结果')
}

const issueType = (severity: OcppIssueSeverity): 'error' | 'warning' | 'info' => {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

loadDemo()
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
  grid-template-columns: minmax(380px, 0.9fr) minmax(520px, 1.1fr);
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

.control-row,
.actions-row,
.section-heading,
.required-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.control-row {
  justify-content: space-between;
}

.control-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.control-field > span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.control-field--version {
  width: 132px;
}

.builder-grid {
  display: grid;
  grid-template-columns: 150px minmax(190px, 1fr) minmax(170px, 0.9fr);
  gap: var(--spacing-sm);
  align-items: end;
}

.template-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(170px, 0.45fr);
  gap: var(--spacing-md);
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.template-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.template-main strong {
  color: var(--color-text-primary);
}

.template-main span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.template-main p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.required-tags {
  align-content: start;
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

.summary-tile--warning {
  border-color: rgba(245, 166, 35, 0.42);
  background: rgba(245, 166, 35, 0.09);
}

.summary-tile--error {
  border-color: rgba(244, 33, 46, 0.38);
  background: rgba(244, 33, 46, 0.08);
}

.mono-value {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  word-break: break-all;
}

.inline-remark {
  display: block;
  margin-top: 2px;
  color: var(--color-text-tertiary);
  line-height: 1.45;
}

.issue-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.payload-panel {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.section-heading {
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.section-heading strong {
  color: var(--color-text-primary);
}

.code-preview {
  max-height: 300px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.code-preview--result {
  max-height: 240px;
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

@media (max-width: 760px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .control-row,
  .actions-row {
    align-items: stretch;
  }

  .builder-grid,
  .template-card {
    grid-template-columns: 1fr;
  }

  .control-field--version {
    width: 100%;
  }

  .parse-summary {
    grid-template-columns: 1fr;
  }
}
</style>
