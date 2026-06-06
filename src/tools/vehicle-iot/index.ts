import type { Tool } from '@/types'
import VehicleIotTool from './VehicleIotTool.vue'
import GeoHashTool from './GeoHashTool.vue'

export const vehicleIotTools: Tool[] = [
  {
    id: 'vehicle-iot-tool',
    name: '国标解析',
    description: 'JT808/JT809 报文解析、基础组包、Hex 转换和常用字段换算',
    icon: 'mdi:car-connected',
    category: 'vehicle-iot',
    keywords: ['jt808', 'jt809', 'jt1078', 'jt905', 'hex', '车联网', '报文', '组包', '解析'],
    component: VehicleIotTool,
    path: '/tool/vehicle-iot-tool'
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
  }
]

