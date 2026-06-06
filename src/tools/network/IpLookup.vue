<template>
  <div class="tool-container">
    <ToolHeader
      title="IP 地址查询"
      description="查询 IP 地址的地理位置和网络信息"
    />

    <div class="tool-content">
      <n-card title="查询 IP 地址">
        <n-space vertical :size="16">
          <n-input
            v-model:value="ipInput"
            placeholder="输入 IP 地址 (留空查询本机 IP)"
            clearable
            @keyup.enter="handleLookup"
          >
            <template #suffix>
              <n-button text @click="handleLookup">
                查询
              </n-button>
            </template>
          </n-input>

          <n-space>
            <n-button type="primary" @click="handleLookup" :loading="loading">
              查询
            </n-button>
            <n-button @click="handleGetMyIp" :loading="myIpLoading">
              获取我的 IP
            </n-button>
            <n-button @click="handleClear">
              清空
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-card v-if="result" title="查询结果" style="margin-top: 16px">
        <n-descriptions :column="2" bordered>
          <n-descriptions-item label="IP 地址">
            {{ result.ip }}
          </n-descriptions-item>
          <n-descriptions-item label="类型">
            {{ result.type }}
          </n-descriptions-item>
          <n-descriptions-item label="国家">
            {{ result.country }}
          </n-descriptions-item>
          <n-descriptions-item label="地区">
            {{ result.region }}
          </n-descriptions-item>
          <n-descriptions-item label="城市">
            {{ result.city }}
          </n-descriptions-item>
          <n-descriptions-item label="ISP">
            {{ result.isp }}
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <n-alert v-if="error" type="error" style="margin-top: 16px">
        {{ error }}
      </n-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NInput, NButton, NSpace, NDescriptions, NDescriptionsItem, NAlert } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'

const ipInput = ref('')
const loading = ref(false)
const myIpLoading = ref(false)
const error = ref('')
const result = ref<{
  ip: string
  type: string
  country: string
  region: string
  city: string
  isp: string
} | null>(null)

const handleLookup = async () => {
  error.value = ''
  result.value = null

  const ip = ipInput.value.trim()

  // 验证 IP 格式
  if (ip && !isValidIp(ip)) {
    error.value = '无效的 IP 地址格式'
    return
  }

  loading.value = true
  try {
    // 使用免费的 IP API
    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/'
    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      error.value = data.reason || '查询失败'
      return
    }

    result.value = {
      ip: data.ip,
      type: data.version === 'IPv4' ? 'IPv4' : 'IPv6',
      country: data.country_name || '-',
      region: data.region || '-',
      city: data.city || '-',
      isp: data.org || '-'
    }
  } catch (err) {
    error.value = '查询失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

const handleGetMyIp = async () => {
  myIpLoading.value = true
  error.value = ''
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    ipInput.value = data.ip
    await handleLookup()
  } catch (err) {
    error.value = '获取 IP 失败'
  } finally {
    myIpLoading.value = false
  }
}

const handleClear = () => {
  ipInput.value = ''
  result.value = null
  error.value = ''
}

const isValidIp = (ip: string): boolean => {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Regex.test(ip)) {
    return ip.split('.').every(part => {
      const num = parseInt(part)
      return num >= 0 && num <= 255
    })
  }

  // IPv6 (简化验证)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/
  return ipv6Regex.test(ip)
}

// 页面加载时自动获取 IP
onMounted(() => {
  handleGetMyIp()
})
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 100%;
}
</style>
