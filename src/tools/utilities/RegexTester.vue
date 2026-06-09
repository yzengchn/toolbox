<template>
  <div class="tool-container">
    <ToolHeader
      title="正则表达式"
      description="测试 JavaScript 正则表达式，查看匹配分组并执行文本替换"
    />

    <div class="tool-content regex-tool">
      <n-card class="pattern-card">
        <div class="pattern-panel">
          <div class="pattern-layout">
            <div class="pattern-main">
              <div class="pattern-shell">
                <span class="regex-slash">/</span>
                <n-input
                  v-model:value="pattern"
                  placeholder="输入正则表达式"
                  clearable
                />
                <span class="regex-slash">/</span>
                <span class="flag-text">{{ flagText || '-' }}</span>
              </div>

              <div class="flag-row">
                <n-checkbox
                  v-for="flag in flagOptions"
                  :key="flag.value"
                  :checked="isFlagSelected(flag.value)"
                  @update:checked="checked => setFlag(flag.value, checked)"
                >
                  {{ flag.label }}
                </n-checkbox>
              </div>
            </div>

            <n-button @click="handleClear">
              清空
            </n-button>
          </div>

          <div class="common-section">
            <div class="common-head">
              <span>常用正则</span>
              <small>{{ commonPatterns.length }} 项</small>
            </div>

            <div class="common-grid">
              <button
                v-for="example in commonPatterns"
                :key="example.label"
                type="button"
                class="common-item"
                :title="`/${example.pattern}/${example.flags.join('')}`"
                @click="applyExample(example)"
              >
                {{ example.label }}
              </button>
            </div>
          </div>
        </div>
      </n-card>

      <n-alert v-if="errorMessage" type="error" class="status-alert">
        {{ errorMessage }}
      </n-alert>

      <div class="workbench-grid">
        <n-card title="测试文本" class="editor-card">
          <template #header-extra>
            <n-tag size="small">
              {{ testText.length }} 字符
            </n-tag>
          </template>

          <n-input
            v-model:value="testText"
            type="textarea"
            placeholder="输入要测试的文本"
            :autosize="{ minRows: 22, maxRows: 36 }"
          />
        </n-card>

        <n-card title="匹配结果" class="result-card">
          <template #header-extra>
            <n-button
              text
              size="small"
              :disabled="!matches.length"
              @click="handleCopyMatches"
            >
              复制匹配
            </n-button>
          </template>

          <div class="result-summary">
            <div>
              <strong>{{ matches.length }}</strong>
              <span>匹配项</span>
            </div>
            <div>
              <strong>{{ flagText || '-' }}</strong>
              <span>flags</span>
            </div>
          </div>

          <div class="preview-box">
            <n-empty
              v-if="!previewSegments.length"
              :description="pattern ? '暂无匹配' : '输入表达式后开始匹配'"
            />
            <pre v-else class="match-preview"><template v-for="segment in previewSegments" :key="segment.key"><mark v-if="segment.match">{{ segment.text }}</mark><span v-else>{{ segment.text }}</span></template></pre>
          </div>

          <div v-if="matches.length" class="match-list">
            <div
              v-for="item in matches"
              :key="item.key"
              class="match-item"
            >
              <div class="match-head">
                <n-tag size="small">#{{ item.order }}</n-tag>
                <span class="match-range">{{ item.index }} - {{ item.end }}</span>
                <n-button text size="small" @click="copy(item.value)">
                  复制
                </n-button>
              </div>
              <code class="match-value">{{ item.value || '(空字符串)' }}</code>
              <div v-if="item.captures.length" class="capture-list">
                <div
                  v-for="capture in item.captures"
                  :key="`${item.key}-${capture.label}`"
                  class="capture-item"
                >
                  <span>{{ capture.label }}</span>
                  <code>{{ capture.value ?? '未匹配' }}</code>
                </div>
              </div>
            </div>
          </div>

          <n-alert v-if="isMatchLimitReached" type="warning" class="limit-alert">
            最多展示前 {{ maxMatches }} 项匹配
          </n-alert>
        </n-card>

        <n-card title="替换" class="replace-card">
          <template #header-extra>
            <n-button
              text
              size="small"
              :disabled="!replaceState.value"
              @click="handleCopyReplaceResult"
            >
              复制结果
            </n-button>
          </template>

          <div class="replace-field">
            <n-text strong>替换为</n-text>
            <n-input
              v-model:value="replacement"
              placeholder="例如：$1、$<name>"
            />
          </div>

          <n-input
            :value="replaceState.value"
            type="textarea"
            readonly
            placeholder="替换结果"
            :autosize="{ minRows: 18, maxRows: 36 }"
          />
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NAlert, NButton, NCard, NCheckbox, NEmpty, NInput, NTag, NText } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

type RegexFlag = 'g' | 'i' | 'm' | 's' | 'u' | 'y'

type RegexExample = {
  label: string
  pattern: string
  flags: RegexFlag[]
  replacement: string
  text: string
}

type CaptureItem = {
  label: string
  value: string | undefined
}

type MatchItem = {
  key: string
  order: number
  index: number
  end: number
  value: string
  captures: CaptureItem[]
}

type PreviewSegment = {
  key: string
  text: string
  match: boolean
}

const { copy } = useClipboard()

const maxMatches = 500
const pattern = ref('(?<name>[\\w.+-]+)@(?<domain>[\\w.-]+\\.\\w+)')
const selectedFlags = ref<RegexFlag[]>(['g', 'i'])
const replacement = ref('$<domain>/$<name>')
const testText = ref([
  'support@example.com',
  'admin@tools.neocockpit.cn',
  'invalid-email'
].join('\n'))

const flagOptions: Array<{ value: RegexFlag; label: string }> = [
  { value: 'g', label: 'g 全局' },
  { value: 'i', label: 'i 忽略大小写' },
  { value: 'm', label: 'm 多行' },
  { value: 's', label: 's 点匹配换行' },
  { value: 'u', label: 'u Unicode' },
  { value: 'y', label: 'y 粘连' }
]

const commonPatterns: RegexExample[] = [
  {
    label: '匹配中文字符',
    pattern: '[\\u4e00-\\u9fa5]+',
    flags: ['g'],
    replacement: '[中文]',
    text: 'ToolBox 在线工具\nregex tester\n中文字符匹配'
  },
  {
    label: '匹配空白行',
    pattern: '^\\s*$',
    flags: ['g', 'm'],
    replacement: '',
    text: ['第一行', '', '   ', '第二行', '\t', '第三行'].join('\n')
  },
  {
    label: '匹配Email地址',
    pattern: '(?<name>[\\w.+-]+)@(?<domain>[\\w.-]+\\.\\w+)',
    flags: ['g', 'i'],
    replacement: '$<domain>/$<name>',
    text: ['support@example.com', 'admin@tools.neocockpit.cn', 'invalid-email'].join('\n')
  },
  {
    label: '匹配网址URL',
    pattern: 'https?:\\/\\/(?:localhost|(?:[\\w-]+\\.)+[\\w-]+)(?::\\d{1,5})?(?:[\\w./?%&=+#:-]*)?',
    flags: ['g', 'i'],
    replacement: '[link]',
    text: '文档：https://tools.neocockpit.cn/tool/regex-tester\n接口：http://localhost:3000/api'
  },
  {
    label: '匹配国内电话号码',
    pattern: '(?:1[3-9]\\d{9}|0\\d{2}-\\d{8}|0\\d{3}-\\d{7,8})',
    flags: ['g'],
    replacement: '[电话]',
    text: '手机：13800138000\n北京：010-12345678\n深圳：0755-1234567\n错误：123-456'
  },
  {
    label: '匹配腾讯QQ号',
    pattern: '[1-9][0-9]{4,10}',
    flags: ['g'],
    replacement: '[QQ]',
    text: '客服 QQ：10000\n测试号：123456789\n无效：01234'
  },
  {
    label: '匹配中国邮政编码',
    pattern: '\\b[1-9]\\d{5}\\b',
    flags: ['g'],
    replacement: '[邮编]',
    text: '北京 100000，上海 200000，无效 012345'
  },
  {
    label: '匹配18位身份证号',
    pattern: '[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[0-9Xx]',
    flags: ['g'],
    replacement: '[身份证]',
    text: '身份证：11010519900307123X\n错误：110105199013401234'
  },
  {
    label: '匹配(年-月-日)格式日期',
    pattern: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b',
    flags: ['g'],
    replacement: '[日期]',
    text: '发布日期：2026-06-09\n无效日期：2026-13-40\n短日期：2026-6-9'
  }
]

const orderedFlags = computed(() => {
  return flagOptions
    .map(flag => flag.value)
    .filter(flag => selectedFlags.value.includes(flag))
})

const flagText = computed(() => orderedFlags.value.join(''))

const regexState = computed(() => {
  if (!pattern.value) {
    return {
      regex: null,
      error: ''
    }
  }

  try {
    return {
      regex: new RegExp(pattern.value, flagText.value),
      error: ''
    }
  } catch (error) {
    return {
      regex: null,
      error: (error as Error).message
    }
  }
})

const matches = computed<MatchItem[]>(() => {
  const regex = regexState.value.regex
  const text = testText.value

  if (!regex || !text) {
    return []
  }

  const items: MatchItem[] = []
  regex.lastIndex = 0

  if (!regex.global) {
    const result = regex.exec(text)
    return result ? [createMatchItem(result, 1)] : []
  }

  let result: RegExpExecArray | null
  while ((result = regex.exec(text)) !== null) {
    items.push(createMatchItem(result, items.length + 1))

    if (items.length >= maxMatches) {
      break
    }

    if (result[0] === '') {
      if (regex.lastIndex >= text.length) {
        break
      }

      regex.lastIndex += 1
    }
  }

  return items
})

const previewSegments = computed<PreviewSegment[]>(() => {
  const text = testText.value
  const visibleMatches = matches.value.filter(item => item.end > item.index)

  if (!text || !visibleMatches.length) {
    return []
  }

  const segments: PreviewSegment[] = []
  let cursor = 0

  visibleMatches.forEach((item, index) => {
    if (item.index > cursor) {
      segments.push({
        key: `text-${index}-${cursor}`,
        text: text.slice(cursor, item.index),
        match: false
      })
    }

    segments.push({
      key: `match-${item.order}-${item.index}`,
      text: text.slice(item.index, item.end),
      match: true
    })

    cursor = item.end
  })

  if (cursor < text.length) {
    segments.push({
      key: `text-tail-${cursor}`,
      text: text.slice(cursor),
      match: false
    })
  }

  return segments
})

const replaceState = computed(() => {
  const regex = regexState.value.regex

  if (!regex || !testText.value) {
    return {
      value: '',
      error: ''
    }
  }

  try {
    return {
      value: testText.value.replace(regex, replacement.value),
      error: ''
    }
  } catch (error) {
    return {
      value: '',
      error: (error as Error).message
    }
  }
})

const errorMessage = computed(() => regexState.value.error || replaceState.value.error)
const isMatchLimitReached = computed(() => matches.value.length >= maxMatches)

const isFlagSelected = (flag: RegexFlag) => selectedFlags.value.includes(flag)

const setFlag = (flag: RegexFlag, checked: boolean) => {
  const next = new Set(selectedFlags.value)

  if (checked) {
    next.add(flag)
  } else {
    next.delete(flag)
  }

  selectedFlags.value = flagOptions
    .map(option => option.value)
    .filter(value => next.has(value))
}

const createMatchItem = (result: RegExpExecArray, order: number): MatchItem => {
  const captures: CaptureItem[] = []

  for (let index = 1; index < result.length; index += 1) {
    captures.push({
      label: `$${index}`,
      value: result[index]
    })
  }

  Object.entries(result.groups ?? {}).forEach(([label, value]) => {
    captures.push({
      label,
      value
    })
  })

  return {
    key: `${order}-${result.index}-${result[0].length}`,
    order,
    index: result.index,
    end: result.index + result[0].length,
    value: result[0],
    captures
  }
}

const matchesText = computed(() => {
  return matches.value.map(item => {
    const captures = item.captures.map(capture => `  ${capture.label}: ${capture.value ?? '未匹配'}`)

    return [
      `#${item.order} [${item.index}, ${item.end}] ${item.value}`,
      ...captures
    ].join('\n')
  }).join('\n\n')
})

const applyExample = (example: RegexExample) => {
  pattern.value = example.pattern
  selectedFlags.value = [...example.flags]
  replacement.value = example.replacement
  testText.value = example.text
}

const handleCopyMatches = () => {
  copy(matchesText.value, '已复制匹配结果')
}

const handleCopyReplaceResult = () => {
  copy(replaceState.value.value, '已复制替换结果')
}

const handleClear = () => {
  pattern.value = ''
  selectedFlags.value = ['g']
  replacement.value = ''
  testText.value = ''
}
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 100%;
}

.regex-tool {
  display: grid;
  gap: var(--spacing-md);
}

.pattern-panel {
  display: grid;
  gap: var(--spacing-md);
}

.pattern-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--spacing-md);
  align-items: start;
}

.pattern-main {
  min-width: 0;
  display: grid;
  gap: var(--spacing-sm);
}

.pattern-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--spacing-sm);
}

.regex-slash {
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-lg);
}

.flag-text {
  min-width: 48px;
  padding: 0 10px;
  color: var(--color-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-align: center;
}

.flag-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.common-section {
  display: grid;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.common-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.common-head span {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.common-head small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.common-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.common-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  max-width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.45;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.common-item:hover,
.common-item:focus-visible {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 12%, transparent);
  outline: none;
}

.status-alert {
  margin: 0;
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr) minmax(0, 0.92fr);
  gap: var(--spacing-md);
  align-items: stretch;
}

.editor-card,
.result-card,
.replace-card {
  height: 100%;
  min-width: 0;
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.result-summary div {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.result-summary strong {
  display: block;
  color: var(--color-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-lg);
  line-height: 1.15;
}

.result-summary span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.preview-box {
  min-height: 160px;
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  overflow: hidden;
}

.match-preview {
  max-height: 300px;
  margin: 0;
  padding: var(--spacing-md);
  overflow: auto;
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.match-preview mark {
  padding: 1px 3px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--color-primary) 24%, transparent);
  color: var(--color-text-primary);
}

.match-list {
  display: grid;
  gap: var(--spacing-sm);
  max-height: 300px;
  overflow: auto;
}

.match-item {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.match-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.match-range {
  flex: 1;
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
}

.match-value {
  display: block;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  word-break: break-word;
}

.capture-list {
  display: grid;
  gap: 6px;
  margin-top: var(--spacing-sm);
}

.capture-item {
  display: grid;
  grid-template-columns: minmax(52px, auto) minmax(0, 1fr);
  align-items: start;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.capture-item span {
  font-family: var(--font-family-mono);
}

.capture-item code {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  white-space: pre-wrap;
  word-break: break-word;
}

.limit-alert {
  margin-top: var(--spacing-sm);
}

.replace-field {
  display: grid;
  gap: 8px;
  margin-bottom: var(--spacing-md);
}

@media (max-width: 1080px) {
  .pattern-layout,
  .workbench-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .pattern-shell {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .flag-text {
    grid-column: 2 / 3;
    justify-self: start;
    padding: 0;
    text-align: left;
  }
}
</style>
