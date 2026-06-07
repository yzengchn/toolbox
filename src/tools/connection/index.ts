import type { Tool } from '@/types'
import { defineAsyncComponent } from 'vue'

const loadConnectionTools = () => import('./components')

const WebSocketClient = defineAsyncComponent(() => loadConnectionTools().then(module => module.WebSocketClient))
const MqttClient = defineAsyncComponent(() => loadConnectionTools().then(module => module.MqttClient))

export const connectionTools: Tool[] = [
  {
    id: 'websocket-client',
    name: 'WebSocket 连接',
    description: '连接 WebSocket 服务，发送消息并查看收发日志',
    icon: 'mdi:web',
    category: 'connection',
    keywords: ['websocket', 'ws', 'wss', 'socket', '连接', '调试', '消息'],
    component: WebSocketClient,
    path: '/tool/websocket-client'
  },
  {
    id: 'mqtt-client',
    name: 'MQTT 连接',
    description: '通过 MQTT over WebSocket 连接 Broker，订阅主题并发布消息',
    icon: 'mdi:access-point-network',
    category: 'connection',
    keywords: ['mqtt', 'broker', 'topic', 'publish', 'subscribe', '物联网', '连接'],
    component: MqttClient,
    path: '/tool/mqtt-client'
  }
]
