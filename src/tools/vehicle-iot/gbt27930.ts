import { bytesToHex } from './utils'
import { parseCanInput, type CanFrame } from './canJ1939'

export interface Gbt27930Field {
  label: string
  value: string
  remark?: string
}

export interface Gbt27930Frame {
  order: number
  rawLine: string
  canId: string
  pgn: string
  messageCode: string
  messageName: string
  stage: string
  source: string
  destination: string
  dataHex: string
  fields: Gbt27930Field[]
  warning?: string
  error?: string
}

interface Gbt27930MessageMeta {
  code: string
  name: string
  stage: string
}

const messageMetas: Record<number, Gbt27930MessageMeta> = {
  0x2600: { code: 'CHM', name: '充电机握手', stage: '握手' },
  0x2700: { code: 'BHM', name: 'BMS 握手', stage: '握手' },
  0x0100: { code: 'CRM', name: '充电机辨识', stage: '辨识' },
  0x0200: { code: 'BRM', name: 'BMS 辨识', stage: '辨识' },
  0x0600: { code: 'BCP', name: '动力蓄电池充电参数', stage: '参数配置' },
  0x0700: { code: 'CTS', name: '充电机发送时间同步信息', stage: '参数配置' },
  0x0800: { code: 'CML', name: '充电机最大输出能力', stage: '参数配置' },
  0x0900: { code: 'BRO', name: 'BMS 充电准备就绪', stage: '参数配置' },
  0x0a00: { code: 'CRO', name: '充电机输出准备就绪', stage: '参数配置' },
  0x1000: { code: 'BCL', name: 'BMS 充电需求', stage: '充电' },
  0x1100: { code: 'BCS', name: 'BMS 充电总状态', stage: '充电' },
  0x1200: { code: 'CCS', name: '充电机充电状态', stage: '充电' },
  0x1300: { code: 'BSM', name: 'BMS 状态信息', stage: '充电' },
  0x1400: { code: 'BMV', name: '单体动力蓄电池电压', stage: '充电' },
  0x1500: { code: 'BMT', name: '动力蓄电池温度', stage: '充电' },
  0x1600: { code: 'BSP', name: '动力蓄电池预留报文', stage: '充电' },
  0x1900: { code: 'BST', name: 'BMS 中止充电', stage: '结束' },
  0x1a00: { code: 'CST', name: '充电机中止充电', stage: '结束' },
  0x1c00: { code: 'BSD', name: 'BMS 统计数据', stage: '统计' },
  0x1d00: { code: 'CSD', name: '充电机统计数据', stage: '统计' },
  0x1e00: { code: 'BEM', name: 'BMS 错误报文', stage: '错误' },
  0x1f00: { code: 'CEM', name: '充电机错误报文', stage: '错误' },
  0xec00: { code: 'TP.CM', name: '传输协议连接管理', stage: '多包传输' },
  0xeb00: { code: 'TP.DT', name: '传输协议数据传输', stage: '多包传输' }
}

const roleNames: Record<number, string> = {
  0x56: '充电机',
  0xf4: 'BMS'
}

export function parseGbt27930Input(input: string): Gbt27930Frame[] {
  return parseCanInput(input).frames.map(decodeGbt27930Frame)
}

function decodeGbt27930Frame(frame: CanFrame): Gbt27930Frame {
  if (frame.error) {
    return {
      order: frame.order,
      rawLine: frame.rawLine,
      canId: frame.idHex,
      pgn: '-',
      messageCode: '-',
      messageName: '未识别',
      stage: '异常',
      source: '-',
      destination: '-',
      dataHex: frame.dataHex,
      fields: [],
      error: frame.error
    }
  }

  if (!frame.j1939) {
    return {
      order: frame.order,
      rawLine: frame.rawLine,
      canId: frame.idHex,
      pgn: '-',
      messageCode: '-',
      messageName: '非 29 位扩展帧',
      stage: '异常',
      source: '-',
      destination: '-',
      dataHex: frame.dataHex,
      fields: [{ label: '原始数据', value: frame.dataHex || '空' }],
      warning: 'GB/T 27930 通常使用 29 位扩展 CAN ID'
    }
  }

  const pgn = frame.j1939.pgn
  const meta = messageMetas[pgn] ?? {
    code: 'UNKNOWN',
    name: '未知 27930 PGN',
    stage: '未知'
  }
  const source = roleNames[frame.j1939.sourceAddress] ?? `SA 0x${byteHex(frame.j1939.sourceAddress)}`
  const destination = frame.j1939.destinationAddress === undefined
    ? '广播/组扩展'
    : roleNames[frame.j1939.destinationAddress] ?? `DA 0x${byteHex(frame.j1939.destinationAddress)}`
  const decoded = decodeFields(pgn, frame.data)

  return {
    order: frame.order,
    rawLine: frame.rawLine,
    canId: frame.idHex,
    pgn: pgn.toString(16).toUpperCase().padStart(4, '0'),
    messageCode: meta.code,
    messageName: meta.name,
    stage: meta.stage,
    source,
    destination,
    dataHex: frame.dataHex,
    fields: decoded.fields,
    warning: decoded.warning
  }
}

function decodeFields(pgn: number, data: number[]): { fields: Gbt27930Field[]; warning?: string } {
  if (pgn === 0xec00) return { fields: decodeTpCm(data) }
  if (pgn === 0xeb00) return { fields: decodeTpDt(data) }
  if (pgn === 0x2600) return { fields: decodeChm(data) }
  if (pgn === 0x2700) return { fields: decodeBhm(data) }
  if (pgn === 0x0100) return { fields: decodeCrm(data) }
  if (pgn === 0x0600) return { fields: decodeBcp(data) }
  if (pgn === 0x0700) return { fields: decodeCts(data) }
  if (pgn === 0x0800) return { fields: decodeCml(data) }
  if (pgn === 0x0900 || pgn === 0x0a00) return { fields: decodeReady(data, pgn === 0x0900 ? 'BMS' : '充电机') }
  if (pgn === 0x1000) return { fields: decodeBcl(data) }
  if (pgn === 0x1100) return { fields: decodeBcs(data) }
  if (pgn === 0x1200) return { fields: decodeCcs(data) }
  if (pgn === 0x1300) return { fields: decodeBsm(data) }
  if (pgn === 0x1900 || pgn === 0x1a00 || pgn === 0x1e00 || pgn === 0x1f00) return { fields: decodeReasonBits(data) }
  if (pgn === 0x1c00) return { fields: decodeBsd(data) }
  if (pgn === 0x1d00) return { fields: decodeCsd(data) }
  return {
    fields: [{ label: '数据 Hex', value: bytesToHex(data) || '空' }],
    warning: '暂未内置该 PGN 的字段模板，已保留原始数据'
  }
}

function decodeChm(data: number[]): Gbt27930Field[] {
  return [
    { label: '协议版本', value: data.length >= 3 ? `${data[2]}.${data[1]}.${data[0]}` : bytesToHex(data), remark: '按低字节在前展示' },
    ...rawIfExtra(data, 3)
  ]
}

function decodeBhm(data: number[]): Gbt27930Field[] {
  return [
    { label: '最高允许充电总电压', value: data.length >= 2 ? voltage01(le16(data, 0)) : '-' },
    ...rawIfExtra(data, 2)
  ]
}

function decodeCrm(data: number[]): Gbt27930Field[] {
  return [
    { label: '辨识结果', value: data.length ? crmResult(data[0]) : '-' },
    { label: '充电机编号/扩展数据', value: data.length > 1 ? asciiOrHex(data.slice(1)) : '空' }
  ]
}

function decodeBcp(data: number[]): Gbt27930Field[] {
  const fields: Gbt27930Field[] = [
    { label: '最高允许充电总电压', value: data.length >= 2 ? voltage01(le16(data, 0)) : '-' },
    { label: '最高允许充电电流', value: data.length >= 4 ? currentOffset400(le16(data, 2)) : '-' },
    { label: '标称总能量', value: data.length >= 6 ? `${(le16(data, 4) / 10).toFixed(1)} kWh` : '-' },
    { label: '最高允许单体电压', value: data.length >= 8 ? `${(le16(data, 6) / 100).toFixed(2)} V` : '-' },
    { label: '最高允许温度', value: data.length >= 9 ? temperature50(data[8]) : '-' },
    { label: '整车荷电状态 SOC', value: data.length >= 10 ? percent(data[9]) : '-' },
    { label: '当前电池总电压', value: data.length >= 12 ? voltage01(le16(data, 10)) : '-' }
  ]
  return fields.filter(field => field.value !== '-')
}

function decodeCts(data: number[]): Gbt27930Field[] {
  if (data.length >= 7) {
    return [
      { label: '同步时间', value: `20${pad(data[6])}-${pad(data[5])}-${pad(data[4])} ${pad(data[2])}:${pad(data[1])}:${pad(data[0])}` },
      { label: '星期/保留', value: String(data[3]) }
    ]
  }
  return [{ label: '时间同步数据 Hex', value: bytesToHex(data) || '空' }]
}

function decodeCml(data: number[]): Gbt27930Field[] {
  return [
    { label: '最高输出电压', value: data.length >= 2 ? voltage01(le16(data, 0)) : '-' },
    { label: '最低输出电压', value: data.length >= 4 ? voltage01(le16(data, 2)) : '-' },
    { label: '最大输出电流', value: data.length >= 6 ? currentOffset400(le16(data, 4)) : '-' },
    { label: '最小输出电流', value: data.length >= 8 ? currentOffset400(le16(data, 6)) : '-' }
  ].filter(field => field.value !== '-')
}

function decodeReady(data: number[], role: string): Gbt27930Field[] {
  return [
    { label: `${role} 准备状态`, value: data.length ? readyState(data[0]) : '-' },
    ...rawIfExtra(data, 1)
  ]
}

function decodeBcl(data: number[]): Gbt27930Field[] {
  return [
    { label: '请求充电电压', value: data.length >= 2 ? voltage01(le16(data, 0)) : '-' },
    { label: '请求充电电流', value: data.length >= 4 ? currentOffset400(le16(data, 2)) : '-' },
    { label: '充电模式', value: data.length >= 5 ? chargeMode(data[4]) : '-' }
  ].filter(field => field.value !== '-')
}

function decodeBcs(data: number[]): Gbt27930Field[] {
  return [
    { label: '充电电压测量值', value: data.length >= 2 ? voltage01(le16(data, 0)) : '-' },
    { label: '充电电流测量值', value: data.length >= 4 ? currentOffset400(le16(data, 2)) : '-' },
    { label: '最高单体电压', value: data.length >= 6 ? `${(le16(data, 4) / 100).toFixed(2)} V` : '-' },
    { label: '当前 SOC', value: data.length >= 7 ? percent(data[6]) : '-' },
    { label: '估算剩余充电时间', value: data.length >= 9 ? `${le16(data, 7)} min` : '-' }
  ].filter(field => field.value !== '-')
}

function decodeCcs(data: number[]): Gbt27930Field[] {
  return [
    { label: '输出电压', value: data.length >= 2 ? voltage01(le16(data, 0)) : '-' },
    { label: '输出电流', value: data.length >= 4 ? currentOffset400(le16(data, 2)) : '-' },
    { label: '累计充电时间', value: data.length >= 6 ? `${le16(data, 4)} min` : '-' },
    { label: '充电允许状态', value: data.length >= 7 ? allowState(data[6]) : '-' }
  ].filter(field => field.value !== '-')
}

function decodeBsm(data: number[]): Gbt27930Field[] {
  return [
    { label: '最高单体电压编号', value: data.length >= 1 ? String(data[0]) : '-' },
    { label: '最高动力蓄电池温度', value: data.length >= 2 ? temperature50(data[1]) : '-' },
    { label: '最高温度检测点编号', value: data.length >= 3 ? String(data[2]) : '-' },
    { label: '最低动力蓄电池温度', value: data.length >= 4 ? temperature50(data[3]) : '-' },
    { label: '最低温度检测点编号', value: data.length >= 5 ? String(data[4]) : '-' },
    { label: '状态字节', value: data.length > 5 ? bytesToHex(data.slice(5)) : '空', remark: '单体过压、SOC、温度、绝缘等状态位' }
  ].filter(field => field.value !== '-')
}

function decodeBsd(data: number[]): Gbt27930Field[] {
  return [
    { label: '中止荷电状态 SOC', value: data.length >= 1 ? percent(data[0]) : '-' },
    { label: '动力蓄电池单体最低电压', value: data.length >= 3 ? `${(le16(data, 1) / 100).toFixed(2)} V` : '-' },
    { label: '动力蓄电池单体最高电压', value: data.length >= 5 ? `${(le16(data, 3) / 100).toFixed(2)} V` : '-' },
    { label: '动力蓄电池最低温度', value: data.length >= 6 ? temperature50(data[5]) : '-' },
    { label: '动力蓄电池最高温度', value: data.length >= 7 ? temperature50(data[6]) : '-' }
  ].filter(field => field.value !== '-')
}

function decodeCsd(data: number[]): Gbt27930Field[] {
  return [
    { label: '累计充电时间', value: data.length >= 2 ? `${le16(data, 0)} min` : '-' },
    { label: '输出能量', value: data.length >= 4 ? `${(le16(data, 2) / 10).toFixed(1)} kWh` : '-' },
    { label: '充电机编号/保留数据', value: data.length > 4 ? asciiOrHex(data.slice(4)) : '空' }
  ].filter(field => field.value !== '-')
}

function decodeReasonBits(data: number[]): Gbt27930Field[] {
  return data.length
    ? data.map((byte, index) => ({
      label: `原因字节 ${index + 1}`,
      value: `0x${byteHex(byte)}`,
      remark: byte ? activeBits(byte).join('、') : '无置位'
    }))
    : [{ label: '原因', value: '空' }]
}

function decodeTpCm(data: number[]): Gbt27930Field[] {
  if (data.length < 8) return [{ label: 'TP.CM 数据 Hex', value: bytesToHex(data) || '空', remark: '长度不足 8 字节' }]
  const control = data[0]
  const targetPgn = data[5] | (data[6] << 8) | (data[7] << 16)
  const meta = messageMetas[targetPgn]
  return [
    { label: '控制类型', value: tpControl(control) },
    { label: '总字节数', value: String(le16(data, 1)) },
    { label: '总包数', value: String(data[3]) },
    { label: '可发送包数/保留', value: String(data[4]) },
    { label: '目标 PGN', value: `0x${targetPgn.toString(16).toUpperCase().padStart(6, '0')}`, remark: meta ? `${meta.code} ${meta.name}` : undefined }
  ]
}

function decodeTpDt(data: number[]): Gbt27930Field[] {
  return [
    { label: '包序号', value: data.length ? String(data[0]) : '-' },
    { label: '数据片段', value: data.length > 1 ? bytesToHex(data.slice(1)) : '空' }
  ]
}

function le16(bytes: number[], offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
}

function voltage01(value: number): string {
  if (value === 0xffff) return '无效'
  return `${(value / 10).toFixed(1)} V`
}

function currentOffset400(value: number): string {
  if (value === 0xffff) return '无效'
  return `${(value / 10 - 400).toFixed(1)} A`
}

function percent(value: number): string {
  if (value === 0xff) return '无效'
  return `${value} %`
}

function temperature50(value: number): string {
  if (value === 0xff) return '无效'
  return `${value - 50} °C`
}

function readyState(value: number): string {
  if (value === 0xaa) return '0xAA 准备就绪'
  if (value === 0x00) return '0x00 未就绪'
  return `0x${byteHex(value)} 未知状态`
}

function crmResult(value: number): string {
  if (value === 0x00) return '0x00 辨识未完成/失败'
  if (value === 0xaa) return '0xAA 辨识成功'
  return `0x${byteHex(value)} 未知结果`
}

function allowState(value: number): string {
  if (value === 0x00) return '0x00 暂停/不允许'
  if (value === 0x01) return '0x01 允许充电'
  if (value === 0xaa) return '0xAA 允许充电'
  return `0x${byteHex(value)} 未知状态`
}

function chargeMode(value: number): string {
  if (value === 0x01) return '恒压充电'
  if (value === 0x02) return '恒流充电'
  return `0x${byteHex(value)} 未知模式`
}

function tpControl(value: number): string {
  const labels: Record<number, string> = {
    0x10: 'RTS 请求发送',
    0x11: 'CTS 允许发送',
    0x13: 'EOM_ACK 发送结束确认',
    0x20: 'BAM 广播公告',
    0xff: 'Abort 中止连接'
  }
  return `0x${byteHex(value)} ${labels[value] ?? '未知控制'}`
}

function rawIfExtra(data: number[], offset: number): Gbt27930Field[] {
  return data.length > offset ? [{ label: '扩展/保留数据', value: bytesToHex(data.slice(offset)) }] : []
}

function asciiOrHex(bytes: number[]): string {
  const ascii = bytes
    .filter(byte => byte !== 0xff && byte !== 0)
    .map(byte => (byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'))
    .join('')
    .trim()
  return ascii && !ascii.includes('.') ? ascii : bytesToHex(bytes)
}

function activeBits(value: number): string[] {
  const bits: string[] = []
  for (let bit = 0; bit < 8; bit += 1) {
    if (value & (1 << bit)) bits.push(`bit${bit}`)
  }
  return bits
}

function byteHex(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0')
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
