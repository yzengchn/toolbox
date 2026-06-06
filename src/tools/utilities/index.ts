import type { Tool } from '@/types'
import PasswordGenerator from './PasswordGenerator.vue'
import UuidGenerator from './UuidGenerator.vue'
import QrCodeGenerator from './QrCodeGenerator.vue'
import ColorConverter from './ColorConverter.vue'

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
    name: 'QR 码生成器',
    description: '生成二维码图片',
    icon: 'mdi:qrcode',
    category: 'utilities',
    keywords: ['qrcode', 'qr', '二维码', '生成器', 'barcode'],
    component: QrCodeGenerator,
    path: '/tool/qrcode-generator'
  },
  {
    id: 'color-converter',
    name: '颜色转换器',
    description: '在不同颜色格式之间转换 (HEX, RGB, HSL)',
    icon: 'mdi:palette',
    category: 'utilities',
    keywords: ['color', 'hex', 'rgb', 'hsl', '颜色', '转换'],
    component: ColorConverter,
    path: '/tool/color-converter'
  }
]
