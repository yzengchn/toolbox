let toolViewPreload: Promise<unknown> | null = null
let componentLoadersPreload: Promise<typeof import('./componentLoaders')> | null = null
const pendingToolIds = new Set<string>()
const warmedLikelyToolIds = new Set<string>()

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
}

const scheduleIdleTask = (task: () => void, timeout = 1800) => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout })
    return
  }

  window.setTimeout(task, Math.min(timeout, 800))
}

const canWarmLikelyToolPages = () => {
  const connection = (navigator as Navigator & {
    connection?: NetworkInformationLike
  }).connection

  if (!connection) {
    return true
  }

  if (connection.saveData) {
    return false
  }

  return !['slow-2g', '2g'].includes(connection.effectiveType ?? '')
}

const loadToolView = () => {
  toolViewPreload ??= import('@/views/ToolView.vue')
  return toolViewPreload
}

const loadComponentLoaders = () => {
  componentLoadersPreload ??= import('./componentLoaders')
  return componentLoadersPreload
}

export function prefetchToolPage(toolId?: string): void {
  if (!toolId || pendingToolIds.has(toolId)) {
    return
  }

  pendingToolIds.add(toolId)

  void Promise.all([
    loadToolView(),
    loadComponentLoaders().then(module => module.preloadToolComponent(toolId))
  ]).catch((error) => {
    pendingToolIds.delete(toolId)
    console.error('Prefetch tool page failed:', error)
  })
}

export function warmToolPageShell(): void {
  void Promise.all([
    loadToolView(),
    loadComponentLoaders()
  ]).catch((error) => {
    console.error('Warm tool page shell failed:', error)
  })
}

export function prefetchLikelyToolPages(toolIds: readonly string[], limit = 4): void {
  if (!canWarmLikelyToolPages()) {
    return
  }

  const uniqueToolIds = [...new Set(toolIds)]
    .filter(toolId => toolId && !warmedLikelyToolIds.has(toolId))
    .slice(0, limit)

  if (!uniqueToolIds.length) {
    return
  }

  let index = 0

  const warmNextTool = () => {
    const toolId = uniqueToolIds[index]
    index += 1

    if (!toolId) {
      return
    }

    warmedLikelyToolIds.add(toolId)
    prefetchToolPage(toolId)

    if (index < uniqueToolIds.length) {
      scheduleIdleTask(warmNextTool, 2200)
    }
  }

  scheduleIdleTask(warmNextTool)
}
