import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import { CronExpressionParser } from 'cron-parser'

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

export interface CronParseResult {
  normalized: string
  description: string
  nextRuns: string[]
}

const CRON_FIELD_LABELS = ['秒', '分', '时', '日', '月', '周']

const DAY_OF_WEEK_LABELS: Record<string, string> = {
  '0': '周日',
  '1': '周一',
  '2': '周二',
  '3': '周三',
  '4': '周四',
  '5': '周五',
  '6': '周六',
  '7': '周日',
  mon: '周一',
  tue: '周二',
  wed: '周三',
  thu: '周四',
  fri: '周五',
  sat: '周六',
  sun: '周日'
}

const MONTH_LABELS: Record<string, string> = {
  '1': '1月',
  '2': '2月',
  '3': '3月',
  '4': '4月',
  '5': '5月',
  '6': '6月',
  '7': '7月',
  '8': '8月',
  '9': '9月',
  '10': '10月',
  '11': '11月',
  '12': '12月',
  jan: '1月',
  feb: '2月',
  mar: '3月',
  apr: '4月',
  may: '5月',
  jun: '6月',
  jul: '7月',
  aug: '8月',
  sep: '9月',
  oct: '10月',
  nov: '11月',
  dec: '12月'
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

function describeCronValue(field: string, unit: string): string {
  if (field === '*') {
    return `每${unit}`
  }

  if (field.includes('/')) {
    const [base, step] = field.split('/')
    if (base === '*') {
      return `每隔 ${step}${unit}`
    }
    return `${base} 起每隔 ${step}${unit}`
  }

  if (field.includes(',')) {
    return field
      .split(',')
      .map(part => part.trim())
      .join('、')
  }

  if (field.includes('-')) {
    const [start, end] = field.split('-')
    return `${start} 到 ${end}`
  }

  return field
}

function humanizeMonth(field: string): string {
  const key = field.toLowerCase()
  return MONTH_LABELS[key] ?? field
}

function humanizeWeek(field: string): string {
  const key = field.toLowerCase()
  return DAY_OF_WEEK_LABELS[key] ?? field
}

function buildCronDescription(parts: string[]): string {
  const labels = parts.map((field, index) => {
    const unit = CRON_FIELD_LABELS[index]

    if (index === 4) {
      return `${unit}: ${field
        .split(',')
        .map(value => humanizeMonth(value.trim()))
        .join('、')}`
    }

    if (index === 5) {
      return `${unit}: ${field
        .split(',')
        .map(value => {
          if (value.includes('-')) {
            const [start, end] = value.split('-')
            return `${humanizeWeek(start.trim())} 到 ${humanizeWeek(end.trim())}`
          }
          return humanizeWeek(value.trim())
        })
        .join('、')}`
    }

    return `${unit}: ${describeCronValue(field, unit)}`
  })

  return labels.join(' | ')
}

function normalizeCronParts(expression: string): string[] {
  const fields = expression.trim().split(/\s+/)
  if (fields.length === 5) {
    return ['0', ...fields]
  }

  if (fields.length === 6) {
    return fields
  }

  throw new Error('Cron 表达式必须是 5 位或 6 位')
}

export function parseCronExpression(input: string, count = 5): CronParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('请输入 Cron 表达式')
  }

  const cron = CronExpressionParser.parse(trimmed)
  const normalized = cron.stringify(true)
  const parts = normalizeCronParts(normalized)

  return {
    normalized,
    description: buildCronDescription(parts),
    nextRuns: cron
      .take(count)
      .map(date => dayjs(date.toDate()).format('YYYY-MM-DD HH:mm:ss dddd'))
  }
}

export const commonDateTimeFormats = DATE_TIME_FORMATS
