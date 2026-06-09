import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/Home.vue'),
    name: 'home'
  },
  {
    path: '/home',
    redirect: '/'
  },
  {
    path: '/tool/:toolId',
    component: () => import('@/views/ToolView.vue'),
    name: 'tool',
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
