<template>
  <div class="tool-container">
    <ToolHeader
      title="Cron 表达式解析"
      description="校验 Cron 表达式，查看字段含义、标准化结果与接下来多次执行时间；内置常用场景模板"
    />

    <div class="tool-content">
      <div class="top-grid">
        <div class="left-stack">
          <n-card title="表达式" class="panel">
            <template #header-extra>
              <n-space :size="8">
                <n-button quaternary size="small" @click="applyTemplate(DEFAULT_CRON_EXPRESSION)">
                  示例
                </n-button>
                <n-button quaternary size="small" :disabled="!expression" @click="handleClear">
                  清空
                </n-button>
                <n-button
                  secondary
                  size="small"
                  :disabled="!expression.trim()"
                  @click="copyText(expression.trim())"
                >
                  复制表达式
                </n-button>
              </n-space>
            </template>

            <n-input
              v-model:value="expression"
              class="mono-input"
              placeholder="输入 5/6 位 Cron 或别名，例如 0 9 * * 1-5 或 @daily"
              clearable
              @keydown.enter.prevent
            />

            <div class="quick-row">
              <span class="quick-label">快捷</span>
              <div class="quick-chips">
                <button
                  v-for="item in CRON_QUICK_PRESETS"
                  :key="item.expression"
                  type="button"
                  class="quick-chip"
                  :class="{ active: isCronPresetActive(expression, item.expression) }"
                  @click="applyTemplate(item.expression)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
          </n-card>

          <n-card title="解析结果" class="panel">
            <template #header-extra>
              <n-button text size="small" :disabled="!result" @click="handleCopyResult">
                复制结果
              </n-button>
            </template>

            <n-empty v-if="!result && !error" description="输入表达式后自动解析" />

            <div v-else-if="result" class="result-stack">
              <div class="summary-box">
                <div class="summary-row">
                  <span class="summary-label">标准化</span>
                  <code class="mono">{{ result.normalized }}</code>
                  <n-button text size="tiny" @click="copyText(result.normalized)">复制</n-button>
                </div>
                <div v-if="result.aliasName" class="summary-row">
                  <span class="summary-label">别名</span>
                  <span>{{ result.aliasName }}</span>
                </div>
                <p class="summary-desc">{{ result.description }}</p>
              </div>

              <div v-if="result.fields.length" class="fields-table">
                <div class="fields-head">
                  <span>字段</span>
                  <span>值</span>
                  <span>含义</span>
                </div>
                <div v-for="field in result.fields" :key="field.label" class="fields-row">
                  <span class="field-label">{{ field.label }}</span>
                  <code class="mono field-value">{{ field.value }}</code>
                  <span class="field-meaning">{{ field.meaning }}</span>
                </div>
              </div>
            </div>

            <n-alert v-if="error" type="error" :bordered="false" class="error-alert">
              {{ error }}
            </n-alert>
          </n-card>
        </div>

        <div class="right-stack">
          <n-card size="small" class="panel tips-card" :bordered="true">
            <div class="tips-grid">
              <div v-for="block in CRON_FORMAT_TIPS" :key="block.title" class="tips-block">
                <strong>{{ block.title }}</strong>
                <ul>
                  <li v-for="(item, idx) in block.items" :key="idx">{{ item }}</li>
                </ul>
              </div>
            </div>
          </n-card>

          <n-card title="接下来执行时间" class="panel">
            <template #header-extra>
              <span class="next-runs-hint">
                本地时区 · 展示最近 {{ result?.nextRuns.length || 0 }} 次
              </span>
            </template>

            <template v-if="result">
              <div v-if="result.nextRuns.length" class="next-run-list">
                <div
                  v-for="(run, index) in result.nextRuns"
                  :key="`${run}-${index}`"
                  class="next-run-item"
                >
                  <span class="run-index">#{{ index + 1 }}</span>
                  <span class="mono">{{ run }}</span>
                </div>
              </div>
              <p v-else class="next-run-empty">无法计算下次时间（如 @reboot 或无后续触发）</p>
            </template>
            <p v-else-if="error" class="next-run-empty">表达式无效，请先修正</p>
            <p v-else class="next-run-empty">输入表达式后显示接下来的执行时间</p>
          </n-card>
        </div>
      </div>

      <n-card title="常用配置 / 场景" class="panel presets-card">
        <template #header-extra>
          <span class="presets-count">
            {{ filteredPresets.length }} / {{ CRON_PRESETS.length }}
          </span>
        </template>

        <div class="preset-toolbar">
          <n-input
            v-model:value="presetSearch"
            size="small"
            clearable
            placeholder="搜索表达式、场景、标签…"
            class="preset-search"
          />
          <div class="preset-group-chips">
            <button
              v-for="g in CRON_PRESET_GROUPS"
              :key="g.key"
              type="button"
              class="group-chip"
              :class="{ active: presetGroup === g.key }"
              @click="presetGroup = g.key"
            >
              {{ g.label }}
              <span v-if="g.key !== 'all'" class="group-chip-count">
                {{ CRON_PRESET_GROUP_COUNTS[g.key] || 0 }}
              </span>
            </button>
          </div>
        </div>

        <div v-if="filteredPresets.length" class="preset-grid">
          <button
            v-for="p in filteredPresets"
            :key="p.id"
            type="button"
            class="preset-chip"
            :class="{ active: isCronPresetActive(expression, p.expression) }"
            :title="p.description"
            @click="applyTemplate(p.expression)"
          >
            <span class="preset-chip-top">
              <span class="preset-title">{{ p.title }}</span>
              <code class="mono preset-expr">{{ p.expression }}</code>
            </span>
            <span class="preset-desc">{{ p.description }}</span>
            <span v-if="p.tags?.length" class="preset-tags">
              <span v-for="tag in p.tags" :key="tag" class="preset-tag">{{ tag }}</span>
            </span>
          </button>
        </div>
        <p v-else class="preset-empty">无匹配场景，试试其他关键词或分组</p>
      </n-card>

      <n-card title="字段速查" class="panel">
        <div class="cheat-grid">
          <div v-for="row in CRON_CHEAT_SHEET" :key="row.field" class="cheat-item">
            <strong>{{ row.field }}</strong>
            <span>{{ row.range }}</span>
            <span class="cheat-note">{{ row.note }}</span>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NAlert, NButton, NCard, NEmpty, NInput, NSpace } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useStorage } from '@/composables/useStorage'
import {
  CRON_CHEAT_SHEET,
  CRON_FORMAT_TIPS,
  CRON_NEXT_RUN_COUNT,
  CRON_PRESETS,
  CRON_PRESET_GROUPS,
  CRON_PRESET_GROUP_COUNTS,
  CRON_QUICK_PRESETS,
  DEFAULT_CRON_EXPRESSION,
  filterCronPresets,
  formatCronParseResult,
  isCronPresetActive,
  parseCronExpression,
  type CronParseResult,
  type CronPresetGroupKey
} from './cronUtils'

const { copy } = useClipboard()
const { data: expression } = useStorage('cron-parser-expression', DEFAULT_CRON_EXPRESSION)

const error = ref('')
const result = ref<CronParseResult | null>(null)
const presetGroup = ref<CronPresetGroupKey>('all')
const presetSearch = ref('')

const filteredPresets = computed(() =>
  filterCronPresets(presetGroup.value, presetSearch.value)
)

const handleParse = () => {
  error.value = ''
  const value = expression.value.trim()
  if (!value) {
    result.value = null
    return
  }
  try {
    result.value = parseCronExpression(value, CRON_NEXT_RUN_COUNT)
  } catch (err) {
    result.value = null
    error.value = (err as Error).message
  }
}

const applyTemplate = (value: string) => {
  expression.value = value
}

const handleClear = () => {
  expression.value = ''
  result.value = null
  error.value = ''
}

const copyText = (text: string) => {
  void copy(text)
}

const handleCopyResult = async () => {
  if (!result.value) return
  await copy(formatCronParseResult(result.value))
}

watch(expression, handleParse, { immediate: true })
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: var(--spacing-md);
  align-items: start;
}

.left-stack,
.right-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.panel :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.tips-card :deep(.n-card-header) {
  display: none;
}

.tips-card :deep(.n-card__content) {
  gap: var(--spacing-sm);
  padding-top: 12px;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.tips-block strong {
  display: block;
  margin-bottom: 4px;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.tips-block ul {
  margin: 0;
  padding-left: 1.1em;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 2.15;
}

.tips-block li + li {
  margin-top: 2px;
}

.mono-input :deep(input) {
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.quick-label {
  flex: 0 0 auto;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.quick-chips,
.preset-group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-chip,
.group-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.quick-chip:hover,
.group-chip:hover {
  border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  color: var(--color-text-primary);
}

.quick-chip.active,
.group-chip.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 14%, transparent));
  color: var(--color-primary);
}

.result-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.summary-box {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.summary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.summary-label {
  flex: 0 0 auto;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.summary-row code {
  min-width: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  word-break: break-all;
}

.summary-desc {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.fields-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.fields-head,
.fields-row {
  display: grid;
  grid-template-columns: 48px minmax(72px, 0.8fr) minmax(0, 1.4fr);
  gap: 8px;
  padding: 8px 12px;
  align-items: center;
}

.fields-head {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.fields-row + .fields-row {
  border-top: 1px solid var(--color-border);
}

.field-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.field-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  word-break: break-all;
}

.field-meaning {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.next-runs-hint {
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.next-run-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.next-run-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.run-index {
  min-width: 28px;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.next-run-empty {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.error-alert {
  margin-top: 0;
}

.preset-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-search {
  max-width: 320px;
}

.presets-count {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.group-chip-count {
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.preset-empty {
  margin: 0;
  padding: 16px 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
}

.preset-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 92px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.preset-chip:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  background: var(--color-surface);
}

.preset-chip.active {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 12%, transparent));
}

.preset-chip-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.preset-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.preset-expr {
  color: var(--color-primary);
  font-size: 12px;
  word-break: break-all;
}

.preset-desc {
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.4;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.preset-tag {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-tertiary);
  font-size: 10px;
  line-height: 1.4;
}

.cheat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}

.cheat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  font-size: var(--font-size-sm);
}

.cheat-item strong {
  color: var(--color-text-primary);
}

.cheat-item span {
  color: var(--color-text-secondary);
}

.cheat-note {
  color: var(--color-text-tertiary) !important;
  font-size: 11px;
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 900px) {
  .top-grid {
    grid-template-columns: 1fr;
  }

  .tips-grid {
    grid-template-columns: 1fr;
  }

  .fields-head,
  .fields-row {
    grid-template-columns: 40px minmax(64px, 0.9fr) minmax(0, 1.2fr);
  }
}

@media (max-width: 560px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .fields-head,
  .fields-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .next-run-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
