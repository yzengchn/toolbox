import { defineStore } from 'pinia'
import { ref } from 'vue'

const favoritesStorageKey = 'toolbox:favorites'

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

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const recentTools = ref<string[]>([])
  const favorites = ref<string[]>(loadFavorites())

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const addRecentTool = (toolId: string) => {
    recentTools.value = recentTools.value.filter(id => id !== toolId)
    recentTools.value.unshift(toolId)
    if (recentTools.value.length > 10) {
      recentTools.value = recentTools.value.slice(0, 10)
    }
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
    toggleSidebar,
    addRecentTool,
    toggleFavorite,
    isFavorite
  }
})
