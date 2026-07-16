/** 二维码生成 / 解析（纯前端） */

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H'
export type QrToolMode = 'generate' | 'decode'

export interface QrGenerateOptions {
  width: number
  errorCorrectionLevel: QrErrorLevel
  dark: string
  light: string
}

export interface QrDecodeResult {
  text: string
  version: number
}

export interface QrModeTab {
  id: QrToolMode
  title: string
  subtitle: string
  iconPath: string
}

export const DEFAULT_QR_CONTENT = 'https://tools.neocockpit.cn'

export const DEFAULT_QR_OPTIONS: QrGenerateOptions = {
  width: 320,
  errorCorrectionLevel: 'M',
  dark: '#000000',
  light: '#FFFFFF'
}

export const QR_MODE_TABS: QrModeTab[] = [
  {
    id: 'generate',
    title: '生成二维码',
    subtitle: '文本 / 链接 → 图片',
    iconPath:
      'M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm12.5-2l1.09 2.41L19 15.5l-2.41 1.09L14.5 19l-1.09-2.41L11 15.5l2.41-1.09L14.5 12l1.09 2.41L18 15.5zM19 17v2h-2v2h2v2h2v-2h2v-2h-2v-2h-2z'
  },
  {
    id: 'decode',
    title: '解析二维码',
    subtitle: '图片 → 文本内容',
    iconPath:
      'M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13 0h-3v2h3v3h2v-3h3v-2h-3v-3h-2v3zM9 19v2H7v-2h2zm4 0v2h-2v-2h2z'
  }
]

export const QR_ERROR_LEVELS: Array<{ value: QrErrorLevel; label: string; tip: string }> = [
  { value: 'L', label: '低 (7%)', tip: '最疏，适合干净印刷/屏幕' },
  { value: 'M', label: '中 (15%)', tip: '默认，兼顾密度与容错' },
  { value: 'Q', label: '高 (25%)', tip: '轻微污损仍可扫' },
  { value: 'H', label: '最高 (30%)', tip: '可遮挡 logo，码更密' }
]

export const QR_CONTENT_PRESETS: Array<{ id: string; label: string; content: string }> = [
  { id: 'url', label: '网址', content: DEFAULT_QR_CONTENT },
  { id: 'text', label: '纯文本', content: 'Hello ToolBox' },
  { id: 'wifi', label: 'Wi‑Fi', content: 'WIFI:T:WPA;S:MySSID;P:MyPassword;H:false;;' },
  {
    id: 'mailto',
    label: '邮箱',
    content: 'mailto:support@example.com?subject=Hello&body=From%20QR'
  },
  { id: 'tel', label: '电话', content: 'tel:+8613800138000' },
  {
    id: 'vcard',
    label: '名片',
    content: [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:张;三',
      'FN:张三',
      'ORG:ToolBox',
      'TEL;TYPE=CELL:13800138000',
      'EMAIL:zhangsan@example.com',
      'END:VCARD'
    ].join('\n')
  }
]

export const QR_TIPS = [
  { title: '容错等级', body: '等级越高，损坏后越容易识别，但图案更密、更难扫。' },
  { title: '内容长度', body: '越长码越密；长链接建议先短链再生成。' },
  { title: '解析提示', body: '请上传清晰、正对、对比度够的二维码图；模糊/反光可能失败。' },
  { title: '隐私', body: '生成与解析均在浏览器本地完成，图片不会上传服务器。' }
]

const ERROR_LEVELS = new Set<QrErrorLevel>(['L', 'M', 'Q', 'H'])
const MAX_DECODE_SIDE = 1600

let qrCodeModulePromise: Promise<typeof import('qrcode')> | null = null
let jsQrModulePromise: Promise<typeof import('jsqr')> | null = null

function loadQrCodeLib() {
  qrCodeModulePromise ??= import('qrcode')
  return qrCodeModulePromise
}

function loadJsQrLib() {
  jsQrModulePromise ??= import('jsqr')
  return jsQrModulePromise
}

export function normalizeQrOptions(input?: Partial<QrGenerateOptions> | null): QrGenerateOptions {
  const width = Number(input?.width)
  const level = input?.errorCorrectionLevel
  return {
    width: Number.isFinite(width)
      ? Math.min(1024, Math.max(128, Math.round(width / 32) * 32))
      : DEFAULT_QR_OPTIONS.width,
    errorCorrectionLevel: ERROR_LEVELS.has(level as QrErrorLevel)
      ? (level as QrErrorLevel)
      : DEFAULT_QR_OPTIONS.errorCorrectionLevel,
    dark: typeof input?.dark === 'string' && input.dark ? input.dark : DEFAULT_QR_OPTIONS.dark,
    light: typeof input?.light === 'string' && input.light ? input.light : DEFAULT_QR_OPTIONS.light
  }
}

export async function generateQrDataUrl(
  content: string,
  options: QrGenerateOptions
): Promise<string> {
  const text = content.trim()
  if (!text) return ''

  const QRCode = await loadQrCodeLib()
  const normalized = normalizeQrOptions(options)
  return QRCode.toDataURL(text, {
    width: normalized.width,
    margin: 2,
    errorCorrectionLevel: normalized.errorCorrectionLevel,
    color: {
      dark: normalized.dark,
      light: normalized.light
    }
  })
}

function loadImageFromSource(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function getImageData(img: HTMLImageElement): ImageData {
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  if (!width || !height) throw new Error('无法读取图片尺寸')

  const scale = Math.min(1, MAX_DECODE_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 不可用')

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export async function decodeQrFromImageSource(src: string): Promise<QrDecodeResult> {
  const [jsQRMod, img] = await Promise.all([loadJsQrLib(), loadImageFromSource(src)])
  const imageData = getImageData(img)
  const code = jsQRMod.default(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  })

  if (!code) {
    throw new Error('未识别到二维码，请换更清晰、完整的图片重试')
  }

  return {
    text: code.data,
    version: code.version
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

export async function readClipboardImageAsDataUrl(): Promise<string | null> {
  if (!navigator.clipboard?.read) return null

  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'))
      if (!type) continue
      const blob = await item.getType(type)
      return readFileAsDataUrl(new File([blob], 'clipboard.png', { type: blob.type || 'image/png' }))
    }
  } catch {
    return null
  }

  return null
}

export function getClipboardImageFile(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items
  if (!items) return null

  for (const item of items) {
    if (!item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) return file
  }
  return null
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

export async function copyImageDataUrl(dataUrl: string) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })])
}

export function guessContentKind(text: string): string {
  const value = text.trim()
  if (!value) return '空'
  if (/^https?:\/\//i.test(value)) return '网址'
  if (/^WIFI:/i.test(value)) return 'Wi‑Fi'
  if (/^BEGIN:VCARD/i.test(value)) return '名片 vCard'
  if (/^mailto:/i.test(value)) return '邮箱'
  if (/^tel:/i.test(value)) return '电话'
  if (/^smsto:/i.test(value) || /^sms:/i.test(value)) return '短信'
  if (/^geo:/i.test(value)) return '地理位置'
  if (value.includes('\n') || value.length > 80) return '多行/长文本'
  return '文本'
}

export function isHttpUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim())
}

export function errorMessage(err: unknown, fallback = '操作失败') {
  return err instanceof Error && err.message ? err.message : fallback
}
