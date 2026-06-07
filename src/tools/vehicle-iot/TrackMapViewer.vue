<template>
  <div class="tool-container">
    <ToolHeader
      title="轨迹点分析"
      description="坐标转换、轨迹压缩、电子围栏、停留点、超速、里程、漂移和 NMEA 解析"
    />

    <div class="tool-content">
      <div class="workbench-grid">
        <section class="input-rail">
          <n-tabs type="line" animated>
            <n-tab-pane name="track" tab="轨迹输入">
              <n-card class="panel-card" title="经纬度列表">
                <n-space vertical :size="14">
                  <n-grid cols="1 s:2" responsive="screen" :x-gap="12" :y-gap="12">
                    <n-grid-item>
                      <n-form-item label="输入坐标系">
                        <n-select v-model:value="sourceSystem" :options="coordinateSystemOptions" />
                      </n-form-item>
                    </n-grid-item>
                    <n-grid-item>
                      <n-form-item label="输出坐标系">
                        <n-select v-model:value="outputSystem" :options="coordinateSystemOptions" />
                      </n-form-item>
                    </n-grid-item>
                  </n-grid>

                  <n-input
                    v-model:value="trackInput"
                    type="textarea"
                    placeholder="每行一个点，支持：lat,lng,13位毫秒时间戳,speed:60，也支持 lng lat、lat:39.9,lng:116.4"
                    :rows="12"
                    clearable
                  />

                  <div class="actions-row">
                    <n-button type="primary" @click="handleAnalyzeTrack">分析轨迹</n-button>
                    <n-button @click="loadTrackDemo">示例</n-button>
                    <n-button @click="handleClear">清空</n-button>
                    <n-button :disabled="!points.length" @click="handleCenterMap">居中</n-button>
                  </div>

                  <n-alert v-if="points.length" type="success" :bordered="false">
                    已载入 {{ points.length }} 个轨迹点，地图按 WGS84 展示。
                  </n-alert>
                </n-space>
              </n-card>
            </n-tab-pane>

            <n-tab-pane name="nmea" tab="NMEA">
              <n-card class="panel-card" title="GGA/RMC 解析">
                <n-space vertical :size="14">
                  <n-input
                    v-model:value="nmeaInput"
                    type="textarea"
                    placeholder="粘贴 NMEA GGA/RMC 语句"
                    :rows="12"
                    clearable
                  />

                  <div class="actions-row">
                    <n-button type="primary" @click="handleParseNmea">解析并导入</n-button>
                    <n-button @click="loadNmeaDemo">示例</n-button>
                    <n-button @click="nmeaInput = ''">清空</n-button>
                  </div>

                  <div v-if="nmeaRows.length" class="nmea-log">
                    <div
                      v-for="row in nmeaRows"
                      :key="row.line"
                      class="nmea-row"
                      :class="{ 'nmea-row--invalid': row.status === 'invalid' }"
                    >
                      <span>#{{ row.line }}</span>
                      <n-tag size="small" :type="row.status === 'valid' ? 'success' : 'warning'">
                        {{ row.type }}
                      </n-tag>
                      <span>{{ row.message }}</span>
                    </div>
                  </div>
                </n-space>
              </n-card>
            </n-tab-pane>

            <n-tab-pane name="fence" tab="电子围栏">
              <n-card class="panel-card" title="围栏配置">
                <n-space vertical :size="14">
                  <n-grid cols="1 s:2" responsive="screen" :x-gap="12" :y-gap="12">
                    <n-grid-item>
                      <n-form-item label="围栏类型">
                        <n-select v-model:value="fenceMode" :options="fenceModeOptions" />
                      </n-form-item>
                    </n-grid-item>
                    <n-grid-item>
                      <n-form-item label="围栏坐标系">
                        <n-select v-model:value="fenceSystem" :options="coordinateSystemOptions" />
                      </n-form-item>
                    </n-grid-item>
                  </n-grid>

                  <template v-if="fenceMode === 'circle'">
                    <n-form-item label="圆心经纬度">
                      <n-input v-model:value="fenceCenterInput" placeholder="39.9042,116.4074" />
                    </n-form-item>
                    <n-form-item label="半径">
                      <n-input-number
                        v-model:value="fenceRadiusMeters"
                        :min="10"
                        :step="50"
                        style="width: 100%"
                      >
                        <template #suffix>m</template>
                      </n-input-number>
                    </n-form-item>
                  </template>

                  <template v-else>
                    <n-form-item label="多边形顶点">
                      <n-input
                        v-model:value="fencePolygonInput"
                        type="textarea"
                        placeholder="每行一个顶点，首尾不用重复"
                        :rows="8"
                      />
                    </n-form-item>
                  </template>

                  <div class="actions-row">
                    <n-button type="primary" :disabled="!points.length" @click="handleAnalyzeFence">
                      分析围栏
                    </n-button>
                    <n-button @click="loadFenceDemo">示例围栏</n-button>
                  </div>

                  <n-alert v-if="fenceResult" type="info" :bordered="false">
                    围栏内 {{ fenceResult.insideCount }} 点，围栏外 {{ fenceResult.outsideCount }} 点，穿越 {{ fenceResult.transitions.length }} 次。
                  </n-alert>
                </n-space>
              </n-card>
            </n-tab-pane>

            <n-tab-pane name="settings" tab="分析参数">
              <n-card class="panel-card" title="阈值设置">
                <n-space vertical :size="14">
                  <n-grid cols="1 s:2" responsive="screen" :x-gap="12" :y-gap="12">
                    <n-grid-item>
                      <n-form-item label="压缩容差">
                        <n-input-number
                          v-model:value="compressionToleranceMeters"
                          :min="1"
                          :step="5"
                          style="width: 100%"
                        >
                          <template #suffix>m</template>
                        </n-input-number>
                      </n-form-item>
                    </n-grid-item>
                    <n-grid-item>
                      <n-form-item label="超速阈值">
                        <n-input-number
                          v-model:value="speedLimitKmh"
                          :min="1"
                          :step="5"
                          style="width: 100%"
                        >
                          <template #suffix>km/h</template>
                        </n-input-number>
                      </n-form-item>
                    </n-grid-item>
                    <n-grid-item>
                      <n-form-item label="停留半径">
                        <n-input-number
                          v-model:value="stopRadiusMeters"
                          :min="5"
                          :step="5"
                          style="width: 100%"
                        >
                          <template #suffix>m</template>
                        </n-input-number>
                      </n-form-item>
                    </n-grid-item>
                    <n-grid-item>
                      <n-form-item label="最短停留">
                        <n-input-number
                          v-model:value="stopMinMinutes"
                          :min="1"
                          :step="1"
                          style="width: 100%"
                        >
                          <template #suffix>min</template>
                        </n-input-number>
                      </n-form-item>
                    </n-grid-item>
                    <n-grid-item>
                      <n-form-item label="漂移速度">
                        <n-input-number
                          v-model:value="driftMaxSpeedKmh"
                          :min="20"
                          :step="10"
                          style="width: 100%"
                        >
                          <template #suffix>km/h</template>
                        </n-input-number>
                      </n-form-item>
                    </n-grid-item>
                    <n-grid-item>
                      <n-form-item label="跳变距离">
                        <n-input-number
                          v-model:value="driftMinJumpMeters"
                          :min="10"
                          :step="50"
                          style="width: 100%"
                        >
                          <template #suffix>m</template>
                        </n-input-number>
                      </n-form-item>
                    </n-grid-item>
                  </n-grid>

                  <n-divider />

                  <div class="switch-list">
                    <n-switch v-model:value="showCompressedLayer">显示压缩轨迹</n-switch>
                    <n-switch v-model:value="showStopLayer">显示停留点</n-switch>
                    <n-switch v-model:value="showAnomalyLayer">显示异常段</n-switch>
                    <n-switch v-model:value="showFenceLayer">显示电子围栏</n-switch>
                  </div>
                </n-space>
              </n-card>
            </n-tab-pane>
          </n-tabs>

          <n-alert v-if="error" type="error" class="section-gap">
            {{ error }}
          </n-alert>
        </section>

        <section class="map-column">
          <div class="metric-grid">
            <div class="metric-tile">
              <span class="metric-label">点数</span>
              <strong>{{ summary.pointCount }}</strong>
            </div>
            <div class="metric-tile">
              <span class="metric-label">里程</span>
              <strong>{{ formatDistance(summary.totalDistanceMeters) }}</strong>
            </div>
            <div class="metric-tile">
              <span class="metric-label">时长</span>
              <strong>{{ formatDuration(summary.durationSeconds) }}</strong>
            </div>
            <div class="metric-tile">
              <span class="metric-label">最高段速</span>
              <strong>{{ formatSpeed(summary.maxSegmentSpeedKmh) }}</strong>
            </div>
          </div>

          <n-card class="map-card" title="轨迹地图">
            <template #header-extra>
              <n-space>
                <n-button text :disabled="!points.length" @click="copyConvertedOutput">复制转换结果</n-button>
                <n-button text :disabled="!compressedPoints.length" @click="copyCompressedOutput">复制压缩结果</n-button>
              </n-space>
            </template>

            <div ref="mapContainer" class="map-container"></div>

            <div class="map-legend">
              <span><i class="legend-line legend-line--track"></i>原始轨迹</span>
              <span><i class="legend-line legend-line--compressed"></i>压缩轨迹</span>
              <span><i class="legend-dot legend-dot--stop"></i>停留点</span>
              <span><i class="legend-dot legend-dot--alert"></i>超速/漂移</span>
            </div>

            <n-alert v-if="mapError" type="error" class="section-gap">
              {{ mapError }}
            </n-alert>
          </n-card>
        </section>
      </div>

      <div class="analysis-grid">
        <n-card class="panel-card" title="坐标转换">
          <n-space vertical :size="12">
            <div class="analysis-meta">
              <n-tag size="small">{{ sourceSystemLabel }} -> {{ outputSystemLabel }}</n-tag>
              <n-text depth="3">批量输出保留时间和速度字段</n-text>
            </div>
            <n-input
              :value="convertedOutput"
              type="textarea"
              :rows="7"
              readonly
              placeholder="分析轨迹后生成坐标转换结果"
            />
          </n-space>
        </n-card>

        <n-card class="panel-card" title="轨迹压缩">
          <n-space vertical :size="12">
            <div class="analysis-meta">
              <n-tag size="small" type="success">{{ compressedPoints.length }} / {{ points.length }} 点</n-tag>
              <n-text depth="3">保留率 {{ compressionRatio }}</n-text>
            </div>
            <n-input
              :value="compressedOutput"
              type="textarea"
              :rows="7"
              readonly
              placeholder="按 RDP 算法生成压缩后的轨迹点"
            />
          </n-space>
        </n-card>

        <n-card class="panel-card" title="停留点">
          <div v-if="stopPoints.length" class="event-list">
            <div v-for="(stop, index) in stopPoints" :key="`${stop.start.id}-${stop.end.id}`" class="event-row">
              <n-tag size="small" type="info">停留 {{ index + 1 }}</n-tag>
              <div>
                <strong>{{ formatCoordinate(stop.center) }}</strong>
                <span>{{ formatDuration(stop.durationSeconds) }}，{{ stop.pointCount }} 点，半径 {{ stop.radiusMeters.toFixed(0) }} m</span>
              </div>
            </div>
          </div>
          <n-empty v-else description="需要带时间戳的轨迹点才能识别停留" />
        </n-card>

        <n-card class="panel-card" title="超速与漂移">
          <div v-if="speedingEvents.length || driftPoints.length" class="event-list">
            <div
              v-for="event in speedingEvents.slice(0, 6)"
              :key="`speed-${event.from.id}-${event.to.id}`"
              class="event-row"
            >
              <n-tag size="small" type="error">超速</n-tag>
              <div>
                <strong>{{ event.from.id }} -> {{ event.to.id }}，{{ event.speedKmh.toFixed(1) }} km/h</strong>
                <span>{{ formatDistance(event.distanceMeters) }}，{{ formatDuration(event.durationSeconds) }}</span>
              </div>
            </div>
            <div
              v-for="drift in driftPoints.slice(0, 6)"
              :key="`drift-${drift.previous.id}-${drift.point.id}`"
              class="event-row"
            >
              <n-tag size="small" type="warning">漂移</n-tag>
              <div>
                <strong>{{ drift.previous.id }} -> {{ drift.point.id }}</strong>
                <span>{{ drift.reason }}，{{ formatDistance(drift.distanceMeters) }}</span>
              </div>
            </div>
          </div>
          <n-empty v-else description="暂无超速或漂移异常" />
        </n-card>

        <n-card class="panel-card" title="电子围栏">
          <div v-if="fenceResult" class="fence-result">
            <div class="fence-kpis">
              <span>内：{{ fenceResult.insideCount }}</span>
              <span>外：{{ fenceResult.outsideCount }}</span>
              <span>穿越：{{ fenceResult.transitions.length }}</span>
            </div>
            <div v-if="fenceResult.transitions.length" class="event-list">
              <div
                v-for="(transition, index) in fenceResult.transitions.slice(0, 8)"
                :key="`${transition.from.id}-${transition.to.id}-${index}`"
                class="event-row"
              >
                <n-tag size="small" :type="transition.type === 'enter' ? 'success' : 'warning'">
                  {{ transition.type === 'enter' ? '进入' : '离开' }}
                </n-tag>
                <div>
                  <strong>{{ transition.from.id }} -> {{ transition.to.id }}</strong>
                  <span>{{ formatCoordinate(transition.to) }}</span>
                </div>
              </div>
            </div>
            <n-text v-else depth="3">轨迹未穿越围栏边界。</n-text>
          </div>
          <n-empty v-else description="配置围栏并点击分析围栏" />
        </n-card>

        <n-card class="panel-card" title="分段明细">
          <div v-if="segmentRows.length" class="segment-table">
            <div class="segment-head">
              <span>段</span>
              <span>距离</span>
              <span>时长</span>
              <span>速度</span>
            </div>
            <div
              v-for="segment in segmentRows"
              :key="segment.key"
              class="segment-row"
            >
              <span>{{ segment.key }}</span>
              <span>{{ segment.distance }}</span>
              <span>{{ segment.duration }}</span>
              <span>{{ segment.speed }}</span>
            </div>
          </div>
          <n-empty v-else description="至少需要两个轨迹点" />
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDivider,
  NEmpty,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NText
} from 'naive-ui'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { formatNmeaDate, todayAt } from '@/utils/demoTime'
import {
  analyzeCircleFence,
  analyzePolygonFence,
  buildTrackSegments,
  compressTrack,
  convertCoordinate,
  detectDriftPoints,
  detectSpeeding,
  detectStops,
  formatCoordinate,
  parseCoordinateLine,
  parseFencePolygon,
  parseNmeaLines,
  parseTrackPoints,
  summarizeTrack,
  type Coordinate,
  type CoordinateSystem,
  type FenceAnalysis,
  type NmeaParseResult,
  type TrackPoint
} from './utils'

type FenceMode = 'circle' | 'polygon'

const { copy } = useClipboard()

const coordinateSystemOptions = [
  { label: 'WGS84 GPS', value: 'wgs84' },
  { label: 'GCJ02 国测局', value: 'gcj02' },
  { label: 'BD09 百度', value: 'bd09' }
]

const fenceModeOptions = [
  { label: '圆形围栏', value: 'circle' },
  { label: '多边形围栏', value: 'polygon' }
]

const trackInput = ref('')
const nmeaInput = ref('')
const sourceSystem = ref<CoordinateSystem>('wgs84')
const outputSystem = ref<CoordinateSystem>('gcj02')
const fenceSystem = ref<CoordinateSystem>('wgs84')
const fenceMode = ref<FenceMode>('circle')
const fenceCenterInput = ref('39.904350,116.401980')
const fenceRadiusMeters = ref(450)
const fencePolygonInput = ref('')
const compressionToleranceMeters = ref(35)
const stopRadiusMeters = ref(80)
const stopMinMinutes = ref(3)
const speedLimitKmh = ref(80)
const driftMaxSpeedKmh = ref(160)
const driftMinJumpMeters = ref(500)
const showCompressedLayer = ref(true)
const showStopLayer = ref(true)
const showAnomalyLayer = ref(true)
const showFenceLayer = ref(true)
const points = ref<TrackPoint[]>([])
const nmeaRows = ref<NmeaParseResult['rows']>([])
const fenceResult = ref<FenceAnalysis | null>(null)
const error = ref('')
const mapError = ref('')
const mapContainer = ref<HTMLElement | null>(null)

let map: L.Map | null = null
let trackLayer: L.LayerGroup | null = null
let analysisLayer: L.LayerGroup | null = null
let fenceLayer: L.LayerGroup | null = null

const summary = computed(() => summarizeTrack(points.value))
const segments = computed(() => buildTrackSegments(points.value))
const compressedPoints = computed(() => compressTrack(points.value, compressionToleranceMeters.value))
const stopPoints = computed(() => detectStops(points.value, stopRadiusMeters.value, stopMinMinutes.value * 60))
const speedingEvents = computed(() => detectSpeeding(points.value, speedLimitKmh.value))
const driftPoints = computed(() => detectDriftPoints(points.value, driftMaxSpeedKmh.value, driftMinJumpMeters.value))

const sourceSystemLabel = computed(() => getSystemLabel(sourceSystem.value))
const outputSystemLabel = computed(() => getSystemLabel(outputSystem.value))

const convertedOutput = computed(() => {
  if (!points.value.length) return ''
  return points.value
    .map(point => formatPointForOutput(point, pointsToSystem(point, outputSystem.value)))
    .join('\n')
})

const compressedOutput = computed(() => {
  if (!compressedPoints.value.length) return ''
  return compressedPoints.value
    .map(point => formatPointForOutput(point, pointsToSystem(point, outputSystem.value)))
    .join('\n')
})

const compressionRatio = computed(() => {
  if (!points.value.length) return '-'
  return `${(compressedPoints.value.length / points.value.length * 100).toFixed(1)}%`
})

const segmentRows = computed(() => {
  return segments.value.slice(0, 12).map(segment => ({
    key: `${segment.from.id}-${segment.to.id}`,
    distance: formatDistance(segment.distanceMeters),
    duration: formatDuration(segment.durationSeconds),
    speed: formatSpeed(segment.speedKmh)
  }))
})

const initMap = () => {
  if (!mapContainer.value || map) return

  try {
    map = L.map(mapContainer.value, {
      preferCanvas: true,
      zoomControl: true
    }).setView([39.9042, 116.4074], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    trackLayer = L.layerGroup().addTo(map)
    analysisLayer = L.layerGroup().addTo(map)
    fenceLayer = L.layerGroup().addTo(map)

    map.on('click', event => {
      const mouseEvent = event as L.LeafletMouseEvent
      appendMapPoint(mouseEvent.latlng.lat, mouseEvent.latlng.lng)
    })
  } catch (err) {
    mapError.value = `地图初始化失败: ${(err as Error).message}`
  }
}

const updateMap = () => {
  if (!map || !trackLayer || !analysisLayer || !fenceLayer) return

  const currentTrackLayer = trackLayer
  const currentAnalysisLayer = analysisLayer
  const currentFenceLayer = fenceLayer

  currentTrackLayer.clearLayers()
  currentAnalysisLayer.clearLayers()
  currentFenceLayer.clearLayers()

  if (!points.value.length) {
    drawFenceLayer()
    return
  }

  const latLngs = points.value.map(point => L.latLng(point.lat, point.lng))

  if (latLngs.length > 1) {
    L.polyline(latLngs, {
      color: '#1d9bf0',
      weight: 4,
      opacity: 0.82
    }).addTo(currentTrackLayer)
  }

  drawTrackPoints()
  drawAnalysisLayers()
  drawFenceLayer()
}

const drawTrackPoints = () => {
  if (!trackLayer) return
  const currentTrackLayer = trackLayer
  const renderAll = points.value.length <= 80
  points.value.forEach((point, index) => {
    if (!renderAll && index !== 0 && index !== points.value.length - 1) return
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: index === 0 || index === points.value.length - 1 ? 6 : 4,
      color: index === 0 ? '#00ba7c' : index === points.value.length - 1 ? '#f0a23a' : '#1d9bf0',
      fillColor: index === 0 ? '#00ba7c' : index === points.value.length - 1 ? '#f0a23a' : '#ffffff',
      fillOpacity: 0.92,
      weight: 2
    }).addTo(currentTrackLayer)
    marker.bindPopup(buildPointPopup(point, index))
  })
}

const drawAnalysisLayers = () => {
  if (!analysisLayer) return
  const currentAnalysisLayer = analysisLayer

  if (showCompressedLayer.value && compressedPoints.value.length > 1 && compressedPoints.value.length < points.value.length) {
    L.polyline(compressedPoints.value.map(point => [point.lat, point.lng]), {
      color: '#00ba7c',
      weight: 3,
      opacity: 0.85,
      dashArray: '8 8'
    }).addTo(currentAnalysisLayer)
  }

  if (showStopLayer.value) {
    stopPoints.value.forEach((stop, index) => {
      L.circle([stop.center.lat, stop.center.lng], {
        radius: Math.max(stop.radiusMeters, stopRadiusMeters.value),
        color: '#35c982',
        fillColor: '#35c982',
        fillOpacity: 0.12,
        weight: 2
      }).addTo(currentAnalysisLayer)
      L.circleMarker([stop.center.lat, stop.center.lng], {
        radius: 7,
        color: '#35c982',
        fillColor: '#35c982',
        fillOpacity: 0.9,
        weight: 2
      })
        .bindPopup(`停留 ${index + 1}<br>${formatCoordinate(stop.center)}<br>${formatDuration(stop.durationSeconds)}`)
        .addTo(currentAnalysisLayer)
    })
  }

  if (showAnomalyLayer.value) {
    speedingEvents.value.forEach(event => {
      L.polyline([[event.from.lat, event.from.lng], [event.to.lat, event.to.lng]], {
        color: '#f4212e',
        weight: 5,
        opacity: 0.78
      }).addTo(currentAnalysisLayer)
    })

    driftPoints.value.forEach(drift => {
      L.circleMarker([drift.point.lat, drift.point.lng], {
        radius: 8,
        color: '#f0a23a',
        fillColor: '#f0a23a',
        fillOpacity: 0.9,
        weight: 2
      })
        .bindPopup(`漂移点 ${drift.point.id}<br>${drift.reason}`)
        .addTo(currentAnalysisLayer)
    })
  }
}

const drawFenceLayer = () => {
  if (!fenceLayer || !showFenceLayer.value) return
  const currentFenceLayer = fenceLayer

  try {
    if (fenceMode.value === 'circle') {
      const center = readFenceCenter()
      L.circle([center.lat, center.lng], {
        radius: fenceRadiusMeters.value,
        color: '#536471',
        fillColor: '#536471',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 6'
      }).addTo(currentFenceLayer)
    } else {
      const polygon = readFencePolygon()
      if (polygon.length >= 3) {
        L.polygon(polygon.map(point => [point.lat, point.lng]), {
          color: '#536471',
          fillColor: '#536471',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '6 6'
        }).addTo(currentFenceLayer)
      }
    }
  } catch {
    return
  }
}

const handleAnalyzeTrack = async () => {
  error.value = ''
  fenceResult.value = null

  if (!trackInput.value.trim()) {
    error.value = '请输入轨迹坐标'
    return
  }

  try {
    const parsed = parseTrackPoints(trackInput.value)
    points.value = parsed.map(point => convertTrackPoint(point, sourceSystem.value, 'wgs84'))
    await nextTick()
    updateMap()
    handleCenterMap()
  } catch (err) {
    error.value = (err as Error).message
  }
}

const handleParseNmea = async () => {
  error.value = ''
  fenceResult.value = null

  if (!nmeaInput.value.trim()) {
    error.value = '请输入 NMEA 语句'
    return
  }

  const result = parseNmeaLines(nmeaInput.value)
  nmeaRows.value = result.rows

  if (!result.points.length) {
    error.value = '未从 NMEA 中解析到有效 GGA/RMC 定位点'
    return
  }

  sourceSystem.value = 'wgs84'
  points.value = result.points
  trackInput.value = result.points.map(point => formatPointForOutput(point, point)).join('\n')
  await nextTick()
  updateMap()
  handleCenterMap()
}

const handleAnalyzeFence = () => {
  error.value = ''

  if (!points.value.length) {
    error.value = '请先导入轨迹点'
    return
  }

  try {
    fenceResult.value = fenceMode.value === 'circle'
      ? analyzeCircleFence(points.value, readFenceCenter(), fenceRadiusMeters.value)
      : analyzePolygonFence(points.value, readFencePolygon())
    updateMap()
  } catch (err) {
    error.value = (err as Error).message
  }
}

const handleClear = () => {
  trackInput.value = ''
  nmeaInput.value = ''
  nmeaRows.value = []
  points.value = []
  fenceResult.value = null
  error.value = ''
  updateMap()
}

const handleCenterMap = () => {
  if (!map || !points.value.length) return
  if (points.value.length === 1) {
    map.setView([points.value[0].lat, points.value[0].lng], 14)
    return
  }
  const bounds = L.latLngBounds(points.value.map(point => [point.lat, point.lng]))
  map.fitBounds(bounds, { padding: [42, 42] })
}

const appendMapPoint = (lat: number, lng: number) => {
  const nextPoint: TrackPoint = {
    id: points.value.length + 1,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    sourceLine: `${lat},${lng}`
  }

  points.value = [...points.value, nextPoint]
  trackInput.value = points.value
    .map(point => formatPointForOutput(point, pointsToSystem(point, sourceSystem.value)))
    .join('\n')
  fenceResult.value = null
  updateMap()
}

const loadTrackDemo = async () => {
  sourceSystem.value = 'wgs84'
  outputSystem.value = 'gcj02'
  const baseTimestamp = todayAt(9).getTime()
  const rows = [
    ['39.903740,116.397827', 0, 18],
    ['39.904120,116.398980', 60_000, 22],
    ['39.904220,116.400380', 120_000, 26],
    ['39.904260,116.401360', 390_000, 0],
    ['39.904280,116.401390', 510_000, 0],
    ['39.904900,116.402900', 570_000, 34],
    ['39.905500,116.404200', 630_000, 42],
    ['39.914900,116.421800', 660_000, 180],
    ['39.906300,116.406100', 750_000, 40],
    ['39.906820,116.407220', 810_000, 38]
  ] as const
  trackInput.value = rows
    .map(([coordinate, offset, speed]) => `${coordinate},${baseTimestamp + offset},speed:${speed}`)
    .join('\n')
  await handleAnalyzeTrack()
  loadFenceDemo()
  handleAnalyzeFence()
}

const loadNmeaDemo = () => {
  const date = formatNmeaDate()
  nmeaInput.value = [
    buildNmeaSentence(`GPRMC,092204.999,A,3954.2994,N,11623.8696,E,12.3,0.0,${date},,,A`),
    buildNmeaSentence('GPGGA,092205.000,3954.3021,N,11623.8742,E,1,10,0.9,50.0,M,-5.0,M,,'),
    buildNmeaSentence(`GPRMC,092305.000,A,3954.3530,N,11623.9580,E,28.0,0.0,${date},,,A`),
    buildNmeaSentence(`GPRMC,092405.000,A,3954.4140,N,11624.0820,E,35.0,0.0,${date},,,A`)
  ].join('\n')
}

const buildNmeaSentence = (body: string): string => {
  const checksum = [...body].reduce((sum, char) => sum ^ char.charCodeAt(0), 0)
  return `$${body}*${checksum.toString(16).toUpperCase().padStart(2, '0')}`
}

const loadFenceDemo = () => {
  fenceMode.value = 'circle'
  fenceSystem.value = 'wgs84'
  fenceCenterInput.value = '39.904350,116.401980'
  fenceRadiusMeters.value = 520
  fencePolygonInput.value = [
    '39.903500,116.397400',
    '39.906500,116.398900',
    '39.907100,116.406700',
    '39.904000,116.407800',
    '39.902800,116.401200'
  ].join('\n')
  updateMap()
}

const copyConvertedOutput = () => {
  copy(convertedOutput.value)
}

const copyCompressedOutput = () => {
  copy(compressedOutput.value)
}

const convertTrackPoint = (point: TrackPoint, from: CoordinateSystem, to: CoordinateSystem): TrackPoint => {
  const converted = convertCoordinate(point, from, to)
  return {
    ...point,
    lat: converted.lat,
    lng: converted.lng
  }
}

const pointsToSystem = (point: TrackPoint, system: CoordinateSystem): Coordinate => {
  return convertCoordinate(point, 'wgs84', system)
}

const readFenceCenter = (): Coordinate => {
  const center = parseCoordinateLine(fenceCenterInput.value, 1)
  return convertCoordinate(center, fenceSystem.value, 'wgs84')
}

const readFencePolygon = (): Coordinate[] => {
  const polygon = parseFencePolygon(fencePolygonInput.value)
  if (polygon.length < 3) throw new Error('多边形围栏至少需要 3 个顶点')
  return polygon.map(point => convertCoordinate(point, fenceSystem.value, 'wgs84'))
}

const formatPointForOutput = (source: TrackPoint, coord: Coordinate): string => {
  const parts = [formatCoordinate(coord)]
  if (source.timestamp) parts.push(String(source.timestamp.getTime()))
  if (Number.isFinite(source.speedKmh)) parts.push(`speed:${source.speedKmh?.toFixed(1)}`)
  return parts.join(',')
}

const buildPointPopup = (point: TrackPoint, index: number): string => {
  const label = index === 0 ? '起点' : index === points.value.length - 1 ? '终点' : `点 ${point.id}`
  return [
    label,
    `纬度: ${point.lat.toFixed(6)}`,
    `经度: ${point.lng.toFixed(6)}`,
    point.timestamp ? `时间: ${formatDateTime(point.timestamp)}` : '',
    Number.isFinite(point.speedKmh) ? `速度: ${point.speedKmh?.toFixed(1)} km/h` : ''
  ].filter(Boolean).join('<br>')
}

const getSystemLabel = (system: CoordinateSystem): string => {
  return coordinateSystemOptions.find(option => option.value === system)?.label ?? system
}

const formatDistance = (meters: number): string => {
  if (!Number.isFinite(meters)) return '-'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${meters.toFixed(0)} m`
}

const formatDuration = (seconds?: number): string => {
  if (!Number.isFinite(seconds)) return '-'
  const total = Math.round(seconds ?? 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const restSeconds = total % 60
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${restSeconds}s`
  return `${restSeconds}s`
}

const formatSpeed = (speed?: number): string => {
  return Number.isFinite(speed) ? `${speed?.toFixed(1)} km/h` : '-'
}

const formatDateTime = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':',
    pad(date.getSeconds())
  ].join('')
}

watch(
  [
    compressionToleranceMeters,
    stopRadiusMeters,
    stopMinMinutes,
    speedLimitKmh,
    driftMaxSpeedKmh,
    driftMinJumpMeters,
    showCompressedLayer,
    showStopLayer,
    showAnomalyLayer,
    showFenceLayer,
    fenceMode,
    fenceCenterInput,
    fenceRadiusMeters,
    fencePolygonInput
  ],
  () => {
    updateMap()
  }
)

onMounted(() => {
  setTimeout(async () => {
    initMap()
    await loadTrackDemo()
  }, 100)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 100%;
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(380px, 0.78fr) minmax(520px, 1.22fr);
  gap: var(--spacing-md);
  align-items: start;
}

.input-rail,
.map-column {
  min-width: 0;
}

.panel-card,
.map-card {
  border-radius: var(--radius-md);
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.section-gap {
  margin-top: var(--spacing-md);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.metric-tile {
  min-height: 74px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.metric-tile strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
  line-height: 1.1;
  letter-spacing: 0;
}

.map-container {
  width: 100%;
  height: 520px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg-tertiary);
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.map-legend span {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.legend-line {
  width: 22px;
  height: 0;
  border-top: 3px solid #1d9bf0;
  display: inline-block;
}

.legend-line--compressed {
  border-top-color: #00ba7c;
  border-top-style: dashed;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
  background: #35c982;
}

.legend-dot--alert {
  background: #f4212e;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  align-items: start;
}

.analysis-meta {
  min-height: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.event-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--spacing-sm);
  align-items: start;
  padding: 9px 0;
  border-bottom: 1px solid var(--color-border);
}

.event-row:last-child {
  border-bottom: 0;
}

.event-row strong,
.event-row span {
  display: block;
  min-width: 0;
}

.event-row strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.4;
}

.event-row span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.fence-result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.fence-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-sm);
}

.fence-kpis span {
  padding: 9px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
  font-weight: 700;
  text-align: center;
}

.segment-table {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.segment-head,
.segment-row {
  display: grid;
  grid-template-columns: 0.8fr 1fr 1fr 1fr;
  gap: var(--spacing-sm);
  align-items: center;
  padding: 9px 10px;
  font-size: var(--font-size-xs);
}

.segment-head {
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-weight: 800;
}

.segment-row {
  border-top: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.switch-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-sm);
}

.nmea-log {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.nmea-row {
  display: grid;
  grid-template-columns: 42px auto minmax(0, 1fr);
  gap: var(--spacing-sm);
  align-items: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.nmea-row--invalid {
  color: var(--color-warning);
}

@media (max-width: 1180px) {
  .workbench-grid,
  .analysis-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .metric-grid,
  .switch-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .map-container {
    height: 360px;
  }
}
</style>
