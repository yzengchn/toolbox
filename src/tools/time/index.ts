import { defineAsyncComponent, type Component } from 'vue'

const loadTimeTools = () => import('./components')

const CronParser = defineAsyncComponent(() => loadTimeTools().then(module => module.CronParser))
const TimestampConverter = defineAsyncComponent(() => loadTimeTools().then(module => module.TimestampConverter))

export const timeToolComponents = {
  'timestamp-converter': TimestampConverter,
  'cron-parser': CronParser
} satisfies Record<string, Component>
