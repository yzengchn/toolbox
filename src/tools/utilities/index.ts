import type { Tool } from '@/types'
import PasswordGenerator from './PasswordGenerator.vue'
import QrCodeGenerator from './QrCodeGenerator.vue'
import UuidGenerator from './UuidGenerator.vue'

export const utilitiesTools: Tool[] = [
  {
    id: 'password-generator',
    name: '密码生成器',
    description: '生成安全的随机密码',
    icon: 'mdi:key',
    category: 'utilities',
    keywords: ['password', 'generator', '密码', '生成器', '随机', '安全'],
    component: PasswordGenerator,
    path: '/tool/password-generator'
  },
  {
    id: 'uuid-generator',
    name: 'UUID 生成器',
    description: '生成 UUID (通用唯一识别码)',
    icon: 'mdi:identifier',
    category: 'utilities',
    keywords: ['uuid', 'guid', '生成器', '唯一', 'id'],
    component: UuidGenerator,
    path: '/tool/uuid-generator'
  },
  {
    id: 'qrcode-generator',
    name: '二维码生成器',
    description: '生成二维码图片',
    icon: 'mdi:qrcode',
    category: 'utilities',
    keywords: ['qrcode', 'qr', '二维码', '生成器', 'barcode'],
    component: QrCodeGenerator,
    path: '/tool/qrcode-generator'
  }
]
