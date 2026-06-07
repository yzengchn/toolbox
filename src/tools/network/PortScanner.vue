<template>
  <div class="tool-container">
    <ToolHeader
      title="端口扫描工具"
      description="批量探测目标主机的 HTTP/HTTPS 端口可访问性"
    />

    <div class="tool-content">
      <n-grid cols="1 l:2" responsive="screen" :x-gap="16" :y-gap="16" class="top-grid">
        <n-grid-item>
          <n-card title="扫描配置" class="panel-card">
            <n-space vertical :size="14">
              <n-form-item label="目标主机">
                <n-input
                  v-model:value="targetHost"
                  placeholder="localhost、192.168.1.1、example.com"
                  clearable
                  :disabled="isScanning"
                  @keyup.enter="startScan"
                />
              </n-form-item>

              <n-form-item label="端口">
                <n-input
                  v-model:value="portsText"
                  type="textarea"
                  placeholder="80, 443, 3000-3005, 5173"
                  :rows="4"
                  clearable
                  :disabled="isScanning"
                />
              </n-form-item>

              <div class="preset-row">
                <n-button size="small" :disabled="isScanning" @click="applyPreset('web')">
                  常用 Web
                </n-button>
                <n-button size="small" :disabled="isScanning" @click="applyPreset('dev')">
                  本机开发
                </n-button>
                <n-button size="small" :disabled="isScanning" @click="applyPreset('api')">
                  API 服务
                </n-button>
              </div>
            </n-space>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card title="探测参数" class="panel-card">
            <n-space vertical :size="14">
              <n-grid cols="1 m:2" responsive="screen" :x-gap="12" :y-gap="12">
                <n-grid-item>
                  <n-form-item label="协议">
                    <n-select
                      v-model:value="protocolMode"
                      :options="protocolOptions"
                      :disabled="isScanning"
                    />
                  </n-form-item>
                </n-grid-item>

                <n-grid-item>
                  <n-form-item label="路径">
                    <n-input
                      v-model:value="requestPath"
                      placeholder="/"
                      clearable
                      :disabled="isScanning"
                    />
                  </n-form-item>
                </n-grid-item>

                <n-grid-item>
                  <n-form-item label="超时">
                    <n-input-number
                      v-model:value="timeoutMs"
                      :min="300"
                      :max="10000"
                      :step="100"
                      :show-button="false"
                      :disabled="isScanning"
                      class="number-input"
                    >
                      <template #suffix>ms</template>
                    </n-input-number>
                  </n-form-item>
                </n-grid-item>

                <n-grid-item>
                  <n-form-item label="并发数">
                    <n-input-number
                      v-model:value="concurrency"
                      :min="1"
                      :max="32"
                      :step="1"
                      :show-button="false"
                      :disabled="isScanning"
                      class="number-input"
                    />
                  </n-form-item>
                </n-grid-item>
              </n-grid>

              <n-alert type="warning" :bordered="false">
                浏览器无法执行原始 TCP 扫描；此工具通过 HTTP/HTTPS 请求探测，请仅扫描你有权限的主机。
              </n-alert>

              <n-space wrap>
                <n-button type="primary" :loading="isScanning" :disabled="isScanning" @click="startScan">
                  开始扫描
                </n-button>
                <n-button :disabled="!isScanning" @click="stopScan">
                  停止
                </n-button>
                <n-button :disabled="isScanning" @click="loadExample">
                  示例
                </n-button>
                <n-button :disabled="isScanning" @click="clearAll">
                  清空
                </n-button>
              </n-space>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-alert v-if="error" type="error" class="section-gap">
        {{ error }}
      </n-alert>

      <n-card title="扫描结果" class="results-card">
        <template #header-extra>
          <n-space>
            <n-button text :disabled="!results.length" @click="copyResults">
              复制结果
            </n-button>
            <n-button text :disabled="!results.length || isScanning" @click="clearResults">
              清空结果
            </n-button>
          </n-space>
        </template>

        <n-empty v-if="!results.length" description="配置目标和端口后开始扫描" />

        <n-space v-else vertical :size="16">
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">总端口</span>
              <strong>{{ stats.total }}</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">可访问</span>
              <strong class="stat-open">{{ stats.open }}</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">超时/不可达</span>
              <strong>{{ stats.closed + stats.timeout }}</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">浏览器限制</span>
              <strong>{{ stats.blocked }}</strong>
            </div>
          </div>

          <n-progress
            type="line"
            :percentage="progressPercentage"
            :show-indicator="true"
            processing
          />

          <div class="scan-table-wrap">
            <div class="scan-table">
              <div class="scan-row scan-row--head">
                <span>端口</span>
                <span>服务</span>
                <span>协议</span>
                <span>状态</span>
                <span>耗时</span>
                <span>地址</span>
                <span>详情</span>
              </div>

              <div
                v-for="item in results"
                :key="item.port"
                class="scan-row"
                :class="`scan-row--${item.status}`"
              >
                <span class="mono">{{ item.port }}</span>
                <span>{{ item.service }}</span>
                <span class="mono">{{ item.protocol || '-' }}</span>
                <span>
                  <n-tag :type="getStatusTagType(item.status)" size="small">
                    {{ statusLabels[item.status] }}
                  </n-tag>
                </span>
                <span>{{ item.latency === null ? '-' : `${item.latency} ms` }}</span>
                <span class="url-cell">
                  <a v-if="item.url" :href="item.url" target="_blank" rel="noreferrer">
                    {{ item.url }}
                  </a>
                  <span v-else>-</span>
                </span>
                <span>{{ item.detail }}</span>
              </div>
            </div>
          </div>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NProgress,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

type ProtocolMode = 'http' | 'https' | 'both'
type ProbeProtocol = 'http' | 'https'
type ScanStatus = 'pending' | 'scanning' | 'open' | 'closed' | 'blocked' | 'timeout' | 'stopped'
type StatusTagType = 'default' | 'info' | 'success' | 'warning' | 'error'
type PresetType = 'web' | 'dev' | 'api'

interface ScanResult {
  port: number
  service: string
  protocol: ProbeProtocol | ''
  status: ScanStatus
  latency: number | null
  url: string
  detail: string
}

interface ProbeResult {
  protocol: ProbeProtocol
  status: ScanStatus
  latency: number | null
  url: string
  detail: string
}

const MAX_PORTS = 500

const { copy } = useClipboard()

const targetHost = ref('localhost')
const portsText = ref('80, 443, 3000, 5173, 8000, 8080, 8443')
const protocolMode = ref<ProtocolMode>('both')
const requestPath = ref('/')
const timeoutMs = ref<number | null>(1800)
const concurrency = ref<number | null>(8)
const isScanning = ref(false)
const error = ref('')
const results = ref<ScanResult[]>([])

let scanId = 0
let stopRequested = false
const activeControllers = new Set<AbortController>()

const protocolOptions = [
  { label: 'HTTP + HTTPS', value: 'both' },
  { label: 'HTTP', value: 'http' },
  { label: 'HTTPS', value: 'https' }
]

const statusLabels: Record<ScanStatus, string> = {
  pending: '等待',
  scanning: '扫描中',
  open: '可访问',
  closed: '不可达',
  blocked: '受限',
  timeout: '超时',
  stopped: '已停止'
}

const commonServices: Record<number, string> = {
  20: 'FTP Data',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  465: 'SMTPS',
  587: 'SMTP',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'SQL Server',
  1521: 'Oracle',
  2049: 'NFS',
  2375: 'Docker',
  2376: 'Docker TLS',
  3000: 'Dev Server',
  3306: 'MySQL',
  3389: 'RDP',
  4173: 'Vite Preview',
  5000: 'API Server',
  5173: 'Vite',
  5432: 'PostgreSQL',
  5601: 'Kibana',
  5672: 'RabbitMQ',
  5900: 'VNC',
  6379: 'Redis',
  8000: 'HTTP Alt',
  8080: 'HTTP Alt',
  8443: 'HTTPS Alt',
  9000: 'HTTP Alt',
  9200: 'Elasticsearch',
  9300: 'Elasticsearch',
  11211: 'Memcached',
  27017: 'MongoDB'
}

const browserBlockedPorts = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79,
  87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137,
  139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540,
  548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049,
  3659, 4045, 5060, 5061, 6000, 6566, 6697, 10080
])

const stats = computed(() => {
  const base = {
    total: results.value.length,
    open: 0,
    closed: 0,
    blocked: 0,
    timeout: 0,
    done: 0
  }

  return results.value.reduce((current, item) => {
    if (item.status === 'open') current.open += 1
    if (item.status === 'closed') current.closed += 1
    if (item.status === 'blocked') current.blocked += 1
    if (item.status === 'timeout') current.timeout += 1
    if (!['pending', 'scanning'].includes(item.status)) current.done += 1

    return current
  }, base)
})

const progressPercentage = computed(() => {
  if (!stats.value.total) return 0

  return Math.round((stats.value.done / stats.value.total) * 100)
})

const isBrowserBlockedPort = (port: number) => browserBlockedPorts.has(port) || (port >= 6665 && port <= 6669)

const getServiceName = (port: number) => commonServices[port] ?? 'Unknown'

const normalizeTargetHost = (value: string) => {
  let host = value.trim()

  if (!host) {
    throw new Error('请输入目标主机')
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host)) {
    const parsed = new URL(host)
    host = parsed.hostname
  } else {
    const slashIndex = host.indexOf('/')
    if (slashIndex !== -1) host = host.slice(0, slashIndex)

    if (host.startsWith('[')) {
      const bracketEnd = host.indexOf(']')
      if (bracketEnd !== -1) host = host.slice(1, bracketEnd)
    } else {
      const colonCount = host.split(':').length - 1
      if (colonCount === 1) host = host.split(':')[0]
    }
  }

  if (!host) {
    throw new Error('目标主机格式无效')
  }

  return host
}

const parsePorts = (input: string) => {
  const tokens = input
    .split(/[\s,，;；]+/)
    .map(item => item.trim())
    .filter(Boolean)
  const ports = new Set<number>()

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)-(\d+)$/)

    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])

      if (start > end || start < 1 || end > 65535) {
        throw new Error(`端口范围无效：${token}`)
      }

      for (let port = start; port <= end; port += 1) {
        ports.add(port)
      }
    } else if (/^\d+$/.test(token)) {
      const port = Number(token)

      if (port < 1 || port > 65535) {
        throw new Error(`端口超出范围：${token}`)
      }

      ports.add(port)
    } else {
      throw new Error(`端口格式无效：${token}`)
    }

    if (ports.size > MAX_PORTS) {
      throw new Error(`一次最多扫描 ${MAX_PORTS} 个端口`)
    }
  }

  if (!ports.size) {
    throw new Error('请输入至少一个端口')
  }

  return [...ports].sort((left, right) => left - right)
}

const getProtocols = (): ProbeProtocol[] => {
  if (protocolMode.value === 'both') return ['http', 'https']

  return [protocolMode.value]
}

const normalizePath = (value: string) => {
  const path = value.trim() || '/'

  return path.startsWith('/') ? path : `/${path}`
}

const formatHostForUrl = (host: string) => host.includes(':') && !host.startsWith('[') ? `[${host}]` : host

const buildProbeUrl = (protocol: ProbeProtocol, host: string, port: number) => {
  return `${protocol}://${formatHostForUrl(host)}:${port}${normalizePath(requestPath.value)}`
}

const updateResult = (index: number, patch: Partial<ScanResult>) => {
  const current = results.value[index]
  if (!current) return

  results.value.splice(index, 1, { ...current, ...patch })
}

const probe = async (
  protocol: ProbeProtocol,
  host: string,
  port: number,
  timeout: number
): Promise<ProbeResult> => {
  const url = buildProbeUrl(protocol, host, port)

  if (isBrowserBlockedPort(port)) {
    return {
      protocol,
      status: 'blocked',
      latency: null,
      url,
      detail: '浏览器安全策略限制访问该端口'
    }
  }

  const controller = new AbortController()
  const startedAt = performance.now()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  activeControllers.add(controller)

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    })

    return {
      protocol,
      status: 'open',
      latency: Math.round(performance.now() - startedAt),
      url,
      detail: '请求已得到浏览器网络栈响应'
    }
  } catch (requestError) {
    const message = requestError instanceof Error ? requestError.message : '请求失败'

    if (stopRequested) {
      return {
        protocol,
        status: 'stopped',
        latency: Math.round(performance.now() - startedAt),
        url,
        detail: '扫描已停止'
      }
    }

    if (controller.signal.aborted) {
      return {
        protocol,
        status: 'timeout',
        latency: timeout,
        url,
        detail: '请求超时'
      }
    }

    if (/bad port|blocked|forbidden|not allowed|unsafe/i.test(message)) {
      return {
        protocol,
        status: 'blocked',
        latency: Math.round(performance.now() - startedAt),
        url,
        detail: '浏览器阻止了该请求'
      }
    }

    return {
      protocol,
      status: 'closed',
      latency: Math.round(performance.now() - startedAt),
      url,
      detail: '连接失败或目标不是可探测的 HTTP 服务'
    }
  } finally {
    window.clearTimeout(timer)
    activeControllers.delete(controller)
  }
}

const pickFinalProbe = (probes: ProbeResult[]) => {
  const openProbe = probes.find(item => item.status === 'open')
  if (openProbe) return openProbe

  const stoppedProbe = probes.find(item => item.status === 'stopped')
  if (stoppedProbe) return stoppedProbe

  const timeoutProbe = probes.find(item => item.status === 'timeout')
  if (timeoutProbe) return timeoutProbe

  const closedProbe = probes.find(item => item.status === 'closed')
  if (closedProbe) return closedProbe

  return probes[0]
}

const scanPort = async (host: string, port: number, timeout: number) => {
  const probes: ProbeResult[] = []

  for (const protocol of getProtocols()) {
    if (stopRequested) break

    const probeResult = await probe(protocol, host, port, timeout)
    probes.push(probeResult)

    if (probeResult.status === 'open' || probeResult.status === 'stopped') {
      break
    }
  }

  return pickFinalProbe(probes)
}

const startScan = async () => {
  error.value = ''
  stopRequested = false
  const currentScanId = scanId + 1
  scanId = currentScanId

  let host = ''
  let ports: number[] = []

  try {
    host = normalizeTargetHost(targetHost.value)
    ports = parsePorts(portsText.value)
  } catch (validationError) {
    error.value = (validationError as Error).message
    return
  }

  const timeout = timeoutMs.value ?? 1800
  const workerCount = Math.min(concurrency.value ?? 8, ports.length)
  let nextIndex = 0

  results.value = ports.map(port => ({
    port,
    service: getServiceName(port),
    protocol: '',
    status: 'pending',
    latency: null,
    url: '',
    detail: '等待扫描'
  }))
  isScanning.value = true

  const runWorker = async () => {
    while (!stopRequested && currentScanId === scanId) {
      const index = nextIndex
      nextIndex += 1

      if (index >= ports.length) break

      const port = ports[index]
      updateResult(index, {
        status: 'scanning',
        detail: '扫描中'
      })

      const scanResult = await scanPort(host, port, timeout)
      updateResult(index, {
        protocol: scanResult.protocol,
        status: scanResult.status,
        latency: scanResult.latency,
        url: scanResult.url,
        detail: scanResult.detail
      })
    }
  }

  await Promise.all(Array.from({ length: workerCount }, runWorker))

  if (currentScanId === scanId) {
    if (stopRequested) {
      results.value = results.value.map(item => (
        item.status === 'pending' || item.status === 'scanning'
          ? { ...item, status: 'stopped', detail: '扫描已停止' }
          : item
      ))
    }

    isScanning.value = false
  }
}

const stopScan = () => {
  stopRequested = true
  activeControllers.forEach(controller => controller.abort())
}

const applyPreset = (type: PresetType) => {
  const presets: Record<PresetType, string> = {
    web: '80, 443, 8000, 8080, 8443',
    dev: '3000-3005, 4173, 5000, 5173, 8000, 8080',
    api: '80, 443, 5000, 7001, 8000, 8080, 9000, 9200'
  }

  portsText.value = presets[type]
}

const loadExample = () => {
  targetHost.value = 'localhost'
  portsText.value = '80, 443, 3000, 5173, 8000, 8080, 8443'
  protocolMode.value = 'both'
  requestPath.value = '/'
  timeoutMs.value = 1800
  concurrency.value = 8
}

const clearResults = () => {
  results.value = []
  error.value = ''
}

const clearAll = () => {
  targetHost.value = ''
  portsText.value = ''
  requestPath.value = '/'
  clearResults()
}

const copyResults = async () => {
  if (!results.value.length) return

  const lines = results.value.map(item => [
    item.port,
    item.service,
    item.protocol || '-',
    statusLabels[item.status],
    item.latency === null ? '-' : `${item.latency}ms`,
    item.url || '-',
    item.detail
  ].join('\t'))

  await copy([
    '端口\t服务\t协议\t状态\t耗时\t地址\t详情',
    ...lines
  ].join('\n'))
}

const getStatusTagType = (status: ScanStatus): StatusTagType => {
  if (status === 'open') return 'success'
  if (status === 'scanning') return 'info'
  if (status === 'blocked' || status === 'timeout') return 'warning'
  if (status === 'closed') return 'error'

  return 'default'
}
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 1180px;
}

.panel-card {
  height: 100%;
}

.number-input {
  width: 100%;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-gap,
.results-card {
  margin-top: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  min-width: 0;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.stat-label {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.stat-card strong {
  display: block;
  margin-top: 4px;
  color: var(--color-text-primary);
  font-size: 24px;
  line-height: 1.2;
}

.stat-open {
  color: var(--color-success) !important;
}

.scan-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.scan-table {
  min-width: 920px;
}

.scan-row {
  display: grid;
  grid-template-columns: 76px 120px 86px 108px 86px minmax(220px, 1fr) minmax(220px, 1.1fr);
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 10px 12px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.scan-row:first-child {
  border-top: 0;
}

.scan-row--head {
  min-height: 42px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.scan-row--open {
  background: color-mix(in srgb, var(--color-success) 7%, transparent);
}

.scan-row--blocked,
.scan-row--timeout {
  background: color-mix(in srgb, var(--color-warning) 7%, transparent);
}

.scan-row--closed {
  background: color-mix(in srgb, var(--color-error) 5%, transparent);
}

.mono {
  font-family: var(--font-mono);
}

.url-cell {
  min-width: 0;
  overflow-wrap: anywhere;
}

.url-cell a {
  color: var(--color-primary);
  text-decoration: none;
}

.url-cell a:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
