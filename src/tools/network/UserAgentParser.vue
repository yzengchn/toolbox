<template>
  <div class="tool-container">
    <ToolHeader
      title="User-Agent 解析器"
      description="解析浏览器、系统、设备、渲染引擎和爬虫标识"
    />

    <div class="tool-content">
      <n-grid cols="1 l:2" responsive="screen" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-card title="User-Agent 输入">
            <n-space vertical :size="16">
              <n-input
                v-model:value="userAgent"
                type="textarea"
                placeholder="粘贴 User-Agent 字符串"
                :rows="9"
                clearable
                class="ua-input"
              />

              <n-space wrap>
                <n-button type="primary" @click="loadCurrentUserAgent">
                  当前浏览器
                </n-button>
                <n-button
                  v-for="sample in sampleOptions"
                  :key="sample.label"
                  @click="fillSample(sample.userAgent)"
                >
                  {{ sample.label }}
                </n-button>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </n-space>
          </n-card>

          <n-card title="原始信息" class="raw-card">
            <n-descriptions :column="1" bordered label-placement="left">
              <n-descriptions-item label="字符数">
                {{ userAgent.trim().length }}
              </n-descriptions-item>
              <n-descriptions-item label="包含 Mozilla">
                {{ userAgent.includes('Mozilla') ? '是' : '否' }}
              </n-descriptions-item>
              <n-descriptions-item label="包含兼容标记">
                {{ userAgent.includes('compatible') ? '是' : '否' }}
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card title="解析结果">
            <template #header-extra>
              <n-button text :disabled="!result" @click="handleCopySummary">
                复制结果
              </n-button>
            </template>

            <n-empty v-if="!result" description="输入 User-Agent 后自动解析" />

            <n-space v-else vertical :size="16">
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">浏览器</span>
                  <span class="summary-value">{{ formatNameVersion(result.browser) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">系统</span>
                  <span class="summary-value">{{ formatNameVersion(result.os) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">设备</span>
                  <span class="summary-value">{{ deviceTypeLabels[result.device.type] }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">引擎</span>
                  <span class="summary-value">{{ formatNameVersion(result.engine) }}</span>
                </div>
              </div>

              <n-space wrap>
                <n-tag :type="getDeviceTagType(result.device.type)" size="small">
                  {{ deviceTypeLabels[result.device.type] }}
                </n-tag>
                <n-tag v-if="result.flags.isWebView" type="warning" size="small">
                  WebView
                </n-tag>
                <n-tag v-if="result.flags.isBot" type="error" size="small">
                  爬虫
                </n-tag>
                <n-tag v-if="result.flags.isTouchDevice" type="info" size="small">
                  触控设备
                </n-tag>
              </n-space>

              <n-descriptions :column="1" bordered label-placement="left" class="result-descriptions">
                <n-descriptions-item label="浏览器名称">
                  {{ result.browser.name }}
                </n-descriptions-item>
                <n-descriptions-item label="浏览器版本">
                  {{ result.browser.version || '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="主版本">
                  {{ result.browser.major || '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="操作系统">
                  {{ formatNameVersion(result.os) }}
                </n-descriptions-item>
                <n-descriptions-item label="设备厂商">
                  {{ result.device.vendor || '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="设备型号">
                  {{ result.device.model || '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="CPU 架构">
                  {{ result.cpu.architecture }}
                </n-descriptions-item>
                <n-descriptions-item label="渲染引擎">
                  {{ formatNameVersion(result.engine) }}
                </n-descriptions-item>
                <n-descriptions-item label="WebView">
                  {{ result.flags.isWebView ? '是' : '否' }}
                </n-descriptions-item>
                <n-descriptions-item label="爬虫">
                  {{ result.flags.isBot ? '是' : '否' }}
                </n-descriptions-item>
              </n-descriptions>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NGrid,
  NGridItem,
  NInput,
  NSpace,
  NTag
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import { useClipboard } from '@/composables/useClipboard'

type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'tv' | 'wearable' | 'console' | 'unknown'
type TagType = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'

interface NameVersionInfo {
  name: string
  version: string
  major: string
}

interface DeviceInfo {
  type: DeviceType
  vendor: string
  model: string
}

interface ParsedUserAgent {
  raw: string
  browser: NameVersionInfo
  os: NameVersionInfo
  engine: NameVersionInfo
  device: DeviceInfo
  cpu: {
    architecture: string
  }
  flags: {
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
    isBot: boolean
    isWebView: boolean
    isTouchDevice: boolean
  }
}

interface DetectionPattern {
  name: string
  pattern: RegExp
}

interface SampleOption {
  label: string
  userAgent: string
}

const UNKNOWN = '未知'

const { copy } = useClipboard()

const userAgent = ref('')

const deviceTypeLabels: Record<DeviceType, string> = {
  desktop: '桌面设备',
  mobile: '手机',
  tablet: '平板',
  bot: '爬虫',
  tv: '电视',
  wearable: '可穿戴',
  console: '游戏主机',
  unknown: '未知设备'
}

const sampleOptions: SampleOption[] = [
  {
    label: 'Chrome 桌面',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  },
  {
    label: 'iPhone Safari',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  },
  {
    label: 'Android Chrome',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro Build/AP1A.240505.005) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Mobile Safari/537.36'
  },
  {
    label: 'Googlebot',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  }
]

const botPatterns: DetectionPattern[] = [
  { name: 'Googlebot', pattern: /Googlebot\/([\d.]+)/i },
  { name: 'Bingbot', pattern: /bingbot\/([\d.]+)/i },
  { name: 'Baidu Spider', pattern: /Baiduspider(?:\/([\d.]+))?/i },
  { name: 'Yandex Bot', pattern: /YandexBot\/([\d.]+)/i },
  { name: 'DuckDuckBot', pattern: /DuckDuckBot\/([\d.]+)/i },
  { name: 'Sogou Spider', pattern: /Sogou web spider\/([\d.]+)/i },
  { name: 'Facebook Crawler', pattern: /facebookexternalhit\/([\d.]+)/i },
  { name: 'Twitter Bot', pattern: /Twitterbot\/([\d.]+)/i },
  { name: 'Generic Bot', pattern: /(?:bot|crawler|spider|slurp|bingpreview)/i }
]

const browserPatterns: DetectionPattern[] = [
  { name: 'Microsoft Edge', pattern: /(?:Edg|Edge|EdgA|EdgiOS)\/([\d.]+)/i },
  { name: 'Opera', pattern: /(?:OPR|Opera)\/([\d.]+)/i },
  { name: 'Vivaldi', pattern: /Vivaldi\/([\d.]+)/i },
  { name: 'Samsung Internet', pattern: /SamsungBrowser\/([\d.]+)/i },
  { name: 'Huawei Browser', pattern: /HuaweiBrowser\/([\d.]+)/i },
  { name: 'Mi Browser', pattern: /MiuiBrowser\/([\d.]+)/i },
  { name: 'QQ Browser', pattern: /(?:MQQBrowser|QQBrowser)\/([\d.]+)/i },
  { name: 'UC Browser', pattern: /UCBrowser\/([\d.]+)/i },
  { name: 'WeChat WebView', pattern: /MicroMessenger\/([\d.]+)/i },
  { name: 'Alipay WebView', pattern: /AlipayClient\/([\d.]+)/i },
  { name: 'DingTalk WebView', pattern: /DingTalk\/([\d.]+)/i },
  { name: 'Electron', pattern: /Electron\/([\d.]+)/i },
  { name: 'Postman Runtime', pattern: /PostmanRuntime\/([\d.]+)/i },
  { name: 'curl', pattern: /curl\/([\d.]+)/i },
  { name: 'Wget', pattern: /Wget\/([\d.]+)/i },
  { name: 'OkHttp', pattern: /okhttp\/([\d.]+)/i },
  { name: 'Firefox iOS', pattern: /FxiOS\/([\d.]+)/i },
  { name: 'Firefox', pattern: /Firefox\/([\d.]+)/i },
  { name: 'Chrome iOS', pattern: /CriOS\/([\d.]+)/i },
  { name: 'Chrome', pattern: /(?:Chrome|Chromium)\/([\d.]+)/i },
  { name: 'Safari', pattern: /Version\/([\d.]+).*Safari\//i },
  { name: 'Internet Explorer', pattern: /(?:MSIE\s|rv:)([\d.]+).*Trident/i }
]

const result = computed(() => {
  const raw = userAgent.value.trim()

  return raw ? parseUserAgent(raw) : null
})

const normalizeVersion = (version = '') => version.replace(/_/g, '.')

const getMajorVersion = (version: string) => {
  const match = version.match(/\d+/)
  return match?.[0] ?? ''
}

const createNameVersion = (name: string, version = ''): NameVersionInfo => {
  const normalizedVersion = normalizeVersion(version)

  return {
    name,
    version: normalizedVersion,
    major: getMajorVersion(normalizedVersion)
  }
}

const detectByPatterns = (raw: string, patterns: DetectionPattern[]) => {
  for (const item of patterns) {
    const match = item.pattern.exec(raw)

    if (match) {
      return createNameVersion(item.name, match[1] ?? '')
    }
  }

  return null
}

const detectOs = (raw: string): NameVersionInfo => {
  const windowsPhone = raw.match(/Windows Phone(?: OS)? ([\d.]+)/i)
  if (windowsPhone) return createNameVersion('Windows Phone', windowsPhone[1])

  const windows = raw.match(/Windows NT ([\d.]+)/i)
  if (windows) {
    const windowsNames: Record<string, string> = {
      '10.0': 'Windows 10/11',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7',
      '6.0': 'Windows Vista',
      '5.1': 'Windows XP'
    }

    return createNameVersion(windowsNames[windows[1]] ?? 'Windows', windows[1])
  }

  const harmony = raw.match(/(?:HarmonyOS|OpenHarmony)[\s/]*([\d.]*)/i)
  if (harmony) return createNameVersion('HarmonyOS', harmony[1] ?? '')

  const ios = raw.match(/(?:CPU(?: iPhone)? OS|iPhone OS|CPU OS) ([\d_]+)/i)
  if (ios && /iPad/i.test(raw)) return createNameVersion('iPadOS', ios[1])
  if (ios) return createNameVersion('iOS', ios[1])

  const android = raw.match(/Android\s+([\d.]+)/i)
  if (android) return createNameVersion('Android', android[1])

  const chromeOs = raw.match(/CrOS [^\s]+ ([\d.]+)/i)
  if (chromeOs) return createNameVersion('Chrome OS', chromeOs[1])

  const macos = raw.match(/Mac OS X ([\d_]+)/i)
  if (macos) return createNameVersion('macOS', macos[1])

  const ubuntu = raw.match(/Ubuntu\/?([\d.]*)/i)
  if (ubuntu) return createNameVersion('Ubuntu', ubuntu[1] ?? '')

  if (/Linux/i.test(raw)) return createNameVersion('Linux')

  return createNameVersion(UNKNOWN)
}

const getAndroidModel = (raw: string) => {
  const model = raw.match(/Android [^;)\s]+;\s*([^;)]+?)(?:\s+Build\/|;|\))/i)

  return model?.[1]?.trim() ?? ''
}

const detectDevice = (raw: string, os: NameVersionInfo, bot: NameVersionInfo | null): DeviceInfo => {
  if (bot) {
    return {
      type: 'bot',
      vendor: '',
      model: bot.name
    }
  }

  if (/Smart-?TV|HbbTV|NetCast|AppleTV|GoogleTV|Android TV/i.test(raw)) {
    return {
      type: 'tv',
      vendor: /AppleTV/i.test(raw) ? 'Apple' : '',
      model: /AppleTV/i.test(raw) ? 'Apple TV' : 'Smart TV'
    }
  }

  if (/PlayStation|Xbox|Nintendo/i.test(raw)) {
    const consoleModel = raw.match(/(PlayStation [\w.]+|Xbox(?: One)?|Nintendo [\w ]+)/i)

    return {
      type: 'console',
      vendor: consoleModel?.[0].split(' ')[0] ?? '',
      model: consoleModel?.[0] ?? ''
    }
  }

  if (/Watch|Wear|Tizen/i.test(raw) && /Mobile|Android|Apple/i.test(raw)) {
    return {
      type: 'wearable',
      vendor: /Apple/i.test(raw) ? 'Apple' : '',
      model: /Watch/i.test(raw) ? 'Watch' : ''
    }
  }

  if (/iPad/i.test(raw)) return { type: 'tablet', vendor: 'Apple', model: 'iPad' }
  if (/iPhone/i.test(raw)) return { type: 'mobile', vendor: 'Apple', model: 'iPhone' }
  if (/iPod/i.test(raw)) return { type: 'mobile', vendor: 'Apple', model: 'iPod' }

  const androidModel = getAndroidModel(raw)
  const samsungModel = raw.match(/\b(SM-[A-Z0-9-]+)/i)
  const pixelModel = raw.match(/\b(Pixel [^;)]+?)(?:\s+Build\/|;|\))/i)
  const huaweiModel = raw.match(/\b((?:HUAWEI|Huawei|HONOR) [^;)]+?)(?:\s+Build\/|;|\))/i)
  const xiaomiModel = raw.match(/\b(Redmi [^;)]+?|Mi [^;)]+?)(?:\s+Build\/|;|\))/i)

  if (/Android/i.test(raw)) {
    const vendor = samsungModel
      ? 'Samsung'
      : pixelModel
        ? 'Google'
        : huaweiModel
          ? 'Huawei'
          : xiaomiModel
            ? 'Xiaomi'
            : ''

    return {
      type: /Mobile/i.test(raw) ? 'mobile' : 'tablet',
      vendor,
      model: samsungModel?.[1] ?? pixelModel?.[1] ?? huaweiModel?.[1] ?? xiaomiModel?.[1] ?? androidModel
    }
  }

  if (/Tablet|PlayBook|Kindle|Silk|Nexus 7|Nexus 10/i.test(raw)) {
    return {
      type: 'tablet',
      vendor: '',
      model: raw.match(/(Kindle|PlayBook|Nexus 7|Nexus 10)/i)?.[1] ?? ''
    }
  }

  if (/Mobi|Windows Phone/i.test(raw)) {
    return {
      type: 'mobile',
      vendor: os.name === 'Windows Phone' ? 'Microsoft' : '',
      model: ''
    }
  }

  if (/Macintosh/i.test(raw)) return { type: 'desktop', vendor: 'Apple', model: 'Mac' }
  if (/Windows/i.test(raw)) return { type: 'desktop', vendor: '', model: 'PC' }
  if (/CrOS/i.test(raw)) return { type: 'desktop', vendor: 'Google', model: 'Chromebook' }
  if (/Linux|Ubuntu/i.test(raw)) return { type: 'desktop', vendor: '', model: 'Linux PC' }

  return { type: 'unknown', vendor: '', model: '' }
}

const detectEngine = (raw: string, browser: NameVersionInfo, os: NameVersionInfo): NameVersionInfo => {
  const trident = raw.match(/Trident\/([\d.]+)/i)
  if (trident) return createNameVersion('Trident', trident[1])

  const presto = raw.match(/Presto\/([\d.]+)/i)
  if (presto) return createNameVersion('Presto', presto[1])

  const isIosClient = os.name === 'iOS' || os.name === 'iPadOS'
  const webkit = raw.match(/AppleWebKit\/([\d.]+)/i)

  if (isIosClient && webkit) return createNameVersion('WebKit', webkit[1])

  if (/(Chrome|Chromium|Edg|OPR|SamsungBrowser|Vivaldi|Electron)/i.test(raw)) {
    return createNameVersion('Blink', browser.version)
  }

  if (/Firefox|FxiOS/i.test(raw)) {
    const geckoVersion = raw.match(/rv:([\d.]+)/i)
    return createNameVersion('Gecko', geckoVersion?.[1] ?? browser.version)
  }

  if (webkit) return createNameVersion('WebKit', webkit[1])

  return createNameVersion(UNKNOWN)
}

const detectCpuArchitecture = (raw: string) => {
  if (/WOW64/i.test(raw)) return 'x86_64 (WOW64)'
  if (/x86_64|Win64|x64|amd64/i.test(raw)) return 'x86_64'
  if (/aarch64|arm64/i.test(raw)) return 'ARM64'
  if (/armv\d+|arm/i.test(raw)) return 'ARM'
  if (/i686|i386|x86/i.test(raw)) return 'x86'

  return UNKNOWN
}

const detectWebView = (raw: string, browser: NameVersionInfo) => {
  const androidWebView = /; wv\)/i.test(raw) || (
    /Android/i.test(raw) &&
    /Version\/[\d.]+/i.test(raw) &&
    /Chrome\/[\d.]+/i.test(raw) &&
    /Mobile Safari/i.test(raw)
  )
  const appWebView = /MicroMessenger|FBAV|FBAN|Instagram|Line\/|AlipayClient|DingTalk/i.test(raw)

  return androidWebView || appWebView || browser.name.includes('WebView')
}

const parseUserAgent = (raw: string): ParsedUserAgent => {
  const bot = detectByPatterns(raw, botPatterns)
  const browser = bot ?? detectByPatterns(raw, browserPatterns) ?? createNameVersion(UNKNOWN)
  const os = detectOs(raw)
  const engine = detectEngine(raw, browser, os)
  const device = detectDevice(raw, os, bot)
  const isMobile = device.type === 'mobile'
  const isTablet = device.type === 'tablet'
  const isDesktop = device.type === 'desktop'

  return {
    raw,
    browser,
    os,
    engine,
    device,
    cpu: {
      architecture: detectCpuArchitecture(raw)
    },
    flags: {
      isMobile,
      isTablet,
      isDesktop,
      isBot: device.type === 'bot',
      isWebView: detectWebView(raw, browser),
      isTouchDevice: isMobile || isTablet || device.type === 'wearable' || /Touch|Mobile|Tablet/i.test(raw)
    }
  }
}

const formatNameVersion = (info: NameVersionInfo) => (
  info.version ? `${info.name} ${info.version}` : info.name
)

const getDeviceTagType = (type: DeviceType): TagType => {
  if (type === 'desktop') return 'success'
  if (type === 'mobile' || type === 'tablet') return 'info'
  if (type === 'bot') return 'error'
  if (type === 'unknown') return 'default'

  return 'warning'
}

const loadCurrentUserAgent = () => {
  if (typeof navigator === 'undefined') return

  userAgent.value = navigator.userAgent
}

const fillSample = (sampleUserAgent: string) => {
  userAgent.value = sampleUserAgent
}

const handleClear = () => {
  userAgent.value = ''
}

const handleCopySummary = async () => {
  if (!result.value) return

  await copy([
    `浏览器: ${formatNameVersion(result.value.browser)}`,
    `系统: ${formatNameVersion(result.value.os)}`,
    `设备: ${deviceTypeLabels[result.value.device.type]}`,
    `厂商: ${result.value.device.vendor || '-'}`,
    `型号: ${result.value.device.model || '-'}`,
    `引擎: ${formatNameVersion(result.value.engine)}`,
    `CPU: ${result.value.cpu.architecture}`,
    `WebView: ${result.value.flags.isWebView ? '是' : '否'}`,
    `爬虫: ${result.value.flags.isBot ? '是' : '否'}`,
    `User-Agent: ${result.value.raw}`
  ].join('\n'))
}

onMounted(() => {
  loadCurrentUserAgent()
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 1180px;
}

.ua-input {
  width: 100%;
}

.raw-card {
  margin-top: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  min-width: 0;
  min-height: 82px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.summary-label {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.summary-value {
  display: block;
  margin-top: 6px;
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.result-descriptions :deep(.n-descriptions-table-content) {
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
