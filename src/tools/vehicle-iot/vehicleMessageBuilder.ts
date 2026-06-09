import { buildJt808Frame, bytesToHex, dateTimeToJtTime, hexToBytes, normalizeHex, xorChecksum } from './utils'

export type TemplateFieldType = 'text' | 'number' | 'textarea' | 'select'

export interface TemplateFieldOption {
  label: string
  value: string
}

export interface TemplateField {
  key: string
  label: string
  type: TemplateFieldType
  defaultValue: string | number
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: TemplateFieldOption[]
}

export interface MessageTemplate {
  id: string
  protocol: string
  name: string
  description: string
  fields: TemplateField[]
}

export interface MessageBuildResult {
  title: string
  protocol: string
  output: string
  outputFormat: 'hex' | 'json' | 'text'
  rows: Array<{
    label: string
    value: string
    remark?: string
  }>
  warnings: string[]
}

export type TemplateValues = Record<string, string | number>

export const vehicleMessageTemplates: MessageTemplate[] = [
  {
    id: 'jt808-heartbeat',
    protocol: 'JT808',
    name: 'JT808 终端心跳',
    description: '生成 0x0002 终端心跳完整 7E 报文，自动 BCD 手机号、消息头和 BCC。',
    fields: [
      { key: 'phone', label: '终端手机号', type: 'text', defaultValue: '013912345678', placeholder: '12 位或 20 位手机号/终端号' },
      { key: 'serial', label: '流水号', type: 'number', defaultValue: 1, min: 0, max: 65535 },
      {
        key: 'version',
        label: '协议版本',
        type: 'select',
        defaultValue: '2013',
        options: [
          { label: 'JT808-2013', value: '2013' },
          { label: 'JT808-2019', value: '2019' }
        ]
      },
      { key: 'protocolVersion', label: '2019 版本号', type: 'number', defaultValue: 1, min: 0, max: 255 }
    ]
  },
  {
    id: 'jt808-location',
    protocol: 'JT808',
    name: 'JT808 位置信息汇报',
    description: '生成 0x0200 定位报文，支持经纬度、速度、方向、报警/状态位和时间。',
    fields: [
      { key: 'phone', label: '终端手机号', type: 'text', defaultValue: '013912345678' },
      { key: 'serial', label: '流水号', type: 'number', defaultValue: 1024, min: 0, max: 65535 },
      { key: 'latitude', label: '纬度', type: 'number', defaultValue: 31.230416, min: -90, max: 90, step: 0.000001 },
      { key: 'longitude', label: '经度', type: 'number', defaultValue: 121.473701, min: -180, max: 180, step: 0.000001 },
      { key: 'altitude', label: '高程 m', type: 'number', defaultValue: 12, min: 0, max: 65535 },
      { key: 'speed', label: '速度 km/h', type: 'number', defaultValue: 48.5, min: 0, max: 999.9, step: 0.1 },
      { key: 'direction', label: '方向度', type: 'number', defaultValue: 86, min: 0, max: 359 },
      { key: 'alarmHex', label: '报警标志 Hex', type: 'text', defaultValue: '00000000' },
      { key: 'statusHex', label: '状态 Hex', type: 'text', defaultValue: '00000003' },
      { key: 'time', label: '定位时间', type: 'text', defaultValue: '2026-06-09 10:30:00', placeholder: 'YYYY-MM-DD HH:mm:ss' }
    ]
  },
  {
    id: 'gb32960-login',
    protocol: 'GB/T 32960',
    name: 'GB32960 车辆登入',
    description: '生成新能源车远程服务 0x01 车辆登入报文，自动数据长度和 BCC。',
    fields: [
      { key: 'vin', label: 'VIN', type: 'text', defaultValue: 'LZZ1ABCDE12345678', placeholder: '17 位 VIN' },
      { key: 'responseFlag', label: '应答标志', type: 'select', defaultValue: 'FE', options: [
        { label: 'FE 命令', value: 'FE' },
        { label: '01 成功', value: '01' },
        { label: '02 错误', value: '02' }
      ] },
      { key: 'serial', label: '登入流水号', type: 'number', defaultValue: 88, min: 0, max: 65535 },
      { key: 'iccid', label: 'ICCID', type: 'text', defaultValue: '89860477102123456789', placeholder: '最长 20 字符' },
      { key: 'time', label: '采集时间', type: 'text', defaultValue: '2026-06-09 10:30:00', placeholder: 'YYYY-MM-DD HH:mm:ss' }
    ]
  },
  {
    id: 'ocpp-boot-notification',
    protocol: 'OCPP 1.6J',
    name: 'OCPP BootNotification',
    description: '生成 OCPP 1.6J WebSocket Call 数组，用于充电桩上线联调。',
    fields: [
      { key: 'uniqueId', label: 'UniqueId', type: 'text', defaultValue: 'boot-20260609-001' },
      { key: 'chargePointVendor', label: '厂商', type: 'text', defaultValue: 'ToolBox EV' },
      { key: 'chargePointModel', label: '型号', type: 'text', defaultValue: 'AC-22K' },
      { key: 'chargePointSerialNumber', label: '桩序列号', type: 'text', defaultValue: 'CP202606090001' },
      { key: 'firmwareVersion', label: '固件版本', type: 'text', defaultValue: '1.0.0' }
    ]
  },
  {
    id: 'gbt27930-can-frame',
    protocol: 'GB/T 27930 / CAN',
    name: 'GB/T 27930 29 位 CAN 帧',
    description: '按 J1939 规则生成 GB/T 27930 常用 29 位 CAN ID 和数据帧。',
    fields: [
      { key: 'pgnHex', label: 'PGN Hex', type: 'text', defaultValue: '2700', placeholder: '如 2700/BHM、1000/BCL' },
      { key: 'priority', label: '优先级', type: 'number', defaultValue: 6, min: 0, max: 7 },
      { key: 'sourceAddressHex', label: '源地址 Hex', type: 'text', defaultValue: 'F4', placeholder: 'F4=BMS, 56=充电机' },
      { key: 'destinationAddressHex', label: '目标地址 Hex', type: 'text', defaultValue: '56', placeholder: 'PDU1 PGN 使用' },
      { key: 'dataHex', label: '数据 Hex', type: 'textarea', defaultValue: '10 27 FF FF FF FF FF FF', placeholder: '最多 8 字节，或多包传输片段' }
    ]
  }
]

export function getDefaultTemplateValues(template: MessageTemplate): TemplateValues {
  return Object.fromEntries(template.fields.map(field => [field.key, field.defaultValue]))
}

export function buildVehicleMessage(templateId: string, values: TemplateValues): MessageBuildResult {
  if (templateId === 'jt808-heartbeat') return buildJt808Heartbeat(values)
  if (templateId === 'jt808-location') return buildJt808Location(values)
  if (templateId === 'gb32960-login') return buildGb32960Login(values)
  if (templateId === 'ocpp-boot-notification') return buildOcppBootNotification(values)
  if (templateId === 'gbt27930-can-frame') return buildGbt27930CanFrame(values)
  throw new Error('未知报文模板')
}

function buildJt808Heartbeat(values: TemplateValues): MessageBuildResult {
  const version = asString(values.version) === '2019' ? '2019' : '2013'
  const output = buildJt808Frame({
    msgIdHex: '0002',
    phone: asString(values.phone),
    msgSerialNo: asNumber(values.serial),
    bodyHex: '',
    version,
    protocolVersion: asNumber(values.protocolVersion)
  })

  return {
    title: 'JT808 终端心跳',
    protocol: 'JT808',
    output,
    outputFormat: 'hex',
    rows: [
      { label: '消息 ID', value: '0x0002', remark: '终端心跳' },
      { label: '终端手机号', value: asString(values.phone) },
      { label: '流水号', value: String(asNumber(values.serial)) },
      { label: '协议版本', value: version }
    ],
    warnings: []
  }
}

function buildJt808Location(values: TemplateValues): MessageBuildResult {
  const latitude = asNumber(values.latitude)
  const longitude = asNumber(values.longitude)
  const alarm = parseHexNumber(asString(values.alarmHex), 4)
  const statusBase = parseHexNumber(asString(values.statusHex), 4)
  const status = statusBase | (latitude < 0 ? 0x04 : 0) | (longitude < 0 ? 0x08 : 0)
  const body = [
    ...u32be(alarm),
    ...u32be(status),
    ...u32be(Math.round(Math.abs(latitude) * 1_000_000)),
    ...u32be(Math.round(Math.abs(longitude) * 1_000_000)),
    ...u16be(asNumber(values.altitude)),
    ...u16be(Math.round(asNumber(values.speed) * 10)),
    ...u16be(asNumber(values.direction)),
    ...hexToBytes(dateTimeToJtTime(parseDateTime(asString(values.time))))
  ]
  const output = buildJt808Frame({
    msgIdHex: '0200',
    phone: asString(values.phone),
    msgSerialNo: asNumber(values.serial),
    bodyHex: bytesToHex(body),
    version: '2013',
    protocolVersion: 1
  })

  return {
    title: 'JT808 位置信息汇报',
    protocol: 'JT808',
    output,
    outputFormat: 'hex',
    rows: [
      { label: '消息 ID', value: '0x0200', remark: '位置信息汇报' },
      { label: '经纬度', value: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` },
      { label: '速度/方向', value: `${asNumber(values.speed).toFixed(1)} km/h / ${asNumber(values.direction)} 度` },
      { label: '状态', value: `0x${status.toString(16).padStart(8, '0').toUpperCase()}` },
      { label: '消息体', value: bytesToHex(body) }
    ],
    warnings: []
  }
}

function buildGb32960Login(values: TemplateValues): MessageBuildResult {
  const command = 0x01
  const responseFlag = parseHexNumber(asString(values.responseFlag), 1)
  const vinBytes = fixedAscii(asString(values.vin), 17)
  const data = [
    ...hexToBytes(dateTimeToJtTime(parseDateTime(asString(values.time)))),
    ...u16be(asNumber(values.serial)),
    ...fixedAscii(asString(values.iccid), 20),
    0x01,
    0x00
  ]
  const body = [command, responseFlag, ...vinBytes, 0x01, ...u16be(data.length), ...data]
  const bcc = xorChecksum(body)
  const output = bytesToHex([0x23, 0x23, ...body, bcc])

  return {
    title: 'GB32960 车辆登入',
    protocol: 'GB/T 32960',
    output,
    outputFormat: 'hex',
    rows: [
      { label: '命令标识', value: '0x01', remark: '车辆登入' },
      { label: '应答标志', value: `0x${byteHex(responseFlag)}` },
      { label: 'VIN', value: asciiFromBytes(vinBytes) },
      { label: '数据单元长度', value: `${data.length} 字节` },
      { label: 'BCC', value: `0x${byteHex(bcc)}` }
    ],
    warnings: asString(values.vin).length !== 17 ? ['VIN 会按 17 字节截断或补空格'] : []
  }
}

function buildOcppBootNotification(values: TemplateValues): MessageBuildResult {
  const message = [
    2,
    asString(values.uniqueId),
    'BootNotification',
    {
      chargePointVendor: asString(values.chargePointVendor),
      chargePointModel: asString(values.chargePointModel),
      chargePointSerialNumber: asString(values.chargePointSerialNumber),
      firmwareVersion: asString(values.firmwareVersion)
    }
  ]
  const output = JSON.stringify(message, null, 2)

  return {
    title: 'OCPP BootNotification',
    protocol: 'OCPP 1.6J',
    output,
    outputFormat: 'json',
    rows: [
      { label: 'MessageTypeId', value: '2', remark: 'Call' },
      { label: 'Action', value: 'BootNotification' },
      { label: 'UniqueId', value: asString(values.uniqueId) },
      { label: '桩型号', value: `${asString(values.chargePointVendor)} / ${asString(values.chargePointModel)}` }
    ],
    warnings: []
  }
}

function buildGbt27930CanFrame(values: TemplateValues): MessageBuildResult {
  const pgn = parseHexNumber(asString(values.pgnHex), 3)
  const priority = asNumber(values.priority) & 0x07
  const sourceAddress = parseHexNumber(asString(values.sourceAddressHex), 1)
  const destinationAddress = parseHexNumber(asString(values.destinationAddressHex), 1)
  const canId = buildJ1939CanId(priority, pgn, sourceAddress, destinationAddress)
  const data = hexToBytes(asString(values.dataHex)).slice(0, 8)
  const output = `${canId.toString(16).toUpperCase().padStart(8, '0')}#${bytesToHex(data, '')}`
  const pduFormat = (pgn >> 8) & 0xff

  return {
    title: 'GB/T 27930 29 位 CAN 帧',
    protocol: 'GB/T 27930 / CAN',
    output,
    outputFormat: 'text',
    rows: [
      { label: 'CAN ID', value: `0x${canId.toString(16).toUpperCase().padStart(8, '0')}` },
      { label: 'PGN', value: `0x${pgn.toString(16).toUpperCase().padStart(4, '0')}` },
      { label: '源地址', value: `0x${byteHex(sourceAddress)}`, remark: roleName(sourceAddress) },
      { label: '目标地址', value: pduFormat < 240 ? `0x${byteHex(destinationAddress)}` : '广播/组扩展', remark: pduFormat < 240 ? roleName(destinationAddress) : undefined },
      { label: '数据', value: bytesToHex(data) || '空' }
    ],
    warnings: hexToBytes(asString(values.dataHex)).length > 8 ? ['单帧 CAN 数据已截断为 8 字节'] : []
  }
}

function buildJ1939CanId(priority: number, pgn: number, sourceAddress: number, destinationAddress: number): number {
  const pduFormat = (pgn >> 8) & 0xff
  const dataPage = (pgn >> 16) & 0x01
  if (pduFormat < 240) {
    return ((priority & 0x07) << 26) | (dataPage << 24) | (pduFormat << 16) | ((destinationAddress & 0xff) << 8) | (sourceAddress & 0xff)
  }
  return ((priority & 0x07) << 26) | ((pgn & 0x3ffff) << 8) | (sourceAddress & 0xff)
}

function asString(value: string | number | undefined): string {
  return value === undefined ? '' : String(value)
}

function asNumber(value: string | number | undefined): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    throw new Error('存在无效数字字段')
  }
  return numberValue
}

function parseHexNumber(value: string, byteLength: number): number {
  const hex = normalizeHex(value)
  if (!hex) return 0
  if (hex.length > byteLength * 2) {
    throw new Error(`Hex 字段不能超过 ${byteLength} 字节`)
  }
  return parseInt(hex, 16)
}

function parseDateTime(value: string): Date {
  const normalized = value.trim().replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    throw new Error('时间格式无效，请使用 YYYY-MM-DD HH:mm:ss')
  }
  return date
}

function fixedAscii(value: string, length: number): number[] {
  const bytes = [...new TextEncoder().encode(value)].slice(0, length)
  while (bytes.length < length) bytes.push(0x20)
  return bytes
}

function asciiFromBytes(bytes: number[]): string {
  return new TextDecoder().decode(new Uint8Array(bytes)).trimEnd()
}

function u16be(value: number): number[] {
  const normalized = Math.max(0, Math.min(0xffff, Math.round(value)))
  return [(normalized >> 8) & 0xff, normalized & 0xff]
}

function u32be(value: number): number[] {
  const normalized = Math.max(0, Math.min(0xffffffff, Math.round(value)))
  return [
    Math.floor(normalized / 0x1000000) & 0xff,
    (normalized >> 16) & 0xff,
    (normalized >> 8) & 0xff,
    normalized & 0xff
  ]
}

function byteHex(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase()
}

function roleName(address: number): string {
  if (address === 0x56) return '充电机'
  if (address === 0xf4) return 'BMS'
  return ''
}
