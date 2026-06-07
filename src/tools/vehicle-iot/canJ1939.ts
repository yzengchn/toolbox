import { bytesToHex, getNonEmptyInputLines, hexToBytes, parseNonEmptyInputLines } from './utils'

export interface DbcSignal {
  name: string
  startBit: number
  length: number
  endian: 'intel' | 'motorola'
  signed: boolean
  factor: number
  offset: number
  unit: string
}

export interface DbcMessage {
  id: number
  rawId: number
  idHex: string
  name: string
  dlc: number
  signals: DbcSignal[]
}

export interface DbcSignalValue {
  name: string
  raw: number
  value: number
  displayValue: string
  unit: string
}

export interface J1939Dtc {
  spn: number
  fmi: number
  occurrenceCount: number
  conversionMethod: number
}

export interface J1939Info {
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
  isPdu1: boolean
  dm1?: {
    lampStatus: string
    dtcs: J1939Dtc[]
  }
}

export interface CanFrame {
  order: number
  rawLine: string
  timestamp?: string
  channel?: string
  id: number
  idHex: string
  extended: boolean
  dlc: number
  data: number[]
  dataHex: string
  format: string
  j1939?: J1939Info
  dbcMessage?: DbcMessage
  dbcSignals: DbcSignalValue[]
  error?: string
}

export interface CanParseOutput {
  frames: CanFrame[]
  dbcMessages: DbcMessage[]
  dbcErrors: string[]
}

const j1939PgnNames: Record<number, string> = {
  0x00ea00: 'Request',
  0x00eb00: 'TP.DT',
  0x00ec00: 'TP.CM',
  0x00f004: 'EEC1 发动机电子控制器 1',
  0x00f003: 'EEC2 发动机电子控制器 2',
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

export function parseCanInput(input: string, dbcInput = ''): CanParseOutput {
  const dbcParse = parseDbc(dbcInput)
  const dbcById = new Map(dbcParse.messages.map(message => [message.id, message]))
  const frames = parseNonEmptyInputLines(input, (line, order) => parseCanLine(line, order, dbcById))

  return {
    frames,
    dbcMessages: dbcParse.messages,
    dbcErrors: dbcParse.errors
  }
}

export function parseDbc(input: string): { messages: DbcMessage[]; errors: string[] } {
  const messages: DbcMessage[] = []
  const errors: string[] = []
  let current: DbcMessage | null = null

  getNonEmptyInputLines(input).forEach(({ text: line, lineNumber }) => {
    const messageMatch = line.match(/^\s*BO_\s+(\d+)\s+([A-Za-z0-9_]+)\s*:\s+(\d+)/)
    if (messageMatch) {
      const rawId = Number(messageMatch[1])
      const id = normalizeDbcId(rawId)
      current = {
        id,
        rawId,
        idHex: canIdHex(id),
        name: messageMatch[2],
        dlc: Number(messageMatch[3]),
        signals: []
      }
      messages.push(current)
      return
    }

    const signalMatch = line.match(/^\s*SG_\s+([A-Za-z0-9_]+)(?:\s+\w+)?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s+\(([-+0-9.eE]+),\s*([-+0-9.eE]+)\)\s+\[[^\]]*]\s+"([^"]*)"/)
    if (signalMatch && current) {
      current.signals.push({
        name: signalMatch[1],
        startBit: Number(signalMatch[2]),
        length: Number(signalMatch[3]),
        endian: signalMatch[4] === '1' ? 'intel' : 'motorola',
        signed: signalMatch[5] === '-',
        factor: Number(signalMatch[6]),
        offset: Number(signalMatch[7]),
        unit: signalMatch[8]
      })
      return
    }

    if (line.trim().startsWith('SG_') && !current) {
      errors.push(`第 ${lineNumber} 行信号没有对应 BO_ 消息`)
    }
  })

  return { messages, errors }
}

function parseCanLine(line: string, order: number, dbcById: Map<number, DbcMessage>): CanFrame {
  try {
    const parsed = parseCanLineParts(line)
    const j1939 = parsed.extended ? parseJ1939Id(parsed.id, parsed.data) : undefined
    const dbcMessage = dbcById.get(parsed.id)
    const dbcSignals = dbcMessage ? decodeDbcSignals(parsed.data, dbcMessage) : []
    return {
      order,
      rawLine: line,
      ...parsed,
      j1939,
      dbcMessage,
      dbcSignals
    }
  } catch (err) {
    return {
      order,
      rawLine: line,
      id: 0,
      idHex: '-',
      extended: false,
      dlc: 0,
      data: [],
      dataHex: '',
      format: '未识别',
      dbcSignals: [],
      error: (err as Error).message
    }
  }
}

function parseCanLineParts(line: string): Omit<CanFrame, 'order' | 'rawLine' | 'j1939' | 'dbcMessage' | 'dbcSignals' | 'error'> {
  const compact = line.match(/^(?:\(([^)]+)\)\s*)?(?:([A-Za-z0-9_-]+)\s+)?([0-9A-Fa-f]{3,8})#([0-9A-Fa-f]*)$/)
  if (compact) {
    const id = parseInt(compact[3], 16)
    const data = hexToBytes(compact[4])
    return buildFrameParts({
      timestamp: compact[1],
      channel: compact[2],
      id,
      data,
      format: 'candump compact'
    })
  }

  const candump = line.match(/^(?:\(([^)]+)\)\s*)?([A-Za-z0-9_-]+)\s+([0-9A-Fa-f]{3,8})(?:x)?\s+\[(\d+)]\s+(.+)$/)
  if (candump) {
    const id = parseInt(candump[3], 16)
    const data = hexToBytes(candump[5])
    return buildFrameParts({
      timestamp: candump[1],
      channel: candump[2],
      id,
      data: data.slice(0, Number(candump[4])),
      format: 'candump'
    })
  }

  const asc = line.match(/^(\d+(?:\.\d+)?)\s+(\d+)\s+([0-9A-Fa-f]{3,8})(x)?\s+(Rx|Tx)\s+d\s+(\d+)\s+(.+)$/i)
  if (asc) {
    const id = parseInt(asc[3], 16)
    const data = hexToBytes(asc[7])
    return buildFrameParts({
      timestamp: asc[1],
      channel: asc[2],
      id,
      data: data.slice(0, Number(asc[6])),
      format: 'ASC'
    })
  }

  const generic = line.match(/^([0-9A-Fa-f]{3,8})\s+(.+)$/)
  if (generic) {
    const id = parseInt(generic[1], 16)
    return buildFrameParts({
      id,
      data: hexToBytes(generic[2]),
      format: '通用 ID + DATA'
    })
  }

  throw new Error('无法识别 CAN 行格式')
}

function buildFrameParts(options: {
  timestamp?: string
  channel?: string
  id: number
  data: number[]
  format: string
}): Omit<CanFrame, 'order' | 'rawLine' | 'j1939' | 'dbcMessage' | 'dbcSignals' | 'error'> {
  return {
    timestamp: options.timestamp,
    channel: options.channel,
    id: options.id,
    idHex: canIdHex(options.id),
    extended: options.id > 0x7ff,
    dlc: options.data.length,
    data: options.data,
    dataHex: bytesToHex(options.data),
    format: options.format
  }
}

function parseJ1939Id(id: number, data: number[]): J1939Info {
  const priority = (id >> 26) & 0x07
  const reserved = (id >> 25) & 0x01
  const dataPage = (id >> 24) & 0x01
  const pduFormat = (id >> 16) & 0xff
  const pduSpecific = (id >> 8) & 0xff
  const sourceAddress = id & 0xff
  const isPdu1 = pduFormat < 240
  const pgn = isPdu1 ? (dataPage << 16) | (pduFormat << 8) : (dataPage << 16) | (pduFormat << 8) | pduSpecific
  const info: J1939Info = {
    priority,
    reserved,
    dataPage,
    pduFormat,
    pduSpecific,
    sourceAddress,
    destinationAddress: isPdu1 ? pduSpecific : undefined,
    pgn,
    pgnHex: pgn.toString(16).padStart(6, '0').toUpperCase(),
    pgnName: j1939PgnNames[pgn] ?? '未知 PGN',
    isPdu1
  }

  if (pgn === 0x00feca) {
    info.dm1 = parseDm1(data)
  }
  return info
}

function parseDm1(data: number[]): { lampStatus: string; dtcs: J1939Dtc[] } {
  const lamp = data.length >= 2 ? `0x${bytesToHex(data.slice(0, 2), '')}` : '-'
  const dtcs: J1939Dtc[] = []
  for (let offset = 2; offset + 3 < data.length; offset += 4) {
    const chunk = data.slice(offset, offset + 4)
    if (chunk.every(byte => byte === 0xff)) continue
    const spn = chunk[0] | (chunk[1] << 8) | ((chunk[2] & 0xe0) << 11)
    const fmi = chunk[2] & 0x1f
    const occurrenceCount = chunk[3] & 0x7f
    const conversionMethod = (chunk[3] >> 7) & 0x01
    dtcs.push({ spn, fmi, occurrenceCount, conversionMethod })
  }
  return { lampStatus: lamp, dtcs }
}

function decodeDbcSignals(data: number[], message: DbcMessage): DbcSignalValue[] {
  return message.signals
    .filter(signal => signal.length > 0 && signal.length <= 32)
    .map(signal => {
      const raw = extractSignalRaw(data, signal)
      const signedRaw = signal.signed ? toSigned(raw, signal.length) : raw
      const value = signedRaw * signal.factor + signal.offset
      return {
        name: signal.name,
        raw: signedRaw,
        value,
        displayValue: Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, ''),
        unit: signal.unit
      }
    })
}

function extractSignalRaw(data: number[], signal: DbcSignal): number {
  let result = 0
  for (let index = 0; index < signal.length; index += 1) {
    const sourceBit = signal.endian === 'intel'
      ? signal.startBit + index
      : motorolaBitIndex(signal.startBit, index)
    const byteIndex = Math.floor(sourceBit / 8)
    const bitIndex = sourceBit % 8
    const bit = ((data[byteIndex] ?? 0) >> bitIndex) & 0x01
    result |= bit << index
  }
  return result >>> 0
}

function motorolaBitIndex(startBit: number, offset: number): number {
  const startByte = Math.floor(startBit / 8)
  const startBitFromLsb = startBit % 8
  const matrixIndex = startByte * 8 + (7 - startBitFromLsb) + offset
  const byteIndex = Math.floor(matrixIndex / 8)
  const bitFromMsb = matrixIndex % 8
  return byteIndex * 8 + (7 - bitFromMsb)
}

function toSigned(value: number, length: number): number {
  const signBit = 2 ** (length - 1)
  return value >= signBit ? value - (2 ** length) : value
}

function normalizeDbcId(rawId: number): number {
  if (rawId > 0x1fffffff) return rawId & 0x1fffffff
  return rawId
}

function canIdHex(id: number): string {
  return id.toString(16).toUpperCase().padStart(id > 0x7ff ? 8 : 3, '0')
}
