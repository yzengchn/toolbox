import type { Tool } from '@/types'
import { defineAsyncComponent } from 'vue'
import Base64Encoder from './Base64Encoder.vue'

const JwtDecoder = defineAsyncComponent(() => import('./JwtDecoder.vue'))
const HashCalculator = defineAsyncComponent(() => import('./HashCalculator.vue'))
const EncryptionTool = defineAsyncComponent(() => import('./EncryptionTool.vue'))

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
