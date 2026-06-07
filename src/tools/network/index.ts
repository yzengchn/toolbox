import type { Tool } from '@/types'
import { defineAsyncComponent } from 'vue'

const loadNetworkTools = () => import('./components')

const IpLookup = defineAsyncComponent(() => loadNetworkTools().then(module => module.IpLookup))
const UserAgentParser = defineAsyncComponent(() => loadNetworkTools().then(module => module.UserAgentParser))
const HttpStatus = defineAsyncComponent(() => loadNetworkTools().then(module => module.HttpStatus))
const SubnetCalculator = defineAsyncComponent(() => loadNetworkTools().then(module => module.SubnetCalculator))
const PortScanner = defineAsyncComponent(() => loadNetworkTools().then(module => module.PortScanner))
const UrlEncoder = defineAsyncComponent(() => loadNetworkTools().then(module => module.UrlEncoder))

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
    id: 'subnet-calculator',
    name: 'CIDR 网段计算器',
    description: '计算 IPv4 CIDR 网段的网络地址、广播地址、可用主机数等信息',
    icon: 'mdi:calculator',
    category: 'network',
    keywords: ['subnet', 'cidr', '子网', '计算器', 'ip', '网络'],
    component: SubnetCalculator,
    path: '/tool/subnet-calculator'
  },
  {
    id: 'port-scanner',
    name: '端口扫描工具',
    description: '批量探测目标主机的 HTTP/HTTPS 端口可访问性',
    icon: 'mdi:radar',
    category: 'network',
    keywords: ['port', 'scan', 'scanner', '端口', '扫描', '探测', 'http', 'https'],
    component: PortScanner,
    path: '/tool/port-scanner'
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
    id: 'user-agent-parser',
    name: 'User-Agent 解析器',
    description: '解析浏览器、系统、设备、渲染引擎和爬虫标识',
    icon: 'mdi:account-search-outline',
    category: 'network',
    keywords: ['user-agent', 'ua', '浏览器', '系统', '设备', '爬虫', 'webview'],
    component: UserAgentParser,
    path: '/tool/user-agent-parser'
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
  }
]
