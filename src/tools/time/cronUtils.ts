import { CronExpressionParser } from 'cron-parser'

export interface CronParseResult {
  normalized: string
  description: string
  nextRuns: string[]
}

const CRON_FIELD_LABELS = ['秒', '分', '时', '日', '月', '周']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function formatCronDate(date: Date): string {
  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())
  const hours = padDatePart(date.getHours())
  const minutes = padDatePart(date.getMinutes())
  const seconds = padDatePart(date.getSeconds())
  const weekday = WEEKDAY_NAMES[date.getDay()]

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${weekday}`
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
      .map(date => formatCronDate(date.toDate()))
  }
}
