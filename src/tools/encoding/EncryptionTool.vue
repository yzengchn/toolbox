<template>
  <div class="tool-container encryption-tool">
    <ToolHeader
      title="RSA、AES加解密"
      description="RSA、AES、DES、MD5/SHA 与 HMAC 常用加密和摘要工具"
    />

    <div class="tool-content">
      <PageTabs v-model:value="activeTab" class="encryption-tabs">
          <n-tab-pane name="rsa" tab="RSA 加/解密">
            <div class="tool-pane rsa-pane">
              <section class="panel rsa-key-panel">
                <div class="panel-head">
                  <h3>RSA 设置</h3>
                  <span>RSA-OAEP / SHA-256</span>
                </div>

                <div class="settings-row">
                  <n-form-item label="操作" :show-feedback="false">
                    <n-radio-group v-model:value="rsaMode" name="rsa-mode">
                      <n-radio-button value="encrypt">加密</n-radio-button>
                      <n-radio-button value="decrypt">解密</n-radio-button>
                    </n-radio-group>
                  </n-form-item>

                  <n-form-item label="密钥长度" :show-feedback="false">
                    <n-select
                      v-model:value="rsaKeySize"
                      :options="rsaKeySizeOptions"
                      class="compact-select"
                    />
                  </n-form-item>

                  <div class="button-cluster">
                    <n-button :loading="rsaBusy" @click="generateRsaKeys">
                      生成密钥对
                    </n-button>
                    <n-button @click="clearRsa">
                      清空
                    </n-button>
                  </div>
                </div>

                <div class="key-grid">
                  <n-form-item label="公钥 PEM" :show-feedback="false">
                    <n-input
                      v-model:value="rsaPublicKey"
                      type="textarea"
                      placeholder="用于加密，支持 BEGIN PUBLIC KEY"
                      :rows="7"
                      clearable
                    />
                  </n-form-item>

                  <n-form-item label="私钥 PEM" :show-feedback="false">
                    <n-input
                      v-model:value="rsaPrivateKey"
                      type="textarea"
                      placeholder="用于解密，支持 BEGIN PRIVATE KEY"
                      :rows="7"
                      clearable
                    />
                  </n-form-item>
                </div>
              </section>

              <div class="editor-grid">
                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>{{ rsaInputTitle }}</h3>
                  </div>
                  <n-input
                    v-model:value="rsaInput"
                    type="textarea"
                    :placeholder="rsaInputPlaceholder"
                    :rows="11"
                    clearable
                  />
                </section>

                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>{{ rsaOutputTitle }}</h3>
                    <n-button text :disabled="!rsaOutput" @click="copy(rsaOutput)">
                      复制
                    </n-button>
                  </div>
                  <n-input
                    v-model:value="rsaOutput"
                    type="textarea"
                    placeholder="结果将显示在这里"
                    :rows="11"
                    readonly
                  />
                </section>
              </div>

              <div class="action-row">
                <n-button type="primary" :loading="rsaBusy" @click="handleRsaRun">
                  {{ rsaActionLabel }}
                </n-button>
                <n-button :disabled="!rsaOutput" @click="swapRsa">
                  交换到输入
                </n-button>
              </div>

              <n-alert v-if="rsaError" type="error" class="status-panel">
                {{ rsaError }}
              </n-alert>
              <n-alert v-else-if="rsaNotice" type="success" :bordered="false" class="status-panel">
                {{ rsaNotice }}
              </n-alert>
            </div>
          </n-tab-pane>

          <n-tab-pane name="symmetric" tab="AES/DES 加解密">
            <div class="tool-pane symmetric-pane">
              <section class="panel">
                <div class="panel-head">
                  <h3>对称加密</h3>
                  <span>Passphrase 模式</span>
                </div>

                <div class="settings-row">
                  <n-form-item label="操作" :show-feedback="false">
                    <n-radio-group v-model:value="symmetricMode" name="symmetric-mode">
                      <n-radio-button value="encrypt">加密</n-radio-button>
                      <n-radio-button value="decrypt">解密</n-radio-button>
                    </n-radio-group>
                  </n-form-item>

                  <n-form-item label="算法" :show-feedback="false">
                    <n-select
                      v-model:value="symmetricAlgorithm"
                      :options="symmetricAlgorithmOptions"
                      class="compact-select"
                    />
                  </n-form-item>

                  <n-form-item label="密钥/口令" :show-feedback="false" class="secret-field">
                    <n-input
                      v-model:value="symmetricSecret"
                      type="password"
                      show-password-on="click"
                      placeholder="输入密钥或口令"
                      clearable
                    />
                  </n-form-item>

                  <div class="button-cluster">
                    <n-button @click="clearSymmetric">
                      清空
                    </n-button>
                  </div>
                </div>
              </section>

              <div class="editor-grid">
                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>{{ symmetricInputTitle }}</h3>
                  </div>
                  <n-input
                    v-model:value="symmetricInput"
                    type="textarea"
                    :placeholder="symmetricInputPlaceholder"
                    :rows="12"
                    clearable
                  />
                </section>

                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>{{ symmetricOutputTitle }}</h3>
                    <n-button text :disabled="!symmetricOutput" @click="copy(symmetricOutput)">
                      复制
                    </n-button>
                  </div>
                  <n-input
                    v-model:value="symmetricOutput"
                    type="textarea"
                    placeholder="结果将显示在这里"
                    :rows="12"
                    readonly
                  />
                </section>
              </div>

              <div class="action-row">
                <n-button type="primary" @click="handleSymmetricRun">
                  {{ symmetricActionLabel }}
                </n-button>
                <n-button :disabled="!symmetricOutput" @click="swapSymmetric">
                  交换到输入
                </n-button>
              </div>

              <n-alert v-if="symmetricError" type="error" class="status-panel">
                {{ symmetricError }}
              </n-alert>
              <n-alert v-else-if="symmetricNotice" type="success" :bordered="false" class="status-panel">
                {{ symmetricNotice }}
              </n-alert>
            </div>
          </n-tab-pane>

          <n-tab-pane name="hash" tab="MD5/SHA 摘要">
            <div class="tool-pane hash-pane">
              <section class="panel">
                <div class="panel-head">
                  <h3>摘要设置</h3>
                  <span>单向摘要</span>
                </div>

                <div class="settings-row">
                  <n-form-item label="算法" :show-feedback="false">
                    <n-select
                      v-model:value="hashAlgorithm"
                      :options="hashAlgorithmOptions"
                      class="compact-select"
                    />
                  </n-form-item>

                  <n-checkbox v-model:checked="hashUppercase">
                    大写输出
                  </n-checkbox>

                  <div class="button-cluster">
                    <n-button @click="clearHash">
                      清空
                    </n-button>
                  </div>
                </div>
              </section>

              <div class="editor-grid">
                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>原文</h3>
                  </div>
                  <n-input
                    v-model:value="hashInput"
                    type="textarea"
                    placeholder="输入要计算摘要的文本"
                    :rows="12"
                    clearable
                  />
                </section>

                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>{{ hashAlgorithm }} 结果</h3>
                    <n-button text :disabled="!hashOutput" @click="copy(hashOutput)">
                      复制
                    </n-button>
                  </div>
                  <n-input
                    :value="hashOutput"
                    type="textarea"
                    placeholder="输入内容后自动计算"
                    :rows="12"
                    readonly
                  />
                </section>
              </div>

              <n-alert type="warning" :bordered="false" class="status-panel">
                MD5/SHA 是不可逆摘要，不能解密；校验时需要重新计算摘要后比对。
              </n-alert>
            </div>
          </n-tab-pane>

          <n-tab-pane name="hmac" tab="HMAC">
            <div class="tool-pane hmac-pane">
              <section class="panel">
                <div class="panel-head">
                  <h3>HMAC 设置</h3>
                  <span>带密钥摘要</span>
                </div>

                <div class="settings-row">
                  <n-form-item label="算法" :show-feedback="false">
                    <n-select
                      v-model:value="hmacAlgorithm"
                      :options="hashAlgorithmOptions"
                      class="compact-select"
                    />
                  </n-form-item>

                  <n-form-item label="密钥" :show-feedback="false" class="secret-field">
                    <n-input
                      v-model:value="hmacSecret"
                      type="password"
                      show-password-on="click"
                      placeholder="输入 HMAC 密钥"
                      clearable
                    />
                  </n-form-item>

                  <n-checkbox v-model:checked="hmacUppercase">
                    大写输出
                  </n-checkbox>

                  <div class="button-cluster">
                    <n-button @click="clearHmac">
                      清空
                    </n-button>
                  </div>
                </div>
              </section>

              <div class="editor-grid">
                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>消息</h3>
                  </div>
                  <n-input
                    v-model:value="hmacInput"
                    type="textarea"
                    placeholder="输入要签名的消息"
                    :rows="12"
                    clearable
                  />
                </section>

                <section class="panel editor-panel">
                  <div class="panel-head">
                    <h3>HMAC 结果</h3>
                    <n-button text :disabled="!hmacOutput" @click="copy(hmacOutput)">
                      复制
                    </n-button>
                  </div>
                  <n-input
                    :value="hmacOutput"
                    type="textarea"
                    placeholder="输入消息和密钥后自动计算"
                    :rows="12"
                    readonly
                  />
                </section>
              </div>
            </div>
          </n-tab-pane>
      </PageTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CryptoJS from 'crypto-js'
import {
  NAlert,
  NButton,
  NCheckbox,
  NFormItem,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NTabPane
} from 'naive-ui'
import ToolHeader from '@/components/ToolHeader.vue'
import PageTabs from '@/components/PageTabs.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  base64ToBytes,
  bytesToBase64,
  computeHash,
  computeHmac,
  formatHexDigest,
  getErrorMessage,
  HASH_ALGORITHM_OPTIONS,
  type HashAlgorithm
} from './utils'

type CryptoTab = 'rsa' | 'symmetric' | 'hash' | 'hmac'
type CryptoMode = 'encrypt' | 'decrypt'
type SymmetricAlgorithm = 'AES' | 'DES' | 'TripleDES'

type SymmetricCipher = {
  encrypt: (message: string, secret: string) => CryptoJS.lib.CipherParams
  decrypt: (ciphertext: string, secret: string) => CryptoJS.lib.WordArray
}

const { copy } = useClipboard()

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const activeTab = ref<CryptoTab>('rsa')

const rsaMode = ref<CryptoMode>('encrypt')
const rsaKeySize = ref(2048)
const rsaPublicKey = ref('')
const rsaPrivateKey = ref('')
const rsaInput = ref('')
const rsaOutput = ref('')
const rsaError = ref('')
const rsaNotice = ref('')
const rsaBusy = ref(false)

const symmetricMode = ref<CryptoMode>('encrypt')
const symmetricAlgorithm = ref<SymmetricAlgorithm>('AES')
const symmetricSecret = ref('')
const symmetricInput = ref('')
const symmetricOutput = ref('')
const symmetricError = ref('')
const symmetricNotice = ref('')

const hashAlgorithm = ref<HashAlgorithm>('MD5')
const hashUppercase = ref(false)
const hashInput = ref('')

const hmacAlgorithm = ref<HashAlgorithm>('SHA256')
const hmacUppercase = ref(false)
const hmacSecret = ref('')
const hmacInput = ref('')

const rsaKeySizeOptions = [
  { label: '2048 bit', value: 2048 },
  { label: '3072 bit', value: 3072 },
  { label: '4096 bit', value: 4096 }
]

const symmetricAlgorithmOptions: Array<{ label: string, value: SymmetricAlgorithm }> = [
  { label: 'AES', value: 'AES' },
  { label: 'DES', value: 'DES' },
  { label: '3DES', value: 'TripleDES' }
]

const hashAlgorithmOptions = HASH_ALGORITHM_OPTIONS

const symmetricCiphers: Record<SymmetricAlgorithm, SymmetricCipher> = {
  AES: CryptoJS.AES,
  DES: CryptoJS.DES,
  TripleDES: CryptoJS.TripleDES
}

const rsaInputTitle = computed(() => (rsaMode.value === 'encrypt' ? '明文' : '密文 Base64'))
const rsaOutputTitle = computed(() => (rsaMode.value === 'encrypt' ? '密文 Base64' : '解密结果'))
const rsaActionLabel = computed(() => (rsaMode.value === 'encrypt' ? 'RSA 加密' : 'RSA 解密'))
const rsaInputPlaceholder = computed(() => (
  rsaMode.value === 'encrypt'
    ? '输入要使用公钥加密的短文本'
    : '输入 RSA-OAEP 加密后的 Base64 密文'
))

const symmetricInputTitle = computed(() => (symmetricMode.value === 'encrypt' ? '明文' : '密文'))
const symmetricOutputTitle = computed(() => (symmetricMode.value === 'encrypt' ? '密文' : '解密结果'))
const symmetricActionLabel = computed(() => (
  symmetricMode.value === 'encrypt'
    ? `${symmetricAlgorithmLabel.value} 加密`
    : `${symmetricAlgorithmLabel.value} 解密`
))
const symmetricInputPlaceholder = computed(() => (
  symmetricMode.value === 'encrypt'
    ? '输入要加密的文本'
    : '输入由本工具生成的密文'
))
const symmetricAlgorithmLabel = computed(() => (
  symmetricAlgorithmOptions.find(item => item.value === symmetricAlgorithm.value)?.label ?? symmetricAlgorithm.value
))

const hashOutput = computed(() => {
  if (!hashInput.value) {
    return ''
  }

  return formatHexDigest(computeHash(hashInput.value, hashAlgorithm.value), hashUppercase.value)
})

const hmacOutput = computed(() => {
  if (!hmacInput.value || !hmacSecret.value) {
    return ''
  }

  return formatHexDigest(computeHmac(hmacInput.value, hmacSecret.value, hmacAlgorithm.value), hmacUppercase.value)
})

const getSubtleCrypto = () => {
  const subtle = window.crypto?.subtle

  if (!subtle) {
    throw new Error('当前浏览器不支持 WebCrypto RSA')
  }

  return subtle
}

const pemToBytes = (pem: string, label: 'PUBLIC KEY' | 'PRIVATE KEY') => {
  const trimmed = pem.trim()
  const keyName = label === 'PUBLIC KEY' ? '公钥' : '私钥'

  if (!trimmed) {
    throw new Error(`请输入 ${keyName} PEM`)
  }

  if (label === 'PRIVATE KEY' && /BEGIN RSA PRIVATE KEY/.test(trimmed)) {
    throw new Error('WebCrypto 需要 PKCS#8 私钥，请使用 BEGIN PRIVATE KEY 格式')
  }

  if (/BEGIN/.test(trimmed) && !trimmed.includes(`BEGIN ${label}`)) {
    throw new Error(`${keyName} PEM 格式不匹配`)
  }

  const base64 = trimmed
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')

  return base64ToBytes(base64, `请输入 ${keyName} PEM`, `${keyName} PEM 不是有效的 Base64 内容`)
}

const formatPem = (label: 'PUBLIC KEY' | 'PRIVATE KEY', buffer: ArrayBuffer) => {
  const base64 = bytesToBase64(buffer)
  const lines = base64.match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`
}

const importRsaPublicKey = async () => {
  return getSubtleCrypto().importKey(
    'spki',
    pemToBytes(rsaPublicKey.value, 'PUBLIC KEY'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
}

const importRsaPrivateKey = async () => {
  return getSubtleCrypto().importKey(
    'pkcs8',
    pemToBytes(rsaPrivateKey.value, 'PRIVATE KEY'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  )
}

const generateRsaKeys = async () => {
  rsaBusy.value = true
  rsaError.value = ''
  rsaNotice.value = ''

  try {
    const keyPair = await getSubtleCrypto().generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: rsaKeySize.value,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    )

    rsaPublicKey.value = formatPem('PUBLIC KEY', await getSubtleCrypto().exportKey('spki', keyPair.publicKey))
    rsaPrivateKey.value = formatPem('PRIVATE KEY', await getSubtleCrypto().exportKey('pkcs8', keyPair.privateKey))
    rsaNotice.value = `已生成 ${rsaKeySize.value} bit RSA 密钥对`
  } catch (error) {
    rsaError.value = getErrorMessage(error, 'RSA 密钥生成失败')
  } finally {
    rsaBusy.value = false
  }
}

const handleRsaRun = async () => {
  rsaBusy.value = true
  rsaError.value = ''
  rsaNotice.value = ''

  try {
    if (!rsaInput.value.trim()) {
      throw new Error(rsaMode.value === 'encrypt' ? '请输入明文' : '请输入密文')
    }

    if (rsaMode.value === 'encrypt') {
      const publicKey = await importRsaPublicKey()
      const encrypted = await getSubtleCrypto().encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        textEncoder.encode(rsaInput.value)
      )
      rsaOutput.value = bytesToBase64(encrypted)
      rsaNotice.value = 'RSA 加密完成'
      return
    }

    const privateKey = await importRsaPrivateKey()
    const decrypted = await getSubtleCrypto().decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      base64ToBytes(rsaInput.value, '请输入密文', '密文不是有效的 Base64 内容')
    )
    rsaOutput.value = textDecoder.decode(decrypted)
    rsaNotice.value = 'RSA 解密完成'
  } catch (error) {
    rsaOutput.value = ''
    rsaError.value = getErrorMessage(error, 'RSA 处理失败，请检查密钥和输入')
  } finally {
    rsaBusy.value = false
  }
}

const swapRsa = () => {
  if (!rsaOutput.value) return

  rsaInput.value = rsaOutput.value
  rsaOutput.value = ''
  rsaError.value = ''
  rsaNotice.value = ''
  rsaMode.value = rsaMode.value === 'encrypt' ? 'decrypt' : 'encrypt'
}

const clearRsa = () => {
  rsaPublicKey.value = ''
  rsaPrivateKey.value = ''
  rsaInput.value = ''
  rsaOutput.value = ''
  rsaError.value = ''
  rsaNotice.value = ''
}

const handleSymmetricRun = () => {
  symmetricError.value = ''
  symmetricNotice.value = ''

  try {
    if (!symmetricInput.value.trim()) {
      throw new Error(symmetricMode.value === 'encrypt' ? '请输入明文' : '请输入密文')
    }

    if (!symmetricSecret.value) {
      throw new Error('请输入密钥或口令')
    }

    const cipher = symmetricCiphers[symmetricAlgorithm.value]

    if (symmetricMode.value === 'encrypt') {
      symmetricOutput.value = cipher.encrypt(symmetricInput.value, symmetricSecret.value).toString()
      symmetricNotice.value = `${symmetricAlgorithmLabel.value} 加密完成`
      return
    }

    const decrypted = cipher.decrypt(symmetricInput.value.trim(), symmetricSecret.value).toString(CryptoJS.enc.Utf8)

    if (!decrypted) {
      throw new Error('解密失败，请检查算法、密钥和密文')
    }

    symmetricOutput.value = decrypted
    symmetricNotice.value = `${symmetricAlgorithmLabel.value} 解密完成`
  } catch (error) {
    symmetricOutput.value = ''
    symmetricError.value = getErrorMessage(error, '加解密失败')
  }
}

const swapSymmetric = () => {
  if (!symmetricOutput.value) return

  symmetricInput.value = symmetricOutput.value
  symmetricOutput.value = ''
  symmetricError.value = ''
  symmetricNotice.value = ''
  symmetricMode.value = symmetricMode.value === 'encrypt' ? 'decrypt' : 'encrypt'
}

const clearSymmetric = () => {
  symmetricSecret.value = ''
  symmetricInput.value = ''
  symmetricOutput.value = ''
  symmetricError.value = ''
  symmetricNotice.value = ''
}

const clearHash = () => {
  hashInput.value = ''
}

const clearHmac = () => {
  hmacSecret.value = ''
  hmacInput.value = ''
}

watch(rsaMode, () => {
  rsaOutput.value = ''
  rsaError.value = ''
  rsaNotice.value = ''
})

watch([symmetricMode, symmetricAlgorithm, symmetricSecret], () => {
  symmetricOutput.value = ''
  symmetricError.value = ''
  symmetricNotice.value = ''
})
</script>

<style scoped>
.encryption-tool.tool-container {
  height: 100%;
  min-height: 0;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tool-content {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.encryption-tabs {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.encryption-tabs :deep(.n-tabs-nav) {
  flex: 0 0 auto;
}

.encryption-tabs :deep(.n-tabs-pane-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.encryption-tabs :deep(.n-tab-pane) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.tool-pane {
  height: 100%;
  min-height: 0;
  display: grid;
  gap: var(--spacing-sm);
  overflow: hidden;
}

.rsa-pane {
  grid-template-rows: minmax(160px, 0.95fr) minmax(150px, 1fr) auto auto;
}

.symmetric-pane,
.hash-pane,
.hmac-pane {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.panel {
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  overflow: hidden;
}

.rsa-key-panel {
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  min-height: 24px;
  margin-bottom: var(--spacing-xs);
}

.panel-head h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-weight: 750;
  line-height: 1.35;
}

.panel-head span {
  flex: 0 0 auto;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 650;
}

.settings-row {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.settings-row :deep(.n-form-item) {
  margin-bottom: 0;
}

.compact-select {
  width: 150px;
}

.secret-field {
  flex: 1 1 260px;
  min-width: 220px;
}

.button-cluster,
.action-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.key-grid,
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 0;
  gap: var(--spacing-sm);
}

.key-grid {
  margin-top: var(--spacing-xs);
  flex: 1 1 auto;
  height: auto;
}

.key-grid :deep(.n-form-item) {
  margin-bottom: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.key-grid :deep(.n-form-item-blank) {
  flex: 1 1 auto;
  min-height: 0;
}

.key-grid :deep(.n-input) {
  height: 100%;
  min-height: 0;
}

.editor-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
}

.editor-panel :deep(.n-input) {
  flex: 1 1 auto;
  min-height: 0;
}

.key-grid :deep(.n-input-wrapper),
.key-grid :deep(.n-input__textarea),
.editor-panel :deep(.n-input-wrapper),
.editor-panel :deep(.n-input__textarea) {
  height: 100%;
  min-height: 0;
}

.editor-panel :deep(.n-input__textarea-el) {
  min-height: 0 !important;
  height: 100% !important;
  font-family: var(--font-mono);
  line-height: 1.45;
  resize: none;
}

.key-grid :deep(.n-input__textarea-el) {
  min-height: 0 !important;
  height: 100% !important;
  font-family: var(--font-mono);
  line-height: 1.45;
  resize: none;
}

.action-row {
  min-height: 32px;
}

.status-panel {
  min-height: 0;
}

.status-panel {
  margin-top: 0;
}

@media (max-width: 900px) {
  .key-grid,
  .editor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .encryption-tool.tool-container {
    padding: var(--spacing-md);
  }

  .tool-pane {
    gap: var(--spacing-xs);
  }

  .panel {
    padding: var(--spacing-sm);
  }

  .settings-row {
    align-items: stretch;
    flex-direction: column;
  }

  .compact-select,
  .secret-field {
    width: 100%;
    min-width: 0;
  }

  .panel-head {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
}

@media (max-height: 760px) {
  .encryption-tool.tool-container {
    padding: var(--spacing-xs) var(--spacing-md) var(--spacing-sm);
  }

  .encryption-tool :deep(.tool-header) {
    margin-bottom: var(--spacing-xs);
    padding: 6px var(--spacing-md);
  }

  .encryption-tool :deep(.description) {
    display: none;
  }

  .tool-pane {
    gap: var(--spacing-xs);
  }

  .rsa-pane {
    grid-template-rows: minmax(120px, 0.9fr) minmax(120px, 1fr) auto auto;
  }

  .panel {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .panel-head {
    min-height: 22px;
  }

  .panel-head h3 {
    font-size: var(--font-size-sm);
  }

  .action-row {
    min-height: 30px;
  }
}
</style>
