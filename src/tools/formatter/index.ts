import type { Tool } from '@/types'
import JsonFormatter from './JsonFormatter.vue'
import SqlFormatter from './SqlFormatter.vue'
import XmlFormatter from './XmlFormatter.vue'

export const formatterTools: Tool[] = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    description: '格式化、压缩和验证 JSON 数据',
    icon: 'mdi:code-json',
    category: 'formatter',
    keywords: ['json', 'format', '格式化', '压缩', '验证'],
    component: JsonFormatter,
    path: '/tool/json-formatter'
  },
  {
    id: 'sql-formatter',
    name: 'SQL 格式化',
    description: '格式化 SQL 查询语句',
    icon: 'mdi:database',
    category: 'formatter',
    keywords: ['sql', 'format', '格式化', 'mysql', 'postgresql'],
    component: SqlFormatter,
    path: '/tool/sql-formatter'
  },
  {
    id: 'xml-formatter',
    name: 'XML/HTML 格式化',
    description: '格式化 XML 和 HTML 代码',
    icon: 'mdi:xml',
    category: 'formatter',
    keywords: ['xml', 'html', 'format', '格式化', '压缩'],
    component: XmlFormatter,
    path: '/tool/xml-formatter'
  }
]
