<template>
  <div class="tool-container">
    <ToolHeader
      title="Base64 图片编解码"
      description="图片与 Base64 字符串互转，支持拖拽上传和预览"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <!-- 图片转 Base64 -->
        <n-card class="panel-card" title="图片 → Base64">
          <n-space vertical :size="16">
            <!-- 上传区域 -->
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

            <!-- 图片信息 -->
            <n-alert v-if="imageInfo" type="info" size="small">
              <div class="image-info">
                <span>文件名: {{ imageInfo.name }}</span>
                <span>格式: {{ imageInfo.type }}</span>
                <span>尺寸: {{ imageInfo.width }} × {{ imageInfo.height }}</span>
                <span>大小: {{ imageInfo.size }}</span>
              </div>
            </n-alert>

            <!-- 操作按钮 -->
            <div v-if="imageFile" class="actions-row">
              <n-button type="primary" @click="handleConvertToBase64">
                转换为 Base64
              </n-button>
              <n-button @click="handleClearImage">
                清空
              </n-button>
            </div>

            <!-- Base64 输出 -->
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

        <!-- Base64 转图片 -->
        <n-card class="panel-card" title="Base64 → 图片">
          <n-space vertical :size="16">
            <!-- Base64 输入 -->
            <n-input
              v-model:value="base64Input"
              type="textarea"
              :autosize="{ minRows: 8, maxRows: 12 }"
              placeholder="输入 Base64 字符串或 Data URL&#10;例如: data:image/png;base64,iVBORw0KGgo..."
              clearable
            />

            <!-- 错误提示 -->
            <n-alert v-if="decodeError" type="error" closable @close="decodeError = ''">
              {{ decodeError }}
            </n-alert>

            <!-- 操作按钮 -->
            <div class="actions-row">
              <n-button type="primary" @click="handleDecodeBase64">
                解码为图片
              </n-button>
              <n-button @click="handleClearDecode">
                清空
              </n-button>
            </div>

            <!-- 解码结果 -->
            <div v-if="decodedImage" class="decode-result">
              <n-divider>解码结果</n-divider>
              <div class="decoded-preview">
                <img :src="decodedImage" alt="解码图片" />
              </div>
              <n-alert v-if="decodedInfo" type="success" size="small">
                <div class="image-info">
                  <span>格式: {{ decodedInfo.type }}</span>
                  <span>尺寸: {{ decodedInfo.width }} × {{ decodedInfo.height }}</span>
                  <span>大小: {{ decodedInfo.size }}</span>
                </div>
              </n-alert>
              <div class="actions-row">
                <n-button @click="handleDownloadImage">
                  下载图片
                </n-button>
              </div>
            </div>
          </n-space>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDivider,
  NIcon,
  NInput,
  NSpace,
  NTabPane,
  NTabs,
  NText,
  useMessage
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { formatFileSize } from '@/utils/format'
import { useClipboard } from '@/composables/useClipboard'

const message = useMessage()
const { copy } = useClipboard()

// 图片转 Base64
const fileInput = ref<HTMLInputElement | null>(null)
const imageFile = ref<File | null>(null)
const imagePreview = ref('')
const isDragOver = ref(false)
const base64Result = ref('')
const dataUrlResult = ref('')

interface ImageInfo {
  name: string
  type: string
  width: number
  height: number
  size: string
}

const imageInfo = ref<ImageInfo | null>(null)

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

  // 生成预览
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string

    // 获取图片信息
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
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
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

// Base64 转图片
const base64Input = ref('')
const decodedImage = ref('')
const decodeError = ref('')
const decodedInfo = ref<Omit<ImageInfo, 'name'> | null>(null)

const handleDecodeBase64 = () => {
  decodeError.value = ''
  decodedImage.value = ''
  decodedInfo.value = null

  if (!base64Input.value.trim()) {
    decodeError.value = '请输入 Base64 字符串'
    return
  }

  try {
    let dataUrl = base64Input.value.trim()

    // 如果不是 Data URL，添加前缀
    if (!dataUrl.startsWith('data:')) {
      // 尝试检测图片格式
      const header = dataUrl.substring(0, 10)
      let mimeType = 'image/png'

      if (header.startsWith('/9j/')) {
        mimeType = 'image/jpeg'
      } else if (header.startsWith('iVBORw0KGgo')) {
        mimeType = 'image/png'
      } else if (header.startsWith('R0lGODlh') || header.startsWith('R0lGODdh')) {
        mimeType = 'image/gif'
      } else if (header.startsWith('UklGR')) {
        mimeType = 'image/webp'
      }

      dataUrl = `data:${mimeType};base64,${dataUrl}`
    }

    // 验证 Base64 是否有效
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) {
      throw new Error('无效的 Base64 数据')
    }

    // 尝试解码
    atob(base64Data)

    // 创建图片获取信息
    const img = new Image()
    img.onload = () => {
      decodedImage.value = dataUrl

      // 计算图片大小
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

const getFileExtension = (mimeType: string): string => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  }
  return map[mimeType] || 'png'
}
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
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  align-items: start;
}

.panel-card {
  border-radius: var(--radius-md);
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.upload-area.drag-over {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
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

.image-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.actions-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.result-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
}

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
