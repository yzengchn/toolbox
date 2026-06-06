import { ref, computed, watchEffect } from 'vue'
import { darkTheme, type GlobalTheme } from 'naive-ui'

type ThemeMode = 'light' | 'dark' | 'auto'

const theme = ref<ThemeMode>('auto')
const isDark = ref(false)

export function useTheme() {
  const updateTheme = () => {
    if (theme.value === 'auto') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark.value = theme.value === 'dark'
    }

    document.documentElement.classList.toggle('dark', isDark.value)
  }

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'auto']
    const currentIndex = modes.indexOf(theme.value)
    theme.value = modes[(currentIndex + 1) % modes.length]
    updateTheme()
  }

  const setTheme = (mode: ThemeMode) => {
    theme.value = mode
    updateTheme()
  }

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = () => {
    if (theme.value === 'auto') {
      updateTheme()
    }
  }
  mediaQuery.addEventListener('change', handleChange)

  watchEffect(() => {
    updateTheme()
  })

  return {
    theme: computed(() => theme.value),
    naiveTheme: computed<GlobalTheme | null>(() => isDark.value ? darkTheme : null),
    isDark: computed(() => isDark.value),
    toggleTheme,
    setTheme
  }
}
