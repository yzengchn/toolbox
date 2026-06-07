import CryptoJS from 'crypto-js'

export type HashAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512'
export type TextEncodingType = 'hex' | 'base64' | 'base64url' | 'base58' | 'base58check' | 'bech32'

export const HASH_ALGORITHM_OPTIONS: Array<{ label: HashAlgorithm, value: HashAlgorithm }> = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA1', value: 'SHA1' },
  { label: 'SHA256', value: 'SHA256' },
  { label: 'SHA512', value: 'SHA512' }
]

export interface TextEncodingOptions {
  base58CheckVersionHex?: string
  bech32Hrp?: string
}

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

const HMAC_HASHERS: Record<HashAlgorithm, (message: string, secret: string) => CryptoJS.lib.WordArray> = {
  MD5: CryptoJS.HmacMD5,
  SHA1: CryptoJS.HmacSHA1,
  SHA256: CryptoJS.HmacSHA256,
  SHA512: CryptoJS.HmacSHA512
}

const textEncoder = new TextEncoder()
const strictTextDecoder = new TextDecoder('utf-8', { fatal: true })
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE58_ALPHABET_MAP = new Map([...BASE58_ALPHABET].map((char, index) => [char, index]))
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const BECH32_CHARSET_MAP = new Map([...BECH32_CHARSET].map((char, index) => [char, index]))

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

function encodeUtf8(text: string): Uint8Array {
  return textEncoder.encode(text)
}

function decodeUtf8(bytes: Uint8Array, errorMessage: string): string {
  try {
    return strictTextDecoder.decode(bytes)
  } catch {
    throw new Error(errorMessage)
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeHexInput(input: string, emptyMessage = '请输入 Hex 内容'): string {
  const normalized = input.trim().replace(/0x/gi, '').replace(/[\s,;:_-]/g, '')

  if (!normalized) {
    throw new Error(emptyMessage)
  }

  if (normalized.length % 2 !== 0 || !/^[\da-fA-F]+$/.test(normalized)) {
    throw new Error('无效的 Hex 输入')
  }

  return normalized.toLowerCase()
}

function hexToBytes(input: string, emptyMessage?: string): Uint8Array {
  const normalized = normalizeHexInput(input, emptyMessage)
  const bytes = new Uint8Array(normalized.length / 2)

  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16)
  }

  return bytes
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

function normalizeBase64Input(input: string, emptyMessage = '请输入 Base64 内容'): string {
  const normalized = input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')

  if (!normalized) {
    throw new Error(emptyMessage)
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

function normalizeBase64UrlInput(input: string): string {
  const normalized = input.trim().replace(/\s+/g, '')

  if (!normalized) {
    throw new Error('请输入 Base64URL 内容')
  }

  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(normalized)) {
    throw new Error('无效的 Base64URL 输入')
  }

  return normalized
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

function uint8ArrayToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []

  for (let index = 0; index < bytes.length; index += 1) {
    const wordIndex = index >>> 2
    const currentWord = words[wordIndex] ?? 0
    words[wordIndex] = currentWord | (bytes[index] << (24 - (index % 4) * 8))
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

function arrayBufferToWordArray(buffer: ArrayBuffer): CryptoJS.lib.WordArray {
  return uint8ArrayToWordArray(new Uint8Array(buffer))
}

function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wordArray
  const bytes = new Uint8Array(sigBytes)

  for (let index = 0; index < sigBytes; index += 1) {
    bytes[index] = (words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff
  }

  return bytes
}

function sha256Bytes(bytes: Uint8Array): Uint8Array {
  return wordArrayToUint8Array(CryptoJS.SHA256(uint8ArrayToWordArray(bytes)))
}

function doubleSha256Checksum(bytes: Uint8Array): Uint8Array {
  return sha256Bytes(sha256Bytes(bytes)).slice(0, 4)
}

function base58EncodeBytes(bytes: Uint8Array): string {
  if (!bytes.length) return ''

  let leadingZeros = 0
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros += 1
  }

  if (leadingZeros === bytes.length) {
    return '1'.repeat(leadingZeros)
  }

  const digits = [0]

  for (let index = leadingZeros; index < bytes.length; index += 1) {
    let carry = bytes[index]

    for (let digitIndex = 0; digitIndex < digits.length; digitIndex += 1) {
      carry += digits[digitIndex] << 8
      digits[digitIndex] = carry % 58
      carry = Math.floor(carry / 58)
    }

    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }

  return '1'.repeat(leadingZeros) + digits.reverse().map(digit => BASE58_ALPHABET[digit]).join('')
}

function base58DecodeToBytes(input: string): Uint8Array {
  const normalized = input.trim().replace(/\s+/g, '')

  if (!normalized) {
    throw new Error('请输入 Base58 内容')
  }

  let leadingZeros = 0
  while (leadingZeros < normalized.length && normalized[leadingZeros] === '1') {
    leadingZeros += 1
  }

  if (leadingZeros === normalized.length) {
    return new Uint8Array(leadingZeros)
  }

  const bytes = [0]

  for (let index = leadingZeros; index < normalized.length; index += 1) {
    const char = normalized[index]
    const value = BASE58_ALPHABET_MAP.get(char)

    if (value === undefined) {
      throw new Error(`无效的 Base58 字符：${char}`)
    }

    let carry = value

    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
      carry += bytes[byteIndex] * 58
      bytes[byteIndex] = carry & 0xff
      carry >>= 8
    }

    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  const result = new Uint8Array(leadingZeros + bytes.length)

  for (let index = 0; index < bytes.length; index += 1) {
    result[result.length - 1 - index] = bytes[index]
  }

  return result
}

function normalizeBech32Hrp(input = 'tool'): string {
  const hrp = input.trim().toLowerCase()

  if (!hrp) {
    throw new Error('请输入 Bech32 HRP')
  }

  for (const char of hrp) {
    const code = char.charCodeAt(0)
    if (code < 33 || code > 126) {
      throw new Error('Bech32 HRP 只能包含可打印 ASCII 字符')
    }
  }

  return hrp
}

function bech32HrpExpand(hrp: string): number[] {
  const highBits = [...hrp].map(char => char.charCodeAt(0) >> 5)
  const lowBits = [...hrp].map(char => char.charCodeAt(0) & 31)
  return [...highBits, 0, ...lowBits]
}

function bech32Polymod(values: number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let checksum = 1

  for (const value of values) {
    const top = checksum >> 25
    checksum = ((checksum & 0x1ffffff) << 5) ^ value

    for (let index = 0; index < generators.length; index += 1) {
      if ((top >> index) & 1) {
        checksum ^= generators[index]
      }
    }
  }

  return checksum
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]
  const polymod = bech32Polymod(values) ^ 1
  const checksum: number[] = []

  for (let index = 0; index < 6; index += 1) {
    checksum.push((polymod >> (5 * (5 - index))) & 31)
  }

  return checksum
}

function bech32VerifyChecksum(hrp: string, data: number[]): boolean {
  return bech32Polymod([...bech32HrpExpand(hrp), ...data]) === 1
}

function convertBits(data: ArrayLike<number>, fromBits: number, toBits: number, pad: boolean): number[] {
  let accumulator = 0
  let bitCount = 0
  const result: number[] = []
  const maxValue = (1 << toBits) - 1
  const maxAccumulator = (1 << (fromBits + toBits - 1)) - 1

  for (let index = 0; index < data.length; index += 1) {
    const value = data[index]

    if (value < 0 || value >> fromBits !== 0) {
      throw new Error('无效的 Bech32 数据')
    }

    accumulator = ((accumulator << fromBits) | value) & maxAccumulator
    bitCount += fromBits

    while (bitCount >= toBits) {
      bitCount -= toBits
      result.push((accumulator >> bitCount) & maxValue)
    }
  }

  if (pad) {
    if (bitCount > 0) {
      result.push((accumulator << (toBits - bitCount)) & maxValue)
    }
  } else if (bitCount >= fromBits || ((accumulator << (toBits - bitCount)) & maxValue) !== 0) {
    throw new Error('无效的 Bech32 数据')
  }

  return result
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function bytesToBase64(value: Uint8Array | ArrayBuffer): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  return btoa(uint8ArrayToBinary(bytes))
}

export function base64ToBytes(
  value: string,
  emptyMessage = '请输入 Base64 内容',
  invalidMessage = '无效的 Base64 输入'
): Uint8Array {
  try {
    return binaryToUint8Array(atob(normalizeBase64Input(value, emptyMessage)))
  } catch (error) {
    if (error instanceof Error && error.message === emptyMessage) {
      throw error
    }

    throw new Error(invalidMessage)
  }
}

export function formatHexDigest(digest: string, uppercase = false): string {
  return uppercase ? digest.toUpperCase() : digest.toLowerCase()
}

export function encodeBase64(text: string, urlSafe = false): string {
  const encoded = bytesToBase64(encodeUtf8(text))

  if (!urlSafe) {
    return encoded
  }

  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeBase64(input: string): string {
  return decodeUtf8(
    base64ToBytes(input, '请输入 Base64 内容', '无效的 Base64 输入或解码结果不是 UTF-8 文本'),
    '无效的 Base64 输入或解码结果不是 UTF-8 文本'
  )
}

export function encodeBase64Url(text: string): string {
  return encodeBase64(text, true)
}

export function decodeBase64Url(input: string): string {
  normalizeBase64UrlInput(input)
  return decodeBase64(input)
}

export function isValidBase64(input: string): boolean {
  try {
    decodeBase64(input)
    return true
  } catch {
    return false
  }
}

export function encodeHex(text: string): string {
  return bytesToHex(encodeUtf8(text))
}

export function decodeHex(input: string): string {
  return decodeUtf8(hexToBytes(input), 'Hex 解码结果不是 UTF-8 文本')
}

export function encodeBase58(text: string): string {
  return base58EncodeBytes(encodeUtf8(text))
}

export function decodeBase58(input: string): string {
  return decodeUtf8(base58DecodeToBytes(input), 'Base58 解码结果不是 UTF-8 文本')
}

export function encodeBase58Check(text: string, versionHex = '00'): string {
  const version = hexToBytes(versionHex, '请输入 Base58Check 版本字节')

  if (version.length !== 1) {
    throw new Error('Base58Check 版本字节必须是 1 字节 Hex')
  }

  const body = concatBytes(version, encodeUtf8(text))
  return base58EncodeBytes(concatBytes(body, doubleSha256Checksum(body)))
}

export function decodeBase58Check(input: string): string {
  const bytes = base58DecodeToBytes(input)

  if (bytes.length < 5) {
    throw new Error('无效的 Base58Check 输入')
  }

  const body = bytes.slice(0, -4)
  const checksum = bytes.slice(-4)
  const expectedChecksum = doubleSha256Checksum(body)
  const checksumMatched = checksum.every((byte, index) => byte === expectedChecksum[index])

  if (!checksumMatched) {
    throw new Error('Base58Check 校验和不匹配')
  }

  return decodeUtf8(body.slice(1), 'Base58Check 负载不是 UTF-8 文本')
}

export function encodeBech32(text: string, hrp = 'tool'): string {
  const normalizedHrp = normalizeBech32Hrp(hrp)
  const data = convertBits(encodeUtf8(text), 8, 5, true)
  const checksum = bech32CreateChecksum(normalizedHrp, data)
  return `${normalizedHrp}1${[...data, ...checksum].map(value => BECH32_CHARSET[value]).join('')}`
}

export function decodeBech32(input: string): string {
  const value = input.trim()

  if (!value) {
    throw new Error('请输入 Bech32 内容')
  }

  const hasLower = /[a-z]/.test(value)
  const hasUpper = /[A-Z]/.test(value)

  if (hasLower && hasUpper) {
    throw new Error('Bech32 不能混用大小写')
  }

  const normalized = value.toLowerCase()
  const separatorIndex = normalized.lastIndexOf('1')

  if (separatorIndex < 1 || separatorIndex + 7 > normalized.length) {
    throw new Error('无效的 Bech32 输入')
  }

  const hrp = normalized.slice(0, separatorIndex)
  const dataText = normalized.slice(separatorIndex + 1)
  const data: number[] = []

  for (const char of dataText) {
    const mapped = BECH32_CHARSET_MAP.get(char)

    if (mapped === undefined) {
      throw new Error(`无效的 Bech32 字符：${char}`)
    }

    data.push(mapped)
  }

  if (!bech32VerifyChecksum(hrp, data)) {
    throw new Error('Bech32 校验和不匹配')
  }

  return decodeUtf8(new Uint8Array(convertBits(data.slice(0, -6), 5, 8, false)), 'Bech32 数据不是 UTF-8 文本')
}

export function encodeTextByEncoding(
  text: string,
  type: TextEncodingType,
  options: TextEncodingOptions = {}
): string {
  switch (type) {
    case 'hex':
      return encodeHex(text)
    case 'base64':
      return encodeBase64(text)
    case 'base64url':
      return encodeBase64Url(text)
    case 'base58':
      return encodeBase58(text)
    case 'base58check':
      return encodeBase58Check(text, options.base58CheckVersionHex)
    case 'bech32':
      return encodeBech32(text, options.bech32Hrp)
  }
}

export function decodeTextByEncoding(
  input: string,
  type: TextEncodingType
): string {
  switch (type) {
    case 'hex':
      return decodeHex(input)
    case 'base64':
      return decodeBase64(input)
    case 'base64url':
      return decodeBase64Url(input)
    case 'base58':
      return decodeBase58(input)
    case 'base58check':
      return decodeBase58Check(input)
    case 'bech32':
      return decodeBech32(input)
  }
}

export function isValidEncodedText(input: string, type: TextEncodingType): boolean {
  try {
    decodeTextByEncoding(input, type)
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

export function computeHmac(input: string, secret: string, algorithm: HashAlgorithm): string {
  return HMAC_HASHERS[algorithm](input, secret).toString(CryptoJS.enc.Hex)
}

export async function computeFileHash(file: File, algorithm: HashAlgorithm): Promise<string> {
  const buffer = await file.arrayBuffer()
  return HASHERS[algorithm](arrayBufferToWordArray(buffer)).toString(CryptoJS.enc.Hex)
}
