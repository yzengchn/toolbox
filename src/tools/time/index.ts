import { defineAsyncComponent, type Component } from 'vue'

const CronParser = defineAsyncComponent(() => import('./CronParser.vue'))
const TimestampConverter = defineAsyncComponent(() => import('./TimestampConverter.vue'))

export const timeToolComponents = {
  'timestamp-converter': TimestampConverter,
  'cron-parser': CronParser
} satisfies Record<string, Component>
