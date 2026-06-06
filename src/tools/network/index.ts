import type { Tool } from '@/types'
import IpLookup from './IpLookup.vue'
import UrlEncoder from './UrlEncoder.vue'
import HttpStatus from './HttpStatus.vue'
import SubnetCalculator from './SubnetCalculator.vue'

export const networkTools: Tool[] = [
  {
    id: 'ip-lookup',
    name: 'IP 地址查询',
    description: '查询 IP 地址的地理位置和网络信息',
    icon: 'mdi:ip-network',
    category: 'network',
    keywords: ['ip', 'lookup', '查询', '地址', '地理位置'],
    component: IpLookup,
    path: '/tool/ip-lookup'
  },
  {
    id: 'url-encoder',
    name: 'URL 编码/解码',
    description: '对 URL 进行编码和解码操作',
    icon: 'mdi:link-variant',
    category: 'network',
    keywords: ['url', 'encode', 'decode', '编码', '解码', 'uri'],
    component: UrlEncoder,
    path: '/tool/url-encoder'
  },
  {
    id: 'http-status',
    name: 'HTTP 状态码查询',
    description: '查询 HTTP 状态码的含义和说明',
    icon: 'mdi:web',
    category: 'network',
    keywords: ['http', 'status', 'code', '状态码', '查询'],
    component: HttpStatus,
    path: '/tool/http-status'
  },
  {
    id: 'subnet-calculator',
    name: 'CIDR 网段计算器',
    description: '计算 IPv4 CIDR 网段的网络地址、广播地址、可用主机数等信息',
    icon: 'mdi:calculator',
    category: 'network',
    keywords: ['subnet', 'cidr', '子网', '计算器', 'ip', '网络'],
    component: SubnetCalculator,
    path: '/tool/subnet-calculator'
  }
]
