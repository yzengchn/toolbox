import type { ToolCategory, ToolCategoryInfo, ToolInfo } from '@/types'
import { hasToolComponentLoader, loadToolComponent, preloadToolComponent } from './componentLoaders'
import {
  allTools as allToolInfos,
  getToolCategoryColor,
  getToolCategoryName,
  toolCategories as toolInfoCategories,
  toolCategoryColors
} from './catalog'

export {
  getToolCategoryColor,
  getToolCategoryName,
  hasToolComponentLoader,
  loadToolComponent,
  preloadToolComponent,
  toolCategoryColors
}

export const allTools: ToolInfo[] = allToolInfos

const toolsByCategory = allTools.reduce((result, tool) => {
  const categoryTools = result.get(tool.category)

  if (categoryTools) {
    categoryTools.push(tool)
  } else {
    result.set(tool.category, [tool])
  }

  return result
}, new Map<ToolCategory, ToolInfo[]>())

export const toolCategories: ToolCategoryInfo<ToolInfo>[] = toolInfoCategories.map(category => ({
  ...category,
  tools: toolsByCategory.get(category.id) ?? []
}))

const toolsById = new Map(allTools.map(tool => [tool.id, tool]))
const toolsByPath = new Map(allTools.map(tool => [tool.path, tool]))

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
