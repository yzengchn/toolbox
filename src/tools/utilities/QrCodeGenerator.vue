<template>
  <div class="tool-container">
    <div class="tool-header">
      <h2>QR 码生成器</h2>
      <p class="description">生成二维码图片</p>
    </div>

    <div class="tool-content">
      <n-card title="输入内容">
        <n-space vertical :size="16">
          <n-input
            v-model:value="content"
            type="textarea"
            placeholder="输入要生成 QR 码的内容 (文本、URL、联系人信息等)"
            :rows="6"
            clearable
          />

          <n-space>
            <n-button type="primary" @click="handleGenerate" :disabled="!content">
              生成 QR 码
            </n-button>
            <n-button @click="handleClear">
              清空
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-alert v-if="error" type="error" style="margin-top: 16px">
        {{ error }}
      </n-alert>

      <n-card v-if="qrCodeUrl" title="QR 码预览" style="margin-top: 16px">
        <div class="qrcode-container">
          <img :src="qrCodeUrl" alt="QR Code" class="qrcode-image" />
        </div>
        <template #footer>
          <n-space>
            <n-button @click="handleDownload">
              下载 PNG
            </n-button>
            <n-button @click="handleCopyImage">
              复制图片
            </n-button>
          </n-space>
        </template>
      </n-card>

      <n-card title="配置选项" style="margin-top: 16px">
        <n-space vertical :size="16">
          <div>
            <n-text strong>尺寸 (像素)</n-text>
            <n-slider v-model:value="options.width" :min="128" :max="1024" :step="32" style="margin-top: 8px" />
            <n-text depth="3" style="font-size: 12px">{{ options.width }} x {{ options.width }}</n-text>
          </div>

          <div>
            <n-text strong>容错等级</n-text>
            <n-radio-group v-model:value="options.errorCorrectionLevel" style="margin-top: 8px">
              <n-space>
                <n-radio value="L">低 (7%)</n-radio>
                <n-radio value="M">中 (15%)</n-radio>
                <n-radio value="Q">高 (25%)</n-radio>
                <n-radio value="H">最高 (30%)</n-radio>
              </n-space>
            </n-radio-group>
          </div>

          <div>
            <n-text strong>前景色</n-text>
            <n-input v-model:value="options.color.dark" placeholder="#000000" style="margin-top: 8px" />
          </div>

          <div>
            <n-text strong>背景色</n-text>
            <n-input v-model:value="options.color.light" placeholder="#FFFFFF" style="margin-top: 8px" />
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
import { ref, reactive } from 'vue'
import { NCard, NInput, NSlider, NRadioGroup, NRadio, NButton, NSpace, NAlert, NText, useMessage } from 'naive-ui'
import QRCode from 'qrcode'

const message = useMessage()

const content = ref('')
const qrCodeUrl = ref('')
const error = ref('')

const options = reactive({
  width: 256,
  errorCorrectionLevel: 'M' as 'L' | 'M' | 'Q' | 'H',
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
})

const handleGenerate = async () => {
  if (!content.value.trim()) {
    error.value = '请输入内容'
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

.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xl);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.qrcode-image {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
}
</style>
