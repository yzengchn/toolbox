import { defineAsyncComponent, type Component } from 'vue'

const Jt808Jt809Parser = defineAsyncComponent(() => import('./Jt808Jt809Parser.vue'))
const GeoHashTool = defineAsyncComponent(() => import('./GeoHashTool.vue'))
const CoordinateConverter = defineAsyncComponent(() => import('./CoordinateConverter.vue'))
const TrackMapViewer = defineAsyncComponent(() => import('./TrackMapViewer.vue'))
const Gb32960Parser = defineAsyncComponent(() => import('./Gb32960Parser.vue'))
const CanJ1939Decoder = defineAsyncComponent(() => import('./CanJ1939Decoder.vue'))
const J1939IdCalculator = defineAsyncComponent(() => import('./J1939IdCalculator.vue'))
const Jt1078StreamParser = defineAsyncComponent(() => import('./Jt1078StreamParser.vue'))
const VehicleMessageBuilder = defineAsyncComponent(() => import('./VehicleMessageBuilder.vue'))
const VinDecoder = defineAsyncComponent(() => import('./VinDecoder.vue'))
const CanSignalChartAnalyzer = defineAsyncComponent(() => import('./CanSignalChartAnalyzer.vue'))
const ObdUdsDiagnostic = defineAsyncComponent(() => import('./ObdUdsDiagnostic.vue'))
const Gbt27930Parser = defineAsyncComponent(() => import('./Gbt27930Parser.vue'))
const OcppMessageTool = defineAsyncComponent(() => import('./OcppMessageTool.vue'))
const VehicleLogTimelineTool = defineAsyncComponent(() => import('./VehicleLogTimelineTool.vue'))

export const vehicleIotToolComponents = {
  'jt808-jt809-parser': Jt808Jt809Parser,
  'gb32960-parser': Gb32960Parser,
  'gbt27930-parser': Gbt27930Parser,
  'ocpp-message-tool': OcppMessageTool,
  'jt1078-stream-parser': Jt1078StreamParser,
  'vehicle-message-builder': VehicleMessageBuilder,
  'vin-decoder': VinDecoder,
  'j1939-id-calculator': J1939IdCalculator,
  'can-j1939-decoder': CanJ1939Decoder,
  'can-signal-chart': CanSignalChartAnalyzer,
  'obd-uds-diagnostic': ObdUdsDiagnostic,
  'coordinate-converter': CoordinateConverter,
  'geohash-tool': GeoHashTool,
  'track-map-viewer': TrackMapViewer,
  'vehicle-log-timeline': VehicleLogTimelineTool
} satisfies Record<string, Component>
