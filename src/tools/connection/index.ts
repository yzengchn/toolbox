import { defineAsyncComponent, type Component } from 'vue'

const WebSocketClient = defineAsyncComponent(() => import('./WebSocketClient.vue'))
const MqttClient = defineAsyncComponent(() => import('./MqttClient.vue'))

export const connectionToolComponents = {
  'websocket-client': WebSocketClient,
  'mqtt-client': MqttClient
} satisfies Record<string, Component>
