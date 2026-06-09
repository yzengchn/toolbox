import { defineAsyncComponent, type Component } from 'vue'

const loadConnectionTools = () => import('./components')

const WebSocketClient = defineAsyncComponent(() => loadConnectionTools().then(module => module.WebSocketClient))
const MqttClient = defineAsyncComponent(() => loadConnectionTools().then(module => module.MqttClient))

export const connectionToolComponents = {
  'websocket-client': WebSocketClient,
  'mqtt-client': MqttClient
} satisfies Record<string, Component>
