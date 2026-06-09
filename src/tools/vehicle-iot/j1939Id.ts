export interface J1939FieldRow {
  label: string
  value: string
  remark?: string
}

export interface J1939IdResult {
  rawInput: string
  canId: number
  canIdHex: string
  priority: number
  reserved: number
  dataPage: number
  pduFormat: number
  pduSpecific: number
  sourceAddress: number
  destinationAddress?: number
  pgn: number
  pgnHex: string
  pgnName: string
  pduType: 'PDU1' | 'PDU2'
  addressMode: string
  rows: J1939FieldRow[]
  warnings: string[]
}

export interface J1939BuildOptions {
  priority: number
  pgnInput: string
  sourceAddressInput: string
  destinationAddressInput: string
}

const maxCanId = 0x1fffffff

const pgnNames: Record<number, string> = {
  0x002600: 'GB/T 27930 BHM 车辆握手',
  0x002700: 'GB/T 27930 CHM 充电机握手',
  0x005600: 'GB/T 27930 BEM/BST 错误/中止',
  0x00ea00: 'Request 请求',
  0x00eb00: 'TP.DT 传输数据',
  0x00ec00: 'TP.CM 连接管理',
  0x00f003: 'EEC2 发动机电子控制器 2',
  0x00f004: 'EEC1 发动机电子控制器 1',
  0x00f005: 'EEC3 发动机电子控制器 3',
  0x00feca: 'DM1 当前诊断故障码',
  0x00fec1: 'HRVD 高分辨率车辆距离',
  0x00fee9: 'LFC 燃油经济性',
  0x00feee: 'ET1 发动机温度 1',
  0x00fef1: 'CCVS 巡航/车辆速度',
  0x00fef2: 'LFE 燃油经济性',
  0x00fefc: 'DD 燃油液位',
  0x00ff00: '厂商自定义 Proprietary B'
}

export function buildJ1939DemoValues(): J1939BuildOptions {
  return {
    priority: 6,
    pgnInput: 'F004',
    sourceAddressInput: '00',
    destinationAddressInput: ''
  }
}

export function decodeJ1939Id(input: string): J1939IdResult {
  const canId = extractCanId(input)
  return buildJ1939Result(canId, input)
}

export function buildJ1939Id(options: J1939BuildOptions): J1939IdResult {
  const priority = validatePriority(options.priority)
  const sourceAddress = parseHexByte(options.sourceAddressInput, '源地址')
  const pgn = parseFlexibleNumber(options.pgnInput, 'PGN', 0x1ffff)
  const dataPage = (pgn >> 16) & 0x01
  const pduFormat = (pgn >> 8) & 0xff
  const warnings: string[] = []
  let pduSpecific = pgn & 0xff

  if (pduFormat < 240) {
    pduSpecific = parseHexByte(options.destinationAddressInput.trim() || 'FF', '目标地址')
    if ((pgn & 0xff) !== 0) {
      warnings.push('PDU1 PGN 低 8 位按规范归零，目标地址由 PS 字段携带')
    }
  } else if (options.destinationAddressInput.trim()) {
    pduSpecific = parseHexByte(options.destinationAddressInput, '组扩展')
  }

  const canId = (priority << 26) | (dataPage << 24) | (pduFormat << 16) | (pduSpecific << 8) | sourceAddress
  return buildJ1939Result(canId >>> 0, `PGN=${options.pgnInput} SA=${options.sourceAddressInput}`, warnings)
}

function buildJ1939Result(canId: number, rawInput: string, extraWarnings: string[] = []): J1939IdResult {
  if (!Number.isInteger(canId) || canId < 0 || canId > maxCanId) {
    throw new Error('CAN ID 必须在 0x00000000 到 0x1FFFFFFF 范围内')
  }

  const priority = (canId >> 26) & 0x07
  const reserved = (canId >> 25) & 0x01
  const dataPage = (canId >> 24) & 0x01
  const pduFormat = (canId >> 16) & 0xff
  const pduSpecific = (canId >> 8) & 0xff
  const sourceAddress = canId & 0xff
  const isPdu1 = pduFormat < 240
  const pgn = isPdu1 ? (dataPage << 16) | (pduFormat << 8) : (dataPage << 16) | (pduFormat << 8) | pduSpecific
  const destinationAddress = isPdu1 ? pduSpecific : undefined
  const warnings = [...extraWarnings]

  if (canId <= 0x7ff) {
    warnings.push('当前 ID 处于 11 位标准帧范围，J1939 通常使用 29 位扩展帧')
  }
  if (reserved !== 0) {
    warnings.push('R 保留位为 1，常规 J1939 报文应为 0')
  }

  const pgnHexValue = formatPgn(pgn)
  const result: Omit<J1939IdResult, 'rows'> = {
    rawInput,
    canId,
    canIdHex: formatCanId(canId),
    priority,
    reserved,
    dataPage,
    pduFormat,
    pduSpecific,
    sourceAddress,
    destinationAddress,
    pgn,
    pgnHex: pgnHexValue,
    pgnName: pgnNames[pgn] ?? '未知 PGN',
    pduType: isPdu1 ? 'PDU1' : 'PDU2',
    addressMode: isPdu1 ? `点对点，目标地址 0x${formatByte(pduSpecific)}` : `广播/组扩展，GE 0x${formatByte(pduSpecific)}`,
    warnings
  }

  return {
    ...result,
    rows: [
      { label: 'CAN ID', value: `0x${result.canIdHex}`, remark: '29 位扩展标识符' },
      { label: '优先级', value: String(priority), remark: '数值越小优先级越高' },
      { label: 'R / DP', value: `${reserved} / ${dataPage}`, remark: '保留位 / 数据页' },
      { label: 'PGN', value: `0x${pgnHexValue}`, remark: result.pgnName },
      { label: 'PF / PS / SA', value: `${formatByte(pduFormat)} / ${formatByte(pduSpecific)} / ${formatByte(sourceAddress)}` },
      { label: isPdu1 ? '目标地址' : '组扩展', value: `0x${formatByte(pduSpecific)}`, remark: result.addressMode }
    ]
  }
}

function extractCanId(input: string): number {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('请输入 CAN ID')

  const direct = trimmed.replace(/^0x/i, '').replace(/x$/i, '')
  if (/^[0-9a-f]{3,8}$/i.test(direct)) {
    return parseHexNumber(direct, 'CAN ID', maxCanId)
  }

  const match = trimmed.match(/(?:^|[\s(])(?:0x)?([0-9a-f]{3,8})(?:x)?(?=[\s#\])]|$)/i)
  if (!match) {
    throw new Error('未识别 CAN ID，可输入 18FEF100、0x18FEF100 或 candump 行')
  }
  return parseHexNumber(match[1], 'CAN ID', maxCanId)
}

function validatePriority(priority: number): number {
  if (!Number.isInteger(priority) || priority < 0 || priority > 7) {
    throw new Error('优先级必须是 0 到 7 的整数')
  }
  return priority
}

function parseHexByte(input: string, label: string): number {
  return parseHexNumber(input, label, 0xff)
}

function parseHexNumber(input: string, label: string, max: number): number {
  const normalized = input.trim().replace(/^0x/i, '')
  if (!/^[0-9a-f]+$/i.test(normalized)) {
    throw new Error(`${label} 必须是 Hex 数值`)
  }
  const value = parseInt(normalized, 16)
  if (value > max) {
    throw new Error(`${label} 超出范围，最大为 0x${max.toString(16).toUpperCase()}`)
  }
  return value
}

function parseFlexibleNumber(input: string, label: string, max: number): number {
  const trimmed = input.trim()
  if (!trimmed) throw new Error(`请输入 ${label}`)
  const isHex = /^0x/i.test(trimmed) || /[a-f]/i.test(trimmed)
  const normalized = trimmed.replace(/^0x/i, '')
  if (isHex) {
    return parseHexNumber(normalized, label, max)
  }
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} 必须是十进制或 Hex 数值`)
  }
  const value = Number(normalized)
  if (value > max) {
    throw new Error(`${label} 超出范围，最大为 ${max}`)
  }
  return value
}

function formatCanId(value: number): string {
  return value.toString(16).toUpperCase().padStart(8, '0')
}

function formatPgn(value: number): string {
  return value.toString(16).toUpperCase().padStart(6, '0')
}

function formatByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0')
}
