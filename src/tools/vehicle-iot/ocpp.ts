import { formatCompactDate, formatIsoUtc, todayAt } from '@/utils/demoTime'
import { parseNonEmptyInputLines } from './utils'

export type OcppVersion = '1.6' | '2.0.1'
export type OcppMessageKind = 'CALL' | 'CALLRESULT' | 'CALLERROR'
export type OcppIssueSeverity = 'error' | 'warning' | 'info'

export interface OcppIssue {
  severity: OcppIssueSeverity
  message: string
}

export interface OcppField {
  label: string
  value: string
  remark?: string
}

export interface OcppActionTemplate {
  action: string
  label: string
  direction: string
  description: string
  request: Record<string, unknown>
  response: Record<string, unknown>
  requestRequired: string[]
  responseRequired: string[]
}

export interface OcppFrame {
  order: number
  rawText: string
  valid: boolean
  messageTypeId?: number
  messageType: string
  uniqueId: string
  action?: string
  direction: string
  payloadKind: string
  payloadSummary: string
  payloadPreview: string
  fields: OcppField[]
  issues: OcppIssue[]
}

export interface BuildOcppMessageOptions {
  version: OcppVersion
  messageKind: OcppMessageKind
  action: string
  uniqueId: string
}

const createActionTemplates = (): Record<OcppVersion, OcppActionTemplate[]> => {
  const dateText = formatCompactDate()
  const sampleStartTime = formatIsoUtc(todayAt(9))
  const sampleMeterTime = formatIsoUtc(todayAt(9, 30))
  const sampleStopTime = formatIsoUtc(todayAt(10, 20))
  const transactionId = `TX-${dateText}-0001`

  return {
    '1.6': [
      {
        action: 'BootNotification',
        label: 'BootNotification 启动通知',
        direction: 'ChargePoint -> CentralSystem',
        description: '充电桩启动后上报厂商、型号和固件信息',
        requestRequired: ['chargePointVendor', 'chargePointModel'],
        responseRequired: ['status', 'currentTime', 'interval'],
        request: {
          chargePointVendor: 'ACME',
          chargePointModel: 'AC-7K',
          chargePointSerialNumber: `CP${dateText}0001`,
          firmwareVersion: '1.0.0'
        },
        response: {
          status: 'Accepted',
          currentTime: sampleStartTime,
          interval: 300
        }
      },
    {
      action: 'Heartbeat',
      label: 'Heartbeat 心跳',
      direction: 'ChargePoint -> CentralSystem',
      description: '按 BootNotification 返回间隔上报心跳',
      requestRequired: [],
      responseRequired: ['currentTime'],
      request: {},
      response: {
        currentTime: sampleStartTime
      }
    },
    {
      action: 'StatusNotification',
      label: 'StatusNotification 状态通知',
      direction: 'ChargePoint -> CentralSystem',
      description: '上报枪口可用、充电、故障等状态',
      requestRequired: ['connectorId', 'errorCode', 'status'],
      responseRequired: [],
      request: {
        connectorId: 1,
        errorCode: 'NoError',
        status: 'Available',
        timestamp: sampleStartTime
      },
      response: {}
    },
    {
      action: 'Authorize',
      label: 'Authorize 鉴权',
      direction: 'ChargePoint -> CentralSystem',
      description: '刷卡或扫码后请求平台校验 idTag',
      requestRequired: ['idTag'],
      responseRequired: ['idTagInfo'],
      request: {
        idTag: 'TEST-IDTAG-001'
      },
      response: {
        idTagInfo: {
          status: 'Accepted'
        }
      }
    },
    {
      action: 'StartTransaction',
      label: 'StartTransaction 开始交易',
      direction: 'ChargePoint -> CentralSystem',
      description: '开始充电交易，包含枪口、表底和 idTag',
      requestRequired: ['connectorId', 'idTag', 'meterStart', 'timestamp'],
      responseRequired: ['transactionId', 'idTagInfo'],
      request: {
        connectorId: 1,
        idTag: 'TEST-IDTAG-001',
        meterStart: 12500,
        timestamp: sampleStartTime
      },
      response: {
        transactionId: 10001,
        idTagInfo: {
          status: 'Accepted'
        }
      }
    },
    {
      action: 'StopTransaction',
      label: 'StopTransaction 结束交易',
      direction: 'ChargePoint -> CentralSystem',
      description: '结束充电交易，包含结束表底、时间和原因',
      requestRequired: ['meterStop', 'timestamp', 'transactionId'],
      responseRequired: [],
      request: {
        meterStop: 16880,
        timestamp: sampleStopTime,
        transactionId: 10001,
        reason: 'Local'
      },
      response: {}
    },
    {
      action: 'MeterValues',
      label: 'MeterValues 计量值',
      direction: 'ChargePoint -> CentralSystem',
      description: '周期上报交易电量、电压、电流、功率等采样值',
      requestRequired: ['connectorId', 'meterValue'],
      responseRequired: [],
      request: {
        connectorId: 1,
        transactionId: 10001,
        meterValue: [
          {
            timestamp: sampleMeterTime,
            sampledValue: [
              {
                value: '16.88',
                measurand: 'Energy.Active.Import.Register',
                unit: 'kWh'
              }
            ]
          }
        ]
      },
      response: {}
    },
    {
      action: 'RemoteStartTransaction',
      label: 'RemoteStartTransaction 远程启动',
      direction: 'CentralSystem -> ChargePoint',
      description: '平台下发远程启动充电',
      requestRequired: ['idTag'],
      responseRequired: ['status'],
      request: {
        connectorId: 1,
        idTag: 'TEST-IDTAG-001'
      },
      response: {
        status: 'Accepted'
      }
    },
    {
      action: 'RemoteStopTransaction',
      label: 'RemoteStopTransaction 远程停止',
      direction: 'CentralSystem -> ChargePoint',
      description: '平台按交易号下发远程停止充电',
      requestRequired: ['transactionId'],
      responseRequired: ['status'],
      request: {
        transactionId: 10001
      },
      response: {
        status: 'Accepted'
      }
    },
    {
      action: 'ChangeConfiguration',
      label: 'ChangeConfiguration 修改配置',
      direction: 'CentralSystem -> ChargePoint',
      description: '平台修改充电桩配置项',
      requestRequired: ['key', 'value'],
      responseRequired: ['status'],
      request: {
        key: 'HeartbeatInterval',
        value: '300'
      },
      response: {
        status: 'Accepted'
      }
    },
    {
      action: 'DataTransfer',
      label: 'DataTransfer 透传',
      direction: '双向',
      description: '厂商自定义数据透传',
      requestRequired: ['vendorId'],
      responseRequired: ['status'],
      request: {
        vendorId: 'ACME',
        messageId: 'VehicleVin',
        data: '{"vin":"LGBH52E06RY000001"}'
      },
      response: {
        status: 'Accepted'
      }
    },
    {
      action: 'Reset',
      label: 'Reset 复位',
      direction: 'CentralSystem -> ChargePoint',
      description: '平台下发软复位或硬复位',
      requestRequired: ['type'],
      responseRequired: ['status'],
      request: {
        type: 'Soft'
      },
      response: {
        status: 'Accepted'
      }
    },
    {
      action: 'TriggerMessage',
      label: 'TriggerMessage 触发上报',
      direction: 'CentralSystem -> ChargePoint',
      description: '平台要求充电桩立即上报指定消息',
      requestRequired: ['requestedMessage'],
      responseRequired: ['status'],
      request: {
        requestedMessage: 'MeterValues',
        connectorId: 1
      },
      response: {
        status: 'Accepted'
      }
    }
  ],
  '2.0.1': [
    {
      action: 'BootNotification',
      label: 'BootNotification 启动通知',
      direction: 'ChargingStation -> CSMS',
      description: '充电站启动后上报型号、厂商和启动原因',
      requestRequired: ['chargingStation.model', 'chargingStation.vendorName', 'reason'],
      responseRequired: ['currentTime', 'interval', 'status'],
      request: {
        reason: 'PowerUp',
        chargingStation: {
          model: 'DC-120K',
          vendorName: 'ACME',
          serialNumber: `CS${dateText}0001`,
          firmwareVersion: '2.0.1'
        }
      },
      response: {
        currentTime: sampleStartTime,
        interval: 300,
        status: 'Accepted'
      }
    },
    {
      action: 'Heartbeat',
      label: 'Heartbeat 心跳',
      direction: 'ChargingStation -> CSMS',
      description: '按平台返回间隔上报心跳',
      requestRequired: [],
      responseRequired: ['currentTime'],
      request: {},
      response: {
        currentTime: sampleStartTime
      }
    },
    {
      action: 'StatusNotification',
      label: 'StatusNotification 状态通知',
      direction: 'ChargingStation -> CSMS',
      description: '按 EVSE 和 Connector 维度上报状态',
      requestRequired: ['timestamp', 'connectorStatus', 'evseId', 'connectorId'],
      responseRequired: [],
      request: {
        timestamp: sampleStartTime,
        connectorStatus: 'Available',
        evseId: 1,
        connectorId: 1
      },
      response: {}
    },
    {
      action: 'Authorize',
      label: 'Authorize 鉴权',
      direction: 'ChargingStation -> CSMS',
      description: '基于 idToken 请求平台鉴权',
      requestRequired: ['idToken'],
      responseRequired: ['idTokenInfo'],
      request: {
        idToken: {
          idToken: 'TEST-IDTOKEN-001',
          type: 'ISO14443'
        }
      },
      response: {
        idTokenInfo: {
          status: 'Accepted'
        }
      }
    },
    {
      action: 'TransactionEvent',
      label: 'TransactionEvent 交易事件',
      direction: 'ChargingStation -> CSMS',
      description: '2.0.1 使用交易事件统一承载开始、更新、结束',
      requestRequired: ['eventType', 'timestamp', 'triggerReason', 'seqNo', 'transactionInfo'],
      responseRequired: [],
      request: {
        eventType: 'Started',
        timestamp: sampleStartTime,
        triggerReason: 'Authorized',
        seqNo: 1,
        transactionInfo: {
          transactionId
        },
        evse: {
          id: 1,
          connectorId: 1
        }
      },
      response: {}
    },
    {
      action: 'MeterValues',
      label: 'MeterValues 计量值',
      direction: 'ChargingStation -> CSMS',
      description: '按 EVSE 上报电能、电压、电流、功率等采样值',
      requestRequired: ['evseId', 'meterValue'],
      responseRequired: [],
      request: {
        evseId: 1,
        meterValue: [
          {
            timestamp: sampleMeterTime,
            sampledValue: [
              {
                value: 16.88,
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'kWh'
                }
              }
            ]
          }
        ]
      },
      response: {}
    },
    {
      action: 'NotifyEvent',
      label: 'NotifyEvent 事件通知',
      direction: 'ChargingStation -> CSMS',
      description: '上报组件变量事件、告警或运维事件',
      requestRequired: ['generatedAt', 'seqNo', 'eventData'],
      responseRequired: [],
      request: {
        generatedAt: sampleStartTime,
        seqNo: 1,
        eventData: [
          {
            eventId: 1001,
            timestamp: sampleStartTime,
            trigger: 'Alerting',
            actualValue: 'OverTemperature',
            eventNotificationType: 'HardWiredNotification',
            component: {
              name: 'Connector',
              evse: {
                id: 1,
                connectorId: 1
              }
            },
            variable: {
              name: 'Temperature'
            }
          }
        ]
      },
      response: {}
    },
    {
      action: 'RequestStartTransaction',
      label: 'RequestStartTransaction 请求启动',
      direction: 'CSMS -> ChargingStation',
      description: '平台请求充电站远程启动交易',
      requestRequired: ['remoteStartId', 'idToken'],
      responseRequired: ['status'],
      request: {
        remoteStartId: 10001,
        idToken: {
          idToken: 'TEST-IDTOKEN-001',
          type: 'ISO14443'
        },
        evseId: 1
      },
      response: {
        status: 'Accepted'
      }
    },
    {
      action: 'RequestStopTransaction',
      label: 'RequestStopTransaction 请求停止',
      direction: 'CSMS -> ChargingStation',
      description: '平台请求充电站远程停止交易',
      requestRequired: ['transactionId'],
      responseRequired: ['status'],
      request: {
        transactionId
      },
      response: {
        status: 'Accepted'
      }
    },
    {
      action: 'SetVariables',
      label: 'SetVariables 设置变量',
      direction: 'CSMS -> ChargingStation',
      description: '平台设置组件变量',
      requestRequired: ['setVariableData'],
      responseRequired: ['setVariableResult'],
      request: {
        setVariableData: [
          {
            attributeValue: '300',
            component: {
              name: 'HeartbeatCtrlr'
            },
            variable: {
              name: 'Interval'
            }
          }
        ]
      },
      response: {
        setVariableResult: [
          {
            attributeStatus: 'Accepted',
            component: {
              name: 'HeartbeatCtrlr'
            },
            variable: {
              name: 'Interval'
            }
          }
        ]
      }
    },
    {
      action: 'GetVariables',
      label: 'GetVariables 读取变量',
      direction: 'CSMS -> ChargingStation',
      description: '平台读取组件变量',
      requestRequired: ['getVariableData'],
      responseRequired: ['getVariableResult'],
      request: {
        getVariableData: [
          {
            component: {
              name: 'HeartbeatCtrlr'
            },
            variable: {
              name: 'Interval'
            }
          }
        ]
      },
      response: {
        getVariableResult: [
          {
            attributeStatus: 'Accepted',
            attributeValue: '300',
            component: {
              name: 'HeartbeatCtrlr'
            },
            variable: {
              name: 'Interval'
            }
          }
        ]
      }
    },
    {
      action: 'DataTransfer',
      label: 'DataTransfer 透传',
      direction: '双向',
      description: '厂商自定义数据透传',
      requestRequired: ['vendorId'],
      responseRequired: ['status'],
      request: {
        vendorId: 'ACME',
        messageId: 'VehicleVin',
        data: {
          vin: 'LGBH52E06RY000001'
        }
      },
      response: {
        status: 'Accepted'
      }
    }
    ]
  }
}

const messageTypeNames: Record<number, string> = {
  2: 'CALL',
  3: 'CALLRESULT',
  4: 'CALLERROR'
}

export function getOcppActionTemplates(version: OcppVersion): OcppActionTemplate[] {
  return createActionTemplates()[version]
}

export function buildOcppMessageText(options: BuildOcppMessageOptions): string {
  const template = findTemplate(options.version, options.action)
  if (!template) throw new Error(`未找到 ${options.version} ${options.action} 模板`)

  if (options.messageKind === 'CALL') {
    return stringifyPretty([2, options.uniqueId, options.action, clonePayload(template.request)])
  }
  if (options.messageKind === 'CALLRESULT') {
    return stringifyPretty([3, options.uniqueId, clonePayload(template.response)])
  }
  return stringifyPretty([
    4,
    options.uniqueId,
    'FormationViolation',
    `${options.action} payload failed validation`,
    {
      action: options.action,
      hint: 'Adjust errorCode/errorDescription for the real OCPP failure'
    }
  ])
}

export function parseOcppInput(input: string, version: OcppVersion): OcppFrame[] {
  const text = input.trim()
  if (!text) return []

  const parsedWhole = parseJson(text)
  if (parsedWhole.ok) {
    return expandParsedValue(parsedWhole.value, text).map((item, index) => decodeOcppFrame(item.value, index + 1, item.rawText, version))
  }

  const segments = splitTopLevelJsonValues(text)
  if (segments.length) {
    return segments.map((segment, index) => {
      const parsed = parseJson(segment)
      return parsed.ok
        ? decodeOcppFrame(parsed.value, index + 1, segment, version)
        : buildParseErrorFrame(index + 1, segment, parsed.error)
    })
  }

  return parseNonEmptyInputLines(text, (line, order) => {
    const parsed = parseJson(line)
    return parsed.ok
      ? decodeOcppFrame(parsed.value, order, line, version)
      : buildParseErrorFrame(order, line, parsed.error)
  })
}

function decodeOcppFrame(value: unknown, order: number, rawText: string, version: OcppVersion): OcppFrame {
  const issues: OcppIssue[] = []
  const fields: OcppField[] = []

  if (!Array.isArray(value)) {
    return buildInvalidFrame(order, rawText, 'OCPP-J 报文必须是 JSON 数组')
  }

  const typeId = value[0]
  if (typeof typeId !== 'number' || !messageTypeNames[typeId]) {
    issues.push({ severity: 'error', message: '第 1 个元素必须是 2、3、4 之一' })
  }

  const messageType = typeof typeId === 'number' ? (messageTypeNames[typeId] ?? `UNKNOWN(${typeId})`) : 'UNKNOWN'
  const uniqueId = typeof value[1] === 'string' ? value[1] : ''
  if (!uniqueId) issues.push({ severity: 'error', message: '第 2 个元素必须是非空 UniqueId 字符串' })

  fields.push(
    { label: '消息类型', value: messageType, remark: typeId === undefined ? '-' : String(typeId) },
    { label: 'UniqueId', value: uniqueId || '-' }
  )

  let action: string | undefined
  let payload: unknown
  let direction = '-'

  if (typeId === 2) {
    if (value.length !== 4) issues.push({ severity: 'error', message: 'CALL 报文必须是 [2, uniqueId, action, payload]' })
    action = typeof value[2] === 'string' ? value[2] : undefined
    payload = value[3]
    if (!action) issues.push({ severity: 'error', message: 'CALL 第 3 个元素必须是 Action 字符串' })
    if (!isPlainObject(payload)) issues.push({ severity: 'error', message: 'CALL 第 4 个元素必须是 Payload 对象' })
  } else if (typeId === 3) {
    if (value.length !== 3) issues.push({ severity: 'error', message: 'CALLRESULT 报文必须是 [3, uniqueId, payload]' })
    payload = value[2]
    if (!isPlainObject(payload)) issues.push({ severity: 'warning', message: 'CALLRESULT Payload 通常应为对象' })
  } else if (typeId === 4) {
    if (value.length !== 5) issues.push({ severity: 'error', message: 'CALLERROR 报文必须是 [4, uniqueId, errorCode, errorDescription, errorDetails]' })
    payload = value[4]
    validateCallError(value, issues, fields)
  } else {
    payload = value.slice(2)
  }

  const template = action ? findTemplate(version, action) : undefined
  if (action) {
    fields.push({ label: 'Action', value: action, remark: template?.description ?? '当前版本常用模板未覆盖' })
    direction = template?.direction ?? '未知'
  }

  if (typeId === 2 && action && isPlainObject(payload)) {
    validateRequiredFields(payload, template?.requestRequired ?? [], issues, '请求 Payload')
  }

  fields.push(
    { label: '方向', value: direction },
    { label: 'Payload 类型', value: payloadKind(payload) },
    { label: 'Payload 摘要', value: summarizePayload(payload) }
  )

  if (typeId === 2 && action && !template) {
    issues.push({ severity: 'warning', message: `${version} 常用 Action 列表中未包含 ${action}` })
  }

  return {
    order,
    rawText,
    valid: !issues.some(issue => issue.severity === 'error'),
    messageTypeId: typeof typeId === 'number' ? typeId : undefined,
    messageType,
    uniqueId: uniqueId || '-',
    action,
    direction,
    payloadKind: payloadKind(payload),
    payloadSummary: summarizePayload(payload),
    payloadPreview: stringifyPretty(payload),
    fields,
    issues
  }
}

function validateCallError(value: unknown[], issues: OcppIssue[], fields: OcppField[]): void {
  const errorCode = value[2]
  const errorDescription = value[3]
  const details = value[4]
  if (typeof errorCode !== 'string' || !errorCode) issues.push({ severity: 'error', message: 'CALLERROR 第 3 个元素必须是 errorCode 字符串' })
  if (typeof errorDescription !== 'string') issues.push({ severity: 'error', message: 'CALLERROR 第 4 个元素必须是 errorDescription 字符串' })
  if (!isPlainObject(details)) issues.push({ severity: 'warning', message: 'CALLERROR 第 5 个元素通常应为 errorDetails 对象' })
  fields.push(
    { label: 'ErrorCode', value: typeof errorCode === 'string' ? errorCode : '-' },
    { label: 'ErrorDescription', value: typeof errorDescription === 'string' ? errorDescription || '空字符串' : '-' }
  )
}

function validateRequiredFields(payload: Record<string, unknown>, required: string[], issues: OcppIssue[], prefix: string): void {
  required.forEach(path => {
    if (!hasPath(payload, path)) {
      issues.push({ severity: 'error', message: `${prefix} 缺少必填字段 ${path}` })
    }
  })
}

function expandParsedValue(value: unknown, rawText: string): Array<{ value: unknown; rawText: string }> {
  if (Array.isArray(value) && value.every(item => Array.isArray(item) && typeof item[0] === 'number')) {
    return value.map(item => ({ value: item, rawText: stringifyPretty(item) }))
  }
  return [{ value, rawText }]
}

function buildParseErrorFrame(order: number, rawText: string, error: string): OcppFrame {
  return buildInvalidFrame(order, rawText, `JSON 解析失败：${error}`)
}

function buildInvalidFrame(order: number, rawText: string, message: string): OcppFrame {
  return {
    order,
    rawText,
    valid: false,
    messageType: 'UNKNOWN',
    uniqueId: '-',
    direction: '-',
    payloadKind: '-',
    payloadSummary: '-',
    payloadPreview: rawText,
    fields: [],
    issues: [{ severity: 'error', message }]
  }
}

function findTemplate(version: OcppVersion, action: string): OcppActionTemplate | undefined {
  return createActionTemplates()[version].find(item => item.action === action)
}

function splitTopLevelJsonValues(input: string): string[] {
  const segments: string[] = []
  let start = -1
  let depth = 0
  let inString = false
  let escaping = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (inString) {
      if (escaping) {
        escaping = false
      } else if (char === '\\') {
        escaping = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '[' || char === '{') {
      if (depth === 0) start = index
      depth += 1
      continue
    }

    if (char === ']' || char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        segments.push(input.slice(start, index + 1))
        start = -1
      }
    }
  }

  return segments
}

function parseJson(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasPath(value: Record<string, unknown>, path: string): boolean {
  let current: unknown = value
  for (const key of path.split('.')) {
    if (!isPlainObject(current) || !(key in current)) return false
    current = current[key]
  }
  return current !== undefined && current !== null
}

function payloadKind(value: unknown): string {
  if (Array.isArray(value)) return `Array(${value.length})`
  if (isPlainObject(value)) return `Object(${Object.keys(value).length})`
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  return typeof value
}

function summarizePayload(value: unknown): string {
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    return keys.length ? keys.slice(0, 8).join(', ') : '空对象'
  }
  if (Array.isArray(value)) return `${value.length} 项数组`
  if (value === undefined) return '-'
  return String(value)
}

function clonePayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function stringifyPretty(value: unknown): string {
  if (value === undefined) return '-'
  return JSON.stringify(value, null, 2)
}
