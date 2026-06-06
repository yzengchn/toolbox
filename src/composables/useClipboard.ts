import { useMessage } from 'naive-ui'

export function useClipboard() {
  const message = useMessage()

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
    } catch (error) {
      message.error('复制失败')
      console.error('Copy failed:', error)
    }
  }

  const paste = async () => {
    try {
      return await navigator.clipboard.readText()
    } catch (error) {
      message.error('粘贴失败')
      console.error('Paste failed:', error)
      return ''
    }
  }

  return { copy, paste }
}
