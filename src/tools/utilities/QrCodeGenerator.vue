<template>
  <div class="tool-container">
    <ToolHeader
      title="二维码生成器"
      description="生成二维码图片"
    />

    <div class="tool-content">
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="输入内容" class="input-card">
            <n-space vertical :size="16">
              <n-input
                v-model:value="content"
                type="textarea"
                placeholder="输入要生成二维码的内容 (文本、URL、联系人信息等)"
                :rows="8"
                clearable
              />

              <n-space>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </n-space>
          </n-card>

          <n-alert v-if="error" type="error" style="margin-top: 16px">
            {{ error }}
          </n-alert>
        </n-grid-item>

        <n-grid-item>
          <div class="preview-wrapper">
            <n-empty v-if="!qrCodeUrl" description="输入内容后自动生成" style="padding: 60px 0" />
            <div v-else class="qrcode-container">
              <img :src="qrCodeUrl" alt="QR Code" class="qrcode-image" />
            </div>
            <n-space v-if="qrCodeUrl" justify="center" style="margin-top: 16px">
              <n-button @click="handleDownload">
                下载 PNG
              </n-button>
              <n-button @click="handleCopyImage">
                复制图片
              </n-button>
            </n-space>
          </div>
        </n-grid-item>
      </n-grid>

      <n-card title="配置选项" style="margin-top: 16px">
        <n-space vertical :size="16">
          <div class="config-row">
            <n-text strong class="config-label">尺寸 (像素)</n-text>
            <n-slider v-model:value="options.width" :min="128" :max="1024" :step="32" class="config-slider" />
            <n-text depth="3" class="config-value">{{ options.width }} x {{ options.width }}</n-text>
          </div>

          <div class="config-row">
            <n-text strong class="config-label">容错等级</n-text>
            <n-radio-group v-model:value="options.errorCorrectionLevel">
              <n-space :size="16">
                <n-radio value="L">低 (7%)</n-radio>
                <n-radio value="M">中 (15%)</n-radio>
                <n-radio value="Q">高 (25%)</n-radio>
                <n-radio value="H">最高 (30%)</n-radio>
              </n-space>
            </n-radio-group>
            <n-text strong style="margin-left: 24px; margin-right: 8px">前景色</n-text>
            <n-input v-model:value="options.color.dark" placeholder="#000000" style="width: 120px" />
            <n-text strong style="margin-left: 16px; margin-right: 8px">背景色</n-text>
            <n-input v-model:value="options.color.light" placeholder="#FFFFFF" style="width: 120px" />
          </div>
        </n-space>
      </n-card>

      <n-card title="使用建议" style="margin-top: 16px">
        <n-space vertical :size="8">
          <div>
            <strong>容错等级:</strong> 等级越高，二维码损坏后仍可识别的能力越强，但二维码会更密集
          </div>
          <div>
            <strong>URL 短链:</strong> 建议对长 URL 使用短链服务，可以减小二维码复杂度
          </div>
          <div>
            <strong>测试:</strong> 生成后请用手机扫描测试，确保可以正确识别
          </div>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { NCard, NInput, NSlider, NRadioGroup, NRadio, NButton, NSpace, NAlert, NText, NGrid, NGridItem, NEmpty, useMessage } from 'naive-ui'
import QRCode from 'qrcode'
import ToolHeader from '@/components/ToolHeader.vue'
import { debounce } from '@/utils/debounce'

const message = useMessage()

const content = ref('')
const qrCodeUrl = ref('')
const error = ref('')

const options = reactive({
  width: 320,
  errorCorrectionLevel: 'M' as 'L' | 'M' | 'Q' | 'H',
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
})

const handleGenerate = async () => {
  if (!content.value.trim()) {
    qrCodeUrl.value = ''
    error.value = ''
    return
  }

  error.value = ''
  try {
    qrCodeUrl.value = await QRCode.toDataURL(content.value, {
      width: options.width,
      errorCorrectionLevel: options.errorCorrectionLevel,
      color: {
        dark: options.color.dark,
        light: options.color.light
      }
    })
  } catch (err) {
    qrCodeUrl.value = ''
    error.value = '生成失败: ' + (err as Error).message
  }
}

const handleDownload = () => {
  const link = document.createElement('a')
  link.href = qrCodeUrl.value
  link.download = 'qrcode.png'
  link.click()
  message.success('开始下载')
}

const handleCopyImage = async () => {
  try {
    const response = await fetch(qrCodeUrl.value)
    const blob = await response.blob()
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    message.success('已复制到剪贴板')
  } catch (err) {
    message.error('复制失败，请使用下载功能')
  }
}

const handleClear = () => {
  content.value = ''
  qrCodeUrl.value = ''
  error.value = ''
}

// 创建防抖版本用于实时生成
const debouncedHandleGenerate = debounce(handleGenerate, 300)

// 实时监听输入和配置变化
watch([content, () => options.width, () => options.errorCorrectionLevel, () => options.color.dark, () => options.color.light], () => {
  debouncedHandleGenerate()
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 100%;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xl);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  min-height: 300px;
}

.qrcode-image {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
}

.config-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.config-label {
  min-width: 80px;
  flex-shrink: 0;
}

.config-slider {
  flex: 1;
  min-width: 200px;
}

.config-value {
  font-size: 12px;
  min-width: 80px;
  flex-shrink: 0;
}

.preview-wrapper {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  min-height: 329px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.input-card {
  height: 100%;
}

.input-card :deep(.n-card__content) {
  height: 100%;
}

</style>
