const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export type MqttPacket =
  | { type: 'connack'; sessionPresent: boolean; returnCode: number; returnMessage: string }
  | { type: 'publish'; topic: string; payload: string; qos: number; retain: boolean; duplicate: boolean }
  | { type: 'suback'; packetId: number; grantedQos: number[] }
  | { type: 'unsuback'; packetId: number }
  | { type: 'pingresp' }
  | { type: 'puback'; packetId: number }
  | { type: 'disconnect' }
  | { type: 'unknown'; packetType: number }

export interface MqttConnectOptions {
  clientId: string
  username: string
  password: string
  cleanSession: boolean
  keepAlive: number
  protocolVersion: number
}

export interface MqttPublishOptions {
  topic: string
  payload: string
  retain: boolean
}

const connackMessages: Record<number, string> = {
  0: '连接成功',
  1: '协议版本不支持',
  2: 'Client ID 被拒绝',
  3: '服务端不可用',
  4: '用户名或密码错误',
  5: '未授权'
}

export function buildConnectPacket(options: MqttConnectOptions): ArrayBuffer {
  // 根据协议版本选择协议名称和版本号
  let protocolName = 'MQTT'
  let protocolLevel = options.protocolVersion

  // MQTT 3.1 使用 "MQIsdp" 作为协议名
  if (options.protocolVersion === 3) {
    protocolName = 'MQIsdp'
  }

  const variableHeader = concatBytes(
    encodeString(protocolName),
    Uint8Array.of(protocolLevel),
    Uint8Array.of(getConnectFlags(options)),
    encodeUint16(options.keepAlive)
  )

  const payloadParts = [encodeString(options.clientId)]
  if (options.username) {
    payloadParts.push(encodeString(options.username))
  }
  if (options.password) {
    payloadParts.push(encodeString(options.password))
  }

  return buildPacket(0x10, concatBytes(variableHeader, ...payloadParts))
}

export function buildSubscribePacket(packetId: number, topic: string): ArrayBuffer {
  const payload = concatBytes(
    encodeUint16(packetId),
    encodeString(topic),
    Uint8Array.of(0)
  )

  return buildPacket(0x82, payload)
}

export function buildUnsubscribePacket(packetId: number, topic: string): ArrayBuffer {
  const payload = concatBytes(encodeUint16(packetId), encodeString(topic))
  return buildPacket(0xa2, payload)
}

export function buildPublishPacket(options: MqttPublishOptions): ArrayBuffer {
  const fixedHeader = options.retain ? 0x31 : 0x30
  const payload = concatBytes(encodeString(options.topic), textEncoder.encode(options.payload))
  return buildPacket(fixedHeader, payload)
}

export function buildPingReqPacket(): ArrayBuffer {
  return toArrayBuffer(Uint8Array.of(0xc0, 0))
}

export function buildDisconnectPacket(): ArrayBuffer {
  return toArrayBuffer(Uint8Array.of(0xe0, 0))
}

export function decodeMqttPacket(data: ArrayBuffer): MqttPacket {
  const bytes = new Uint8Array(data)
  if (bytes.length < 2) {
    return { type: 'unknown', packetType: 0 }
  }

  const fixedHeader = bytes[0]
  const packetType = fixedHeader >> 4
  const flags = fixedHeader & 0x0f
  const { value: remainingLength, offset } = decodeRemainingLength(bytes, 1)
  const end = offset + remainingLength

  if (end > bytes.length) {
    return { type: 'unknown', packetType }
  }

  switch (packetType) {
    case 2:
      return decodeConnack(bytes, offset)
    case 3:
      return decodePublish(bytes, offset, end, flags)
    case 4:
      return { type: 'puback', packetId: readUint16(bytes, offset) }
    case 9:
      return decodeSuback(bytes, offset, end)
    case 11:
      return { type: 'unsuback', packetId: readUint16(bytes, offset) }
    case 13:
      return { type: 'pingresp' }
    case 14:
      return { type: 'disconnect' }
    default:
      return { type: 'unknown', packetType }
  }
}

function decodeConnack(bytes: Uint8Array, offset: number): MqttPacket {
  const returnCode = bytes[offset + 1] ?? 255
  return {
    type: 'connack',
    sessionPresent: (bytes[offset] & 0x01) === 1,
    returnCode,
    returnMessage: connackMessages[returnCode] ?? `未知返回码 ${returnCode}`
  }
}

function decodePublish(bytes: Uint8Array, offset: number, end: number, flags: number): MqttPacket {
  const { value: topic, offset: payloadOffset } = decodeString(bytes, offset)
  const qos = (flags >> 1) & 0x03
  const payloadStart = qos > 0 ? payloadOffset + 2 : payloadOffset
  const payload = textDecoder.decode(bytes.slice(payloadStart, end))

  return {
    type: 'publish',
    topic,
    payload,
    qos,
    retain: (flags & 0x01) === 1,
    duplicate: (flags & 0x08) === 0x08
  }
}

function decodeSuback(bytes: Uint8Array, offset: number, end: number): MqttPacket {
  return {
    type: 'suback',
    packetId: readUint16(bytes, offset),
    grantedQos: Array.from(bytes.slice(offset + 2, end))
  }
}

function getConnectFlags(options: MqttConnectOptions): number {
  let flags = options.cleanSession ? 0x02 : 0
  if (options.password) {
    flags |= 0x40
  }
  if (options.username) {
    flags |= 0x80
  }

  return flags
}

function buildPacket(fixedHeader: number, payload: Uint8Array): ArrayBuffer {
  return toArrayBuffer(concatBytes(Uint8Array.of(fixedHeader), encodeRemainingLength(payload.length), payload))
}

function encodeString(value: string): Uint8Array {
  const encoded = textEncoder.encode(value)
  return concatBytes(encodeUint16(encoded.length), encoded)
}

function decodeString(bytes: Uint8Array, offset: number): { value: string; offset: number } {
  const length = readUint16(bytes, offset)
  const start = offset + 2
  const end = start + length
  return {
    value: textDecoder.decode(bytes.slice(start, end)),
    offset: end
  }
}

function encodeUint16(value: number): Uint8Array {
  return Uint8Array.of((value >> 8) & 0xff, value & 0xff)
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) + (bytes[offset + 1] ?? 0)
}

function encodeRemainingLength(length: number): Uint8Array {
  const encoded: number[] = []
  let value = length

  do {
    let digit = value % 128
    value = Math.floor(value / 128)
    if (value > 0) {
      digit |= 0x80
    }
    encoded.push(digit)
  } while (value > 0)

  return Uint8Array.from(encoded)
}

function decodeRemainingLength(bytes: Uint8Array, offset: number): { value: number; offset: number } {
  let multiplier = 1
  let value = 0
  let currentOffset = offset
  let encodedByte = 0

  do {
    encodedByte = bytes[currentOffset] ?? 0
    value += (encodedByte & 127) * multiplier
    multiplier *= 128
    currentOffset += 1
  } while ((encodedByte & 128) !== 0 && currentOffset < bytes.length)

  return { value, offset: currentOffset }
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
