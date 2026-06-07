import { parseNonEmptyInputLines } from './utils'

export type VehicleLogProtocol =
  | 'JT808'
  | 'JT809'
  | 'GB32960'
  | 'GB/T 27930'
  | 'OCPP'
  | 'CAN/J1939'
  | 'OBD/UDS'
  | 'MQTT'
  | 'HTTP'
  | 'WebSocket'
  | '定位/轨迹'
  | '系统'
  | '未知'

export type VehicleLogSeverity = 'error' | 'warning' | 'success' | 'info'
export type VehicleLogDirection = '上行' | '下行' | '接收' | '发送' | '请求' | '响应' | '-'

export interface VehicleLogTag {
  label: string
  value: string
}

export interface VehicleLogTimelineEvent {
  order: number
  rawLine: string
  content: string
  timestampText?: string
  timestampMs?: number
  displayTime: string
  offsetText: string
  gapText: string
  protocol: VehicleLogProtocol
  severity: VehicleLogSeverity
  direction: VehicleLogDirection
  eventType: string
  deviceId: string
  latencyText?: string
  tags: VehicleLogTag[]
}

interface TimestampMatch {
  raw: string
  timestampMs: number
  index: number
}

const protocolRules: Array<{ protocol: VehicleLogProtocol; pattern: RegExp }> = [
  { protocol: 'OCPP', pattern: /\bOCPP\b|BootNotification|Heartbeat|StatusNotification|MeterValues|RemoteStartTransaction|RemoteStopTransaction|TransactionEvent|RequestStartTransaction|RequestStopTransaction|\[\s*[234]\s*,\s*"[^"]+"/i },
  { protocol: 'GB32960', pattern: /\bGB\/?T?\s*32960\b|\b32960\b|车辆登入|车辆登出|实时信息|补发信息|平台登入|\b23\s*23\b|^##/i },
  { protocol: 'GB/T 27930', pattern: /\bGB\/?T?\s*27930\b|\b27930\b|\b(CHM|BHM|CRM|BRM|BCP|CTS|CML|BRO|CRO|BCL|BCS|CCS|BSM|BST|CST|BEM|CEM)\b/i },
  { protocol: 'JT809', pattern: /\bJT[-/\s]?809\b|\b(1001|1002|1005|1006|1200|9001|9002|9005|9006|9101|9102)\b.*\bJT/i },
  { protocol: 'JT808', pattern: /\bJT[-/\s]?808\b|\b(0002|0100|0102|0200|0704|0801|8100|8103|8201|8300)\b.*\b(终端|平台|terminal|device)\b/i },
  { protocol: 'OBD/UDS', pattern: /\bOBD\b|\bOBD-?II\b|\bUDS\b|\bISO-?TP\b|\bDTC\b|\bP[0-3][0-9A-F]{3}\b|\b7E[08]\b|\b(10|11|14|19|22|27|2E|31|3E|62|67|6E|71|7F)\s+[0-9A-F]{2}\b/i },
  { protocol: 'CAN/J1939', pattern: /\bCAN\b|\bJ1939\b|\bPGN\b|\bDM1\b|\bSPN\b|\bFMI\b|\b[A-F0-9]{3,8}#[A-F0-9]{0,16}\b/i },
  { protocol: 'MQTT', pattern: /\bMQTT\b|\btopic\b|\bpublish\b|\bsubscribe\b/i },
  { protocol: 'HTTP', pattern: /\bHTTP\/\d(?:\.\d)?\b|\b(GET|POST|PUT|DELETE|PATCH)\s+\/|\bstatus[=:]\s*[1-5]\d{2}\b/i },
  { protocol: 'WebSocket', pattern: /\bWebSocket\b|\bWS\b|\bwss?:\/\//i },
  { protocol: '定位/轨迹', pattern: /\bGPS\b|\bGNSS\b|\blat(?:itude)?[=:]\s*-?\d+|\blng|longitude|speed[=:]|里程|轨迹|定位|电子围栏|geohash/i }
]

const eventRules: Array<{ type: string; pattern: RegExp }> = [
  { type: '登录/启动', pattern: /登录|登入|上线|online|connect(?:ed)?|BootNotification|启动|鉴权成功/i },
  { type: '心跳', pattern: /心跳|heartbeat|\b0002\b/i },
  { type: '定位', pattern: /定位|位置|GPS|GNSS|\b0200\b|lat(?:itude)?|lng|longitude|speed/i },
  { type: '告警/故障', pattern: /告警|报警|故障|fault|alarm|DTC|DM1|SPN|FMI|异常|过压|欠压|过温|绝缘/i },
  { type: '充电交易', pattern: /StartTransaction|StopTransaction|TransactionEvent|RemoteStart|RemoteStop|RequestStart|RequestStop|充电|交易|枪口|connector/i },
  { type: '计量', pattern: /MeterValues|meter|电量|电压|电流|功率|SOC|采样/i },
  { type: '鉴权', pattern: /Authorize|idTag|idToken|鉴权|认证|刷卡|扫码/i },
  { type: '配置/控制', pattern: /ChangeConfiguration|SetVariables|GetVariables|Reset|TriggerMessage|参数|配置|控制|下发/i },
  { type: '诊断', pattern: /OBD|UDS|DTC|诊断|NRC|PID|DID/i },
  { type: '通信异常', pattern: /timeout|超时|断开|disconnect|retry|重连|checksum|校验失败|丢包|失败|fail/i },
  { type: '报文解析', pattern: /parse|decode|解析|报文|payload|hex/i }
]

export function parseVehicleLogTimeline(input: string): VehicleLogTimelineEvent[] {
  const events = parseNonEmptyInputLines(input, parseVehicleLogLine)

  return applyTimelineGaps(events)
}

function parseVehicleLogLine(line: string, order: number): VehicleLogTimelineEvent {
  const timestamp = findTimestamp(line)
  const content = timestamp ? removeTimestamp(line, timestamp.raw).trim() || line : line
  const protocol = detectProtocol(content)
  const severity = detectSeverity(content)
  const direction = detectDirection(content)
  const eventType = detectEventType(content)
  const tags = extractTags(content, protocol)
  const deviceId = pickDeviceId(tags)
  const latencyText = extractLatencyText(content)

  return {
    order,
    rawLine: line,
    content,
    timestampText: timestamp?.raw,
    timestampMs: timestamp?.timestampMs,
    displayTime: timestamp ? formatDateTime(timestamp.timestampMs) : '无时间',
    offsetText: '-',
    gapText: '-',
    protocol,
    severity,
    direction,
    eventType,
    deviceId,
    latencyText,
    tags
  }
}

function applyTimelineGaps(events: VehicleLogTimelineEvent[]): VehicleLogTimelineEvent[] {
  const sorted = [...events].sort((a, b) => {
    if (a.timestampMs !== undefined && b.timestampMs !== undefined) return a.timestampMs - b.timestampMs || a.order - b.order
    if (a.timestampMs !== undefined) return -1
    if (b.timestampMs !== undefined) return 1
    return a.order - b.order
  })

  const firstTimestamp = sorted.find(event => event.timestampMs !== undefined)?.timestampMs
  let previousTimestamp: number | undefined

  return sorted.map(event => {
    const offsetText = firstTimestamp !== undefined && event.timestampMs !== undefined
      ? formatDuration(event.timestampMs - firstTimestamp)
      : '-'
    const gapText = previousTimestamp !== undefined && event.timestampMs !== undefined
      ? formatSignedDuration(event.timestampMs - previousTimestamp)
      : '-'
    if (event.timestampMs !== undefined) previousTimestamp = event.timestampMs
    return { ...event, offsetText, gapText }
  })
}

function findTimestamp(line: string): TimestampMatch | undefined {
  const datePattern = /\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})?/g
  const epochPattern = /\b1[5-9]\d{8}(?:\.\d{1,3})?\b|\b1[5-9]\d{11,12}\b/g
  const candidates: Array<{ raw: string; index: number }> = []

  for (const match of line.matchAll(datePattern)) {
    candidates.push({ raw: match[0], index: match.index ?? 0 })
  }
  for (const match of line.matchAll(epochPattern)) {
    candidates.push({ raw: match[0], index: match.index ?? 0 })
  }

  return candidates
    .map(candidate => ({ ...candidate, timestampMs: parseTimestamp(candidate.raw) }))
    .filter((candidate): candidate is TimestampMatch => candidate.timestampMs !== undefined)
    .sort((a, b) => a.index - b.index)[0]
}

function parseTimestamp(raw: string): number | undefined {
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const numeric = Number(raw)
    if (!Number.isFinite(numeric)) return undefined
    return raw.includes('.') || raw.length <= 10 ? Math.round(numeric * 1000) : numeric
  }

  const normalized = raw.replace(/\//g, '-')
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:?\d{2})?$/)
  if (!match) return undefined

  const [, year, month, day, hour, minute, second, fraction = '0', timezone] = match
  const millisecond = Number(fraction.padEnd(3, '0').slice(0, 3))

  if (!timezone) {
    const local = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      millisecond
    )
    return Number.isNaN(local.getTime()) ? undefined : local.getTime()
  }

  const offset = timezone === 'Z' ? 'Z' : timezone.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.${String(millisecond).padStart(3, '0')}${offset}`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime()
}

function removeTimestamp(line: string, raw: string): string {
  return line
    .replace(raw, '')
    .replace(/^\s*[\[(]\s*[\])]\s*/, '')
    .replace(/^\s*[-|,]\s*/, '')
    .trim()
}

function detectProtocol(content: string): VehicleLogProtocol {
  return protocolRules.find(rule => rule.pattern.test(content))?.protocol ?? (detectSeverity(content) === 'error' ? '系统' : '未知')
}

function detectSeverity(content: string): VehicleLogSeverity {
  if (/\b(ERROR|ERR|FATAL)\b|失败|异常|超时|timeout|disconnect|断开|校验失败|checksum\s*fail|NRC|Rejected|Faulted/i.test(content)) return 'error'
  if (/\b(WARN|WARNING)\b|告警|报警|alarm|retry|重试|漂移|超速|Suspended|Unavailable/i.test(content)) return 'warning'
  if (/成功|Accepted|online|connected|ready|就绪|Available|完成/i.test(content)) return 'success'
  return 'info'
}

function detectDirection(content: string): VehicleLogDirection {
  if (/->/.test(content)) {
    if (/平台|server|central|csms/i.test(content.split('->')[0])) return '下行'
    return '上行'
  }
  if (/<-/.test(content)) {
    if (/平台|server|central|csms/i.test(content.split('<-')[0])) return '上行'
    return '下行'
  }
  if (/上行|uplink|upload|terminal\s*to|device\s*to|cp\s*to|chargepoint\s*to/i.test(content)) return '上行'
  if (/下行|downlink|download|server\s*to|platform\s*to|csms\s*to/i.test(content)) return '下行'
  if (/\b(rx|recv|receive|received|收到|接收)\b/i.test(content)) return '接收'
  if (/\b(tx|send|sent|发送|下发)\b/i.test(content)) return '发送'
  if (/\brequest|请求\b/i.test(content)) return '请求'
  if (/\bresponse|reply|响应|应答\b/i.test(content)) return '响应'
  return '-'
}

function detectEventType(content: string): string {
  return eventRules.find(rule => rule.pattern.test(content))?.type ?? '其他'
}

function extractTags(content: string, protocol: VehicleLogProtocol): VehicleLogTag[] {
  const tags: VehicleLogTag[] = []
  pushTag(tags, '协议', protocol)

  const vin = content.match(/\b[A-HJ-NPR-Z0-9]{17}\b/)
  if (vin) pushTag(tags, 'VIN', vin[0])

  const terminal = content.match(/\b(?:terminal|sim|phone|mobile|手机号|终端号?|deviceId|device_id)\s*[:= ]\s*([0-9]{10,20})\b/i)
    ?? content.match(/\b(0?1[3-9]\d{9,17})\b/)
  if (terminal) pushTag(tags, '终端', terminal[1])

  const chargePoint = content.match(/\b(?:chargePoint|charge_point|cp|station|pile|device|设备|桩)\s*[:= ]\s*([A-Za-z0-9_-]{3,40})\b/i)
  if (chargePoint) pushTag(tags, '设备', chargePoint[1])

  const action = content.match(/\b(BootNotification|Heartbeat|StatusNotification|Authorize|StartTransaction|StopTransaction|MeterValues|RemoteStartTransaction|RemoteStopTransaction|TransactionEvent|RequestStartTransaction|RequestStopTransaction|DataTransfer|SetVariables|GetVariables|Reset|TriggerMessage)\b/)
  if (action) pushTag(tags, 'Action', action[1])

  const msgId = content.match(/\b(?:msgId|msg_id|消息ID|消息号)\s*[:= ]\s*(0x)?([0-9A-F]{4})\b/i)
    ?? content.match(/\b(0002|0100|0102|0200|0704|0801|8100|8103|8201|8300|1001|1002|1200|9101)\b/i)
  if (msgId) pushTag(tags, 'MsgID', (msgId[2] ?? msgId[1]).toUpperCase())

  const canId = content.match(/\b(?:can_id|canId|id)\s*[:= ]\s*(0x)?([0-9A-F]{3,8})\b/i)
    ?? content.match(/\b([0-9A-F]{3,8})#[0-9A-F]{0,16}\b/i)
  if (canId) pushTag(tags, 'CAN ID', (canId[2] ?? canId[1]).toUpperCase())

  const pgn = content.match(/\bPGN\s*[:= ]\s*(0x)?([0-9A-F]{4,6})\b/i)
  if (pgn) pushTag(tags, 'PGN', pgn[2].toUpperCase())

  const dtc = content.match(/\b([PCBU][0-3][0-9A-F]{3})\b/i)
  if (dtc) pushTag(tags, 'DTC', dtc[1].toUpperCase())

  const transaction = content.match(/\b(?:transactionId|transaction_id|tx|交易号?)\s*[:= ]\s*([A-Za-z0-9_-]{3,40})\b/i)
  if (transaction) pushTag(tags, '交易', transaction[1])

  const connector = content.match(/\b(?:connectorId|connector_id|connector|枪口)\s*[:= ]\s*(\d+)\b/i)
  if (connector) pushTag(tags, '枪口', connector[1])

  const speed = content.match(/\bspeed\s*[:= ]\s*(-?\d+(?:\.\d+)?)\b/i)
  if (speed) pushTag(tags, '速度', `${speed[1]} km/h`)

  return tags
}

function pushTag(tags: VehicleLogTag[], label: string, value: string): void {
  if (!value || tags.some(tag => tag.label === label && tag.value === value)) return
  tags.push({ label, value })
}

function pickDeviceId(tags: VehicleLogTag[]): string {
  return tags.find(tag => ['VIN', '终端', '设备', 'CAN ID'].includes(tag.label))?.value ?? '-'
}

function extractLatencyText(content: string): string | undefined {
  const match = content.match(/\b(?:cost|duration|latency|elapsed|rt|耗时)\s*[:= ]\s*(\d+(?:\.\d+)?)\s*(ms|s|秒|毫秒)?\b/i)
  if (!match) return undefined
  const unit = match[2] ?? 'ms'
  return `${match[1]} ${unit}`
}

function formatDateTime(timestampMs: number): string {
  const date = new Date(timestampMs)
  const parts = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ]
  return `${parts[0]}-${parts[1]}-${parts[2]} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, '0')}`
}

function formatSignedDuration(durationMs: number): string {
  const prefix = durationMs >= 0 ? '+' : '-'
  return `${prefix}${formatDuration(Math.abs(durationMs))}`
}

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs)) return '-'
  if (durationMs < 1000) return `${durationMs} ms`
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 3 : 1)} s`
  const minutes = Math.floor(durationMs / 60_000)
  const seconds = Math.floor((durationMs % 60_000) / 1000)
  if (minutes < 60) return `${minutes} min ${seconds} s`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
