import CryptoJS from 'crypto-js'

export type HashAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512'

export interface JwtDecodeResult {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  isExpired: boolean
  expiresAt?: string
  issuedAt?: string
  notBefore?: string
}

const HASHERS: Record<HashAlgorithm, (input: CryptoJS.lib.WordArray | string) => CryptoJS.lib.WordArray> = {
  MD5: CryptoJS.MD5,
  SHA1: CryptoJS.SHA1,
  SHA256: CryptoJS.SHA256,
  SHA512: CryptoJS.SHA512
}

function uint8ArrayToBinary(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return binary
}

function binaryToUint8Array(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function normalizeBase64Input(input: string): string {
  const normalized = input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')

  if (!normalized) {
    throw new Error('请输入 Base64 内容')
  }

  if (normalized.length % 4 === 1) {
    throw new Error('无效的 Base64 输入')
  }

  const padding = (4 - (normalized.length % 4 || 4)) % 4
  const padded = normalized + '='.repeat(padding)

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) {
    throw new Error('无效的 Base64 输入')
  }

  return padded
}

function formatUnixTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString('sv-SE', { hour12: false }).replace(',', '')
}

function parseJwtSection(input: string, sectionName: string): Record<string, unknown> {
  try {
    const decoded = decodeBase64(input)
    const parsed = JSON.parse(decoded)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${sectionName} 不是有效的 JSON 对象`)
    }

    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof Error && error.message.includes(sectionName)) {
      throw error
    }

    throw new Error(`${sectionName} 解析失败`)
  }
}

function arrayBufferToWordArray(buffer: ArrayBuffer): CryptoJS.lib.WordArray {
  const bytes = new Uint8Array(buffer)
  const words: number[] = []

  for (let index = 0; index < bytes.length; index += 1) {
    const wordIndex = index >>> 2
    const currentWord = words[wordIndex] ?? 0
    words[wordIndex] = currentWord | (bytes[index] << (24 - (index % 4) * 8))
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

export function encodeBase64(text: string, urlSafe = false): string {
  const encoded = btoa(uint8ArrayToBinary(new TextEncoder().encode(text)))

  if (!urlSafe) {
    return encoded
  }

  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeBase64(input: string): string {
  try {
    const binary = atob(normalizeBase64Input(input))
    return new TextDecoder().decode(binaryToUint8Array(binary))
  } catch (error) {
    if (error instanceof Error && error.message === '请输入 Base64 内容') {
      throw error
    }

    throw new Error('无效的 Base64 输入或解码结果不是 UTF-8 文本')
  }
}

export function isValidBase64(input: string): boolean {
  try {
    decodeBase64(input)
    return true
  } catch {
    return false
  }
}

export function decodeJWT(token: string): JwtDecodeResult {
  const trimmed = token.trim()

  if (!trimmed) {
    throw new Error('请输入 JWT Token')
  }

  const parts = trimmed.split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    throw new Error('JWT 必须是 header.payload.signature 三段格式')
  }

  const header = parseJwtSection(parts[0], 'Header')
  const payload = parseJwtSection(parts[1], 'Payload')
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined
  const iat = typeof payload.iat === 'number' ? payload.iat : undefined
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : undefined

  return {
    header,
    payload,
    signature: parts[2],
    isExpired: typeof exp === 'number' ? Date.now() >= exp * 1000 : false,
    expiresAt: typeof exp === 'number' ? formatUnixTimestamp(exp) : undefined,
    issuedAt: typeof iat === 'number' ? formatUnixTimestamp(iat) : undefined,
    notBefore: typeof nbf === 'number' ? formatUnixTimestamp(nbf) : undefined
  }
}

export function computeHash(input: string, algorithm: HashAlgorithm): string {
  return HASHERS[algorithm](input).toString(CryptoJS.enc.Hex)
}

export async function computeFileHash(file: File, algorithm: HashAlgorithm): Promise<string> {
  const buffer = await file.arrayBuffer()
  return HASHERS[algorithm](arrayBufferToWordArray(buffer)).toString(CryptoJS.enc.Hex)
}
