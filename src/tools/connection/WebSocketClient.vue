<template>
  <div class="tool-container">
    <ToolHeader
      title="WebSocket 连接"
      description="连接 WebSocket 服务，发送消息并查看收发日志"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="连接配置">
          <n-space vertical :size="14">
            <n-form-item label="服务地址">
              <n-input
                v-model:value="url"
                placeholder="wss://echo.websocket.events"
                clearable
                @keyup.enter="connect"
              />
            </n-form-item>

            <n-form-item label="子协议">
              <n-input
                v-model:value="protocols"
                placeholder="多个协议用英文逗号分隔，可留空"
                clearable
              />
            </n-form-item>

            <div class="status-line">
              <span class="status-label">当前状态</span>
              <n-tag :type="statusTagType" size="small">{{ statusText }}</n-tag>
            </div>

            <div class="actions-row">
              <n-button type="primary" :loading="status === 'connecting'" :disabled="isConnected" @click="connect">
                连接
              </n-button>
              <n-button :disabled="!isConnected && status !== 'connecting'" @click="handleDisconnect">
                断开
              </n-button>
              <n-button @click="loadDemo">
                示例
              </n-button>
            </div>
          </n-space>
        </n-card>

        <n-card class="panel-card" title="消息发送">
          <n-space vertical :size="14">
            <n-form-item label="消息类型">
              <n-select v-model:value="messageMode" :options="messageModeOptions" />
            </n-form-item>

            <n-input
              v-model:value="outgoingMessage"
              type="textarea"
              placeholder="输入要发送的消息"
              :rows="9"
            />

            <div class="actions-row">
              <n-button type="primary" :disabled="!isConnected" @click="sendMessage">
                发送
              </n-button>
              <n-button @click="formatJson" :disabled="messageMode !== 'json'">
                格式化 JSON
              </n-button>
              <n-button @click="clearMessage">
                清空消息
              </n-button>
            </div>
          </n-space>
        </n-card>
      </div>

      <n-alert v-if="error" type="error" class="section-gap">
        {{ error }}
      </n-alert>

      <n-card class="panel-card log-card" title="连接日志">
        <template #header-extra>
          <n-space>
            <n-button text :disabled="logs.length === 0" @click="copyLogs">复制日志</n-button>
            <n-button text :disabled="logs.length === 0" @click="clearLogs">清空</n-button>
          </n-space>
        </template>

        <div v-if="logs.length" class="log-list">
          <div v-for="item in logs" :key="item.id" class="log-row" :class="`log-row--${item.direction}`">
            <span class="log-time">{{ item.time }}</span>
            <n-tag size="small" :type="item.tagType">{{ item.label }}</n-tag>
            <pre>{{ item.content }}</pre>
          </div>
        </div>
        <n-empty v-else description="连接、发送或接收消息后会显示日志" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import { useClipboard } from '@/composables/useClipboard'

const { copy } = useClipboard()

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'closed'
type MessageMode = 'text' | 'json'
type LogDirection = 'system' | 'out' | 'in' | 'error'

interface LogItem {
  id: string
  time: string
  direction: LogDirection
  label: string
  content: string
  tagType: 'default' | 'info' | 'success' | 'warning' | 'error'
}

const url = ref('wss://echo.websocket.events')
const protocols = ref('')
const outgoingMessage = ref('{"type":"ping","message":"hello websocket"}')
const messageMode = ref<MessageMode>('json')
const status = ref<ConnectionStatus>('idle')
const error = ref('')
const logs = ref<LogItem[]>([])

let socket: WebSocket | null = null

const messageModeOptions = [
  { label: '文本', value: 'text' },
  { label: 'JSON', value: 'json' }
]

const isConnected = computed(() => status.value === 'connected' && socket?.readyState === WebSocket.OPEN)

const statusText = computed(() => {
  const statusMap: Record<ConnectionStatus, string> = {
    idle: '未连接',
    connecting: '连接中',
    connected: '已连接',
    closed: '已断开'
  }
  return statusMap[status.value]
})

const statusTagType = computed(() => {
  if (status.value === 'connected') return 'success'
  if (status.value === 'connecting') return 'warning'
  if (status.value === 'closed') return 'error'
  return 'default'
})

const connect = () => {
  error.value = ''
  const targetUrl = url.value.trim()

  if (!/^wss?:\/\//i.test(targetUrl)) {
    error.value = '请输入 ws:// 或 wss:// 开头的 WebSocket 地址'
    return
  }

  disconnect(false)
  status.value = 'connecting'
  appendLog('system', '连接', `正在连接 ${targetUrl}`)

  try {
    const protocolList = protocols.value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)

    socket = protocolList.length ? new WebSocket(targetUrl, protocolList) : new WebSocket(targetUrl)

    socket.addEventListener('open', () => {
      status.value = 'connected'
      appendLog('system', '已连接', `连接建立${socket?.protocol ? `，协议：${socket.protocol}` : ''}`)
    })

    socket.addEventListener('message', async event => {
      appendLog('in', '接收', await formatIncomingData(event.data))
    })

    socket.addEventListener('error', () => {
      error.value = 'WebSocket 连接发生错误，请检查地址、协议和服务端跨域策略'
      appendLog('error', '错误', error.value)
    })

    socket.addEventListener('close', event => {
      status.value = 'closed'
      appendLog('system', '断开', `code=${event.code} reason=${event.reason || '无'} clean=${event.wasClean ? '是' : '否'}`)
      socket = null
    })
  } catch (err) {
    status.value = 'closed'
    error.value = (err as Error).message
    appendLog('error', '错误', error.value)
  }
}

const disconnect = (writeLog = true) => {
  if (!socket) {
    status.value = status.value === 'idle' ? 'idle' : 'closed'
    return
  }

  if (writeLog) {
    appendLog('system', '断开', '主动关闭连接')
  }

  socket.close(1000, 'client disconnect')
  socket = null
  status.value = 'closed'
}

const handleDisconnect = () => {
  disconnect()
}

const sendMessage = () => {
  error.value = ''

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    error.value = '请先建立 WebSocket 连接'
    return
  }

  try {
    const payload = normalizeOutgoingMessage()
    socket.send(payload)
    appendLog('out', '发送', payload)
  } catch (err) {
    error.value = (err as Error).message
    appendLog('error', '错误', error.value)
  }
}

const normalizeOutgoingMessage = () => {
  if (messageMode.value !== 'json') {
    return outgoingMessage.value
  }

  return JSON.stringify(JSON.parse(outgoingMessage.value))
}

const formatJson = () => {
  error.value = ''
  try {
    outgoingMessage.value = JSON.stringify(JSON.parse(outgoingMessage.value), null, 2)
  } catch (err) {
    error.value = 'JSON 格式不正确：' + (err as Error).message
  }
}

const clearMessage = () => {
  outgoingMessage.value = ''
  error.value = ''
}

const loadDemo = () => {
  url.value = 'wss://echo.websocket.events'
  protocols.value = ''
  messageMode.value = 'json'
  outgoingMessage.value = JSON.stringify({ type: 'ping', message: 'hello websocket' }, null, 2)
}

const clearLogs = () => {
  logs.value = []
}

const copyLogs = () => {
  copy(logs.value.map(item => `[${item.time}] ${item.label} ${item.content}`).join('\n'), '已复制日志')
}

const appendLog = (direction: LogDirection, label: string, content: string) => {
  const tagTypeMap: Record<LogDirection, LogItem['tagType']> = {
    system: 'default',
    out: 'info',
    in: 'success',
    error: 'error'
  }

  logs.value.unshift({
    id: `${Date.now()}-${Math.random()}`,
    time: new Date().toLocaleTimeString(),
    direction,
    label,
    content,
    tagType: tagTypeMap[direction]
  })

  if (logs.value.length > 200) {
    logs.value = logs.value.slice(0, 200)
  }
}

const formatIncomingData = async (data: unknown): Promise<string> => {
  if (typeof data === 'string') {
    return data
  }

  if (data instanceof Blob) {
    return await data.text()
  }

  if (data instanceof ArrayBuffer) {
    return bytesToHex(new Uint8Array(data))
  }

  return String(data)
}

const bytesToHex = (bytes: Uint8Array) => {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join(' ')
}

onBeforeUnmount(() => {
  disconnect(false)
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-content {
  flex: 1;
  min-height: 0;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
  gap: var(--spacing-md);
  align-items: start;
  margin-bottom: var(--spacing-md);
}

.panel-card {
  border-radius: var(--radius-md);
}

.status-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.status-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.section-gap {
  margin-bottom: var(--spacing-md);
}

.log-card {
  min-height: 320px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 420px;
  overflow: auto;
}

.log-row {
  display: grid;
  grid-template-columns: 84px 64px minmax(0, 1fr);
  gap: var(--spacing-sm);
  align-items: start;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-left-width: 3px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.log-row--in {
  border-left-color: var(--color-accent);
}

.log-row--out {
  border-left-color: #2080f0;
}

.log-row--error {
  border-left-color: var(--color-error);
}

.log-time {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

.log-row pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

:deep(.n-card__content) {
  min-width: 0;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .log-row {
    grid-template-columns: 1fr;
  }
}
</style>
