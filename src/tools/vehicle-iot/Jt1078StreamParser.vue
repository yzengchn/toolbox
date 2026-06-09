<template>
  <div class="tool-container">
    <ToolHeader
      title="JT1078 音视频流解析"
      description="解析 JT1078 RTP 包头、SIM/通道、音视频帧类型、分包状态、负载长度和 H264/H265 NALU"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="RTP 包输入">
          <n-space vertical :size="14">
            <div class="actions-row">
              <n-button type="primary" @click="handleParse">解析</n-button>
              <n-button @click="loadDemo">示例</n-button>
              <n-button @click="clearInput">清空</n-button>
              <n-button :disabled="!packets.length" @click="copySummary">复制结果</n-button>
            </div>

            <n-input
              v-model:value="packetInput"
              type="textarea"
              :rows="18"
              placeholder="输入 JT1078 RTP Hex 包；多包按行分隔"
              clearable
            />

            <n-alert type="info" :bordered="false" size="small">
              支持标准 JT1078 RTP 头：V/P/X/CC、M/PT、序号、SIM、逻辑通道、数据类型/分包类型、视频时间戳和负载长度。
            </n-alert>
          </n-space>
        </n-card>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!packets.length && !parseError" description="解析结果将在这里展示" />

          <div v-if="packets.length" class="parse-summary">
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
            v-for="packet in packets"
            :key="`${packet.order}-${packet.sequence}`"
            class="result-card"
            :title="`第 ${packet.order} 包`"
          >
            <template #header-extra>
              <n-tag :type="packet.error ? 'error' : packet.dataType <= 2 ? 'success' : 'info'" size="small">
                {{ packet.error ? '异常' : packet.dataTypeName }}
              </n-tag>
            </template>

            <n-alert v-if="packet.error" type="error" class="section-gap">
              {{ packet.error }}
            </n-alert>

            <n-descriptions v-else bordered size="small" :column="2" label-placement="left">
              <n-descriptions-item label="RTP 版本">
                {{ packet.version }}
              </n-descriptions-item>
              <n-descriptions-item label="M / PT">
                {{ packet.marker ? 'M=1' : 'M=0' }} / {{ packet.payloadType }} {{ packet.payloadTypeName }}
              </n-descriptions-item>
              <n-descriptions-item label="序号">
                {{ packet.sequence }}
              </n-descriptions-item>
              <n-descriptions-item label="SIM 卡号">
                {{ packet.sim }}
              </n-descriptions-item>
              <n-descriptions-item label="逻辑通道">
                {{ packet.channel }}
              </n-descriptions-item>
              <n-descriptions-item label="分包">
                {{ packet.subpackageType }} {{ packet.subpackageName }}
              </n-descriptions-item>
              <n-descriptions-item label="头长度">
                {{ packet.headerLength }} 字节
              </n-descriptions-item>
              <n-descriptions-item label="负载长度">
                {{ packet.actualBodyLength }} / {{ packet.bodyLength }} 字节
              </n-descriptions-item>
              <n-descriptions-item v-if="packet.mediaTimestampHex" label="媒体时间戳">
                {{ packet.mediaTimestampHex }}
              </n-descriptions-item>
              <n-descriptions-item v-if="packet.lastFrameInterval !== undefined" label="帧间隔">
                I 帧 {{ packet.lastIFrameInterval }} ms / 上帧 {{ packet.lastFrameInterval }} ms
              </n-descriptions-item>
            </n-descriptions>

            <n-alert
              v-for="warning in packet.warnings"
              :key="warning"
              type="warning"
              class="section-gap"
            >
              {{ warning }}
            </n-alert>

            <section v-if="packet.naluUnits.length" class="nalu-panel">
              <div class="section-heading">
                <strong>视频 NALU</strong>
                <n-tag size="small" :bordered="false">{{ packet.naluUnits.length }} 个</n-tag>
              </div>
              <div class="nalu-grid">
                <div v-for="nalu in packet.naluUnits" :key="`${nalu.offset}-${nalu.type}`" class="nalu-card">
                  <span>{{ nalu.codec }}</span>
                  <strong>{{ nalu.name }}</strong>
                  <small>offset {{ nalu.offset }} / type {{ nalu.type }}</small>
                </div>
              </div>
            </section>

            <n-collapse class="section-gap">
              <n-collapse-item title="原始 Hex / 负载 Hex" name="hex">
                <n-code :code="`Raw: ${packet.rawHex}\nBody: ${packet.bodyHex || '空'}`" language="text" word-wrap />
              </n-collapse-item>
            </n-collapse>
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
import { buildJt1078DemoInput, parseJt1078Packets, type Jt1078Packet } from './jt1078'

const { copy } = useClipboard()

const packetInput = ref(buildJt1078DemoInput())
const packets = ref<Jt1078Packet[]>([])
const parseError = ref('')

const sequenceGapCount = computed(() => {
  return packets.value.reduce((count, packet, index, list) => {
    const previous = list[index - 1]
    if (!previous || packet.error || previous.error) return count
    return packet.sequence === ((previous.sequence + 1) & 0xffff) ? count : count + 1
  }, 0)
})

const summaryCards = computed(() => {
  const total = packets.value.length
  const videoCount = packets.value.filter(packet => !packet.error && packet.dataType <= 2).length
  const audioCount = packets.value.filter(packet => !packet.error && packet.dataType === 3).length
  const bodyBytes = packets.value.reduce((sum, packet) => sum + packet.actualBodyLength, 0)
  const warnings = packets.value.reduce((sum, packet) => sum + packet.warnings.length + (packet.error ? 1 : 0), 0)

  return [
    { label: '总包数', value: total },
    { label: '视频包', value: videoCount },
    { label: '音频包', value: audioCount },
    { label: '负载字节', value: bodyBytes },
    {
      label: '序号跳变',
      value: sequenceGapCount.value,
      status: sequenceGapCount.value || warnings ? 'error' : 'success'
    }
  ]
})

const handleParse = () => {
  parseError.value = ''
  try {
    packets.value = parseJt1078Packets(packetInput.value)
    if (!packets.value.length) parseError.value = '请输入 JT1078 RTP Hex 包'
  } catch (err) {
    packets.value = []
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  packetInput.value = buildJt1078DemoInput()
  handleParse()
}

const clearInput = () => {
  packetInput.value = ''
  packets.value = []
  parseError.value = ''
}

const copySummary = () => {
  const lines = packets.value.map(packet => {
    if (packet.error) return `#${packet.order} 异常: ${packet.error}`
    const nalus = packet.naluUnits.map(nalu => `${nalu.codec}:${nalu.name}`).join(', ')
    return [
      `#${packet.order} seq=${packet.sequence} sim=${packet.sim} ch=${packet.channel}`,
      `type=${packet.dataTypeName} sub=${packet.subpackageName} payload=${packet.actualBodyLength}/${packet.bodyLength}`,
      packet.mediaTimestampHex ? `ts=${packet.mediaTimestampHex}` : '',
      nalus ? `nalu=${nalus}` : '',
      packet.warnings.length ? `warning=${packet.warnings.join('；')}` : ''
    ].filter(Boolean).join('\n')
  })
  copy(lines.join('\n\n'), '已复制 JT1078 解析结果')
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
  grid-template-columns: minmax(360px, 0.85fr) minmax(520px, 1.15fr);
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

.actions-row,
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
  margin-top: var(--spacing-md);
}

.nalu-panel {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.nalu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-sm);
}

.nalu-card {
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

.nalu-card span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.nalu-card strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  line-height: 1.35;
}

.nalu-card small {
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

  .parse-summary {
    grid-template-columns: 1fr;
  }
}
</style>
