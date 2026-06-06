<template>
  <div class="tool-container">
    <div class="tool-header">
      <h2>CIDR 网段计算器</h2>
      <p class="description">按行批量计算 IPv4 CIDR 网段的网络地址、广播地址、可用主机数等信息</p>
    </div>

    <div class="tool-content">
      <n-grid cols="1 l:2" responsive="screen" :x-gap="16" :y-gap="16" class="top-grid">
        <n-grid-item>
          <n-card title="输入" class="top-card input-card">
            <template #header-extra>
              <n-space :size="12">
                <n-button type="primary" @click="handleCalculate">
                  计算
                </n-button>
                <n-button @click="fillExample">
                  示例
                </n-button>
                <n-button @click="handleClear">
                  清空
                </n-button>
              </n-space>
            </template>

            <n-input
              v-model:value="inputText"
              type="textarea"
              placeholder="每行输入一个 IPv4/CIDR，例如：&#10;192.168.1.1/16&#10;192.168.1.1/32"
              :rows="5"
              class="batch-input"
            />
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card title="说明" class="top-card tips-card">
            <n-space vertical :size="8">
              <div>每行输入一个 IPv4/CIDR，例如 `192.168.1.1/24`。</div>
              <div>支持批量计算，输出结果会按输入顺序逐条展示。</div>
              <div>`/31` 与 `/32` 会按点对点或单主机场景处理，不再错误减去 2 个主机位。</div>
              <div>仅支持 IPv4，不支持 IPv6。</div>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-alert v-if="globalError" type="error" class="status-card">
        {{ globalError }}
      </n-alert>

      <n-card title="计算结果" class="results-card">
        <n-empty v-if="!results.length && !globalError" description="输入 IPv4/CIDR 后点击计算" />

        <n-space v-else vertical :size="16" class="results-list">
          <n-card
            v-for="(item, index) in results"
            :key="`${index}-${item.input}`"
            size="small"
            embedded
            :title="`结果 ${index + 1}`"
          >
            <template #header-extra>
              <span class="result-input">{{ item.input }}</span>
            </template>

            <n-alert
              v-if="item.error"
              type="error"
              :bordered="false"
            >
              {{ item.error }}
            </n-alert>

            <n-descriptions
              v-else-if="item.data"
              :column="3"
              bordered
              label-placement="left"
              class="result-descriptions"
            >
              <n-descriptions-item label="IP 地址">
                {{ item.data.ipAddress }}
              </n-descriptions-item>
              <n-descriptions-item label="CIDR">
                {{ item.data.cidrNotation }}
              </n-descriptions-item>
              <n-descriptions-item label="IP类别">
                {{ item.data.ipClass }}
              </n-descriptions-item>
              <n-descriptions-item label="主机范围">
                {{ item.data.firstHost }} - {{ item.data.lastHost }}
              </n-descriptions-item>
              <n-descriptions-item label="可用主机数">
                {{ item.data.totalHosts }}
              </n-descriptions-item>
              <n-descriptions-item label="私有 IP">
                {{ item.data.isPrivate ? '是' : '否' }}
              </n-descriptions-item>
              <n-descriptions-item label="广播地址">
                {{ item.data.broadcastAddress }}
              </n-descriptions-item>
              <n-descriptions-item label="子网掩码">
                {{ item.data.subnetMask }}
              </n-descriptions-item>
              <n-descriptions-item label="通配符掩码">
                {{ item.data.wildcardMask }}
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

interface SubnetResult {
  ipAddress: string
  networkAddress: string
  broadcastAddress: string
  subnetMask: string
  wildcardMask: string
  cidrNotation: string
  firstHost: string
  lastHost: string
  totalHosts: string
  ipClass: string
  isPrivate: boolean
}

interface ParsedLine {
  input: string
  data?: SubnetResult
  error?: string
}

const exampleText = `192.168.1.1/16
10.0.1.1/24`

const inputText = ref(exampleText)
const globalError = ref('')
const results = ref<ParsedLine[]>([])

const getCidrMask = (cidr: number): string => {
  const mask = []
  let bits = cidr

  for (let i = 0; i < 4; i += 1) {
    const current = Math.min(bits, 8)
    mask.push(current === 0 ? 0 : 256 - Math.pow(2, 8 - current))
    bits -= current
  }

  return mask.join('.')
}

const ipToInt = (ip: string): number => {
  return ip.split('.').reduce((value, octet) => (value << 8) + Number(octet), 0) >>> 0
}

const intToIp = (value: number): string => {
  return [
    (value >>> 24) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 8) & 0xFF,
    value & 0xFF
  ].join('.')
}

const isValidIp = (ip: string): boolean => {
  const parts = ip.split('.')
  if (parts.length !== 4) return false

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false
    const num = Number(part)
    return num >= 0 && num <= 255 && part === String(num)
  })
}

const isValidCidr = (value: string): boolean => /^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 32

const isPrivateIp = (ip: string): boolean => {
  const ipInt = ipToInt(ip)
  return (
    (ipInt >= ipToInt('10.0.0.0') && ipInt <= ipToInt('10.255.255.255')) ||
    (ipInt >= ipToInt('172.16.0.0') && ipInt <= ipToInt('172.31.255.255')) ||
    (ipInt >= ipToInt('192.168.0.0') && ipInt <= ipToInt('192.168.255.255'))
  )
}

const getIpClass = (ip: string): string => {
  const firstOctet = Number(ip.split('.')[0])
  if (firstOctet >= 1 && firstOctet <= 126) return 'A类'
  if (firstOctet >= 128 && firstOctet <= 191) return 'B类'
  if (firstOctet >= 192 && firstOctet <= 223) return 'C类'
  if (firstOctet >= 224 && firstOctet <= 239) return 'D类 (组播)'
  if (firstOctet >= 240 && firstOctet <= 255) return 'E类 (保留)'
  return '未知'
}

const buildHostRange = (networkInt: number, broadcastInt: number, cidr: number) => {
  if (cidr === 32) {
    const ip = intToIp(networkInt)
    return { firstHost: ip, lastHost: ip, totalHosts: '1' }
  }

  if (cidr === 31) {
    return {
      firstHost: intToIp(networkInt),
      lastHost: intToIp(broadcastInt),
      totalHosts: '2'
    }
  }

  return {
    firstHost: intToIp(networkInt + 1),
    lastHost: intToIp(broadcastInt - 1),
    totalHosts: Math.max(Math.pow(2, 32 - cidr) - 2, 0).toLocaleString()
  }
}

const calculateSubnet = (ip: string, cidr: number): SubnetResult => {
  const ipInt = ipToInt(ip)
  const maskInt = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0
  const wildcardInt = (~maskInt) >>> 0
  const networkInt = (ipInt & maskInt) >>> 0
  const broadcastInt = (networkInt | wildcardInt) >>> 0
  const hostRange = buildHostRange(networkInt, broadcastInt, cidr)

  return {
    ipAddress: ip,
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    subnetMask: getCidrMask(cidr),
    wildcardMask: intToIp(wildcardInt),
    cidrNotation: `/${cidr}`,
    firstHost: hostRange.firstHost,
    lastHost: hostRange.lastHost,
    totalHosts: hostRange.totalHosts,
    ipClass: getIpClass(ip),
    isPrivate: isPrivateIp(ip)
  }
}

const parseLine = (line: string): ParsedLine => {
  const input = line.trim()
  const parts = input.split('/')

  if (parts.length !== 2) {
    return { input, error: '格式错误，应为 IPv4/CIDR，例如 192.168.1.1/24' }
  }

  const [ip, cidrPart] = parts

  if (!ip || cidrPart === undefined) {
    return { input, error: '格式错误，应为 IPv4/CIDR，例如 192.168.1.1/24' }
  }

  if (!isValidIp(ip)) {
    return { input, error: '无效的 IPv4 地址' }
  }

  if (!isValidCidr(cidrPart)) {
    return { input, error: 'CIDR 必须是 0 到 32 之间的整数' }
  }

  return {
    input,
    data: calculateSubnet(ip, Number(cidrPart))
  }
}

const handleCalculate = () => {
  globalError.value = ''

  const lines = inputText.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    results.value = []
    globalError.value = '请输入至少一行 IPv4/CIDR'
    return
  }

  results.value = lines.map(parseLine)
}

const fillExample = () => {
  inputText.value = exampleText
  handleCalculate()
}

const handleClear = () => {
  inputText.value = ''
  results.value = []
  globalError.value = ''
}

handleCalculate()
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-header {
  margin-bottom: var(--spacing-xl);
}

.tool-header h2 {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.tool-content {
  width: 100%;
}

.top-card {
  height: 100%;
}

.batch-input {
  width: 100%;
}

.status-card,
.results-card {
  margin-top: 16px;
}

.results-list {
  width: 100%;
}

.result-input {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.result-descriptions {
  width: 100%;
}

.results-list :deep(.n-space-item),
.batch-input :deep(.n-input__textarea),
.results-card :deep(.n-card__content) {
  width: 100%;
}

@media (min-width: 769px) {
  .input-card :deep(.n-card__content) {
    display: flex;
    min-height: 120px;
  }

  .batch-input,
  .batch-input :deep(.n-input),
  .batch-input :deep(.n-input-wrapper),
  .batch-input :deep(.n-input__textarea),
  .batch-input :deep(.n-input__textarea-el) {
    height: 100%;
  }
}

@media (max-width: 768px) {
  .tool-container {
    padding: var(--spacing-md);
  }
}
</style>
