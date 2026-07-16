<template>
  <div class="tool-container">
    <ToolHeader
      title="正则表达式"
      description="选场景快速开始，或用积木/模板微调；贴测试文本看高亮即可"
    />

    <div class="tool-content regex-tool">
      <n-card class="compose-card">
        <div class="compose-layout">
          <div class="compose-main">
            <div class="compose-toolbar">
              <div class="mode-switch" role="tablist" aria-label="开始方式">
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: composeMode === 'scene' }"
                  @click="composeMode = 'scene'"
                >
                  场景
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: composeMode === 'blocks' }"
                  @click="composeMode = 'blocks'"
                >
                  积木
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: composeMode === 'templates' }"
                  @click="composeMode = 'templates'"
                >
                  模板
                </button>
              </div>
              <p class="mode-hint">{{ modeHint }}</p>
            </div>

            <div v-if="composeMode === 'scene'" class="mode-panel">
              <div class="wizard-grid">
                <button
                  v-for="goal in REGEX_WIZARD_GOALS"
                  :key="goal.id"
                  type="button"
                  class="wizard-item"
                  :class="{ active: activeWizardId === goal.id }"
                  @click="applyWizard(goal)"
                >
                  <strong>{{ goal.title }}</strong>
                  <span>{{ goal.description }}</span>
                </button>
              </div>
              <div v-if="activeWizard" class="inline-tip">
                <strong>说明</strong>
                <span>{{ activeWizard.explain.join('；') }}</span>
              </div>
            </div>

            <div v-else-if="composeMode === 'blocks'" class="mode-panel">
              <div class="builder-grid">
                <button
                  v-for="snip in REGEX_BUILDER_SNIPPETS"
                  :key="snip.id"
                  type="button"
                  class="builder-chip"
                  :title="`${snip.description}${snip.example ? ` 例：${snip.example}` : ''}`"
                  @click="insertSnippet(snip)"
                >
                  <strong>{{ snip.label }}</strong>
                  <code>{{ snip.insert }}</code>
                </button>
              </div>
            </div>

            <div v-else class="mode-panel">
              <div class="preset-toolbar">
                <n-input
                  v-model:value="presetSearch"
                  size="small"
                  clearable
                  placeholder="搜：邮箱、手机、日期、空行…"
                  class="preset-search"
                />
                <div class="preset-group-chips">
                  <button
                    v-for="g in REGEX_PRESET_GROUPS"
                    :key="g.key"
                    type="button"
                    class="group-chip"
                    :class="{ active: presetGroup === g.key }"
                    @click="presetGroup = g.key"
                  >
                    {{ g.label }}
                    <span v-if="g.key !== 'all'" class="group-chip-count">
                      {{ REGEX_PRESET_GROUP_COUNTS[g.key] || 0 }}
                    </span>
                  </button>
                </div>
              </div>
              <div v-if="filteredPresets.length" class="common-grid">
                <button
                  v-for="example in filteredPresets"
                  :key="example.id"
                  type="button"
                  class="common-item"
                  :class="{ active: isRegexPresetActive(pattern, selectedFlags, example) }"
                  :title="example.description || example.label"
                  @click="applyExample(example)"
                >
                  <span class="common-item-title">{{ example.label }}</span>
                  <span v-if="example.description" class="common-item-desc">{{ example.description }}</span>
                </button>
              </div>
              <p v-else class="preset-empty">无匹配模板，换个关键词试试</p>
            </div>

            <div class="pattern-block">
              <div class="field-label-row">
                <span>表达式</span>
                <span class="muted">修改后下方实时匹配</span>
              </div>
              <div class="pattern-shell">
                <span class="regex-slash">/</span>
                <n-input
                  ref="patternInputRef"
                  v-model:value="pattern"
                  class="mono-input"
                  placeholder="从上方场景/积木/模板开始，或直接输入如 \\d+"
                  clearable
                />
                <span class="regex-slash">/</span>
                <span class="flag-text" :title="flagText || '无标志'">{{ flagText || '-' }}</span>
                <n-button
                  text
                  size="tiny"
                  :disabled="!pattern"
                  @click="copyText(`/${pattern}/${flagText}`)"
                >
                  复制
                </n-button>
              </div>
              <div class="flag-row">
                <n-checkbox
                  v-for="flag in primaryFlags"
                  :key="flag.value"
                  :checked="isFlagSelected(flag.value)"
                  :title="flag.tip"
                  @update:checked="checked => setFlag(flag.value, checked)"
                >
                  {{ flag.label }}
                </n-checkbox>
                <button type="button" class="linkish" @click="showAdvancedFlags = !showAdvancedFlags">
                  {{ showAdvancedFlags ? '收起' : '更多' }}
                </button>
              </div>
              <div v-if="showAdvancedFlags" class="flag-row">
                <n-checkbox
                  v-for="flag in advancedFlags"
                  :key="flag.value"
                  :checked="isFlagSelected(flag.value)"
                  :title="flag.tip"
                  @update:checked="checked => setFlag(flag.value, checked)"
                >
                  {{ flag.label }}
                </n-checkbox>
              </div>
              <p v-if="plainExplain[0]" class="plain-one-liner">
                {{ plainExplain[0] }}
                <button
                  v-if="plainExplain.length > 1"
                  type="button"
                  class="linkish"
                  @click="showMoreExplain = !showMoreExplain"
                >
                  {{ showMoreExplain ? '收起' : '详情' }}
                </button>
              </p>
              <ul v-if="showMoreExplain && plainExplain.length > 1" class="plain-more">
                <li v-for="(line, i) in plainExplain.slice(1)" :key="i">{{ line }}</li>
              </ul>
            </div>
          </div>

          <div class="compose-actions">
            <n-button quaternary size="small" @click="loadDefault">示例</n-button>
            <n-button size="small" @click="handleClear">清空</n-button>
          </div>
        </div>
      </n-card>

      <n-alert v-if="errorMessage" type="error" class="status-alert">
        表达式有误：{{ errorMessage }}
        <template v-if="friendlyErrorHint">
          <div class="error-hint">{{ friendlyErrorHint }}</div>
        </template>
      </n-alert>

      <div class="workbench-grid">
        <n-card class="editor-card">
          <template #header>
            <span>测试文本</span>
            <span class="card-sub">把你真实的例子贴这里</span>
          </template>
          <template #header-extra>
            <n-space :size="8">
              <n-tag size="small">{{ testText.length }} 字</n-tag>
              <n-button text size="small" :disabled="!testText" @click="copyText(testText)">
                复制
              </n-button>
            </n-space>
          </template>

          <n-input
            v-model:value="testText"
            type="textarea"
            class="mono-area"
            placeholder="例如多行邮箱、日志、表格…&#10;改正则后，右边会立刻标出匹配"
            :autosize="{ minRows: 16, maxRows: 28 }"
          />
        </n-card>

        <n-card class="result-card">
          <template #header>
            <span>匹配结果</span>
            <span class="card-sub">黄色 = 命中</span>
          </template>
          <template #header-extra>
            <n-button text size="small" :disabled="!matches.length" @click="handleCopyMatches">
              复制明细
            </n-button>
          </template>

          <div class="result-summary">
            <div>
              <strong>{{ matches.length }}</strong>
              <span>找到几处</span>
            </div>
            <div>
              <strong>{{ statusLabel }}</strong>
              <span>状态</span>
            </div>
            <div>
              <strong>{{ flagText || '无' }}</strong>
              <span>选项</span>
            </div>
          </div>

          <div class="preview-box">
            <n-empty
              v-if="!pattern.trim()"
              description="先选上方场景，或输入表达式"
            />
            <n-empty
              v-else-if="!testText"
              description="请粘贴一些测试文本"
            />
            <n-empty
              v-else-if="!previewSegments.length && !errorMessage"
              description="没有匹配到内容。可放宽规则，或换一段包含目标的文本"
            />
            <pre v-else class="match-preview"><template v-for="segment in previewSegments" :key="segment.key"><mark v-if="segment.match">{{ segment.text }}</mark><span v-else>{{ segment.text }}</span></template></pre>
          </div>

          <div v-if="matches.length" class="match-list">
            <div v-for="item in matches" :key="item.key" class="match-item">
              <div class="match-head">
                <n-tag size="small">第 {{ item.order }} 处</n-tag>
                <span class="match-range">位置 {{ item.index }}–{{ item.end }}</span>
                <n-button text size="small" @click="copyText(item.value)">复制</n-button>
              </div>
              <code class="match-value">{{ item.value || '(空字符串)' }}</code>
              <div v-if="item.captures.length" class="capture-list">
                <div class="capture-title">拆出来的分组（替换时可用）</div>
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
            匹配很多，只展示前 {{ REGEX_MAX_MATCHES }} 处，避免卡顿
          </n-alert>
        </n-card>

        <n-card class="replace-card">
          <template #header>
            <span>替换 / 改写</span>
            <span class="card-sub">可选，用于打码或重排</span>
          </template>
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
            <n-text strong>替换成</n-text>
            <n-input
              v-model:value="replacement"
              class="mono-input"
              placeholder="原样可留空；打码例：$1****$2"
            />
          </div>
          <div class="replace-recipes">
            <span class="muted">快捷：</span>
            <button type="button" class="mini-chip" @click="replacement = ''">删掉匹配</button>
            <button type="button" class="mini-chip" @click="replacement = '[已隐藏]'">
              换成固定文案
            </button>
            <button type="button" class="mini-chip" @click="replacement = '$1'">只留第 1 组</button>
            <button type="button" class="mini-chip" @click="replacement = '$&'">保留原匹配</button>
          </div>
          <p class="replace-hint">
            $1 表示第 1 个括号；命名组写 $&lt;name&gt;；开了「全局」会替换每一处
          </p>

          <n-input
            :value="replaceState.value"
            type="textarea"
            class="mono-area"
            readonly
            placeholder="替换结果会显示在这里"
            :autosize="{ minRows: 12, maxRows: 24 }"
          />
        </n-card>
      </div>

      <n-card size="small" class="cheat-card">
        <div class="cheat-head">
          <strong>符号小抄</strong>
          <span class="muted">看不懂就对照这里，再回测试区试</span>
        </div>
        <div class="cheat-grid">
          <div v-for="row in REGEX_CHEAT_SHEET" :key="row.token" class="cheat-item">
            <code class="mono">{{ row.token }}</code>
            <span class="cheat-simple">{{ row.simple }}</span>
            <span class="cheat-detail">{{ row.meaning }}</span>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NEmpty,
  NInput,
  NSpace,
  NTag,
  NText
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useStorage } from '@/composables/useStorage'
import {
  DEFAULT_REGEX_FLAGS,
  DEFAULT_REGEX_PATTERN,
  DEFAULT_REGEX_REPLACEMENT,
  DEFAULT_REGEX_TEXT,
  REGEX_BUILDER_SNIPPETS,
  REGEX_CHEAT_SHEET,
  REGEX_COMMON_PATTERNS,
  REGEX_FLAG_OPTIONS,
  REGEX_MAX_MATCHES,
  REGEX_PRESET_GROUPS,
  REGEX_PRESET_GROUP_COUNTS,
  REGEX_WIZARD_GOALS,
  buildPreviewSegments,
  buildRegex,
  collectMatches,
  explainPattern,
  filterRegexPresets,
  formatMatchesText,
  insertIntoPattern,
  isRegexPresetActive,
  orderFlags,
  resolveWizardGoal,
  type RegexExample,
  type RegexFlag,
  type RegexPresetGroup,
  type RegexSnippet,
  type RegexWizardGoal
} from './regexUtils'

const { copy } = useClipboard()

const { data: pattern } = useStorage('regex-tester-pattern', DEFAULT_REGEX_PATTERN)
const { data: selectedFlags } = useStorage<RegexFlag[]>(
  'regex-tester-flags',
  [...DEFAULT_REGEX_FLAGS]
)
const { data: replacement } = useStorage('regex-tester-replacement', DEFAULT_REGEX_REPLACEMENT)
const { data: testText } = useStorage('regex-tester-text', DEFAULT_REGEX_TEXT)

type ComposeMode = 'scene' | 'blocks' | 'templates'
const composeMode = ref<ComposeMode>('scene')
const presetGroup = ref<RegexPresetGroup | 'all'>('all')
const presetSearch = ref('')
const showAdvancedFlags = ref(false)
const showMoreExplain = ref(false)
const activeWizardId = ref('')
const patternInputRef = ref<{ $el?: HTMLElement } | null>(null)

const flagText = computed(() => orderFlags(selectedFlags.value).join(''))
const primaryFlags = computed(() => REGEX_FLAG_OPTIONS.filter(f => f.primary))
const advancedFlags = computed(() => REGEX_FLAG_OPTIONS.filter(f => !f.primary))
const filteredPresets = computed(() =>
  filterRegexPresets(presetGroup.value, presetSearch.value)
)
const activeWizard = computed(
  () => REGEX_WIZARD_GOALS.find(g => g.id === activeWizardId.value) ?? null
)
const modeHint = computed(() => {
  if (composeMode.value === 'scene') return '选目标一键填好表达式和示例'
  if (composeMode.value === 'blocks') return '点积木插入到光标处'
  return '从模板库挑选并带上示例文本'
})

const regexState = computed(() => buildRegex(pattern.value, flagText.value))
const matches = computed(() => {
  const regex = regexState.value.regex
  if (!regex) return []
  return collectMatches(regex, testText.value, REGEX_MAX_MATCHES)
})
const previewSegments = computed(() => buildPreviewSegments(testText.value, matches.value))
const replaceState = computed(() => {
  const regex = regexState.value.regex
  if (!regex || !testText.value) return { value: '', error: '' }
  try {
    return { value: testText.value.replace(regex, replacement.value), error: '' }
  } catch (error) {
    return { value: '', error: (error as Error).message }
  }
})
const errorMessage = computed(() => regexState.value.error || replaceState.value.error)
const isMatchLimitReached = computed(() => matches.value.length >= REGEX_MAX_MATCHES)
const plainExplain = computed(() => explainPattern(pattern.value, flagText.value))

const statusLabel = computed(() => {
  if (errorMessage.value) return '有错误'
  if (!pattern.value.trim()) return '待输入'
  if (!testText.value) return '待测文本'
  if (!matches.value.length) return '无匹配'
  return '有匹配'
})

const friendlyErrorHint = computed(() => {
  const msg = errorMessage.value
  if (!msg) return ''
  if (/Unterminated|unmatched|Incomplete/i.test(msg)) {
    return '提示：括号 () 或方括号 [] 可能少写了闭合符号。'
  }
  if (/Nothing to repeat/i.test(msg)) {
    return '提示：+ * ? 前面需要有内容，例如 \\d+。'
  }
  if (/Invalid/i.test(msg)) {
    return '提示：量词或转义可能有误，可先点场景生成草稿。'
  }
  return '提示：可先选「场景」或「模板」生成合法草稿再改。'
})

const isFlagSelected = (flag: RegexFlag) => selectedFlags.value.includes(flag)

const setFlag = (flag: RegexFlag, checked: boolean) => {
  const next = new Set(selectedFlags.value)
  if (checked) next.add(flag)
  else next.delete(flag)
  selectedFlags.value = orderFlags([...next])
}

const getPatternInputEl = () => {
  const root = patternInputRef.value?.$el as HTMLElement | undefined
  return root?.querySelector?.('input') as HTMLInputElement | null
}

const insertSnippet = async (snip: RegexSnippet) => {
  const el = getPatternInputEl()
  const start = el?.selectionStart ?? pattern.value.length
  const end = el?.selectionEnd ?? start
  const { value, caret } = insertIntoPattern(pattern.value, snip.insert, start, end)
  pattern.value = value
  await nextTick()
  const input = getPatternInputEl()
  if (input) {
    input.focus()
    input.setSelectionRange(caret, caret)
  }
}

const applyExample = (example: RegexExample) => {
  pattern.value = example.pattern
  selectedFlags.value = [...example.flags]
  replacement.value = example.replacement
  testText.value = example.text
  activeWizardId.value = ''
  showMoreExplain.value = false
}

const applyWizard = (goal: RegexWizardGoal) => {
  const resolved = resolveWizardGoal(goal)
  if (!resolved) return
  pattern.value = resolved.pattern
  selectedFlags.value = resolved.flags
  replacement.value = resolved.replacement
  testText.value = resolved.text
  activeWizardId.value = goal.id
  showMoreExplain.value = false
}

const loadDefault = () => {
  pattern.value = DEFAULT_REGEX_PATTERN
  selectedFlags.value = [...DEFAULT_REGEX_FLAGS]
  replacement.value = DEFAULT_REGEX_REPLACEMENT
  testText.value = DEFAULT_REGEX_TEXT
  activeWizardId.value = ''
  showMoreExplain.value = false
}

const handleClear = () => {
  pattern.value = ''
  selectedFlags.value = ['g']
  replacement.value = ''
  testText.value = ''
  activeWizardId.value = ''
  showMoreExplain.value = false
}

const copyText = (text: string) => {
  void copy(text)
}

const handleCopyMatches = () => {
  void copy(formatMatchesText(matches.value), '已复制匹配结果')
}

const handleCopyReplaceResult = () => {
  void copy(replaceState.value.value, '已复制替换结果')
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

.compose-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--spacing-md);
  align-items: start;
}

.compose-main {
  min-width: 0;
  display: grid;
  gap: var(--spacing-md);
}

.compose-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
}

.mode-switch {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-secondary);
  gap: 2px;
}

.mode-btn {
  padding: 5px 12px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.mode-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
  font-weight: 600;
}

.mode-hint {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.mode-panel {
  display: grid;
  gap: 8px;
}

.wizard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.wizard-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-height: 68px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.wizard-item:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  background: var(--color-surface);
}

.wizard-item.active {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 12%, transparent));
}

.wizard-item strong {
  font-size: var(--font-size-sm);
}

.wizard-item span {
  color: var(--color-text-tertiary);
  font-size: 11px;
  line-height: 1.4;
}

.inline-tip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.inline-tip strong {
  color: var(--color-text-primary);
}

.builder-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.builder-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  font: inherit;
  cursor: pointer;
}

.builder-chip:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.builder-chip strong {
  font-size: 12px;
}

.builder-chip code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-primary);
}

.preset-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-search {
  max-width: 320px;
}

.preset-group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.group-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.group-chip.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 14%, transparent));
  color: var(--color-primary);
}

.group-chip-count {
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}

.common-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.common-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 56px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.common-item:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.common-item.active {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 12%, transparent));
}

.common-item-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.common-item-desc {
  color: var(--color-text-tertiary);
  font-size: 11px;
  line-height: 1.35;
}

.preset-empty {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.pattern-block {
  display: grid;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--color-border);
}

.field-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.muted {
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 400;
}

.linkish {
  border: 0;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
}

.pattern-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: var(--spacing-sm);
}

.regex-slash {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: var(--font-size-lg);
}

.flag-text {
  min-width: 48px;
  padding: 0 10px;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-align: center;
}

.flag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.plain-one-liner {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.plain-more {
  margin: 0;
  padding-left: 1.15em;
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}

.compose-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-alert {
  margin: 0;
}

.error-hint {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.9;
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.95fr);
  gap: var(--spacing-md);
  align-items: start;
}

.card-sub {
  margin-left: 8px;
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 400;
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: var(--spacing-sm);
}

.result-summary > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.result-summary strong {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-mono);
}

.result-summary span {
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.preview-box {
  min-height: 120px;
  margin-bottom: var(--spacing-sm);
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  overflow: auto;
}

.match-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.55;
  color: var(--color-text-primary);
}

.match-preview mark {
  padding: 0 2px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--color-primary) 22%, transparent);
  color: inherit;
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}

.match-item {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.match-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.match-range {
  flex: 1;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
}

.match-value {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  word-break: break-all;
}

.capture-list {
  display: grid;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--color-border);
}

.capture-title {
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.capture-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  font-size: var(--font-size-xs);
}

.capture-item span {
  color: var(--color-text-tertiary);
}

.capture-item code {
  font-family: var(--font-mono);
  word-break: break-all;
  color: var(--color-text-secondary);
}

.limit-alert {
  margin-top: var(--spacing-sm);
}

.replace-field {
  display: grid;
  gap: 6px;
  margin-bottom: 6px;
}

.replace-recipes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.mini-chip {
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.mini-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.mono-input :deep(input),
.mono-area :deep(textarea) {
  font-family: var(--font-mono);
}

.cheat-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.cheat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.cheat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.cheat-item code {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.cheat-simple {
  color: var(--color-text-secondary);
  font-size: 11px;
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 1180px) {
  .workbench-grid {
    grid-template-columns: 1fr 1fr;
  }

  .replace-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .compose-layout {
    grid-template-columns: 1fr;
  }

  .compose-actions {
    flex-direction: row;
  }

  .pattern-shell {
    grid-template-columns: auto minmax(0, 1fr) auto auto;
  }

  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .result-summary {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
