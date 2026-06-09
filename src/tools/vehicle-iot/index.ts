import { defineAsyncComponent, type Component } from 'vue'

const loadVehicleIotTools = () => import('./components')

const Jt808Jt809Parser = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.Jt808Jt809Parser))
const GeoHashTool = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.GeoHashTool))
const CoordinateConverter = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.CoordinateConverter))
const TrackMapViewer = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.TrackMapViewer))
const Gb32960Parser = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.Gb32960Parser))
const CanJ1939Decoder = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.CanJ1939Decoder))
const J1939IdCalculator = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.J1939IdCalculator))
const Jt1078StreamParser = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.Jt1078StreamParser))
const VehicleMessageBuilder = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.VehicleMessageBuilder))
const VinDecoder = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.VinDecoder))
const CanSignalChartAnalyzer = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.CanSignalChartAnalyzer))
const ObdUdsDiagnostic = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.ObdUdsDiagnostic))
const Gbt27930Parser = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.Gbt27930Parser))
const OcppMessageTool = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.OcppMessageTool))
const VehicleLogTimelineTool = defineAsyncComponent(() => loadVehicleIotTools().then(module => module.VehicleLogTimelineTool))

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
