import { parseCanInput, type CanFrame, type DbcMessage } from './canJ1939'

export interface CanSignalAnalysisOptions {
  jumpThreshold: number
  gapThresholdMs: number
}

export interface CanSignalPoint {
  index: number
  order: number
  timestamp?: number
  timestampLabel: string
  value: number
  raw: number
  displayValue: string
  unit: string
  frameId: string
  messageName: string
}

export interface CanSignalStats {
  count: number
  min: number
  max: number
  avg: number
  first: number
  last: number
  delta: number
  jumpCount: number
  maxJump: number
  avgIntervalMs?: number
  maxGapMs?: number
  durationMs?: number
}

export interface CanSignalSeries {
  key: string
  signalName: string
  label: string
  unit: string
  frameId: string
  messageName: string
  points: CanSignalPoint[]
  stats: CanSignalStats
}

export interface CanIdCycleStat {
  key: string
  idHex: string
  messageName: string
  count: number
  avgIntervalMs?: number
  minIntervalMs?: number
  maxGapMs?: number
  warnings: string[]
}

export interface CanSignalAnalysisResult {
  frames: CanFrame[]
  validFrameCount: number
  errorFrameCount: number
  dbcMessages: DbcMessage[]
  dbcErrors: string[]
  series: CanSignalSeries[]
  cycleStats: CanIdCycleStat[]
  warnings: string[]
}

export interface SignalChartMarker {
  x: number
  y: number
  label: string
}

export interface SignalChartShape {
  linePoints: string
  areaPoints: string
  markers: SignalChartMarker[]
  minLabel: string
  maxLabel: string
}

const defaultOptions: CanSignalAnalysisOptions = {
  jumpThreshold: 10,
  gapThresholdMs: 250
}

export function analyzeCanSignals(
  canInput: string,
  dbcInput: string,
  options: Partial<CanSignalAnalysisOptions> = {}
): CanSignalAnalysisResult {
  const normalizedOptions = { ...defaultOptions, ...options }
  const parseResult = parseCanInput(canInput, dbcInput)
  const validFrames = parseResult.frames.filter(frame => !frame.error)
  const seriesMap = new Map<string, CanSignalSeries>()

  validFrames.forEach(frame => {
    const timestamp = parseTimestamp(frame.timestamp)
    frame.dbcSignals.forEach(signal => {
      const key = `${frame.idHex}:${signal.name}`
      const current = seriesMap.get(key)
      const point: CanSignalPoint = {
        index: current?.points.length ?? 0,
        order: frame.order,
        timestamp,
        timestampLabel: frame.timestamp ?? `#${frame.order}`,
        value: signal.value,
        raw: signal.raw,
        displayValue: signal.displayValue,
        unit: signal.unit,
        frameId: frame.idHex,
        messageName: frame.dbcMessage?.name ?? 'DBC 信号'
      }

      if (current) {
        current.points.push(point)
      } else {
        seriesMap.set(key, {
          key,
          signalName: signal.name,
          label: `${signal.name} · 0x${frame.idHex}`,
          unit: signal.unit,
          frameId: frame.idHex,
          messageName: frame.dbcMessage?.name ?? 'DBC 信号',
          points: [point],
          stats: emptyStats()
        })
      }
    })
  })

  const series = [...seriesMap.values()]
    .map(item => ({
      ...item,
      stats: buildSignalStats(item.points, normalizedOptions.jumpThreshold)
    }))
    .sort((first, second) => second.points.length - first.points.length || first.label.localeCompare(second.label))

  const cycleStats = buildCycleStats(validFrames, normalizedOptions.gapThresholdMs)
  const warnings = collectWarnings(parseResult.frames, parseResult.dbcMessages, series)

  return {
    frames: parseResult.frames,
    validFrameCount: validFrames.length,
    errorFrameCount: parseResult.frames.length - validFrames.length,
    dbcMessages: parseResult.dbcMessages,
    dbcErrors: parseResult.dbcErrors,
    series,
    cycleStats,
    warnings
  }
}

export function buildSignalChartShape(
  series: CanSignalSeries,
  width = 640,
  height = 240,
  padding = 28
): SignalChartShape {
  const values = series.points.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const xValues = chooseXValues(series.points)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const yRange = max - min || 1
  const xRange = maxX - minX || 1
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const coords = series.points.map((point, index) => {
    const x = padding + ((xValues[index] - minX) / xRange) * chartWidth
    const y = padding + ((max - point.value) / yRange) * chartHeight
    return {
      x: roundCoordinate(x),
      y: roundCoordinate(y),
      label: `${point.displayValue}${point.unit}`
    }
  })

  const linePoints = coords.map(point => `${point.x},${point.y}`).join(' ')
  const baseline = height - padding
  const areaPoints = coords.length
    ? `${padding},${baseline} ${linePoints} ${width - padding},${baseline}`
    : ''
  const markerStep = Math.max(1, Math.ceil(coords.length / 28))
  const markers = coords.filter((_, index) => index % markerStep === 0 || index === coords.length - 1)

  return {
    linePoints,
    areaPoints,
    markers,
    minLabel: formatMetric(min),
    maxLabel: formatMetric(max)
  }
}

export function buildCanSignalDemoInput(): { canInput: string; dbcInput: string } {
  return {
    canInput: [
      '(1717900200.000000) can0 18FEF100#FFFF0020FFFFFFFF',
      '(1717900200.020000) can0 18F00400#FFFFA08025FFFFFF',
      '(1717900200.100000) can0 18FEF100#FFFF0024FFFFFFFF',
      '(1717900200.120000) can0 18F00400#FFFFA7602CFFFFFF',
      '(1717900200.200000) can0 18FEF100#FFFF002AFFFFFFFF',
      '(1717900200.220000) can0 18F00400#FFFFAD9033FFFFFF',
      '(1717900200.520000) can0 18FEF100#FFFF003CFFFFFFFF',
      '(1717900200.540000) can0 18F00400#FFFFB4E03DFFFFFF',
      '(1717900200.620000) can0 18FEF100#FFFF003EFFFFFFFF',
      '(1717900200.640000) can0 18F00400#FFFFB71040FFFFFF'
    ].join('\n'),
    dbcInput: [
      'BO_ 419361024 CCVS: 8 Vector__XXX',
      ' SG_ WheelBasedVehicleSpeed : 16|16@1+ (0.00390625,0) [0|250.996] "km/h" Vector__XXX',
      'BO_ 418382848 EEC1: 8 Vector__XXX',
      ' SG_ ActualEnginePercentTorque : 16|8@1- (1,-125) [-125|125] "%" Vector__XXX',
      ' SG_ EngineSpeed : 24|16@1+ (0.125,0) [0|8031.875] "rpm" Vector__XXX'
    ].join('\n')
  }
}

export function formatMetric(value: number): string {
  if (!Number.isFinite(value)) return '-'
  if (Math.abs(value) >= 1000) return value.toFixed(0)
  if (Math.abs(value) >= 100) return value.toFixed(1).replace(/\.0$/, '')
  if (Math.abs(value) >= 10) return value.toFixed(2).replace(/\.?0+$/, '')
  return value.toFixed(3).replace(/\.?0+$/, '')
}

function buildSignalStats(points: CanSignalPoint[], jumpThreshold: number): CanSignalStats {
  if (!points.length) return emptyStats()

  const values = points.map(point => point.value)
  const intervals = buildIntervals(points)
  let jumpCount = 0
  let maxJump = 0

  for (let index = 1; index < values.length; index += 1) {
    const jump = Math.abs(values[index] - values[index - 1])
    if (jump > maxJump) maxJump = jump
    if (jumpThreshold > 0 && jump >= jumpThreshold) jumpCount += 1
  }

  return {
    count: points.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    first: values[0],
    last: values[values.length - 1],
    delta: values[values.length - 1] - values[0],
    jumpCount,
    maxJump,
    avgIntervalMs: average(intervals),
    maxGapMs: intervals.length ? Math.max(...intervals) : undefined,
    durationMs: duration(points)
  }
}

function buildCycleStats(frames: CanFrame[], gapThresholdMs: number): CanIdCycleStat[] {
  const frameGroups = new Map<string, CanFrame[]>()
  frames.forEach(frame => {
    const group = frameGroups.get(frame.idHex)
    if (group) {
      group.push(frame)
    } else {
      frameGroups.set(frame.idHex, [frame])
    }
  })

  return [...frameGroups.entries()]
    .map(([idHex, group]) => {
      const timestamps = group
        .map(frame => parseTimestamp(frame.timestamp))
        .filter((value): value is number => value !== undefined)
      const intervals = timestamps
        .slice(1)
        .map((timestamp, index) => (timestamp - timestamps[index]) * 1000)
        .filter(interval => Number.isFinite(interval) && interval >= 0)
      const maxGapMs = intervals.length ? Math.max(...intervals) : undefined
      const warnings = maxGapMs !== undefined && maxGapMs >= gapThresholdMs
        ? [`最大间隔 ${formatDuration(maxGapMs)} 超过阈值 ${formatDuration(gapThresholdMs)}`]
        : []

      return {
        key: idHex,
        idHex,
        messageName: group.find(frame => frame.dbcMessage)?.dbcMessage?.name ?? group[0].j1939?.pgnName ?? 'CAN 帧',
        count: group.length,
        avgIntervalMs: average(intervals),
        minIntervalMs: intervals.length ? Math.min(...intervals) : undefined,
        maxGapMs,
        warnings
      }
    })
    .sort((first, second) => second.count - first.count || first.idHex.localeCompare(second.idHex))
}

function collectWarnings(frames: CanFrame[], dbcMessages: DbcMessage[], series: CanSignalSeries[]): string[] {
  const warnings: string[] = []
  if (!frames.length) warnings.push('请输入 CAN 日志')
  if (frames.length && !dbcMessages.length) warnings.push('未识别到 DBC 报文定义，无法生成物理信号曲线')
  if (dbcMessages.length && !series.length) warnings.push('CAN ID 未匹配到 DBC 信号，请核对 DBC BO_ ID 或日志 ID')
  return warnings
}

function chooseXValues(points: CanSignalPoint[]): number[] {
  const timestamps = points.map(point => point.timestamp)
  if (timestamps.every((value): value is number => value !== undefined)) {
    const first = timestamps[0]
    const hasRange = timestamps.some(value => value !== first)
    if (hasRange) return timestamps
  }
  return points.map((_, index) => index)
}

function buildIntervals(points: CanSignalPoint[]): number[] {
  const timestamps = points
    .map(point => point.timestamp)
    .filter((value): value is number => value !== undefined)
  if (timestamps.length !== points.length) return []

  return timestamps
    .slice(1)
    .map((timestamp, index) => (timestamp - timestamps[index]) * 1000)
    .filter(interval => Number.isFinite(interval) && interval >= 0)
}

function duration(points: CanSignalPoint[]): number | undefined {
  const first = points[0]?.timestamp
  const last = points[points.length - 1]?.timestamp
  if (first === undefined || last === undefined) return undefined
  return Math.max(0, (last - first) * 1000)
}

function parseTimestamp(value?: string): number | undefined {
  if (!value) return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function emptyStats(): CanSignalStats {
  return {
    count: 0,
    min: 0,
    max: 0,
    avg: 0,
    first: 0,
    last: 0,
    delta: 0,
    jumpCount: 0,
    maxJump: 0
  }
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(2))
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2).replace(/\.?0+$/, '')} s`
  return `${ms.toFixed(0)} ms`
}
