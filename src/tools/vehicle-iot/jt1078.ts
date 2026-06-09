import { bytesToHex, hexToBytes, parseNonEmptyInputLines } from './utils'

export interface Jt1078Nalu {
  offset: number
  codec: 'H264' | 'H265' | 'Unknown'
  type: number
  name: string
}

export interface Jt1078Packet {
  order: number
  rawLine: string
  rawHex: string
  version: number
  padding: boolean
  extension: boolean
  csrcCount: number
  marker: boolean
  payloadType: number
  payloadTypeName: string
  sequence: number
  sim: string
  channel: number
  dataType: number
  dataTypeName: string
  subpackageType: number
  subpackageName: string
  headerLength: number
  mediaTimestampHex?: string
  lastIFrameInterval?: number
  lastFrameInterval?: number
  bodyLength: number
  actualBodyLength: number
  bodyHex: string
  naluUnits: Jt1078Nalu[]
  warnings: string[]
  error?: string
}

const payloadTypeNames: Record<number, string> = {
  96: '视频 PS/RTP 负载',
  97: '音频 RTP 负载',
  98: '透传数据'
}

const dataTypeNames: Record<number, string> = {
  0: '视频 I 帧',
  1: '视频 P 帧',
  2: '视频 B 帧',
  3: '音频帧',
  4: '透传数据'
}

const subpackageNames: Record<number, string> = {
  0: '原子包',
  1: '第一包',
  2: '最后包',
  3: '中间包'
}

const h264NalNames: Record<number, string> = {
  1: '非 IDR 图像片',
  5: 'IDR 关键帧',
  6: 'SEI',
  7: 'SPS',
  8: 'PPS',
  9: '访问单元分隔符'
}

const h265NalNames: Record<number, string> = {
  19: 'IDR_W_RADL 关键帧',
  20: 'IDR_N_LP 关键帧',
  32: 'VPS',
  33: 'SPS',
  34: 'PPS',
  39: 'SEI 前缀'
}

export function parseJt1078Packets(input: string): Jt1078Packet[] {
  return parseNonEmptyInputLines(input, parseJt1078Packet)
}

export function parseJt1078Packet(input: string, order = 1): Jt1078Packet {
  const rawBytes = hexToBytes(input)
  const base = createEmptyPacket(order, input, rawBytes)

  if (rawBytes.length < 14) {
    return {
      ...base,
      error: '包长度不足，JT1078 音频/透传包至少需要 14 字节头'
    }
  }

  const first = rawBytes[0]
  const second = rawBytes[1]
  const dataTypeByte = rawBytes[11]
  const dataType = (dataTypeByte >> 4) & 0x0f
  const isVideo = dataType <= 2
  const headerLength = isVideo ? 26 : 14

  if (rawBytes.length < headerLength) {
    return {
      ...base,
      version: (first >> 6) & 0x03,
      padding: ((first >> 5) & 0x01) === 1,
      extension: ((first >> 4) & 0x01) === 1,
      csrcCount: first & 0x0f,
      marker: ((second >> 7) & 0x01) === 1,
      payloadType: second & 0x7f,
      payloadTypeName: payloadTypeNames[second & 0x7f] ?? '未知负载类型',
      sequence: readUInt16(rawBytes, 2),
      sim: readBcd(rawBytes.slice(4, 10)),
      channel: rawBytes[10] ?? 0,
      dataType,
      dataTypeName: dataTypeNames[dataType] ?? '未知数据类型',
      subpackageType: dataTypeByte & 0x0f,
      subpackageName: subpackageNames[dataTypeByte & 0x0f] ?? '未知分包类型',
      headerLength,
      error: `包长度不足，${dataTypeNames[dataType] ?? '当前类型'} 至少需要 ${headerLength} 字节头`
    }
  }

  const bodyLength = readUInt16(rawBytes, isVideo ? 24 : 12)
  const body = rawBytes.slice(headerLength, headerLength + bodyLength)
  const warnings = collectLengthWarnings(rawBytes.length, headerLength, bodyLength)
  const mediaTimestamp = isVideo ? rawBytes.slice(12, 20) : undefined

  return {
    ...base,
    version: (first >> 6) & 0x03,
    padding: ((first >> 5) & 0x01) === 1,
    extension: ((first >> 4) & 0x01) === 1,
    csrcCount: first & 0x0f,
    marker: ((second >> 7) & 0x01) === 1,
    payloadType: second & 0x7f,
    payloadTypeName: payloadTypeNames[second & 0x7f] ?? '未知负载类型',
    sequence: readUInt16(rawBytes, 2),
    sim: readBcd(rawBytes.slice(4, 10)),
    channel: rawBytes[10],
    dataType,
    dataTypeName: dataTypeNames[dataType] ?? '未知数据类型',
    subpackageType: dataTypeByte & 0x0f,
    subpackageName: subpackageNames[dataTypeByte & 0x0f] ?? '未知分包类型',
    headerLength,
    mediaTimestampHex: mediaTimestamp ? bytesToHex(mediaTimestamp, '') : undefined,
    lastIFrameInterval: isVideo ? readUInt16(rawBytes, 20) : undefined,
    lastFrameInterval: isVideo ? readUInt16(rawBytes, 22) : undefined,
    bodyLength,
    actualBodyLength: body.length,
    bodyHex: bytesToHex(body),
    naluUnits: isVideo ? parseNaluUnits(body) : [],
    warnings
  }
}

export function buildJt1078DemoInput(): string {
  const idrPayload = [
    0x00, 0x00, 0x00, 0x01, 0x67, 0x64, 0x00, 0x1f, 0xac, 0xd9,
    0x40, 0x78, 0x02, 0x27, 0xe5, 0xc0,
    0x00, 0x00, 0x00, 0x01, 0x68, 0xeb, 0xef, 0x20,
    0x00, 0x00, 0x00, 0x01, 0x65, 0x88, 0x84, 0x00, 0x2a, 0xff
  ]
  const pPayload = [
    0x00, 0x00, 0x00, 0x01, 0x41, 0x9a, 0x22, 0x11, 0x00, 0x33, 0x44, 0x55
  ]
  const audioPayload = [0xff, 0xf1, 0x50, 0x80, 0x03, 0x1f, 0xfc, 0x21, 0x10, 0x45, 0x66, 0x20]

  return [
    bytesToHex(buildJt1078Packet({
      sequence: 1024,
      payloadType: 96,
      marker: true,
      sim: '013912345678',
      channel: 1,
      dataType: 0,
      subpackageType: 0,
      timestampSeed: 1,
      lastIFrameInterval: 0,
      lastFrameInterval: 0,
      payload: idrPayload
    })),
    bytesToHex(buildJt1078Packet({
      sequence: 1025,
      payloadType: 96,
      sim: '013912345678',
      channel: 1,
      dataType: 1,
      subpackageType: 0,
      timestampSeed: 2,
      lastIFrameInterval: 40,
      lastFrameInterval: 40,
      payload: pPayload
    })),
    bytesToHex(buildJt1078Packet({
      sequence: 1026,
      payloadType: 97,
      marker: true,
      sim: '013912345678',
      channel: 2,
      dataType: 3,
      subpackageType: 0,
      payload: audioPayload
    }))
  ].join('\n')
}

function createEmptyPacket(order: number, rawLine: string, rawBytes: number[]): Jt1078Packet {
  return {
    order,
    rawLine,
    rawHex: bytesToHex(rawBytes),
    version: 0,
    padding: false,
    extension: false,
    csrcCount: 0,
    marker: false,
    payloadType: 0,
    payloadTypeName: '-',
    sequence: 0,
    sim: '-',
    channel: 0,
    dataType: 0,
    dataTypeName: '-',
    subpackageType: 0,
    subpackageName: '-',
    headerLength: 0,
    bodyLength: 0,
    actualBodyLength: 0,
    bodyHex: '',
    naluUnits: [],
    warnings: []
  }
}

function collectLengthWarnings(totalLength: number, headerLength: number, bodyLength: number): string[] {
  const warnings: string[] = []
  const actualBodyLength = Math.max(0, totalLength - headerLength)
  if (actualBodyLength < bodyLength) {
    warnings.push(`负载长度不足：头部声明 ${bodyLength} 字节，实际只有 ${actualBodyLength} 字节`)
  }
  if (actualBodyLength > bodyLength) {
    warnings.push(`尾部存在 ${actualBodyLength - bodyLength} 字节未声明数据`)
  }
  return warnings
}

function parseNaluUnits(payload: number[]): Jt1078Nalu[] {
  const starts = findAnnexBStartCodes(payload)
  if (!starts.length) {
    return payload.length ? [decodeNal(payload[0], 0)] : []
  }

  return starts
    .filter(start => start.nalOffset < payload.length)
    .map(start => decodeNal(payload[start.nalOffset], start.offset))
}

function findAnnexBStartCodes(payload: number[]): Array<{ offset: number; nalOffset: number }> {
  const starts: Array<{ offset: number; nalOffset: number }> = []
  for (let index = 0; index + 3 < payload.length; index += 1) {
    if (payload[index] === 0x00 && payload[index + 1] === 0x00 && payload[index + 2] === 0x01) {
      starts.push({ offset: index, nalOffset: index + 3 })
      index += 2
    } else if (
      index + 4 < payload.length &&
      payload[index] === 0x00 &&
      payload[index + 1] === 0x00 &&
      payload[index + 2] === 0x00 &&
      payload[index + 3] === 0x01
    ) {
      starts.push({ offset: index, nalOffset: index + 4 })
      index += 3
    }
  }
  return starts
}

function decodeNal(headerByte: number, offset: number): Jt1078Nalu {
  const h264Type = headerByte & 0x1f
  if (h264NalNames[h264Type]) {
    return {
      offset,
      codec: 'H264',
      type: h264Type,
      name: h264NalNames[h264Type]
    }
  }

  const h265Type = (headerByte >> 1) & 0x3f
  if (h265NalNames[h265Type]) {
    return {
      offset,
      codec: 'H265',
      type: h265Type,
      name: h265NalNames[h265Type]
    }
  }

  return {
    offset,
    codec: 'Unknown',
    type: h264Type,
    name: `NAL type ${h264Type}`
  }
}

function buildJt1078Packet(options: {
  sequence: number
  payloadType: number
  marker?: boolean
  sim: string
  channel: number
  dataType: number
  subpackageType: number
  timestampSeed?: number
  lastIFrameInterval?: number
  lastFrameInterval?: number
  payload: number[]
}): number[] {
  const first = 0x80
  const second = (options.marker ? 0x80 : 0x00) | (options.payloadType & 0x7f)
  const header = [
    first,
    second,
    (options.sequence >> 8) & 0xff,
    options.sequence & 0xff,
    ...decimalToBcdBytes(options.sim, 6),
    options.channel & 0xff,
    ((options.dataType & 0x0f) << 4) | (options.subpackageType & 0x0f)
  ]

  if (options.dataType <= 2) {
    header.push(...timestampBytes(options.timestampSeed ?? options.sequence))
    header.push(
      ((options.lastIFrameInterval ?? 0) >> 8) & 0xff,
      (options.lastIFrameInterval ?? 0) & 0xff,
      ((options.lastFrameInterval ?? 0) >> 8) & 0xff,
      (options.lastFrameInterval ?? 0) & 0xff
    )
  }

  header.push((options.payload.length >> 8) & 0xff, options.payload.length & 0xff)
  return [...header, ...options.payload]
}

function timestampBytes(seed: number): number[] {
  const value = 1_717_887_600_000 + seed * 40
  const high = Math.floor(value / 0x100000000)
  const low = value >>> 0
  return [
    (high >> 24) & 0xff,
    (high >> 16) & 0xff,
    (high >> 8) & 0xff,
    high & 0xff,
    (low >> 24) & 0xff,
    (low >> 16) & 0xff,
    (low >> 8) & 0xff,
    low & 0xff
  ]
}

function decimalToBcdBytes(value: string, byteLength: number): number[] {
  const digits = value.replace(/\D/g, '').slice(-byteLength * 2).padStart(byteLength * 2, '0')
  return digits.match(/.{2}/g)?.map(pair => parseInt(pair, 16)) ?? []
}

function readBcd(bytes: number[]): string {
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function readUInt16(bytes: number[], offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)
}
