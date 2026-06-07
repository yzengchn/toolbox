export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

interface JsonFormatOptions {
  indentSize: number
  sortKeys: boolean
}

type JsonObject = { [key: string]: JsonValue }

const isJsonObject = (value: JsonValue): value is JsonObject => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const normalizeIndentSize = (indentSize: number): number => {
  if (!Number.isFinite(indentSize)) return 2

  return Math.min(8, Math.max(0, Math.trunc(indentSize)))
}

export const parseJsonValue = (input: string): JsonValue => {
  return JSON.parse(input) as JsonValue
}

export const sortJsonKeys = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys)
  }

  if (isJsonObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<JsonObject>((result, key) => {
        result[key] = sortJsonKeys(value[key])
        return result
      }, {})
  }

  return value
}

export const formatJson = (input: string, options: JsonFormatOptions): string => {
  const parsed = parseJsonValue(input)
  const value = options.sortKeys ? sortJsonKeys(parsed) : parsed

  return JSON.stringify(value, null, normalizeIndentSize(options.indentSize)) ?? ''
}

export const compressJson = (input: string): string => {
  return JSON.stringify(parseJsonValue(input)) ?? ''
}

export const escapeJsonString = (input: string): string => {
  return JSON.stringify(input)
}

export const unescapeJsonString = (input: string): string => {
  const parsed = JSON.parse(input) as unknown

  if (typeof parsed !== 'string') {
    throw new Error('输入内容不是 JSON 字符串')
  }

  return parsed
}

export const compressWhitespace = (input: string): string => {
  return input.replace(/\s+/g, ' ').trim()
}

export const formatXmlLike = (input: string, indentSize: number): string => {
  const padding = ' '.repeat(normalizeIndentSize(indentSize))
  const splitTagBoundary = /(>)(<)(\/*)/g
  const lines = input.replace(splitTagBoundary, '$1\n$2$3').split('\n')
  let depth = 0

  return lines
    .map((rawLine) => {
      const line = rawLine.trim()
      if (!line) return ''

      const isInlineTag = /.+<\/\w[^>]*>$/.test(line)
      const isClosingTag = /^<\/\w/.test(line)
      const isOpeningTag = /^<\w([^>]*[^/])?>.*$/.test(line)
      let depthDelta = 0

      if (isClosingTag) {
        depth = Math.max(depth - 1, 0)
      } else if (!isInlineTag && isOpeningTag) {
        depthDelta = 1
      }

      const formattedLine = `${padding.repeat(depth)}${line}`
      depth += depthDelta

      return formattedLine
    })
    .filter(Boolean)
    .join('\n')
}

export const compressXmlLike = (input: string): string => {
  return input
    .replace(/>\s+</g, '><')
    .replace(/\n/g, '')
    .trim()
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error && error.message ? error.message : fallback
}
