import type { Tool } from '@/types'
import { defineAsyncComponent } from 'vue'

const loadVehicleIotTools = () => import('./components')

const Jt808Jt809Parser = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.Jt808Jt809Parser))
const GeoHashTool = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.GeoHashTool))
const CoordinateConverter = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.CoordinateConverter))
const TrackMapViewer = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.TrackMapViewer))
const Gb32960Parser = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.Gb32960Parser))
const CanJ1939Decoder = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.CanJ1939Decoder))
const ObdUdsDiagnostic = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.ObdUdsDiagnostic))
const Gbt27930Parser = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.Gbt27930Parser))
const OcppMessageTool = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.OcppMessageTool))
const VehicleLogTimelineTool = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.VehicleLogTimelineTool))

export const vehicleIotTools: Tool[] = [
  {
    id: 'jt808-jt809-parser',
    name: 'JT808/JT809 解析',
    description: 'JT808 与 JT809 报文解析、基础组包、Hex 转换和常用字段换算',
    icon: 'mdi:car-connected',
    category: 'vehicle-iot',
    keywords: ['jt808', 'jt809', 'jt1078', 'jt905', 'hex', '车联网', '报文', '组包', '解析'],
    component: Jt808Jt809Parser,
    path: '/tool/jt808-jt809-parser'
  },
  {
    id: 'gb32960-parser',
    name: 'GB/T 32960 解析',
    description: '新能源车远程服务通信报文解析，支持头部、校验、实时信息和常见数据块拆解',
    icon: 'mdi:car-electric',
    category: 'vehicle-iot',
    keywords: ['gb32960', '32960', '新能源', '电动车', '远程服务', '监管平台', '实时信息', '补发信息', '车辆登入', '报文解析'],
    component: Gb32960Parser,
    path: '/tool/gb32960-parser'
  },
  {
    id: 'gbt27930-parser',
    name: 'GB/T 27930 解析',
    description: '电动汽车非车载充电机与 BMS 通信 CAN 报文解析，覆盖握手、辨识、配置、充电和错误阶段',
    icon: 'mdi:ev-station',
    category: 'vehicle-iot',
    keywords: ['gbt27930', '27930', '充电', '充电桩', 'bms', '非车载充电机', 'can', 'pgn', '电动车', '报文解析'],
    component: Gbt27930Parser,
    path: '/tool/gbt27930-parser'
  },
  {
    id: 'ocpp-message-tool',
    name: 'OCPP 报文校验',
    description: 'OCPP 1.6J / 2.0.1 JSON 报文结构校验、常用 Action 必填字段检查和示例构造',
    icon: 'mdi:ev-plug-type2',
    category: 'vehicle-iot',
    keywords: ['ocpp', 'ocpp1.6', 'ocpp2.0.1', '充电桩', '充电站', 'json', 'websocket', 'bootnotification', 'metervalues', '报文校验'],
    component: OcppMessageTool,
    path: '/tool/ocpp-message-tool'
  },
  {
    id: 'can-j1939-decoder',
    name: 'CAN/J1939 解码器',
    description: 'CAN 日志解析、J1939 PGN 拆解、DM1 故障码和 DBC 信号换算',
    icon: 'mdi:chip',
    category: 'vehicle-iot',
    keywords: ['can', 'j1939', 'dbc', 'dm1', 'pgn', 'spn', 'fmi', 'candump', 'asc', '故障码', '总线', '信号解码'],
    component: CanJ1939Decoder,
    path: '/tool/can-j1939-decoder'
  },
  {
    id: 'obd-uds-diagnostic',
    name: 'OBD/UDS 诊断工具',
    description: 'OBD-II PID、DTC 故障码、UDS 服务和 ISO-TP 诊断载荷解析',
    icon: 'mdi:car-wrench',
    category: 'vehicle-iot',
    keywords: ['obd', 'obd2', 'uds', 'iso-tp', 'isotp', 'dtc', 'pid', 'sid', 'nrc', '诊断', '故障码', 'can'],
    component: ObdUdsDiagnostic,
    path: '/tool/obd-uds-diagnostic'
  },
  {
    id: 'coordinate-converter',
    name: '坐标系转换',
    description: 'WGS84/GCJ02/BD09 坐标互转并在地图上定位',
    icon: 'mdi:map-sync',
    category: 'vehicle-iot',
    keywords: ['坐标转换', 'wgs84', 'gcj02', 'bd09', '火星坐标', '百度坐标', '地图', '定位'],
    component: CoordinateConverter,
    path: '/tool/coordinate-converter'
  },
  {
    id: 'geohash-tool',
    name: '经纬度 GeoHash',
    description: '经纬度地图展示和 GeoHash 编码解码',
    icon: 'mdi:map-marker',
    category: 'vehicle-iot',
    keywords: ['geohash', '经纬度', '地图', '定位', 'gps', '坐标'],
    component: GeoHashTool,
    path: '/tool/geohash-tool'
  },
  {
    id: 'track-map-viewer',
    name: '轨迹点分析',
    description: '坐标转换、轨迹压缩、电子围栏、停留点、超速、漂移、NMEA 解析',
    icon: 'mdi:map-marker-path',
    category: 'vehicle-iot',
    keywords: ['map', 'track', 'gps', 'coordinates', '地图', '轨迹', '经纬度', '坐标', '电子围栏', '轨迹压缩', '停留点', '超速', '里程', '漂移', 'nmea', 'gga', 'rmc'],
    component: TrackMapViewer,
    path: '/tool/track-map-viewer'
  },
  {
    id: 'vehicle-log-timeline',
    name: '车联网日志时间线',
    description: '混合日志按时间归档，自动识别协议、方向、设备、事件类型和相邻事件间隔',
    icon: 'mdi:timeline-clock',
    category: 'vehicle-iot',
    keywords: ['日志', '时间线', '排障', 'jt808', 'gb32960', 'ocpp', 'can', 'obd', 'uds', '定位', '链路追踪', 'trace'],
    component: VehicleLogTimelineTool,
    path: '/tool/vehicle-log-timeline'
  }
]
