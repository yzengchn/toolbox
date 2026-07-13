import { computed, onBeforeUnmount, ref, type CSSProperties, type Ref } from 'vue'
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useAppStore
} from '@/stores/app'

/** 拖到折叠宽 + 容差 → 折叠（与折叠按钮视觉一致） */
const COLLAPSE_SNAP = SIDEBAR_COLLAPSED_WIDTH + 16
/** 从折叠态向右拖超过该阈值才展开，避免误触 */
const EXPAND_SNAP = SIDEBAR_COLLAPSED_WIDTH + 24

const KEY_STEP = 8
const KEY_STEP_FAST = 24

/**
 * 侧边栏拖动调宽：
 * - 展开态可拖到折叠宽并进入折叠
 * - 折叠态也可拖，向右拉开即展开
 * - 拖动中用 draft 跟手，不立刻写 store，避免冲掉展开宽度记忆
 */
export function useSidebarResize(isMobile: Ref<boolean> | (() => boolean)) {
  const appStore = useAppStore()
  const isResizing = ref(false)
  const draftWidth = ref(appStore.sidebarWidth)
  /** 本次拖动开始时的展开宽度；折叠时写回，保证下次展开可还原 */
  let widthBeforeDrag = appStore.sidebarWidth

  const mobile = () => (typeof isMobile === 'function' ? isMobile() : isMobile.value)

  const displayWidth = computed(() => {
    if (isResizing.value) return draftWidth.value
    if (appStore.sidebarCollapsed) return SIDEBAR_COLLAPSED_WIDTH
    return appStore.sidebarWidth
  })

  /**
   * inline width：
   * - 拖动中始终用 draft
   * - 静止展开用记忆宽度
   * - 静止折叠不设 inline，交给 .collapsed 的 CSS
   */
  const sidebarStyle = computed((): CSSProperties | undefined => {
    if (isResizing.value) return { width: `${draftWidth.value}px` }
    if (appStore.sidebarCollapsed) return undefined
    return { width: `${appStore.sidebarWidth}px` }
  })

  const clamp = (width: number) =>
    Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)))

  const cleanupListeners = () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
    window.removeEventListener('pointercancel', onEnd)
  }

  /** 进入折叠态，保留展开宽度记忆（与点折叠按钮一致，不写 72 进 store） */
  const commitCollapse = (rememberedWidth = widthBeforeDrag) => {
    isResizing.value = false
    appStore.setSidebarWidth(rememberedWidth)
    appStore.setSidebarCollapsed(true)
    cleanupListeners()
  }

  /** 进入展开态并记住宽度 */
  const commitExpand = (width: number) => {
    isResizing.value = false
    appStore.setSidebarCollapsed(false)
    appStore.setSidebarWidth(width)
    cleanupListeners()
  }

  const onMove = (event: PointerEvent) => {
    if (!isResizing.value) return
    const next = clamp(event.clientX)

    // 展开 → 折叠阈值：立即折叠
    if (!appStore.sidebarCollapsed && next <= COLLAPSE_SNAP) {
      commitCollapse()
      return
    }

    // 折叠 → 向右过阈值：先展开再跟手
    if (appStore.sidebarCollapsed && next >= EXPAND_SNAP) {
      appStore.setSidebarCollapsed(false)
    }

    draftWidth.value = next
  }

  const onEnd = () => {
    if (!isResizing.value) return

    if (draftWidth.value <= COLLAPSE_SNAP) {
      commitCollapse()
      return
    }

    commitExpand(draftWidth.value)
  }

  const onResizeStart = (event: PointerEvent) => {
    if (mobile() || event.button !== 0) return

    event.preventDefault()
    widthBeforeDrag = appStore.sidebarWidth
    draftWidth.value = appStore.sidebarCollapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : appStore.sidebarWidth
    isResizing.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  const onResizeKeydown = (event: KeyboardEvent) => {
    if (mobile()) return

    const step = event.shiftKey ? KEY_STEP_FAST : KEY_STEP

    switch (event.key) {
      case 'ArrowLeft': {
        event.preventDefault()
        if (appStore.sidebarCollapsed) return
        const next = appStore.sidebarWidth - step
        if (next <= COLLAPSE_SNAP) appStore.setSidebarCollapsed(true)
        else appStore.setSidebarWidth(next)
        break
      }
      case 'ArrowRight': {
        event.preventDefault()
        if (appStore.sidebarCollapsed) {
          appStore.setSidebarCollapsed(false)
          if (appStore.sidebarWidth <= EXPAND_SNAP) {
            appStore.setSidebarWidth(EXPAND_SNAP + step)
          }
        } else {
          appStore.setSidebarWidth(appStore.sidebarWidth + step)
        }
        break
      }
      case 'Home':
        event.preventDefault()
        appStore.setSidebarCollapsed(true)
        break
      case 'End':
        event.preventDefault()
        appStore.setSidebarCollapsed(false)
        appStore.setSidebarWidth(SIDEBAR_MAX_WIDTH)
        break
      default:
        break
    }
  }

  onBeforeUnmount(() => {
    if (isResizing.value) cleanupListeners()
    isResizing.value = false
  })

  return {
    isResizing,
    displayWidth,
    sidebarStyle,
    onResizeStart,
    onResizeKeydown,
    SIDEBAR_COLLAPSED_WIDTH,
    SIDEBAR_MAX_WIDTH
  }
}
