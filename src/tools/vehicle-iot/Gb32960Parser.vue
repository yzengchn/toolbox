<template>
  <div class="tool-container">
    <ToolHeader
      title="GB/T 32960 解析"
      description="新能源车远程服务与管理系统通信报文解析，支持头部、校验、实时信息和常见数据块拆解"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="报文输入">
          <n-space vertical :size="14">
            <div class="actions-row">
              <n-button type="primary" @click="handleParse">分析</n-button>
              <n-button @click="loadDemo">示例</n-button>
              <n-button @click="clearInput">清空</n-button>
              <n-button :disabled="!parseResults.length" @click="copySummary">复制摘要</n-button>
            </div>

            <n-input
              v-model:value="parseInput"
              type="textarea"
              placeholder="输入 GB/T 32960 Hex 报文；多包可按行分隔，例如 23 23 02 FE ..."
              :rows="18"
              clearable
            />

            <n-alert type="info" :bordered="false" size="small">
              支持 23 23 起始符完整帧，也支持去掉起始符后的裸数据。校验采用从命令标识到数据单元末尾的异或校验。
            </n-alert>
          </n-space>
        </n-card>

        <div class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!parseResults.length && !parseError" description="解析结果将在这里展示" />

          <div v-if="parseResults.length" class="parse-summary">
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
            v-for="item in parseResults"
            :key="item.order"
            class="result-card"
            :title="`第 ${item.order} 包`"
          >
            <template #header-extra>
              <n-tag :type="item.checksum.matched ? 'success' : 'error'" size="small">
                XOR {{ item.checksum.matched ? '通过' : '异常' }}
              </n-tag>
            </template>

            <n-alert v-if="item.error" type="warning" class="section-gap">
              {{ item.error }}
            </n-alert>

            <n-descriptions v-if="item.header" bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item label="命令标识">
                0x{{ item.header.commandId }} {{ item.header.commandName }}
              </n-descriptions-item>
              <n-descriptions-item label="应答标志">
                0x{{ item.header.responseFlag }} {{ item.header.responseName }}
              </n-descriptions-item>
              <n-descriptions-item label="VIN">
                {{ item.header.vin }}
              </n-descriptions-item>
              <n-descriptions-item label="数据单元长度">
                {{ item.header.dataLength }} 字节
              </n-descriptions-item>
              <n-descriptions-item label="加密方式">
                0x{{ item.header.encryption }} {{ item.header.encryptionName }}
              </n-descriptions-item>
              <n-descriptions-item label="起始符">
                {{ item.validBoundary ? '包含 23 23' : '未包含，按裸数据解析' }}
              </n-descriptions-item>
              <n-descriptions-item label="校验码">
                接收 {{ item.checksum.received || '-' }} / 计算 {{ item.checksum.calculated || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="信息体">
                {{ item.infoGroups.length ? `${item.infoGroups.length} 组` : '无' }}
              </n-descriptions-item>
            </n-descriptions>

            <div v-if="item.dataFields.length" class="field-list">
              <div v-for="field in item.dataFields" :key="field.label" class="field-row">
                <span class="field-label">{{ field.label }}</span>
                <span class="field-value">{{ field.value }}</span>
                <span v-if="field.remark" class="field-remark">{{ field.remark }}</span>
              </div>
            </div>

            <div v-if="item.infoGroups.length" class="info-group-stack">
              <section
                v-for="group in item.infoGroups"
                :key="`${group.type}-${group.rawHex}`"
                class="info-group"
              >
                <div class="info-group-heading">
                  <div>
                    <span class="info-type">0x{{ group.type }}</span>
                    <strong>{{ group.name }}</strong>
                  </div>
                  <n-tag v-if="group.error" type="warning" size="small">{{ group.error }}</n-tag>
                </div>

                <div class="field-list field-list--compact">
                  <div v-for="field in group.fields" :key="field.label" class="field-row">
                    <span class="field-label">{{ field.label }}</span>
                    <span class="field-value">{{ field.value }}</span>
                    <span v-if="field.remark" class="field-remark">{{ field.remark }}</span>
                  </div>
                </div>
              </section>
            </div>

            <n-collapse class="section-gap">
              <n-collapse-item title="原始 Hex" name="hex">
                <n-code :code="`Raw: ${item.rawHex}\nDataUnit: ${item.dataUnitHex || '空'}`" language="text" word-wrap />
              </n-collapse-item>
            </n-collapse>
          </n-card>
        </div>
      </div>

      <n-card class="panel-card support-card" title="当前支持范围">
        <div class="support-grid">
          <div class="support-item">
            <span>命令</span>
            <strong>车辆登入、实时信息、补发信息、车辆登出、心跳、终端校时</strong>
          </div>
          <div class="support-item">
            <span>数据块</span>
            <strong>整车、驱动电机、发动机、位置、极值、报警、储能电压、储能温度</strong>
          </div>
          <div class="support-item">
            <span>校验</span>
            <strong>起始符检查、数据长度检查、异或校验、异常/无效值识别</strong>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NCode,
  NCollapse,
  NCollapseItem,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NInput,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { parseGb32960Frames, type Gb32960ParseResult } from './utils'

const { copy } = useClipboard()

const demoFrame = '23 23 02 FE 4C 47 42 48 35 32 45 30 34 52 59 31 32 33 34 35 36 01 00 25 26 06 07 09 30 00 01 01 03 01 02 BC 00 01 E2 40 0F 3C 28 D2 55 01 03 27 10 2D 00 05 00 06 F0 34 25 02 60 E6 DD AD'

const parseInput = ref(demoFrame)
const parseResults = ref<Gb32960ParseResult[]>([])
const parseError = ref('')

const summaryCards = computed(() => {
  const total = parseResults.value.length
  const checksumPassed = parseResults.value.filter(item => item.checksum.matched).length
  const abnormal = parseResults.value.filter(item => item.error || !item.checksum.matched).length
  const infoGroupCount = parseResults.value.reduce((sum, item) => sum + item.infoGroups.length, 0)
  const commands = Array.from(new Set(
    parseResults.value.map(item => item.header ? `${item.header.commandId} ${item.header.commandName}` : '未识别')
  ))
  const commandText = commands.length
    ? `${commands.slice(0, 2).join(' / ')}${commands.length > 2 ? ` +${commands.length - 2}` : ''}`
    : '-'

  return [
    { label: '总包数', value: total },
    {
      label: '校验通过',
      value: checksumPassed,
      status: checksumPassed === total ? 'success' : 'warning'
    },
    {
      label: '异常',
      value: abnormal,
      status: abnormal ? 'error' : 'success'
    },
    { label: '信息体', value: infoGroupCount },
    { label: '命令类型', value: commandText }
  ]
})

const handleParse = () => {
  parseError.value = ''
  try {
    parseResults.value = parseGb32960Frames(parseInput.value)
    if (!parseResults.value.length) parseError.value = '请输入 GB/T 32960 Hex 报文'
  } catch (err) {
    parseResults.value = []
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  parseInput.value = demoFrame
  handleParse()
}

const clearInput = () => {
  parseInput.value = ''
  parseResults.value = []
  parseError.value = ''
}

const copySummary = () => {
  const lines = parseResults.value.map(item => {
    const header = item.header
    return [
      `第 ${item.order} 包`,
      `命令: ${header ? `${header.commandId} ${header.commandName}` : '未识别'}`,
      `VIN: ${header?.vin ?? '-'}`,
      `校验: ${item.checksum.matched ? '通过' : '异常'}`,
      `信息体: ${item.infoGroups.map(group => `${group.type} ${group.name}`).join(' / ') || '-'}`
    ].join('\n')
  })
  copy(lines.join('\n\n'), '已复制解析摘要')
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
  grid-template-columns: minmax(360px, 0.9fr) minmax(480px, 1.1fr);
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
.support-item span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.summary-tile strong,
.support-item strong {
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

.summary-tile--error {
  border-color: rgba(244, 33, 46, 0.38);
  background: rgba(244, 33, 46, 0.08);
}

.section-gap {
  margin-top: var(--spacing-md);
}

.field-list {
  margin-top: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.field-list--compact {
  margin-top: var(--spacing-sm);
}

.field-row {
  display: grid;
  grid-template-columns: minmax(130px, 0.32fr) minmax(0, 1fr) minmax(150px, 0.48fr);
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
  font-family: var(--font-mono);
  word-break: break-all;
  color: var(--color-text-primary);
}

.field-remark {
  color: var(--color-text-tertiary);
  min-width: 0;
}

.info-group-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.info-group {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.info-group-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
}

.info-group-heading > div {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.info-group-heading strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.info-type {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: rgba(34, 211, 238, 0.12);
  color: #0369a1;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.support-card {
  margin-top: var(--spacing-md);
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-sm);
}

.support-item {
  min-height: 86px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.n-card__content) {
  min-width: 0;
}

@media (max-width: 1180px) {
  .workspace-grid,
  .support-grid {
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

  .info-group-heading,
  .info-group-heading > div {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
