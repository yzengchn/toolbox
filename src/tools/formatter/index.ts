import { defineAsyncComponent, type Component } from 'vue'

const JsonFormatter = defineAsyncComponent(() => import('./JsonFormatter.vue'))
const SqlFormatter = defineAsyncComponent(() => import('./SqlFormatter.vue'))
const XmlFormatter = defineAsyncComponent(() => import('./XmlFormatter.vue'))

export const formatterToolComponents = {
  'json-formatter': JsonFormatter,
  'sql-formatter': SqlFormatter,
  'xml-formatter': XmlFormatter
} satisfies Record<string, Component>
