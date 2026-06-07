export interface ImageInfo {
  name?: string
  type: string
  width: number
  height: number
  size: string
}

export type UploadedImageInfo = ImageInfo & {
  name: string
}

export type DecodedImageInfo = ImageInfo

export const detectImageMimeType = (base64Data: string): string => {
  const header = base64Data.substring(0, 10)

  if (header.startsWith('/9j/')) {
    return 'image/jpeg'
  }

  if (header.startsWith('iVBORw0KGgo')) {
    return 'image/png'
  }

  if (header.startsWith('R0lGODlh') || header.startsWith('R0lGODdh')) {
    return 'image/gif'
  }

  if (header.startsWith('UklGR')) {
    return 'image/webp'
  }

  return 'image/png'
}

export const normalizeImageDataUrl = (input: string): string => {
  const dataUrl = input.trim()

  if (dataUrl.startsWith('data:')) {
    return dataUrl
  }

  return `data:${detectImageMimeType(dataUrl)};base64,${dataUrl}`
}

export const getFileExtension = (mimeType: string): string => {
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  }

  return extensionMap[mimeType] || 'png'
}
