import { ref, watch, onMounted, type Ref } from 'vue'

export function useStorage<T>(key: string, defaultValue: T) {
  const data: Ref<T> = ref(defaultValue) as Ref<T>

  // 从 LocalStorage 加载
  const load = () => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        data.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Load from storage failed:', error)
    }
  }

  // 保存到 LocalStorage
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(data.value))
    } catch (error) {
      console.error('Save to storage failed:', error)
    }
  }

  // 清除
  const clear = () => {
    try {
      localStorage.removeItem(key)
      data.value = defaultValue
    } catch (error) {
      console.error('Clear storage failed:', error)
    }
  }

  // 自动保存
  watch(data, save, { deep: true })

  onMounted(load)

  return { data, load, save, clear }
}
