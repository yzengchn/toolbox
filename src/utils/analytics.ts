import { analyticsConfig } from '@/config/analytics'

const idleDelay = 1500

const runWhenIdle = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 3000 })
    return
  }

  globalThis.setTimeout(callback, idleDelay)
}

const runAfterPageLoad = (callback: () => void) => {
  const schedule = () => runWhenIdle(callback)

  if (document.readyState === 'complete') {
    schedule()
    return
  }

  window.addEventListener('load', schedule, { once: true })
}

/**
 * 初始化百度统计
 */
function initBaiduAnalytics() {
  if (!analyticsConfig.enabled || !analyticsConfig.baidu.enabled) {
    console.log('[Analytics] 百度统计已禁用（开发环境）')
    return
  }

  if (!analyticsConfig.baidu.id || analyticsConfig.baidu.id === 'YOUR_BAIDU_ANALYTICS_ID') {
    return
  }

  const hm = document.createElement('script')
  hm.async = true
  hm.src = `https://hm.baidu.com/hm.js?${analyticsConfig.baidu.id}`
  const s = document.getElementsByTagName('script')[0]
  s.parentNode?.insertBefore(hm, s)

  console.log('[Analytics] 百度统计已加载')
}

/**
 * 初始化Google Analytics
 */
function initGoogleAnalytics() {
  if (!analyticsConfig.enabled || !analyticsConfig.google.enabled) {
    console.log('[Analytics] Google Analytics 已禁用（开发环境）')
    return
  }

  if (!analyticsConfig.google.id || analyticsConfig.google.id === 'G-XXXXXXXXXX') {
    return
  }

  // 加载gtag.js
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.google.id}`
  document.head.appendChild(script)

  // 初始化gtag
  window.dataLayer = window.dataLayer || []
  function gtag(...args: any[]) {
    window.dataLayer.push(args)
  }
  gtag('js', new Date())
  gtag('config', analyticsConfig.google.id)

  console.log('[Analytics] Google Analytics 已加载')
}

/**
 * 初始化所有统计
 */
export function initAnalytics() {
  if (!analyticsConfig.enabled) {
    console.log('[Analytics] 统计已禁用（开发环境）')
    return
  }

  runAfterPageLoad(() => {
    initBaiduAnalytics()
    initGoogleAnalytics()
  })
}

// 类型声明
declare global {
  interface Window {
    dataLayer: any[]
  }
}
