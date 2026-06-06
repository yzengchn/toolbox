export type ToolCategory = 'encoding' | 'formatter' | 'time' | 'utilities' | 'vehicle-iot' | 'network' | 'connection'

export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  category: ToolCategory
  keywords: string[]
  component: any
  path: string
}

export interface ToolCategoryInfo {
  id: ToolCategory
  name: string
  icon: string
  tools: Tool[]
}

export interface ToolError {
  message: string
  code?: string
  details?: any
}
