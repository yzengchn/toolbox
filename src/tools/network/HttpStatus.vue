<template>
  <div class="tool-container">
    <ToolHeader
      title="HTTP 状态码查询"
      description="查询 HTTP 状态码的含义和说明"
    />

    <div class="tool-content">
      <n-card title="查询状态码">
        <n-space vertical :size="16">
          <n-input-number
            v-model:value="statusCode"
            placeholder="输入 HTTP 状态码"
            :min="100"
            :max="599"
            :show-button="false"
            style="width: 100%"
            @keyup.enter="handleSearch"
          />

          <n-space>
            <n-button type="primary" @click="handleSearch">
              查询
            </n-button>
            <n-button @click="handleClear">
              清空
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-card v-if="result" title="状态码信息" style="margin-top: 16px">
        <n-space vertical :size="16">
          <div class="status-code-display">
            <span class="code" :class="getCodeClass(result.code)">{{ result.code }}</span>
            <span class="name">{{ result.name }}</span>
          </div>
          <n-alert :type="getAlertType(result.code)">
            {{ result.description }}
          </n-alert>
          <div v-if="result.details">
            <n-text strong>详细说明：</n-text>
            <n-text depth="2" style="display: block; margin-top: 8px;">
              {{ result.details }}
            </n-text>
          </div>
        </n-space>
      </n-card>

      <n-card title="常见状态码" style="margin-top: 16px">
        <n-space vertical :size="8">
          <div v-for="category in categories" :key="category.name">
            <n-text strong>{{ category.name }}</n-text>
            <div class="status-list">
              <div
                v-for="status in category.codes"
                :key="status.code"
                class="status-item"
                @click="handleSelectCode(status.code)"
              >
                <span class="code-badge" :class="getCodeClass(status.code)">
                  {{ status.code }}
                </span>
                <span class="code-name">{{ status.name }}</span>
              </div>
            </div>
          </div>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NInputNumber, NButton, NSpace, NAlert, NText } from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'

interface StatusCodeInfo {
  code: number
  name: string
  description: string
  details?: string
}

const statusCode = ref<number | null>(null)
const result = ref<StatusCodeInfo | null>(null)

const statusCodes: Record<number, StatusCodeInfo> = {
  // 1xx 信息响应
  100: { code: 100, name: 'Continue', description: '继续。客户端应继续其请求' },
  101: { code: 101, name: 'Switching Protocols', description: '切换协议。服务器根据客户端的请求切换协议' },

  // 2xx 成功
  200: { code: 200, name: 'OK', description: '请求成功。一般用于 GET 与 POST 请求' },
  201: { code: 201, name: 'Created', description: '已创建。成功请求并创建了新的资源' },
  202: { code: 202, name: 'Accepted', description: '已接受。已经接受请求，但未处理完成' },
  204: { code: 204, name: 'No Content', description: '无内容。服务器成功处理，但未返回内容' },
  206: { code: 206, name: 'Partial Content', description: '部分内容。服务器成功处理了部分 GET 请求' },

  // 3xx 重定向
  300: { code: 300, name: 'Multiple Choices', description: '多种选择。请求的资源可包括多个位置' },
  301: { code: 301, name: 'Moved Permanently', description: '永久移动。请求的资源已被永久的移动到新 URI' },
  302: { code: 302, name: 'Found', description: '临时移动。资源临时从不同的 URI 响应请求' },
  304: { code: 304, name: 'Not Modified', description: '未修改。所请求的资源未修改，可以使用缓存' },
  307: { code: 307, name: 'Temporary Redirect', description: '临时重定向。与 302 类似，使用 GET 请求重定向' },
  308: { code: 308, name: 'Permanent Redirect', description: '永久重定向。类似 301，但不允许更改请求方法' },

  // 4xx 客户端错误
  400: { code: 400, name: 'Bad Request', description: '客户端请求的语法错误，服务器无法理解' },
  401: { code: 401, name: 'Unauthorized', description: '请求要求用户的身份认证' },
  403: { code: 403, name: 'Forbidden', description: '服务器理解请求，但是拒绝执行它' },
  404: { code: 404, name: 'Not Found', description: '服务器无法根据客户端的请求找到资源' },
  405: { code: 405, name: 'Method Not Allowed', description: '客户端请求中的方法被禁止' },
  408: { code: 408, name: 'Request Timeout', description: '服务器等待客户端发送的请求时间过长，超时' },
  409: { code: 409, name: 'Conflict', description: '服务器在完成请求时发生冲突' },
  410: { code: 410, name: 'Gone', description: '请求的资源已被永久删除' },
  413: { code: 413, name: 'Payload Too Large', description: '请求的实体过大，服务器无法处理' },
  414: { code: 414, name: 'URI Too Long', description: '请求的 URI 过长，服务器无法处理' },
  415: { code: 415, name: 'Unsupported Media Type', description: '请求的格式不受请求页面的支持' },
  429: { code: 429, name: 'Too Many Requests', description: '用户在给定的时间内发送了太多的请求' },

  // 5xx 服务器错误
  500: { code: 500, name: 'Internal Server Error', description: '服务器内部错误，无法完成请求' },
  501: { code: 501, name: 'Not Implemented', description: '服务器不支持请求的功能，无法完成请求' },
  502: { code: 502, name: 'Bad Gateway', description: '作为网关或代理服务器尝试执行请求时，从上游服务器接收到无效的响应' },
  503: { code: 503, name: 'Service Unavailable', description: '由于超载或系统维护，服务器暂时的无法处理客户端的请求' },
  504: { code: 504, name: 'Gateway Timeout', description: '充当网关或代理的服务器，未及时从上游服务器收到请求' },
  505: { code: 505, name: 'HTTP Version Not Supported', description: '服务器不支持请求的 HTTP 协议的版本' }
}

const categories = [
  {
    name: '2xx 成功',
    codes: [
      { code: 200, name: 'OK' },
      { code: 201, name: 'Created' },
      { code: 204, name: 'No Content' }
    ]
  },
  {
    name: '3xx 重定向',
    codes: [
      { code: 301, name: 'Moved Permanently' },
      { code: 302, name: 'Found' },
      { code: 304, name: 'Not Modified' }
    ]
  },
  {
    name: '4xx 客户端错误',
    codes: [
      { code: 400, name: 'Bad Request' },
      { code: 401, name: 'Unauthorized' },
      { code: 403, name: 'Forbidden' },
      { code: 404, name: 'Not Found' },
      { code: 429, name: 'Too Many Requests' }
    ]
  },
  {
    name: '5xx 服务器错误',
    codes: [
      { code: 500, name: 'Internal Server Error' },
      { code: 502, name: 'Bad Gateway' },
      { code: 503, name: 'Service Unavailable' },
      { code: 504, name: 'Gateway Timeout' }
    ]
  }
]

const handleSearch = () => {
  if (statusCode.value === null) {
    result.value = null
    return
  }

  result.value = statusCodes[statusCode.value] || {
    code: statusCode.value,
    name: 'Unknown',
    description: '未知的状态码'
  }
}

const handleSelectCode = (code: number) => {
  statusCode.value = code
  handleSearch()
}

const handleClear = () => {
  statusCode.value = null
  result.value = null
}

const getCodeClass = (code: number): string => {
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'redirect'
  if (code >= 400 && code < 500) return 'client-error'
  if (code >= 500) return 'server-error'
  return 'info'
}

const getAlertType = (code: number): 'success' | 'info' | 'warning' | 'error' => {
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'info'
  if (code >= 400 && code < 500) return 'warning'
  if (code >= 500) return 'error'
  return 'info'
}
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
}

.tool-content {
  max-width: 100%;
}

.status-code-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.status-code-display .code {
  font-size: 32px;
  font-weight: bold;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
}

.status-code-display .code.success {
  background: #18a058;
  color: white;
}

.status-code-display .code.redirect {
  background: #2080f0;
  color: white;
}

.status-code-display .code.client-error {
  background: #f0a020;
  color: white;
}

.status-code-display .code.server-error {
  background: #d03050;
  color: white;
}

.status-code-display .code.info {
  background: #909399;
  color: white;
}

.status-code-display .name {
  font-size: var(--font-size-xl);
  font-weight: 500;
}

.status-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-item:hover {
  background: var(--color-bg-quaternary);
  transform: translateY(-2px);
}

.code-badge {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  color: white;
}

.code-badge.success {
  background: #18a058;
}

.code-badge.redirect {
  background: #2080f0;
}

.code-badge.client-error {
  background: #f0a020;
}

.code-badge.server-error {
  background: #d03050;
}

.code-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
