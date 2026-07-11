import type { Component } from 'vue'

export type ToolCategory = 'encoding' | 'formatter' | 'time' | 'utilities' | 'vehicle-iot' | 'network' | 'connection' | 'file'

export interface ToolInfo {
  id: string
  name: string
  description: string
  icon: string
  category: ToolCategory
  keywords: string[]
  path: string
}

export interface Tool extends ToolInfo {
  component: Component
}

export interface ToolCategoryInfo<TTool extends ToolInfo = ToolInfo> {
  id: ToolCategory
  name: string
  icon: string
  tools: TTool[]
}

export interface ToolError {
  message: string
  code?: string
  details?: any
}
