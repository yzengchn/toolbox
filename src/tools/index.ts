import type { Tool, ToolCategory, ToolCategoryInfo } from '@/types'
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

const toolsByCategory = allTools.reduce((result, tool) => {
  const categoryTools = result.get(tool.category)

  if (categoryTools) {
    categoryTools.push(tool)
  } else {
    result.set(tool.category, [tool])
  }

  return result
}, new Map<ToolCategory, Tool[]>())

// 按分类组织工具
export const toolCategories: ToolCategoryInfo[] = categoryMeta.map(category => ({
  ...category,
  tools: toolsByCategory.get(category.id) ?? []
}))

const toolsById = new Map(allTools.map(tool => [tool.id, tool]))
const toolsByPath = new Map(allTools.map(tool => [tool.path, tool]))
const categoryNamesById = new Map(categoryMeta.map(category => [category.id, category.name]))

const normalizeSearchText = (value: string) => value.toLowerCase().replace(/\s+/g, '')

const getSequentialMatchScore = (text: string, query: string) => {
  let queryIndex = 0
  let firstMatchIndex = -1
  let previousMatchIndex = -1
  let gapPenalty = 0

  for (let textIndex = 0; textIndex < text.length && queryIndex < query.length; textIndex += 1) {
    if (text[textIndex] !== query[queryIndex]) {
      continue
    }

    if (firstMatchIndex === -1) {
      firstMatchIndex = textIndex
    }

    if (previousMatchIndex !== -1) {
      gapPenalty += textIndex - previousMatchIndex - 1
    }

    previousMatchIndex = textIndex
    queryIndex += 1
  }

  if (queryIndex < query.length) {
    return 0
  }

  return Math.max(1, 70 - firstMatchIndex * 2 - gapPenalty)
}

const toolSearchIndex = allTools.map(tool => {
  const categoryName = categoryNamesById.get(tool.category) ?? ''
  const name = normalizeSearchText(tool.name)
  const description = normalizeSearchText(tool.description)
  const keywordText = normalizeSearchText(tool.keywords.join(' '))
  const normalizedCategoryName = normalizeSearchText(categoryName)

  return {
    tool,
    name,
    description,
    keywordText,
    categoryName: normalizedCategoryName,
    searchText: normalizeSearchText([
      tool.name,
      tool.description,
      categoryName,
      ...tool.keywords
    ].join(' '))
  }
})

const getToolMatchScore = (entry: (typeof toolSearchIndex)[number], query: string) => {
  if (!query) {
    return 0
  }

  if (entry.name === query) {
    return 140
  }

  if (entry.name.startsWith(query)) {
    return 130 - entry.name.length
  }

  if (entry.name.includes(query)) {
    return 112 - entry.name.indexOf(query)
  }

  if (entry.keywordText.includes(query)) {
    return 96
  }

  if (entry.categoryName.includes(query)) {
    return 88
  }

  if (entry.description.includes(query)) {
    return 82 - entry.description.indexOf(query) * 0.1
  }

  return getSequentialMatchScore(entry.searchText, query)
}

// 根据 ID 查找工具
export function getToolById(id: string): Tool | undefined {
  return toolsById.get(id)
}

export function getToolByPath(path: string): Tool | undefined {
  return toolsByPath.get(path)
}

export function getToolsByIds(ids: readonly string[]): Tool[] {
  return ids
    .map(id => toolsById.get(id))
    .filter((tool): tool is Tool => tool !== undefined)
}

export function getToolCategoryName(category: ToolCategory): string {
  return categoryNamesById.get(category) ?? ''
}

// 搜索工具
export function searchTools(keyword: string, limit = allTools.length): Tool[] {
  const query = normalizeSearchText(keyword)

  if (!query) {
    return []
  }

  return toolSearchIndex
    .map(entry => ({
      tool: entry.tool,
      score: getToolMatchScore(entry, query)
    }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name, 'zh-CN'))
    .slice(0, limit)
    .map(result => result.tool)
}
