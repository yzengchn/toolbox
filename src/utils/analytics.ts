import { analyticsConfig } from '@/config/analytics'

/**
 * 初始化百度统计
 */
function initBaiduAnalytics() {
  if (!analyticsConfig.enabled || !analyticsConfig.baidu.enabled) {
    console.log('[Analytics] 百度统计已禁用（开发环境）')
    return
  }

  const hm = document.createElement('script')
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

  initBaiduAnalytics()
  initGoogleAnalytics()
}

// 类型声明
declare global {
  interface Window {
    dataLayer: any[]
  }
}
