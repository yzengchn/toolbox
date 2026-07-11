import type { Component } from 'vue'

type ToolComponentModule = { default: Component }
type ToolComponentLoader = () => Promise<ToolComponentModule>

const toolComponentLoaders: Record<string, ToolComponentLoader> = {
  'base64-encoder': () => import('./encoding/Base64Encoder.vue'),
  'base64-image': () => import('./utilities/Base64ImageTool.vue'),
  'color-converter': () => import('./utilities/ColorConverter.vue'),
  'jwt-decoder': () => import('./encoding/JwtDecoder.vue'),
  'encryption-tool': () => import('./encoding/EncryptionTool.vue'),
  'hash-calculator': () => import('./encoding/HashCalculator.vue'),
  'subnet-calculator': () => import('./network/SubnetCalculator.vue'),
  'port-scanner': () => import('./network/PortScanner.vue'),
  'url-encoder': () => import('./network/UrlEncoder.vue'),
  'user-agent-parser': () => import('./network/UserAgentParser.vue'),
  'http-status': () => import('./network/HttpStatus.vue'),
  'password-generator': () => import('./utilities/PasswordGenerator.vue'),
  'regex-tester': () => import('./utilities/RegexTester.vue'),
  'uuid-generator': () => import('./utilities/UuidGenerator.vue'),
  'qrcode-generator': () => import('./utilities/QrCodeGenerator.vue'),
  'json-formatter': () => import('./formatter/JsonFormatter.vue'),
  'sql-formatter': () => import('./formatter/SqlFormatter.vue'),
  'xml-formatter': () => import('./formatter/XmlFormatter.vue'),
  'timestamp-converter': () => import('./time/TimestampConverter.vue'),
  'cron-parser': () => import('./time/CronParser.vue'),
  'jt808-jt809-parser': () => import('./vehicle-iot/Jt808Jt809Parser.vue'),
  'jt1078-stream-parser': () => import('./vehicle-iot/Jt1078StreamParser.vue'),
  'gb32960-parser': () => import('./vehicle-iot/Gb32960Parser.vue'),
  'gbt27930-parser': () => import('./vehicle-iot/Gbt27930Parser.vue'),
  'ocpp-message-tool': () => import('./vehicle-iot/OcppMessageTool.vue'),
  'vehicle-message-builder': () => import('./vehicle-iot/VehicleMessageBuilder.vue'),
  'vin-decoder': () => import('./vehicle-iot/VinDecoder.vue'),
  'j1939-id-calculator': () => import('./vehicle-iot/J1939IdCalculator.vue'),
  'can-j1939-decoder': () => import('./vehicle-iot/CanJ1939Decoder.vue'),
  'can-signal-chart': () => import('./vehicle-iot/CanSignalChartAnalyzer.vue'),
  'obd-uds-diagnostic': () => import('./vehicle-iot/ObdUdsDiagnostic.vue'),
  'track-map-viewer': () => import('./vehicle-iot/TrackMapViewer.vue'),
  'coordinate-converter': () => import('./vehicle-iot/CoordinateConverter.vue'),
  'geohash-tool': () => import('./vehicle-iot/GeoHashTool.vue'),
  'vehicle-log-timeline': () => import('./vehicle-iot/VehicleLogTimelineTool.vue'),
  'websocket-client': () => import('./connection/WebSocketClient.vue'),
  'mqtt-client': () => import('./connection/MqttClient.vue'),
  'text-diff': () => import('./file/TextCompare.vue'),
  'file-dedup': () => import('./file/FileDedup.vue'),
  'tree-generator': () => import('./file/TreeGenerator.vue')
}

const loadedToolComponents = new Map<string, Promise<Component | undefined>>()

export function hasToolComponentLoader(id: string): boolean {
  return id in toolComponentLoaders
}

export function loadToolComponent(id: string): Promise<Component | undefined> {
  const cached = loadedToolComponents.get(id)
  if (cached) {
    return cached
  }

  const loader = toolComponentLoaders[id]
  if (!loader) {
    return Promise.resolve(undefined)
  }

  const componentPromise = loader()
    .then(module => module.default)
    .catch((error) => {
      loadedToolComponents.delete(id)
      throw error
    })

  loadedToolComponents.set(id, componentPromise)
  return componentPromise
}

export async function preloadToolComponent(id: string): Promise<void> {
  await loadToolComponent(id)
}
