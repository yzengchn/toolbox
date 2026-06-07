<template>
  <div class="tool-container">
    <ToolHeader
      title="Base64 图片编解码"
      description="图片与 Base64 字符串互转，支持拖拽上传和预览"
    />

    <div class="tool-content">
      <div class="workspace-grid">
        <Base64ImageEncodePanel />
        <Base64ImageDecodePanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ToolHeader from '@/components/ToolHeader.vue'
import Base64ImageEncodePanel from './components/Base64ImageEncodePanel.vue'
import Base64ImageDecodePanel from './components/Base64ImageDecodePanel.vue'
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
  align-items: stretch;
}

.workspace-grid :deep(.panel-card) {
  height: 100%;
  border-radius: var(--radius-md);
}

.workspace-grid :deep(.actions-row) {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
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
