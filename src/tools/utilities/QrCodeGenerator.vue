<template>
  <div class="tool-container">
    <ToolHeader
      title="二维码工具"
      description="本地生成二维码图片，或上传/粘贴图片解析二维码内容"
    />

    <div class="tool-content" :class="mode === 'generate' ? 'is-generate' : 'is-decode'">
      <div class="mode-switch" role="tablist" aria-label="功能切换">
        <button
          v-for="tab in QR_MODE_TABS"
          :key="tab.id"
          type="button"
          class="mode-tab"
          :class="[`mode-tab-${tab.id}`, { active: mode === tab.id }]"
          role="tab"
          :aria-selected="mode === tab.id"
          @click="mode = tab.id"
        >
          <span class="mode-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" :d="tab.iconPath" />
            </svg>
          </span>
          <span class="mode-copy">
            <strong>{{ tab.title }}</strong>
            <small>{{ tab.subtitle }}</small>
          </span>
        </button>
      </div>

      <!-- 生成 -->
      <div v-if="mode === 'generate'" class="mode-body">
        <div class="top-grid">
          <n-card title="输入内容" class="panel">
            <template #header-extra>
              <n-space :size="8">
                <n-button quaternary size="small" @click="content = DEFAULT_QR_CONTENT">
                  示例
                </n-button>
                <n-button quaternary size="small" :disabled="!content" @click="clearGenerate">
                  清空
                </n-button>
              </n-space>
            </template>

            <n-input
              v-model:value="content"
              type="textarea"
              class="mono-input"
              placeholder="输入文本、URL、Wi‑Fi、vCard 等"
              :rows="9"
              clearable
            />

            <div class="preset-row">
              <span class="preset-label">快捷</span>
              <div class="preset-chips">
                <button
                  v-for="item in QR_CONTENT_PRESETS"
                  :key="item.id"
                  type="button"
                  class="chip"
                  :class="{ active: content.trim() === item.content.trim() }"
                  @click="content = item.content"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <n-alert v-if="generateError" type="error" :bordered="false">
              {{ generateError }}
            </n-alert>
          </n-card>

          <n-card title="预览" class="panel">
            <template #header-extra>
              <n-space v-if="qrCodeUrl" :size="8">
                <n-button size="small" secondary @click="downloadPng">下载 PNG</n-button>
                <n-button size="small" secondary @click="copyPng">复制图片</n-button>
              </n-space>
            </template>

            <div class="preview-box">
              <n-empty v-if="!qrCodeUrl" description="输入内容后自动生成" />
              <img v-else :src="qrCodeUrl" alt="二维码预览" class="qr-image" />
            </div>
          </n-card>
        </div>

        <n-card title="配置" class="panel">
          <div class="config-stack">
            <div class="config-row">
              <span class="config-label">尺寸</span>
              <n-slider
                v-model:value="options.width"
                :min="128"
                :max="1024"
                :step="32"
                class="config-slider"
              />
              <span class="config-value">{{ options.width }} × {{ options.width }}</span>
            </div>

            <div class="config-row wrap">
              <span class="config-label">容错</span>
              <n-radio-group v-model:value="options.errorCorrectionLevel">
                <n-space :size="12">
                  <n-radio
                    v-for="level in QR_ERROR_LEVELS"
                    :key="level.value"
                    :value="level.value"
                    :title="level.tip"
                  >
                    {{ level.label }}
                  </n-radio>
                </n-space>
              </n-radio-group>
            </div>

            <div class="config-row wrap">
              <span class="config-label">颜色</span>
              <label class="color-field">
                <span>前景</span>
                <input v-model="options.dark" type="color" class="color-picker" />
                <n-input v-model:value="options.dark" size="small" class="color-hex" />
              </label>
              <label class="color-field">
                <span>背景</span>
                <input v-model="options.light" type="color" class="color-picker" />
                <n-input v-model:value="options.light" size="small" class="color-hex" />
              </label>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 解析 -->
      <div v-else class="mode-body">
        <div class="top-grid">
          <n-card title="上传图片" class="panel">
            <template #header-extra>
              <n-space :size="8">
                <n-button size="small" secondary :loading="decodeLoading" @click="pasteImage">
                  粘贴图片
                </n-button>
                <n-button
                  quaternary
                  size="small"
                  :disabled="!decodePreview && !decodeText"
                  @click="clearDecode"
                >
                  清空
                </n-button>
              </n-space>
            </template>

            <div
              class="upload-area"
              :class="{ 'drag-over': isDragOver, 'has-image': !!decodePreview }"
              @click="fileInputRef?.click()"
              @dragover.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
              @drop.prevent="onDrop"
            >
              <img
                v-if="decodePreview"
                :src="decodePreview"
                alt="待解析图片"
                class="upload-preview"
              />
              <div v-else class="upload-placeholder">
                <p class="upload-title">点击选择 / 拖拽图片到此处</p>
                <p class="upload-hint">支持 PNG、JPG、WebP、GIF；也可 Ctrl/⌘+V 粘贴</p>
              </div>
            </div>

            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden-input"
              @change="onFileChange"
            />

            <n-alert v-if="decodeError" type="error" :bordered="false">
              {{ decodeError }}
            </n-alert>
            <n-alert v-else-if="decodeLoading" type="info" :bordered="false">
              正在识别…
            </n-alert>
          </n-card>

          <n-card title="解析结果" class="panel">
            <template #header-extra>
              <n-space v-if="decodeText" :size="8">
                <n-button size="small" secondary @click="copy(decodeText, '已复制解析内容')">
                  复制内容
                </n-button>
                <n-button size="small" type="primary" secondary @click="fillToGenerate">
                  填到生成
                </n-button>
              </n-space>
            </template>

            <n-empty
              v-if="!decodeText && !decodeError && !decodeLoading"
              description="上传或粘贴含二维码的图片"
            />

            <div v-else-if="decodeText" class="decode-result">
              <div class="meta-row">
                <span class="meta-chip">类型：{{ contentKind }}</span>
                <span v-if="decodeVersion != null" class="meta-chip">版本：{{ decodeVersion }}</span>
                <span class="meta-chip">长度：{{ decodeText.length }}</span>
              </div>

              <n-input
                :value="decodeText"
                type="textarea"
                readonly
                class="mono-input"
                :rows="10"
              />

              <a
                v-if="decodeIsHttp"
                class="result-link"
                :href="decodeText.trim()"
                target="_blank"
                rel="noopener noreferrer"
              >
                在新标签打开链接
              </a>
            </div>
          </n-card>
        </div>
      </div>

      <n-card title="使用建议" class="panel tips-card" size="small">
        <div class="tips-grid">
          <div v-for="tip in QR_TIPS" :key="tip.title" class="tip-item">
            <strong>{{ tip.title }}</strong>
            <span>{{ tip.body }}</span>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NInput,
  NRadio,
  NRadioGroup,
  NSlider,
  NSpace,
  useMessage
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useStorage } from '@/composables/useStorage'
import { debounce } from '@/utils/debounce'
import {
  DEFAULT_QR_CONTENT,
  DEFAULT_QR_OPTIONS,
  QR_CONTENT_PRESETS,
  QR_ERROR_LEVELS,
  QR_MODE_TABS,
  QR_TIPS,
  copyImageDataUrl,
  decodeQrFromImageSource,
  downloadDataUrl,
  errorMessage,
  generateQrDataUrl,
  getClipboardImageFile,
  guessContentKind,
  isHttpUrl,
  normalizeQrOptions,
  readClipboardImageAsDataUrl,
  readFileAsDataUrl,
  type QrGenerateOptions,
  type QrToolMode
} from './qrUtils'

const message = useMessage()
const { copy } = useClipboard()

const mode = ref<QrToolMode>('generate')
const { data: content } = useStorage('qrcode-content', DEFAULT_QR_CONTENT)
const { data: options } = useStorage<QrGenerateOptions>(
  'qrcode-options',
  normalizeQrOptions(DEFAULT_QR_OPTIONS)
)

const qrCodeUrl = ref('')
const generateError = ref('')
let generateRequestId = 0

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const decodePreview = ref('')
const decodeText = ref('')
const decodeError = ref('')
const decodeLoading = ref(false)
const decodeVersion = ref<number | null>(null)
let decodeRequestId = 0

const contentKind = computed(() => guessContentKind(decodeText.value))
const decodeIsHttp = computed(() => isHttpUrl(decodeText.value))

const runGenerate = async () => {
  const requestId = ++generateRequestId
  const text = content.value.trim()

  if (!text) {
    if (requestId === generateRequestId) {
      qrCodeUrl.value = ''
      generateError.value = ''
    }
    return
  }

  try {
    const url = await generateQrDataUrl(content.value, options.value)
    if (requestId !== generateRequestId) return
    qrCodeUrl.value = url
    generateError.value = ''
  } catch (err) {
    if (requestId !== generateRequestId) return
    qrCodeUrl.value = ''
    generateError.value = `生成失败: ${errorMessage(err, '未知错误')}`
  }
}

const debouncedGenerate = debounce(runGenerate, 280)

watch(
  [content, options],
  () => {
    options.value = normalizeQrOptions(options.value)
    debouncedGenerate()
  },
  { deep: true, immediate: true }
)

const clearGenerate = () => {
  content.value = ''
  qrCodeUrl.value = ''
  generateError.value = ''
}

const downloadPng = () => {
  if (!qrCodeUrl.value) return
  downloadDataUrl(qrCodeUrl.value, 'qrcode.png')
  message.success('开始下载')
}

const copyPng = async () => {
  if (!qrCodeUrl.value) return
  try {
    await copyImageDataUrl(qrCodeUrl.value)
    message.success('已复制图片到剪贴板')
  } catch {
    message.error('复制失败，请改用下载')
  }
}

const runDecode = async (dataUrl: string) => {
  const requestId = ++decodeRequestId
  decodePreview.value = dataUrl
  decodeText.value = ''
  decodeVersion.value = null
  decodeError.value = ''
  decodeLoading.value = true

  try {
    const result = await decodeQrFromImageSource(dataUrl)
    if (requestId !== decodeRequestId) return
    decodeText.value = result.text
    decodeVersion.value = result.version
    message.success('识别成功')
  } catch (err) {
    if (requestId !== decodeRequestId) return
    decodeError.value = errorMessage(err, '解析失败')
  } finally {
    if (requestId === decodeRequestId) {
      decodeLoading.value = false
    }
  }
}

const processImageFile = async (file: File | null | undefined) => {
  if (!file) {
    message.error('请选择图片文件')
    return
  }
  if (!file.type.startsWith('image/')) {
    message.error('请选择图片文件')
    return
  }

  try {
    const dataUrl = await readFileAsDataUrl(file)
    await runDecode(dataUrl)
  } catch (err) {
    decodeError.value = errorMessage(err, '读取文件失败')
  }
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  void processImageFile(input.files?.[0])
  input.value = ''
}

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void processImageFile(file)
  else message.error('请拖入图片文件')
}

const pasteImage = async () => {
  const dataUrl = await readClipboardImageAsDataUrl()
  if (!dataUrl) {
    message.error('剪贴板中没有图片，或浏览器未授权读取')
    return
  }
  await runDecode(dataUrl)
}

const clearDecode = () => {
  decodeRequestId += 1
  decodePreview.value = ''
  decodeText.value = ''
  decodeError.value = ''
  decodeVersion.value = null
  decodeLoading.value = false
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const fillToGenerate = () => {
  if (!decodeText.value) return
  content.value = decodeText.value
  mode.value = 'generate'
  message.success('已填入生成页')
}

const onWindowPaste = (event: ClipboardEvent) => {
  if (mode.value !== 'decode') return
  const file = getClipboardImageFile(event)
  if (!file) return
  event.preventDefault()
  void processImageFile(file)
}

onMounted(() => {
  options.value = normalizeQrOptions(options.value)
  window.addEventListener('paste', onWindowPaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', onWindowPaste)
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  --mode-accent: var(--color-primary);
}

.tool-content.is-decode {
  --mode-accent: #14b8a6;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  max-width: 640px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.mode-tab:hover {
  border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
  color: var(--color-text-primary);
}

.mode-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  flex: 0 0 auto;
}

.mode-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mode-copy strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 650;
  line-height: 1.3;
}

.mode-copy small {
  color: var(--color-text-tertiary);
  font-size: 11px;
  line-height: 1.35;
}

.mode-tab.active {
  border-color: var(--tab-accent, var(--color-primary));
  color: var(--tab-accent, var(--color-primary));
}

.mode-tab-generate {
  --tab-accent: var(--color-primary);
}

.mode-tab-decode {
  --tab-accent: #14b8a6;
}

.mode-tab.active .mode-icon {
  background: transparent;
  color: var(--tab-accent, var(--color-primary));
  box-shadow: inset 0 0 0 1px var(--tab-accent, var(--color-primary));
}

.mode-tab.active .mode-copy strong {
  color: var(--tab-accent, var(--color-primary));
}

.mode-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  border-top: 1px solid color-mix(in srgb, var(--mode-accent) 55%, var(--color-border));
  padding-top: 2px;
}

.top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--spacing-md);
  align-items: stretch;
}

.panel :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.mono-input :deep(textarea),
.mono-input :deep(input) {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.preset-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background-color var(--transition-fast);
}

.chip:hover {
  border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  color: var(--color-text-primary);
}

.chip.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 14%, transparent));
  color: var(--color-primary);
}

.preview-box {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.qr-image {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  image-rendering: pixelated;
}

.config-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.config-row.wrap {
  flex-wrap: wrap;
}

.config-label {
  flex: 0 0 48px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.config-slider {
  flex: 1;
  min-width: 160px;
}

.config-value {
  flex: 0 0 auto;
  min-width: 88px;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
}

.color-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.color-picker {
  width: 32px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.color-hex {
  width: 108px;
}

.upload-area {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 8%, transparent));
}

.upload-area.has-image {
  border-style: solid;
}

.upload-placeholder {
  text-align: center;
  color: var(--color-text-secondary);
}

.upload-title {
  margin: 0 0 6px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.upload-hint {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.upload-preview {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.hidden-input {
  display: none;
}

.decode-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-chip {
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 11px;
}

.result-link {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}

.result-link:hover {
  text-decoration: underline;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px 16px;
}

.tip-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tip-item strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.tip-item span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

@media (max-width: 900px) {
  .top-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .mode-switch {
    grid-template-columns: 1fr;
    max-width: none;
  }

  .mode-tab {
    min-height: 58px;
  }

  .config-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .config-label {
    flex: none;
  }

  .config-slider {
    width: 100%;
  }
}
</style>
