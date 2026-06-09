import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)

const DATE_TIME_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD HH:mm',
  'YYYY/MM/DD HH:mm:ss',
  'YYYY/MM/DD HH:mm',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHH:mm:ss.SSS',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHH:mm:ss.SSSZ'
]

export interface TimestampResult {
  timestamp: number
  timestampMs: number
  iso8601: string
  utc: string
  local: string
  relative: string
}

function normalizeDateInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed} 00:00:00`
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return `${trimmed} 00:00:00`
  }

  return trimmed
}

function tryParseDateTime(value: string) {
  const normalized = normalizeDateInput(value)

  for (const format of DATE_TIME_FORMATS) {
    const parsed = dayjs(normalized, format, true)
    if (parsed.isValid()) {
      return parsed
    }
  }

  const fallback = dayjs(normalized)
  return fallback.isValid() ? fallback : null
}

export function parseTimestampInput(input: string): TimestampResult {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('请输入时间戳或日期时间')
  }

  let parsed = null as dayjs.Dayjs | null

  if (/^-?\d+$/.test(trimmed)) {
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) {
      throw new Error('无效的数字输入')
    }

    const abs = Math.abs(numeric)
    const milliseconds = abs < 1e11 ? numeric * 1000 : numeric
    parsed = dayjs(milliseconds)
  } else {
    parsed = tryParseDateTime(trimmed)
  }

  if (!parsed || !parsed.isValid()) {
    throw new Error('无法解析该时间，请使用时间戳或常见日期格式')
  }

  return {
    timestamp: parsed.unix(),
    timestampMs: parsed.valueOf(),
    iso8601: parsed.toISOString(),
    utc: parsed.utc().format('YYYY-MM-DD HH:mm:ss [UTC]'),
    local: parsed.format('YYYY-MM-DD HH:mm:ss'),
    relative: parsed.fromNow()
  }
}

export function getCurrentTimestampResult(): TimestampResult {
  return parseTimestampInput(String(Date.now()))
}

export const commonDateTimeFormats = DATE_TIME_FORMATS
