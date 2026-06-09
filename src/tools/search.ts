import type { ToolInfo } from '@/types'
import { allTools, getToolCategoryName } from './catalog'

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
  const categoryName = getToolCategoryName(tool.category)
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

export function searchTools(keyword: string, limit = allTools.length): ToolInfo[] {
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
