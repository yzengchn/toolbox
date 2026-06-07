import type { Tool } from '@/types'
import { defineAsyncComponent } from 'vue'

const loadEncodingTools = () => import('./components')

const Base64Encoder = defineAsyncComponent(() => loadEncodingTools().then(module => module.Base64Encoder))
const Base64ImageTool = defineAsyncComponent(() => loadEncodingTools().then(module => module.Base64ImageTool))
const ColorConverter = defineAsyncComponent(() => loadEncodingTools().then(module => module.ColorConverter))
const JwtDecoder = defineAsyncComponent(() => loadEncodingTools().then(module => module.JwtDecoder))
const HashCalculator = defineAsyncComponent(() => loadEncodingTools().then(module => module.HashCalculator))
const EncryptionTool = defineAsyncComponent(() => loadEncodingTools().then(module => module.EncryptionTool))

export const encodingTools: Tool[] = [
  {
    id: 'base64-encoder',
    name: 'Base64 编码/解码',
    description: '支持 Hex、Base64、Base64URL、Base58、Base58Check、Bech32 的编码、解码和校验',
    icon: 'mdi:form-textbox-password',
    category: 'encoding',
    keywords: ['hex', 'base16', 'base64', 'base64url', 'base58', 'base58check', 'bech32', 'encode', 'decode', '编码', '解码', 'url safe'],
    component: Base64Encoder,
    path: '/tool/base64-encoder'
  },
  {
    id: 'base64-image',
    name: 'Base64 图片',
    description: '图片与 Base64 字符串互转，支持拖拽上传',
    icon: 'mdi:image-outline',
    category: 'encoding',
    keywords: ['base64', 'image', '图片', '编码', '解码', 'dataurl'],
    component: Base64ImageTool,
    path: '/tool/base64-image'
  },
  {
    id: 'color-converter',
    name: '颜色转换器',
    description: '在不同颜色格式之间转换 (HEX, RGB, HSL)',
    icon: 'mdi:palette',
    category: 'encoding',
    keywords: ['color', 'hex', 'rgb', 'hsl', '颜色', '转换'],
    component: ColorConverter,
    path: '/tool/color-converter'
  },
  {
    id: 'jwt-decoder',
    name: 'JWT 解码',
    description: '解析 JWT 的 Header、Payload、Signature 与过期状态',
    icon: 'mdi:key-chain-variant',
    category: 'encoding',
    keywords: ['jwt', 'token', 'decode', '解析', '鉴权', 'payload'],
    component: JwtDecoder,
    path: '/tool/jwt-decoder'
  },
  {
    id: 'encryption-tool',
    name: 'RSA、AES加解密',
    description: 'RSA、AES、DES、MD5/SHA、HMAC 常用加密解密和摘要计算',
    icon: 'mdi:shield-key-outline',
    category: 'encoding',
    keywords: ['rsa', 'aes', 'des', '3des', 'tripledes', 'md5', 'sha1', 'sha256', 'sha512', 'hmac', 'encrypt', 'decrypt', '加密', '解密', '摘要'],
    component: EncryptionTool,
    path: '/tool/encryption-tool'
  },
  {
    id: 'hash-calculator',
    name: '哈希计算',
    description: '计算文本或文件的 MD5、SHA1、SHA256、SHA512',
    icon: 'mdi:hash',
    category: 'encoding',
    keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha512', '哈希', '摘要'],
    component: HashCalculator,
    path: '/tool/hash-calculator'
  }
]
