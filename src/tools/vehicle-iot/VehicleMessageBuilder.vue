<template>
  <div class="tool-container">
    <ToolHeader
      title="报文构造器"
      description="按 JT808、GB32960、OCPP、GB/T 27930 常用模板生成联调报文，并核对关键字段"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <section class="input-stack">
          <n-card class="panel-card" title="模板选择">
            <n-space vertical :size="14">
              <n-select
                :value="selectedTemplateId"
                :options="templateOptions"
                @update:value="setTemplate"
              />

              <div class="template-list">
                <button
                  v-for="template in vehicleMessageTemplates"
                  :key="template.id"
                  type="button"
                  class="template-card"
                  :class="{ 'template-card--active': template.id === selectedTemplateId }"
                  @click="setTemplate(template.id)"
                >
                  <span>{{ template.protocol }}</span>
                  <strong>{{ template.name }}</strong>
                  <small>{{ template.description }}</small>
                </button>
              </div>
            </n-space>
          </n-card>

          <n-card v-if="selectedTemplate" class="panel-card" title="字段配置">
            <n-space vertical :size="14">
              <div class="actions-row">
                <n-button type="primary" @click="handleBuild">构造</n-button>
                <n-button @click="resetFields">重置</n-button>
                <n-button :disabled="!buildResult" @click="copyOutput">复制输出</n-button>
              </div>

              <div class="field-form">
                <label
                  v-for="field in selectedTemplate.fields"
                  :key="field.key"
                  class="form-row"
                >
                  <span class="form-label">{{ field.label }}</span>

                  <n-input
                    v-if="field.type === 'text'"
                    :value="stringFieldValue(field.key)"
                    :placeholder="field.placeholder"
                    clearable
                    @update:value="value => setFieldValue(field.key, value)"
                  />

                  <n-input
                    v-else-if="field.type === 'textarea'"
                    type="textarea"
                    :rows="4"
                    :value="stringFieldValue(field.key)"
                    :placeholder="field.placeholder"
                    clearable
                    @update:value="value => setFieldValue(field.key, value)"
                  />

                  <n-input-number
                    v-else-if="field.type === 'number'"
                    :value="numberFieldValue(field.key)"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step ?? 1"
                    class="number-input"
                    @update:value="value => setFieldValue(field.key, value ?? 0)"
                  />

                  <n-select
                    v-else
                    :value="stringFieldValue(field.key)"
                    :options="fieldSelectOptions(field)"
                    @update:value="value => setFieldValue(field.key, String(value))"
                  />
                </label>
              </div>
            </n-space>
          </n-card>
        </section>

        <section class="result-stack">
          <n-alert v-if="buildError" type="error">{{ buildError }}</n-alert>
          <n-empty v-if="!buildResult && !buildError" description="构造结果将在这里展示" />

          <div v-if="buildResult" class="parse-summary">
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

          <n-card v-if="buildResult" class="result-card" :title="buildResult.title">
            <template #header-extra>
              <n-tag size="small" type="info">{{ buildResult.protocol }}</n-tag>
            </template>

            <n-space vertical :size="14">
              <div class="actions-row">
                <n-button type="primary" @click="handleBuild">重新构造</n-button>
                <n-button @click="copyOutput">复制输出</n-button>
                <n-button @click="copyDetails">复制明细</n-button>
              </div>

              <n-input
                :value="buildResult.output"
                type="textarea"
                :rows="buildResult.outputFormat === 'json' ? 14 : 8"
                readonly
              />

              <n-alert
                v-for="warning in buildResult.warnings"
                :key="warning"
                type="warning"
                :bordered="false"
              >
                {{ warning }}
              </n-alert>

              <div class="field-list">
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
import { computed, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  buildVehicleMessage,
  getDefaultTemplateValues,
  vehicleMessageTemplates,
  type TemplateField,
  type MessageBuildResult,
  type TemplateValues
} from './vehicleMessageBuilder'

const { copy } = useClipboard()

const selectedTemplateId = ref(vehicleMessageTemplates[0]?.id ?? '')
const formValues = ref<TemplateValues>({})
const buildResult = ref<MessageBuildResult | null>(null)
const buildError = ref('')

const templateOptions = computed(() => vehicleMessageTemplates.map(template => ({
  label: `${template.protocol} · ${template.name}`,
  value: template.id
})))

const selectedTemplate = computed(() => {
  return vehicleMessageTemplates.find(template => template.id === selectedTemplateId.value) ?? vehicleMessageTemplates[0]
})

const summaryCards = computed(() => {
  if (!buildResult.value || !selectedTemplate.value) return []
  return [
    { label: '协议', value: buildResult.value.protocol },
    { label: '模板字段', value: selectedTemplate.value.fields.length },
    { label: '输出类型', value: buildResult.value.outputFormat.toUpperCase() },
    {
      label: '提示',
      value: buildResult.value.warnings.length,
      status: buildResult.value.warnings.length ? 'warning' : 'success'
    }
  ]
})

const setTemplate = (templateId: string) => {
  selectedTemplateId.value = templateId
}

const resetFields = () => {
  if (!selectedTemplate.value) return
  formValues.value = getDefaultTemplateValues(selectedTemplate.value)
  handleBuild()
}

const setFieldValue = (key: string, value: string | number) => {
  formValues.value = {
    ...formValues.value,
    [key]: value
  }
  handleBuild()
}

const stringFieldValue = (key: string): string => {
  const value = formValues.value[key]
  return value === undefined ? '' : String(value)
}

const numberFieldValue = (key: string): number => {
  const value = Number(formValues.value[key])
  return Number.isFinite(value) ? value : 0
}

const fieldSelectOptions = (field: TemplateField): SelectOption[] => {
  return field.options?.map(option => ({
    label: option.label,
    value: option.value
  })) ?? []
}

const handleBuild = () => {
  buildError.value = ''
  try {
    buildResult.value = buildVehicleMessage(selectedTemplateId.value, formValues.value)
  } catch (err) {
    buildResult.value = null
    buildError.value = (err as Error).message
  }
}

const copyOutput = () => {
  if (!buildResult.value) return
  copy(buildResult.value.output, '已复制构造报文')
}

const copyDetails = () => {
  if (!buildResult.value) return
  const rows = buildResult.value.rows.map(row => `${row.label}: ${row.value}${row.remark ? ` (${row.remark})` : ''}`)
  copy([buildResult.value.title, buildResult.value.output, ...rows].join('\n'), '已复制报文明细')
}

watch(selectedTemplateId, () => {
  if (!selectedTemplate.value) return
  formValues.value = getDefaultTemplateValues(selectedTemplate.value)
  handleBuild()
}, { immediate: true })
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
  grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.1fr);
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

.template-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-sm);
}

.template-card {
  min-height: 86px;
  padding: 11px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.template-card:hover,
.template-card--active {
  border-color: rgba(34, 211, 238, 0.58);
  background: rgba(34, 211, 238, 0.08);
}

.template-card span {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.template-card strong {
  color: var(--color-text-primary);
  line-height: 1.3;
}

.template-card small {
  color: var(--color-text-tertiary);
  line-height: 1.45;
}

.field-form {
  display: grid;
  gap: var(--spacing-sm);
}

.form-row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
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
  word-break: break-word;
}

.summary-tile--success {
  border-color: rgba(0, 186, 124, 0.38);
  background: rgba(0, 186, 124, 0.08);
}

.summary-tile--warning {
  border-color: rgba(240, 162, 58, 0.42);
  background: rgba(240, 162, 58, 0.1);
}

.field-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.3fr) minmax(0, 1fr) minmax(150px, 0.45fr);
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
  .field-row {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .parse-summary {
    grid-template-columns: 1fr;
  }
}
</style>
