<template>
  <div class="tool-container">
    <ToolHeader
      title="车联网日志时间线"
      description="把 JT808、GB32960、OCPP、CAN、诊断和定位等混合日志按时间归档，辅助排查链路、设备和事件顺序"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="日志输入">
          <n-space vertical :size="14">
            <div class="actions-row">
              <n-button type="primary" @click="handleParse">生成时间线</n-button>
              <n-button @click="loadDemo">示例</n-button>
              <n-button @click="clearInput">清空</n-button>
              <n-button :disabled="!filteredEvents.length" @click="copyTimeline">复制时间线</n-button>
            </div>

            <n-input
              v-model:value="logInput"
              type="textarea"
              :rows="24"
              :placeholder="inputPlaceholder"
              clearable
            />

            <n-alert type="info" :bordered="false" size="small">
              自动提取时间、协议、方向、事件类型、VIN/终端/设备、交易号、枪口、CAN ID、PGN、DTC、耗时等排查字段。
            </n-alert>
          </n-space>
        </n-card>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>

          <div v-if="events.length" class="filter-panel">
            <div class="filter-grid">
              <label class="filter-field">
                <span>协议</span>
                <n-select v-model:value="protocolFilter" :options="protocolOptions" />
              </label>
              <label class="filter-field">
                <span>级别</span>
                <n-select v-model:value="severityFilter" :options="severityOptions" />
              </label>
              <label class="filter-field">
                <span>设备</span>
                <n-select v-model:value="deviceFilter" :options="deviceOptions" filterable />
              </label>
              <label class="filter-field">
                <span>关键词</span>
                <n-input v-model:value="keyword" placeholder="Action / MsgID / VIN / 文本" clearable />
              </label>
            </div>
          </div>

          <n-empty v-if="!events.length && !parseError" description="时间线将在这里展示" />

          <div v-if="events.length" class="parse-summary">
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

          <div v-if="events.length" class="protocol-strip">
            <button
              v-for="item in protocolSummary"
              :key="item.protocol"
              class="protocol-pill"
              :class="{ 'protocol-pill--active': protocolFilter === item.protocol }"
              type="button"
              @click="protocolFilter = protocolFilter === item.protocol ? '全部' : item.protocol"
            >
              <span>{{ item.protocol }}</span>
              <strong>{{ item.count }}</strong>
            </button>
          </div>

          <n-empty v-if="events.length && !filteredEvents.length" description="当前筛选条件没有匹配日志" />

          <div v-if="filteredEvents.length" class="timeline-list">
            <article
              v-for="event in filteredEvents"
              :key="`${event.order}-${event.rawLine}`"
              class="timeline-item"
              :class="`timeline-item--${event.severity}`"
            >
              <div class="timeline-rail">
                <span class="timeline-dot" />
                <span class="timeline-line" />
              </div>

              <div class="timeline-body">
                <div class="timeline-head">
                  <div class="time-block">
                    <strong>{{ event.displayTime }}</strong>
                    <span>距开始 {{ event.offsetText }} / 间隔 {{ event.gapText }}</span>
                  </div>
                  <div class="tag-row">
                    <n-tag :type="severityTagType(event.severity)" size="small" :bordered="false">
                      {{ severityLabel(event.severity) }}
                    </n-tag>
                    <n-tag size="small" :bordered="false">
                      {{ event.protocol }}
                    </n-tag>
                    <n-tag v-if="event.direction !== '-'" size="small" :bordered="false">
                      {{ event.direction }}
                    </n-tag>
                    <n-tag size="small" :bordered="false">
                      {{ event.eventType }}
                    </n-tag>
                  </div>
                </div>

                <div class="event-meta">
                  <span>序号 #{{ event.order }}</span>
                  <span>设备 {{ event.deviceId }}</span>
                  <span v-if="event.latencyText">耗时 {{ event.latencyText }}</span>
                  <span v-if="event.timestampText">原时间 {{ event.timestampText }}</span>
                </div>

                <p class="event-content">{{ event.content }}</p>

                <div v-if="event.tags.length" class="event-tags">
                  <span v-for="tag in event.tags" :key="`${tag.label}-${tag.value}`">
                    {{ tag.label }}={{ tag.value }}
                  </span>
                </div>
              </div>
            </article>
          </div>
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
  NEmpty,
  NInput,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { formatDateTimeMs, formatLocalIsoWithOffset, todayAt } from '@/utils/demoTime'
import {
  parseVehicleLogTimeline,
  type VehicleLogSeverity,
  type VehicleLogTimelineEvent
} from './vehicleLogTimeline'

const { copy } = useClipboard()

const buildDemoInput = () => [
  `${formatDateTimeMs(todayAt(9, 0, 0, 120))} INFO terminal=013800138000 JT808 上行 msgId=0102 终端鉴权 成功`,
  `${formatDateTimeMs(todayAt(9, 0, 1, 6))} INFO terminal=013800138000 JT808 上行 msgId=0200 lat=39.904989 lng=116.405285 speed=42`,
  `${formatDateTimeMs(todayAt(9, 0, 1, 388))} WARN terminal=013800138000 JT808 下行 msgId=8300 文本下发 cost=82ms`,
  `${formatLocalIsoWithOffset(todayAt(9, 0, 2, 215))} INFO VIN=LGBH52E06RY000001 GB32960 实时信息 SOC=68 speed=38`,
  `${todayAt(9, 0, 2, 850).getTime()} OCPP cp=CP-001 -> CSMS BootNotification Accepted cost=120ms`,
  `${todayAt(9, 0, 3, 120).getTime()} OCPP cp=CP-001 StatusNotification connectorId=1 status=Available`,
  `${todayAt(9, 0, 10).getTime()} CAN can0 18FECA00#C0FFFFFFE8031A05 DM1 SPN=102 FMI=3 alarm`,
  `${formatDateTimeMs(todayAt(9, 0, 12, 500))} ERROR OBD/UDS device=VCI-01 7E8 03 7F 22 31 NRC timeout`
].join('\n')

const inputPlaceholder = computed(() => (
  `支持 ISO 时间、毫秒/秒时间戳、[time]、(time) 等常见日志。例如：\n${formatDateTimeMs(todayAt(9, 0, 0, 120))} INFO terminal=013800138000 JT808 上行 msgId=0200 speed=42`
))

const logInput = ref(buildDemoInput())
const events = ref<VehicleLogTimelineEvent[]>([])
const parseError = ref('')
const protocolFilter = ref('全部')
const severityFilter = ref('全部')
const deviceFilter = ref('全部')
const keyword = ref('')

const protocolOptions = computed(() => [
  { label: '全部协议', value: '全部' },
  ...Array.from(new Set(events.value.map(event => event.protocol))).map(protocol => ({
    label: protocol,
    value: protocol
  }))
])

const severityOptions = [
  { label: '全部级别', value: '全部' },
  { label: '错误', value: 'error' },
  { label: '警告', value: 'warning' },
  { label: '成功', value: 'success' },
  { label: '信息', value: 'info' }
]

const deviceOptions = computed(() => [
  { label: '全部设备', value: '全部' },
  ...Array.from(new Set(events.value.map(event => event.deviceId).filter(device => device !== '-'))).map(device => ({
    label: device,
    value: device
  }))
])

const filteredEvents = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return events.value.filter(event => {
    if (protocolFilter.value !== '全部' && event.protocol !== protocolFilter.value) return false
    if (severityFilter.value !== '全部' && event.severity !== severityFilter.value) return false
    if (deviceFilter.value !== '全部' && event.deviceId !== deviceFilter.value) return false
    if (!query) return true
    return [
      event.content,
      event.rawLine,
      event.protocol,
      event.eventType,
      event.deviceId,
      ...event.tags.flatMap(tag => [tag.label, tag.value])
    ].join(' ').toLowerCase().includes(query)
  })
})

const summaryCards = computed(() => {
  const total = events.value.length
  const visible = filteredEvents.value.length
  const errorCount = events.value.filter(event => event.severity === 'error').length
  const warningCount = events.value.filter(event => event.severity === 'warning').length
  const deviceCount = new Set(events.value.map(event => event.deviceId).filter(device => device !== '-')).size

  return [
    { label: '总日志', value: total },
    { label: '当前显示', value: visible },
    { label: '设备数', value: deviceCount },
    { label: '警告', value: warningCount, status: warningCount ? 'warning' : undefined },
    { label: '错误', value: errorCount, status: errorCount ? 'error' : 'success' }
  ]
})

const protocolSummary = computed(() => {
  const counts = new Map<string, number>()
  events.value.forEach(event => counts.set(event.protocol, (counts.get(event.protocol) ?? 0) + 1))
  return Array.from(counts.entries())
    .map(([protocol, count]) => ({ protocol, count }))
    .sort((a, b) => b.count - a.count || a.protocol.localeCompare(b.protocol))
})

const handleParse = () => {
  parseError.value = ''
  try {
    events.value = parseVehicleLogTimeline(logInput.value)
    if (!events.value.length) parseError.value = '请输入车联网日志'
  } catch (err) {
    events.value = []
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  logInput.value = buildDemoInput()
  protocolFilter.value = '全部'
  severityFilter.value = '全部'
  deviceFilter.value = '全部'
  keyword.value = ''
  handleParse()
}

const clearInput = () => {
  logInput.value = ''
  events.value = []
  parseError.value = ''
  protocolFilter.value = '全部'
  severityFilter.value = '全部'
  deviceFilter.value = '全部'
  keyword.value = ''
}

const copyTimeline = () => {
  const lines = filteredEvents.value.map(event => [
    `#${event.order} ${event.displayTime} ${event.protocol} ${event.direction} ${event.eventType}`,
    `device=${event.deviceId} gap=${event.gapText} offset=${event.offsetText}`,
    event.content,
    event.tags.length ? event.tags.map(tag => `${tag.label}=${tag.value}`).join(', ') : ''
  ].filter(Boolean).join('\n'))
  copy(lines.join('\n\n'), '已复制车联网日志时间线')
}

const severityTagType = (severity: VehicleLogSeverity): 'error' | 'warning' | 'success' | 'info' => {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  if (severity === 'success') return 'success'
  return 'info'
}

const severityLabel = (severity: VehicleLogSeverity): string => {
  if (severity === 'error') return '错误'
  if (severity === 'warning') return '警告'
  if (severity === 'success') return '成功'
  return '信息'
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
  grid-template-columns: minmax(380px, 0.82fr) minmax(540px, 1.18fr);
  gap: var(--spacing-md);
  align-items: start;
}

.panel-card {
  border-radius: var(--radius-md);
}

.result-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.filter-panel {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.filter-grid {
  display: grid;
  grid-template-columns: 150px 132px minmax(160px, 0.8fr) minmax(220px, 1fr);
  gap: var(--spacing-sm);
  align-items: end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.filter-field > span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
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

.protocol-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.protocol-pill {
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  display: inline-flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}

.protocol-pill strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.protocol-pill--active {
  border-color: rgba(24, 160, 88, 0.46);
  background: rgba(24, 160, 88, 0.1);
  color: var(--color-text-primary);
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: var(--spacing-sm);
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  margin-top: 18px;
  border-radius: 50%;
  border: 2px solid var(--color-surface);
  background: var(--color-text-tertiary);
  box-shadow: 0 0 0 1px var(--color-border);
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 18px;
  background: var(--color-border);
}

.timeline-item:last-child .timeline-line {
  display: none;
}

.timeline-item--error .timeline-dot {
  background: #f4212e;
}

.timeline-item--warning .timeline-dot {
  background: #f5a623;
}

.timeline-item--success .timeline-dot {
  background: #00ba7c;
}

.timeline-item--info .timeline-dot {
  background: #4f8cff;
}

.timeline-body {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  min-width: 0;
}

.timeline-head {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-start;
  justify-content: space-between;
}

.time-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.time-block strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
}

.time-block span,
.event-meta,
.event-tags {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.tag-row,
.event-meta,
.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.event-meta {
  margin-top: var(--spacing-sm);
}

.event-content {
  margin: 10px 0 0;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  word-break: break-word;
}

.event-tags {
  margin-top: var(--spacing-sm);
}

.event-tags span {
  padding: 3px 7px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
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

@media (max-width: 780px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .filter-grid,
  .parse-summary {
    grid-template-columns: 1fr;
  }

  .timeline-head {
    flex-direction: column;
  }

  .timeline-item {
    grid-template-columns: 20px minmax(0, 1fr);
  }
}
</style>
