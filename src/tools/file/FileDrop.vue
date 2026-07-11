<template>
  <div class="file-drop">
    <div
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      role="button"
      tabindex="0"
      :aria-label="label"
      @click="triggerPick"
      @keydown.enter.prevent="triggerPick"
      @keydown.space.prevent="triggerPick"
      @drop.prevent="onDrop"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
    >
      <div class="upload-placeholder">
        <n-icon size="36" color="var(--color-text-tertiary)">
          <svg viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
            />
          </svg>
        </n-icon>
        <p>{{ loading ? '读取中...' : label }}</p>
        <p class="upload-hint">支持 .txt，每行一个 ID</p>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      style="display: none"
      @change="onChange"
    />

    <div v-if="fileName" class="file-meta">
      <span class="file-meta-name">{{ fileName }}</span>
      <span v-if="typeof lineCount === 'number'"> · {{ lineCount }} 行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NIcon } from 'naive-ui'

const props = withDefaults(
  defineProps<{
    label: string
    accept?: string
    fileName?: string | null
    lineCount?: number | null
    loading?: boolean
  }>(),
  {
    accept: '.txt,text/plain',
    fileName: null,
    lineCount: null,
    loading: false
  }
)

const emit = defineEmits<{ select: [file: File] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const triggerPick = () => {
  fileInput.value?.click()
}

const emitFile = (file: File | undefined | null) => {
  if (file) emit('select', file)
}

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emitFile(target.files?.[0])
  target.value = '' // 允许重复选择同一文件
}

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  emitFile(event.dataTransfer?.files?.[0])
}
</script>

<style scoped>
.file-drop {
  width: 100%;
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
  min-height: 160px;
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

.upload-area:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.upload-placeholder p {
  margin: 0;
  color: var(--color-text-secondary);
}

.upload-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.file-meta {
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.file-meta-name {
  font-weight: 600;
  color: var(--color-text-primary);
}
</style>
