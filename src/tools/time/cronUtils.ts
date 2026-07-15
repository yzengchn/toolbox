import { CronExpressionParser } from 'cron-parser'

export interface CronParseResult {
  expression: string
  normalized: string
  description: string
  fields: Array<{ label: string; value: string; meaning: string }>
  nextRuns: string[]
  isAlias: boolean
  aliasName?: string
}

export interface CronPreset {
  id: string
  expression: string
  title: string
  description: string
  group: 'frequent' | 'interval' | 'daily' | 'weekly' | 'monthly' | 'alias' | 'ops'
  tags?: string[]
}

export type CronPresetGroupKey = CronPreset['group'] | 'all'

/** 别名 → 6 位（秒 分 时 日 月 周，Quartz 风格：日/周互斥时用 ?） */
const ALIAS_TO_SIX: Record<string, string> = {
  '@yearly': '0 0 0 1 1 ?',
  '@annually': '0 0 0 1 1 ?',
  '@monthly': '0 0 0 1 * ?',
  '@weekly': '0 0 0 ? * 0',
  '@daily': '0 0 0 * * ?',
  '@midnight': '0 0 0 * * ?',
  '@hourly': '0 0 * * * ?',
  '@weekdays': '0 0 0 ? * 1-5',
  '@weekends': '0 0 0 ? * 0,6'
}

/**
 * 统一为 6 位，并按 Quartz 习惯处理日/周：
 * - 指定了「周」且「日」为 * → 日改为 ?
 * - 指定了「日」且「周」为 * → 周改为 ?
 * - 日、周都是具体值时保留（由用户/场景决定，解析器可能仍接受）
 * @reboot 保留别名
 */
export function toSixFieldCron(expression: string): string {
  const trimmed = expression.trim()
  if (!trimmed) return trimmed
  const lower = trimmed.toLowerCase()
  if (lower === '@reboot') return '@reboot'
  if (ALIAS_TO_SIX[lower]) return ALIAS_TO_SIX[lower]

  let parts = trimmed.split(/\s+/)
  if (parts.length === 5) parts = ['0', ...parts]
  if (parts.length !== 6) return trimmed

  // 秒 分 时 日 月 周
  const day = parts[3]
  const dow = parts[5]
  const dayConcrete = day !== '*' && day !== '?'
  const dowConcrete = dow !== '*' && dow !== '?'

  if (dowConcrete && day === '*') parts[3] = '?'
  else if (dayConcrete && dow === '*') parts[5] = '?'
  // 日、周都是 *（每天）时，周改为 ?，更贴近 Quartz 习惯
  else if (day === '*' && dow === '*') parts[5] = '?'

  return parts.join(' ')
}

export const CRON_PRESET_GROUPS: Array<{ key: CronPresetGroupKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'frequent', label: '高频' },
  { key: 'interval', label: '间隔' },
  { key: 'daily', label: '每天' },
  { key: 'weekly', label: '每周' },
  { key: 'monthly', label: '每月' },
  { key: 'alias', label: '别名' },
  { key: 'ops', label: '运维' }
]

const CRON_PRESETS_RAW: CronPreset[] = [
  // 高频
  {
    id: 'workday-9',
    expression: '0 0 9 * * 1-5',
    title: '工作日 09:00',
    description: '周一到周五上午 9 点（上班提醒、日报）',
    group: 'frequent',
    tags: ['工作日', '上班']
  },
  {
    id: 'every-5m',
    expression: '0 */5 * * * *',
    title: '每 5 分钟',
    description: '健康检查、轻量同步、队列巡检',
    group: 'frequent',
    tags: ['巡检']
  },
  {
    id: 'every-hour',
    expression: '0 0 * * * *',
    title: '每小时整点',
    description: '整点统计、缓存预热',
    group: 'frequent',
    tags: ['整点']
  },
  {
    id: 'midnight',
    expression: '0 0 0 * * *',
    title: '每天 00:00',
    description: '日切任务、日报汇总',
    group: 'frequent',
    tags: ['日切']
  },
  {
    id: 'workday-18',
    expression: '0 0 18 * * 1-5',
    title: '工作日 18:00',
    description: '下班汇总、当日报表',
    group: 'frequent',
    tags: ['工作日']
  },
  {
    id: 'noon',
    expression: '0 0 12 * * *',
    title: '每天 12:00',
    description: '午间任务、半日对账',
    group: 'frequent',
    tags: ['中午']
  },

  // 间隔
  {
    id: 'every-1m',
    expression: '0 * * * * *',
    title: '每分钟',
    description: '高频轮询（注意负载）',
    group: 'interval',
    tags: ['高频']
  },
  {
    id: 'every-10m',
    expression: '*/10 * * * *',
    title: '每 10 分钟',
    description: '中频巡检、指标采集',
    group: 'interval',
    tags: ['巡检']
  },
  {
    id: 'every-15m',
    expression: '*/15 * * * *',
    title: '每 15 分钟',
    description: '常见监控间隔',
    group: 'interval',
    tags: ['监控']
  },
  {
    id: 'every-30m',
    expression: '*/30 * * * *',
    title: '每 30 分钟',
    description: '半小时批处理',
    group: 'interval',
    tags: ['批处理']
  },
  {
    id: 'every-2h',
    expression: '0 */2 * * *',
    title: '每 2 小时',
    description: '低频同步、报表预计算',
    group: 'interval',
    tags: ['同步']
  },
  {
    id: 'every-6h',
    expression: '0 */6 * * *',
    title: '每 6 小时',
    description: '四次/日的例行任务',
    group: 'interval',
    tags: ['例行']
  },
  {
    id: 'at-minute-0-30',
    expression: '0,30 * * * *',
    title: '每小时 0/30 分',
    description: '整点与半点各跑一次',
    group: 'interval',
    tags: ['半点']
  },
  {
    id: 'sec-every-30',
    expression: '*/30 * * * * *',
    title: '每 30 秒（6 位）',
    description: '带秒字段的高频任务（部分调度器支持）',
    group: 'interval',
    tags: ['秒级']
  },

  // 每天
  {
    id: 'daily-1am',
    expression: '0 1 * * *',
    title: '每天 01:00',
    description: '夜间备份、低峰批处理',
    group: 'daily',
    tags: ['备份']
  },
  {
    id: 'daily-2am',
    expression: '0 2 * * *',
    title: '每天 02:00',
    description: '日志切割、冷数据归档',
    group: 'daily',
    tags: ['日志']
  },
  {
    id: 'daily-3-30',
    expression: '30 3 * * *',
    title: '每天 03:30',
    description: '避开整点高峰的夜间任务',
    group: 'daily',
    tags: ['夜间']
  },
  {
    id: 'daily-8-30',
    expression: '30 8 * * *',
    title: '每天 08:30',
    description: '早间通知、开盘前准备',
    group: 'daily',
    tags: ['早间']
  },
  {
    id: 'daily-9-to-18',
    expression: '0 9-18 * * *',
    title: '每天 9–18 点整点',
    description: '营业时段每小时一次',
    group: 'daily',
    tags: ['营业']
  },
  {
    id: 'daily-work-hours-15m',
    expression: '*/15 9-18 * * 1-5',
    title: '工作日 9–18 点每 15 分',
    description: '工作时段中频巡检',
    group: 'daily',
    tags: ['工作日', '巡检']
  },

  // 每周
  {
    id: 'monday-9',
    expression: '0 9 * * 1',
    title: '每周一 09:00',
    description: '周报、周会前提醒',
    group: 'weekly',
    tags: ['周报']
  },
  {
    id: 'friday-18',
    expression: '0 18 * * 5',
    title: '每周五 18:00',
    description: '周结、周末前清理',
    group: 'weekly',
    tags: ['周结']
  },
  {
    id: 'weekend-10',
    expression: '0 10 * * 0,6',
    title: '周末 10:00',
    description: '周六日上午任务（0=周日）',
    group: 'weekly',
    tags: ['周末']
  },
  {
    id: 'sun-midnight',
    expression: '0 0 * * 0',
    title: '每周日 00:00',
    description: '周维度归档、清理',
    group: 'weekly',
    tags: ['归档']
  },
  {
    id: 'wed-14',
    expression: '0 14 * * 3',
    title: '每周三 14:00',
    description: '周中例会/发布窗口',
    group: 'weekly',
    tags: ['例会']
  },

  // 每月
  {
    id: 'month-1st',
    expression: '0 0 1 * *',
    title: '每月 1 日 00:00',
    description: '月结、账单生成',
    group: 'monthly',
    tags: ['月结']
  },
  {
    id: 'month-last-approx',
    expression: '0 23 28-31 * *',
    title: '每月末附近 23:00',
    description: '近似月末（需业务再判断是否真月末）',
    group: 'monthly',
    tags: ['月末']
  },
  {
    id: 'month-15',
    expression: '0 9 15 * *',
    title: '每月 15 日 09:00',
    description: '月中对账、发薪提醒',
    group: 'monthly',
    tags: ['月中']
  },
  {
    id: 'quarter-ish',
    expression: '0 0 1 1,4,7,10 *',
    title: '每季度首日 00:00',
    description: '1/4/7/10 月 1 日（近似季度）',
    group: 'monthly',
    tags: ['季度']
  },
  {
    id: 'year-start',
    expression: '0 0 1 1 *',
    title: '每年 1 月 1 日',
    description: '年度任务、证书/合同提醒',
    group: 'monthly',
    tags: ['年度']
  },

  // 别名
  {
    id: 'alias-yearly',
    expression: '@yearly',
    title: '@yearly',
    description: '每年一次（等价 0 0 1 1 *）',
    group: 'alias',
    tags: ['别名']
  },
  {
    id: 'alias-monthly',
    expression: '@monthly',
    title: '@monthly',
    description: '每月一次（等价 0 0 1 * *）',
    group: 'alias',
    tags: ['别名']
  },
  {
    id: 'alias-weekly',
    expression: '@weekly',
    title: '@weekly',
    description: '每周一次（等价 0 0 * * 0）',
    group: 'alias',
    tags: ['别名']
  },
  {
    id: 'alias-daily',
    expression: '@daily',
    title: '@daily',
    description: '每天一次（等价 0 0 * * *）',
    group: 'alias',
    tags: ['别名']
  },
  {
    id: 'alias-hourly',
    expression: '@hourly',
    title: '@hourly',
    description: '每小时一次（等价 0 * * * *）',
    group: 'alias',
    tags: ['别名']
  },
  {
    id: 'alias-reboot',
    expression: '@reboot',
    title: '@reboot',
    description: '开机时执行（依赖 cron 实现，解析下次时间可能不可用）',
    group: 'alias',
    tags: ['开机']
  },

  // 运维场景
  {
    id: 'ops-backup-night',
    expression: '0 2 * * *',
    title: '数据库夜间备份',
    description: '每天 02:00 备份（低峰）',
    group: 'ops',
    tags: ['备份', 'DB']
  },
  {
    id: 'ops-logrotate',
    expression: '0 0 0 * * *',
    title: '日志切割',
    description: '每天 0 点切割/压缩日志',
    group: 'ops',
    tags: ['日志']
  },
  {
    id: 'ops-cert-check',
    expression: '0 8 * * 1',
    title: '证书到期检查',
    description: '每周一 08:00 检查 SSL 到期',
    group: 'ops',
    tags: ['证书']
  },
  {
    id: 'ops-clean-tmp',
    expression: '0 4 * * 0',
    title: '清理临时目录',
    description: '每周日 04:00 清理 /tmp 或缓存',
    group: 'ops',
    tags: ['清理']
  },
  {
    id: 'ops-health-1m',
    expression: '*/1 * * * *',
    title: '服务探活',
    description: '每分钟探活（也可改 */5）',
    group: 'ops',
    tags: ['探活']
  },
  {
    id: 'ops-report-workday',
    expression: '0 0 9 * * 1-5',
    title: '工作日报',
    description: '工作日早上推送业务日报',
    group: 'ops',
    tags: ['报表']
  },
  {
    id: 'ops-sync-offpeak',
    expression: '0 1,13 * * *',
    title: '全量同步 2 次/日',
    description: '01:00 与 13:00 各同步一次',
    group: 'ops',
    tags: ['同步']
  },
  {
    id: 'ops-k8s-cronjob',
    expression: '0 */6 * * *',
    title: 'K8s CronJob 示例',
    description: '每 6 小时（集群时区注意 UTC）',
    group: 'ops',
    tags: ['K8s']
  },

  // 更多高频 / 业务
  {
    id: 'workday-930',
    expression: '30 9 * * 1-5',
    title: '工作日 09:30',
    description: '开盘后/晨会后任务',
    group: 'frequent',
    tags: ['工作日']
  },
  {
    id: 'workday-12-30',
    expression: '30 12 * * 1-5',
    title: '工作日 12:30',
    description: '午间批处理、半日汇总',
    group: 'frequent',
    tags: ['工作日', '中午']
  },
  {
    id: 'every-20m',
    expression: '*/20 * * * *',
    title: '每 20 分钟',
    description: '中低频轮询',
    group: 'interval',
    tags: ['轮询']
  },
  {
    id: 'every-3h',
    expression: '0 */3 * * *',
    title: '每 3 小时',
    description: '日间多次同步',
    group: 'interval',
    tags: ['同步']
  },
  {
    id: 'every-12h',
    expression: '0 0,12 * * *',
    title: '每天 0/12 点',
    description: '半日两次例行任务',
    group: 'interval',
    tags: ['半日']
  },
  {
    id: 'biz-hours-hour',
    expression: '0 9-17 * * 1-5',
    title: '工作日 9–17 整点',
    description: '工作时段每小时（不含 18 点）',
    group: 'daily',
    tags: ['工作日', '营业']
  },
  {
    id: 'nightly-batch-window',
    expression: '0 0-5 * * *',
    title: '每天 0–5 点整点',
    description: '夜间窗口批处理',
    group: 'daily',
    tags: ['夜间', '批处理']
  },
  {
    id: 'odd-hours',
    expression: '0 1-23/2 * * *',
    title: '奇数整点',
    description: '1,3,5…23 点执行',
    group: 'interval',
    tags: ['错峰']
  },
  {
    id: 'even-hours',
    expression: '0 0-22/2 * * *',
    title: '偶数整点',
    description: '0,2,4…22 点执行',
    group: 'interval',
    tags: ['错峰']
  },
  {
    id: 'tue-thu-10',
    expression: '0 10 * * 2,4',
    title: '周二/四 10:00',
    description: '隔日例会、双次发布窗口',
    group: 'weekly',
    tags: ['例会']
  },
  {
    id: 'mon-wed-fri-9',
    expression: '0 9 * * 1,3,5',
    title: '一三五 09:00',
    description: '隔日晨间任务',
    group: 'weekly',
    tags: ['隔日']
  },
  {
    id: 'sat-2am',
    expression: '0 2 * * 6',
    title: '每周六 02:00',
    description: '周末低峰全量任务',
    group: 'weekly',
    tags: ['周末', '全量']
  },
  {
    id: 'month-first-workday-approx',
    expression: '0 9 1-3 * 1',
    title: '月初周一 09:00',
    description: '近似「月初第一个工作日」（需业务复核）',
    group: 'monthly',
    tags: ['月初', '近似']
  },
  {
    id: 'month-25',
    expression: '0 10 25 * *',
    title: '每月 25 日 10:00',
    description: '发薪/账单提醒常见日',
    group: 'monthly',
    tags: ['发薪']
  },
  {
    id: 'biweekly-mon',
    expression: '0 9 1-7,15-21 * 1',
    title: '双周周一近似',
    description: '1–7 与 15–21 日的周一（近似双周）',
    group: 'monthly',
    tags: ['双周', '近似']
  },
  {
    id: 'year-end',
    expression: '0 23 31 12 *',
    title: '每年 12 月 31 日 23:00',
    description: '年终收口、年度归档',
    group: 'monthly',
    tags: ['年终']
  },
  {
    id: 'alias-midnight',
    expression: '@midnight',
    title: '@midnight',
    description: '同 @daily：每天 00:00',
    group: 'alias',
    tags: ['别名']
  },
  {
    id: 'alias-annually',
    expression: '@annually',
    title: '@annually',
    description: '同 @yearly：每年 1 月 1 日',
    group: 'alias',
    tags: ['别名']
  },

  // 运维 / 数据 / 发布
  {
    id: 'ops-redis-bgsave',
    expression: '0 3 * * *',
    title: 'Redis 夜间持久化',
    description: '每天 03:00 触发备份类任务',
    group: 'ops',
    tags: ['Redis', '备份']
  },
  {
    id: 'ops-es-snapshot',
    expression: '0 1 * * *',
    title: 'ES / 搜索快照',
    description: '每天 01:00 索引快照',
    group: 'ops',
    tags: ['ES', '快照']
  },
  {
    id: 'ops-cdn-purge-offpeak',
    expression: '0 4 * * 1',
    title: 'CDN 缓存清理',
    description: '每周一 04:00 低峰清理',
    group: 'ops',
    tags: ['CDN']
  },
  {
    id: 'ops-disk-usage',
    expression: '0 */4 * * *',
    title: '磁盘容量巡检',
    description: '每 4 小时检查磁盘/inode',
    group: 'ops',
    tags: ['磁盘', '巡检']
  },
  {
    id: 'ops-ssl-daily',
    expression: '0 7 * * *',
    title: '证书每日巡检',
    description: '每天 07:00 检查到期与续期状态',
    group: 'ops',
    tags: ['证书']
  },
  {
    id: 'ops-db-vacuum',
    expression: '0 3 * * 0',
    title: '数据库维护窗口',
    description: '每周日 03:00 vacuum/optimize',
    group: 'ops',
    tags: ['DB', '维护']
  },
  {
    id: 'ops-queue-drain',
    expression: '*/2 * * * *',
    title: '队列积压检查',
    description: '每 2 分钟检查队列深度',
    group: 'ops',
    tags: ['队列']
  },
  {
    id: 'ops-deploy-freeze-check',
    expression: '0 17 * * 5',
    title: '发布冻结提醒',
    description: '周五 17:00 提醒进入冻结窗口',
    group: 'ops',
    tags: ['发布']
  },
  {
    id: 'ops-metrics-rollup',
    expression: '5 * * * *',
    title: '指标整点后汇总',
    description: '每小时过 5 分 rollup（错开整点）',
    group: 'ops',
    tags: ['监控', '错峰']
  },
  {
    id: 'ops-backup-verify',
    expression: '0 6 * * *',
    title: '备份校验',
    description: '每天 06:00 校验昨夜备份可用性',
    group: 'ops',
    tags: ['备份', '校验']
  },
  {
    id: 'ops-session-cleanup',
    expression: '0 4 * * *',
    title: '会话/Token 清理',
    description: '每天 04:00 清理过期会话',
    group: 'ops',
    tags: ['清理']
  },
  {
    id: 'ops-rate-limit-report',
    expression: '0 9 * * 1',
    title: '限流/风控周报',
    description: '每周一 09:00 汇总拦截数据',
    group: 'ops',
    tags: ['风控', '报表']
  },
  {
    id: 'ops-jenkins-nightly',
    expression: '0 1 * * *',
    title: 'CI 夜间构建',
    description: '每天 01:00 全量构建/回归',
    group: 'ops',
    tags: ['CI']
  },
  {
    id: 'ops-helm-drift',
    expression: '0 10 * * 1-5',
    title: '配置漂移检查',
    description: '工作日 10:00 GitOps/配置对账',
    group: 'ops',
    tags: ['GitOps']
  },
  {
    id: 'sec-every-10',
    expression: '*/10 * * * * *',
    title: '每 10 秒（6 位）',
    description: '秒级调度（Quartz/部分框架）',
    group: 'interval',
    tags: ['秒级']
  },
  {
    id: 'at-second-0',
    expression: '0 * * * * *',
    title: '每分钟第 0 秒',
    description: '每分钟整秒触发',
    group: 'interval',
    tags: ['秒级']
  }
]

/** 展示/点击统一为 6 位（秒 分 时 日 月 周）；@reboot 除外 */
export const CRON_PRESETS: CronPreset[] = CRON_PRESETS_RAW.map(preset => {
  const six = toSixFieldCron(preset.expression)
  const lower = preset.expression.trim().toLowerCase()
  let description = preset.description
  if (preset.group === 'alias' && lower !== '@reboot') {
    description = `${preset.title} → ${six}`
  }
  return {
    ...preset,
    expression: six,
    description
  }
})

export const CRON_PRESET_GROUP_COUNTS = CRON_PRESETS.reduce(
  (counts, preset) => {
    counts[preset.group] = (counts[preset.group] || 0) + 1
    return counts
  },
  {} as Record<CronPreset['group'], number>
)

/** 输入区快捷芯片（6 位，日/周互斥用 ?） */
export const CRON_QUICK_PRESETS = [
  { label: '每 5 分钟', expression: '0 */5 * * * ?' },
  { label: '每小时', expression: '0 0 * * * ?' },
  { label: '每天 0 点', expression: '0 0 0 * * ?' },
  { label: '工作日 9 点', expression: '0 0 9 ? * 1-5' },
  { label: '每月 25 日', expression: '0 0 10 25 * ?' },
  { label: '每分钟', expression: '0 * * * * ?' }
] as const

/** 右侧格式说明卡片 */
export const CRON_FORMAT_TIPS: Array<{ title: string; items: string[] }> = [
  {
    title: '字段顺序',
    items: [
      '常用 6 位：秒 分 时 日 月 周',
      '也支持 5 位，自动补秒为 0',
      'Linux 多为 5 位，Quartz 用 6 位'
    ]
  },
  {
    title: '日与周',
    items: [
      '日、周不要同时用 * 或具体值',
      '按周：日写 ?，如 0 0 9 ? * 1-5',
      '按日：周写 ?，如 0 0 10 25 * ?'
    ]
  },
  {
    title: '取值与别名',
    items: [
      '* 任意；? 不指定；*/n 步进',
      '@hourly / @daily / @weekly 见对照',
      '@monthly / @yearly；@reboot 开机'
    ]
  },
  {
    title: '注意',
    items: [
      '周：0/7 周日，1–6 周一到周六',
      '日+周双指定语义因实现而异',
      '下次时间按本地时区计算'
    ]
  }
]

/** 底部字段速查 */
export const CRON_CHEAT_SHEET = [
  { field: '秒', range: '0–59', note: '6 位第 1 段；常用配置默认 0' },
  { field: '分', range: '0–59', note: '*/5 = 每隔 5 分钟' },
  { field: '时', range: '0–23', note: '9-18 = 9 点到 18 点' },
  { field: '日', range: '1–31 / ?', note: '指定周时用 ?；指定日期时写数字' },
  { field: '月', range: '1–12', note: '可用 JAN–DEC' },
  { field: '周', range: '0–7 / ?', note: '指定日期时用 ?；0/7=周日' }
] as const

export const DEFAULT_CRON_EXPRESSION = '0 0 9 ? * 1-5'
export const CRON_NEXT_RUN_COUNT = 5

export function formatCronParseResult(result: CronParseResult): string {
  const lines = [
    `表达式: ${result.expression}`,
    `标准化: ${result.normalized}`,
    `说明: ${result.description}`,
    ...(result.fields.length
      ? ['字段:', ...result.fields.map(f => `  ${f.label}=${f.value} (${f.meaning})`)]
      : []),
    '接下来执行时间:',
    ...(result.nextRuns.length
      ? result.nextRuns.map((run, index) => `  #${index + 1} ${run}`)
      : ['  （无）'])
  ]
  return lines.join('\n')
}

const CRON_FIELD_LABELS = ['秒', '分', '时', '日', '月', '周'] as const

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

const WEEKDAY_NAMES_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const ALIAS_MAP: Record<string, string> = { ...ALIAS_TO_SIX }

function describeCronValue(field: string, unit: string): string {
  if (field === '?') return `不指定${unit}`
  if (field === '*') return `每${unit}`

  if (field.includes('/')) {
    const [base, step] = field.split('/')
    if (base === '*' || base === '?') return `每隔 ${step}${unit}`
    if (base.includes('-')) {
      const [start, end] = base.split('-')
      return `${start}–${end} 范围内每隔 ${step}${unit}`
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

function humanizeMonthToken(token: string): string {
  return MONTH_LABELS[token.toLowerCase()] ?? token
}

function humanizeWeekToken(token: string): string {
  return DAY_OF_WEEK_LABELS[token.toLowerCase()] ?? token
}

function describeMonthField(field: string): string {
  if (field === '?' || field === '*') return field === '?' ? '不指定月' : '每月'
  if (field.includes('/')) {
    const [base, step] = field.split('/')
    if (base === '*' || base === '?') return `每隔 ${step} 个月`
    return `${base} 起每隔 ${step} 个月`
  }
  return field
    .split(',')
    .map(part => {
      const token = part.trim()
      if (token.includes('-')) {
        const [start, end] = token.split('-')
        return `${humanizeMonthToken(start)} 到 ${humanizeMonthToken(end)}`
      }
      return humanizeMonthToken(token)
    })
    .join('、')
}

function describeWeekField(field: string): string {
  if (field === '?') return '不指定周（由「日」决定）'
  if (field === '*') return '每周每天'
  if (field.includes('/')) {
    const [base, step] = field.split('/')
    if (base === '*' || base === '?') return `每隔 ${step} 天（按周域）`
    return `${base} 起每隔 ${step} 天（按周域）`
  }
  return field
    .split(',')
    .map(part => {
      const token = part.trim()
      if (token.includes('-')) {
        const [start, end] = token.split('-')
        return `${humanizeWeekToken(start)} 到 ${humanizeWeekToken(end)}`
      }
      return humanizeWeekToken(token)
    })
    .join('、')
}

function describeField(field: string, index: number): string {
  // 日
  if (index === 3) {
    if (field === '?') return '不指定日（由「周」决定）'
    if (field === '*') return '每日'
    return describeCronValue(field, '日')
  }
  if (index === 4) return describeMonthField(field)
  if (index === 5) return describeWeekField(field)
  return describeCronValue(field, CRON_FIELD_LABELS[index])
}

function buildFields(parts: string[]) {
  return parts.map((value, index) => ({
    label: CRON_FIELD_LABELS[index],
    value,
    meaning: describeField(value, index)
  }))
}

function buildCronDescription(parts: string[]): string {
  return buildFields(parts)
    .map(f => `${f.label}: ${f.meaning}`)
    .join(' | ')
}

function normalizeCronParts(expression: string): string[] {
  const fields = expression.trim().split(/\s+/)
  if (fields.length === 5) return ['0', ...fields]
  if (fields.length === 6) return fields
  throw new Error('Cron 表达式必须是 5 位或 6 位（或使用 @daily 等别名）')
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
  const weekday = WEEKDAY_NAMES_ZH[date.getDay()]
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${weekday}`
}

function resolveAlias(input: string): { expression: string; aliasName?: string } {
  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()
  if (ALIAS_MAP[lower]) {
    return { expression: ALIAS_MAP[lower], aliasName: lower }
  }
  return { expression: trimmed }
}

export function filterCronPresets(
  group: CronPresetGroupKey,
  search: string
): CronPreset[] {
  const q = search.trim().toLowerCase()
  return CRON_PRESETS.filter(p => {
    if (group !== 'all' && p.group !== group) return false
    if (!q) return true
    const hay = [p.title, p.expression, p.description, ...(p.tags || [])]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function isCronPresetActive(current: string, presetExpr: string): boolean {
  return toSixFieldCron(current).toLowerCase() === toSixFieldCron(presetExpr).toLowerCase()
}

export function parseCronExpression(input: string, count = 5): CronParseResult {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('请输入 Cron 表达式')

  if (trimmed.toLowerCase() === '@reboot') {
    return {
      expression: trimmed,
      normalized: '@reboot',
      description: '系统启动时执行一次（非周期调度，无固定下次时间）',
      fields: [],
      nextRuns: [],
      isAlias: true,
      aliasName: '@reboot'
    }
  }

  const { expression, aliasName } = resolveAlias(trimmed)

  try {
    const cron = CronExpressionParser.parse(trimmed)
    const normalized = cron.stringify(true)
    const parts = normalizeCronParts(normalized)

    let nextRuns: string[] = []
    try {
      nextRuns = cron.take(count).map(date => formatCronDate(date.toDate()))
    } catch {
      nextRuns = []
    }

    return {
      expression: trimmed,
      normalized,
      description: buildCronDescription(parts),
      fields: buildFields(parts),
      nextRuns,
      isAlias: Boolean(aliasName),
      aliasName
    }
  } catch (err) {
    // 别名已映射但仍失败时，给更友好的错误
    if (aliasName) {
      throw new Error(`无法解析别名 ${aliasName}（等价 ${expression}）: ${(err as Error).message}`)
    }
    throw new Error((err as Error).message || 'Cron 表达式无效')
  }
}
