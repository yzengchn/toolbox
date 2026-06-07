import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import ToolView from '@/views/ToolView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/tool/password-generator'
  },
  {
    path: '/home',
    component: () => import('@/views/Home.vue'),
    name: 'home'
  },
  {
    path: '/tool/:toolId',
    component: ToolView,
    name: 'tool',
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
