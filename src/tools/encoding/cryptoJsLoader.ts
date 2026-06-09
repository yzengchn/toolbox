export type CryptoWordArray = {
  words?: number[]
  sigBytes?: number
  toString: (encoder?: unknown) => string
}

export type CryptoCipherParams = {
  toString: () => string
}

export type CryptoCipher = {
  encrypt: (message: string, secret: string) => CryptoCipherParams
  decrypt: (ciphertext: string, secret: string) => CryptoWordArray
}

export type CryptoJsRuntime = {
  MD5: (input: string | CryptoWordArray) => CryptoWordArray
  SHA1: (input: string | CryptoWordArray) => CryptoWordArray
  SHA256: (input: string | CryptoWordArray) => CryptoWordArray
  SHA512: (input: string | CryptoWordArray) => CryptoWordArray
  HmacMD5: (message: string, secret: string) => CryptoWordArray
  HmacSHA1: (message: string, secret: string) => CryptoWordArray
  HmacSHA256: (message: string, secret: string) => CryptoWordArray
  HmacSHA512: (message: string, secret: string) => CryptoWordArray
  AES: CryptoCipher
  DES: CryptoCipher
  TripleDES: CryptoCipher
  enc: {
    Hex: unknown
    Utf8: unknown
  }
  lib: {
    WordArray: {
      create: (words: number[], sigBytes: number) => CryptoWordArray
    }
  }
}

type CryptoJsDynamicModule = CryptoJsRuntime & {
  default?: CryptoJsRuntime
}

let cryptoJsPromise: Promise<CryptoJsRuntime> | null = null

export function loadCryptoJs(): Promise<CryptoJsRuntime> {
  cryptoJsPromise ??= import('crypto-js')
    .then((module) => {
      const cryptoModule = module as unknown as CryptoJsDynamicModule
      return cryptoModule.default ?? cryptoModule
    })
    .catch((error) => {
      cryptoJsPromise = null
      throw error
    })

  return cryptoJsPromise
}
