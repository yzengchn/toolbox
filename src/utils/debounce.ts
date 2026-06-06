/**
 * 创建一个防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => fn.apply(this, args), delay)
  }
}
