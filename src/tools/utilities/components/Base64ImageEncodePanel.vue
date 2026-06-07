<template>
  <n-card class="panel-card" title="图片 → Base64">
    <n-space vertical :size="16">
      <div
        class="upload-area"
        :class="{ 'drag-over': isDragOver }"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @click="handleClickUpload"
      >
        <div v-if="!imageFile" class="upload-placeholder">
          <n-icon size="48" color="#999">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
          </n-icon>
          <p>点击或拖拽图片到此处</p>
          <p class="upload-hint">支持 JPG、PNG、GIF、WebP 等格式</p>
        </div>
        <div v-else class="image-preview">
          <img :src="imagePreview" alt="预览" />
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileChange"
      />

      <n-alert v-if="imageInfo" type="info" size="small">
        <ImageInfoList :info="imageInfo" />
      </n-alert>

      <div v-if="imageFile" class="actions-row">
        <n-button type="primary" @click="handleConvertToBase64">
          转换为 Base64
        </n-button>
        <n-button @click="handleClearImage">
          清空
        </n-button>
      </div>

      <n-tabs v-if="base64Result" type="line" animated>
        <n-tab-pane name="base64" tab="纯 Base64">
          <n-input
            v-model:value="base64Result"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 12 }"
            readonly
            placeholder="Base64 字符串"
          />
          <div class="result-actions">
            <n-button size="small" @click="copyBase64">复制</n-button>
            <n-text depth="3" style="font-size: 12px">
              长度: {{ base64Result.length }} 字符
            </n-text>
          </div>
        </n-tab-pane>

        <n-tab-pane name="dataurl" tab="Data URL">
          <n-input
            v-model:value="dataUrlResult"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 12 }"
            readonly
            placeholder="Data URL"
          />
          <div class="result-actions">
            <n-button size="small" @click="copyDataUrl">复制</n-button>
            <n-text depth="3" style="font-size: 12px">
              长度: {{ dataUrlResult.length }} 字符
            </n-text>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NAlert, NButton, NCard, NIcon, NInput, NSpace, NTabPane, NTabs, NText, useMessage } from 'naive-ui'
import { useClipboard } from '@/composables/useClipboard'
import { formatFileSize } from '@/utils/format'
import type { UploadedImageInfo } from '../base64Image'
import ImageInfoList from './ImageInfoList.vue'

const message = useMessage()
const { copy } = useClipboard()

const fileInput = ref<HTMLInputElement | null>(null)
const imageFile = ref<File | null>(null)
const imagePreview = ref('')
const isDragOver = ref(false)
const base64Result = ref('')
const dataUrlResult = ref('')
const imageInfo = ref<UploadedImageInfo | null>(null)

const handleClickUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processImageFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    processImageFile(file)
  } else {
    message.error('请拖入图片文件')
  }
}

const processImageFile = (file: File) => {
  imageFile.value = file

  const reader = new FileReader()
  reader.onload = (event) => {
    imagePreview.value = event.target?.result as string

    const img = new Image()
    img.onload = () => {
      imageInfo.value = {
        name: file.name,
        type: file.type || '未知',
        width: img.width,
        height: img.height,
        size: formatFileSize(file.size)
      }
    }
    img.src = imagePreview.value
  }
  reader.readAsDataURL(file)
}

const handleConvertToBase64 = () => {
  if (!imageFile.value) {
    message.error('请先上传图片')
    return
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string
    const base64 = dataUrl.split(',')[1]

    base64Result.value = base64
    dataUrlResult.value = dataUrl
    message.success('转换成功')
  }
  reader.readAsDataURL(imageFile.value)
}

const handleClearImage = () => {
  imageFile.value = null
  imagePreview.value = ''
  imageInfo.value = null
  base64Result.value = ''
  dataUrlResult.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const copyBase64 = () => {
  copy(base64Result.value, '已复制 Base64 到剪贴板')
}

const copyDataUrl = () => {
  copy(dataUrlResult.value, '已复制 Data URL 到剪贴板')
}
</script>

<style scoped>
.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

.upload-area.drag-over {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.upload-placeholder p {
  margin: var(--spacing-sm) 0;
  color: var(--color-text-secondary);
}

.upload-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.image-preview {
  width: 100%;
  max-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: var(--radius-sm);
}

.result-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
}
</style>
