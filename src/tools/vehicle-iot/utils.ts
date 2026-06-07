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

export interface NonEmptyInputLine {
  text: string
  order: number
  lineNumber: number
}

export function getNonEmptyInputLines(input: string): NonEmptyInputLine[] {
  const lines: NonEmptyInputLine[] = []
  input.split(/\r?\n/).forEach((line, index) => {
    const text = line.trim()
    if (!text) return
    lines.push({
      text,
      order: lines.length + 1,
      lineNumber: index + 1
    })
  })
  return lines
}

export function parseNonEmptyInputLines<T>(
  input: string,
  parser: (line: string, order: number, lineNumber: number) => T
): T[] {
  return getNonEmptyInputLines(input).map(({ text, order, lineNumber }) => parser(text, order, lineNumber))
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
  return parseNonEmptyInputLines(input, parseJt808Frame)
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
  return parseNonEmptyInputLines(input, parseJt809Frame)
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

export interface Gb32960Header {
  commandId: string
  commandName: string
  responseFlag: string
  responseName: string
  vin: string
  encryption: string
  encryptionName: string
  dataLength: number
}

export interface Gb32960InfoGroup {
  type: string
  name: string
  rawHex: string
  fields: FieldRow[]
  error?: string
}

export interface Gb32960ParseResult {
  order: number
  rawHex: string
  validBoundary: boolean
  checksum: {
    received: string
    calculated: string
    matched: boolean
  }
  header: Gb32960Header | null
  dataUnitHex: string
  dataFields: FieldRow[]
  infoGroups: Gb32960InfoGroup[]
  error?: string
}

const gb32960CommandNames: Record<number, string> = {
  0x01: '车辆登入',
  0x02: '实时信息上报',
  0x03: '补发信息上报',
  0x04: '车辆登出',
  0x05: '平台登入',
  0x06: '平台登出',
  0x07: '心跳',
  0x08: '终端校时'
}

const gb32960ResponseNames: Record<number, string> = {
  0x01: '成功',
  0x02: '错误',
  0x03: 'VIN 重复',
  0xfe: '命令包'
}

const gb32960EncryptionNames: Record<number, string> = {
  0x01: '不加密',
  0x02: 'RSA 加密',
  0x03: 'AES128 加密',
  0xfe: '异常',
  0xff: '无效'
}

const gb32960InfoTypeNames: Record<number, string> = {
  0x01: '整车数据',
  0x02: '驱动电机数据',
  0x03: '燃料电池数据',
  0x04: '发动机数据',
  0x05: '车辆位置数据',
  0x06: '极值数据',
  0x07: '报警数据',
  0x08: '可充电储能装置电压数据',
  0x09: '可充电储能装置温度数据'
}

export function parseGb32960Frames(input: string): Gb32960ParseResult[] {
  return parseNonEmptyInputLines(input, parseGb32960Frame)
}

export function parseGb32960Frame(input: string, order = 1): Gb32960ParseResult {
  const rawBytes = hexToBytes(input)
  const validBoundary = rawBytes.length >= 2 && rawBytes[0] === 0x23 && rawBytes[1] === 0x23
  const offset = validBoundary ? 2 : 0
  const base: Gb32960ParseResult = {
    order,
    rawHex: bytesToHex(rawBytes),
    validBoundary,
    checksum: {
      received: '',
      calculated: '',
      matched: false
    },
    header: null,
    dataUnitHex: '',
    dataFields: [],
    infoGroups: []
  }

  if (rawBytes.length < offset + 23) {
    return { ...base, error: '报文长度不足，无法解析 GB/T 32960 头部' }
  }

  const command = rawBytes[offset]
  const responseFlag = rawBytes[offset + 1]
  const vinBytes = rawBytes.slice(offset + 2, offset + 19)
  const encryption = rawBytes[offset + 19]
  const dataLength = readUInt16(rawBytes, offset + 20)
  const dataStart = offset + 22
  const checksumIndex = dataStart + dataLength

  const header: Gb32960Header = {
    commandId: byteHex(command),
    commandName: gb32960CommandNames[command] ?? '未知命令',
    responseFlag: byteHex(responseFlag),
    responseName: gb32960ResponseNames[responseFlag] ?? '未知应答标志',
    vin: asciiFromBytes(vinBytes),
    encryption: byteHex(encryption),
    encryptionName: gb32960EncryptionNames[encryption] ?? '未知加密方式',
    dataLength
  }

  if (rawBytes.length < checksumIndex + 1) {
    return {
      ...base,
      header,
      dataUnitHex: bytesToHex(rawBytes.slice(dataStart)),
      error: `数据单元长度声明为 ${dataLength} 字节，但报文剩余长度不足`
    }
  }

  const dataUnit = rawBytes.slice(dataStart, checksumIndex)
  const receivedChecksum = rawBytes[checksumIndex]
  const checksumSource = rawBytes.slice(offset, checksumIndex)
  const calculatedChecksum = xorChecksum(checksumSource)
  const parsedData = parseGb32960DataUnit(command, dataUnit)

  return {
    ...base,
    header,
    dataUnitHex: bytesToHex(dataUnit),
    checksum: {
      received: byteHex(receivedChecksum),
      calculated: byteHex(calculatedChecksum),
      matched: receivedChecksum === calculatedChecksum
    },
    dataFields: parsedData.fields,
    infoGroups: parsedData.groups,
    error: rawBytes.length > checksumIndex + 1 ? '校验码后存在多余字节，已按首帧解析' : undefined
  }
}

function parseGb32960DataUnit(command: number, data: number[]): { fields: FieldRow[]; groups: Gb32960InfoGroup[] } {
  if (command === 0x01) return { fields: parseGb32960Login(data), groups: [] }
  if (command === 0x04) return { fields: parseGb32960Logout(data), groups: [] }
  if (command === 0x02 || command === 0x03) return parseGb32960RealtimeData(data)
  if (command === 0x07) {
    return { fields: data.length ? [{ label: '数据单元 Hex', value: bytesToHex(data) }] : [{ label: '数据单元', value: '空' }], groups: [] }
  }
  if (command === 0x08) {
    return { fields: parseGb32960TimeSync(data), groups: [] }
  }
  return {
    fields: data.length ? [{ label: '数据单元 Hex', value: bytesToHex(data) }] : [{ label: '数据单元', value: '空' }],
    groups: []
  }
}

function parseGb32960Login(data: number[]): FieldRow[] {
  if (data.length < 29) {
    return [{ label: '数据单元 Hex', value: bytesToHex(data), remark: '车辆登入数据通常至少包含时间、流水号、ICCID 等字段' }]
  }
  const codeLength = data[28] ?? 0
  return [
    { label: '登入时间', value: formatGb32960Time(data.slice(0, 6)) },
    { label: '登入流水号', value: String(readUInt16(data, 6)) },
    { label: 'ICCID', value: asciiFromBytes(data.slice(8, 28)) },
    { label: '可充电储能子系统数', value: String(data[28] ?? 0) },
    { label: '编码长度', value: String(codeLength) },
    {
      label: '可充电储能系统编码',
      value: data.length > 29 ? asciiFromBytes(data.slice(29)) || bytesToHex(data.slice(29)) : '空',
      remark: data.length > 29 && codeLength ? `声明编码长度 ${codeLength}` : undefined
    }
  ]
}

function parseGb32960Logout(data: number[]): FieldRow[] {
  if (data.length < 8) {
    return [{ label: '数据单元 Hex', value: bytesToHex(data), remark: '车辆登出数据通常包含时间和登出流水号' }]
  }
  return [
    { label: '登出时间', value: formatGb32960Time(data.slice(0, 6)) },
    { label: '登出流水号', value: String(readUInt16(data, 6)) }
  ]
}

function parseGb32960TimeSync(data: number[]): FieldRow[] {
  if (data.length < 6) {
    return [{ label: '数据单元 Hex', value: bytesToHex(data), remark: '终端校时数据通常为 6 字节时间' }]
  }
  return [{ label: '校时时间', value: formatGb32960Time(data.slice(0, 6)) }]
}

function parseGb32960RealtimeData(data: number[]): { fields: FieldRow[]; groups: Gb32960InfoGroup[] } {
  if (data.length < 6) {
    return {
      fields: [{ label: '数据单元 Hex', value: bytesToHex(data), remark: '实时/补发数据至少应包含 6 字节采集时间' }],
      groups: []
    }
  }

  const fields: FieldRow[] = [{ label: '数据采集时间', value: formatGb32960Time(data.slice(0, 6)) }]
  const groups: Gb32960InfoGroup[] = []
  let offset = 6

  while (offset < data.length) {
    const type = data[offset]
    const parser = parseGb32960InfoGroup(type, data.slice(offset + 1))
    const raw = data.slice(offset, offset + 1 + parser.consumed)
    groups.push({
      type: byteHex(type),
      name: gb32960InfoTypeNames[type] ?? '未知信息类型',
      rawHex: bytesToHex(raw),
      fields: parser.fields,
      error: parser.error
    })
    offset += 1 + Math.max(parser.consumed, 0)

    if (parser.consumed <= 0) break
  }

  fields.push({ label: '信息体数量', value: String(groups.length) })
  return { fields, groups }
}

function parseGb32960InfoGroup(type: number, bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  if (type === 0x01) return parseGb32960VehicleInfo(bytes)
  if (type === 0x02) return parseGb32960MotorInfo(bytes)
  if (type === 0x04) return parseGb32960EngineInfo(bytes)
  if (type === 0x05) return parseGb32960LocationInfo(bytes)
  if (type === 0x06) return parseGb32960ExtremumInfo(bytes)
  if (type === 0x07) return parseGb32960AlarmInfo(bytes)
  if (type === 0x08) return parseGb32960VoltageInfo(bytes)
  if (type === 0x09) return parseGb32960TemperatureInfo(bytes)
  return {
    fields: [{ label: '信息体 Hex', value: bytesToHex(bytes), remark: '未知信息类型，无法判断长度，剩余数据整体展示' }],
    consumed: bytes.length
  }
}

function parseGb32960VehicleInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  const expected = 20
  if (bytes.length < expected) return shortGb32960Group(bytes, expected)
  const gear = bytes[15]
  return {
    consumed: expected,
    fields: [
      { label: '车辆状态', value: gb32960Enum(bytes[0], { 1: '启动', 2: '熄火', 3: '其他' }) },
      { label: '充电状态', value: gb32960Enum(bytes[1], { 1: '停车充电', 2: '行驶充电', 3: '未充电', 4: '充电完成' }) },
      { label: '运行模式', value: gb32960Enum(bytes[2], { 1: '纯电', 2: '混动', 3: '燃油' }) },
      { label: '车速', value: formatScaled(readUInt16(bytes, 3), 10, 'km/h') },
      { label: '累计里程', value: formatScaled(readUInt32(bytes, 5), 10, 'km') },
      { label: '总电压', value: formatScaled(readUInt16(bytes, 9), 10, 'V') },
      { label: '总电流', value: formatOffsetScaled(readUInt16(bytes, 11), 10, 1000, 'A') },
      { label: 'SOC', value: formatByteValue(bytes[13], '%') },
      { label: 'DC-DC 状态', value: gb32960Enum(bytes[14], { 1: '工作', 2: '断开' }) },
      { label: '挡位', value: `0x${byteHex(gear)} / 挡位 ${gear & 0x0f}${gear & 0x10 ? ' / 有制动力' : ''}${gear & 0x20 ? ' / 有驱动力' : ''}` },
      { label: '绝缘电阻', value: formatWordValue(readUInt16(bytes, 16), 'kΩ') },
      { label: '加速踏板行程', value: formatByteValue(bytes[18], '%') },
      { label: '制动踏板状态', value: formatByteValue(bytes[19], '%') }
    ]
  }
}

function parseGb32960MotorInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  if (bytes.length < 1) return shortGb32960Group(bytes, 1)
  const count = bytes[0]
  const expected = 1 + count * 12
  if (bytes.length < expected) return shortGb32960Group(bytes, expected)
  const fields: FieldRow[] = [{ label: '驱动电机个数', value: String(count) }]
  let offset = 1
  for (let index = 0; index < count; index += 1) {
    const prefix = `电机 ${index + 1}`
    fields.push(
      { label: `${prefix} 序号`, value: String(bytes[offset]) },
      { label: `${prefix} 状态`, value: gb32960Enum(bytes[offset + 1], { 1: '耗电', 2: '发电', 3: '关闭', 4: '准备' }) },
      { label: `${prefix} 控制器温度`, value: formatTemperatureByte(bytes[offset + 2]) },
      { label: `${prefix} 转速`, value: `${readInt16(bytes, offset + 3)} r/min` },
      { label: `${prefix} 转矩`, value: formatOffsetScaled(readUInt16(bytes, offset + 5), 10, 2000, 'N·m') },
      { label: `${prefix} 温度`, value: formatTemperatureByte(bytes[offset + 7]) },
      { label: `${prefix} 控制器输入电压`, value: formatScaled(readUInt16(bytes, offset + 8), 10, 'V') },
      { label: `${prefix} 控制器直流母线电流`, value: formatOffsetScaled(readUInt16(bytes, offset + 10), 10, 1000, 'A') }
    )
    offset += 12
  }
  return { fields, consumed: expected }
}

function parseGb32960EngineInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  const expected = 5
  if (bytes.length < expected) return shortGb32960Group(bytes, expected)
  return {
    consumed: expected,
    fields: [
      { label: '发动机状态', value: gb32960Enum(bytes[0], { 1: '启动', 2: '关闭' }) },
      { label: '曲轴转速', value: formatWordValue(readUInt16(bytes, 1), 'r/min') },
      { label: '燃料消耗率', value: formatScaled(readUInt16(bytes, 3), 100, 'L/100km') }
    ]
  }
}

function parseGb32960LocationInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  const expected = 9
  if (bytes.length < expected) return shortGb32960Group(bytes, expected)
  const status = bytes[0]
  const lng = readUInt32(bytes, 1) / 1_000_000
  const lat = readUInt32(bytes, 5) / 1_000_000
  const remarks = [
    status & 0x01 ? '定位无效' : '定位有效',
    status & 0x02 ? '南纬' : '北纬',
    status & 0x04 ? '西经' : '东经'
  ]
  return {
    consumed: expected,
    fields: [
      { label: '定位状态', value: `0x${byteHex(status)}`, remark: remarks.join('、') },
      { label: '经度', value: lng.toFixed(6) },
      { label: '纬度', value: lat.toFixed(6) }
    ]
  }
}

function parseGb32960ExtremumInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  const expected = 14
  if (bytes.length < 13) return shortGb32960Group(bytes, 13)
  const cellNumberBytes = bytes.length >= expected ? 2 : 1
  const maxCellOffset = 1
  const maxVoltageOffset = maxCellOffset + cellNumberBytes
  const minSystemOffset = maxVoltageOffset + 2
  const minCellOffset = minSystemOffset + 1
  const minVoltageOffset = minCellOffset + cellNumberBytes
  const maxTempSystemOffset = minVoltageOffset + 2
  const consumed = maxTempSystemOffset + 6
  if (bytes.length < consumed) return shortGb32960Group(bytes, consumed)
  return {
    consumed,
    fields: [
      { label: '最高电压电池子系统号', value: String(bytes[0]) },
      { label: '最高电压电池单体代号', value: String(readCellNumber(bytes, maxCellOffset, cellNumberBytes)) },
      { label: '电池单体电压最高值', value: formatScaled(readUInt16(bytes, maxVoltageOffset), 1000, 'V') },
      { label: '最低电压电池子系统号', value: String(bytes[minSystemOffset]) },
      { label: '最低电压电池单体代号', value: String(readCellNumber(bytes, minCellOffset, cellNumberBytes)) },
      { label: '电池单体电压最低值', value: formatScaled(readUInt16(bytes, minVoltageOffset), 1000, 'V') },
      { label: '最高温度子系统号', value: String(bytes[maxTempSystemOffset]) },
      { label: '最高温度探针序号', value: String(bytes[maxTempSystemOffset + 1]) },
      { label: '最高温度值', value: formatTemperatureByte(bytes[maxTempSystemOffset + 2]) },
      { label: '最低温度子系统号', value: String(bytes[maxTempSystemOffset + 3]) },
      { label: '最低温度探针序号', value: String(bytes[maxTempSystemOffset + 4]) },
      { label: '最低温度值', value: formatTemperatureByte(bytes[maxTempSystemOffset + 5]) }
    ]
  }
}

function parseGb32960AlarmInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  if (bytes.length < 5) return shortGb32960Group(bytes, 5)
  const fields: FieldRow[] = [
    { label: '最高报警等级', value: gb32960Enum(bytes[0], { 0: '无故障', 1: '1 级故障', 2: '2 级故障', 3: '3 级故障' }) },
    { label: '通用报警标志', value: `0x${dwordHex(readUInt32(bytes, 1))}`, remark: parseGb32960AlarmBits(readUInt32(bytes, 1)).join('、') || '无通用报警位' }
  ]
  let offset = 5
  const sections = ['可充电储能装置故障', '驱动电机故障', '发动机故障', '其他故障']
  for (const section of sections) {
    if (offset >= bytes.length) break
    const count = bytes[offset]
    offset += 1
    const codes: string[] = []
    for (let index = 0; index < count && offset + 4 <= bytes.length; index += 1) {
      codes.push(`0x${dwordHex(readUInt32(bytes, offset))}`)
      offset += 4
    }
    fields.push({ label: section, value: count ? codes.join('、') || `声明 ${count} 个，剩余长度不足` : '无' })
  }
  return { fields, consumed: offset }
}

function parseGb32960VoltageInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  if (bytes.length < 1) return shortGb32960Group(bytes, 1)
  const count = bytes[0]
  const fields: FieldRow[] = [{ label: '可充电储能子系统个数', value: String(count) }]
  let offset = 1
  for (let index = 0; index < count; index += 1) {
    if (offset + 10 > bytes.length) {
      return { fields, consumed: bytes.length, error: '储能电压子系统数据长度不足' }
    }
    const prefix = `子系统 ${index + 1}`
    const subsystemNo = bytes[offset]
    const voltage = readUInt16(bytes, offset + 1)
    const current = readUInt16(bytes, offset + 3)
    const totalCells = readUInt16(bytes, offset + 5)
    const startCell = readUInt16(bytes, offset + 7)
    const cellCount = bytes[offset + 9]
    offset += 10
    const needed = cellCount * 2
    if (offset + needed > bytes.length) {
      return { fields, consumed: bytes.length, error: `${prefix} 单体电压列表长度不足` }
    }
    const voltages: string[] = []
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      voltages.push(`${(readUInt16(bytes, offset + cellIndex * 2) / 1000).toFixed(3)}V`)
    }
    offset += needed
    fields.push(
      { label: `${prefix} 编号`, value: String(subsystemNo) },
      { label: `${prefix} 电压`, value: formatScaled(voltage, 10, 'V') },
      { label: `${prefix} 电流`, value: formatOffsetScaled(current, 10, 1000, 'A') },
      { label: `${prefix} 单体总数`, value: String(totalCells) },
      { label: `${prefix} 本帧起始单体序号`, value: String(startCell) },
      { label: `${prefix} 本帧单体数量`, value: String(cellCount) },
      { label: `${prefix} 单体电压`, value: voltages.join('、') || '空' }
    )
  }
  return { fields, consumed: offset }
}

function parseGb32960TemperatureInfo(bytes: number[]): { fields: FieldRow[]; consumed: number; error?: string } {
  if (bytes.length < 1) return shortGb32960Group(bytes, 1)
  const count = bytes[0]
  const fields: FieldRow[] = [{ label: '可充电储能温度子系统个数', value: String(count) }]
  let offset = 1
  for (let index = 0; index < count; index += 1) {
    if (offset + 3 > bytes.length) return { fields, consumed: bytes.length, error: '储能温度子系统数据长度不足' }
    const prefix = `子系统 ${index + 1}`
    const subsystemNo = bytes[offset]
    const probeCount = readUInt16(bytes, offset + 1)
    offset += 3
    if (offset + probeCount > bytes.length) {
      return { fields, consumed: bytes.length, error: `${prefix} 温度探针列表长度不足` }
    }
    const temperatures = bytes.slice(offset, offset + probeCount).map(formatTemperatureByte)
    offset += probeCount
    fields.push(
      { label: `${prefix} 编号`, value: String(subsystemNo) },
      { label: `${prefix} 温度探针数`, value: String(probeCount) },
      { label: `${prefix} 温度值`, value: temperatures.join('、') || '空' }
    )
  }
  return { fields, consumed: offset }
}

function shortGb32960Group(bytes: number[], expected: number): { fields: FieldRow[]; consumed: number; error: string } {
  return {
    fields: [{ label: '信息体 Hex', value: bytesToHex(bytes), remark: `当前剩余 ${bytes.length} 字节，期望至少 ${expected} 字节` }],
    consumed: bytes.length,
    error: '信息体长度不足'
  }
}

function formatGb32960Time(bytes: number[]): string {
  if (bytes.length < 6) return bytesToHex(bytes)
  const [year, month, day, hour, minute, second] = bytes
  return `20${String(year).padStart(2, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

function asciiFromBytes(bytes: number[]): string {
  return bytes.map(byte => (byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.')).join('').trim()
}

function gb32960Enum(value: number, labels: Record<number, string>): string {
  if (value === 0xfe) return '异常'
  if (value === 0xff) return '无效'
  return `${value} ${labels[value] ?? '未知'}`
}

function formatByteValue(value: number, unit: string): string {
  if (value === 0xfe) return '异常'
  if (value === 0xff) return '无效'
  return `${value} ${unit}`
}

function formatWordValue(value: number, unit: string): string {
  if (value === 0xfffe) return '异常'
  if (value === 0xffff) return '无效'
  return `${value} ${unit}`
}

function formatScaled(value: number, scale: number, unit: string): string {
  if (value === 0xfffe || value === 0xfffffffe) return '异常'
  if (value === 0xffff || value === 0xffffffff) return '无效'
  return `${(value / scale).toFixed(scale === 1 ? 0 : String(scale).length - 1)} ${unit}`
}

function formatOffsetScaled(value: number, scale: number, offset: number, unit: string): string {
  if (value === 0xfffe) return '异常'
  if (value === 0xffff) return '无效'
  return `${(value / scale - offset).toFixed(String(scale).length - 1)} ${unit}`
}

function formatTemperatureByte(value: number): string {
  if (value === 0xfe) return '异常'
  if (value === 0xff) return '无效'
  return `${value - 40} °C`
}

function readInt16(bytes: number[], offset: number): number {
  const value = readUInt16(bytes, offset)
  return value & 0x8000 ? value - 0x10000 : value
}

function readCellNumber(bytes: number[], offset: number, length: number): number {
  return length === 2 ? readUInt16(bytes, offset) : bytes[offset]
}

function parseGb32960AlarmBits(value: number): string[] {
  const labels = [
    '温度差异报警',
    '电池高温报警',
    '车载储能装置类型过压报警',
    '车载储能装置类型欠压报警',
    'SOC 低报警',
    '单体电池过压报警',
    '单体电池欠压报警',
    'SOC 过高报警',
    'SOC 跳变报警',
    '可充电储能系统不匹配报警',
    '电池单体一致性差报警',
    '绝缘报警',
    'DC-DC 温度报警',
    '制动系统报警',
    'DC-DC 状态报警',
    '驱动电机控制器温度报警',
    '高压互锁状态报警',
    '驱动电机温度报警',
    '车载储能装置类型过充'
  ]
  return labels.filter((_, index) => (value & (1 << index)) !== 0)
}

export type CoordinateSystem = 'wgs84' | 'gcj02' | 'bd09'

export interface Coordinate {
  lat: number
  lng: number
}

export interface CoordinateTriplet {
  wgs84: Coordinate
  gcj02: Coordinate
  bd09: Coordinate
}

export interface TrackPoint extends Coordinate {
  id: number
  sourceLine: string
  timestamp?: Date
  speedKmh?: number
  raw?: string
}

export interface TrackSegment {
  from: TrackPoint
  to: TrackPoint
  distanceMeters: number
  durationSeconds?: number
  speedKmh?: number
}

export interface TrackSummary {
  pointCount: number
  totalDistanceMeters: number
  durationSeconds?: number
  averageSpeedKmh?: number
  maxSegmentSpeedKmh?: number
  boundingBox?: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

export interface StopPoint {
  start: TrackPoint
  end: TrackPoint
  center: Coordinate
  durationSeconds: number
  pointCount: number
  radiusMeters: number
}

export interface SpeedingEvent {
  from: TrackPoint
  to: TrackPoint
  speedKmh: number
  distanceMeters: number
  durationSeconds?: number
}

export interface DriftPoint {
  point: TrackPoint
  previous: TrackPoint
  next?: TrackPoint
  reason: string
  distanceMeters: number
  speedKmh?: number
}

export interface FenceAnalysis {
  insideCount: number
  outsideCount: number
  transitions: Array<{
    from: TrackPoint
    to: TrackPoint
    type: 'enter' | 'exit'
  }>
  firstOutside?: TrackPoint
}

export interface NmeaParseResult {
  points: TrackPoint[]
  rows: Array<{
    line: number
    type: string
    status: 'valid' | 'invalid'
    message: string
    point?: TrackPoint
  }>
}

const xPi = Math.PI * 3000.0 / 180.0
const gcjA = 6378245.0
const gcjEe = 0.00669342162296594323

export function validateCoordinate(coord: Coordinate): void {
  if (!Number.isFinite(coord.lat) || !Number.isFinite(coord.lng)) {
    throw new Error('经纬度必须是有效数字')
  }
  if (coord.lat < -90 || coord.lat > 90) {
    throw new Error('纬度范围必须在 -90 到 90 之间')
  }
  if (coord.lng < -180 || coord.lng > 180) {
    throw new Error('经度范围必须在 -180 到 180 之间')
  }
}

export function roundCoordinate(coord: Coordinate, digits = 6): Coordinate {
  return {
    lat: Number(coord.lat.toFixed(digits)),
    lng: Number(coord.lng.toFixed(digits))
  }
}

export function convertCoordinate(coord: Coordinate, from: CoordinateSystem, to: CoordinateSystem): Coordinate {
  validateCoordinate(coord)
  if (from === to) return roundCoordinate(coord)

  const wgs84 = from === 'wgs84'
    ? coord
    : from === 'gcj02'
      ? gcj02ToWgs84(coord)
      : gcj02ToWgs84(bd09ToGcj02(coord))

  if (to === 'wgs84') return roundCoordinate(wgs84)
  if (to === 'gcj02') return roundCoordinate(wgs84ToGcj02(wgs84))
  return roundCoordinate(gcj02ToBd09(wgs84ToGcj02(wgs84)))
}

export function convertCoordinateAll(coord: Coordinate, from: CoordinateSystem): CoordinateTriplet {
  return {
    wgs84: convertCoordinate(coord, from, 'wgs84'),
    gcj02: convertCoordinate(coord, from, 'gcj02'),
    bd09: convertCoordinate(coord, from, 'bd09')
  }
}

export function parseCoordinateLine(line: string, id = 1): TrackPoint {
  const raw = line.trim()
  if (!raw) throw new Error('空坐标行')

  const dateTimeMatch = raw.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{1,2}:\d{1,2}(?::\d{1,2})?/)
  const epochMatch = dateTimeMatch
    ? null
    : raw.match(/(?:timestamp|time|ts|时间)\s*[:=]\s*(\d{13})|(?:^|[,\s])(\d{13})(?=$|[,\s])/i)
  const timestamp = dateTimeMatch
    ? parseLooseDate(dateTimeMatch[0])
    : epochMatch
      ? parseEpochMilliseconds(epochMatch[1] ?? epochMatch[2])
      : undefined
  const speedMatch = raw.match(/(?:speed|速度|v)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i)
  const speedKmh = speedMatch ? Number(speedMatch[1]) : undefined
  const coordinateText = raw
    .replace(dateTimeMatch?.[0] ?? '', ' ')
    .replace(epochMatch?.[0] ?? '', ' ')
    .replace(speedMatch?.[0] ?? '', ' ')
  const labeledMatch = coordinateText.match(/lat(?:itude)?\s*[:=]\s*(-?\d+(?:\.\d+)?).*?(?:lng|lon|longitude)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i)
  if (labeledMatch) {
    const lat = Number(labeledMatch[1])
    const lng = Number(labeledMatch[2])
    validateCoordinate({ lat, lng })
    return {
      id,
      lat,
      lng,
      timestamp,
      speedKmh: Number.isFinite(speedKmh) ? speedKmh : undefined,
      sourceLine: line,
      raw: line
    }
  }

  const numericMatches = coordinateText.match(/-?\d+(?:\.\d+)?/g) ?? []
  const coordinateCandidates = numericMatches
    .map(Number)
    .filter(value => Number.isFinite(value))

  for (let i = 0; i < coordinateCandidates.length - 1; i += 1) {
    const first = coordinateCandidates[i]
    const second = coordinateCandidates[i + 1]
    const coord = normalizeCoordinatePair(first, second)
    if (coord) {
      return {
        id,
        ...roundCoordinate(coord),
        timestamp,
        speedKmh: Number.isFinite(speedKmh) ? speedKmh : undefined,
        sourceLine: line,
        raw: line
      }
    }
  }

  throw new Error(`无效的坐标格式: ${line}`)
}

export function parseTrackPoints(text: string): TrackPoint[] {
  return parseNonEmptyInputLines(text, parseCoordinateLine)
}

export function formatCoordinate(coord: Coordinate, digits = 6): string {
  return `${coord.lat.toFixed(digits)},${coord.lng.toFixed(digits)}`
}

export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const radius = 6371008.8
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLng = toRadians(b.lng - a.lng)
  const sinLat = Math.sin(deltaLat / 2)
  const sinLng = Math.sin(deltaLng / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function buildTrackSegments(points: TrackPoint[]): TrackSegment[] {
  const segments: TrackSegment[] = []
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1]
    const to = points[i]
    const distanceMeters = haversineDistance(from, to)
    const durationSeconds = from.timestamp && to.timestamp
      ? Math.max(0, (to.timestamp.getTime() - from.timestamp.getTime()) / 1000)
      : undefined
    const speedKmh = durationSeconds && durationSeconds > 0
      ? distanceMeters / durationSeconds * 3.6
      : to.speedKmh
    segments.push({
      from,
      to,
      distanceMeters,
      durationSeconds,
      speedKmh: Number.isFinite(speedKmh) ? speedKmh : undefined
    })
  }
  return segments
}

export function summarizeTrack(points: TrackPoint[]): TrackSummary {
  const segments = buildTrackSegments(points)
  const totalDistanceMeters = segments.reduce((sum, segment) => sum + segment.distanceMeters, 0)
  const firstTime = points.find(point => point.timestamp)?.timestamp
  const lastTime = [...points].reverse().find(point => point.timestamp)?.timestamp
  const durationSeconds = firstTime && lastTime && lastTime > firstTime
    ? (lastTime.getTime() - firstTime.getTime()) / 1000
    : undefined
  const segmentSpeeds = segments
    .map(segment => segment.speedKmh)
    .filter((speed): speed is number => Number.isFinite(speed))

  return {
    pointCount: points.length,
    totalDistanceMeters,
    durationSeconds,
    averageSpeedKmh: durationSeconds && durationSeconds > 0 ? totalDistanceMeters / durationSeconds * 3.6 : undefined,
    maxSegmentSpeedKmh: segmentSpeeds.length ? Math.max(...segmentSpeeds) : undefined,
    boundingBox: points.length
      ? {
          minLat: Math.min(...points.map(point => point.lat)),
          maxLat: Math.max(...points.map(point => point.lat)),
          minLng: Math.min(...points.map(point => point.lng)),
          maxLng: Math.max(...points.map(point => point.lng))
        }
      : undefined
  }
}

export function compressTrack(points: TrackPoint[], toleranceMeters: number): TrackPoint[] {
  if (points.length <= 2 || toleranceMeters <= 0) return [...points]
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  simplifySection(points, 0, points.length - 1, toleranceMeters, keep)
  return points.filter((_, index) => keep[index])
}

export function detectStops(points: TrackPoint[], radiusMeters: number, minDurationSeconds: number): StopPoint[] {
  const stops: StopPoint[] = []
  if (points.length < 2 || !points.every(point => point.timestamp)) return stops

  let startIndex = 0
  while (startIndex < points.length - 1) {
    let endIndex = startIndex + 1
    while (
      endIndex < points.length &&
      haversineDistance(points[startIndex], points[endIndex]) <= radiusMeters
    ) {
      endIndex += 1
    }

    const lastInsideIndex = endIndex - 1
    const start = points[startIndex]
    const end = points[lastInsideIndex]
    const durationSeconds = ((end.timestamp?.getTime() ?? 0) - (start.timestamp?.getTime() ?? 0)) / 1000

    if (lastInsideIndex > startIndex && durationSeconds >= minDurationSeconds) {
      const cluster = points.slice(startIndex, lastInsideIndex + 1)
      const center = averageCoordinate(cluster)
      const radius = Math.max(...cluster.map(point => haversineDistance(center, point)))
      stops.push({
        start,
        end,
        center: roundCoordinate(center),
        durationSeconds,
        pointCount: cluster.length,
        radiusMeters: radius
      })
      startIndex = lastInsideIndex + 1
    } else {
      startIndex += 1
    }
  }

  return stops
}

export function detectSpeeding(points: TrackPoint[], limitKmh: number): SpeedingEvent[] {
  return buildTrackSegments(points)
    .filter(segment => Number.isFinite(segment.speedKmh) && (segment.speedKmh ?? 0) > limitKmh)
    .map(segment => ({
      from: segment.from,
      to: segment.to,
      speedKmh: segment.speedKmh ?? 0,
      distanceMeters: segment.distanceMeters,
      durationSeconds: segment.durationSeconds
    }))
}

export function detectDriftPoints(points: TrackPoint[], maxSpeedKmh: number, minJumpMeters: number): DriftPoint[] {
  const drifts: DriftPoint[] = []
  const segments = buildTrackSegments(points)
  segments.forEach((segment, index) => {
    if (segment.distanceMeters < minJumpMeters) return
    if (Number.isFinite(segment.speedKmh) && (segment.speedKmh ?? 0) <= maxSpeedKmh) return
    drifts.push({
      point: segment.to,
      previous: segment.from,
      next: points[index + 2],
      reason: segment.speedKmh
        ? `相邻段速度 ${segment.speedKmh.toFixed(1)} km/h`
        : `相邻点跳变 ${segment.distanceMeters.toFixed(0)} m`,
      distanceMeters: segment.distanceMeters,
      speedKmh: segment.speedKmh
    })
  })
  return drifts
}

export function parseFencePolygon(text: string): Coordinate[] {
  return parseNonEmptyInputLines(text, parseCoordinateLine).map(({ lat, lng }) => ({ lat, lng }))
}

export function analyzeCircleFence(points: TrackPoint[], center: Coordinate, radiusMeters: number): FenceAnalysis {
  return analyzeFence(points, point => haversineDistance(center, point) <= radiusMeters)
}

export function analyzePolygonFence(points: TrackPoint[], polygon: Coordinate[]): FenceAnalysis {
  return analyzeFence(points, point => isPointInPolygon(point, polygon))
}

export function parseNmeaLines(text: string): NmeaParseResult {
  const rows: NmeaParseResult['rows'] = []
  const points: TrackPoint[] = []

  getNonEmptyInputLines(text).forEach(({ text: line, lineNumber }) => {
    try {
      const parsed = parseNmeaLine(line, points.length + 1)
      if (!parsed) {
        rows.push({ line: lineNumber, type: 'NMEA', status: 'invalid', message: '暂只支持 GGA/RMC 定位语句' })
        return
      }
      rows.push({
        line: lineNumber,
        type: parsed.type,
        status: 'valid',
        message: parsed.message,
        point: parsed.point
      })
      if (parsed.point) points.push(parsed.point)
    } catch (err) {
      rows.push({
        line: lineNumber,
        type: 'NMEA',
        status: 'invalid',
        message: (err as Error).message
      })
    }
  })

  return { points, rows }
}

function normalizeCoordinatePair(first: number, second: number): Coordinate | null {
  const firstCanBeLat = Math.abs(first) <= 90
  const secondCanBeLat = Math.abs(second) <= 90
  const firstCanBeLng = Math.abs(first) <= 180
  const secondCanBeLng = Math.abs(second) <= 180

  if (firstCanBeLat && secondCanBeLng) return { lat: first, lng: second }
  if (secondCanBeLat && firstCanBeLng) return { lat: second, lng: first }
  return null
}

function parseLooseDate(value: string): Date | undefined {
  const normalized = value.replace(/\//g, '-').replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function parseEpochMilliseconds(value: string): Date | undefined {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return undefined
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toRadians(value: number): number {
  return value * Math.PI / 180
}

function outOfChina(coord: Coordinate): boolean {
  return coord.lng < 72.004 || coord.lng > 137.8347 || coord.lat < 0.8293 || coord.lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0
  return ret
}

function wgs84ToGcj02(coord: Coordinate): Coordinate {
  if (outOfChina(coord)) return coord
  let dLat = transformLat(coord.lng - 105.0, coord.lat - 35.0)
  let dLng = transformLng(coord.lng - 105.0, coord.lat - 35.0)
  const radLat = coord.lat / 180.0 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - gcjEe * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((gcjA * (1 - gcjEe)) / (magic * sqrtMagic) * Math.PI)
  dLng = (dLng * 180.0) / (gcjA / sqrtMagic * Math.cos(radLat) * Math.PI)
  return {
    lat: coord.lat + dLat,
    lng: coord.lng + dLng
  }
}

function gcj02ToWgs84(coord: Coordinate): Coordinate {
  if (outOfChina(coord)) return coord
  const gcj = wgs84ToGcj02(coord)
  return {
    lat: coord.lat * 2 - gcj.lat,
    lng: coord.lng * 2 - gcj.lng
  }
}

function gcj02ToBd09(coord: Coordinate): Coordinate {
  const z = Math.sqrt(coord.lng * coord.lng + coord.lat * coord.lat) + 0.00002 * Math.sin(coord.lat * xPi)
  const theta = Math.atan2(coord.lat, coord.lng) + 0.000003 * Math.cos(coord.lng * xPi)
  return {
    lng: z * Math.cos(theta) + 0.0065,
    lat: z * Math.sin(theta) + 0.006
  }
}

function bd09ToGcj02(coord: Coordinate): Coordinate {
  const x = coord.lng - 0.0065
  const y = coord.lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * xPi)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * xPi)
  return {
    lng: z * Math.cos(theta),
    lat: z * Math.sin(theta)
  }
}

function averageCoordinate(points: Coordinate[]): Coordinate {
  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length
  }
}

function simplifySection(points: TrackPoint[], start: number, end: number, toleranceMeters: number, keep: boolean[]): void {
  if (end <= start + 1) return
  let maxDistance = -1
  let maxIndex = start

  for (let i = start + 1; i < end; i += 1) {
    const distance = perpendicularDistanceMeters(points[i], points[start], points[end])
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  if (maxDistance > toleranceMeters) {
    keep[maxIndex] = true
    simplifySection(points, start, maxIndex, toleranceMeters, keep)
    simplifySection(points, maxIndex, end, toleranceMeters, keep)
  }
}

function perpendicularDistanceMeters(point: Coordinate, start: Coordinate, end: Coordinate): number {
  const meanLat = toRadians((start.lat + end.lat) / 2)
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = 111320 * Math.cos(meanLat)
  const x = (point.lng - start.lng) * metersPerDegreeLng
  const y = (point.lat - start.lat) * metersPerDegreeLat
  const endX = (end.lng - start.lng) * metersPerDegreeLng
  const endY = (end.lat - start.lat) * metersPerDegreeLat
  const lengthSquared = endX * endX + endY * endY

  if (lengthSquared === 0) return Math.sqrt(x * x + y * y)
  const t = Math.max(0, Math.min(1, (x * endX + y * endY) / lengthSquared))
  const projectionX = t * endX
  const projectionY = t * endY
  const dx = x - projectionX
  const dy = y - projectionY
  return Math.sqrt(dx * dx + dy * dy)
}

function analyzeFence(points: TrackPoint[], isInside: (point: TrackPoint) => boolean): FenceAnalysis {
  let insideCount = 0
  let outsideCount = 0
  let firstOutside: TrackPoint | undefined
  const transitions: FenceAnalysis['transitions'] = []
  let previousInside: boolean | undefined

  points.forEach((point, index) => {
    const inside = isInside(point)
    if (inside) {
      insideCount += 1
    } else {
      outsideCount += 1
      firstOutside ??= point
    }

    if (index > 0 && previousInside !== undefined && inside !== previousInside) {
      transitions.push({
        from: points[index - 1],
        to: point,
        type: inside ? 'enter' : 'exit'
      })
    }
    previousInside = inside
  })

  return { insideCount, outsideCount, transitions, firstOutside }
}

function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat
    const intersects = ((yi > point.lat) !== (yj > point.lat)) &&
      point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function parseNmeaLine(line: string, id: number): { type: string; message: string; point?: TrackPoint } | null {
  if (!line.startsWith('$')) return null
  const payload = line.split('*')[0]
  const fields = payload.split(',')
  const sentenceType = fields[0].slice(-3).toUpperCase()

  if (sentenceType === 'GGA') {
    const lat = parseNmeaCoordinate(fields[2], fields[3])
    const lng = parseNmeaCoordinate(fields[4], fields[5])
    const fixQuality = Number(fields[6] || 0)
    if (lat === undefined || lng === undefined || fixQuality <= 0) {
      return { type: fields[0], message: 'GGA 未定位或经纬度为空' }
    }
    return {
      type: fields[0],
      message: `GGA 定位，卫星数 ${fields[7] || '-'}`,
      point: {
        id,
        lat,
        lng,
        sourceLine: line,
        raw: line
      }
    }
  }

  if (sentenceType === 'RMC') {
    const status = fields[2]
    const lat = parseNmeaCoordinate(fields[3], fields[4])
    const lng = parseNmeaCoordinate(fields[5], fields[6])
    if (status !== 'A' || lat === undefined || lng === undefined) {
      return { type: fields[0], message: 'RMC 状态无效或经纬度为空' }
    }
    return {
      type: fields[0],
      message: `RMC 有效定位，航速 ${fields[7] || '-'} kn`,
      point: {
        id,
        lat,
        lng,
        timestamp: parseNmeaDateTime(fields[1], fields[9]),
        speedKmh: fields[7] ? Number(fields[7]) * 1.852 : undefined,
        sourceLine: line,
        raw: line
      }
    }
  }

  return null
}

function parseNmeaCoordinate(value: string, hemisphere: string): number | undefined {
  if (!value || !hemisphere) return undefined
  const dotIndex = value.indexOf('.')
  const degreeLength = dotIndex > 4 ? 3 : 2
  const degrees = Number(value.slice(0, degreeLength))
  const minutes = Number(value.slice(degreeLength))
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes)) return undefined
  const sign = hemisphere === 'S' || hemisphere === 'W' ? -1 : 1
  return Number((sign * (degrees + minutes / 60)).toFixed(6))
}

function parseNmeaDateTime(timeValue: string, dateValue: string): Date | undefined {
  if (!timeValue || !dateValue || dateValue.length < 6) return undefined
  const day = dateValue.slice(0, 2)
  const month = dateValue.slice(2, 4)
  const shortYear = Number(dateValue.slice(4, 6))
  const year = shortYear >= 80 ? 1900 + shortYear : 2000 + shortYear
  const hour = timeValue.slice(0, 2) || '00'
  const minute = timeValue.slice(2, 4) || '00'
  const second = timeValue.slice(4, 6) || '00'
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}
