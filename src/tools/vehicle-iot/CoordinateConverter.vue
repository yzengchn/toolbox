<template>
  <div class="tool-container coordinate-converter">
    <ToolHeader
      title="坐标系转换"
      description="WGS84/GCJ02/BD09 坐标互转，并在地图上定位"
    />

    <div class="tool-content">
      <div class="converter-grid">
        <section class="converter-rail">
          <n-card class="panel-card" title="坐标输入">
            <n-space vertical :size="14">
              <div class="coordinate-input-row">
                <n-form-item label="输入坐标系" class="system-field">
                  <n-select
                    v-model:value="inputSystem"
                    class="system-select"
                    :options="coordinateSystemOptions"
                    @update:value="handleSystemChange"
                  />
                </n-form-item>

                <n-form-item label="经纬度" class="coordinate-field">
                  <n-input
                    v-model:value="coordinateInput"
                    placeholder="例如: 39.904989,116.405285"
                    clearable
                    @update:value="handleInputChange"
                  >
                    <template #suffix>
                      <n-text depth="3" style="font-size: 12px">lat,lng</n-text>
                    </template>
                  </n-input>
                </n-form-item>
              </div>

              <div class="actions-row">
                <n-button type="primary" @click="handleConvert">转换</n-button>
                <n-button @click="handleUseBeijing">北京示例</n-button>
                <n-button @click="handleGetCurrentLocation">当前位置</n-button>
                <n-button @click="handleClear">清空</n-button>
              </div>

              <n-alert v-if="coordinateError" type="warning" size="small" closable @close="coordinateError = ''">
                {{ coordinateError }}
              </n-alert>

              <n-alert type="info" :bordered="false" size="small">
                支持 lat,lng、lng lat、lat:39.9,lng:116.4。右侧地图按 WGS84 定位，点击地图会以 WGS84 回填输入。
              </n-alert>
            </n-space>
          </n-card>

          <div class="result-cards">
            <n-card
              v-for="item in conversionCards"
              :key="item.system"
              class="coordinate-card"
              :class="{ 'coordinate-card--active': item.system === inputSystem }"
            >
              <div class="card-heading">
                <div class="system-title">
                  <n-text strong>{{ item.label }}</n-text>
                  <n-tag v-if="item.system === inputSystem" size="small" type="success" :bordered="false">
                    输入
                  </n-tag>
                </div>
                <n-button text size="small" @click="copyCoordinate(item.value)">复制</n-button>
              </div>

              <n-input :value="item.value" readonly class="coordinate-output">
                <template #suffix>
                  <n-text depth="3" style="font-size: 12px">lat,lng</n-text>
                </template>
              </n-input>

              <div class="coordinate-meta">
                <span>纬度 {{ item.coordinate.lat.toFixed(6) }}</span>
                <span>经度 {{ item.coordinate.lng.toFixed(6) }}</span>
              </div>
              <n-text depth="3" class="system-note">{{ item.remark }}</n-text>
            </n-card>
          </div>
        </section>

        <section class="map-rail">
          <n-card class="map-card">
            <template #header>
              <div class="map-title">
                <span>地图定位</span>
                <n-tag size="small" :bordered="false">展示三个坐标系下GPS点位置</n-tag>
              </div>
            </template>

            <div class="map-shell">
              <div ref="mapContainer" class="map-container"></div>
            </div>

            <div class="map-readout">
              <div
                v-for="item in conversionCards"
                :key="item.system"
                class="map-readout-item"
              >
                <span class="system-dot" :style="{ backgroundColor: item.color.fill }"></span>
                <span class="map-readout-label">{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <n-alert v-if="mapError" type="error" style="margin-top: 12px">
              {{ mapError }}
            </n-alert>
          </n-card>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag,
  NText
} from 'naive-ui'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  convertCoordinateAll,
  formatCoordinate,
  parseCoordinateLine,
  roundCoordinate,
  type Coordinate,
  type CoordinateSystem
} from './utils'

const { copy } = useClipboard()

const coordinateSystemOptions: Array<{ label: string; value: CoordinateSystem }> = [
  { label: 'WGS84 GPS', value: 'wgs84' },
  { label: 'GCJ02 国测局', value: 'gcj02' },
  { label: 'BD09 百度', value: 'bd09' }
]

const systemMeta: Record<CoordinateSystem, { label: string; remark: string }> = {
  wgs84: {
    label: 'WGS84',
    remark: 'GPS、北斗等原始卫星坐标，OSM 等国际底图常用。'
  },
  gcj02: {
    label: 'GCJ02',
    remark: '国测局火星坐标，高德、腾讯、国内互联网地图常用。'
  },
  bd09: {
    label: 'BD09',
    remark: '百度地图坐标，在 GCJ02 基础上叠加百度偏移。'
  }
}

const mapContainer = ref<HTMLElement | null>(null)
const inputSystem = ref<CoordinateSystem>('wgs84')
const coordinateInput = ref('39.904989,116.405285')
const inputCoordinate = ref<Coordinate>({ lat: 39.904989, lng: 116.405285 })
const coordinateError = ref('')
const mapError = ref('')
let mapInstance: L.Map | null = null
let markerLayer: L.LayerGroup | null = null

const systemColors: Record<CoordinateSystem, { stroke: string; fill: string }> = {
  wgs84: { stroke: '#0f7a6b', fill: '#19a98d' },
  gcj02: { stroke: '#b45309', fill: '#f59e0b' },
  bd09: { stroke: '#1d4ed8', fill: '#3b82f6' }
}

const convertedCoordinates = computed(() => convertCoordinateAll(inputCoordinate.value, inputSystem.value))

const conversionCards = computed(() => {
  return (['wgs84', 'gcj02', 'bd09'] as CoordinateSystem[]).map(system => {
    const coordinate = convertedCoordinates.value[system]
    return {
      system,
      coordinate,
      value: formatCoordinate(coordinate),
      color: systemColors[system],
      ...systemMeta[system]
    }
  })
})

const parseInputCoordinate = (): Coordinate | null => {
  const raw = coordinateInput.value.trim()
  if (!raw) {
    coordinateError.value = '请输入经纬度'
    return null
  }

  try {
    const point = parseCoordinateLine(raw)
    coordinateError.value = ''
    return { lat: point.lat, lng: point.lng }
  } catch (err) {
    coordinateError.value = (err as Error).message
    return null
  }
}

const applyInputCoordinate = () => {
  const coordinate = parseInputCoordinate()
  if (!coordinate) return

  inputCoordinate.value = coordinate
  updateMapMarker()
}

const initMap = () => {
  if (!mapContainer.value || mapInstance) return

  try {
    const center = convertedCoordinates.value.wgs84
    const map = L.map(mapContainer.value).setView([center.lat, center.lng], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)
    markerLayer = L.layerGroup().addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      const coordinate = roundCoordinate({
        lat: event.latlng.lat,
        lng: event.latlng.lng
      })
      inputSystem.value = 'wgs84'
      inputCoordinate.value = coordinate
      coordinateInput.value = formatCoordinate(coordinate)
      coordinateError.value = ''
      updateMapMarker()
    })

    mapInstance = map
    updateMapMarker()
    requestAnimationFrame(() => map.invalidateSize())
    setTimeout(() => map.invalidateSize(), 250)
  } catch (err) {
    mapError.value = `地图初始化失败: ${(err as Error).message}`
  }
}

const updateMapMarker = () => {
  if (!mapInstance || !markerLayer) return

  const map = mapInstance
  const currentLayer = markerLayer
  const latLngs: L.LatLngExpression[] = conversionCards.value.map(item => [
    item.coordinate.lat,
    item.coordinate.lng
  ])

  currentLayer.clearLayers()

  L.polyline(latLngs, {
    color: '#536471',
    weight: 2,
    opacity: 0.55,
    dashArray: '6 6'
  }).addTo(currentLayer)

  conversionCards.value.forEach(item => {
    L.circleMarker([item.coordinate.lat, item.coordinate.lng], {
      radius: item.system === inputSystem.value ? 9 : 7,
      color: item.color.stroke,
      fillColor: item.color.fill,
      fillOpacity: item.system === inputSystem.value ? 0.95 : 0.82,
      weight: item.system === inputSystem.value ? 3 : 2
    })
      .bindPopup(`${item.label}<br>${item.value}`)
      .addTo(currentLayer)
  })

  const bounds = L.latLngBounds(latLngs)
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.32), {
      maxZoom: 15,
      animate: false
    })
  }
}

const handleInputChange = () => {
  applyInputCoordinate()
}

const handleConvert = () => {
  applyInputCoordinate()
}

const handleSystemChange = () => {
  updateMapMarker()
}

const handleUseBeijing = () => {
  inputSystem.value = 'wgs84'
  inputCoordinate.value = { lat: 39.904989, lng: 116.405285 }
  coordinateInput.value = formatCoordinate(inputCoordinate.value)
  coordinateError.value = ''
  updateMapMarker()
}

const handleGetCurrentLocation = () => {
  mapError.value = ''
  if (!navigator.geolocation) {
    mapError.value = '浏览器不支持地理定位'
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coordinate = roundCoordinate({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
      inputSystem.value = 'wgs84'
      inputCoordinate.value = coordinate
      coordinateInput.value = formatCoordinate(coordinate)
      coordinateError.value = ''
      updateMapMarker()
    },
    (error) => {
      mapError.value = `获取位置失败: ${error.message}`
    }
  )
}

const handleClear = () => {
  inputSystem.value = 'wgs84'
  inputCoordinate.value = { lat: 0, lng: 0 }
  coordinateInput.value = '0,0'
  coordinateError.value = ''
  mapError.value = ''
  updateMapMarker()
}

const copyCoordinate = (value: string) => {
  copy(value)
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
    markerLayer = null
  }
})
</script>

<style scoped>
.coordinate-converter {
  padding: var(--spacing-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-content {
  flex: 1;
  min-height: 0;
  display: flex;
}

.converter-grid {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(360px, 0.92fr) minmax(460px, 1.08fr);
  gap: var(--spacing-md);
  align-items: stretch;
  min-height: 100%;
}

.converter-rail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.panel-card,
.coordinate-card,
.map-card {
  border-radius: var(--radius-md);
}

.coordinate-input-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--spacing-sm) var(--spacing-md);
  align-items: start;
}

.system-field,
.coordinate-field {
  min-width: 0;
  margin-bottom: 0;
}

.system-field {
  width: max-content;
}

.coordinate-field {
  width: 100%;
}

.system-select {
  width: 136px;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.result-cards {
  display: grid;
  gap: var(--spacing-md);
}

.coordinate-card {
  border: 1px solid var(--color-border);
}

.coordinate-card--active {
  border-color: #19a98d;
}

.card-heading,
.map-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.system-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.coordinate-output {
  margin-top: var(--spacing-sm);
}

.coordinate-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-sm);
  margin: var(--spacing-sm) 0 4px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.system-note {
  display: block;
  line-height: 1.55;
}

.map-rail {
  min-width: 0;
  min-height: 0;
  display: flex;
}

.map-card {
  position: sticky;
  top: var(--spacing-md);
  width: 100%;
  min-height: calc(100vh - var(--header-height) - 118px);
  display: flex;
  flex-direction: column;
}

.map-card :deep(.n-card__content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.map-shell {
  position: relative;
  flex: 1;
  min-height: 520px;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 520px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.map-readout {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.map-readout-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 2px 7px;
  align-items: center;
  min-width: 0;
}

.system-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  grid-row: 1 / span 2;
}

.map-readout-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.map-readout-item strong {
  color: #536471;
  font-size: 14px;
  line-height: 1.35;
  word-break: break-all;
}

@media (max-width: 1120px) {
  .converter-grid {
    grid-template-columns: 1fr;
  }

  .map-card {
    position: static;
    min-height: 560px;
  }
}

@media (max-width: 720px) {
  .coordinate-converter {
    padding: var(--spacing-md);
  }

  .coordinate-meta {
    grid-template-columns: 1fr;
  }

  .coordinate-input-row {
    grid-template-columns: 1fr;
  }

  .map-readout {
    grid-template-columns: 1fr;
  }

  .map-container {
    height: 420px;
    min-height: 360px;
  }
}
</style>
