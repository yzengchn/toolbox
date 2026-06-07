import { bytesToHex, hexToBytes, parseNonEmptyInputLines } from './utils'

export interface DiagnosticField {
  label: string
  value: string
  remark?: string
}

export interface DiagnosticDtc {
  code: string
  system: string
  type: string
  description: string
}

export interface DiagnosticPidValue {
  pid: string
  name: string
  value: string
  raw: string
}

export interface DiagnosticUdsInfo {
  sid: string
  service: string
  positive: boolean
  requestSid?: string
  nrc?: string
  nrcName?: string
  did?: string
}

export interface IsoTpInfo {
  type: string
  length?: number
  sequence?: number
  payloadHex: string
}

export interface DiagnosticParseResult {
  order: number
  rawLine: string
  canId?: string
  bytesHex: string
  payloadHex: string
  isoTp?: IsoTpInfo
  protocol: string
  fields: DiagnosticField[]
  dtcs: DiagnosticDtc[]
  pids: DiagnosticPidValue[]
  uds?: DiagnosticUdsInfo
  error?: string
}

const obdModeNames: Record<number, string> = {
  0x01: '当前动力系统诊断数据',
  0x02: '冻结帧数据',
  0x03: '存储故障码',
  0x04: '清除故障码和冻结帧',
  0x05: '氧传感器监测',
  0x06: '车载监测测试结果',
  0x07: '待决故障码',
  0x08: '控制车载系统',
  0x09: '车辆信息',
  0x0a: '永久故障码'
}

const udsServiceNames: Record<number, string> = {
  0x10: 'DiagnosticSessionControl',
  0x11: 'ECUReset',
  0x14: 'ClearDiagnosticInformation',
  0x19: 'ReadDTCInformation',
  0x22: 'ReadDataByIdentifier',
  0x27: 'SecurityAccess',
  0x28: 'CommunicationControl',
  0x2e: 'WriteDataByIdentifier',
  0x31: 'RoutineControl',
  0x34: 'RequestDownload',
  0x36: 'TransferData',
  0x37: 'RequestTransferExit',
  0x3e: 'TesterPresent',
  0x85: 'ControlDTCSetting'
}

const udsNegativeResponseNames: Record<number, string> = {
  0x10: 'GeneralReject',
  0x11: 'ServiceNotSupported',
  0x12: 'SubFunctionNotSupported',
  0x13: 'IncorrectMessageLengthOrInvalidFormat',
  0x22: 'ConditionsNotCorrect',
  0x24: 'RequestSequenceError',
  0x31: 'RequestOutOfRange',
  0x33: 'SecurityAccessDenied',
  0x35: 'InvalidKey',
  0x36: 'ExceededNumberOfAttempts',
  0x37: 'RequiredTimeDelayNotExpired',
  0x78: 'RequestCorrectlyReceivedResponsePending',
  0x7e: 'SubFunctionNotSupportedInActiveSession',
  0x7f: 'ServiceNotSupportedInActiveSession',
  0x81: 'RpmTooHigh',
  0x82: 'RpmTooLow',
  0x83: 'EngineIsRunning',
  0x84: 'EngineIsNotRunning',
  0x85: 'EngineRunTimeTooLow',
  0x92: 'VoltageTooHigh',
  0x93: 'VoltageTooLow'
}

const dtcDescriptions: Record<string, string> = {
  P0100: '空气流量计/空气流量传感器电路故障',
  P0101: '空气流量计/空气流量传感器范围/性能问题',
  P0113: '进气温度传感器电路高输入',
  P0171: '系统过稀 Bank 1',
  P0172: '系统过浓 Bank 1',
  P0300: '随机/多缸失火',
  P0301: '第 1 缸失火',
  P0302: '第 2 缸失火',
  P0303: '第 3 缸失火',
  P0304: '第 4 缸失火',
  P0420: '催化系统效率低于阈值 Bank 1',
  P0442: '蒸发排放系统小泄漏',
  P0455: '蒸发排放系统大泄漏',
  P0500: '车速传感器故障',
  P0562: '系统电压过低',
  P0700: '变速箱控制系统故障请求'
}

export function parseDiagnosticInput(input: string): DiagnosticParseResult[] {
  return parseNonEmptyInputLines(input, parseDiagnosticLine)
}

function parseDiagnosticLine(line: string, order: number): DiagnosticParseResult {
  const textDtcs = parseTextDtcs(line)
  if (textDtcs.length) {
    return {
      order,
      rawLine: line,
      bytesHex: '',
      payloadHex: '',
      protocol: 'DTC 文本',
      fields: [{ label: '识别到故障码', value: String(textDtcs.length) }],
      dtcs: textDtcs,
      pids: []
    }
  }

  try {
    const extracted = extractDiagnosticBytes(line)
    const isoTp = parseIsoTp(extracted.bytes)
    const payload = isoTp ? hexToBytes(isoTp.payloadHex) : extracted.bytes
    const decoded = decodeDiagnosticPayload(payload)
    return {
      order,
      rawLine: line,
      canId: extracted.canId,
      bytesHex: bytesToHex(extracted.bytes),
      payloadHex: bytesToHex(payload),
      isoTp,
      ...decoded
    }
  } catch (err) {
    return {
      order,
      rawLine: line,
      bytesHex: '',
      payloadHex: '',
      protocol: '未识别',
      fields: [],
      dtcs: [],
      pids: [],
      error: (err as Error).message
    }
  }
}

function decodeDiagnosticPayload(payload: number[]): Pick<DiagnosticParseResult, 'protocol' | 'fields' | 'dtcs' | 'pids' | 'uds'> {
  if (!payload.length) {
    return {
      protocol: '空载荷',
      fields: [{ label: '载荷', value: '空' }],
      dtcs: [],
      pids: []
    }
  }

  const sid = payload[0]
  if (sid === 0x7f) return decodeUdsNegative(payload)
  if (sid >= 0x40 && sid <= 0x4a) return decodeObdPositive(payload)
  if (sid in udsServiceNames || (sid >= 0x50 && (sid - 0x40) in udsServiceNames)) return decodeUdsPayload(payload)

  return {
    protocol: '未知诊断载荷',
    fields: [
      { label: '服务/模式字节', value: `0x${byteHex(sid)}` },
      { label: '载荷 Hex', value: bytesToHex(payload) }
    ],
    dtcs: [],
    pids: []
  }
}

function decodeObdPositive(payload: number[]): Pick<DiagnosticParseResult, 'protocol' | 'fields' | 'dtcs' | 'pids'> {
  const responseSid = payload[0]
  const mode = responseSid - 0x40
  const fields: DiagnosticField[] = [
    { label: 'OBD 响应模式', value: `0x${byteHex(responseSid)}`, remark: `Mode ${mode.toString(16).padStart(2, '0').toUpperCase()} ${obdModeNames[mode] ?? '未知模式'}` }
  ]

  if (mode === 0x01 || mode === 0x02) {
    const pid = payload[1]
    const decodedPid = decodePid(pid, payload.slice(2))
    return {
      protocol: `OBD-II Mode ${byteHex(mode)}`,
      fields: [...fields, { label: 'PID', value: `0x${byteHex(pid)}`, remark: decodedPid?.name ?? '未知 PID' }],
      dtcs: [],
      pids: decodedPid ? [decodedPid] : []
    }
  }

  if (mode === 0x03 || mode === 0x07 || mode === 0x0a) {
    const dtcs = decodeDtcBytes(payload.slice(1))
    return {
      protocol: `OBD-II Mode ${byteHex(mode)}`,
      fields: [...fields, { label: '故障码数量', value: String(dtcs.length) }],
      dtcs,
      pids: []
    }
  }

  if (mode === 0x09) {
    const pid = payload[1]
    const ascii = asciiFromBytes(payload.slice(2)).replace(/^\d+/, '')
    return {
      protocol: 'OBD-II Mode 09',
      fields: [
        ...fields,
        { label: '信息 PID', value: `0x${byteHex(pid)}` },
        { label: '车辆信息', value: ascii || bytesToHex(payload.slice(2)), remark: pid === 0x02 ? 'VIN 片段' : undefined }
      ],
      dtcs: [],
      pids: []
    }
  }

  return {
    protocol: `OBD-II Mode ${byteHex(mode)}`,
    fields: [...fields, { label: '载荷 Hex', value: bytesToHex(payload.slice(1)) }],
    dtcs: [],
    pids: []
  }
}

function decodeUdsNegative(payload: number[]): Pick<DiagnosticParseResult, 'protocol' | 'fields' | 'dtcs' | 'pids' | 'uds'> {
  const requestSid = payload[1]
  const nrc = payload[2]
  const uds: DiagnosticUdsInfo = {
    sid: '7F',
    service: 'NegativeResponse',
    positive: false,
    requestSid: byteHex(requestSid),
    nrc: byteHex(nrc),
    nrcName: udsNegativeResponseNames[nrc] ?? 'Unknown NRC'
  }
  return {
    protocol: 'UDS 负响应',
    fields: [
      { label: '请求服务', value: `0x${byteHex(requestSid)}`, remark: udsServiceNames[requestSid] ?? '未知服务' },
      { label: 'NRC', value: `0x${byteHex(nrc)}`, remark: uds.nrcName }
    ],
    dtcs: [],
    pids: [],
    uds
  }
}

function decodeUdsPayload(payload: number[]): Pick<DiagnosticParseResult, 'protocol' | 'fields' | 'dtcs' | 'pids' | 'uds'> {
  const sid = payload[0]
  const positiveRequestSid = sid >= 0x50 ? sid - 0x40 : sid
  const positive = sid >= 0x50
  const service = udsServiceNames[positiveRequestSid] ?? '未知 UDS 服务'
  const fields: DiagnosticField[] = [
    { label: positive ? '正响应 SID' : '请求 SID', value: `0x${byteHex(sid)}`, remark: service }
  ]
  const uds: DiagnosticUdsInfo = {
    sid: byteHex(sid),
    requestSid: positive ? byteHex(positiveRequestSid) : undefined,
    service,
    positive
  }

  if ((positiveRequestSid === 0x22 || positiveRequestSid === 0x2e) && payload.length >= 3) {
    const did = `${byteHex(payload[1])}${byteHex(payload[2])}`
    fields.push({ label: 'DID', value: `0x${did}` })
    if (payload.length > 3) {
      fields.push({ label: 'DID 数据 Hex', value: bytesToHex(payload.slice(3)) })
      fields.push({ label: 'DID 数据 ASCII', value: asciiFromBytes(payload.slice(3)) || '-' })
    }
    uds.did = did
  } else if (positiveRequestSid === 0x19 && payload.length > 2) {
    fields.push({ label: 'DTC 子功能', value: `0x${byteHex(payload[1])}` })
    fields.push({ label: '响应数据 Hex', value: bytesToHex(payload.slice(2)) })
  } else {
    fields.push({ label: '服务数据 Hex', value: payload.length > 1 ? bytesToHex(payload.slice(1)) : '空' })
  }

  return {
    protocol: positive ? 'UDS 正响应' : 'UDS 请求',
    fields,
    dtcs: [],
    pids: [],
    uds
  }
}

function decodePid(pid: number, data: number[]): DiagnosticPidValue | undefined {
  const pidHex = byteHex(pid)
  const raw = bytesToHex(data)
  const word = (data[0] ?? 0) * 256 + (data[1] ?? 0)
  const percent = (value: number) => `${(value * 100 / 255).toFixed(1)} %`
  const temperature = (value: number) => `${value - 40} °C`
  const make = (name: string, value: string): DiagnosticPidValue => ({ pid: pidHex, name, value, raw })

  switch (pid) {
    case 0x04:
      return make('计算负荷值', percent(data[0] ?? 0))
    case 0x05:
      return make('发动机冷却液温度', temperature(data[0] ?? 0))
    case 0x0a:
      return make('燃油压力', `${(data[0] ?? 0) * 3} kPa`)
    case 0x0b:
      return make('进气歧管绝对压力', `${data[0] ?? 0} kPa`)
    case 0x0c:
      return make('发动机转速', `${(word / 4).toFixed(0)} rpm`)
    case 0x0d:
      return make('车速', `${data[0] ?? 0} km/h`)
    case 0x0e:
      return make('点火提前角', `${((data[0] ?? 0) / 2 - 64).toFixed(1)} °`)
    case 0x0f:
      return make('进气温度', temperature(data[0] ?? 0))
    case 0x10:
      return make('空气流量', `${(word / 100).toFixed(2)} g/s`)
    case 0x11:
      return make('节气门位置', percent(data[0] ?? 0))
    case 0x1f:
      return make('发动机启动后运行时间', `${word} s`)
    case 0x2f:
      return make('燃油液位', percent(data[0] ?? 0))
    case 0x46:
      return make('环境空气温度', temperature(data[0] ?? 0))
    case 0x5c:
      return make('发动机机油温度', temperature(data[0] ?? 0))
    default:
      return undefined
  }
}

function decodeDtcBytes(bytes: number[]): DiagnosticDtc[] {
  const dtcs: DiagnosticDtc[] = []
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const first = bytes[index]
    const second = bytes[index + 1]
    if (first === 0 && second === 0) continue
    dtcs.push(enrichDtc(formatDtc(first, second)))
  }
  return dtcs
}

function parseTextDtcs(line: string): DiagnosticDtc[] {
  const matches = line.toUpperCase().match(/\b[PCBU][0-3][0-9A-F]{3}\b/g)
  if (!matches) return []
  return Array.from(new Set(matches)).map(enrichDtc)
}

function formatDtc(first: number, second: number): string {
  const systems = ['P', 'C', 'B', 'U']
  const system = systems[(first >> 6) & 0x03]
  const firstDigit = (first >> 4) & 0x03
  const rest = (((first & 0x0f) << 8) | second).toString(16).toUpperCase().padStart(3, '0')
  return `${system}${firstDigit}${rest}`
}

function enrichDtc(code: string): DiagnosticDtc {
  const systemMap: Record<string, string> = {
    P: '动力系统 Powertrain',
    C: '底盘 Chassis',
    B: '车身 Body',
    U: '网络通信 Network'
  }
  const typeMap: Record<string, string> = {
    '0': 'SAE 通用码',
    '1': '厂商自定义码',
    '2': 'SAE/厂商扩展码',
    '3': 'SAE/厂商扩展码'
  }
  return {
    code,
    system: systemMap[code[0]] ?? '未知系统',
    type: typeMap[code[1]] ?? '未知类型',
    description: dtcDescriptions[code] ?? '未内置描述，可结合车型维修手册确认'
  }
}

function extractDiagnosticBytes(line: string): { canId?: string; bytes: number[] } {
  const hashIndex = line.indexOf('#')
  if (hashIndex >= 0) {
    const before = line.slice(0, hashIndex)
    const idMatch = before.match(/([0-9A-Fa-f]{3,8})\s*$/)
    return { canId: idMatch?.[1].toUpperCase(), bytes: hexToBytes(line.slice(hashIndex + 1)) }
  }

  const tokens: string[] = line.match(/[0-9A-Fa-f]{2,8}/g) ?? []
  if (!tokens.length) throw new Error('未找到 Hex 字节')

  let canId: string | undefined
  let byteTokens = tokens
  const first = tokens[0]
  if (first && (first.length === 3 || first.length === 8) && tokens.length > 1) {
    canId = first.toUpperCase()
    byteTokens = tokens.slice(1)
  }
  if (byteTokens.length > 1 && byteTokens[0]?.length === 1) {
    byteTokens = byteTokens.slice(1)
  }

  return { canId, bytes: hexToBytes(byteTokens.join('')) }
}

function parseIsoTp(bytes: number[]): IsoTpInfo | undefined {
  if (!bytes.length) return undefined
  const pciType = bytes[0] >> 4
  if (pciType === 0 && bytes.length >= 2) {
    const length = bytes[0] & 0x0f
    if (length > 0 && length <= 7 && bytes.length >= length + 1) {
      return {
        type: '单帧 Single Frame',
        length,
        payloadHex: bytesToHex(bytes.slice(1, 1 + length))
      }
    }
  }
  if (pciType === 1 && bytes.length >= 2) {
    const length = ((bytes[0] & 0x0f) << 8) | bytes[1]
    return {
      type: '首帧 First Frame',
      length,
      payloadHex: bytesToHex(bytes.slice(2))
    }
  }
  if (pciType === 2) {
    return {
      type: '连续帧 Consecutive Frame',
      sequence: bytes[0] & 0x0f,
      payloadHex: bytesToHex(bytes.slice(1))
    }
  }
  if (pciType === 3) {
    return {
      type: '流控帧 Flow Control',
      payloadHex: bytesToHex(bytes.slice(1))
    }
  }
  return undefined
}

function byteHex(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0')
}

function asciiFromBytes(bytes: number[]): string {
  return bytes
    .filter(byte => byte !== 0)
    .map(byte => (byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'))
    .join('')
    .trim()
}
