import type { InjectionKey } from 'vue'

export interface TreeNode {
  id: string
  name: string
  isDirectory: boolean
  /** 折叠仅影响编辑树展示，预览始终输出完整结构 */
  collapsed: boolean
  children: TreeNode[]
}

export type TreeStyle = 'github' | 'simple' | 'space'

export interface TreeOps {
  shouldAutoEdit: (id: string) => boolean
  insertSibling: (arr: TreeNode[], index: number) => void
  appendChild: (parent: TreeNode, dir: boolean) => void
  removeAt: (arr: TreeNode[], index: number) => void
}

export const treeOpsKey: InjectionKey<TreeOps> = Symbol('tree-ops')

let idSeq = 1

export const newId = () => `tn-${idSeq++}`

export const makeNode = (dir: boolean, name?: string): TreeNode => ({
  id: newId(),
  name: name ?? (dir ? '新建目录' : '新建文件'),
  isDirectory: dir,
  collapsed: false,
  children: []
})

/** 在数组 index 后插入同级目录节点，返回新节点 */
export const insertSibling = (arr: TreeNode[], index: number): TreeNode => {
  const node = makeNode(true)
  arr.splice(index + 1, 0, node)
  return node
}

/** 给父节点追加子节点；父节点自动变为目录并展开 */
export const appendChild = (parent: TreeNode, dir: boolean): TreeNode => {
  parent.isDirectory = true
  parent.collapsed = false
  const node = makeNode(dir)
  parent.children.push(node)
  return node
}

export const removeAt = (arr: TreeNode[], index: number): void => {
  arr.splice(index, 1)
}

export const replaceRoots = (target: TreeNode[], next: TreeNode[]): void => {
  target.splice(0, target.length, ...next)
}

export const walk = (nodes: TreeNode[], fn: (node: TreeNode) => void): void => {
  for (const node of nodes) {
    fn(node)
    if (node.children.length) walk(node.children, fn)
  }
}

/** 解析 GitHub 树格式 / 缩进文本为节点树 */
export function parseTextToTree(text: string): TreeNode[] {
  const entries: Array<{ depth: number; name: string }> = []

  for (const raw of text.split(/\r\n|\r|\n/)) {
    let line = raw
      .replace(/^[│| ]*[├└]──[ ]?/, '')
      .replace(/^[│| ]*[├└]─[ ]?/, '')
      .replace(/^[│|]+\s*/, '')

    const tabMatch = line.match(/^[\t]+/)
    if (tabMatch) {
      const leading = tabMatch[0]
      const name = line.slice(leading.length).trim()
      if (name) entries.push({ depth: leading.replace(/\t/g, '  ').length / 2, name })
      continue
    }

    const spaceMatch = line.match(/^ +/)
    if (spaceMatch) {
      const name = line.slice(spaceMatch[0].length).trim()
      if (name) entries.push({ depth: Math.floor(spaceMatch[0].length / 2), name })
      continue
    }

    const name = line.trim()
    if (name) entries.push({ depth: 0, name })
  }

  const result: TreeNode[] = []
  const stack: TreeNode[] = []

  for (let i = 0; i < entries.length; i++) {
    const { depth, name } = entries[i]
    const isDirectory =
      name.endsWith('/') || (i + 1 < entries.length && entries[i + 1].depth > depth)
    const node = makeNode(isDirectory, name.replace(/\/$/, ''))

    stack.length = Math.max(0, depth)
    if (depth === 0 || !stack[depth - 1]) result.push(node)
    else stack[depth - 1].children.push(node)
    stack[depth] = node
  }

  return result
}

export function statTree(nodes: TreeNode[]): { dirs: number; files: number; maxDepth: number } {
  if (nodes.length === 0) return { dirs: 0, files: 0, maxDepth: 0 }

  let dirs = 0
  let files = 0
  let maxDepth = 1

  const visit = (list: TreeNode[], depth: number) => {
    if (depth > maxDepth) maxDepth = depth
    for (const node of list) {
      if (node.isDirectory) {
        dirs += 1
        if (node.children.length) visit(node.children, depth + 1)
      } else {
        files += 1
      }
    }
  }

  visit(nodes, 1)
  return { dirs, files, maxDepth }
}

function connectors(style: TreeStyle) {
  if (style === 'simple') return { mid: '+-- ', last: '\\-- ', vert: '|   ', empty: '    ' }
  if (style === 'space') return { mid: '  ', last: '  ', vert: '  ', empty: '  ' }
  return { mid: '├── ', last: '└── ', vert: '│   ', empty: '    ' }
}

export function renderTree(
  nodes: TreeNode[],
  style: TreeStyle,
  trailingSlash: boolean,
  onlyDirs: boolean,
  prefix = ''
): string {
  const c = connectors(style)
  const visible = onlyDirs ? nodes.filter((n) => n.isDirectory) : nodes
  const lines: string[] = []

  visible.forEach((node, i) => {
    const isLast = i === visible.length - 1
    const label = node.isDirectory && trailingSlash ? `${node.name}/` : node.name
    lines.push(prefix + (isLast ? c.last : c.mid) + label)
    if (node.children.length) {
      const child = renderTree(
        node.children,
        style,
        trailingSlash,
        onlyDirs,
        prefix + (isLast ? c.empty : c.vert)
      )
      if (child) lines.push(child)
    }
  })

  return lines.join('\n')
}

export const SAMPLE_TREE = `src
  components
    ToolHeader.vue
    FavoriteButton.vue
  views
    Home.vue
    ToolView.vue
  tools
    file
      TreeGenerator.vue
      FileDedup.vue
  router
    index.ts
  main.ts
  App.vue`
