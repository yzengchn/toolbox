<template>
  <div class="tool-container">
    <ToolHeader
      title="CAN 信号曲线分析"
      description="导入 CAN/DBC 日志，按信号绘制趋势曲线，统计跳变、最大间隔和帧周期"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <section class="input-stack">
          <n-card class="panel-card" title="CAN 日志">
            <n-space vertical :size="14">
              <div class="actions-row">
                <n-button type="primary" @click="handleAnalyze">分析</n-button>
                <n-button @click="loadDemo">示例</n-button>
                <n-button @click="clearInput">清空</n-button>
                <n-button :disabled="!analysisResult" @click="copyAnalysis">复制结果</n-button>
              </div>

              <n-input
                v-model:value="canInput"
                type="textarea"
                :rows="12"
                :placeholder="canPlaceholder"
                clearable
              />
            </n-space>
          </n-card>

          <n-card class="panel-card" title="DBC 与阈值">
            <n-space vertical :size="14">
              <n-input
                v-model:value="dbcInput"
                type="textarea"
                :rows="9"
                placeholder="支持 BO_ / SG_ 常见 DBC 定义，用于解码物理信号"
                clearable
              />

              <div class="threshold-grid">
                <label class="threshold-row">
                  <span>跳变阈值</span>
                  <n-input-number
                    v-model:value="jumpThreshold"
                    :min="0"
                    :step="1"
                    class="number-input"
                  />
                </label>
                <label class="threshold-row">
                  <span>帧间隔阈值 ms</span>
                  <n-input-number
                    v-model:value="gapThresholdMs"
                    :min="1"
                    :step="10"
                    class="number-input"
                  />
                </label>
              </div>
            </n-space>
          </n-card>
        </section>

        <section class="result-stack">
          <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
          <n-empty v-if="!analysisResult && !parseError" description="分析结果将在这里展示" />

          <div v-if="analysisResult" class="parse-summary">
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

          <n-alert
            v-for="warning in visibleWarnings"
            :key="warning"
            type="warning"
            :bordered="false"
          >
            {{ warning }}
          </n-alert>

          <n-card v-if="analysisResult?.series.length" class="result-card" title="信号曲线">
            <n-space vertical :size="14">
              <n-select
                :value="selectedSignalKey"
                :options="signalOptions"
                filterable
                @update:value="value => setSelectedSignal(String(value))"
              />

              <div v-if="selectedSeries && chartShape" class="chart-panel">
                <div class="chart-head">
                  <div>
                    <strong>{{ selectedSeries.signalName }}</strong>
                    <span>{{ selectedSeries.messageName }} · 0x{{ selectedSeries.frameId }}</span>
                  </div>
                  <n-tag size="small" :bordered="false">{{ selectedSeries.unit || '无单位' }}</n-tag>
                </div>

                <svg class="signal-chart" viewBox="0 0 640 240" role="img" aria-label="CAN 信号趋势曲线">
                  <line
                    v-for="line in gridLines"
                    :key="line"
                    x1="28"
                    x2="612"
                    :y1="line"
                    :y2="line"
                    class="chart-grid-line"
                  />
                  <text x="30" y="22" class="chart-axis-label">{{ chartShape.maxLabel }}</text>
                  <text x="30" y="226" class="chart-axis-label">{{ chartShape.minLabel }}</text>
                  <polygon v-if="chartShape.areaPoints" :points="chartShape.areaPoints" class="chart-area" />
                  <polyline :points="chartShape.linePoints" class="chart-line" />
                  <circle
                    v-for="marker in chartShape.markers"
                    :key="`${marker.x}-${marker.y}-${marker.label}`"
                    :cx="marker.x"
                    :cy="marker.y"
                    r="3.2"
                    class="chart-marker"
                  />
                </svg>
              </div>

              <div v-if="selectedSeries" class="stats-grid">
                <div v-for="item in selectedStats" :key="item.label" class="stat-card">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </n-space>
          </n-card>

          <n-card v-if="analysisResult?.series.length" class="result-card" title="信号列表">
            <div class="signal-list">
              <button
                v-for="series in analysisResult.series"
                :key="series.key"
                type="button"
                class="signal-row"
                :class="{ 'signal-row--active': series.key === selectedSignalKey }"
                @click="setSelectedSignal(series.key)"
              >
                <span>{{ series.signalName }}</span>
                <strong>{{ formatMetric(series.stats.avg) }} {{ series.unit }}</strong>
                <small>0x{{ series.frameId }} · {{ series.stats.count }} 点 · 跳变 {{ series.stats.jumpCount }}</small>
              </button>
            </div>
          </n-card>

          <n-card v-if="analysisResult?.cycleStats.length" class="result-card" title="帧周期">
            <div class="cycle-grid">
              <div v-for="cycle in analysisResult.cycleStats" :key="cycle.key" class="cycle-card">
                <div class="cycle-title">
                  <strong>0x{{ cycle.idHex }}</strong>
                  <n-tag size="small" :type="cycle.warnings.length ? 'warning' : 'success'" :bordered="false">
                    {{ cycle.count }} 帧
                  </n-tag>
                </div>
                <span>{{ cycle.messageName }}</span>
                <small>平均 {{ formatDuration(cycle.avgIntervalMs) }} / 最大 {{ formatDuration(cycle.maxGapMs) }}</small>
                <em v-if="cycle.warnings.length">{{ cycle.warnings.join('；') }}</em>
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
  NEmpty,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  analyzeCanSignals,
  buildCanSignalDemoInput,
  buildSignalChartShape,
  formatMetric,
  type CanSignalAnalysisResult
} from './canSignalAnalysis'

const { copy } = useClipboard()
const demoInput = buildCanSignalDemoInput()

const canPlaceholder = '支持 candump、ASC、ID#DATA，例如：\n(1717900200.000000) can0 18FEF100#FFFF0020FFFFFFFF'
const gridLines = [44, 88, 132, 176, 212]

const canInput = ref(demoInput.canInput)
const dbcInput = ref(demoInput.dbcInput)
const jumpThreshold = ref(10)
const gapThresholdMs = ref(250)
const analysisResult = ref<CanSignalAnalysisResult | null>(null)
const selectedSignalKey = ref('')
const parseError = ref('')

const summaryCards = computed(() => {
  if (!analysisResult.value) return []
  const totalJumps = analysisResult.value.series.reduce((sum, series) => sum + series.stats.jumpCount, 0)
  const gapWarnings = analysisResult.value.cycleStats.reduce((sum, cycle) => sum + cycle.warnings.length, 0)

  return [
    { label: '有效帧', value: analysisResult.value.validFrameCount },
    { label: 'DBC 信号', value: analysisResult.value.series.length },
    { label: '跳变次数', value: totalJumps, status: totalJumps ? 'warning' : 'success' },
    { label: '周期提示', value: gapWarnings, status: gapWarnings ? 'warning' : 'success' },
    { label: '异常帧', value: analysisResult.value.errorFrameCount, status: analysisResult.value.errorFrameCount ? 'error' : 'success' }
  ]
})

const signalOptions = computed(() => {
  return analysisResult.value?.series.map(series => ({
    label: `${series.signalName} · 0x${series.frameId} · ${series.points.length} 点`,
    value: series.key
  })) ?? []
})

const selectedSeries = computed(() => {
  return analysisResult.value?.series.find(series => series.key === selectedSignalKey.value) ?? null
})

const chartShape = computed(() => {
  return selectedSeries.value ? buildSignalChartShape(selectedSeries.value) : null
})

const selectedStats = computed(() => {
  if (!selectedSeries.value) return []
  const stats = selectedSeries.value.stats
  const unit = selectedSeries.value.unit
  return [
    { label: '点数', value: stats.count },
    { label: '最小值', value: `${formatMetric(stats.min)} ${unit}` },
    { label: '最大值', value: `${formatMetric(stats.max)} ${unit}` },
    { label: '平均值', value: `${formatMetric(stats.avg)} ${unit}` },
    { label: '首末差', value: `${formatMetric(stats.delta)} ${unit}` },
    { label: '最大跳变', value: `${formatMetric(stats.maxJump)} ${unit}` },
    { label: '平均周期', value: formatDuration(stats.avgIntervalMs) },
    { label: '最大间隔', value: formatDuration(stats.maxGapMs) }
  ]
})

const visibleWarnings = computed(() => {
  if (!analysisResult.value) return []
  return [...analysisResult.value.warnings, ...analysisResult.value.dbcErrors]
})

const handleAnalyze = () => {
  parseError.value = ''
  try {
    analysisResult.value = analyzeCanSignals(canInput.value, dbcInput.value, {
      jumpThreshold: jumpThreshold.value,
      gapThresholdMs: gapThresholdMs.value
    })
    selectedSignalKey.value = analysisResult.value.series[0]?.key ?? ''
  } catch (err) {
    analysisResult.value = null
    selectedSignalKey.value = ''
    parseError.value = (err as Error).message
  }
}

const loadDemo = () => {
  const nextDemo = buildCanSignalDemoInput()
  canInput.value = nextDemo.canInput
  dbcInput.value = nextDemo.dbcInput
  jumpThreshold.value = 10
  gapThresholdMs.value = 250
  handleAnalyze()
}

const clearInput = () => {
  canInput.value = ''
  dbcInput.value = ''
  analysisResult.value = null
  selectedSignalKey.value = ''
  parseError.value = ''
}

const setSelectedSignal = (key: string) => {
  selectedSignalKey.value = key
}

const copyAnalysis = () => {
  if (!analysisResult.value) return
  const lines = analysisResult.value.series.map(series => {
    const stats = series.stats
    return [
      `${series.signalName} 0x${series.frameId}`,
      `count=${stats.count} min=${formatMetric(stats.min)} max=${formatMetric(stats.max)} avg=${formatMetric(stats.avg)}`,
      `delta=${formatMetric(stats.delta)} maxJump=${formatMetric(stats.maxJump)} jumps=${stats.jumpCount}`,
      `avgInterval=${formatDuration(stats.avgIntervalMs)} maxGap=${formatDuration(stats.maxGapMs)}`
    ].join('\n')
  })
  copy(lines.join('\n\n'), '已复制 CAN 信号分析结果')
}

const formatDuration = (ms?: number): string => {
  if (ms === undefined) return '-'
  if (ms >= 1000) return `${(ms / 1000).toFixed(2).replace(/\.?0+$/, '')} s`
  return `${ms.toFixed(0)} ms`
}

handleAnalyze()
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
  grid-template-columns: minmax(360px, 0.86fr) minmax(540px, 1.14fr);
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

.threshold-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-sm);
}

.threshold-row {
  display: grid;
  gap: 6px;
}

.threshold-row span {
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

.chart-panel {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.chart-head {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.chart-head div {
  display: grid;
  gap: 3px;
}

.chart-head strong {
  color: var(--color-text-primary);
}

.chart-head span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.signal-chart {
  width: 100%;
  height: 240px;
  display: block;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.chart-grid-line {
  stroke: var(--color-border);
  stroke-width: 1;
}

.chart-axis-label {
  fill: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.chart-area {
  fill: rgba(34, 211, 238, 0.14);
}

.chart-line {
  fill: none;
  stroke: #0891b2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.chart-marker {
  fill: var(--color-surface);
  stroke: #0891b2;
  stroke-width: 2;
}

.stats-grid,
.cycle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-sm);
}

.stat-card,
.cycle-card {
  min-height: 76px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 5px;
}

.stat-card span,
.cycle-card span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.stat-card strong,
.cycle-card strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  line-height: 1.35;
  word-break: break-word;
}

.cycle-card small {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.cycle-card em {
  color: #b45309;
  font-style: normal;
  font-size: var(--font-size-xs);
  line-height: 1.35;
}

.cycle-title {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-sm);
  align-items: center;
}

.signal-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: var(--spacing-sm);
}

.signal-row {
  min-height: 82px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  cursor: pointer;
}

.signal-row:hover,
.signal-row--active {
  border-color: rgba(34, 211, 238, 0.58);
  background: rgba(34, 211, 238, 0.08);
}

.signal-row span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.signal-row strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.signal-row small {
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

  .threshold-grid,
  .parse-summary {
    grid-template-columns: 1fr;
  }

  .chart-head {
    flex-direction: column;
  }
}
</style>
