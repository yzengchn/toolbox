/**
 * 统计配置
 */
export interface AnalyticsConfig {
  enabled: boolean
  baidu: {
    enabled: boolean
    id: string
  }
  google: {
    enabled: boolean
    id: string
  }
}

export const analyticsConfig: AnalyticsConfig = {
  // 生产环境启用，开发环境禁用
  enabled: import.meta.env.PROD,

  baidu: {
    enabled: true,
    // 替换为你的百度统计ID
    id: import.meta.env.VITE_BAIDU_ANALYTICS_ID || 'YOUR_BAIDU_ANALYTICS_ID'
  },

  google: {
    enabled: true,
    // 替换为你的Google Analytics测量ID
    id: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || 'G-XXXXXXXXXX'
  }
}
