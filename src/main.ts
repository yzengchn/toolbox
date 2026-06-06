import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './assets/styles/variables.css'
import './assets/styles/global.css'
import App from './App.vue'
import { initAnalytics } from './utils/analytics'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// 初始化统计（仅生产环境）
initAnalytics()
