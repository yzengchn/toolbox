export function todayAt(hours: number, minutes = 0, seconds = 0, milliseconds = 0): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds, milliseconds)
}

export function formatDate(value = new Date()): string {
  return [
    value.getFullYear(),
    pad2(value.getMonth() + 1),
    pad2(value.getDate())
  ].join('-')
}

export function formatCompactDate(value = new Date()): string {
  return [
    value.getFullYear(),
    pad2(value.getMonth() + 1),
    pad2(value.getDate())
  ].join('')
}

export function formatDateTime(value: Date): string {
  return `${formatDate(value)} ${formatTime(value)}`
}

export function formatDateTimeMs(value: Date): string {
  return `${formatDateTime(value)}.${String(value.getMilliseconds()).padStart(3, '0')}`
}

export function formatIsoUtc(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function formatLocalIsoWithOffset(value: Date): string {
  const offsetMinutes = -value.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offsetMinutes)
  return `${formatDate(value)}T${formatTime(value)}.${String(value.getMilliseconds()).padStart(3, '0')}${sign}${pad2(Math.floor(absoluteOffset / 60))}:${pad2(absoluteOffset % 60)}`
}

export function formatNmeaDate(value = new Date()): string {
  return [
    pad2(value.getDate()),
    pad2(value.getMonth() + 1),
    String(value.getFullYear()).slice(-2)
  ].join('')
}

export function unixSeconds(value: Date): number {
  return Math.floor(value.getTime() / 1000)
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatTime(value: Date): string {
  return [
    pad2(value.getHours()),
    pad2(value.getMinutes()),
    pad2(value.getSeconds())
  ].join(':')
}
