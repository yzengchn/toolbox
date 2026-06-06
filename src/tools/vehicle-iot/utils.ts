export interface Jt808ParseResult {
  order: number
  rawHex: string
  unescapedHex: string
  validBoundary: boolean
  checksum: {
    received: string
    calculated: string
    matched: boolean
  }
  header: Jt808Header | null
  bodyHex: string
  bodyFields: FieldRow[]
  error?: string
}

export interface Jt809ParseResult {
  order: number
  rawHex: string
  unescapedHex: string
  validBoundary: boolean
  checksum: {
    received: string
    calculated: string
    matched: boolean
  }
  header: Jt809Header | null
  bodyHex: string
  bodyFields: FieldRow[]
  error?: string
}

export interface Jt809Header {
  msgId: string
  msgName: string
  bodyLength: number
  msgSerialNo: number
  msgGnssCenterId: number
  versionFlag: number
  encryptFlag: number
  encryptKey: number
}

export interface Jt808Header {
  msgId: string
  msgName: string
  bodyLength: number
  encryptType: number
  isSubpackage: boolean
  versionFlag: boolean
  protocolVersion?: number
  terminalPhoneNo: string
  msgSerialNo: number
  packageTotal?: number
  packageIndex?: number
}

export interface FieldRow {
  label: string
  value: string
  remark?: string
}

const msgNames: Record<string, string> = {
  '0001': '终端通用应答',
  '0002': '终端心跳',
  '0100': '终端注册',
  '0102': '终端鉴权',
  '0200': '位置信息汇报',
  '0704': '定位数据批量上传',
  '0800': '多媒体事件信息上传',
  '0801': '多媒体数据上传',
  '8100': '终端注册应答',
  '8103': '设置终端参数',
  '8201': '位置信息查询',
  '8300': '文本信息下发',
  '9101': '实时音视频传输请求',
  '9102': '音视频实时传输控制',
  '9205': '查询资源列表',
  '9206': '文件上传指令'
}

const jt809MsgNames: Record<string, string> = {
  '1001': '主链路登录请求',
  '1002': '主链路登录应答',
  '1003': '主链路注销请求',
  '1004': '主链路注销应答',
  '1005': '主链路心跳请求',
  '1006': '主链路心跳应答',
  '1200': '上行主链路动态信息交换消息',
  '1201': '上行主链路实时视频请求消息',
  '9001': '从链路登录请求',
  '9002': '从链路登录应答',
  '9003': '从链路注销请求',
  '9004': '从链路注销应答',
  '9005': '从链路心跳请求',
  '9006': '从链路心跳应答',
  '9101': '下行主链路动态信息交换消息',
  '9102': '下行主链路实时视频应答消息'
}

export function normalizeHex(input: string): string {
  return input.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '').toUpperCase()
}

export function bytesToHex(bytes: number[], separator = ' '): string {
  return bytes.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(separator)
}

export function hexToBytes(input: string): number[] {
  const hex = normalizeHex(input)
  if (!hex) return []
  if (hex.length % 2 !== 0) {
    throw new Error('Hex 长度必须为偶数')
  }
  const bytes: number[] = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16))
  }
  return bytes
}

export function xorChecksum(bytes: number[]): number {
  return bytes.reduce((result, byte) => result ^ byte, 0)
}

export function escapeJt808Bytes(bytes: number[]): number[] {
  const escaped: number[] = []
  for (const byte of bytes) {
    if (byte === 0x7e) {
      escaped.push(0x7d, 0x02)
    } else if (byte === 0x7d) {
      escaped.push(0x7d, 0x01)
    } else {
      escaped.push(byte)
    }
  }
  return escaped
}

export function unescapeJt808Bytes(bytes: number[]): number[] {
  const unescaped: number[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    const current = bytes[i]
    const next = bytes[i + 1]
    if (current === 0x7d && next === 0x02) {
      unescaped.push(0x7e)
      i += 1
    } else if (current === 0x7d && next === 0x01) {
      unescaped.push(0x7d)
      i += 1
    } else {
      unescaped.push(current)
    }
  }
  return unescaped
}

export function parseJt808Frames(input: string): Jt808ParseResult[] {
  return input
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => parseJt808Frame(line, index + 1))
}

export function parseJt808Frame(input: string, order = 1): Jt808ParseResult {
  const rawBytes = hexToBytes(input)
  const validBoundary = rawBytes.length >= 2 && rawBytes[0] === 0x7e && rawBytes[rawBytes.length - 1] === 0x7e
  const payloadEscaped = validBoundary ? rawBytes.slice(1, -1) : rawBytes
  const payload = unescapeJt808Bytes(payloadEscaped)

  const base: Jt808ParseResult = {
    order,
    rawHex: bytesToHex(rawBytes),
    unescapedHex: bytesToHex(payload),
    validBoundary,
    checksum: {
      received: '',
      calculated: '',
      matched: false
    },
    header: null,
    bodyHex: '',
    bodyFields: []
  }

  if (payload.length < 12) {
    return { ...base, error: '报文长度不足，无法解析 JT808 头部' }
  }

  const receivedChecksum = payload[payload.length - 1]
  const data = payload.slice(0, -1)
  const calculatedChecksum = xorChecksum(data)
  base.checksum = {
    received: byteHex(receivedChecksum),
    calculated: byteHex(calculatedChecksum),
    matched: receivedChecksum === calculatedChecksum
  }

  const msgId = readUInt16(data, 0)
  const props = readUInt16(data, 2)
  const bodyLength = props & 0x03ff
  const encryptType = (props >> 10) & 0x07
  const isSubpackage = ((props >> 13) & 0x01) === 1
  const versionFlag = ((props >> 14) & 0x01) === 1
  let offset = 4
  let protocolVersion: number | undefined

  if (versionFlag) {
    protocolVersion = data[offset]
    offset += 1
  }

  const phoneLength = versionFlag ? 10 : 6
  const terminalPhoneNo = readBcd(data.slice(offset, offset + phoneLength))
  offset += phoneLength
  const msgSerialNo = readUInt16(data, offset)
  offset += 2

  let packageTotal: number | undefined
  let packageIndex: number | undefined
  if (isSubpackage) {
    packageTotal = readUInt16(data, offset)
    packageIndex = readUInt16(data, offset + 2)
    offset += 4
  }

  const body = data.slice(offset, offset + bodyLength)
  const msgIdHex = wordHex(msgId)
  const header: Jt808Header = {
    msgId: msgIdHex,
    msgName: msgNames[msgIdHex] ?? '未知消息',
    bodyLength,
    encryptType,
    isSubpackage,
    versionFlag,
    protocolVersion,
    terminalPhoneNo,
    msgSerialNo,
    packageTotal,
    packageIndex
  }

  return {
    ...base,
    header,
    bodyHex: bytesToHex(body),
    bodyFields: parseJt808Body(msgIdHex, body)
  }
}

export function buildJt808Frame(options: {
  msgIdHex: string
  phone: string
  msgSerialNo: number
  bodyHex: string
  version: '2013' | '2019'
  protocolVersion: number
}): string {
  const body = hexToBytes(options.bodyHex)
  if (body.length > 0x03ff) {
    throw new Error('消息体长度不能超过 1023 字节')
  }
  const msgId = parseInt(normalizeHex(options.msgIdHex).padStart(4, '0').slice(-4), 16)
  const header: number[] = [msgId >> 8, msgId & 0xff]
  const props = body.length | (options.version === '2019' ? 0x4000 : 0)
  header.push(props >> 8, props & 0xff)
  if (options.version === '2019') {
    header.push(options.protocolVersion & 0xff)
    header.push(...phoneToBcd(options.phone, 10))
  } else {
    header.push(...phoneToBcd(options.phone, 6))
  }
  header.push((options.msgSerialNo >> 8) & 0xff, options.msgSerialNo & 0xff)
  const data = [...header, ...body]
  const checksum = xorChecksum(data)
  return bytesToHex([0x7e, ...escapeJt808Bytes([...data, checksum]), 0x7e])
}

export function hexToText(hex: string, encoding: string): string {
  const bytes = new Uint8Array(hexToBytes(hex))
  return new TextDecoder(encoding).decode(bytes)
}

export function textToHex(text: string): string {
  return bytesToHex([...new TextEncoder().encode(text)])
}

export function bcdToText(hex: string): string {
  return readBcd(hexToBytes(hex))
}

export function textToBcd(text: string): string {
  return bytesToHex(phoneToBcd(text, Math.ceil(text.replace(/\D/g, '').length / 2)))
}

export function coordinateToRaw(value: number): string {
  if (!Number.isFinite(value)) throw new Error('请输入有效的经纬度小数')
  const raw = Math.round(Math.abs(value) * 1_000_000)
  return dwordHex(raw)
}

export function rawToCoordinate(hex: string): string {
  const bytes = hexToBytes(hex)
  if (bytes.length !== 4) throw new Error('经纬度原始值需要 4 字节')
  return (readUInt32(bytes, 0) / 1_000_000).toFixed(6)
}

export function jtTimeToDateTime(hex: string): string {
  const bcd = bcdToText(hex)
  if (bcd.length < 12) throw new Error('时间 BCD 需要 6 字节')
  return `20${bcd.slice(0, 2)}-${bcd.slice(2, 4)}-${bcd.slice(4, 6)} ${bcd.slice(6, 8)}:${bcd.slice(8, 10)}:${bcd.slice(10, 12)}`
}

export function dateTimeToJtTime(value: Date): string {
  const yy = String(value.getFullYear()).slice(-2)
  const parts = [
    yy,
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
    String(value.getHours()).padStart(2, '0'),
    String(value.getMinutes()).padStart(2, '0'),
    String(value.getSeconds()).padStart(2, '0')
  ]
  return textToBcd(parts.join(''))
}

function parseJt808Body(msgId: string, body: number[]): FieldRow[] {
  if (msgId === '0200') return parseLocationBody(body)
  if (msgId === '0001' && body.length >= 5) {
    const resultMap: Record<number, string> = {
      0: '成功/确认',
      1: '失败',
      2: '消息有误',
      3: '不支持',
      4: '报警处理确认'
    }
    const replyMsgId = wordHex(readUInt16(body, 2))
    return [
      { label: '应答流水号', value: String(readUInt16(body, 0)) },
      { label: '应答消息 ID', value: `0x${replyMsgId}`, remark: msgNames[replyMsgId] },
      { label: '结果', value: `${body[4]} ${resultMap[body[4]] ?? ''}` }
    ]
  }
  if (msgId === '0102' && body.length > 0) {
    return [{ label: '鉴权码 Hex', value: bytesToHex(body) }]
  }
  if (msgId === '0002') return [{ label: '消息体', value: '空' }]
  return body.length ? [{ label: '消息体 Hex', value: bytesToHex(body) }] : [{ label: '消息体', value: '空' }]
}

function parseLocationBody(body: number[]): FieldRow[] {
  if (body.length < 28) return [{ label: '消息体 Hex', value: bytesToHex(body), remark: '0x0200 标准位置体长度至少 28 字节' }]
  const alarm = readUInt32(body, 0)
  const status = readUInt32(body, 4)
  const lat = readUInt32(body, 8) / 1_000_000
  const lng = readUInt32(body, 12) / 1_000_000
  const speed = readUInt16(body, 18) / 10
  const timeHex = bytesToHex(body.slice(22, 28), '')
  const rows: FieldRow[] = [
    { label: '报警标志', value: `0x${dwordHex(alarm)}` },
    { label: '状态', value: `0x${dwordHex(status)}`, remark: parseStatus(status).join('、') || '无状态位' },
    { label: '纬度', value: lat.toFixed(6), remark: (status & 0x04) ? '南纬' : '北纬' },
    { label: '经度', value: lng.toFixed(6), remark: (status & 0x08) ? '西经' : '东经' },
    { label: '高程', value: `${readUInt16(body, 16)} m` },
    { label: '速度', value: `${speed.toFixed(1)} km/h` },
    { label: '方向', value: `${readUInt16(body, 20)} 度` },
    { label: '时间', value: jtTimeToDateTime(timeHex) }
  ]
  if (body.length > 28) rows.push({ label: '附加信息 Hex', value: bytesToHex(body.slice(28)) })
  return rows
}

function parseStatus(status: number): string[] {
  const labels = [
    ['ACC 开', 0],
    ['已定位', 1],
    ['南纬', 2],
    ['西经', 3],
    ['运营状态', 4],
    ['经纬度已加密', 5]
  ] as const
  return labels.filter(([, bit]) => (status & (1 << bit)) !== 0).map(([label]) => label)
}

function phoneToBcd(phone: string, byteLength: number): number[] {
  const digits = phone.replace(/\D/g, '').slice(-byteLength * 2).padStart(byteLength * 2, '0')
  return digits.match(/.{1,2}/g)?.map(part => parseInt(part, 16)) ?? []
}

function readBcd(bytes: number[]): string {
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function readUInt16(bytes: number[], offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)
}

function readUInt32(bytes: number[], offset: number): number {
  return (((bytes[offset] ?? 0) * 0x1000000) + ((bytes[offset + 1] ?? 0) << 16) + ((bytes[offset + 2] ?? 0) << 8) + (bytes[offset + 3] ?? 0)) >>> 0
}

function byteHex(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase()
}

function wordHex(value: number): string {
  return value.toString(16).padStart(4, '0').toUpperCase()
}

function dwordHex(value: number): string {
  return value.toString(16).padStart(8, '0').toUpperCase()
}

// JT809 协议相关函数
export function crc16(bytes: number[]): number {
  let crc = 0xffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0x8408
      } else {
        crc >>= 1
      }
    }
  }
  return (~crc) & 0xffff
}

export function escapeJt809Bytes(bytes: number[]): number[] {
  const escaped: number[] = []
  for (const byte of bytes) {
    if (byte === 0x5b) {
      escaped.push(0x5a, 0x01)
    } else if (byte === 0x5a) {
      escaped.push(0x5a, 0x02)
    } else if (byte === 0x5d) {
      escaped.push(0x5e, 0x01)
    } else if (byte === 0x5e) {
      escaped.push(0x5e, 0x02)
    } else {
      escaped.push(byte)
    }
  }
  return escaped
}

export function unescapeJt809Bytes(bytes: number[]): number[] {
  const unescaped: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    const current = bytes[i]
    const next = bytes[i + 1]
    if (current === 0x5a && next === 0x01) {
      unescaped.push(0x5b)
      i++
    } else if (current === 0x5a && next === 0x02) {
      unescaped.push(0x5a)
      i++
    } else if (current === 0x5e && next === 0x01) {
      unescaped.push(0x5d)
      i++
    } else if (current === 0x5e && next === 0x02) {
      unescaped.push(0x5e)
      i++
    } else {
      unescaped.push(current)
    }
  }
  return unescaped
}

export function parseJt809Frames(input: string): Jt809ParseResult[] {
  return input
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => parseJt809Frame(line, index + 1))
}

export function parseJt809Frame(input: string, order = 1): Jt809ParseResult {
  const rawBytes = hexToBytes(input)
  const validBoundary = rawBytes.length >= 2 && rawBytes[0] === 0x5b && rawBytes[rawBytes.length - 1] === 0x5d
  const payloadEscaped = validBoundary ? rawBytes.slice(1, -1) : rawBytes
  const payload = unescapeJt809Bytes(payloadEscaped)

  const base: Jt809ParseResult = {
    order,
    rawHex: bytesToHex(rawBytes),
    unescapedHex: bytesToHex(payload),
    validBoundary,
    checksum: {
      received: '',
      calculated: '',
      matched: false
    },
    header: null,
    bodyHex: '',
    bodyFields: []
  }

  if (payload.length < 22) {
    return { ...base, error: '报文长度不足，无法解析 JT809 头部（至少需要 22 字节）' }
  }

  const receivedCrc = readUInt16(payload, payload.length - 2)
  const data = payload.slice(0, -2)
  const calculatedCrc = crc16(data)
  base.checksum = {
    received: wordHex(receivedCrc),
    calculated: wordHex(calculatedCrc),
    matched: receivedCrc === calculatedCrc
  }

  const bodyLength = readUInt32(payload, 0)
  const msgSerialNo = readUInt32(payload, 4)
  const msgId = readUInt16(payload, 8)
  const msgGnssCenterId = readUInt32(payload, 10)
  const versionFlag = payload[14] >> 6
  const encryptFlag = (payload[14] >> 5) & 0x01
  const encryptKey = readUInt32(payload, 15)

  const body = payload.slice(19, 19 + bodyLength)
  const msgIdHex = wordHex(msgId)

  const header: Jt809Header = {
    msgId: msgIdHex,
    msgName: jt809MsgNames[msgIdHex] ?? '未知消息',
    bodyLength,
    msgSerialNo,
    msgGnssCenterId,
    versionFlag,
    encryptFlag,
    encryptKey
  }

  return {
    ...base,
    header,
    bodyHex: bytesToHex(body),
    bodyFields: body.length ? [{ label: '消息体 Hex', value: bytesToHex(body) }] : [{ label: '消息体', value: '空' }]
  }
}

export function buildJt809Frame(options: {
  msgIdHex: string
  msgSerialNo: number
  msgGnssCenterId: number
  bodyHex: string
  versionFlag: number
  encryptFlag: number
  encryptKey: number
}): string {
  const body = hexToBytes(options.bodyHex)
  const bodyLength = body.length
  const msgId = parseInt(normalizeHex(options.msgIdHex).padStart(4, '0').slice(-4), 16)

  const header: number[] = []
  // 数据体长度 (4字节)
  header.push((bodyLength >> 24) & 0xff, (bodyLength >> 16) & 0xff, (bodyLength >> 8) & 0xff, bodyLength & 0xff)
  // 报文序列号 (4字节)
  header.push(
    (options.msgSerialNo >> 24) & 0xff,
    (options.msgSerialNo >> 16) & 0xff,
    (options.msgSerialNo >> 8) & 0xff,
    options.msgSerialNo & 0xff
  )
  // 业务数据类型 (2字节)
  header.push((msgId >> 8) & 0xff, msgId & 0xff)
  // 下级平台接入码 (4字节)
  header.push(
    (options.msgGnssCenterId >> 24) & 0xff,
    (options.msgGnssCenterId >> 16) & 0xff,
    (options.msgGnssCenterId >> 8) & 0xff,
    options.msgGnssCenterId & 0xff
  )
  // 协议版本号标识 + 加密标识 (1字节)
  const flag = ((options.versionFlag & 0x03) << 6) | ((options.encryptFlag & 0x01) << 5)
  header.push(flag)
  // 加密密钥 (4字节)
  header.push(
    (options.encryptKey >> 24) & 0xff,
    (options.encryptKey >> 16) & 0xff,
    (options.encryptKey >> 8) & 0xff,
    options.encryptKey & 0xff
  )

  const data = [...header, ...body]
  const crc = crc16(data)
  const dataWithCrc = [...data, (crc >> 8) & 0xff, crc & 0xff]

  return bytesToHex([0x5b, ...escapeJt809Bytes(dataWithCrc), 0x5d])
}

