import type { Tool } from '@/types'
import Base64Encoder from './Base64Encoder.vue'
import JwtDecoder from './JwtDecoder.vue'
import HashCalculator from './HashCalculator.vue'

export const encodingTools: Tool[] = [
  {
    id: 'base64-encoder',
    name: 'Base64 编码/解码',
    description: '支持普通 Base64 与 URL Safe Base64 的编码、解码和校验',
    icon: 'mdi:form-textbox-password',
    category: 'encoding',
    keywords: ['base64', 'encode', 'decode', '编码', '解码', 'url safe'],
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
