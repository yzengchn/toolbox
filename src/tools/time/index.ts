import type { Tool } from '@/types'
import TimestampConverter from './TimestampConverter.vue'
import CronParser from './CronParser.vue'

export const timeTools: Tool[] = [
  {
    id: 'timestamp-converter',
    name: '时间戳转换',
    description: '在时间戳、本地时间、UTC 和 ISO 8601 之间快速转换',
    icon: 'mdi:clock-time-four-outline',
    category: 'time',
    keywords: ['timestamp', 'time', 'date', '时间戳', '时间', '日期', 'unix'],
    component: TimestampConverter,
    path: '/tool/timestamp-converter'
  },
  {
    id: 'cron-parser',
    name: 'Cron 表达式解析',
    description: '校验 Cron 表达式并查看标准化结果与下一次执行时间',
    icon: 'mdi:calendar-clock-outline',
    category: 'time',
    keywords: ['cron', 'schedule', 'parser', '解析', '定时', '计划任务'],
    component: CronParser,
    path: '/tool/cron-parser'
  }
]
