<template>
  <div class="tool-container">
    <ToolHeader
      title="轨迹地图"
      description="解析经纬度列表并在地图上绘制轨迹"
    />

    <div class="tool-content">
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="输入经纬度">
            <n-space vertical :size="16">
              <n-input
                v-model:value="input"
                type="textarea"
                placeholder="每行一个坐标，支持格式：&#10;39.9042,116.4074&#10;39.9042, 116.4074&#10;39.9042 116.4074&#10;lat:39.9042,lng:116.4074"
                :rows="8"
                clearable
              />

              <n-space wrap>
                <n-button type="primary" @click="handleParse" :disabled="!input">
                  绘制轨迹
                </n-button>
                <n-button @click="handleClear">
                  清空
                </n-button>
                <n-button @click="handleCenterMap" :disabled="!coordinates.length">
                  居中显示
                </n-button>
              </n-space>

              <n-alert v-if="coordinates.length > 0" type="success" :bordered="false">
                已解析 {{ coordinates.length }} 个坐标点
              </n-alert>
            </n-space>
          </n-card>

          <n-alert v-if="error" type="error" style="margin-top: 16px">
            {{ error }}
          </n-alert>

          <n-card title="说明" style="margin-top: 16px">
            <n-space vertical :size="8">
              <div>支持多种格式：纬度,经度 或 经度,纬度（自动识别）</div>
              <div>可使用逗号、空格或冒号分隔</div>
              <div>点击地图可添加新的坐标点</div>
            </n-space>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <div class="map-wrapper">
            <div id="map" class="map-container"></div>
          </div>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NGrid,
  NGridItem,
  NInput,
  NSpace
} from 'naive-ui'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ToolHeader from '@/components/ToolHeader.vue'

const input = ref('')
const error = ref('')
const coordinates = ref<[number, number][]>([])

let map: L.Map | null = null
let polyline: L.Polyline | null = null
let markers: L.Marker[] = []

const parseCoordinates = (text: string): [number, number][] => {
  const lines = text.trim().split('\n').filter(line => line.trim())
  const results: [number, number][] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // 移除可能的 lat: lng: 前缀
    let cleaned = trimmed.replace(/lat\s*:\s*/i, '').replace(/lng\s*:\s*/i, '')

    // 分割坐标（支持逗号、空格、制表符）
    const parts = cleaned.split(/[,\s\t]+/).filter(p => p)

    if (parts.length !== 2) {
      throw new Error(`无效的坐标格式: ${line}`)
    }

    const num1 = parseFloat(parts[0])
    const num2 = parseFloat(parts[1])

    if (isNaN(num1) || isNaN(num2)) {
      throw new Error(`无法解析坐标: ${line}`)
    }

    // 自动识别纬度和经度（纬度范围 -90 到 90，经度范围 -180 到 180）
    let lat: number, lng: number
    if (Math.abs(num1) <= 90 && Math.abs(num2) <= 180) {
      // 第一个数字可能是纬度
      lat = num1
      lng = num2
    } else if (Math.abs(num2) <= 90 && Math.abs(num1) <= 180) {
      // 第二个数字是纬度
      lat = num2
      lng = num1
    } else {
      throw new Error(`坐标超出有效范围: ${line}`)
    }

    results.push([lat, lng])
  }

  return results
}

const initMap = () => {
  if (map) return

  // 创建地图实例
  map = L.map('map').setView([39.9042, 116.4074], 13)

  // 添加 OpenStreetMap 瓦片层
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  // 点击地图添加点
  map.on('click', (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng
    coordinates.value.push([lat, lng])
    updateMap()
    updateInput()
  })
}

const updateMap = () => {
  if (!map) return

  // 清除现有的标记和折线
  markers.forEach(marker => marker.remove())
  markers = []
  if (polyline) {
    polyline.remove()
    polyline = null
  }

  if (coordinates.value.length === 0) return

  // 添加标记
  coordinates.value.forEach((coord, index) => {
    const marker = L.marker(coord).addTo(map!)
    marker.bindPopup(`点 ${index + 1}<br>纬度: ${coord[0]}<br>经度: ${coord[1]}`)
    markers.push(marker)
  })

  // 绘制轨迹线
  if (coordinates.value.length > 1) {
    polyline = L.polyline(coordinates.value, {
      color: '#2080f0',
      weight: 3,
      opacity: 0.8
    }).addTo(map!)
  }

  // 自动调整视图
  if (coordinates.value.length === 1) {
    map.setView(coordinates.value[0], 13)
  } else if (coordinates.value.length > 1) {
    const bounds = L.latLngBounds(coordinates.value)
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

const updateInput = () => {
  input.value = coordinates.value.map(coord => `${coord[0]},${coord[1]}`).join('\n')
}

const handleParse = () => {
  error.value = ''

  if (!input.value.trim()) {
    error.value = '请输入经纬度坐标'
    return
  }

  try {
    coordinates.value = parseCoordinates(input.value)
    updateMap()
  } catch (err) {
    error.value = (err as Error).message
  }
}

const handleClear = () => {
  input.value = ''
  coordinates.value = []
  error.value = ''
  updateMap()
}

const handleCenterMap = () => {
  if (!map || coordinates.value.length === 0) return

  if (coordinates.value.length === 1) {
    map.setView(coordinates.value[0], 13)
  } else {
    const bounds = L.latLngBounds(coordinates.value)
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

onMounted(() => {
  // 延迟初始化地图，确保 DOM 已渲染
  setTimeout(() => {
    initMap()
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

.map-wrapper {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  min-height: 400px;
}

.map-container {
  width: 100%;
  height: 400px;
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .map-container {
    height: 300px;
  }
}
</style>
