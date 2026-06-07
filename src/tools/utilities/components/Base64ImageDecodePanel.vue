<template>
  <n-card class="panel-card" title="Base64 → 图片">
    <n-space vertical :size="16">
      <n-input
        v-model:value="base64Input"
        type="textarea"
        :autosize="{ minRows: 8, maxRows: 12 }"
        placeholder="输入 Base64 字符串或 Data URL&#10;例如: data:image/png;base64,iVBORw0KGgo..."
        clearable
      />

      <n-alert v-if="decodeError" type="error" closable @close="decodeError = ''">
        {{ decodeError }}
      </n-alert>

      <div class="actions-row">
        <n-button type="primary" @click="handleDecodeBase64">
          解码为图片
        </n-button>
        <n-button @click="handleClearDecode">
          清空
        </n-button>
      </div>

      <div v-if="decodedImage" class="decode-result">
        <n-divider>解码结果</n-divider>
        <div class="decoded-preview">
          <img :src="decodedImage" alt="解码图片" />
        </div>

        <n-alert v-if="decodedInfo" type="success" size="small">
          <ImageInfoList :info="decodedInfo" />
        </n-alert>

        <div class="actions-row">
          <n-button @click="handleDownloadImage">
            下载图片
          </n-button>
        </div>
      </div>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NAlert, NButton, NCard, NDivider, NInput, NSpace, useMessage } from 'naive-ui'
import { formatFileSize } from '@/utils/format'
import { getFileExtension, normalizeImageDataUrl, type DecodedImageInfo } from '../base64Image'
import ImageInfoList from './ImageInfoList.vue'

const message = useMessage()

const base64Input = ref('')
const decodedImage = ref('')
const decodeError = ref('')
const decodedInfo = ref<DecodedImageInfo | null>(null)

const handleDecodeBase64 = () => {
  decodeError.value = ''
  decodedImage.value = ''
  decodedInfo.value = null

  if (!base64Input.value.trim()) {
    decodeError.value = '请输入 Base64 字符串'
    return
  }

  try {
    const dataUrl = normalizeImageDataUrl(base64Input.value)
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) {
      throw new Error('无效的 Base64 数据')
    }

    atob(base64Data)

    const img = new Image()
    img.onload = () => {
      decodedImage.value = dataUrl

      const binary = atob(base64Data)
      const size = binary.length

      decodedInfo.value = {
        type: dataUrl.match(/data:([^;]+)/)?.[1] || '未知',
        width: img.width,
        height: img.height,
        size: formatFileSize(size)
      }

      message.success('解码成功')
    }
    img.onerror = () => {
      decodeError.value = '无法加载图片，可能是无效的图片数据'
    }
    img.src = dataUrl
  } catch (err) {
    decodeError.value = '解码失败：' + (err as Error).message
  }
}

const handleClearDecode = () => {
  base64Input.value = ''
  decodedImage.value = ''
  decodeError.value = ''
  decodedInfo.value = null
}

const handleDownloadImage = () => {
  if (!decodedImage.value) return

  const link = document.createElement('a')
  link.href = decodedImage.value
  link.download = `image_${Date.now()}.${getFileExtension(decodedInfo.value?.type || '')}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  message.success('图片已下载')
}
</script>

<style scoped>
.decode-result {
  margin-top: var(--spacing-md);
}

.decoded-preview {
  width: 100%;
  max-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.decoded-preview img {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius-sm);
}
</style>
