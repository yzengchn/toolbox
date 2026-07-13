<template>
  <div class="tool-container">
    <ToolHeader
      title="Nginx 配置器"
      description="结构/安全校验、location 请求模拟、场景模板与常用片段（纯前端，不能替代 nginx -t）"
    />

    <div class="tool-content">
      <!-- 概览条 -->
      <div class="overview-bar">
        <n-tag size="small" :bordered="false">server {{ overview.servers }}</n-tag>
        <n-tag size="small" :bordered="false">location {{ overview.locations }}</n-tag>
        <n-tag size="small" :bordered="false">upstream {{ overview.upstreams }}</n-tag>
        <n-tag size="small" :bordered="false">proxy {{ overview.proxyLocations }}</n-tag>
        <n-tag size="small" :type="overview.hasSsl ? 'success' : 'default'" :bordered="false">
          SSL {{ overview.hasSsl ? '有' : '无' }}
        </n-tag>
        <n-tag size="small" :type="overview.hasGzip ? 'success' : 'default'" :bordered="false">
          Gzip {{ overview.hasGzip ? '有' : '无' }}
        </n-tag>
        <n-tag
          size="small"
          :type="overview.hasSecurityHeaders ? 'success' : 'default'"
          :bordered="false"
        >
          安全头 {{ overview.hasSecurityHeaders ? '有' : '无' }}
        </n-tag>
        <n-tag size="small" :type="overview.hasRateLimit ? 'success' : 'default'" :bordered="false">
          限流 {{ overview.hasRateLimit ? '有' : '无' }}
        </n-tag>
      </div>

      <!-- 模板快捷入口 -->
      <n-card size="small" class="template-card" title="场景模板">
        <div class="template-row">
          <button
            v-for="tpl in NGINX_TEMPLATES"
            :key="tpl.id"
            type="button"
            class="template-chip"
            :class="{ active: activeTemplateId === tpl.id }"
            :title="tpl.description"
            @click="applyTemplate(tpl)"
          >
            <span class="template-name">{{ tpl.name }}</span>
            <span class="template-desc">{{ tpl.description }}</span>
          </button>
        </div>
      </n-card>

      <div class="editor-sim-grid">
        <n-card class="editor-card" title="配置编辑">
          <template #header-extra>
            <n-space :size="8">
              <n-button quaternary size="small" @click="loadSample">示例</n-button>
              <n-button quaternary size="small" :disabled="!inputText" @click="handleFormat">
                格式化
              </n-button>
              <n-button quaternary size="small" @click="handleClear">清空</n-button>
              <n-button secondary size="small" :disabled="!inputText" @click="copyConfig">
                复制
              </n-button>
              <n-button type="primary" size="small" @click="runValidate">校验</n-button>
            </n-space>
          </template>

          <n-input
            v-model:value="inputText"
            type="textarea"
            class="config-input"
            placeholder="粘贴或编写 Nginx 配置，例如：&#10;location /api/ {&#10;    proxy_pass http://127.0.0.1:3000/;&#10;}"
            :autosize="{ minRows: 16, maxRows: 28 }"
            @keydown.ctrl.enter="runValidate"
            @keydown.meta.enter="runValidate"
          />

          <div class="result-bar">
            <template v-if="validated">
              <n-tag v-if="errorCount === 0 && warningCount === 0 && infoCount === 0" type="success" size="small">
                未发现明显问题
              </n-tag>
              <n-tag v-if="errorCount > 0" type="error" size="small">{{ errorCount }} 错误</n-tag>
              <n-tag v-if="warningCount > 0" type="warning" size="small">{{ warningCount }} 警告</n-tag>
              <n-tag v-if="infoCount > 0" type="info" size="small">{{ infoCount }} 建议</n-tag>
              <n-space :size="4">
                <n-button
                  v-for="cat in issueFilterOptions"
                  :key="cat.value"
                  size="tiny"
                  :type="issueFilter === cat.value ? 'primary' : 'default'"
                  secondary
                  @click="issueFilter = cat.value"
                >
                  {{ cat.label }}
                </n-button>
              </n-space>
              <span class="result-hint">静态检查，不能替代服务器上的 nginx -t</span>
            </template>
            <span v-else class="result-hint">编辑后点击「校验」，或 Ctrl/⌘ + Enter · 含语法/安全/实践</span>
          </div>

          <ul v-if="validated && filteredIssues.length" class="issue-list">
            <li
              v-for="(issue, idx) in filteredIssues"
              :key="`${issue.line}-${idx}`"
              class="issue-item"
              :class="`is-${issue.severity}`"
            >
              <span class="issue-line">L{{ issue.line }}</span>
              <n-tag size="tiny" :type="categoryTagType(issue.category)" :bordered="false">
                {{ categoryLabel(issue.category) }}
              </n-tag>
              <span class="issue-msg">{{ issue.message }}</span>
            </li>
          </ul>
        </n-card>

        <n-card class="simulate-card" title="请求模拟校验">
          <template #header-extra>
            <n-space :size="8">
              <n-tag size="small" :bordered="false">
                {{ parsedLocations.length }} 个 location
              </n-tag>
              <n-button quaternary size="small" @click="resetPresetPaths">重置用例</n-button>
            </n-space>
          </template>

          <div class="sim-custom">
            <n-input
              v-model:value="customPath"
              class="sim-path-input"
              placeholder="输入完整请求路径，如 /api/users?id=1 或 https://example.com/api/"
              clearable
              @keydown.enter="runCustomMatch"
            >
              <template #prefix>
                <span class="sim-method">GET</span>
              </template>
            </n-input>
            <n-button type="primary" size="small" :disabled="!customPath.trim()" @click="runCustomMatch">
              匹配
            </n-button>
          </div>

          <div v-if="customResult" class="sim-detail" :class="customResult.matched ? 'is-hit' : 'is-miss'">
            <div class="sim-detail-head">
              <span class="sim-uri mono">{{ customResult.uri }}</span>
              <n-tag :type="customResult.matched ? 'success' : 'warning'" size="small">
                {{ customResult.matched ? '已匹配' : '未匹配' }}
              </n-tag>
            </div>
            <p v-if="customResult.matched" class="sim-hit-line">
              <span class="label">命中</span>
              <code>L{{ customResult.matched.line }}</code>
              <code class="loc-raw">{{ customResult.matched.raw }}</code>
            </p>
            <p class="sim-reason">{{ customResult.reason }}</p>
            <p v-if="customResult.upstreamTarget" class="sim-upstream">
              <span class="label">proxy_pass</span>
              <code class="mono">{{ customResult.matched?.proxyPass }}</code>
              <span class="arrow">→</span>
              <code class="mono">{{ customResult.upstreamTarget }}</code>
            </p>
            <ul v-if="customResult.steps.length" class="sim-steps">
              <li
                v-for="(step, i) in customResult.steps"
                :key="i"
                :class="{ hit: step.matched }"
              >
                <span class="step-role">{{ stepRoleLabel(step.role) }}</span>
                <code class="mono">{{ step.location.raw }}</code>
                <span class="step-note">{{ step.note }}</span>
              </li>
            </ul>
          </div>

          <!-- proxy_pass 尾 / 对照 -->
          <div class="slash-demo">
            <p class="sim-section-title">
              <span>proxy_pass 尾 / 对照</span>
              <span class="result-hint">最常见踩坑</span>
            </p>
            <div class="slash-table">
              <div v-for="demo in PROXY_PASS_SLASH_DEMOS" :key="demo.location" class="slash-block">
                <div class="slash-loc mono">location {{ demo.location }}</div>
                <div class="slash-row is-good">
                  <span class="slash-flag">带 /</span>
                  <code class="mono">{{ demo.withSlash.proxyPass }}</code>
                  <span class="slash-result">{{ demo.withSlash.result }}</span>
                </div>
                <div class="slash-row">
                  <span class="slash-flag">不带</span>
                  <code class="mono">{{ demo.withoutSlash.proxyPass }}</code>
                  <span class="slash-result">{{ demo.withoutSlash.result }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="sim-section-title">
            <span>预设请求</span>
            <span class="result-hint">点击一行可填入上方并查看详情</span>
          </div>

          <div class="preset-list">
            <button
              v-for="item in allPresetResults"
              :key="item.uri"
              type="button"
              class="preset-row"
              :class="{
                'is-hit': !!item.matched,
                'is-miss': !item.matched,
                active: customResult?.uri === item.uri
              }"
              @click="selectPreset(item.uri)"
            >
              <span class="preset-uri mono">{{ item.uri }}</span>
              <span v-if="item.matched" class="preset-loc mono" :title="item.matched.raw">
                L{{ item.matched.line }} · {{ item.matched.raw }}
              </span>
              <span v-else class="preset-loc is-empty">无匹配</span>
              <span v-if="item.upstreamUri" class="preset-up mono" :title="item.upstreamTarget">
                → {{ item.upstreamUri }}
              </span>
            </button>
          </div>

          <div v-if="parsedLocations.length" class="loc-panel">
            <p class="sim-section-title">已解析 location</p>
            <ul class="loc-list">
              <li v-for="loc in parsedLocations" :key="`${loc.line}-${loc.raw}`" class="loc-item">
                <code class="loc-line">L{{ loc.line }}</code>
                <code class="loc-raw mono">{{ loc.raw }}</code>
                <span v-if="loc.proxyPass" class="loc-meta mono">proxy_pass {{ loc.proxyPass }}</span>
                <span v-else-if="loc.root" class="loc-meta mono">root {{ loc.root }}</span>
                <span v-else-if="loc.returnDirective" class="loc-meta mono">
                  return {{ loc.returnDirective }}
                </span>
                <span v-else-if="loc.tryFiles" class="loc-meta mono">try_files …</span>
              </li>
            </ul>
          </div>
          <p v-else class="empty-loc result-hint">
            当前配置未解析到 location，请编写或加载示例后再模拟
          </p>
        </n-card>
      </div>

      <n-card title="常用配置说明" class="snippets-card">
        <div class="snippet-layout">
          <div class="snippet-nav" role="tablist" aria-label="配置片段列表">
            <button
              v-for="item in NGINX_SNIPPETS"
              :key="item.id"
              type="button"
              class="snippet-nav-item"
              :class="{ active: activeSnippetId === item.id }"
              role="tab"
              :aria-selected="activeSnippetId === item.id"
              @click="activeSnippetId = item.id"
            >
              <span class="snippet-nav-title">{{ item.title }}</span>
              <span class="snippet-nav-tags">
                <span v-for="tag in item.tags" :key="tag" class="tag-pill">{{ tag }}</span>
              </span>
            </button>
          </div>

          <div v-if="activeSnippet" class="snippet-detail" role="tabpanel">
            <div class="snippet-detail-head">
              <h3>{{ activeSnippet.title }}</h3>
              <n-space :size="8">
                <n-button size="small" secondary @click="copySnippet(activeSnippet.example)">
                  复制示例
                </n-button>
                <n-button size="small" type="primary" @click="insertSnippet(activeSnippet.example)">
                  插入到编辑器
                </n-button>
              </n-space>
            </div>

            <p class="snippet-desc">{{ activeSnippet.description }}</p>

            <pre class="snippet-code">{{ activeSnippet.example }}</pre>

            <div class="snippet-notes">
              <p class="snippet-notes-title">要点</p>
              <ul>
                <li v-for="(note, i) in activeSnippet.notes" :key="i">{{ note }}</li>
              </ul>
            </div>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NCard, NInput, NSpace, NTag, useMessage } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useStorage } from '@/composables/useStorage'
import {
  DEFAULT_SIMULATE_PATHS,
  extractLocations,
  formatNginxConfig,
  getNginxOverview,
  matchLocation,
  matchMany,
  NGINX_SNIPPETS,
  NGINX_TEMPLATES,
  PROXY_PASS_SLASH_DEMOS,
  validateNginxConfig,
  type LocationMatchResult,
  type NginxIssue,
  type NginxIssueCategory,
  type NginxTemplate
} from './nginxUtils'

const message = useMessage()
const { copy } = useClipboard()

const { data: inputText } = useStorage('nginx-configurator-input', '')
const { data: customPath } = useStorage('nginx-configurator-sim-path', '/api/users')
const activeSnippetId = ref(NGINX_SNIPPETS[0]?.id ?? '')
const activeTemplateId = ref('')
const issues = ref<NginxIssue[]>([])
const validated = ref(false)
const customResult = ref<LocationMatchResult | null>(null)
const issueFilter = ref<'all' | NginxIssueCategory>('all')

const activeSnippet = computed(
  () => NGINX_SNIPPETS.find(item => item.id === activeSnippetId.value) ?? NGINX_SNIPPETS[0]
)

const errorCount = computed(() => issues.value.filter(i => i.severity === 'error').length)
const warningCount = computed(() => issues.value.filter(i => i.severity === 'warning').length)
const infoCount = computed(() => issues.value.filter(i => i.severity === 'info').length)

const issueFilterOptions = [
  { value: 'all' as const, label: '全部' },
  { value: 'syntax' as const, label: '语法' },
  { value: 'security' as const, label: '安全' },
  { value: 'practice' as const, label: '实践' }
]

const filteredIssues = computed(() => {
  if (issueFilter.value === 'all') return issues.value
  return issues.value.filter(i => i.category === issueFilter.value)
})

const parsedLocations = computed(() => extractLocations(inputText.value))
const overview = computed(() => getNginxOverview(inputText.value))

/** 默认用例 + 配置中已声明的前缀/精确 location（去重） */
const allPresetResults = computed(() => {
  const fromConfig = parsedLocations.value
    .filter(l => l.modifier === 'exact' || l.modifier === 'prefix' || l.modifier === 'prefer')
    .map(l => l.pattern)
  const paths = [...new Set([...DEFAULT_SIMULATE_PATHS, ...fromConfig])]
  return matchMany(paths, inputText.value)
})

const categoryLabel = (c: NginxIssueCategory) => {
  if (c === 'security') return '安全'
  if (c === 'practice') return '实践'
  return '语法'
}

const categoryTagType = (c: NginxIssueCategory): 'error' | 'warning' | 'info' | 'default' => {
  if (c === 'security') return 'error'
  if (c === 'practice') return 'info'
  return 'warning'
}

const runValidate = () => {
  issues.value = validateNginxConfig(inputText.value)
  validated.value = true
  issueFilter.value = 'all'
  if (errorCount.value === 0 && warningCount.value === 0 && infoCount.value === 0) {
    message.success('未发现明显问题')
  } else if (errorCount.value > 0) {
    message.warning(
      `发现 ${errorCount.value} 错误、${warningCount.value} 警告、${infoCount.value} 建议`
    )
  } else if (warningCount.value > 0) {
    message.info(`发现 ${warningCount.value} 警告、${infoCount.value} 建议`)
  } else {
    message.info(`发现 ${infoCount.value} 条实践建议`)
  }
}

const runCustomMatch = () => {
  const path = customPath.value.trim()
  if (!path) return
  customResult.value = matchLocation(path, inputText.value)
}

const selectPreset = (uri: string) => {
  customPath.value = uri
  customResult.value = matchLocation(uri, inputText.value)
}

const resetPresetPaths = () => {
  customPath.value = '/api/users'
  customResult.value = matchLocation(customPath.value, inputText.value)
  message.success('已重置模拟路径')
}

const stepRoleLabel = (role: string) => {
  switch (role) {
    case 'exact':
      return '='
    case 'prefer':
      return '^~'
    case 'prefix':
      return '前缀'
    case 'regex':
      return '正则'
    case 'fallback':
      return '回退'
    default:
      return role
  }
}

const applyTemplate = (tpl: NginxTemplate) => {
  inputText.value = tpl.content
  activeTemplateId.value = tpl.id
  validated.value = false
  issues.value = []
  customResult.value = matchLocation(customPath.value || '/api/users', tpl.content)
  message.success(`已加载模板：${tpl.name}`)
}

const loadSample = () => {
  const tpl = NGINX_TEMPLATES.find(t => t.id === 'reverse-proxy') ?? NGINX_TEMPLATES[0]
  if (tpl) applyTemplate(tpl)
}

const handleFormat = () => {
  if (!inputText.value.trim()) return
  inputText.value = formatNginxConfig(inputText.value)
  message.success('已格式化缩进')
}

const handleClear = () => {
  inputText.value = ''
  validated.value = false
  issues.value = []
  customResult.value = null
  activeTemplateId.value = ''
}

const copyConfig = () => {
  if (!inputText.value) return
  copy(inputText.value, '已复制 Nginx 配置')
}

const copySnippet = (text: string) => {
  copy(text, '已复制配置片段')
}

const insertSnippet = (text: string) => {
  const current = inputText.value
  inputText.value = current.trim()
    ? `${current.replace(/\s*$/, '')}\n\n${text}\n`
    : `${text}\n`
  validated.value = false
  message.success('已插入到编辑器')
}

// 配置变更：结构校验结果过期；自定义路径重新匹配
watch(
  inputText,
  val => {
    if (validated.value) {
      validated.value = false
      issues.value = []
    }
    if (customPath.value.trim()) {
      customResult.value = matchLocation(customPath.value, val)
    }
  },
  { immediate: true }
)
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

.overview-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.template-card :deep(.n-card__content) {
  padding-top: 10px;
}

.template-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 140px;
  max-width: 220px;
  padding: 8px 12px;
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

.template-chip:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  background: var(--color-surface);
}

.template-chip.active {
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 12%, transparent));
}

.template-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.template-desc {
  font-size: 11px;
  color: var(--color-text-tertiary);
  line-height: 1.35;
}

.editor-sim-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.95fr);
  gap: var(--spacing-md);
  align-items: start;
}

.config-input :deep(textarea) {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.result-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  min-height: 28px;
}

.result-hint {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.issue-list {
  list-style: none;
  margin: var(--spacing-sm) 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-height: 260px;
  overflow-y: auto;
}

.issue-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 8px;
  padding: 8px 10px;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-border);
}

.issue-item:last-child {
  border-bottom: none;
}

.issue-item.is-error {
  background: color-mix(in srgb, #ef4444 8%, var(--color-surface));
}

.issue-item.is-warning {
  background: color-mix(in srgb, #f59e0b 8%, var(--color-surface));
}

.issue-item.is-info {
  background: color-mix(in srgb, #3b82f6 7%, var(--color-surface));
}

.issue-line {
  flex: 0 0 auto;
  min-width: 40px;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.issue-item.is-error .issue-line {
  color: #ef4444;
}

.issue-item.is-warning .issue-line {
  color: #d97706;
}

.issue-item.is-info .issue-line {
  color: #2563eb;
}

.issue-msg {
  min-width: 0;
  flex: 1 1 180px;
  color: var(--color-text-primary);
  line-height: 1.45;
}

/* ── 请求模拟 ── */
.sim-custom {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sim-path-input {
  flex: 1;
  min-width: 0;
}

.sim-path-input :deep(input) {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}

.sim-method {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding-right: 4px;
}

.sim-detail {
  margin-top: var(--spacing-sm);
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.sim-detail.is-hit {
  border-color: color-mix(in srgb, #22c55e 35%, var(--color-border));
  background: color-mix(in srgb, #22c55e 7%, var(--color-surface));
}

.sim-detail.is-miss {
  border-color: color-mix(in srgb, #f59e0b 35%, var(--color-border));
  background: color-mix(in srgb, #f59e0b 7%, var(--color-surface));
}

.sim-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.sim-uri {
  font-weight: 600;
  color: var(--color-text-primary);
  word-break: break-all;
}

.sim-hit-line,
.sim-reason,
.sim-upstream {
  margin: 4px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  word-break: break-all;
}

.sim-hit-line code,
.sim-upstream code {
  margin: 0 4px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--color-surface);
  font-size: 12px;
}

.sim-hit-line .label,
.sim-upstream .label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  margin-right: 2px;
}

.sim-upstream .arrow {
  margin: 0 2px;
  color: var(--color-text-tertiary);
}

.sim-steps {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  max-height: 140px;
  overflow-y: auto;
  border-top: 1px dashed var(--color-border);
  padding-top: 6px;
}

.sim-steps li {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 2px 8px;
  padding: 3px 0;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.sim-steps li.hit {
  color: var(--color-text-primary);
}

.sim-steps .step-role {
  font-weight: 600;
  font-family: var(--font-mono);
  font-size: 11px;
}

.sim-steps .step-note {
  grid-column: 2;
  opacity: 0.85;
}

.slash-demo {
  margin-top: 4px;
}

.slash-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slash-block {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.slash-loc {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text-primary);
}

.slash-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 6px;
  align-items: baseline;
  padding: 3px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.slash-row.is-good .slash-flag {
  color: #16a34a;
  font-weight: 600;
}

.slash-flag {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.slash-result {
  color: var(--color-text-tertiary);
  word-break: break-all;
}

.sim-section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: var(--spacing-md) 0 8px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.preset-row {
  display: grid;
  grid-template-columns: minmax(100px, 0.9fr) minmax(0, 1.2fr);
  gap: 2px 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.preset-row:hover {
  border-color: var(--color-border);
  background: var(--color-surface);
}

.preset-row.active {
  border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 10%, transparent));
}

.preset-row.is-hit .preset-uri {
  color: #16a34a;
}

.preset-row.is-miss .preset-uri {
  color: #d97706;
}

.preset-uri {
  font-size: var(--font-size-sm);
  font-weight: 500;
  word-break: break-all;
}

.preset-loc {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-loc.is-empty {
  color: var(--color-text-tertiary);
}

.preset-up {
  grid-column: 1 / -1;
  font-size: 11px;
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loc-panel {
  margin-top: 4px;
}

.loc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  max-height: 160px;
  overflow-y: auto;
}

.loc-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  padding: 6px 10px;
  font-size: 12px;
  border-bottom: 1px solid var(--color-border);
}

.loc-item:last-child {
  border-bottom: none;
}

.loc-line {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 36px;
}

.loc-raw {
  color: var(--color-text-primary);
}

.loc-meta {
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.empty-loc {
  margin: var(--spacing-sm) 0 0;
}

.mono {
  font-family: var(--font-mono);
}

/* ── 片段说明 ── */
.snippet-layout {
  display: grid;
  grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
  gap: var(--spacing-md);
  min-height: 360px;
}

.snippet-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.snippet-nav-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.snippet-nav-item:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border);
}

.snippet-nav-item.active {
  background: var(--color-primary-soft, color-mix(in srgb, var(--color-primary) 12%, transparent));
  border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
}

.snippet-nav-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.35;
}

.snippet-nav-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-pill {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  font-size: 11px;
  line-height: 1.4;
}

.snippet-nav-item.active .tag-pill {
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.snippet-detail {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.snippet-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.snippet-detail-head h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.snippet-desc {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.snippet-code {
  margin: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  line-height: 1.55;
  color: var(--color-text-primary);
  white-space: pre;
  overflow: auto;
  max-height: 280px;
}

.snippet-notes {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.snippet-notes-title {
  margin: 0 0 6px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.snippet-notes ul {
  margin: 0;
  padding-left: 1.15em;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.snippet-notes li + li {
  margin-top: 4px;
}

@media (max-width: 1100px) {
  .editor-sim-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .snippet-layout {
    grid-template-columns: 1fr;
  }

  .snippet-nav {
    flex-direction: row;
    flex-wrap: wrap;
    max-height: none;
  }

  .snippet-nav-item {
    width: auto;
    max-width: 100%;
  }

  .snippet-detail-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .preset-row {
    grid-template-columns: 1fr;
  }

  .slash-row {
    grid-template-columns: 40px 1fr;
  }

  .slash-result {
    grid-column: 1 / -1;
    padding-left: 40px;
  }
}
</style>
