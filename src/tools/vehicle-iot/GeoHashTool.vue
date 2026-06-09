<template>
  <div class="tool-container">
    <ToolHeader
      title="经纬度 GeoHash"
      description="经纬度地图展示和 GeoHash 编码解码"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <n-card class="panel-card" title="经纬度输入">
          <n-space vertical :size="14">
            <n-form-item label="经纬度">
              <n-input
                v-model:value="coordinateInput"
                placeholder="例如: 39.904989,116.405285，也支持 lng lat、lat:39.9,lng:116.4"
                clearable
                @update:value="handleCoordinateInputChange"
              >
                <template #suffix>
                  <n-text depth="3" style="font-size: 12px">lat,lng</n-text>
                </template>
              </n-input>
            </n-form-item>

            <n-alert v-if="coordinateError" type="warning" size="small" closable @close="coordinateError = ''">
              {{ coordinateError }}
            </n-alert>

            <n-alert type="info" :bordered="false" size="small">
              坐标解析规则与轨迹/坐标转换工具一致，点击地图可回填当前点并重新计算 GeoHash。
            </n-alert>

            <div class="actions-row">
              <n-button type="primary" @click="handleGetCurrentLocation">
                获取当前位置
              </n-button>
              <n-button @click="handleUseBeijing">
                北京天安门
              </n-button>
              <n-button @click="handleClearMap">
                清空
              </n-button>
            </div>

            <n-divider />

            <n-form-item label="GeoHash 精度">
              <n-slider
                v-model:value="geohashPrecision"
                :min="1"
                :max="12"
                :step="1"
                :marks="{ 1: '1', 6: '6', 12: '12' }"
                @update:value="handleCoordinateUpdate"
              />
            </n-form-item>

            <n-alert type="info" style="font-size: 12px">
              <div><strong>GeoHash 精度参考：</strong></div>
              <div>1-2: 国家级 (±2500km)</div>
              <div>3-4: 城市级 (±20-600km)</div>
              <div>5-6: 区县级 (±2-20km)</div>
              <div>7-8: 街道级 (±150-600m)</div>
              <div>9-10: 建筑级 (±5-40m)</div>
              <div>11-12: 米级 (±0.4-3m)</div>
            </n-alert>
          </n-space>
        </n-card>

        <div class="result-stack">
          <n-card title="GeoHash 结果">
            <n-space vertical :size="12">
              <div class="geohash-result">
                <div class="result-label">
                  <n-text strong>GeoHash</n-text>
                  <n-text depth="3">精度 {{ geohashPrecision }}</n-text>
                </div>
                <n-text code class="geohash-code">{{ geohashResult || '-' }}</n-text>
                <n-button v-if="geohashResult" text @click="copyGeohash">复制</n-button>
              </div>

              <n-divider style="margin: 8px 0" />

              <div class="decode-block">
                <n-text strong>GeoHash 解码:</n-text>
                <n-input
                  v-model:value="geohashDecode"
                  placeholder="输入 GeoHash 字符串"
                  clearable
                  @update:value="handleGeohashDecode"
                />
                <div v-if="geohashDecodeResult" class="decoded-coordinate">
                  <div>
                    <n-text depth="3">解码坐标</n-text>
                    <strong>{{ decodedCoordinateText }}</strong>
                  </div>
                  <n-button size="small" @click="copyDecodedCoordinate">复制坐标</n-button>
                </div>
              </div>
            </n-space>
          </n-card>

          <n-card class="map-card" title="地图展示">
            <template #header-extra>
              <n-text depth="3" class="map-coordinate">{{ mapCoordinateText }}</n-text>
            </template>
            <div ref="mapContainer" class="map-container"></div>
            <n-alert v-if="mapError" type="error" style="margin-top: 12px">
              {{ mapError }}
            </n-alert>
          </n-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { CircleMarker, LeafletMouseEvent, Map as LeafletMap } from 'leaflet'
import {
  NAlert,
  NButton,
  NCard,
  NDivider,
  NFormItem,
  NInput,
  NSlider,
  NSpace,
  NText
} from 'naive-ui'
import * as geohash from 'ngeohash'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { formatCoordinate, parseCoordinateLine, roundCoordinate } from './utils'
import { getLoadedLeaflet, loadLeaflet } from './leafletLoader'

const { copy } = useClipboard()

// 地图和 GeoHash 相关
const mapContainer = ref<HTMLElement | null>(null)
const coordinateInput = ref('39.904989,116.405285')
const mapLat = ref(39.904989)
const mapLng = ref(116.405285)
const coordinateError = ref('')
const geohashPrecision = ref(8)
const geohashResult = ref('')
const geohashDecode = ref('')
const geohashDecodeResult = ref<{ latitude: number; longitude: number } | null>(null)
const mapError = ref('')
let mapInstance: LeafletMap | null = null
let mapMarker: CircleMarker | null = null
let mapInitPromise: Promise<void> | null = null

const mapCoordinateText = computed(() => {
  if (!geohashResult.value) return '-'
  return formatCoordinate({ lat: mapLat.value, lng: mapLng.value })
})
const decodedCoordinateText = computed(() => {
  if (!geohashDecodeResult.value) return ''
  return formatCoordinate({
    lat: geohashDecodeResult.value.latitude,
    lng: geohashDecodeResult.value.longitude
  })
})

// 地图和 GeoHash 处理函数
const parseCoordinateInput = (): boolean => {
  coordinateError.value = ''

  if (!coordinateInput.value.trim()) {
    coordinateError.value = '请输入经纬度'
    return false
  }

  try {
    const point = parseCoordinateLine(coordinateInput.value, 1)
    mapLat.value = point.lat
    mapLng.value = point.lng
    return true
  } catch (err) {
    coordinateError.value = (err as Error).message
    return false
  }
}

const handleCoordinateInputChange = () => {
  if (parseCoordinateInput()) {
    handleCoordinateUpdate()
  }
}

const initMap = () => {
  if (!mapContainer.value || mapInstance) return
  if (mapInitPromise) return mapInitPromise

  mapInitPromise = (async () => {
    const L = await loadLeaflet()
    if (!mapContainer.value || mapInstance) return

    // 初始化地图
    mapInstance = L.map(mapContainer.value).setView([mapLat.value, mapLng.value], 13)

    // 添加瓦片层 (使用 OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapInstance)

    // 添加标记
    updateMapMarker()
    requestAnimationFrame(() => mapInstance?.invalidateSize())
    setTimeout(() => mapInstance?.invalidateSize(), 250)

    // 监听地图点击事件
    mapInstance.on('click', (e: LeafletMouseEvent) => {
      const coordinate = roundCoordinate({ lat: e.latlng.lat, lng: e.latlng.lng })
      mapLat.value = coordinate.lat
      mapLng.value = coordinate.lng
      coordinateInput.value = formatCoordinate(coordinate)
      coordinateError.value = ''
      handleCoordinateUpdate()
    })
  })()
    .catch((err) => {
      mapError.value = '地图初始化失败: ' + (err as Error).message
    })
    .finally(() => {
      mapInitPromise = null
    })

  return mapInitPromise
}

const updateMapMarker = () => {
  const L = getLoadedLeaflet()
  if (!mapInstance || !L) return

  // 移除旧标记
  if (mapMarker) {
    mapMarker.remove()
  }

  // 添加新标记
  mapMarker = L.circleMarker([mapLat.value, mapLng.value], {
    radius: 7,
    color: '#1d9bf0',
    fillColor: '#1d9bf0',
    fillOpacity: 0.88,
    weight: 2
  }).addTo(mapInstance)
  mapMarker.bindPopup(`坐标: ${mapCoordinateText.value}<br>GeoHash: ${geohashResult.value || '-'}`)

  // 移动地图中心
  mapInstance.setView([mapLat.value, mapLng.value], mapInstance.getZoom())
}

const handleCoordinateUpdate = () => {
  if (mapLat.value !== null && mapLng.value !== null) {
    // 计算 GeoHash
    geohashResult.value = geohash.encode(mapLat.value, mapLng.value, geohashPrecision.value)

    // 更新地图标记
    if (mapInstance) {
      updateMapMarker()
    } else {
      // 如果地图还未初始化，延迟初始化
      setTimeout(() => {
        void initMap()
      }, 100)
    }
  }
}

const handleGeohashDecode = () => {
  mapError.value = ''
  if (!geohashDecode.value.trim()) {
    geohashDecodeResult.value = null
    return
  }

  try {
    const decoded = geohash.decode(geohashDecode.value)
    geohashDecodeResult.value = {
      latitude: Number(decoded.latitude.toFixed(6)),
      longitude: Number(decoded.longitude.toFixed(6))
    }

    // 更新地图位置
    mapLat.value = geohashDecodeResult.value.latitude
    mapLng.value = geohashDecodeResult.value.longitude
    coordinateInput.value = decodedCoordinateText.value
    coordinateError.value = ''
    handleCoordinateUpdate()
  } catch (err) {
    geohashDecodeResult.value = null
    mapError.value = 'GeoHash 解码失败: ' + (err as Error).message
  }
}

const handleGetCurrentLocation = () => {
  mapError.value = ''
  if (!navigator.geolocation) {
    mapError.value = '浏览器不支持地理定位'
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      mapLat.value = Number(position.coords.latitude.toFixed(6))
      mapLng.value = Number(position.coords.longitude.toFixed(6))
      coordinateInput.value = formatCoordinate({ lat: mapLat.value, lng: mapLng.value })
      coordinateError.value = ''
      handleCoordinateUpdate()
    },
    (error) => {
      mapError.value = '获取位置失败: ' + error.message
    }
  )
}

const handleUseBeijing = () => {
  mapLat.value = 39.904989
  mapLng.value = 116.405285
  coordinateInput.value = formatCoordinate({ lat: mapLat.value, lng: mapLng.value })
  coordinateError.value = ''
  handleCoordinateUpdate()
}

const handleClearMap = () => {
  mapLat.value = 0
  mapLng.value = 0
  coordinateInput.value = ''
  geohashResult.value = ''
  geohashDecode.value = ''
  geohashDecodeResult.value = null
  coordinateError.value = ''
  mapError.value = ''
  if (mapMarker) {
    mapMarker.remove()
    mapMarker = null
  }
  mapInstance?.setView([0, 0], 2)
}

const copyGeohash = () => {
  copy(geohashResult.value)
}

const copyDecodedCoordinate = () => {
  copy(decodedCoordinateText.value)
}

onMounted(() => {
  // 初始化时计算 GeoHash
  handleCoordinateUpdate()
})

onUnmounted(() => {
  // 清理地图实例
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
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
  grid-template-columns: minmax(360px, 0.85fr) minmax(420px, 1.15fr);
  gap: var(--spacing-md);
  align-items: start;
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

.result-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.map-card :deep(.n-card__content) {
  min-width: 0;
}

.map-container {
  width: 100%;
  height: clamp(420px, calc(100vh - var(--header-height) - 300px), 620px);
  min-height: 420px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.geohash-result {
  display: grid;
  grid-template-columns: minmax(92px, auto) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-sm);
}

.result-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.geohash-code {
  min-width: 0;
  font-size: 18px;
  word-break: break-all;
}

.decode-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.decoded-coordinate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.decoded-coordinate strong {
  display: block;
  margin-top: 2px;
  font-family: var(--font-mono);
  word-break: break-all;
}

.map-coordinate {
  font-family: var(--font-mono);
  word-break: break-all;
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

  .geohash-result,
  .decoded-coordinate {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
  }

  .map-container {
    height: 380px;
    min-height: 360px;
  }
}
</style>
