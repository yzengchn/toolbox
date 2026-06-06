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
            <n-form-item label="经纬度 (纬度,经度)">
              <n-input
                v-model:value="coordinateInput"
                placeholder="例如: 39.904989,116.405285"
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
                <n-text strong>GeoHash: </n-text>
                <n-text code style="font-size: 16px">{{ geohashResult || '-' }}</n-text>
                <n-button v-if="geohashResult" text @click="copyGeohash">复制</n-button>
              </div>

              <n-divider style="margin: 8px 0" />

              <div>
                <n-text strong>GeoHash 解码:</n-text>
                <n-input
                  v-model:value="geohashDecode"
                  placeholder="输入 GeoHash 字符串"
                  clearable
                  @update:value="handleGeohashDecode"
                />
                <div v-if="geohashDecodeResult" style="margin-top: 8px">
                  <n-text depth="3" style="font-size: 13px">
                    纬度: {{ geohashDecodeResult.latitude }},
                    经度: {{ geohashDecodeResult.longitude }}
                  </n-text>
                </div>
              </div>
            </n-space>
          </n-card>

          <n-card title="地图展示">
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
import { ref, onMounted, onUnmounted } from 'vue'
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
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as geohash from 'ngeohash'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

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
let mapInstance: L.Map | null = null
let mapMarker: L.Marker | null = null

// 地图和 GeoHash 处理函数
const parseCoordinateInput = (): boolean => {
  coordinateError.value = ''

  if (!coordinateInput.value.trim()) {
    coordinateError.value = '请输入经纬度'
    return false
  }

  const parts = coordinateInput.value.split(',').map(p => p.trim())

  if (parts.length !== 2) {
    coordinateError.value = '格式错误，请使用逗号分隔纬度和经度'
    return false
  }

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])

  if (isNaN(lat) || isNaN(lng)) {
    coordinateError.value = '经纬度必须是有效的数字'
    return false
  }

  if (lat < -90 || lat > 90) {
    coordinateError.value = '纬度范围必须在 -90 到 90 之间'
    return false
  }

  if (lng < -180 || lng > 180) {
    coordinateError.value = '经度范围必须在 -180 到 180 之间'
    return false
  }

  mapLat.value = lat
  mapLng.value = lng
  return true
}

const handleCoordinateInputChange = () => {
  if (parseCoordinateInput()) {
    handleCoordinateUpdate()
  }
}

const initMap = () => {
  if (!mapContainer.value || mapInstance) return

  try {
    // 初始化地图
    mapInstance = L.map(mapContainer.value).setView([mapLat.value, mapLng.value], 13)

    // 添加瓦片层 (使用 OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapInstance)

    // 添加标记
    updateMapMarker()

    // 监听地图点击事件
    mapInstance.on('click', (e: L.LeafletMouseEvent) => {
      mapLat.value = Number(e.latlng.lat.toFixed(6))
      mapLng.value = Number(e.latlng.lng.toFixed(6))
      coordinateInput.value = `${mapLat.value},${mapLng.value}`
      handleCoordinateUpdate()
    })
  } catch (err) {
    mapError.value = '地图初始化失败: ' + (err as Error).message
  }
}

const updateMapMarker = () => {
  if (!mapInstance) return

  // 移除旧标记
  if (mapMarker) {
    mapMarker.remove()
  }

  // 添加新标记
  mapMarker = L.marker([mapLat.value, mapLng.value]).addTo(mapInstance)
  mapMarker.bindPopup(`纬度: ${mapLat.value}<br>经度: ${mapLng.value}<br>GeoHash: ${geohashResult.value}`)

  // 移动地图中心
  mapInstance.setView([mapLat.value, mapLng.value])
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
        initMap()
      }, 100)
    }
  }
}

const handleGeohashDecode = () => {
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
    handleCoordinateUpdate()
  } catch (err) {
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
      coordinateInput.value = `${mapLat.value},${mapLng.value}`
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
  coordinateInput.value = `${mapLat.value},${mapLng.value}`
  handleCoordinateUpdate()
}

const handleClearMap = () => {
  mapLat.value = 0
  mapLng.value = 0
  coordinateInput.value = '0,0'
  geohashResult.value = ''
  geohashDecode.value = ''
  geohashDecodeResult.value = null
  coordinateError.value = ''
  mapError.value = ''
}

const copyGeohash = () => {
  copy(geohashResult.value)
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

.panel-card {
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

.map-container {
  width: 100%;
  height: 400px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.geohash-result {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
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
}
</style>
