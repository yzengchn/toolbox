import type { Component } from 'vue'
import type { Tool, ToolCategory, ToolCategoryInfo, ToolInfo } from '@/types'
import {
  allTools as allToolInfos,
  getToolCategoryColor,
  getToolCategoryName,
  toolCategories as toolInfoCategories,
  toolCategoryColors
} from './catalog'
import { encodingToolComponents } from './encoding'
import { networkToolComponents } from './network'
import { utilitiesToolComponents } from './utilities'
import { formatterToolComponents } from './formatter'
import { timeToolComponents } from './time'
import { vehicleIotToolComponents } from './vehicle-iot'
import { connectionToolComponents } from './connection'

export { getToolCategoryColor, getToolCategoryName, toolCategoryColors }

const toolComponents: Record<string, Component> = {
  ...encodingToolComponents,
  ...networkToolComponents,
  ...utilitiesToolComponents,
  ...formatterToolComponents,
  ...timeToolComponents,
  ...vehicleIotToolComponents,
  ...connectionToolComponents
}

const createTool = (toolInfo: ToolInfo): Tool => {
  const component = toolComponents[toolInfo.id]

  if (!component) {
    throw new Error(`Tool component not found: ${toolInfo.id}`)
  }

  return {
    ...toolInfo,
    component
  }
}

export const allTools: Tool[] = allToolInfos.map(createTool)

const toolsByCategory = allTools.reduce((result, tool) => {
  const categoryTools = result.get(tool.category)

  if (categoryTools) {
    categoryTools.push(tool)
  } else {
    result.set(tool.category, [tool])
  }

  return result
}, new Map<ToolCategory, Tool[]>())

export const toolCategories: ToolCategoryInfo<Tool>[] = toolInfoCategories.map(category => ({
  ...category,
  tools: toolsByCategory.get(category.id) ?? []
}))

const toolsById = new Map(allTools.map(tool => [tool.id, tool]))
const toolsByPath = new Map(allTools.map(tool => [tool.path, tool]))

export function getToolById(id: string): Tool | undefined {
  return toolsById.get(id)
}

export function getToolComponentById(id: string): Component | undefined {
  return toolsById.get(id)?.component
}

export function getToolByPath(path: string): Tool | undefined {
  return toolsByPath.get(path)
}

export function getToolsByIds(ids: readonly string[]): Tool[] {
  return ids
    .map(id => toolsById.get(id))
    .filter((tool): tool is Tool => tool !== undefined)
}
