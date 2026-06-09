export interface VinFieldRow {
  label: string
  value: string
  remark?: string
}

export interface VinCheckDigitResult {
  actual: string
  expected: string
  matched: boolean
  applicable: boolean
}

export interface VinAnalysisResult {
  order: number
  rawInput: string
  normalized: string
  validLength: boolean
  invalidCharacters: string[]
  wmi: string
  vds: string
  checkDigit: VinCheckDigitResult
  yearCode: string
  modelYears: number[]
  plantCode: string
  serialNumber: string
  region: string
  country: string
  manufacturer: string
  rows: VinFieldRow[]
  warnings: string[]
  valid: boolean
}

const transliteration: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9
}

const checkDigitWeights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
const validVinPattern = /^[A-HJ-NPR-Z0-9]+$/
const validYearCodes = 'ABCDEFGHJKLMNPRSTVWXY123456789'.split('')

const regionByFirstChar: Record<string, { region: string; country: string }> = {
  1: { region: '北美', country: '美国' },
  2: { region: '北美', country: '加拿大' },
  3: { region: '北美', country: '墨西哥' },
  4: { region: '北美', country: '美国' },
  5: { region: '北美', country: '美国' },
  6: { region: '大洋洲', country: '澳大利亚' },
  7: { region: '大洋洲', country: '新西兰' },
  8: { region: '南美洲', country: '阿根廷/智利' },
  9: { region: '南美洲', country: '巴西/哥伦比亚' },
  J: { region: '亚洲', country: '日本' },
  K: { region: '亚洲', country: '韩国' },
  L: { region: '亚洲', country: '中国' },
  M: { region: '亚洲', country: '印度/东南亚' },
  S: { region: '欧洲', country: '英国' },
  T: { region: '欧洲', country: '瑞士/捷克/匈牙利' },
  V: { region: '欧洲', country: '法国/西班牙' },
  W: { region: '欧洲', country: '德国' },
  X: { region: '欧洲', country: '俄罗斯/独联体' },
  Y: { region: '欧洲', country: '瑞典/芬兰' },
  Z: { region: '欧洲', country: '意大利' }
}

const manufacturerPrefixes: Record<string, string> = {
  '1F': 'Ford 美国',
  '1G': 'General Motors 美国',
  '1H': 'Honda 美国',
  '1N': 'Nissan 美国',
  '2G': 'General Motors 加拿大',
  '2H': 'Honda 加拿大',
  '3G': 'General Motors 墨西哥',
  '3N': 'Nissan 墨西哥',
  '3V': 'Volkswagen 墨西哥',
  JHM: 'Honda 日本',
  JTD: 'Toyota 日本',
  JT: 'Toyota/Lexus 日本',
  KMH: 'Hyundai 韩国',
  KNA: 'Kia 韩国',
  LHG: '广汽本田',
  LSV: '上汽大众',
  LFV: '一汽-大众',
  LSG: '上汽通用',
  LVS: '长安福特',
  LDC: '东风汽车',
  LFP: '一汽集团',
  LBV: '华晨宝马',
  LE4: '北京奔驰',
  LFM: '一汽丰田',
  LVH: '东风本田',
  WBA: 'BMW 德国',
  WBS: 'BMW M 德国',
  WDB: 'Mercedes-Benz 德国',
  WDD: 'Mercedes-Benz 德国',
  WVW: 'Volkswagen 德国',
  WAU: 'Audi 德国',
  VF1: 'Renault 法国',
  VF3: 'Peugeot 法国',
  VF7: 'Citroen 法国',
  ZFA: 'Fiat 意大利',
  ZFF: 'Ferrari 意大利'
}

export function parseVinInput(input: string): VinAnalysisResult[] {
  return input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => analyzeVin(line, index + 1))
}

export function buildVinDemoInput(): string {
  return [
    '1M8GDM9AXKP042788',
    '1HGCM82633A004352',
    'LVSFDFE45NF000001'
  ].join('\n')
}

export function analyzeVin(input: string, order = 1): VinAnalysisResult {
  const normalized = normalizeVin(input)
  const validLength = normalized.length === 17
  const invalidCharacters = Array.from(new Set(normalized.split('').filter(char => !validVinPattern.test(char))))
  const canCheck = validLength && invalidCharacters.length === 0
  const wmi = normalized.slice(0, 3)
  const vds = normalized.slice(3, 8)
  const actualCheckDigit = normalized[8] ?? ''
  const yearCode = normalized[9] ?? ''
  const plantCode = normalized[10] ?? ''
  const serialNumber = normalized.slice(11, 17)
  const expectedCheckDigit = canCheck ? calculateVinCheckDigit(normalized) : '-'
  const checkDigit: VinCheckDigitResult = {
    actual: actualCheckDigit || '-',
    expected: expectedCheckDigit,
    matched: canCheck && actualCheckDigit === expectedCheckDigit,
    applicable: canCheck
  }
  const regionInfo = decodeRegion(normalized[0] ?? '')
  const manufacturer = findManufacturer(wmi)
  const modelYears = decodeModelYears(yearCode)
  const warnings = buildWarnings({
    normalized,
    validLength,
    invalidCharacters,
    checkDigit,
    yearCode,
    modelYears
  })

  const rows: VinFieldRow[] = [
    { label: 'WMI', value: wmi || '-', remark: '世界制造厂识别码' },
    { label: 'VDS', value: vds || '-', remark: '车辆说明部分' },
    {
      label: '校验位',
      value: checkDigit.actual,
      remark: checkDigit.applicable ? `计算值 ${checkDigit.expected}` : '需 17 位有效 VIN'
    },
    {
      label: '年份码',
      value: yearCode || '-',
      remark: modelYears.length ? modelYears.join(' / ') : '未识别年份码'
    },
    { label: '工厂代码', value: plantCode || '-', remark: '第 11 位' },
    { label: '序列号', value: serialNumber || '-', remark: '第 12-17 位' },
    { label: '区域/国家', value: `${regionInfo.region} / ${regionInfo.country}`, remark: '按首位粗略判断' },
    { label: '厂商', value: manufacturer, remark: manufacturer === '未知厂商' ? '可结合品牌私有 WMI 表补充' : '按常见 WMI 前缀匹配' }
  ]

  return {
    order,
    rawInput: input,
    normalized,
    validLength,
    invalidCharacters,
    wmi,
    vds,
    checkDigit,
    yearCode,
    modelYears,
    plantCode,
    serialNumber,
    region: regionInfo.region,
    country: regionInfo.country,
    manufacturer,
    rows,
    warnings,
    valid: validLength && invalidCharacters.length === 0 && checkDigit.matched
  }
}

function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

function calculateVinCheckDigit(vin: string): string {
  const sum = vin.split('').reduce((total, char, index) => {
    const value = /\d/.test(char) ? Number(char) : transliteration[char]
    return total + value * checkDigitWeights[index]
  }, 0)
  const remainder = sum % 11
  return remainder === 10 ? 'X' : String(remainder)
}

function decodeRegion(firstChar: string): { region: string; country: string } {
  return regionByFirstChar[firstChar] ?? { region: '未知区域', country: '未知国家' }
}

function findManufacturer(wmi: string): string {
  const prefixes = Object.keys(manufacturerPrefixes).sort((left, right) => right.length - left.length)
  const matched = prefixes.find(prefix => wmi.startsWith(prefix))
  return matched ? manufacturerPrefixes[matched] : '未知厂商'
}

function decodeModelYears(yearCode: string): number[] {
  const index = validYearCodes.indexOf(yearCode)
  if (index < 0) return []
  const firstCycle = 1980 + index
  const secondCycle = firstCycle + 30
  return [firstCycle, secondCycle]
}

function buildWarnings(options: {
  normalized: string
  validLength: boolean
  invalidCharacters: string[]
  checkDigit: VinCheckDigitResult
  yearCode: string
  modelYears: number[]
}): string[] {
  const warnings: string[] = []
  if (!options.validLength) {
    warnings.push(`VIN 长度应为 17 位，当前为 ${options.normalized.length} 位`)
  }
  if (options.invalidCharacters.length) {
    warnings.push(`包含 VIN 禁用或非法字符：${options.invalidCharacters.join('、')}`)
  }
  if (options.checkDigit.applicable && !options.checkDigit.matched) {
    warnings.push(`第 9 位校验不通过，应为 ${options.checkDigit.expected}`)
  }
  if (options.yearCode && !options.modelYears.length) {
    warnings.push('第 10 位年份码不在常用 VIN 年份码范围内')
  }
  return warnings
}
