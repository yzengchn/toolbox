import type { Tool, ToolCategoryInfo } from '@/types'
import { encodingTools } from './encoding'
import { networkTools } from './network'
import { utilitiesTools } from './utilities'
import { formatterTools } from './formatter'
import { timeTools } from './time'
import { vehicleIotTools } from './vehicle-iot'
import { connectionTools } from './connection'

// 所有工具列表
export const allTools: Tool[] = [
  ...encodingTools,
  ...networkTools,
  ...utilitiesTools,
  ...formatterTools,
  ...timeTools,
  ...vehicleIotTools,
  ...connectionTools
]

// 按分类组织工具
export const toolCategories: ToolCategoryInfo[] = [
  {
    id: 'encoding',
    name: '编码工具',
    icon: 'mdi:lock-outline',
    tools: allTools.filter(t => t.category === 'encoding')
  },
  {
    id: 'formatter',
    name: '格式化工具',
    icon: 'mdi:code-braces',
    tools: allTools.filter(t => t.category === 'formatter')
  },
  {
    id: 'time',
    name: '时间工具',
    icon: 'mdi:clock-outline',
    tools: allTools.filter(t => t.category === 'time')
  },
  {
    id: 'utilities',
    name: '实用工具',
    icon: 'mdi:toolbox-outline',
    tools: allTools.filter(t => t.category === 'utilities')
  },
  {
    id: 'vehicle-iot',
    name: '车联网工具',
    icon: 'mdi:car-connected',
    tools: allTools.filter(t => t.category === 'vehicle-iot')
  },
  {
    id: 'network',
    name: '网络工具',
    icon: 'mdi:network-outline',
    tools: allTools.filter(t => t.category === 'network')
  },
  {
    id: 'connection',
    name: '连接工具',
    icon: 'mdi:connection',
    tools: allTools.filter(t => t.category === 'connection')
  }
]

// 根据 ID 查找工具
export function getToolById(id: string): Tool | undefined {
  return allTools.find(tool => tool.id === id)
}

// 搜索工具
export function searchTools(keyword: string): Tool[] {
  const lowerKeyword = keyword.toLowerCase()
  return allTools.filter(tool =>
    tool.name.toLowerCase().includes(lowerKeyword) ||
    tool.description.toLowerCase().includes(lowerKeyword) ||
    tool.keywords.some(k => k.toLowerCase().includes(lowerKeyword))
  )
}
