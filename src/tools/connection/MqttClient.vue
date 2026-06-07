<template>
  <div class="tool-container">
    <ToolHeader
      title="MQTT 连接"
      description="通过 MQTT over WebSocket 连接 Broker，订阅主题并发布消息"
    />

    <div class="tool-content">
      <n-card class="panel-card section-gap" title="连接配置">
        <n-grid :cols="6" :x-gap="12" :y-gap="12" responsive="screen">
          <n-grid-item span="2">
            <n-form-item label="服务器地址">
              <n-input-group>
                <n-select v-model:value="form.protocol" :options="protocolOptions" style="width: 80px" />
                <n-input v-model:value="form.host" placeholder="broker.emqx.io:8083/mqtt" clearable />
              </n-input-group>
            </n-form-item>
          </n-grid-item>
          <n-grid-item span="2">
            <n-form-item label="Client ID">
              <n-input v-model:value="form.clientId" clearable />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Keep Alive">
              <n-input-number v-model:value="form.keepAlive" :min="10" :max="3600" style="width: 100%" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="MQTT 版本">
              <n-select v-model:value="form.protocolVersion" :options="versionOptions" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item span="2">
            <n-form-item label="用户名">
              <n-input v-model:value="form.username" placeholder="可选" clearable />
            </n-form-item>
          </n-grid-item>
          <n-grid-item span="2">
            <n-form-item label="密码">
              <n-input v-model:value="form.password" type="password" placeholder="可选" clearable show-password-on="click" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="会话">
              <n-checkbox v-model:checked="form.cleanSession">Clean Session</n-checkbox>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <div class="status-box">
              <span>状态</span>
              <n-tag :type="statusTagType" size="small">{{ statusText }}</n-tag>
            </div>
          </n-grid-item>
        </n-grid>

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
      </n-card>

      <div class="workspace-grid">
        <n-card class="panel-card" title="订阅">
          <n-space vertical :size="14">
            <n-form-item label="Topic">
              <n-input v-model:value="subscribeTopic" placeholder="toolbox/demo" clearable @keyup.enter="subscribe" />
            </n-form-item>
            <div class="actions-row">
              <n-button type="primary" :disabled="!isConnected" @click="subscribe">
                订阅
              </n-button>
              <n-button :disabled="!isConnected || !subscribeTopic" @click="unsubscribe">
                取消订阅
              </n-button>
            </div>

            <div class="topic-list">
              <span class="topic-list__label">已订阅</span>
              <div v-if="subscribedTopics.length" class="topic-tags">
                <n-tag v-for="topic in subscribedTopics" :key="topic" size="small">{{ topic }}</n-tag>
              </div>
              <span v-else class="empty-text">暂无订阅</span>
            </div>
          </n-space>
        </n-card>

        <n-card class="panel-card" title="发布">
          <n-space vertical :size="14">
            <n-grid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
              <n-grid-item span="2">
                <n-form-item label="Topic">
                  <n-input v-model:value="publishTopic" placeholder="toolbox/demo" clearable />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="选项">
                  <n-checkbox v-model:checked="retain">Retain</n-checkbox>
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <n-input v-model:value="publishPayload" type="textarea" placeholder="输入发布内容" :rows="8" />

            <div class="actions-row">
              <n-button type="primary" :disabled="!isConnected" @click="publish">
                发布
              </n-button>
              <n-button @click="clearPayload">
                清空内容
              </n-button>
            </div>
          </n-space>
        </n-card>
      </div>

      <n-alert v-if="error" type="error" class="section-gap">
        {{ error }}
      </n-alert>

      <n-card class="panel-card log-card" title="MQTT 日志">
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
        <n-empty v-else description="连接、订阅、发布或接收消息后会显示日志" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NEmpty,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputGroup,
  NInputNumber,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import {
  buildConnectPacket,
  buildDisconnectPacket,
  buildPingReqPacket,
  buildPublishPacket,
  buildSubscribePacket,
  buildUnsubscribePacket,
  decodeMqttPacket,
  type MqttPacket
} from './mqtt'
import { useClipboard } from '@/composables/useClipboard'

const { copy } = useClipboard()

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'closed'
type LogDirection = 'system' | 'out' | 'in' | 'error'

interface LogItem {
  id: string
  time: string
  direction: LogDirection
  label: string
  content: string
  tagType: 'default' | 'info' | 'success' | 'warning' | 'error'
}

const protocolOptions = [
  { label: 'ws://', value: 'ws' },
  { label: 'wss://', value: 'wss' }
]

const versionOptions = [
  { label: 'MQTT 3.1', value: 3 },
  { label: 'MQTT 3.1.1', value: 4 },
  { label: 'MQTT 5.0', value: 5 }
]

const form = reactive({
  protocol: 'ws' as 'ws' | 'wss',
  host: 'broker.emqx.io:8083/mqtt',
  clientId: `toolbox_${Math.random().toString(16).slice(2, 10)}`,
  username: '',
  password: '',
  cleanSession: true,
  keepAlive: 60,
  protocolVersion: 5
})

const subscribeTopic = ref('toolbox/demo')
const publishTopic = ref('toolbox/demo')
const publishPayload = ref('hello mqtt')
const retain = ref(false)
const status = ref<ConnectionStatus>('idle')
const error = ref('')
const logs = ref<LogItem[]>([])
const subscribedTopics = ref<string[]>([])

let socket: WebSocket | null = null
let pingTimer: number | undefined
let packetId = 1
const pendingSubscriptions = new Map<number, string>()
const pendingUnsubscriptions = new Map<number, string>()

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

const getWebSocketUrl = (): string => {
  const host = form.host.trim()
  const wsProtocol = form.protocol
  return `${wsProtocol}://${host}`
}

const connect = () => {
  error.value = ''

  if (!form.host.trim()) {
    error.value = '请输入服务器地址'
    return
  }

  const targetUrl = getWebSocketUrl()

  if (!/^wss?:\/\//i.test(targetUrl)) {
    error.value = '无效的连接地址'
    return
  }

  if (!form.clientId.trim()) {
    error.value = 'Client ID 不能为空'
    return
  }

  disconnect(false)
  clearKeepAlive()
  status.value = 'connecting'
  appendLog('system', '连接', `正在连接 ${targetUrl}`)

  try {
    socket = new WebSocket(targetUrl, 'mqtt')
    socket.binaryType = 'arraybuffer'

    socket.addEventListener('open', () => {
      sendPacket(buildConnectPacket({
        clientId: form.clientId.trim(),
        username: form.username.trim(),
        password: form.password,
        cleanSession: form.cleanSession,
        keepAlive: form.keepAlive,
        protocolVersion: form.protocolVersion
      }))
      appendLog('out', 'CONNECT', `clientId=${form.clientId.trim()} cleanSession=${form.cleanSession} version=${form.protocolVersion}`)
    })

    socket.addEventListener('message', event => {
      if (!(event.data instanceof ArrayBuffer)) {
        appendLog('error', '错误', '收到非二进制 MQTT 数据')
        return
      }

      handlePacket(decodeMqttPacket(event.data))
    })

    socket.addEventListener('error', () => {
      error.value = 'MQTT WebSocket 连接发生错误，请检查地址、协议和 Broker WebSocket 配置'
      appendLog('error', '错误', error.value)
    })

    socket.addEventListener('close', event => {
      status.value = 'closed'
      clearKeepAlive()
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
  clearKeepAlive()

  if (!socket) {
    status.value = status.value === 'idle' ? 'idle' : 'closed'
    return
  }

  if (socket.readyState === WebSocket.OPEN) {
    sendPacket(buildDisconnectPacket())
  }

  if (writeLog) {
    appendLog('out', 'DISCONNECT', '主动关闭连接')
  }

  socket.close(1000, 'client disconnect')
  socket = null
  status.value = 'closed'
}

const handleDisconnect = () => {
  disconnect()
}

const subscribe = () => {
  error.value = ''
  const topic = subscribeTopic.value.trim()

  if (!topic) {
    error.value = '订阅 Topic 不能为空'
    return
  }

  if (!isConnected.value) {
    error.value = '请先连接 MQTT Broker'
    return
  }

  const id = nextPacketId()
  pendingSubscriptions.set(id, topic)
  sendPacket(buildSubscribePacket(id, topic))
  appendLog('out', 'SUBSCRIBE', `${topic} packetId=${id}`)
}

const unsubscribe = () => {
  error.value = ''
  const topic = subscribeTopic.value.trim()

  if (!topic) {
    error.value = '取消订阅的 Topic 不能为空'
    return
  }

  if (!isConnected.value) {
    error.value = '请先连接 MQTT Broker'
    return
  }

  const id = nextPacketId()
  pendingUnsubscriptions.set(id, topic)
  sendPacket(buildUnsubscribePacket(id, topic))
  appendLog('out', 'UNSUBSCRIBE', `${topic} packetId=${id}`)
}

const publish = () => {
  error.value = ''
  const topic = publishTopic.value.trim()

  if (!topic) {
    error.value = '发布 Topic 不能为空'
    return
  }

  if (!isConnected.value) {
    error.value = '请先连接 MQTT Broker'
    return
  }

  sendPacket(buildPublishPacket({
    topic,
    payload: publishPayload.value,
    retain: retain.value
  }))
  appendLog('out', 'PUBLISH', `${topic}\n${publishPayload.value}`)
}

const handlePacket = (packet: MqttPacket) => {
  switch (packet.type) {
    case 'connack':
      if (packet.returnCode === 0) {
        status.value = 'connected'
        appendLog('in', 'CONNACK', `${packet.returnMessage} sessionPresent=${packet.sessionPresent}`)
        startKeepAlive()
      } else {
        error.value = packet.returnMessage
        appendLog('error', 'CONNACK', packet.returnMessage)
        disconnect(false)
      }
      break
    case 'publish':
      appendLog('in', 'PUBLISH', `${packet.topic}\n${packet.payload}`)
      break
    case 'suback':
      handleSuback(packet.packetId, packet.grantedQos)
      break
    case 'unsuback':
      handleUnsuback(packet.packetId)
      break
    case 'pingresp':
      appendLog('in', 'PINGRESP', 'Broker keep alive 响应')
      break
    case 'puback':
      appendLog('in', 'PUBACK', `packetId=${packet.packetId}`)
      break
    case 'disconnect':
      appendLog('in', 'DISCONNECT', 'Broker 主动断开')
      disconnect(false)
      break
    default:
      appendLog('in', 'UNKNOWN', `packetType=${packet.packetType}`)
  }
}

const handleSuback = (id: number, grantedQos: number[]) => {
  const topic = pendingSubscriptions.get(id)
  pendingSubscriptions.delete(id)

  if (topic && !subscribedTopics.value.includes(topic)) {
    subscribedTopics.value.push(topic)
  }

  appendLog('in', 'SUBACK', `packetId=${id} topic=${topic || '-'} grantedQos=${grantedQos.join(',')}`)
}

const handleUnsuback = (id: number) => {
  const topic = pendingUnsubscriptions.get(id)
  pendingUnsubscriptions.delete(id)

  if (topic) {
    subscribedTopics.value = subscribedTopics.value.filter(item => item !== topic)
  }

  appendLog('in', 'UNSUBACK', `packetId=${id} topic=${topic || '-'}`)
}

const sendPacket = (packet: ArrayBuffer) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error('MQTT WebSocket 尚未连接')
  }

  socket.send(packet)
}

const startKeepAlive = () => {
  clearKeepAlive()
  pingTimer = window.setInterval(() => {
    if (!isConnected.value) {
      clearKeepAlive()
      return
    }
    sendPacket(buildPingReqPacket())
    appendLog('out', 'PINGREQ', '发送 keep alive')
  }, Math.max(10, form.keepAlive) * 1000)
}

const clearKeepAlive = () => {
  if (pingTimer !== undefined) {
    window.clearInterval(pingTimer)
    pingTimer = undefined
  }
}

const nextPacketId = () => {
  packetId = packetId >= 65535 ? 1 : packetId + 1
  return packetId
}

const loadDemo = () => {
  form.protocol = 'ws'
  form.host = 'broker.emqx.io:8083/mqtt'
  form.clientId = `toolbox_${Math.random().toString(16).slice(2, 10)}`
  form.username = ''
  form.password = ''
  form.cleanSession = true
  form.keepAlive = 60
  form.protocolVersion = 5
  subscribeTopic.value = 'toolbox/demo'
  publishTopic.value = 'toolbox/demo'
  publishPayload.value = 'hello mqtt'
  retain.value = false
}

const clearPayload = () => {
  publishPayload.value = ''
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
  grid-template-columns: minmax(320px, 0.86fr) minmax(460px, 1.14fr);
  gap: var(--spacing-md);
  align-items: start;
  margin-bottom: var(--spacing-md);
}

.panel-card {
  border-radius: var(--radius-md);
}

.section-gap {
  margin-bottom: var(--spacing-md);
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.status-box {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.topic-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.topic-list__label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.empty-text {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
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
  grid-template-columns: 84px 78px minmax(0, 1fr);
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
  border-left-color: var(--color-info);
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
