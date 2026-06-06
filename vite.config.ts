import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173
  },
  build: {
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 分包策略
    rollupOptions: {
      output: {
        // 手动分包
        manualChunks: (id) => {
          // Vue 核心
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) {
            return 'vue-vendor'
          }
          // UI 框架
          if (id.includes('node_modules/naive-ui')) {
            return 'ui-vendor'
          }
          // 地图相关（较大）
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/ngeohash')) {
            return 'map-vendor'
          }
          // MQTT 相关
          if (id.includes('node_modules/mqtt')) {
            return 'mqtt-vendor'
          }
          // 代码高亮和格式化
          if (id.includes('node_modules/highlight.js') || id.includes('node_modules/sql-formatter')) {
            return 'editor-vendor'
          }
          // 工具库
          if (id.includes('node_modules/dayjs') || id.includes('node_modules/crypto-js') || id.includes('node_modules/uuid')) {
            return 'utils-vendor'
          }
          // 其他 node_modules
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    },
    // chunk 大小警告限制
    chunkSizeWarningLimit: 1000
  }
})
