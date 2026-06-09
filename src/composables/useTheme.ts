import { computed, ref, watchEffect } from 'vue'

type ThemeMode = 'light' | 'dark' | 'auto'

const theme = ref<ThemeMode>('auto')
const isDark = ref(false)
let themeInitialized = false

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

const updateTheme = () => {
  if (theme.value === 'auto') {
    isDark.value = mediaQuery.matches
  } else {
    isDark.value = theme.value === 'dark'
  }

  document.documentElement.classList.toggle('dark', isDark.value)
}

const initTheme = () => {
  if (themeInitialized) {
    return
  }

  themeInitialized = true

  const handleChange = () => {
    if (theme.value === 'auto') {
      updateTheme()
    }
  }

  mediaQuery.addEventListener('change', handleChange)

  watchEffect(() => {
    updateTheme()
  })
}

const themeMode = computed(() => theme.value)
const isDarkMode = computed(() => isDark.value)

export function useTheme() {
  initTheme()

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'auto']
    const currentIndex = modes.indexOf(theme.value)
    theme.value = modes[(currentIndex + 1) % modes.length]
  }

  const setTheme = (mode: ThemeMode) => {
    theme.value = mode
  }

  return {
    theme: themeMode,
    isDark: isDarkMode,
    toggleTheme,
    setTheme
  }
}
