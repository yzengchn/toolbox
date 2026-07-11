// 文件工具共享辅助：文本读取、行数统计、行解析、下载、文件大小上限。

/** 文件大小上限：100MB（ID 去重场景远够，仅防误传超大文件卡死页面）。 */
export const MAX_FILE_BYTES = 100 * 1024 * 1024

export interface ParseLineOptions {
  /** 去除每行首尾空白。 */
  trim: boolean
  /** 忽略空行 (按 trim 之前的原始字符串判定是否为空)。 */
  ignoreBlank: boolean
}

export interface FileMeta {
  file: File
  name: string
  /** 有效行数（应用 ignoreBlank 后）。 */
  count: number
  /**
   * 解析后的行数组；当只需要行数时为 null 以避免百万级数组常驻内存。
   * 真正去重时会重新读取并填充。
   */
  lines: string[] | null
}

/**
 * 读取文本文件内容。超过 MAX_FILE_BYTES 抛 RangeError，调用方负责提示。
 */
export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new RangeError(`文件过大（${formatBytes(file.size)}），请上传小于 100MB 的文本文件`)
  }
  // 现代浏览器均支持 File.text()；若被裁剪可降级 FileReader.readAsText。
  if (typeof file.text === 'function') {
    return file.text()
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

/** 按选项将文本拆分为行数组。保留原始值，大小写处理留到比较时。 */
export function parseLines(text: string, opts: ParseLineOptions): string[] {
  let lines = text.split(/\r\n|\r|\n/)
  if (opts.ignoreBlank) {
    lines = lines.filter((line) => line.length > 0)
  }
  if (opts.trim) {
    lines = lines.map((line) => line.trim())
  }
  return lines
}

/**
 * 轻量统计行数：只数分隔符个数，不分配百万级数组。
 * 仅用于选中文件后即时显示「N 行」，避免阻塞主线程。
 * ignoreBlank=true 时排除空行。
 */
export function countLinesFast(text: string, ignoreBlank: boolean): number {
  let count = 0
  let lineStart = 0
  const len = text.length

  for (let i = 0; i < len; i++) {
    const ch = text.charCodeAt(i)
    if (ch === 13 || ch === 10) {
      // 处理本行 [lineStart, i)
      const line = text.slice(lineStart, i)
      if (!ignoreBlank || line.length > 0) count += 1
      // \r\n 视作一次换行
      if (ch === 13 && text.charCodeAt(i + 1) === 10) i += 1
      lineStart = i + 1
    }
  }
  // 最后一行（无尾换行）
  if (lineStart < len) {
    const line = text.slice(lineStart)
    if (!ignoreBlank || line.length > 0) count += 1
  } else if (len > 0 && !ignoreBlank) {
    // 文本以换行符结尾：上一行已在循环内计入，无需补
  }
  return count
}

/** 完整流程：读取 + 解析，返回含行数组的 FileMeta（用于真正去重时）。 */
export async function loadFileLines(file: File, opts: ParseLineOptions): Promise<FileMeta> {
  const text = await readTextFile(file)
  const lines = parseLines(text, opts)
  return { file, name: file.name, count: lines.length, lines }
}

/** 轻量流程：只读文件 + 数行数，不保留行数组。用于选中后即时显示。 */
export async function loadFileCount(file: File, opts: ParseLineOptions): Promise<FileMeta> {
  const text = await readTextFile(file)
  const count = countLinesFast(text, opts.ignoreBlank)
  return { file, name: file.name, count, lines: null }
}

/** 将文本以给定文件名触发浏览器下载。非空结果追加尾部换行。 */
export function downloadText(text: string, filename: string): void {
  const content = text.length === 0 ? '' : `${text}\n`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, filename)
}

/** 将行数组直接拼成 Blob 下载，避免在内存中保留 join 出的超长字符串副本。 */
export function downloadLines(lines: string[], filename: string): void {
  const content = lines.length === 0 ? '' : `${lines.join('\n')}\n`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
