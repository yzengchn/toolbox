/** 正则表达式测试（纯前端，JavaScript RegExp） */

export type RegexFlag = 'd' | 'g' | 'i' | 'm' | 's' | 'u' | 'v' | 'y'

export type RegexPresetGroup =
  | 'common'
  | 'web'
  | 'china'
  | 'text'
  | 'code'
  | 'validate'

export interface RegexExample {
  id: string
  label: string
  pattern: string
  flags: RegexFlag[]
  replacement: string
  text: string
  group: RegexPresetGroup
  description?: string
  tags?: string[]
}

export const REGEX_FLAG_OPTIONS: Array<{
  value: RegexFlag
  label: string
  tip: string
  /** 面向新手的短说明 */
  simple: string
  /** 是否默认展示（进阶 flag 可折叠） */
  primary?: boolean
}> = [
  { value: 'g', label: 'g 全局', tip: '匹配全部，而非只找第一处', simple: '找全部，不只第一个', primary: true },
  { value: 'i', label: 'i 忽略大小写', tip: 'A 与 a 等价', simple: '不区分大小写', primary: true },
  { value: 'm', label: 'm 多行', tip: '^ / $ 匹配每行首尾', simple: '按行匹配开头/结尾', primary: true },
  { value: 's', label: 's 点匹配换行', tip: '. 可匹配 \\n', simple: '点号也能匹配换行', primary: true },
  { value: 'u', label: 'u Unicode', tip: '正确处理 Unicode 码点', simple: '更好支持中文/emoji' },
  { value: 'y', label: 'y 粘连', tip: '从 lastIndex 位置开始匹配', simple: '从指定位置接着匹配' },
  { value: 'd', label: 'd 索引', tip: '提供 indices（部分环境支持）', simple: '额外记录匹配位置' },
  { value: 'v', label: 'v Unicode 集', tip: '更强的 Unicode 属性（较新引擎）', simple: '新版 Unicode 语法' }
]

export const REGEX_PRESET_GROUPS: Array<{ key: RegexPresetGroup | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'common', label: '常用' },
  { key: 'web', label: 'Web' },
  { key: 'china', label: '国内' },
  { key: 'text', label: '文本' },
  { key: 'code', label: '代码' },
  { key: 'validate', label: '校验' }
]

/** 新手：点一下插入一段正则碎片 */
export interface RegexSnippet {
  id: string
  label: string
  insert: string
  description: string
  example?: string
}

export const REGEX_BUILDER_SNIPPETS: RegexSnippet[] = [
  { id: 'digit', label: '数字', insert: '\\d', description: '任意一位数字 0–9', example: '\\d\\d\\d' },
  { id: 'word', label: '字母数字_', insert: '\\w', description: '字母、数字或下划线', example: '\\w+' },
  { id: 'space', label: '空白', insert: '\\s', description: '空格、Tab、换行等', example: '\\s+' },
  { id: 'any', label: '任意字符', insert: '.', description: '任意一个字符（默认不含换行）', example: 'a.c' },
  { id: 'zh', label: '中文', insert: '[\\u4e00-\\u9fa5]', description: '一个汉字', example: '[\\u4e00-\\u9fa5]+' },
  { id: 'one-more', label: '1个或多个', insert: '+', description: '前面的内容至少出现 1 次', example: '\\d+' },
  { id: 'zero-more', label: '0个或多个', insert: '*', description: '前面的内容可出现任意次', example: '\\s*' },
  { id: 'optional', label: '可有可无', insert: '?', description: '前面的内容 0 或 1 次', example: 'https?' },
  { id: 'start', label: '开头', insert: '^', description: '从文本（或行）开头匹配', example: '^hello' },
  { id: 'end', label: '结尾', insert: '$', description: '匹配到文本（或行）结尾', example: 'end$' },
  { id: 'or', label: '或者', insert: '|', description: '左右二选一', example: 'yes|no' },
  { id: 'group', label: '分组', insert: '()', description: '括号分组，便于替换时用 $1', example: '(\\d+)-(\\d+)' },
  { id: 'class', label: '多选一字符', insert: '[]', description: '方括号里任选一个字符', example: '[abc]' },
  { id: 'not-class', label: '排除字符', insert: '[^]', description: '不在方括号里的字符', example: '[^0-9]' },
  { id: 'range-n', label: '重复 n 次', insert: '{n}', description: '刚好重复 n 次', example: '\\d{11}' },
  { id: 'range-nm', label: '重复 n–m 次', insert: '{n,m}', description: '重复 n 到 m 次', example: '\\d{3,4}' },
  { id: 'boundary', label: '单词边界', insert: '\\b', description: '单词边缘，避免半截匹配', example: '\\bcat\\b' },
  { id: 'escape-dot', label: '普通点号', insert: '\\.', description: '匹配真正的小数点 .', example: '\\d+\\.\\d+' }
]

/** 场景向导：选目标 → 一键套模板 */
export interface RegexWizardGoal {
  id: string
  title: string
  description: string
  /** 对应 REGEX_COMMON_PATTERNS 的 id，或内联配置 */
  presetId?: string
  pattern?: string
  flags?: RegexFlag[]
  replacement?: string
  text?: string
  explain: string[]
}

export const REGEX_WIZARD_GOALS: RegexWizardGoal[] = [
  {
    id: 'find-email',
    title: '找出邮箱',
    description: '从一段文字里标出所有邮箱',
    presetId: 'email',
    explain: [
      '用 @ 把用户名和域名分开',
      'g：找全部；i：不区分大小写',
      '替换可用 $<name> 等命名分组'
    ]
  },
  {
    id: 'find-phone',
    title: '找出手机号',
    description: '匹配中国大陆 11 位手机号',
    presetId: 'cn-mobile',
    explain: ['1 开头，第二位 3–9', '后面再跟 9 位数字', '建议开 g 找全部']
  },
  {
    id: 'find-url',
    title: '找出链接',
    description: '匹配 http/https 网址',
    presetId: 'url',
    explain: ['以 http:// 或 https:// 开头', '可含端口和路径', '复杂 URL 可能需再收紧规则']
  },
  {
    id: 'find-idcard',
    title: '找出身份证号',
    description: '匹配 18 位身份证号',
    presetId: 'cn-idcard',
    explain: ['前 6 位地区码', '中间 8 位出生日期', '末位可为数字或 X']
  },
  {
    id: 'find-ipv4',
    title: '找出 IP 地址',
    description: '匹配合法 IPv4',
    presetId: 'ipv4',
    explain: ['每段 0–255', '\\b 避免粘在别的数字上', '开 g 找全部']
  },
  {
    id: 'find-date',
    title: '找出日期',
    description: '匹配 yyyy-MM-dd',
    presetId: 'date-ymd',
    explain: ['四位年份', '月份 01–12', '日期 01–31（简化）']
  },
  {
    id: 'find-zh',
    title: '找出中文',
    description: '标出连续汉字',
    presetId: 'zh-char',
    explain: ['\\u4e00-\\u9fa5 覆盖常用汉字', '+ 表示连续一段', '开 g 找全部']
  },
  {
    id: 'find-plate',
    title: '找出车牌号',
    description: '普通/新能源车牌（简化）',
    presetId: 'cn-plate',
    explain: ['首字为省份简称', '第二位字母', '后接数字/字母与挂学警等']
  },
  {
    id: 'only-digits',
    title: '只保留数字',
    description: '删掉所有非数字字符',
    pattern: '\\D+',
    flags: ['g'],
    replacement: '',
    text: '订单号：AB-2026-0015，金额 ￥128.00',
    explain: ['\\D 表示「非数字」', '+ 表示连续一段', '替换为空 = 删掉它们，只留下数字']
  },
  {
    id: 'remove-blank-lines',
    title: '删除空行',
    description: '去掉只有空格/空白的行',
    presetId: 'blank-line',
    explain: ['^ 行首，$ 行尾（需开 m）', '\\s* 表示中间可以是空白', '替换为空即可删行']
  },
  {
    id: 'trim-lines',
    title: '去掉行首尾空格',
    description: '清理每行前后的空格/Tab',
    presetId: 'trim-spaces',
    explain: ['用 | 表示「行首或行尾」', 'm 让 ^ $ 对每一行生效', '替换为空 = 裁掉空白']
  },
  {
    id: 'mask-phone',
    title: '打码手机号中间',
    description: '138****8000 形式',
    pattern: '(1[3-9]\\d)\\d{4}(\\d{4})',
    flags: ['g'],
    replacement: '$1****$2',
    text: '联系人：13800138000、19912345678',
    explain: [
      '前 3 位、后 4 位用括号记住',
      '中间 4 位匹配但不保留',
      '替换写成 $1****$2'
    ]
  },
  {
    id: 'mask-id',
    title: '打码身份证中间',
    description: '保留前后，中间换成 *',
    pattern: '(\\d{6})\\d{8}(\\d{3}[0-9Xx])',
    flags: ['g'],
    replacement: '$1********$2',
    text: '身份证：11010519900307123X',
    explain: [
      '前 6 位、后 4 位用括号记住',
      '中间 8 位匹配但不单独保留',
      '替换写成 $1********$2'
    ]
  },
  {
    id: 'strip-html',
    title: '去掉 HTML 标签',
    description: '粗略删除 <tag>…',
    presetId: 'html-tag',
    explain: ['匹配成对尖括号标签', '替换为空留下纯文本', '复杂嵌套 HTML 仅作粗处理']
  }
]

export const REGEX_GUIDE_STEPS: Array<{ title: string; body: string }> = [
  {
    title: '1. 先想“要找什么”',
    body: '例如：邮箱、手机号、连续数字。不必一次写完美，可先从模板点选。'
  },
  {
    title: '2. 用测试文本试',
    body: '把真实样例贴到中间「测试文本」，看黄色高亮是否只标中目标。'
  },
  {
    title: '3. 改表达式',
    body: '用下方「积木」插入 \\d、+、() 等；改完立刻看匹配结果，多试几次。'
  },
  {
    title: '4. 需要时再替换',
    body: '右侧可写 $1 或 $<name> 做改写/打码；确认无误再复制到代码里。'
  }
]

export const REGEX_CHEAT_SHEET: Array<{ token: string; meaning: string; simple: string }> = [
  { token: '.', meaning: '任意字符（无 s 时不含换行）', simple: '任意一个字符' },
  { token: '\\d', meaning: '数字 0-9', simple: '一位数字' },
  { token: '\\w', meaning: '字母数字下划线', simple: '单词字符' },
  { token: '\\s', meaning: '空白字符', simple: '空格/Tab/换行' },
  { token: '^ $', meaning: '开头 / 结尾（m 时按行）', simple: '行/全文的头尾' },
  { token: '+', meaning: '前面内容 1 次或多次', simple: '至少一个' },
  { token: '*', meaning: '前面内容 0 次或多次', simple: '可以没有' },
  { token: '?', meaning: '前面内容 0 或 1 次', simple: '可有可无' },
  { token: '{n,m}', meaning: '重复 n 到 m 次', simple: '重复次数' },
  { token: '[abc]', meaning: 'a 或 b 或 c', simple: '多选一' },
  { token: '[^0-9]', meaning: '非数字', simple: '排除' },
  { token: '(...)', meaning: '捕获组，替换用 $1', simple: '记住这一段' },
  { token: '|', meaning: '或', simple: '二选一' },
  { token: '\\b', meaning: '单词边界', simple: '完整单词边缘' }
]

export const REGEX_COMMON_PATTERNS: RegexExample[] = [
  // 常用
  {
    id: 'zh-char',
    label: '中文字符',
    pattern: '[\\u4e00-\\u9fa5]+',
    flags: ['g'],
    replacement: '[中文]',
    text: 'ToolBox 在线工具\nregex tester\n中文字符匹配',
    group: 'common',
    tags: ['中文'],
    description: '匹配连续汉字'
  },
  {
    id: 'blank-line',
    label: '空白行',
    pattern: '^\\s*$',
    flags: ['g', 'm'],
    replacement: '',
    text: ['第一行', '', '   ', '第二行', '\t', '第三行'].join('\n'),
    group: 'common',
    tags: ['多行'],
    description: '匹配整行为空白'
  },
  {
    id: 'trim-spaces',
    label: '行首行尾空白',
    pattern: '^[ \\t]+|[ \\t]+$',
    flags: ['g', 'm'],
    replacement: '',
    text: '  hello  \n\tworld\t\n  中文  ',
    group: 'common',
    tags: ['trim'],
    description: '去掉每行首尾空格/Tab'
  },
  {
    id: 'multi-space',
    label: '连续空白',
    pattern: '[ \\t]{2,}',
    flags: ['g'],
    replacement: ' ',
    text: 'a  b\tc\t\td   e',
    group: 'common',
    tags: ['压缩'],
    description: '把连续空格/Tab 压成一个空格'
  },

  // Web
  {
    id: 'email',
    label: 'Email',
    pattern: '(?<name>[\\w.+-]+)@(?<domain>[\\w.-]+\\.\\w+)',
    flags: ['g', 'i'],
    replacement: '$<domain>/$<name>',
    text: ['support@example.com', 'admin@tools.neocockpit.cn', 'invalid-email'].join('\n'),
    group: 'web',
    tags: ['邮箱', '命名组'],
    description: '简单邮箱 + 命名分组'
  },
  {
    id: 'url',
    label: 'URL',
    pattern: 'https?:\\/\\/(?:localhost|(?:[\\w-]+\\.)+[\\w-]+)(?::\\d{1,5})?(?:[\\/?#][^\\s]*)?',
    flags: ['g', 'i'],
    replacement: '[link]',
    text: '文档：https://tools.neocockpit.cn/tool/regex-tester\n接口：http://localhost:3000/api/v1?x=1\n无效：ftp://a.com',
    group: 'web',
    tags: ['链接'],
    description: 'http/https URL（含端口与路径）'
  },
  {
    id: 'ipv4',
    label: 'IPv4',
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
    flags: ['g'],
    replacement: '[ip]',
    text: '网关 192.168.1.1，广播 255.255.255.255\n无效 999.1.1.1 与 1.2.3',
    group: 'web',
    tags: ['IP'],
    description: 'IPv4 地址'
  },
  {
    id: 'hex-color',
    label: 'Hex 颜色',
    pattern: '#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b',
    flags: ['g'],
    replacement: '[color]',
    text: '主题 #1d9bf0，短写 #fff，透明 #112233aa，错误 #12',
    group: 'web',
    tags: ['CSS'],
    description: 'CSS 十六进制颜色'
  },
  {
    id: 'query-param',
    label: 'Query 参数',
    pattern: '[?&](?<key>[^=&#]+)=(?<value>[^&#]*)',
    flags: ['g'],
    replacement: '$<key>=$<value>',
    text: 'https://example.com/path?foo=1&bar=hello%20world#hash',
    group: 'web',
    tags: ['URL'],
    description: '提取 query key/value'
  },
  {
    id: 'markdown-link',
    label: 'Markdown 链接',
    pattern: '\\[(?<text>[^\\]]+)\\]\\((?<url>[^)\\s]+)\\)',
    flags: ['g'],
    replacement: '$<text> -> $<url>',
    text: '参见 [文档](https://example.com/docs) 与 [首页](/)。',
    group: 'web',
    tags: ['Markdown'],
    description: '[text](url) 结构'
  },

  // 国内
  {
    id: 'cn-mobile',
    label: '手机号',
    pattern: '1[3-9]\\d{9}',
    flags: ['g'],
    replacement: '[手机]',
    text: '手机：13800138000，19912345678\n错误：12800138000、1380013800',
    group: 'china',
    tags: ['电话'],
    description: '中国大陆 11 位手机号（简化）'
  },
  {
    id: 'cn-phone',
    label: '固话',
    pattern: '0\\d{2,3}-?\\d{7,8}',
    flags: ['g'],
    replacement: '[固话]',
    text: '北京 010-12345678，深圳 075512345678\n错误 123-456',
    group: 'china',
    tags: ['电话'],
    description: '区号 + 本地号（简化）'
  },
  {
    id: 'cn-idcard',
    label: '身份证号',
    pattern: '[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[0-9Xx]',
    flags: ['g'],
    replacement: '[身份证]',
    text: '身份证：11010519900307123X\n错误：110105199013401234',
    group: 'china',
    tags: ['证件'],
    description: '18 位身份证号（不含校验位算法）'
  },
  {
    id: 'cn-postcode',
    label: '邮编',
    pattern: '\\b[1-9]\\d{5}\\b',
    flags: ['g'],
    replacement: '[邮编]',
    text: '北京 100000，上海 200000，无效 012345',
    group: 'china',
    tags: ['地址'],
    description: '6 位邮政编码'
  },
  {
    id: 'cn-qq',
    label: 'QQ 号',
    pattern: '\\b[1-9]\\d{4,10}\\b',
    flags: ['g'],
    replacement: '[QQ]',
    text: '客服 QQ：10000\n测试号：123456789\n无效：01234',
    group: 'china',
    tags: ['社交'],
    description: '5–11 位 QQ 号（简化）'
  },
  {
    id: 'cn-plate',
    label: '车牌号',
    pattern: '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]',
    flags: ['g'],
    replacement: '[车牌]',
    text: '京A12345，粤B12345D，错误 京I12345',
    group: 'china',
    tags: ['车辆'],
    description: '普通/新能源车牌（简化）'
  },

  // 文本
  {
    id: 'date-ymd',
    label: '日期 yyyy-MM-dd',
    pattern: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b',
    flags: ['g'],
    replacement: '[日期]',
    text: '发布日期：2026-06-09\n无效：2026-13-40\n短写：2026-6-9',
    group: 'text',
    tags: ['日期'],
    description: '年-月-日'
  },
  {
    id: 'datetime',
    label: '日期时间',
    pattern: '\\b\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}(?::\\d{2})?\\b',
    flags: ['g'],
    replacement: '[时间]',
    text: '2026-07-15 09:30:00\n2026-07-15T09:30\n错误 2026/07/15 9:30',
    group: 'text',
    tags: ['时间'],
    description: 'yyyy-MM-dd HH:mm[:ss]'
  },
  {
    id: 'time-hms',
    label: '时间 HH:mm:ss',
    pattern: '\\b(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\b',
    flags: ['g'],
    replacement: '[时分秒]',
    text: '开始 09:30:00，结束 23:59:59，错误 24:00:00',
    group: 'text',
    tags: ['时间'],
    description: '24 小时制时分秒'
  },
  {
    id: 'number',
    label: '整数/小数',
    pattern: '-?\\d+(?:\\.\\d+)?',
    flags: ['g'],
    replacement: '[数]',
    text: '价格 12、3.14、-0.5，版本 2',
    group: 'text',
    tags: ['数字'],
    description: '可选负号与小数'
  },
  {
    id: 'quoted',
    label: '引号内容',
    pattern: '"(?:\\\\.|[^"\\\\])*"',
    flags: ['g'],
    replacement: '[str]',
    text: 'name="hello" path="C:\\\\temp\\\\a" bad="unclosed',
    group: 'text',
    tags: ['字符串'],
    description: '双引号字符串（含转义）'
  },

  // 代码
  {
    id: 'js-line-comment',
    label: 'JS 行注释',
    pattern: '\\/\\/.*$',
    flags: ['g', 'm'],
    replacement: '',
    text: 'const a = 1; // 注释\n// 整行注释\ncode();',
    group: 'code',
    tags: ['注释'],
    description: '删除 // 行注释'
  },
  {
    id: 'html-tag',
    label: 'HTML 标签',
    pattern: '<\\/?[a-zA-Z][^>]*>',
    flags: ['g'],
    replacement: '',
    text: '<p class="x">Hello <b>World</b></p>',
    group: 'code',
    tags: ['HTML'],
    description: '粗略去标签'
  },
  {
    id: 'camel-to-space',
    label: '驼峰拆词',
    pattern: '([a-z0-9])([A-Z])',
    flags: ['g'],
    replacement: '$1 $2',
    text: 'getUserName XMLParser HTTPRequest',
    group: 'code',
    tags: ['命名'],
    description: 'camelCase → 空格分隔（简化）'
  },
  {
    id: 'trailing-comma',
    label: '行尾逗号',
    pattern: ',\\s*$',
    flags: ['g', 'm'],
    replacement: '',
    text: 'a,\nb,\nc',
    group: 'code',
    tags: ['格式'],
    description: '去掉行尾逗号'
  },
  {
    id: 'hex-literal',
    label: '十六进制字面量',
    pattern: '0[xX][0-9a-fA-F]+',
    flags: ['g'],
    replacement: '[hex]',
    text: 'color 0xFF00AA, mask 0x1f, bad 0xGG',
    group: 'code',
    tags: ['数字'],
    description: '0x... 十六进制'
  },

  // 校验
  {
    id: 'password-strong',
    label: '强密码（示意）',
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{8,}$',
    flags: [],
    replacement: '',
    text: 'Abcdef1!\npassword\nAbc12345\nShort1!',
    group: 'validate',
    tags: ['密码', '断言'],
    description: '至少 8 位且含大小写、数字、特殊字符（整串匹配，勿开 g）'
  },
  {
    id: 'username',
    label: '用户名',
    pattern: '^[a-zA-Z][a-zA-Z0-9_]{3,15}$',
    flags: [],
    replacement: '',
    text: 'user_01\n1abc\nab\nvalidName',
    group: 'validate',
    tags: ['账号'],
    description: '字母开头，4–16 位'
  },
  {
    id: 'semver',
    label: 'SemVer',
    pattern: '\\b\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?\\b',
    flags: ['g'],
    replacement: '[ver]',
    text: 'v1.2.3、1.0.0-beta.1、2.0',
    group: 'validate',
    tags: ['版本'],
    description: '语义化版本号（简化）'
  },
  {
    id: 'uuid',
    label: 'UUID',
    pattern: '\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\\b',
    flags: ['g'],
    replacement: '[uuid]',
    text: '550e8400-e29b-41d4-a716-446655440000\ninvalid-uuid',
    group: 'validate',
    tags: ['ID'],
    description: '标准 UUID'
  }
]

export const REGEX_PRESET_GROUP_COUNTS = REGEX_COMMON_PATTERNS.reduce(
  (counts, item) => {
    counts[item.group] = (counts[item.group] || 0) + 1
    return counts
  },
  {} as Record<RegexPresetGroup, number>
)

export const DEFAULT_REGEX_PATTERN = '(?<name>[\\w.+-]+)@(?<domain>[\\w.-]+\\.\\w+)'
export const DEFAULT_REGEX_FLAGS: RegexFlag[] = ['g', 'i']
export const DEFAULT_REGEX_REPLACEMENT = '$<domain>/$<name>'
export const DEFAULT_REGEX_TEXT = ['support@example.com', 'admin@tools.neocockpit.cn', 'invalid-email'].join(
  '\n'
)
export const REGEX_MAX_MATCHES = 500

export function orderFlags(selected: readonly RegexFlag[]): RegexFlag[] {
  return REGEX_FLAG_OPTIONS.map(f => f.value).filter(v => selected.includes(v))
}

export function filterRegexPresets(
  group: RegexPresetGroup | 'all',
  search: string
): RegexExample[] {
  const q = search.trim().toLowerCase()
  return REGEX_COMMON_PATTERNS.filter(item => {
    if (group !== 'all' && item.group !== group) return false
    if (!q) return true
    const hay = [
      item.label,
      item.pattern,
      item.description || '',
      item.group,
      ...(item.tags || [])
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function isRegexPresetActive(
  pattern: string,
  flags: readonly RegexFlag[],
  example: RegexExample
): boolean {
  const a = orderFlags(flags).join('')
  const b = orderFlags(example.flags).join('')
  return pattern === example.pattern && a === b
}

export type CaptureItem = { label: string; value: string | undefined }
export type MatchItem = {
  key: string
  order: number
  index: number
  end: number
  value: string
  captures: CaptureItem[]
}
export type PreviewSegment = { key: string; text: string; match: boolean }

export function buildRegex(pattern: string, flags: string): { regex: RegExp | null; error: string } {
  if (!pattern) return { regex: null, error: '' }
  try {
    return { regex: new RegExp(pattern, flags), error: '' }
  } catch (error) {
    return { regex: null, error: (error as Error).message }
  }
}

function createMatchItem(result: RegExpExecArray, order: number): MatchItem {
  const captures: CaptureItem[] = []
  for (let index = 1; index < result.length; index += 1) {
    captures.push({ label: `$${index}`, value: result[index] })
  }
  Object.entries(result.groups ?? {}).forEach(([label, value]) => {
    captures.push({ label, value })
  })
  return {
    key: `${order}-${result.index}-${result[0].length}`,
    order,
    index: result.index,
    end: result.index + result[0].length,
    value: result[0],
    captures
  }
}

export function collectMatches(
  regex: RegExp,
  text: string,
  maxMatches = REGEX_MAX_MATCHES
): MatchItem[] {
  if (!text) return []
  const items: MatchItem[] = []
  regex.lastIndex = 0

  if (!regex.global) {
    const result = regex.exec(text)
    return result ? [createMatchItem(result, 1)] : []
  }

  let result: RegExpExecArray | null
  while ((result = regex.exec(text)) !== null) {
    items.push(createMatchItem(result, items.length + 1))
    if (items.length >= maxMatches) break
    if (result[0] === '') {
      if (regex.lastIndex >= text.length) break
      regex.lastIndex += 1
    }
  }
  return items
}

export function buildPreviewSegments(text: string, matches: MatchItem[]): PreviewSegment[] {
  const visible = matches.filter(item => item.end > item.index)
  if (!text || !visible.length) return []

  const segments: PreviewSegment[] = []
  let cursor = 0
  visible.forEach((item, index) => {
    if (item.index > cursor) {
      segments.push({
        key: `text-${index}-${cursor}`,
        text: text.slice(cursor, item.index),
        match: false
      })
    }
    segments.push({
      key: `match-${item.order}-${item.index}`,
      text: text.slice(item.index, item.end),
      match: true
    })
    cursor = item.end
  })
  if (cursor < text.length) {
    segments.push({ key: `text-tail-${cursor}`, text: text.slice(cursor), match: false })
  }
  return segments
}

export function formatMatchesText(matches: MatchItem[]): string {
  return matches
    .map(item => {
      const captures = item.captures.map(
        capture => `  ${capture.label}: ${capture.value ?? '未匹配'}`
      )
      return [`#${item.order} [${item.index}, ${item.end}] ${item.value}`, ...captures].join('\n')
    })
    .join('\n\n')
}

/** 用人话描述当前表达式（尽力而为，复杂正则会降级说明） */
export function explainPattern(pattern: string, flags: string): string[] {
  const p = pattern.trim()
  if (!p) return ['先输入或选择一个表达式，这里会用白话说明它大概在做什么。']

  const tips: string[] = []
  const flagSet = new Set(flags.split(''))

  if (flagSet.has('g')) tips.push('已开「全局」：会找出所有匹配，而不是只找第一个。')
  if (flagSet.has('i')) tips.push('已开「忽略大小写」：大写小写都算匹配。')
  if (flagSet.has('m')) tips.push('已开「多行」：^ 和 $ 会对每一行生效。')
  if (flagSet.has('s')) tips.push('已开「点匹配换行」：. 可以跨行。')

  if (p.includes('@') && p.includes('\\w')) tips.push('看起来像在匹配邮箱一类「名字@域名」结构。')
  if (/1\[?3-9\]?/.test(p) || p.includes('1[3-9]')) tips.push('包含手机号常见开头规则（1 后跟 3–9）。')
  if (p.includes('\\u4e00') || p.includes('\\u9fa5')) tips.push('包含汉字范围，用于匹配中文。')
  if (p.includes('https?')) tips.push('在匹配 http 或 https 链接。')
  if (p.startsWith('^') && p.endsWith('$') && !flagSet.has('g')) {
    tips.push('以 ^ 开头、以 $ 结尾：通常表示“整段文本必须完全符合”。')
  } else {
    if (p.startsWith('^')) tips.push('以 ^ 开头：从开头（或行首）开始匹配。')
    if (p.endsWith('$') && !p.endsWith('\\$')) tips.push('以 $ 结尾：一直匹配到结尾（或行尾）。')
  }
  if (p.includes('(') && p.includes(')')) tips.push('含有括号分组：匹配结果里可看到 $1、$2，替换时也能用。')
  if (/\(\?<[^>]+>/.test(p)) tips.push('含有命名分组：替换时可写 $<名字>。')
  if (p.includes('|')) tips.push('含有 |：表示“或者”，左右两种都算匹配。')
  if (p.includes('+')) tips.push('含有 +：表示前一项至少出现 1 次。')
  if (p.includes('*') && !p.includes('\\*')) tips.push('含有 *：表示前一项可以出现 0 次或多次。')
  if (p.includes('\\d')) tips.push('含有 \\d：匹配数字。')
  if (p.includes('\\s')) tips.push('含有 \\s：匹配空白。')
  if (p.includes('\\w')) tips.push('含有 \\w：匹配字母、数字或下划线。')
  if (p.includes('[^')) tips.push('含有 [^…]：匹配“不在集合里”的字符。')
  else if (p.includes('[')) tips.push('含有 […]：在方括号里任选一个字符。')

  if (tips.length <= (flagSet.size ? 1 : 0)) {
    tips.push('这是一条自定义规则：在测试文本里看高亮，比死记语法更快。')
    tips.push('可从「我想…」场景或下方积木入手，改一点就看结果。')
  }

  return tips.slice(0, 6)
}

export function resolveWizardGoal(goal: RegexWizardGoal): {
  pattern: string
  flags: RegexFlag[]
  replacement: string
  text: string
} | null {
  if (goal.presetId) {
    const preset = REGEX_COMMON_PATTERNS.find(p => p.id === goal.presetId)
    if (!preset) return null
    return {
      pattern: preset.pattern,
      flags: [...preset.flags],
      replacement: preset.replacement,
      text: preset.text
    }
  }
  if (!goal.pattern) return null
  return {
    pattern: goal.pattern,
    flags: [...(goal.flags || ['g'])],
    replacement: goal.replacement ?? '',
    text: goal.text ?? ''
  }
}

/** 在光标位置插入；若 insert 为 () / [] / [^] 等成对符号，光标落在中间 */
export function insertIntoPattern(
  source: string,
  insert: string,
  selectionStart: number,
  selectionEnd: number
): { value: string; caret: number } {
  const start = Math.max(0, Math.min(selectionStart, source.length))
  const end = Math.max(start, Math.min(selectionEnd, source.length))
  const paired =
    insert === '()' || insert === '[]' || insert === '[^]' || insert === '{}'
      ? insert
      : null

  if (paired) {
    const open = paired.slice(0, paired.length === 3 ? 2 : 1)
    const close = paired.slice(paired.length === 3 ? 2 : 1)
    const inner = source.slice(start, end)
    const value = source.slice(0, start) + open + inner + close + source.slice(end)
    const caret = start + open.length + inner.length
    return { value, caret }
  }

  const value = source.slice(0, start) + insert + source.slice(end)
  return { value, caret: start + insert.length }
}
