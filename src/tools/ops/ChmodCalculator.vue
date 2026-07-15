<template>
  <div class="tool-container">
    <ToolHeader
      title="chmod 权限计算器"
      description="数字权限与符号权限互转，可视化勾选 rwx / setuid / setgid / sticky，生成 chmod 命令"
    />

    <div class="tool-content">
      <div class="top-grid">
        <n-card title="权限矩阵" class="panel">
          <template #header-extra>
            <n-space :size="8">
              <n-button quaternary size="small" @click="applyModeFromOctal('755')">
                默认 755
              </n-button>
              <n-button quaternary size="small" @click="applyModeFromOctal('000')">
                全无
              </n-button>
            </n-space>
          </template>

          <div class="matrix">
            <div class="matrix-head">
              <span></span>
              <span v-for="bit in PERM_BITS" :key="bit.key">
                {{ bit.label }} ({{ bit.key === 'read' ? 'r' : bit.key === 'write' ? 'w' : 'x' }})
                {{ bit.weight }}
              </span>
            </div>
            <div v-for="row in PERM_ROWS" :key="row.key" class="matrix-row">
              <span class="row-label">
                <strong>{{ row.label }}</strong>
                <small>{{ row.hint }}</small>
              </span>
              <button
                v-for="bit in PERM_BITS"
                :key="bit.key"
                type="button"
                class="check-cell"
                :class="{ active: state[row.key][bit.key] }"
                :aria-pressed="state[row.key][bit.key]"
                :aria-label="`${row.label} ${bit.label}`"
                @click="togglePerm(row.key, bit.key)"
              >
                <span class="check-mark" aria-hidden="true">
                  {{ state[row.key][bit.key] ? '✓' : '' }}
                </span>
              </button>
            </div>
          </div>

          <div class="special-row">
            <span class="special-title">特殊位</span>
            <n-space :size="16" wrap>
              <n-checkbox
                v-for="bit in SPECIAL_BITS"
                :key="bit.key"
                v-model:checked="state.special[bit.key]"
              >
                {{ bit.label }} ({{ bit.hint }})
              </n-checkbox>
            </n-space>
          </div>
        </n-card>

        <n-card title="数值与符号" class="panel">
          <div class="field-block">
            <div class="field-label">
              <span>八进制</span>
              <n-button text size="tiny" @click="copyText(octalDisplay)">复制</n-button>
            </div>
            <n-input
              v-model:value="octalInput"
              class="mono-input"
              placeholder="如 755、0755、4755"
              @update:value="onOctalInput"
            />
            <p v-if="octalError" class="field-error">{{ octalError }}</p>
          </div>

          <div class="field-block">
            <div class="field-label">
              <span>符号 (ls)</span>
              <n-button text size="tiny" @click="copyText(lsDisplay)">复制</n-button>
            </div>
            <n-input
              v-model:value="symbolicInput"
              class="mono-input"
              placeholder="如 rwxr-xr-x 或 -rwxr-xr-x"
              @update:value="onSymbolicInput"
            />
            <p v-if="symbolicError" class="field-error">{{ symbolicError }}</p>
          </div>

          <div class="field-block">
            <div class="field-label">
              <span>文件类型前缀</span>
            </div>
            <n-radio-group v-model:value="fileType" size="small">
              <n-space>
                <n-radio value="file">文件 -</n-radio>
                <n-radio value="dir">目录 d</n-radio>
                <n-radio value="link">链接 l</n-radio>
                <n-radio value="none">仅 9 位</n-radio>
              </n-space>
            </n-radio-group>
          </div>

          <div class="summary-box">
            <div class="summary-main mono">{{ lsDisplay }}</div>
            <div class="summary-octal mono">{{ octalDisplay }}</div>
            <ul class="summary-list">
              <li v-for="(line, i) in descriptions" :key="i">{{ line }}</li>
            </ul>
          </div>
        </n-card>
      </div>

      <n-card title="命令" class="panel">
        <template #header-extra>
          <n-input
            v-model:value="targetName"
            size="small"
            placeholder="目标路径"
            class="target-input"
          />
        </template>
        <div class="cmd-list">
          <div v-for="item in commandItems" :key="item.id" class="cmd-card">
            <div class="cmd-meta">
              <strong>{{ item.title }}</strong>
              <span class="cmd-desc">{{ item.desc }}</span>
            </div>
            <div class="cmd-box">
              <code class="mono">{{ item.command }}</code>
              <n-button text size="tiny" class="cmd-copy" @click="copyText(item.command)">
                复制
              </n-button>
            </div>
          </div>
        </div>
      </n-card>

      <n-card title="常用权限" class="panel presets-card">
        <template #header-extra>
          <span class="presets-count">{{ filteredPresets.length }} / {{ CHMOD_PRESETS.length }}</span>
        </template>

        <div class="preset-toolbar">
          <n-input
            v-model:value="presetSearch"
            size="small"
            clearable
            placeholder="搜索权限、场景、标签…"
            class="preset-search"
          />
          <div class="preset-group-chips">
            <button
              v-for="g in CHMOD_PRESET_GROUPS"
              :key="g.key"
              type="button"
              class="group-chip"
              :class="{ active: presetGroup === g.key }"
              @click="presetGroup = g.key"
            >
              {{ g.label }}
              <span v-if="g.key !== 'all'" class="group-chip-count">
                {{ CHMOD_PRESET_GROUP_COUNTS[g.key] || 0 }}
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
            :class="{ active: isPresetActive(mode, p.octal) }"
            :title="p.description"
            @click="applyModeFromOctal(p.octal)"
          >
            <span class="preset-chip-top">
              <span class="preset-octal mono">{{ p.name }}</span>
              <span class="preset-symbolic mono">{{ presetSymbolic(p) }}</span>
            </span>
            <span class="preset-desc">{{ p.description }}</span>
            <span v-if="p.tags?.length" class="preset-tags">
              <span v-for="tag in p.tags" :key="tag" class="preset-tag">{{ tag }}</span>
            </span>
          </button>
        </div>
        <p v-else class="preset-empty">无匹配预设，试试其他关键词或分组</p>
      </n-card>

      <n-card title="说明" class="panel tips-card">
        <ul class="tips-list">
          <li>权限三位：所有者 / 组 / 其他人；每位 = 读4 + 写2 + 执行1。</li>
          <li>
            四位时最高位为特殊位：setuid=4、setgid=2、sticky=1，例如
            <code>4755</code>、<code>1777</code>。
          </li>
          <li>目录的执行位表示「可进入」；没有执行位则无法 <code>cd</code> 或访问其下文件。</li>
          <li>
            常见：文件 <code>644</code>，目录 <code>755</code>，私钥 <code>600</code>，脚本
            <code>750</code>/<code>700</code>。
          </li>
          <li>
            符号中 <code>s/S</code> 表示 setuid/setgid，<code>t/T</code> 表示 sticky（大写表示无执行位）。
          </li>
        </ul>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NButton,
  NCard,
  NCheckbox,
  NInput,
  NRadio,
  NRadioGroup,
  NSpace
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  CHMOD_PRESETS,
  CHMOD_PRESET_GROUPS,
  CHMOD_PRESET_GROUP_COUNTS,
  CHMOD_PRESET_MODE,
  DEFAULT_CHMOD_STATE,
  PERM_BITS,
  PERM_ROWS,
  SPECIAL_BITS,
  buildCommandItems,
  cloneState,
  describeMode,
  filterPresets,
  isPresetActive,
  modeToLsString,
  modeToOctal,
  modeToState,
  modeToSymbolicRwx,
  parseOctal,
  parseSymbolicRwx,
  stateToMode,
  type ChmodPreset,
  type ChmodState,
  type LsFileType,
  type PermBitKey,
  type PermClass,
  type PresetFilterKey
} from './chmodUtils'

const { copy } = useClipboard()

const initialMode = stateToMode(DEFAULT_CHMOD_STATE)
const state = ref<ChmodState>(cloneState(DEFAULT_CHMOD_STATE))
const octalInput = ref(modeToOctal(initialMode))
const symbolicInput = ref(modeToLsString(initialMode, 'none'))
const octalError = ref('')
const symbolicError = ref('')
const fileType = ref<LsFileType>('file')
const targetName = ref('file')
const syncing = ref(false)
const presetGroup = ref<PresetFilterKey>('all')
const presetSearch = ref('')

const mode = computed(() => stateToMode(state.value))
const octalDisplay = computed(() => modeToOctal(mode.value))
const lsDisplay = computed(() => modeToLsString(mode.value, fileType.value))
const descriptions = computed(() => describeMode(mode.value))
const commandItems = computed(() => buildCommandItems(mode.value, targetName.value))
const filteredPresets = computed(() =>
  filterPresets(CHMOD_PRESETS, presetGroup.value, presetSearch.value)
)

const presetSymbolicCache = new Map<string, string>()
const presetSymbolic = (preset: ChmodPreset) => {
  const cached = presetSymbolicCache.get(preset.id)
  if (cached) return cached
  const modeValue = CHMOD_PRESET_MODE.get(preset.id) ?? 0
  const text = modeToSymbolicRwx(modeValue)
  presetSymbolicCache.set(preset.id, text)
  return text
}

const togglePerm = (row: PermClass, bit: PermBitKey) => {
  state.value[row][bit] = !state.value[row][bit]
}

const withSync = (fn: () => void) => {
  syncing.value = true
  try {
    fn()
  } finally {
    syncing.value = false
  }
}

const applyMode = (nextMode: number) => {
  withSync(() => {
    state.value = modeToState(nextMode)
    octalInput.value = modeToOctal(nextMode)
    symbolicInput.value = modeToLsString(nextMode, 'none')
    octalError.value = ''
    symbolicError.value = ''
  })
}

const applyModeFromOctal = (octal: string) => {
  const result = parseOctal(octal)
  if ('error' in result) return
  applyMode(result.mode)
}

watch(
  state,
  () => {
    if (syncing.value) return
    withSync(() => {
      octalInput.value = modeToOctal(mode.value)
      symbolicInput.value = modeToLsString(mode.value, 'none')
      octalError.value = ''
      symbolicError.value = ''
    })
  },
  { deep: true }
)

const onOctalInput = (value: string) => {
  if (syncing.value) return
  const result = parseOctal(value)
  if ('error' in result) {
    octalError.value = result.error
    return
  }
  applyMode(result.mode)
}

const onSymbolicInput = (value: string) => {
  if (syncing.value) return
  const result = parseSymbolicRwx(value)
  if ('error' in result) {
    symbolicError.value = result.error
    return
  }
  applyMode(result.mode)
}

const copyText = (text: string) => {
  void copy(text)
}
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
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: var(--spacing-md);
  align-items: stretch;
}

.panel :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.target-input {
  width: 180px;
}

.matrix {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.matrix-head,
.matrix-row {
  display: grid;
  grid-template-columns: minmax(100px, 1.2fr) repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: center;
}

.matrix-head {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  text-align: center;
}

.matrix-head span:first-child {
  text-align: left;
}

.row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-label strong {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.row-label small {
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.check-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.check-cell:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  background: var(--color-surface);
}

.check-cell.active {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 14%, transparent));
  color: var(--color-primary);
}

.check-cell:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  outline-offset: 1px;
}

.check-mark {
  min-width: 1em;
  min-height: 1em;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.special-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--color-border);
}

.special-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.mono-input :deep(input) {
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
}

.field-error {
  margin: 0;
  color: var(--color-error, #d03050);
  font-size: var(--font-size-xs);
}

.summary-box {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.summary-main {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text-primary);
}

.summary-octal {
  margin-top: 4px;
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 600;
}

.summary-list {
  margin: 10px 0 0;
  padding-left: 1.15em;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.55;
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
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.group-chip:hover {
  border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  color: var(--color-text-primary);
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
  min-height: 84px;
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
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.preset-octal {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-primary);
}

.preset-symbolic {
  color: var(--color-text-tertiary);
  font-size: 11px;
  letter-spacing: 0.02em;
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

.cmd-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.cmd-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.cmd-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 8px;
  min-width: 0;
}

.cmd-meta strong {
  flex: 0 0 auto;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.cmd-desc {
  min-width: 0;
  color: var(--color-text-tertiary);
  font-size: 11px;
  line-height: 1.4;
}

.cmd-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(100%, 360px);
  min-width: 0;
  min-height: 34px;
  padding: 0 4px 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.cmd-box code {
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  white-space: nowrap;
  font-size: var(--font-size-sm);
  line-height: 1.45;
  color: var(--color-text-primary);
}

.cmd-copy {
  flex: 0 0 auto;
  color: var(--color-text-secondary);
}

.cmd-copy:hover {
  color: var(--color-primary);
}

.mono {
  font-family: var(--font-mono);
}

.tips-list {
  margin: 0;
  padding-left: 1.15em;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.tips-list code {
  font-family: var(--font-mono);
  font-size: 0.92em;
}

@media (max-width: 900px) {
  .top-grid {
    grid-template-columns: 1fr;
  }

  .matrix-head,
  .matrix-row {
    grid-template-columns: minmax(88px, 1fr) repeat(3, minmax(0, 1fr));
  }

  .cmd-list {
    grid-template-columns: 1fr;
  }
}
</style>
