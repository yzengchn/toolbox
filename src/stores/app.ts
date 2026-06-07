import { defineStore } from 'pinia'
import { ref } from 'vue'

const favoritesStorageKey = 'toolbox:favorites'
const searchHistoryStorageKey = 'toolbox:search-history'
const recentToolsStorageKey = 'toolbox:recent-tools'
const storedToolListLimit = 3

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

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const recentTools = ref<string[]>(loadToolIds(recentToolsStorageKey))
  const favorites = ref<string[]>(loadFavorites())
  const searchHistory = ref<string[]>(loadToolIds(searchHistoryStorageKey))

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
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
    recentTools,
    favorites,
    searchHistory,
    toggleSidebar,
    setSidebarCollapsed,
    addRecentTool,
    addSearchHistory,
    toggleFavorite,
    isFavorite
  }
})
