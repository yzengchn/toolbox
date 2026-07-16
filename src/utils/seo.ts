const SITE_ORIGIN = 'https://tools.neocockpit.cn'
const DEFAULT_IMAGE = `${SITE_ORIGIN}/logo-icon.png`

export const siteConfig = {
  origin: SITE_ORIGIN,
  name: 'ToolBox',
  title: 'ToolBox 在线工具 - 开发者工具箱 DevTool',
  description:
    'ToolBox 是面向开发者的在线工具箱，提供 JSON、SQL、XML 格式化，Base64、JWT、Hash、URL 编码解码，时间戳转换、Cron 解析、正则表达式，Nginx 配置器、chmod 权限计算器，CIDR 网段与端口扫描，文本比较、文件去重与树形目录，以及车联网报文解析、CAN/J1939 解码、OCPP 报文校验、VIN 解析等 DevTool 工具。',
  keywords: [
    '在线工具',
    '开发者工具',
    'DevTool',
    'DevTools',
    'ToolBox',
    '开发工具箱',
    '在线开发工具',
    'JSON格式化',
    'SQL格式化',
    'Base64编码',
    'JWT解码',
    'Hash计算',
    'URL编码',
    '时间戳转换',
    'Cron解析',
    'Cron表达式',
    '正则表达式',
    '正则测试',
    'Regex测试',
    '正则匹配',
    'Nginx配置',
    'Nginx配置器',
    'chmod计算器',
    '文件权限',
    '文本比较',
    '文件去重',
    '树形目录',
    'CIDR 网段计算器',
    'CIDR计算器',
    '子网计算器',
    '端口扫描',
    '密码生成器',
    'UUID生成器',
    '运维工具',
    '车联网工具',
    '车联网报文解析',
    '车联网报文构造',
    'JT808解析',
    'JT809解析',
    'JT1078解析',
    'GB32960解析',
    'GB/T 32960解析',
    'GB/T 27930解析',
    'OCPP报文校验',
    'CAN解码',
    'J1939解码',
    'J1939 PGN计算器',
    'DBC信号解析',
    'CAN信号分析',
    'OBD诊断',
    'UDS诊断',
    'VIN解析',
    '车架号校验',
    '轨迹点分析',
    '坐标系转换',
    'GeoHash编码',
    '车联网日志分析'
  ]
} as const

type SeoOptions = {
  title?: string
  description?: string
  keywords?: readonly string[]
  path?: string
  type?: 'website' | 'article'
  image?: string
  jsonLd?: Record<string, unknown>
}

export const getAbsoluteUrl = (path = '/') => {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  if (path === '/' || path === '') {
    return SITE_ORIGIN
  }

  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attribute, key)
    document.head.appendChild(meta)
  }

  meta.setAttribute('content', content)
}

const setCanonical = (href: string) => {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }

  link.setAttribute('href', href)
}

const setJsonLd = (id: string, data: Record<string, unknown>) => {
  let script = document.querySelector<HTMLScriptElement>(`script#${id}`)

  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  script.textContent = JSON.stringify(data)
}

export const setSeo = ({
  title = siteConfig.title,
  description = siteConfig.description,
  keywords = siteConfig.keywords,
  path = '/',
  type = 'website',
  image = DEFAULT_IMAGE,
  jsonLd
}: SeoOptions = {}) => {
  const url = getAbsoluteUrl(path)
  const keywordContent = keywords.join(',')

  document.title = title
  setCanonical(url)

  setMeta('name', 'description', description)
  setMeta('name', 'keywords', keywordContent)
  setMeta('name', 'robots', 'index, follow, max-image-preview:large')

  setMeta('property', 'og:type', type)
  setMeta('property', 'og:site_name', siteConfig.name)
  setMeta('property', 'og:locale', 'zh_CN')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)

  setMeta('name', 'twitter:card', 'summary')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image)

  if (jsonLd) {
    setJsonLd('page-jsonld', jsonLd)
  }
}
