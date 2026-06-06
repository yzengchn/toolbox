<template>
  <div class="tool-container">
    <ToolHeader
      title="URL 编码/解码"
      description="对 URL 进行编码和解码操作"
    />

    <div class="tool-content">
      <n-card title="输入">
        <n-space vertical :size="16">
          <n-input
            v-model:value="input"
            type="textarea"
            placeholder="输入要编码或解码的文本"
            :rows="6"
            clearable
          />

          <n-space>
            <n-button type="primary" @click="handleEncode">
              编码
            </n-button>
            <n-button type="primary" @click="handleDecode">
              解码
            </n-button>
            <n-button @click="handleEncodeComponent">
              encodeURIComponent
            </n-button>
            <n-button @click="handleDecodeComponent">
              decodeURIComponent
            </n-button>
            <n-button @click="handleSwap">
              交换
            </n-button>
            <n-button @click="handleClear">
              清空
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-card title="输出" style="margin-top: 16px">
        <n-input
          v-model:value="output"
          type="textarea"
          placeholder="结果将显示在这里"
          :rows="6"
          readonly
        />
        <template #header-extra>
          <n-button text @click="handleCopyOutput" v-if="output">
            复制
          </n-button>
        </template>
      </n-card>

      <n-alert v-if="error" type="error" style="margin-top: 16px">
        {{ error }}
      </n-alert>

      <n-card title="说明" style="margin-top: 16px">
        <n-space vertical :size="8">
          <div>
            <strong>encodeURI:</strong> 对完整的 URL 进行编码，不会编码 URL 中的特殊字符（如 :/?#[]@）
          </div>
          <div>
            <strong>encodeURIComponent:</strong> 对 URL 的组成部分进行编码，会编码所有特殊字符
          </div>
          <div>
            <strong>示例:</strong>
            <n-code :code="exampleCode" language="javascript" />
          </div>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NInput, NButton, NSpace, NAlert, NCode } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copy } = useClipboard()

const input = ref('')
const output = ref('')
const error = ref('')

const exampleCode = `const url = 'https://example.com/search?q=你好世界&page=1'

// encodeURI
encodeURI(url)
// https://example.com/search?q=%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C&page=1

// encodeURIComponent
encodeURIComponent('你好世界')
// %E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C`

const handleEncode = () => {
  error.value = ''
  try {
    output.value = encodeURI(input.value)
  } catch (err) {
    error.value = '编码失败: ' + (err as Error).message
  }
}

const handleDecode = () => {
  error.value = ''
  try {
    output.value = decodeURI(input.value)
  } catch (err) {
    error.value = '解码失败: ' + (err as Error).message
  }
}

const handleEncodeComponent = () => {
  error.value = ''
  try {
    output.value = encodeURIComponent(input.value)
  } catch (err) {
    error.value = '编码失败: ' + (err as Error).message
  }
}

const handleDecodeComponent = () => {
  error.value = ''
  try {
    output.value = decodeURIComponent(input.value)
  } catch (err) {
    error.value = '解码失败: ' + (err as Error).message
  }
}

const handleSwap = () => {
  const temp = input.value
  input.value = output.value
  output.value = temp
}

const handleClear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
}

const handleCopyOutput = () => {
  copy(output.value)
}
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 100%;
}
</style>
