import { loadCryptoJs, type CryptoJsRuntime, type CryptoWordArray } from './cryptoJsLoader'
import type { HashAlgorithm } from './utils'

type Hasher = (input: string | CryptoWordArray) => CryptoWordArray
type HmacHasher = (message: string, secret: string) => CryptoWordArray

function getHasher(cryptoJs: CryptoJsRuntime, algorithm: HashAlgorithm): Hasher {
  const hashers: Record<HashAlgorithm, Hasher> = {
    MD5: cryptoJs.MD5,
    SHA1: cryptoJs.SHA1,
    SHA256: cryptoJs.SHA256,
    SHA512: cryptoJs.SHA512
  }

  return hashers[algorithm]
}

function getHmacHasher(cryptoJs: CryptoJsRuntime, algorithm: HashAlgorithm): HmacHasher {
  const hashers: Record<HashAlgorithm, HmacHasher> = {
    MD5: cryptoJs.HmacMD5,
    SHA1: cryptoJs.HmacSHA1,
    SHA256: cryptoJs.HmacSHA256,
    SHA512: cryptoJs.HmacSHA512
  }

  return hashers[algorithm]
}

function uint8ArrayToWordArray(cryptoJs: CryptoJsRuntime, bytes: Uint8Array): CryptoWordArray {
  const words: number[] = []

  for (let index = 0; index < bytes.length; index += 1) {
    const wordIndex = index >>> 2
    const currentWord = words[wordIndex] ?? 0
    words[wordIndex] = currentWord | (bytes[index] << (24 - (index % 4) * 8))
  }

  return cryptoJs.lib.WordArray.create(words, bytes.length)
}

function arrayBufferToWordArray(cryptoJs: CryptoJsRuntime, buffer: ArrayBuffer): CryptoWordArray {
  return uint8ArrayToWordArray(cryptoJs, new Uint8Array(buffer))
}

export async function computeHash(input: string, algorithm: HashAlgorithm): Promise<string> {
  const cryptoJs = await loadCryptoJs()
  return getHasher(cryptoJs, algorithm)(input).toString(cryptoJs.enc.Hex)
}

export async function computeHmac(input: string, secret: string, algorithm: HashAlgorithm): Promise<string> {
  const cryptoJs = await loadCryptoJs()
  return getHmacHasher(cryptoJs, algorithm)(input, secret).toString(cryptoJs.enc.Hex)
}

export async function computeFileHash(file: File, algorithm: HashAlgorithm): Promise<string> {
  const [cryptoJs, buffer] = await Promise.all([
    loadCryptoJs(),
    file.arrayBuffer()
  ])

  return getHasher(cryptoJs, algorithm)(arrayBufferToWordArray(cryptoJs, buffer)).toString(cryptoJs.enc.Hex)
}
