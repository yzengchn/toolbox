<template>
  <div class="tool-container">
    <div class="tool-header">
      <h2>颜色转换器</h2>
      <p class="description">在不同颜色格式之间转换 (HEX, RGB, HSL)</p>
    </div>

    <div class="tool-content">
      <n-card title="输入颜色">
        <n-space vertical :size="16">
          <n-tabs type="line" animated>
            <n-tab-pane name="hex" tab="HEX">
              <n-input
                v-model:value="hexInput"
                placeholder="#RRGGBB 或 #RGB"
                @input="handleHexInput"
              />
            </n-tab-pane>
            <n-tab-pane name="rgb" tab="RGB">
              <n-space>
                <n-input-number
                  v-model:value="rgb.r"
                  placeholder="R"
                  :min="0"
                  :max="255"
                  @update:value="handleRgbInput"
                  style="flex: 1"
                />
                <n-input-number
                  v-model:value="rgb.g"
                  placeholder="G"
                  :min="0"
                  :max="255"
                  @update:value="handleRgbInput"
                  style="flex: 1"
                />
                <n-input-number
                  v-model:value="rgb.b"
                  placeholder="B"
                  :min="0"
                  :max="255"
                  @update:value="handleRgbInput"
                  style="flex: 1"
                />
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="hsl" tab="HSL">
              <n-space>
                <n-input-number
                  v-model:value="hsl.h"
                  placeholder="H"
                  :min="0"
                  :max="360"
                  @update:value="handleHslInput"
                  style="flex: 1"
                />
                <n-input-number
                  v-model:value="hsl.s"
                  placeholder="S"
                  :min="0"
                  :max="100"
                  @update:value="handleHslInput"
                  style="flex: 1"
                />
                <n-input-number
                  v-model:value="hsl.l"
                  placeholder="L"
                  :min="0"
                  :max="100"
                  @update:value="handleHslInput"
                  style="flex: 1"
                />
              </n-space>
            </n-tab-pane>
          </n-tabs>

          <n-button @click="handleClear">
            清空
          </n-button>
        </n-space>
      </n-card>

      <n-card v-if="currentColor" title="颜色预览" style="margin-top: 16px">
        <div class="color-preview" :style="{ backgroundColor: currentColor }"></div>
      </n-card>

      <n-card v-if="result" title="转换结果" style="margin-top: 16px">
        <n-space vertical :size="12">
          <div class="result-item">
            <span class="result-label">HEX:</span>
            <n-input :value="result.hex" readonly>
              <template #suffix>
                <n-button text @click="handleCopy(result.hex)">
                  复制
                </n-button>
              </template>
            </n-input>
          </div>

          <div class="result-item">
            <span class="result-label">RGB:</span>
            <n-input :value="result.rgb" readonly>
              <template #suffix>
                <n-button text @click="handleCopy(result.rgb)">
                  复制
                </n-button>
              </template>
            </n-input>
          </div>

          <div class="result-item">
            <span class="result-label">HSL:</span>
            <n-input :value="result.hsl" readonly>
              <template #suffix>
                <n-button text @click="handleCopy(result.hsl)">
                  复制
                </n-button>
              </template>
            </n-input>
          </div>

          <div class="result-item">
            <span class="result-label">RGBA:</span>
            <n-input :value="result.rgba" readonly>
              <template #suffix>
                <n-button text @click="handleCopy(result.rgba)">
                  复制
                </n-button>
              </template>
            </n-input>
          </div>

          <div class="result-item">
            <span class="result-label">HSLA:</span>
            <n-input :value="result.hsla" readonly>
              <template #suffix>
                <n-button text @click="handleCopy(result.hsla)">
                  复制
                </n-button>
              </template>
            </n-input>
          </div>
        </n-space>
      </n-card>

      <n-card title="常用颜色" style="margin-top: 16px">
        <div class="color-palette">
          <div
            v-for="color in commonColors"
            :key="color.hex"
            class="color-swatch"
            :style="{ backgroundColor: color.hex }"
            @click="handleSelectColor(color.hex)"
            :title="color.name"
          >
            <span class="color-name">{{ color.name }}</span>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NCard, NInput, NInputNumber, NTabs, NTabPane, NButton, NSpace, useMessage } from 'naive-ui'

const message = useMessage()

const hexInput = ref('')
const rgb = reactive({ r: 0, g: 0, b: 0 })
const hsl = reactive({ h: 0, s: 0, l: 0 })
const currentColor = ref('')

const result = ref<{
  hex: string
  rgb: string
  hsl: string
  rgba: string
  hsla: string
} | null>(null)

const commonColors = [
  { name: '红色', hex: '#FF0000' },
  { name: '绿色', hex: '#00FF00' },
  { name: '蓝色', hex: '#0000FF' },
  { name: '黄色', hex: '#FFFF00' },
  { name: '青色', hex: '#00FFFF' },
  { name: '品红', hex: '#FF00FF' },
  { name: '黑色', hex: '#000000' },
  { name: '白色', hex: '#FFFFFF' },
  { name: '灰色', hex: '#808080' },
  { name: '橙色', hex: '#FFA500' },
  { name: '紫色', hex: '#800080' },
  { name: '粉色', hex: '#FFC0CB' }
]

const handleHexInput = () => {
  const hex = hexInput.value.trim()
  if (!hex) return

  const color = parseHex(hex)
  if (color) {
    rgb.r = color.r
    rgb.g = color.g
    rgb.b = color.b
    updateFromRgb()
  }
}

const handleRgbInput = () => {
  updateFromRgb()
}

const handleHslInput = () => {
  const rgbColor = hslToRgb(hsl.h, hsl.s, hsl.l)
  rgb.r = rgbColor.r
  rgb.g = rgbColor.g
  rgb.b = rgbColor.b
  updateFromRgb()
}

const updateFromRgb = () => {
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
  const hslColor = rgbToHsl(rgb.r, rgb.g, rgb.b)

  hexInput.value = hex
  hsl.h = hslColor.h
  hsl.s = hslColor.s
  hsl.l = hslColor.l

  currentColor.value = hex

  result.value = {
    hex: hex,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hslColor.h}, ${hslColor.s}%, ${hslColor.l}%)`,
    rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
    hsla: `hsla(${hslColor.h}, ${hslColor.s}%, ${hslColor.l}%, 1)`
  }
}

const parseHex = (hex: string): { r: number; g: number; b: number } | null => {
  hex = hex.replace('#', '')

  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }

  if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

const handleSelectColor = (hex: string) => {
  hexInput.value = hex
  handleHexInput()
}

const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (err) {
    message.error('复制失败')
  }
}

const handleClear = () => {
  hexInput.value = ''
  rgb.r = 0
  rgb.g = 0
  rgb.b = 0
  hsl.h = 0
  hsl.s = 0
  hsl.l = 0
  currentColor.value = ''
  result.value = null
}
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-header {
  margin-bottom: var(--spacing-xl);
}

.tool-header h2 {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.tool-content {
  max-width: 100%;
}

.color-preview {
  width: 100%;
  height: 200px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.result-item {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: var(--spacing-sm);
}

.result-label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--spacing-sm);
}

.color-swatch {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

.color-swatch:hover {
  transform: scale(1.05);
}

.color-name {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  font-size: var(--font-size-xs);
  width: 100%;
  text-align: center;
}
</style>
