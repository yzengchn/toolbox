<template>
  <div class="tool-container">
    <ToolHeader
      title="文件去重"
      description="从文件 A 中筛除已出现在文件 B 中的行，导出剩余结果"
    />

    <div class="tool-content">
      <n-alert type="info" :show-icon="true" style="margin-bottom: var(--spacing-md)">
        上传两个纯文本文件 (.txt)，每行一个 ID。结果会保留 A 的原始顺序，并筛除已出现在 B 中的行。
      </n-alert>

      <div class="top-card-grid">
        <n-card title="文件 A（待筛选）">
          <FileDrop
            label="点击或拖拽文件 A 到此处"
            :file-name="fileAName"
            :line-count="fileACount"
            :loading="loadingA"
            @select="onSelectA"
          />
        </n-card>

        <n-card title="文件 B（排除集）">
          <FileDrop
            label="点击或拖拽文件 B 到此处"
            :file-name="fileBName"
            :line-count="fileBCount"
            :loading="loadingB"
            @select="onSelectB"
          />
        </n-card>
      </div>

      <n-card title="去重选项" class="options-card">
        <n-space :size="16" :wrap="true">
          <n-checkbox v-model:checked="optTrim">
            去除行首/尾空白
          </n-checkbox>
          <n-checkbox v-model:checked="optIgnoreCase">
            忽略大小写
          </n-checkbox>
          <n-checkbox v-model:checked="optIgnoreBlank">
            忽略空行
          </n-checkbox>
          <n-checkbox v-model:checked="optDedupeA">
            对 A 自身也去重
          </n-checkbox>
        </n-space>
      </n-card>

      <n-card title="操作" class="action-card">
        <n-space>
          <n-button type="primary" :loading="deduping" :disabled="!canRun" @click="handleDedup">
            {{ deduping ? '去重中...' : '开始去重' }}
          </n-button>
          <n-button :disabled="!hasRun" @click="handleClearResult">
            清空结果
          </n-button>
        </n-space>
      </n-card>

      <n-card v-if="hasRun" title="结果" class="result-card">
        <template #header-extra>
          <n-space :size="12">
            <n-button secondary size="small" :disabled="statResult === 0" @click="copyResult">
              复制结果
            </n-button>
            <n-button type="primary" size="small" :disabled="statResult === 0" @click="downloadResult">
              下载 dedup-result.txt
            </n-button>
          </n-space>
        </template>

        <div class="result-stats">
          <div class="stat">
            <span class="stat-num">{{ statA }}</span>
            <span class="stat-label">A 总数</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ statB }}</span>
            <span class="stat-label">B 总数</span>
          </div>
          <div class="stat stat-hit">
            <span class="stat-num">{{ statHits }}</span>
            <span class="stat-label">命中(筛掉)</span>
          </div>
          <div class="stat stat-result">
            <span class="stat-num">{{ statResult }}</span>
            <span class="stat-label">结果数</span>
          </div>
        </div>

        <n-text v-if="optDedupeA" depth="3" style="display:block; margin-bottom: var(--spacing-sm); font-size: var(--font-size-xs)">
          已对 A 自身去重，结果数 = A 中未被 B 命中、且首次出现的行数。
        </n-text>

        <n-text v-if="resultTruncated" depth="3" style="display:block; margin-bottom: var(--spacing-sm); font-size: var(--font-size-xs)">
          结果较大（{{ statResult }} 行），仅预览前 {{ PREVIEW_LIMIT }} 行，完整内容请使用下载。
        </n-text>

        <n-input
          :value="previewText"
          type="textarea"
          readonly
          :autosize="{ minRows: 8, maxRows: 20 }"
          placeholder="去重结果预览"
        />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NAlert, NButton, NCard, NCheckbox, NInput, NSpace, NText, useMessage } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { readTextFile, parseLines, countLinesFast, downloadLines } from './fileUtils'
import FileDrop from './FileDrop.vue'

const message = useMessage()
const { copy } = useClipboard()

/** 预览区最多渲染的行数，避免把百万行塞进 textarea 卡死浏览器渲染。 */
const PREVIEW_LIMIT = 2000

// 选项默认值：trim ON、ignoreCase OFF、ignoreBlank ON、dedupeA OFF
const optTrim = ref(true)
const optIgnoreCase = ref(false)
const optIgnoreBlank = ref(true)
const optDedupeA = ref(false)

// 选中文件后的轻量元数据（只数行数，不保留百万级行数组）
const fileAName = ref<string | null>(null)
const fileACount = ref<number | null>(null)
const fileBName = ref<string | null>(null)
const fileBCount = ref<number | null>(null)
const loadingA = ref(false)
const loadingB = ref(false)
const fileA = ref<File | null>(null)
const fileB = ref<File | null>(null)
// 选中时已读取的文本缓存，去重时复用，避免对大文件二次读取。
const fileAText = ref('')
const fileBText = ref('')

const deduping = ref(false)
const hasRun = ref(false)
const statA = ref(0)
const statB = ref(0)
const statHits = ref(0)
const statResult = ref(0)
const previewText = ref('')
const resultTruncated = ref(false)
// 完整结果数组，仅在下载/复制时用，不渲染进 textarea
const resultLines = ref<string[]>([])

const canRun = computed(() => fileA.value !== null)

const parseOpts = () => ({ trim: optTrim.value, ignoreBlank: optIgnoreBlank.value })

const onSelectA = async (file: File) => {
  loadingA.value = true
  try {
    const text = await readTextFile(file)
    fileAName.value = file.name
    fileACount.value = countLinesFast(text, optIgnoreBlank.value)
    fileA.value = file
    fileAText.value = text
    message.success(`已加载 ${file.name}（${fileACount.value} 行）`)
  } catch (error) {
    fileA.value = null
    fileAName.value = null
    fileACount.value = null
    fileAText.value = ''
    message.error(error instanceof Error ? error.message : '文件 A 读取失败')
  } finally {
    loadingA.value = false
  }
}

const onSelectB = async (file: File) => {
  loadingB.value = true
  try {
    const text = await readTextFile(file)
    fileBName.value = file.name
    fileBCount.value = countLinesFast(text, optIgnoreBlank.value)
    fileB.value = file
    fileBText.value = text
    message.success(`已加载 ${file.name}（${fileBCount.value} 行）`)
  } catch (error) {
    fileB.value = null
    fileBName.value = null
    fileBCount.value = null
    fileBText.value = ''
    message.error(error instanceof Error ? error.message : '文件 B 读取失败')
  } finally {
    loadingB.value = false
  }
}

const runDedup = async (): Promise<void> => {
  if (!fileA.value) return
  const opts = parseOpts()
  const matchKey = (s: string): string => (optIgnoreCase.value ? s.toLowerCase() : s)

  // 复用选中时已读取并缓存的文本，避免对大文件二次读取
  // 若缓存被清空（理论上不应发生）则回退到重新读取
  let aText = fileAText.value
  if (!aText) {
    aText = await readTextFile(fileA.value)
    fileAText.value = aText
  }
  const aLines = parseLines(aText, opts)
  // aText 已解析入数组，释放原始大字符串以降低峰值内存
  aText = ''
  fileAText.value = ''

  let bText = fileBText.value
  if (fileB.value && !bText) {
    bText = await readTextFile(fileB.value)
    fileBText.value = bText
  }
  const bLines = bText ? parseLines(bText, opts) : []
  bText = ''
  fileBText.value = ''
  // 让 UI 有机会渲染 loading
  await yieldToMain()

  // 建 B 命中集合
  const bSet = new Set<string>()
  for (let i = 0; i < bLines.length; i++) {
    bSet.add(matchKey(bLines[i]))
  }

  // 扫 A，筛掉命中 B 的行，保留 A 顺序
  const out: string[] = []
  const seenInA = new Set<string>()
  let hits = 0
  for (let i = 0; i < aLines.length; i++) {
    const line = aLines[i]
    const key = matchKey(line)
    if (bSet.has(key)) {
      hits += 1
      continue
    }
    if (optDedupeA.value) {
      if (seenInA.has(key)) continue
      seenInA.add(key)
    }
    out.push(line)
    // 大输入分级让出主线程，避免长时间无响应
    if ((i & 0x3ffff) === 0) await yieldToMain()
  }

  statA.value = aLines.length
  statB.value = bLines.length
  statHits.value = hits
  statResult.value = out.length
  resultLines.value = out
  resultTruncated.value = out.length > PREVIEW_LIMIT
  previewText.value = out.slice(0, PREVIEW_LIMIT).join('\n')
  hasRun.value = true
}

const handleDedup = async () => {
  if (!fileA.value || deduping.value) return
  deduping.value = true
  try {
    // 先让按钮 loading 渲染出来，再进入计算
    await yieldToMain()
    await runDedup()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '去重过程出错')
  } finally {
    deduping.value = false
  }
}

const handleClearResult = () => {
  hasRun.value = false
  statA.value = 0
  statB.value = 0
  statHits.value = 0
  statResult.value = 0
  previewText.value = ''
  resultTruncated.value = false
  resultLines.value = []
}

const copyResult = () => {
  if (statResult.value === 0) return
  copy(resultLines.value.join('\n'), '已复制去重结果到剪贴板')
}

const downloadResult = () => {
  if (statResult.value === 0) return
  downloadLines(resultLines.value, 'dedup-result.txt')
  message.success('已开始下载 dedup-result.txt')
}

/** 让出主线程一帧，便于 UI 更新 loading 与避免长时间阻塞。 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
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

.options-card,
.action-card,
.result-card {
  margin-top: var(--spacing-md);
}

/* 统计 */
.result-stats {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.stat-num {
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1.1;
}

.stat-label {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.stat-hit .stat-num {
  color: #fb7185;
}

.stat-result .stat-num {
  color: #22c55e;
}

@media (max-width: 900px) {
  .top-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
