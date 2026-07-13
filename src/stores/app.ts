import { defineStore } from 'pinia'
import { ref } from 'vue'

const favoritesStorageKey = 'toolbox:favorites'
const searchHistoryStorageKey = 'toolbox:search-history'
const recentToolsStorageKey = 'toolbox:recent-tools'
const sidebarWidthStorageKey = 'toolbox:sidebar-width'
const storedToolListLimit = 3

/** 侧边栏默认 / 折叠 / 最小 / 最大宽度（px）
 * 最小宽度与折叠态一致，允许拖到折叠效果位置
 */
export const SIDEBAR_DEFAULT_WIDTH = 248
export const SIDEBAR_COLLAPSED_WIDTH = 72
export const SIDEBAR_MIN_WIDTH = SIDEBAR_COLLAPSED_WIDTH
export const SIDEBAR_MAX_WIDTH = 480

const loadFavorites = (): string[] => {
  try {
    const stored = localStorage.getItem(favoritesStorageKey)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : []
  } catch (err) {
    return []
  }
}

const saveFavorites = (favorites: string[]) => {
  try {
    localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites))
  } catch (err) {
    console.error('Save favorites failed:', err)
  }
}

const getStoredToolId = (item: unknown): string | null => {
  if (typeof item === 'string') {
    return item
  }

  if (item && typeof item === 'object' && 'toolId' in item) {
    const toolId = (item as { toolId?: unknown }).toolId
    return typeof toolId === 'string' ? toolId : null
  }

  return null
}

const loadToolIds = (storageKey: string): string[] => {
  try {
    const stored = localStorage.getItem(storageKey)
    const parsed = stored ? JSON.parse(stored) : []

    if (!Array.isArray(parsed)) {
      return []
    }

    const toolIds: string[] = []

    parsed.forEach(item => {
      const toolId = getStoredToolId(item)
      if (toolId && !toolIds.includes(toolId)) {
        toolIds.push(toolId)
      }
    })

    return toolIds.slice(0, storedToolListLimit)
  } catch (err) {
    return []
  }
}

const saveToolIds = (storageKey: string, toolIds: string[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(toolIds.slice(0, storedToolListLimit)))
  } catch (err) {
    console.error('Save tool list failed:', err)
  }
}

const clampSidebarWidth = (width: number): number => {
  if (!Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)))
}

const readStoredNumber = (key: string, fallback: number): number => {
  try {
    const stored = localStorage.getItem(key)
    if (stored == null) return fallback
    return clampSidebarWidth(Number(stored))
  } catch {
    return fallback
  }
}

const writeStoredNumber = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value))
  } catch (err) {
    console.error('Save sidebar width failed:', err)
  }
}

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const sidebarWidth = ref(readStoredNumber(sidebarWidthStorageKey, SIDEBAR_DEFAULT_WIDTH))
  const recentTools = ref<string[]>(loadToolIds(recentToolsStorageKey))
  const favorites = ref<string[]>(loadFavorites())
  const searchHistory = ref<string[]>(loadToolIds(searchHistoryStorageKey))

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
  }

  const setSidebarWidth = (width: number) => {
    const next = clampSidebarWidth(width)
    if (next === sidebarWidth.value) return
    sidebarWidth.value = next
    writeStoredNumber(sidebarWidthStorageKey, next)
  }

  /** 折叠按钮：展开时恢复默认宽度，与拖动记忆解耦 */
  const toggleSidebar = () => {
    if (sidebarCollapsed.value) setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const addRecentTool = (toolId: string) => {
    recentTools.value = recentTools.value.filter(id => id !== toolId)
    recentTools.value.unshift(toolId)
    if (recentTools.value.length > storedToolListLimit) {
      recentTools.value = recentTools.value.slice(0, storedToolListLimit)
    }
    saveToolIds(recentToolsStorageKey, recentTools.value)
  }

  const addSearchHistory = (toolId: string) => {
    searchHistory.value = searchHistory.value.filter(id => id !== toolId)
    searchHistory.value.unshift(toolId)

    if (searchHistory.value.length > storedToolListLimit) {
      searchHistory.value = searchHistory.value.slice(0, storedToolListLimit)
    }

    saveToolIds(searchHistoryStorageKey, searchHistory.value)
  }

  const toggleFavorite = (toolId: string) => {
    const index = favorites.value.indexOf(toolId)
    if (index > -1) {
      favorites.value.splice(index, 1)
    } else {
      favorites.value.push(toolId)
    }
    saveFavorites(favorites.value)
  }

  const isFavorite = (toolId: string) => {
    return favorites.value.includes(toolId)
  }

  return {
    sidebarCollapsed,
    sidebarWidth,
    recentTools,
    favorites,
    searchHistory,
    toggleSidebar,
    setSidebarCollapsed,
    setSidebarWidth,
    addRecentTool,
    addSearchHistory,
    toggleFavorite,
    isFavorite
  }
})
