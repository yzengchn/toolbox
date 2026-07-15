/** chmod 权限计算（纯前端） */

export type PermClass = 'owner' | 'group' | 'other'
export type LsFileType = 'file' | 'dir' | 'link' | 'none'

export interface ClassPerms {
  read: boolean
  write: boolean
  execute: boolean
}

export interface SpecialBits {
  setuid: boolean
  setgid: boolean
  sticky: boolean
}

export interface ChmodState {
  owner: ClassPerms
  group: ClassPerms
  other: ClassPerms
  special: SpecialBits
}

export interface ChmodPreset {
  id: string
  name: string
  octal: string
  description: string
  /** 分组：common / file / dir / secret / special */
  group: 'common' | 'file' | 'dir' | 'secret' | 'special'
  /** 典型场景标签 */
  tags?: string[]
}

export type PermBitKey = keyof ClassPerms
export type PresetGroupKey = ChmodPreset['group']
export type PresetFilterKey = PresetGroupKey | 'all'

export type ParseResult = { mode: number } | { error: string }

export const DEFAULT_CHMOD_STATE: ChmodState = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
  special: { setuid: false, setgid: false, sticky: false }
}

export const CHMOD_PRESET_GROUPS: Array<{ key: PresetFilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'common', label: '常用' },
  { key: 'file', label: '文件' },
  { key: 'dir', label: '目录' },
  { key: 'secret', label: '敏感' },
  { key: 'special', label: '特殊位' }
]

export const PERM_ROWS: Array<{ key: PermClass; label: string; hint: string }> = [
  { key: 'owner', label: '所有者 u', hint: 'user' },
  { key: 'group', label: '所属组 g', hint: 'group' },
  { key: 'other', label: '其他人 o', hint: 'other' }
]

export const PERM_BITS: Array<{ key: PermBitKey; label: string; weight: number }> = [
  { key: 'read', label: '读', weight: 4 },
  { key: 'write', label: '写', weight: 2 },
  { key: 'execute', label: '执行', weight: 1 }
]

export const SPECIAL_BITS: Array<{ key: keyof SpecialBits; label: string; hint: string }> = [
  { key: 'setuid', label: 'setuid', hint: '4xxx' },
  { key: 'setgid', label: 'setgid', hint: '2xxx' },
  { key: 'sticky', label: 'sticky', hint: '1xxx' }
]

export const CHMOD_PRESETS: ChmodPreset[] = [
  // 常用
  {
    id: '755',
    name: '755',
    octal: '755',
    group: 'common',
    tags: ['目录', '脚本'],
    description: '目录 / 可执行：所有者可写，其他人读+执行（网站 root 默认）'
  },
  {
    id: '644',
    name: '644',
    octal: '644',
    group: 'common',
    tags: ['文件'],
    description: '普通文件：所有者读写，其他人只读（配置、源码、静态资源）'
  },
  {
    id: '600',
    name: '600',
    octal: '600',
    group: 'common',
    tags: ['密钥', '私密'],
    description: '私密文件：仅所有者读写（.env、私钥、凭证）'
  },
  {
    id: '700',
    name: '700',
    octal: '700',
    group: 'common',
    tags: ['目录', '脚本'],
    description: '私密目录 / 脚本：仅所有者 rwx'
  },
  {
    id: '750',
    name: '750',
    octal: '750',
    group: 'common',
    tags: ['目录', '部署'],
    description: '组可进入目录，其他人无权限（多用户部署）'
  },
  {
    id: '640',
    name: '640',
    octal: '640',
    group: 'common',
    tags: ['配置'],
    description: '所有者读写，组只读，其他人无（共享配置）'
  },

  // 文件
  {
    id: '664',
    name: '664',
    octal: '664',
    group: 'file',
    tags: ['协作'],
    description: '所有者与组可写，其他人只读（协作文件）'
  },
  {
    id: '666',
    name: '666',
    octal: '666',
    group: 'file',
    tags: ['慎用'],
    description: '所有人读写（慎用，共享临时文件）'
  },
  {
    id: '444',
    name: '444',
    octal: '444',
    group: 'file',
    tags: ['只读'],
    description: '所有人只读，不可写（只读发布物）'
  },
  {
    id: '440',
    name: '440',
    octal: '440',
    group: 'file',
    tags: ['只读'],
    description: '所有者与组只读，其他人无'
  },
  {
    id: '400',
    name: '400',
    octal: '400',
    group: 'file',
    tags: ['只读'],
    description: '仅所有者只读（极简只读）'
  },
  {
    id: '620',
    name: '620',
    octal: '620',
    group: 'file',
    tags: ['日志'],
    description: '所有者读写，组可写（部分日志/管道场景）'
  },
  {
    id: '660',
    name: '660',
    octal: '660',
    group: 'file',
    tags: ['协作'],
    description: '所有者与组读写，其他人无（数据库数据文件常见）'
  },
  {
    id: '464',
    name: '464',
    octal: '464',
    group: 'file',
    tags: ['少见'],
    description: '所有者只读，组读写，其他人只读（少见协作布局）'
  },

  // 目录
  {
    id: '775',
    name: '775',
    octal: '775',
    group: 'dir',
    tags: ['协作目录'],
    description: '所有者与组可写目录，其他人读+进入'
  },
  {
    id: '770',
    name: '770',
    octal: '770',
    group: 'dir',
    tags: ['协作目录'],
    description: '仅所有者与组可访问目录'
  },
  {
    id: '711',
    name: '711',
    octal: '711',
    group: 'dir',
    tags: ['隐藏列表'],
    description: '可进入但不可列目录（~ 下 public_html 常见）'
  },
  {
    id: '751',
    name: '751',
    octal: '751',
    group: 'dir',
    tags: ['目录'],
    description: '组可进入+执行，其他人仅进入'
  },
  {
    id: '555',
    name: '555',
    octal: '555',
    group: 'dir',
    tags: ['只读目录'],
    description: '所有人读+进入，不可写（只读挂载/发布目录）'
  },
  {
    id: '500',
    name: '500',
    octal: '500',
    group: 'dir',
    tags: ['只读目录'],
    description: '仅所有者读+进入'
  },
  {
    id: '733',
    name: '733',
    octal: '733',
    group: 'dir',
    tags: ['投递'],
    description: '其他人可写+进入但不可列（简易 dropbox 目录，更推荐 1733）'
  },
  {
    id: '1733',
    name: '1733',
    octal: '1733',
    group: 'dir',
    tags: ['投递', 'sticky'],
    description: 'sticky 投递目录：可写不可列，只能删自己的文件'
  },

  // 敏感（每个八进制只保留一条，场景写进说明/标签）
  {
    id: '400-key',
    name: '400',
    octal: '400',
    group: 'secret',
    tags: ['SSH', '只读'],
    description: 'SSH 私钥只读（chmod 400 ~/.ssh/id_rsa）'
  },
  {
    id: '600-secret',
    name: '600',
    octal: '600',
    group: 'secret',
    tags: ['SSH', 'TLS', '凭证'],
    description: '敏感私钥/凭证：.pem、TLS key、.env、kubeconfig（仅所有者读写）'
  },
  {
    id: '700-ssh',
    name: '700',
    octal: '700',
    group: 'secret',
    tags: ['SSH', '目录'],
    description: '~/.ssh 等私密目录：仅所有者可访问'
  },
  {
    id: '644-pub',
    name: '644',
    octal: '644',
    group: 'secret',
    tags: ['SSH', '公钥'],
    description: '公钥 / authorized_keys 常见 644（部分环境要求 600）'
  },
  {
    id: '640-conf',
    name: '640',
    octal: '640',
    group: 'secret',
    tags: ['配置'],
    description: '含密钥的配置：web 用户读、其他人无（nginx/php-fpm 常见）'
  },

  // 特殊位
  {
    id: '4755',
    name: '4755',
    octal: '4755',
    group: 'special',
    tags: ['setuid'],
    description: 'setuid 可执行：运行时以文件所有者身份（如 passwd）'
  },
  {
    id: '4711',
    name: '4711',
    octal: '4711',
    group: 'special',
    tags: ['setuid'],
    description: 'setuid + 仅所有者可读可写脚本/二进制'
  },
  {
    id: '2755',
    name: '2755',
    octal: '2755',
    group: 'special',
    tags: ['setgid'],
    description: 'setgid 目录：新建文件继承目录所属组'
  },
  {
    id: '2775',
    name: '2775',
    octal: '2775',
    group: 'special',
    tags: ['setgid', '协作'],
    description: 'setgid 协作目录：组可写且继承组'
  },
  {
    id: '2770',
    name: '2770',
    octal: '2770',
    group: 'special',
    tags: ['setgid'],
    description: '私密 setgid 协作目录，其他人无权限'
  },
  {
    id: '1777',
    name: '1777',
    octal: '1777',
    group: 'special',
    tags: ['sticky'],
    description: 'sticky 公共目录（/tmp）：谁都可以写，只能删自己的'
  },
  {
    id: '1755',
    name: '1755',
    octal: '1755',
    group: 'special',
    tags: ['sticky'],
    description: 'sticky + 755：共享可读目录，限制删除'
  },
  {
    id: '777',
    name: '777',
    octal: '777',
    group: 'special',
    tags: ['危险'],
    description: '所有人 rwx（极不安全，仅本地临时调试）'
  }
]

export const CHMOD_PRESET_MODE = new Map<string, number>(
  CHMOD_PRESETS.map(p => {
    const parsed = Number.parseInt(p.octal.replace(/^0o/i, ''), 8)
    return [p.id, Number.isNaN(parsed) ? 0 : parsed & 0o7777]
  })
)

export const CHMOD_PRESET_GROUP_COUNTS = CHMOD_PRESETS.reduce(
  (counts, preset) => {
    counts[preset.group] = (counts[preset.group] || 0) + 1
    return counts
  },
  {} as Record<PresetGroupKey, number>
)

const LS_TYPE_CHAR: Record<LsFileType, string> = {
  file: '-',
  dir: 'd',
  link: 'l',
  none: ''
}

function classToNibble(p: ClassPerms): number {
  return (p.read ? 4 : 0) + (p.write ? 2 : 0) + (p.execute ? 1 : 0)
}

function nibbleToClass(n: number): ClassPerms {
  const v = n & 7
  return {
    read: (v & 4) !== 0,
    write: (v & 2) !== 0,
    execute: (v & 1) !== 0
  }
}

function specialToNibble(s: SpecialBits): number {
  return (s.setuid ? 4 : 0) + (s.setgid ? 2 : 0) + (s.sticky ? 1 : 0)
}

function nibbleToSpecial(n: number): SpecialBits {
  const v = n & 7
  return {
    setuid: (v & 4) !== 0,
    setgid: (v & 2) !== 0,
    sticky: (v & 1) !== 0
  }
}

export function cloneState(state: ChmodState): ChmodState {
  return {
    owner: { ...state.owner },
    group: { ...state.group },
    other: { ...state.other },
    special: { ...state.special }
  }
}

export function stateToMode(state: ChmodState): number {
  return (
    (specialToNibble(state.special) << 9) |
    (classToNibble(state.owner) << 6) |
    (classToNibble(state.group) << 3) |
    classToNibble(state.other)
  )
}

export function modeToState(mode: number): ChmodState {
  const m = mode & 0o7777
  return {
    special: nibbleToSpecial((m >> 9) & 7),
    owner: nibbleToClass((m >> 6) & 7),
    group: nibbleToClass((m >> 3) & 7),
    other: nibbleToClass(m & 7)
  }
}

/** 始终输出 3 位；有特殊位时输出 4 位 */
export function modeToOctal(mode: number, forceFour = false): string {
  const m = mode & 0o7777
  const special = (m >> 9) & 7
  const lower = (m & 0o777).toString(8).padStart(3, '0')
  return forceFour || special !== 0 ? `${special}${lower}` : lower
}

export function parseOctal(input: string): ParseResult {
  const raw = input.trim().replace(/^0o/i, '')
  if (!raw) return { error: '请输入八进制权限，如 755 或 0755' }
  if (!/^[0-7]{1,4}$/.test(raw)) {
    return { error: '八进制仅允许 0–7，长度 1–4 位（如 644、0755、4755）' }
  }
  const mode = Number.parseInt(raw, 8)
  if (Number.isNaN(mode) || mode > 0o7777) return { error: '无效的权限值' }
  return { mode }
}

function rwxChars(p: ClassPerms, special: 's' | 't' | null): string {
  const r = p.read ? 'r' : '-'
  const w = p.write ? 'w' : '-'
  if (special === 's') return r + w + (p.execute ? 's' : 'S')
  if (special === 't') return r + w + (p.execute ? 't' : 'T')
  return r + w + (p.execute ? 'x' : '-')
}

export function modeToSymbolicRwx(mode: number): string {
  const { owner, group, other, special } = modeToState(mode)
  return (
    rwxChars(owner, special.setuid ? 's' : null) +
    rwxChars(group, special.setgid ? 's' : null) +
    rwxChars(other, special.sticky ? 't' : null)
  )
}

export function modeToLsString(mode: number, fileType: LsFileType = 'file'): string {
  return LS_TYPE_CHAR[fileType] + modeToSymbolicRwx(mode)
}

function parseTriplet(
  trip: string
): { perms: ClassPerms; setSpecial: boolean; sticky: boolean } | { error: string } {
  const [r, w, x] = trip
  if ((r !== 'r' && r !== '-') || (w !== 'w' && w !== '-')) {
    return { error: `无效符号位: ${trip}` }
  }

  const table: Record<string, { execute: boolean; setSpecial: boolean; sticky: boolean }> = {
    x: { execute: true, setSpecial: false, sticky: false },
    '-': { execute: false, setSpecial: false, sticky: false },
    s: { execute: true, setSpecial: true, sticky: false },
    S: { execute: false, setSpecial: true, sticky: false },
    t: { execute: true, setSpecial: false, sticky: true },
    T: { execute: false, setSpecial: false, sticky: true }
  }
  const bit = table[x]
  if (!bit) return { error: `无效执行位: ${x}` }

  return {
    perms: { read: r === 'r', write: w === 'w', execute: bit.execute },
    setSpecial: bit.setSpecial,
    sticky: bit.sticky
  }
}

/** 解析 rwxr-xr-x 或 -rwxr-xr-x / drwxr-xr-x */
export function parseSymbolicRwx(input: string): ParseResult {
  let s = input.trim()
  if (!s) return { error: '请输入符号权限，如 rwxr-xr-x 或 -rwxr-xr-x' }

  if (/^[dlcbps-]/.test(s) && s.length === 10) s = s.slice(1)
  if (!/^[rwxstST-]{9}$/.test(s)) {
    return { error: '符号格式应为 9 位 rwx（可带文件类型前缀），如 rwxr-xr-x' }
  }

  const o = parseTriplet(s.slice(0, 3))
  if ('error' in o) return o
  const g = parseTriplet(s.slice(3, 6))
  if ('error' in g) return g
  const t = parseTriplet(s.slice(6, 9))
  if ('error' in t) return t

  return {
    mode: stateToMode({
      owner: o.perms,
      group: g.perms,
      other: t.perms,
      special: {
        setuid: o.setSpecial,
        setgid: g.setSpecial,
        sticky: t.sticky || t.setSpecial
      }
    })
  }
}

function classToSymbolic(p: ClassPerms): string {
  return `${p.read ? 'r' : ''}${p.write ? 'w' : ''}${p.execute ? 'x' : ''}`
}

export function modeToChmodSymbolicCommand(mode: number, target = 'file'): string {
  const { owner, group, other, special } = modeToState(mode)
  const u = classToSymbolic(owner) + (special.setuid ? 's' : '')
  const g = classToSymbolic(group) + (special.setgid ? 's' : '')
  const o = classToSymbolic(other) + (special.sticky ? 't' : '')
  return `chmod u=${u},g=${g},o=${o} ${target}`
}

export function modeToChmodOctalCommand(mode: number, target = 'file'): string {
  return `chmod ${modeToOctal(mode)} ${target}`
}

export function describeMode(mode: number): string[] {
  const { owner, group, other, special } = modeToState(mode)
  const desc = (label: string, p: ClassPerms) => {
    const bits = [
      p.read ? '读' : '',
      p.write ? '写' : '',
      p.execute ? '执行' : ''
    ].filter(Boolean)
    return `${label}：${bits.length ? bits.join('、') : '无权限'}`
  }

  const lines = [
    desc('所有者 (u)', owner),
    desc('所属组 (g)', group),
    desc('其他人 (o)', other)
  ]
  if (special.setuid) lines.push('特殊：setuid（执行时以文件所有者身份运行）')
  if (special.setgid) lines.push('特殊：setgid（执行时以文件所属组运行 / 目录继承组）')
  if (special.sticky) lines.push('特殊：sticky（目录内仅所有者可删自己的文件，如 /tmp）')
  return lines
}

export function isPresetActive(currentMode: number, presetOctal: string): boolean {
  const preset = parseOctal(presetOctal)
  if ('error' in preset) return false
  return currentMode === preset.mode
}

export function filterPresets(
  presets: readonly ChmodPreset[],
  group: PresetFilterKey,
  search: string
): ChmodPreset[] {
  const q = search.trim().toLowerCase()
  return presets.filter(p => {
    if (group !== 'all' && p.group !== group) return false
    if (!q) return true
    const hay = [p.name, p.octal, p.description, ...(p.tags || [])].join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function buildCommandItems(mode: number, targetPath: string) {
  const fileTarget = targetPath.trim() || 'file'
  const dirTarget = targetPath.trim() || 'dir'
  const octal = modeToOctal(mode)
  return [
    {
      id: 'octal',
      title: '八进制',
      desc: '最常用写法，直接按数字模式设置权限',
      command: modeToChmodOctalCommand(mode, fileTarget)
    },
    {
      id: 'symbolic',
      title: '符号式',
      desc: '按 u/g/o 赋值，可读性更好，便于只改某一类',
      command: modeToChmodSymbolicCommand(mode, fileTarget)
    },
    {
      id: 'recursive',
      title: '递归目录',
      desc: '对目录及其子文件全部生效（-R），操作前请确认路径',
      command: `chmod -R ${octal} ${dirTarget}`
    }
  ] as const
}
