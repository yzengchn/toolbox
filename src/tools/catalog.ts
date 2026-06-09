import type { ToolCategory, ToolCategoryInfo, ToolInfo } from '@/types'

export const allTools: ToolInfo[] = [
  {
    id: 'base64-encoder',
    name: 'Base64 编码/解码',
    description: '支持 Hex、Base64、Base64URL、Base58、Base58Check、Bech32 的编码、解码和校验',
    icon: 'mdi:form-textbox-password',
    category: 'encoding',
    keywords: ['hex', 'base16', 'base64', 'base64url', 'base58', 'base58check', 'bech32', 'encode', 'decode', '编码', '解码', 'url safe'],
    path: '/tool/base64-encoder'
  },
  {
    id: 'base64-image',
    name: 'Base64 图片',
    description: '图片与 Base64 字符串互转，支持拖拽上传',
    icon: 'mdi:image-outline',
    category: 'encoding',
    keywords: ['base64', 'image', '图片', '编码', '解码', 'dataurl'],
    path: '/tool/base64-image'
  },
  {
    id: 'color-converter',
    name: '颜色转换器',
    description: '在不同颜色格式之间转换 (HEX, RGB, HSL)',
    icon: 'mdi:palette',
    category: 'encoding',
    keywords: ['color', 'hex', 'rgb', 'hsl', '颜色', '转换'],
    path: '/tool/color-converter'
  },
  {
    id: 'jwt-decoder',
    name: 'JWT 解码',
    description: '解析 JWT 的 Header、Payload、Signature 与过期状态',
    icon: 'mdi:key-chain-variant',
    category: 'encoding',
    keywords: ['jwt', 'token', 'decode', '解析', '鉴权', 'payload'],
    path: '/tool/jwt-decoder'
  },
  {
    id: 'encryption-tool',
    name: 'RSA、AES加解密',
    description: 'RSA、AES、DES、MD5/SHA、HMAC 常用加密解密和摘要计算',
    icon: 'mdi:shield-key-outline',
    category: 'encoding',
    keywords: ['rsa', 'aes', 'des', '3des', 'tripledes', 'md5', 'sha1', 'sha256', 'sha512', 'hmac', 'encrypt', 'decrypt', '加密', '解密', '摘要'],
    path: '/tool/encryption-tool'
  },
  {
    id: 'hash-calculator',
    name: '哈希计算',
    description: '计算文本或文件的 MD5、SHA1、SHA256、SHA512',
    icon: 'mdi:hash',
    category: 'encoding',
    keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha512', '哈希', '摘要'],
    path: '/tool/hash-calculator'
  },
  {
    id: 'subnet-calculator',
    name: 'CIDR 网段计算器',
    description: '计算 IPv4 CIDR 网段的网络地址、广播地址、可用主机数等信息',
    icon: 'mdi:calculator',
    category: 'network',
    keywords: ['subnet', 'cidr', 'CIDR 网段计算器', 'CIDR计算器', '网段计算', '子网', '子网计算器', '计算器', 'ip', '网络'],
    path: '/tool/subnet-calculator'
  },
  {
    id: 'port-scanner',
    name: '端口扫描工具',
    description: '批量探测目标主机的 HTTP/HTTPS 端口可访问性',
    icon: 'mdi:radar',
    category: 'network',
    keywords: ['port', 'scan', 'scanner', '端口', '扫描', '探测', 'http', 'https'],
    path: '/tool/port-scanner'
  },
  {
    id: 'url-encoder',
    name: 'URL 编码/解码',
    description: '对 URL 进行编码和解码操作',
    icon: 'mdi:link-variant',
    category: 'network',
    keywords: ['url', 'encode', 'decode', '编码', '解码', 'uri'],
    path: '/tool/url-encoder'
  },
  {
    id: 'user-agent-parser',
    name: 'User-Agent 解析器',
    description: '解析浏览器、系统、设备、渲染引擎和爬虫标识',
    icon: 'mdi:account-search-outline',
    category: 'network',
    keywords: ['user-agent', 'ua', '浏览器', '系统', '设备', '爬虫', 'webview'],
    path: '/tool/user-agent-parser'
  },
  {
    id: 'http-status',
    name: 'HTTP 状态码查询',
    description: '查询 HTTP 状态码的含义和说明',
    icon: 'mdi:web',
    category: 'network',
    keywords: ['http', 'status', 'code', '状态码', '查询'],
    path: '/tool/http-status'
  },
  {
    id: 'password-generator',
    name: '密码生成器',
    description: '生成安全的随机密码',
    icon: 'mdi:key',
    category: 'utilities',
    keywords: ['password', 'generator', '密码', '生成器', '随机', '安全'],
    path: '/tool/password-generator'
  },
  {
    id: 'regex-tester',
    name: '正则表达式',
    description: '测试 JavaScript 正则表达式，查看匹配分组并执行文本替换',
    icon: 'mdi:regex',
    category: 'utilities',
    keywords: ['regex', 'regexp', 'regular expression', '正则', '正则表达式', '匹配', '分组', '替换', '测试', '中文字符', '空白行', 'Email', 'URL', '电话号码', 'QQ号', '邮政编码', '身份证号', '日期'],
    path: '/tool/regex-tester'
  },
  {
    id: 'uuid-generator',
    name: 'UUID 生成器',
    description: '生成 UUID (通用唯一识别码)',
    icon: 'mdi:identifier',
    category: 'utilities',
    keywords: ['uuid', 'guid', '生成器', '唯一', 'id'],
    path: '/tool/uuid-generator'
  },
  {
    id: 'qrcode-generator',
    name: '二维码生成器',
    description: '生成二维码图片',
    icon: 'mdi:qrcode',
    category: 'utilities',
    keywords: ['qrcode', 'qr', '二维码', '生成器', 'barcode'],
    path: '/tool/qrcode-generator'
  },
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    description: '格式化、压缩和验证 JSON 数据',
    icon: 'mdi:code-json',
    category: 'formatter',
    keywords: ['json', 'format', '格式化', '压缩', '验证'],
    path: '/tool/json-formatter'
  },
  {
    id: 'sql-formatter',
    name: 'SQL 格式化',
    description: '格式化 SQL 查询语句',
    icon: 'mdi:database',
    category: 'formatter',
    keywords: ['sql', 'format', '格式化', 'mysql', 'postgresql'],
    path: '/tool/sql-formatter'
  },
  {
    id: 'xml-formatter',
    name: 'XML/HTML 格式化',
    description: '格式化 XML 和 HTML 代码',
    icon: 'mdi:xml',
    category: 'formatter',
    keywords: ['xml', 'html', 'format', '格式化', '压缩'],
    path: '/tool/xml-formatter'
  },
  {
    id: 'timestamp-converter',
    name: '时间戳转换',
    description: '在时间戳、本地时间、UTC 和 ISO 8601 之间快速转换',
    icon: 'mdi:clock-time-four-outline',
    category: 'time',
    keywords: ['timestamp', 'time', 'date', '时间戳', '时间', '日期', 'unix'],
    path: '/tool/timestamp-converter'
  },
  {
    id: 'cron-parser',
    name: 'Cron 表达式解析',
    description: '校验 Cron 表达式并查看标准化结果与下一次执行时间',
    icon: 'mdi:calendar-clock-outline',
    category: 'time',
    keywords: ['cron', 'schedule', 'parser', '解析', '定时', '计划任务'],
    path: '/tool/cron-parser'
  },
  {
    id: 'jt808-jt809-parser',
    name: 'JT808/JT809 解析',
    description: 'JT808 与 JT809 报文解析、基础组包、Hex 转换和常用字段换算',
    icon: 'mdi:car-connected',
    category: 'vehicle-iot',
    keywords: ['jt808', 'jt809', 'jt1078', 'jt905', 'hex', '车联网', '报文', '组包', '解析'],
    path: '/tool/jt808-jt809-parser'
  },
  {
    id: 'jt1078-stream-parser',
    name: 'JT1078 音视频流解析',
    description: 'JT1078 RTP 包头、SIM/通道、音视频帧类型、分包状态和 H264/H265 NALU 解析',
    icon: 'mdi:video-wireless-outline',
    category: 'vehicle-iot',
    keywords: ['jt1078', 'rtp', 'h264', 'h265', '音视频', '视频', '流媒体', 'nalu', '车联网', '报文解析'],
    path: '/tool/jt1078-stream-parser'
  },
  {
    id: 'gb32960-parser',
    name: 'GB/T 32960 解析',
    description: '新能源车远程服务通信报文解析，支持头部、校验、实时信息和常见数据块拆解',
    icon: 'mdi:car-electric',
    category: 'vehicle-iot',
    keywords: ['gb32960', '32960', '新能源', '电动车', '远程服务', '监管平台', '实时信息', '补发信息', '车辆登入', '报文解析'],
    path: '/tool/gb32960-parser'
  },
  {
    id: 'gbt27930-parser',
    name: 'GB/T 27930 解析',
    description: '电动汽车非车载充电机与 BMS 通信 CAN 报文解析，覆盖握手、辨识、配置、充电和错误阶段',
    icon: 'mdi:ev-station',
    category: 'vehicle-iot',
    keywords: ['gbt27930', '27930', '充电', '充电桩', 'bms', '非车载充电机', 'can', 'pgn', '电动车', '报文解析'],
    path: '/tool/gbt27930-parser'
  },
  {
    id: 'ocpp-message-tool',
    name: 'OCPP 报文校验',
    description: 'OCPP 1.6J / 2.0.1 JSON 报文结构校验、常用 Action 必填字段检查和示例构造',
    icon: 'mdi:ev-plug-type2',
    category: 'vehicle-iot',
    keywords: ['ocpp', 'ocpp1.6', 'ocpp2.0.1', '充电桩', '充电站', 'json', 'websocket', 'bootnotification', 'metervalues', '报文校验'],
    path: '/tool/ocpp-message-tool'
  },
  {
    id: 'vehicle-message-builder',
    name: '报文构造器',
    description: 'JT808、GB32960、OCPP、GB/T 27930 常用报文模板构造、校验和字段核对',
    icon: 'mdi:message-cog-outline',
    category: 'vehicle-iot',
    keywords: ['组包', '构造', '模板', 'jt808', 'gb32960', 'ocpp', '27930', 'can', '车联网', '报文'],
    path: '/tool/vehicle-message-builder'
  },
  {
    id: 'vin-decoder',
    name: 'VIN 解析/校验',
    description: '解析 VIN 结构、年份、WMI 区域并校验第 9 位校验位',
    icon: 'mdi:identifier',
    category: 'vehicle-iot',
    keywords: ['vin', '车架号', 'wmi', '年份', '校验位', '车辆识别码', '解析', '校验'],
    path: '/tool/vin-decoder'
  },
  {
    id: 'j1939-id-calculator',
    name: 'J1939 ID/PGN 计算器',
    description: '29 位 CAN ID 与 J1939 PGN、优先级、源地址、目标地址互转',
    icon: 'mdi:calculator-variant-outline',
    category: 'vehicle-iot',
    keywords: ['j1939', 'can', 'pgn', 'canid', 'sa', 'da', 'pdu', '计算器', '互转', '29位'],
    path: '/tool/j1939-id-calculator'
  },
  {
    id: 'can-j1939-decoder',
    name: 'CAN/J1939 解码器',
    description: 'CAN 日志解析、J1939 PGN 拆解、DM1 故障码和 DBC 信号换算',
    icon: 'mdi:chip',
    category: 'vehicle-iot',
    keywords: ['can', 'j1939', 'dbc', 'dm1', 'pgn', 'spn', 'fmi', 'candump', 'asc', '故障码', '总线', '信号解码'],
    path: '/tool/can-j1939-decoder'
  },
  {
    id: 'can-signal-chart',
    name: 'CAN 信号曲线分析',
    description: '导入 CAN/DBC 日志，按信号绘制趋势、统计跳变和帧周期',
    icon: 'mdi:chart-line',
    category: 'vehicle-iot',
    keywords: ['can', 'dbc', '曲线', '趋势', '信号', '周期', '跳变', 'candump', 'asc', 'j1939'],
    path: '/tool/can-signal-chart'
  },
  {
    id: 'obd-uds-diagnostic',
    name: 'OBD/UDS 诊断工具',
    description: 'OBD-II PID、DTC 故障码、UDS 服务和 ISO-TP 诊断载荷解析',
    icon: 'mdi:car-wrench',
    category: 'vehicle-iot',
    keywords: ['obd', 'obd2', 'uds', 'iso-tp', 'isotp', 'dtc', 'pid', 'sid', 'nrc', '诊断', '故障码', 'can'],
    path: '/tool/obd-uds-diagnostic'
  },
  {
    id: 'track-map-viewer',
    name: '轨迹点分析',
    description: '坐标转换、轨迹压缩、电子围栏、停留点、超速、漂移、NMEA 解析',
    icon: 'mdi:map-marker-path',
    category: 'vehicle-iot',
    keywords: ['map', 'track', 'gps', 'coordinates', '地图', '轨迹', '经纬度', '坐标', '电子围栏', '轨迹压缩', '停留点', '超速', '里程', '漂移', 'nmea', 'gga', 'rmc'],
    path: '/tool/track-map-viewer'
  },
  {
    id: 'coordinate-converter',
    name: '坐标系转换',
    description: 'WGS84/GCJ02/BD09 坐标互转并在地图上定位',
    icon: 'mdi:map-sync',
    category: 'vehicle-iot',
    keywords: ['坐标转换', 'wgs84', 'gcj02', 'bd09', '火星坐标', '百度坐标', '地图', '定位'],
    path: '/tool/coordinate-converter'
  },
  {
    id: 'geohash-tool',
    name: '经纬度 GeoHash',
    description: '经纬度地图展示和 GeoHash 编码解码',
    icon: 'mdi:map-marker',
    category: 'vehicle-iot',
    keywords: ['geohash', '经纬度', '地图', '定位', 'gps', '坐标'],
    path: '/tool/geohash-tool'
  },
  {
    id: 'vehicle-log-timeline',
    name: '日志时间线',
    description: '混合日志按时间归档，自动识别协议、方向、设备、事件类型和相邻事件间隔',
    icon: 'mdi:timeline-clock',
    category: 'vehicle-iot',
    keywords: ['日志', '时间线', '排障', 'jt808', 'gb32960', 'ocpp', 'can', 'obd', 'uds', '定位', '链路追踪', 'trace'],
    path: '/tool/vehicle-log-timeline'
  },
  {
    id: 'websocket-client',
    name: 'WebSocket 连接',
    description: '连接 WebSocket 服务，发送消息并查看收发日志',
    icon: 'mdi:web',
    category: 'connection',
    keywords: ['websocket', 'ws', 'wss', 'socket', '连接', '调试', '消息'],
    path: '/tool/websocket-client'
  },
  {
    id: 'mqtt-client',
    name: 'MQTT 连接',
    description: '通过 MQTT over WebSocket 连接 Broker，订阅主题并发布消息',
    icon: 'mdi:access-point-network',
    category: 'connection',
    keywords: ['mqtt', 'broker', 'topic', 'publish', 'subscribe', '物联网', '连接'],
    path: '/tool/mqtt-client'
  }
]

const categoryMeta: Array<Omit<ToolCategoryInfo, 'tools'>> = [
  {
    id: 'utilities',
    name: '实用工具',
    icon: 'mdi:toolbox-outline'
  },
  {
    id: 'encoding',
    name: '编码工具',
    icon: 'mdi:lock-outline'
  },
  {
    id: 'formatter',
    name: '格式化工具',
    icon: 'mdi:code-braces'
  },
  {
    id: 'time',
    name: '时间工具',
    icon: 'mdi:clock-outline'
  },
  {
    id: 'network',
    name: '网络工具',
    icon: 'mdi:network-outline'
  },
  {
    id: 'vehicle-iot',
    name: '车联网工具',
    icon: 'mdi:car-connected'
  },
  {
    id: 'connection',
    name: '连接工具',
    icon: 'mdi:connection'
  }
]

export const toolCategoryColors: Record<ToolCategory, string> = {
  utilities: '#35c982',
  encoding: '#64b5f6',
  formatter: '#f2c97d',
  time: '#a78bfa',
  network: '#fb7185',
  'vehicle-iot': '#22d3ee',
  connection: '#f97316'
}

const toolsByCategory = allTools.reduce((result, tool) => {
  const categoryTools = result.get(tool.category)

  if (categoryTools) {
    categoryTools.push(tool)
  } else {
    result.set(tool.category, [tool])
  }

  return result
}, new Map<ToolCategory, ToolInfo[]>())

export const toolCategories: ToolCategoryInfo[] = categoryMeta.map(category => ({
  ...category,
  tools: toolsByCategory.get(category.id) ?? []
}))

const toolsById = new Map(allTools.map(tool => [tool.id, tool]))
const toolsByPath = new Map(allTools.map(tool => [tool.path, tool]))
const categoryNamesById = new Map(categoryMeta.map(category => [category.id, category.name]))

export function getToolById(id: string): ToolInfo | undefined {
  return toolsById.get(id)
}

export function getToolByPath(path: string): ToolInfo | undefined {
  return toolsByPath.get(path)
}

export function getToolsByIds(ids: readonly string[]): ToolInfo[] {
  return ids
    .map(id => toolsById.get(id))
    .filter((tool): tool is ToolInfo => tool !== undefined)
}

export function getToolCategoryName(category: ToolCategory): string {
  return categoryNamesById.get(category) ?? ''
}

export function getToolCategoryColor(category: ToolCategory): string {
  return toolCategoryColors[category]
}
