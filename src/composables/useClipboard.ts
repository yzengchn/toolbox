import { useMessage } from 'naive-ui'

export function useClipboard() {
  const message = useMessage()

  const copy = async (text: string, successMessage = '已复制到剪贴板') => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(successMessage)
    } catch (error) {
      message.error('复制失败')
      console.error('Copy failed:', error)
    }
  }

  return { copy }
}
