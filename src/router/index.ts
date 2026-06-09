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

const getToolIdParam = (toolId: unknown) => {
  if (Array.isArray(toolId)) {
    return toolId[0]
  }

  return typeof toolId === 'string' ? toolId : undefined
}

router.beforeEach((to) => {
  if (to.name !== 'tool') {
    return
  }

  const toolId = getToolIdParam(to.params.toolId)
  if (!toolId) {
    return
  }

  void Promise.all([
    import('@/views/ToolView.vue'),
    import('@/tools/componentLoaders').then(({ preloadToolComponent }) => preloadToolComponent(toolId))
  ])
    .catch((error) => {
      console.error('Preload route tool component failed:', error)
    })
})

export default router
