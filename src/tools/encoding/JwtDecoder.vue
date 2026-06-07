<template>
  <div class="tool-container">
    <ToolHeader
      title="JWT 解码"
      description="解析 JWT 的 Header、Payload、Signature 与过期状态"
    />

    <div class="tool-content">
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="Token 输入">
            <n-space vertical :size="16">
              <n-input
                v-model:value="token"
                type="textarea"
                placeholder="输入 JWT Token，例如 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                :rows="8"
                clearable
              />

              <n-space wrap>
                <n-button @click="fillExample">
                  示例
                </n-button>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </n-space>
          </n-card>

          <n-card title="说明" class="tips-card">
            <n-space vertical :size="8">
              <div>仅做本地解码，不校验签名真伪。</div>
              <div>支持标准三段式 JWT：`header.payload.signature`。</div>
              <div>如果 Payload 包含 `exp`、`iat`、`nbf`，会自动转换为本地时间展示。</div>
            </n-space>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card title="解析结果">
            <template #header-extra>
              <n-button text :disabled="!result" @click="handleCopySummary">
                复制结果
              </n-button>
            </template>

            <n-empty v-if="!result && !error" description="输入 Token 后自动解析" />

            <n-space v-else-if="result" vertical :size="16">
              <n-alert
                :type="result.expiresAt ? (result.isExpired ? 'warning' : 'success') : 'info'"
                :bordered="false"
              >
                {{
                  result.expiresAt
                    ? result.isExpired
                      ? `Token 已过期，过期时间：${result.expiresAt}`
                      : `Token 未过期，过期时间：${result.expiresAt}`
                    : '未检测到 exp 字段，仅完成解码'
                }}
              </n-alert>

              <n-descriptions :column="1" bordered label-placement="left">
                <n-descriptions-item label="Signature">
                  <span class="mono break-all">{{ result.signature || '(empty)' }}</span>
                </n-descriptions-item>
                <n-descriptions-item label="过期时间">
                  {{ result.expiresAt ?? '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="签发时间">
                  {{ result.issuedAt ?? '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="生效时间">
                  {{ result.notBefore ?? '-' }}
                </n-descriptions-item>
              </n-descriptions>

              <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
                <n-grid-item>
                  <n-card size="small" title="Header" embedded>
                    <template #header-extra>
                      <n-button text @click="copy(headerText)">
                        复制
                      </n-button>
                    </template>

                    <n-input
                      :value="headerText"
                      type="textarea"
                      :rows="10"
                      readonly
                    />
                  </n-card>
                </n-grid-item>

                <n-grid-item>
                  <n-card size="small" title="Payload" embedded>
                    <template #header-extra>
                      <n-button text @click="copy(payloadText)">
                        复制
                      </n-button>
                    </template>

                    <n-input
                      :value="payloadText"
                      type="textarea"
                      :rows="10"
                      readonly
                    />
                  </n-card>
                </n-grid-item>
              </n-grid>
            </n-space>
          </n-card>

          <n-alert v-if="error" type="error" class="status-card">
            {{ error }}
          </n-alert>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NGrid,
  NGridItem,
  NInput,
  NSpace
} from 'naive-ui'
import { useClipboard } from '@/composables/useClipboard'
import { todayAt, unixSeconds } from '@/utils/demoTime'
import { decodeJWT, encodeBase64, type JwtDecodeResult } from './utils'
import ToolHeader from '@/components/ToolHeader.vue'

const { copy } = useClipboard()

const token = ref('')
const error = ref('')
const result = ref<JwtDecodeResult | null>(null)

const headerText = computed(() => JSON.stringify(result.value?.header ?? {}, null, 2))
const payloadText = computed(() => JSON.stringify(result.value?.payload ?? {}, null, 2))

const buildExampleToken = () => {
  const header = encodeBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), true)
  const issuedAt = unixSeconds(todayAt(9))
  const notBefore = unixSeconds(todayAt(9, 5))
  const expiresAt = unixSeconds(todayAt(23, 59, 59))
  const payload = encodeBase64(
    JSON.stringify({
      sub: '1234567890',
      name: 'ToolBox Demo',
      role: 'admin',
      iat: issuedAt,
      nbf: notBefore,
      exp: expiresAt
    }),
    true
  )

  return `${header}.${payload}.signature-demo`
}

const handleDecode = () => {
  error.value = ''

  if (!token.value.trim()) {
    result.value = null
    return
  }

  try {
    result.value = decodeJWT(token.value)
  } catch (decodeError) {
    result.value = null
    error.value = (decodeError as Error).message
  }
}

const fillExample = () => {
  token.value = buildExampleToken()
}

const handleClear = () => {
  token.value = ''
  result.value = null
  error.value = ''
}

const handleCopySummary = async () => {
  if (!result.value) return

  await copy([
    `Signature: ${result.value.signature || '(empty)'}`,
    `过期时间: ${result.value.expiresAt ?? '-'}`,
    `签发时间: ${result.value.issuedAt ?? '-'}`,
    `生效时间: ${result.value.notBefore ?? '-'}`,
    'Header:',
    headerText.value,
    'Payload:',
    payloadText.value
  ].join('\n'))
}

// 实时监听 token 输入变化
watch(token, () => {
  handleDecode()
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 1180px;
}

.tips-card,
.status-card {
  margin-top: 16px;
}

.mono {
  font-family: var(--font-mono);
}

.break-all {
  word-break: break-all;
}

@media (max-width: 768px) {
  .tool-container {
    padding: var(--spacing-md);
  }
}
</style>
