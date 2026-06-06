<template>
  <div class="tool-container">
    <ToolHeader
      title="UUID 生成器"
      description="生成 UUID (通用唯一识别码)"
    />

    <div class="tool-content">
      <div class="top-card-grid">
        <n-card title="生成选项">
          <n-space vertical :size="16">
            <div>
              <n-text strong>UUID 版本</n-text>
              <n-radio-group v-model:value="version" style="margin-top: 8px">
                <n-space>
                  <n-radio value="v4">
                    UUID v4 (随机)
                  </n-radio>
                  <n-radio value="v1" disabled>
                    UUID v1 (时间戳) - 暂不支持
                  </n-radio>
                </n-space>
              </n-radio-group>
            </div>

            <div>
              <n-text strong>生成数量</n-text>
              <n-input-number
                v-model:value="count"
                :min="1"
                :max="100"
                style="width: 100%; margin-top: 8px"
              />
            </div>

            <div>
              <n-text strong>格式</n-text>
              <n-radio-group v-model:value="format" style="margin-top: 8px">
                <n-space vertical>
                  <n-radio value="default">
                    标准格式 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                  </n-radio>
                  <n-radio value="uppercase">
                    大写
                  </n-radio>
                  <n-radio value="noDash">
                    无连字符
                  </n-radio>
                  <n-radio value="braces">
                    带大括号 {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
                  </n-radio>
                </n-space>
              </n-radio-group>
            </div>

            <n-space>
              <n-button type="primary" @click="handleGenerate">
                生成 UUID
              </n-button>
              <n-button @click="handleClear">
                清空
              </n-button>
            </n-space>
          </n-space>
        </n-card>

        <n-card title="关于 UUID">
          <n-space vertical :size="8">
            <div class="uuid-info-item">
              <strong>UUID:</strong>
              <span>通用唯一识别码，是一个 128 位的数字标识符</span>
            </div>
            <div class="uuid-info-item">
              <strong>UUID v4:</strong>
              <span>基于随机数生成，碰撞概率极低，适用于大多数场景</span>
            </div>
            <div class="uuid-info-item">
              <strong>格式:</strong>
              <span>32 个十六进制数字，通常以 8-4-4-4-12 的格式用连字符分隔</span>
            </div>
          </n-space>
        </n-card>
      </div>

      <n-card v-if="uuids.length > 0" title="生成结果" style="margin-top: 16px">
        <n-space vertical :size="8">
          <div v-for="(uuid, index) in uuids" :key="index" class="uuid-item">
            <n-input
              :value="uuid"
              readonly
              type="text"
            >
              <template #suffix>
                <n-button text @click="handleCopy(uuid)">
                  复制
                </n-button>
              </template>
            </n-input>
          </div>
        </n-space>
        <template #header-extra>
          <n-button text @click="handleCopyAll">
            复制全部
          </n-button>
        </template>
      </n-card>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NInputNumber, NRadioGroup, NRadio, NInput, NButton, NSpace, NText } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copy } = useClipboard()

const version = ref('v4')
const count = ref(1)
const format = ref('default')
const uuids = ref<string[]>([])

const generateUUIDv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const formatUUID = (uuid: string): string => {
  switch (format.value) {
    case 'uppercase':
      return uuid.toUpperCase()
    case 'noDash':
      return uuid.replace(/-/g, '')
    case 'braces':
      return `{${uuid}}`
    default:
      return uuid
  }
}

const handleGenerate = () => {
  uuids.value = []

  for (let i = 0; i < count.value; i++) {
    const uuid = generateUUIDv4()
    uuids.value.push(formatUUID(uuid))
  }
}

const handleCopy = (uuid: string) => {
  copy(uuid)
}

const handleCopyAll = () => {
  copy(uuids.value.join('\n'), '已复制所有 UUID 到剪贴板')
}

const handleClear = () => {
  uuids.value = []
}
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 100%;
}

.top-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-md);
  align-items: start;
}

.uuid-item {
  width: 100%;
}

.uuid-info-item {
  display: flex;
  gap: var(--spacing-xs);
  line-height: 1.5;
}

.uuid-info-item strong {
  flex: 0 0 auto;
}

.uuid-info-item span {
  min-width: 0;
}

@media (max-width: 900px) {
  .top-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
