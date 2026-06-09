import { defineAsyncComponent, type Component } from 'vue'

const loadFormatterTools = () => import('./components')

const JsonFormatter = defineAsyncComponent(() => loadFormatterTools().then(module => module.JsonFormatter))
const SqlFormatter = defineAsyncComponent(() => loadFormatterTools().then(module => module.SqlFormatter))
const XmlFormatter = defineAsyncComponent(() => loadFormatterTools().then(module => module.XmlFormatter))

export const formatterToolComponents = {
  'json-formatter': JsonFormatter,
  'sql-formatter': SqlFormatter,
  'xml-formatter': XmlFormatter
} satisfies Record<string, Component>
