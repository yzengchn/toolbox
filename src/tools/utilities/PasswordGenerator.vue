<template>
  <div class="tool-container">
    <ToolHeader
      title="密码生成器"
      description="生成安全的随机密码"
    />

    <div class="tool-content">
      <div class="top-card-grid">
        <n-card title="配置选项">
          <n-space vertical :size="24">
            <div class="length-control">
              <n-text strong>密码长度: {{ length }}</n-text>
              <n-slider v-model:value="length" :min="4" :max="64" :step="1" />
            </div>

            <div class="character-type-row">
              <n-text strong class="character-type-label">字符类型</n-text>
              <n-space class="character-type-options" :size="[16, 8]">
                <n-checkbox v-model:checked="options.uppercase">
                  大写字母 (A-Z)
                </n-checkbox>
                <n-checkbox v-model:checked="options.lowercase">
                  小写字母 (a-z)
                </n-checkbox>
                <n-checkbox v-model:checked="options.numbers">
                  数字 (0-9)
                </n-checkbox>
                <n-checkbox v-model:checked="options.symbols">
                  符号 (!@#$%^&*...)
                </n-checkbox>
              </n-space>
            </div>

            <div>
              <n-text strong>排除字符 (可选)</n-text>
              <n-input
                v-model:value="excludeChars"
                placeholder="输入要排除的字符，例如: iIlL1oO0"
                style="margin-top: 8px"
              />
            </div>

            <div>
              <n-text strong>生成数量</n-text>
              <n-input-number
                v-model:value="count"
                :min="1"
                :max="20"
                style="width: 100%; margin-top: 8px"
              />
            </div>

            <n-space>
              <n-button type="primary" @click="handleGenerate">
                生成密码
              </n-button>
              <n-button @click="handleClear">
                清空
              </n-button>
            </n-space>
          </n-space>
        </n-card>

        <n-card title="密码强度说明">
          <n-space vertical :size="8">
            <div class="strength-rule">
              <n-tag type="error" size="small">弱</n-tag>
              <span>长度 &lt; 8 或字符类型少于 2 种</span>
            </div>
            <div class="strength-rule">
              <n-tag type="warning" size="small">中</n-tag>
              <span>长度 8-11 且包含 2-3 种字符类型</span>
            </div>
            <div class="strength-rule">
              <n-tag type="success" size="small">强</n-tag>
              <span>长度 ≥ 12 且包含 3-4 种字符类型</span>
            </div>
          </n-space>
        </n-card>
      </div>

      <n-alert v-if="error" type="error" style="margin-top: 16px">
        {{ error }}
      </n-alert>

      <n-card
        v-if="passwords.length > 0"
        title="生成的密码"
        class="password-results-card"
        :style="passwordResultsStyle"
      >
        <n-space vertical :size="12">
          <div v-for="(pwd, index) in passwords" :key="index" class="password-item">
            <n-input
              :value="pwd"
              readonly
              type="text"
            >
              <template #suffix>
                <n-space :size="8">
                  <n-button text @click="handleCopy(pwd)">
                    复制
                  </n-button>
                  <n-button text @click="handleToggleVisibility(index)">
                    {{ visibilityMap[index] ? '隐藏' : '显示' }}
                  </n-button>
                </n-space>
              </template>
            </n-input>
            <div class="password-strength">
              <span>强度: </span>
              <n-tag :type="getStrengthType(pwd)" size="small">
                {{ getStrengthText(pwd) }}
              </n-tag>
            </div>
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
import { computed, ref, reactive } from 'vue'
import { NCard, NSlider, NCheckbox, NInput, NInputNumber, NButton, NSpace, NAlert, NTag, NText } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copy } = useClipboard()

const length = ref(16)
const count = ref(1)
const excludeChars = ref('')
const error = ref('')
const passwords = ref<string[]>([])
const visibilityMap = ref<Record<number, boolean>>({})
const passwordResultsStyle = computed(() => {
  const maxLength = passwords.value.reduce((max, pwd) => Math.max(max, pwd.length), 0)

  return {
    '--password-length': String(Math.max(maxLength, 8)),
    marginTop: '16px'
  }
})

const options = reactive({
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: false
})

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
}

const handleGenerate = () => {
  error.value = ''
  passwords.value = []
  visibilityMap.value = {}

  // 验证至少选择一种字符类型
  if (!options.uppercase && !options.lowercase && !options.numbers && !options.symbols) {
    error.value = '请至少选择一种字符类型'
    return
  }

  // 构建字符集
  let charset = ''
  if (options.uppercase) charset += CHAR_SETS.uppercase
  if (options.lowercase) charset += CHAR_SETS.lowercase
  if (options.numbers) charset += CHAR_SETS.numbers
  if (options.symbols) charset += CHAR_SETS.symbols

  // 排除指定字符
  if (excludeChars.value) {
    const excludeSet = new Set(excludeChars.value.split(''))
    charset = charset.split('').filter(c => !excludeSet.has(c)).join('')
  }

  if (charset.length === 0) {
    error.value = '没有可用的字符生成密码'
    return
  }

  // 生成密码
  for (let i = 0; i < count.value; i++) {
    const password = generatePassword(charset, length.value)
    passwords.value.push(password)
  }
}

const generatePassword = (charset: string, len: number): string => {
  const array = new Uint32Array(len)
  crypto.getRandomValues(array)

  let password = ''
  for (let i = 0; i < len; i++) {
    password += charset[array[i] % charset.length]
  }

  return password
}

const handleCopy = (pwd: string) => {
  copy(pwd)
}

const handleCopyAll = () => {
  copy(passwords.value.join('\n'), '已复制所有密码到剪贴板')
}

const handleToggleVisibility = (index: number) => {
  visibilityMap.value[index] = !visibilityMap.value[index]
}

const handleClear = () => {
  passwords.value = []
  error.value = ''
  visibilityMap.value = {}
}

const getStrengthText = (pwd: string): string => {
  const strength = calculateStrength(pwd)
  if (strength >= 3) return '强'
  if (strength >= 2) return '中'
  return '弱'
}

const getStrengthType = (pwd: string): 'success' | 'warning' | 'error' => {
  const strength = calculateStrength(pwd)
  if (strength >= 3) return 'success'
  if (strength >= 2) return 'warning'
  return 'error'
}

const calculateStrength = (pwd: string): number => {
  let score = 0

  // 长度评分
  if (pwd.length >= 12) score += 1.5
  else if (pwd.length >= 8) score += 1
  else score += 0.5

  // 字符类型评分
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd)

  const typeCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length
  score += typeCount * 0.5

  return score
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
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: var(--spacing-md);
  align-items: start;
}

.length-control {
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: center;
  gap: var(--spacing-md);
}

.character-type-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.character-type-label {
  flex: 0 0 auto;
  white-space: nowrap;
}

.character-type-options {
  flex: 1;
  min-width: 0;
}

.password-results-card {
  width: fit-content;
  max-width: 100%;
}

.password-results-card :deep(.n-card__content) {
  max-width: 100%;
  overflow-x: auto;
}

.password-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: min(calc(var(--password-length) * 1ch + 136px), calc(100vw - var(--spacing-lg) * 2 - 48px));
  min-width: 240px;
  max-width: 100%;
}

.password-item :deep(.n-input__input-el) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.password-strength {
  display: flex;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.strength-rule {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  line-height: 1.5;
}

.strength-rule span {
  min-width: 0;
}

@media (max-width: 900px) {
  .top-card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .character-type-row {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
</style>
