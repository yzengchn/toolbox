/** Nginx 配置静态校验与常用片段说明（纯前端，不跑 nginx -t） */

export type NginxIssueSeverity = 'error' | 'warning' | 'info'
export type NginxIssueCategory = 'syntax' | 'security' | 'practice'

export interface NginxIssue {
  severity: NginxIssueSeverity
  category: NginxIssueCategory
  line: number
  message: string
}

export interface NginxSnippet {
  id: string
  title: string
  tags: string[]
  description: string
  example: string
  notes: string[]
}

export interface NginxTemplate {
  id: string
  name: string
  description: string
  content: string
}

export interface NginxOverview {
  servers: number
  locations: number
  upstreams: number
  hasSsl: boolean
  hasGzip: boolean
  hasSecurityHeaders: boolean
  hasRateLimit: boolean
  proxyLocations: number
}

export interface ProxyPassSlashDemo {
  location: string
  withSlash: { proxyPass: string; result: string; note: string }
  withoutSlash: { proxyPass: string; result: string; note: string }
}

export const SAMPLE_NGINX = `worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    upstream app_backend {
        server 127.0.0.1:3000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name example.com;

        # HTTP 跳转到 HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name example.com;

        ssl_certificate     /etc/nginx/ssl/example.crt;
        ssl_certificate_key /etc/nginx/ssl/example.key;

        client_max_body_size 20m;

        # 静态资源
        location / {
            root /var/www/html;
            try_files $uri $uri/ /index.html;
        }

        # API 反向代理（注意 proxy_pass 末尾 / 的差异）
        location /api/ {
            proxy_pass http://app_backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";
        }

        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 7d;
            access_log off;
        }
    }
}
`

export const NGINX_SNIPPETS: NginxSnippet[] = [
  {
    id: 'location-api',
    title: 'location /api/ 反向代理',
    tags: ['location', 'proxy_pass'],
    description:
      '把 /api/ 请求转发到后端。proxy_pass 是否带尾部 / 会改变 URI 替换规则，这是最容易踩坑的点。',
    example: `location /api/ {
    proxy_pass http://127.0.0.1:3000/;   # 带 /：/api/users → /users
    # proxy_pass http://127.0.0.1:3000;  # 不带 /：/api/users → /api/users
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}`,
    notes: [
      'location 用 /api/（带尾 /）+ proxy_pass 带尾 /：会剥掉 /api 前缀再转发。',
      'location 用 /api/ + proxy_pass 不带尾 /：完整 URI 原样转发到后端。',
      'location = /api 只匹配精确路径，不匹配 /api/xxx。',
      '建议统一约定：对外路径 /api/xxx，后端实际路径 /xxx，则两边都写尾 /。'
    ]
  },
  {
    id: 'location-match',
    title: 'location 匹配优先级',
    tags: ['location'],
    description: 'Nginx 按固定优先级选择 location，不是“谁写在前面谁优先”。',
    example: `location = /exact { }          # 1. 精确匹配，最高
location ^~ /static/ { }       # 2. 前缀匹配且不再检查正则
location ~ \\.php$ { }          # 3. 正则（区分大小写）
location ~* \\.(js|css)$ { }    # 4. 正则（不区分大小写）
location / { }                 # 5. 通用前缀，最长匹配获胜`,
    notes: [
      '先找所有前缀匹配里最长的那条；若该条是 ^~，直接采用，不再测正则。',
      '否则按配置文件顺序测正则，第一个命中的正则胜出。',
      '都没命中则用最长前缀匹配。',
      '调试可用 nginx -T 看最终配置，或在 location 内临时加 return 200 "hit";'
    ]
  },
  {
    id: 'proxy-headers',
    title: '反向代理常用头',
    tags: ['proxy_pass', 'header'],
    description: '后端要拿到真实客户端 IP、协议与 Host，必须显式传转发头。',
    example: `location / {
    proxy_pass http://upstream_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade; # WebSocket 时
}`,
    notes: [
      'Host：保留原始域名，避免后端按 upstream 地址生成错误链接。',
      'X-Forwarded-For / X-Real-IP：真实客户端 IP。',
      'X-Forwarded-Proto：https 场景下后端判断是否安全连接。',
      'WebSocket 还需 Upgrade / Connection，并在 http 块 map 处理 $connection_upgrade。'
    ]
  },
  {
    id: 'spa-try-files',
    title: 'SPA 前端 try_files',
    tags: ['location', 'try_files'],
    description: 'Vue/React 等 History 路由需要把不存在的路径回退到 index.html。',
    example: `location / {
    root /var/www/html;
    try_files $uri $uri/ /index.html;
}

# 若前后端同域，API 要写在 SPA location 之前或用更精确前缀：
location /api/ {
    proxy_pass http://127.0.0.1:3000/;
}`,
    notes: [
      'try_files 最后一项 /index.html 是内部重定向，会再次走 location 匹配。',
      'API 与静态资源 location 要比 / 更具体，避免被 SPA 规则吞掉。',
      'root 与 alias 不要混用；alias 路径通常需要以 / 结尾。'
    ]
  },
  {
    id: 'https-redirect',
    title: 'HTTP → HTTPS 跳转',
    tags: ['server', 'ssl'],
    description: '80 端口只做跳转，443 承载业务；证书路径按实际环境修改。',
    example: `server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ...
}`,
    notes: [
      'return 比 rewrite 更高效，优先用 return 301。',
      '证书续期后执行 nginx -s reload，不必停服。',
      'HSTS 可在 HTTPS server 里加 add_header Strict-Transport-Security ... always;'
    ]
  },
  {
    id: 'upstream',
    title: 'upstream 负载与 keepalive',
    tags: ['upstream'],
    description: '多实例后端用 upstream 聚合；开启 keepalive 可复用到上游的连接。',
    example: `upstream app_backend {
    server 10.0.0.11:3000 weight=3;
    server 10.0.0.12:3000;
    server 10.0.0.13:3000 backup;
    keepalive 32;
}

server {
    location /api/ {
        proxy_pass http://app_backend/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}`,
    notes: [
      '使用 upstream keepalive 时，proxy_http_version 必须 1.1，且 Connection 置空。',
      'backup 节点仅在其他节点都不可用时启用。',
      '健康检查可用第三方模块，或依赖应用层重试。'
    ]
  },
  {
    id: 'client-body',
    title: '上传大小与超时',
    tags: ['client', 'timeout'],
    description: '上传大文件、慢接口时需要调 client_max_body_size 与代理超时。',
    example: `http {
    client_max_body_size 50m;
    client_body_timeout 60s;
}

server {
    location /upload/ {
        client_max_body_size 200m;
        proxy_pass http://app_backend;
        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}`,
    notes: [
      'client_max_body_size 默认 1m，超限返回 413。',
      '可在 http / server / location 逐级覆盖。',
      '代理超时不够会看到 504 Gateway Time-out。'
    ]
  },
  {
    id: 'rewrite',
    title: 'rewrite 与 return',
    tags: ['rewrite'],
    description: '简单跳转优先 return；复杂路径改写再用 rewrite，并注意 last/break/redirect/permanent。',
    example: `# 推荐：固定跳转
location = /old {
    return 301 /new;
}

# 捕获改写
location /blog/ {
    rewrite ^/blog/(.*)$ /posts/$1 last;
}`,
    notes: [
      'last：停止本 location 规则，用新 URI 重新匹配 location。',
      'break：停止本 location 后续 rewrite，不重新匹配。',
      'redirect / permanent：对外 302 / 301 跳转。',
      '能 return 就不要 rewrite，可读性更好。'
    ]
  },
  {
    id: 'websocket',
    title: 'WebSocket 反代',
    tags: ['websocket', 'proxy_pass'],
    description: 'Upgrade 握手需要 map $connection_upgrade，并转发 Upgrade / Connection 头。',
    example: `http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    server {
        location /ws/ {
            proxy_pass http://127.0.0.1:8080/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_read_timeout 3600s;
        }
    }
}`,
    notes: [
      '必须 proxy_http_version 1.1。',
      'map 把空 Upgrade 映射为 close，避免非 WS 请求异常。',
      '长连接场景适当加大 proxy_read_timeout。'
    ]
  },
  {
    id: 'security-headers',
    title: '安全响应头',
    tags: ['security', 'header'],
    description: '生产环境常用安全头；注意 add_header 在子块会覆盖父级（Gixy 常见告警）。',
    example: `server {
    # 仅 HTTPS server 建议开启 HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    # CSP 按业务收紧
    add_header Content-Security-Policy "default-src 'self'" always;
}`,
    notes: [
      'always 参数保证 4xx/5xx 也带上头。',
      '子 location 若写了任意 add_header，不会继承父级 add_header，需重复声明。',
      'HSTS 仅在确认全站 HTTPS 后再开。'
    ]
  },
  {
    id: 'gzip-cache',
    title: 'Gzip 与静态缓存',
    tags: ['performance', 'gzip'],
    description: '文本资源压缩 + 静态资源长缓存，是 nginxconfig.io 类生成器的默认项。',
    example: `http {
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
    gzip_vary on;

    server {
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 7d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
}`,
    notes: [
      '已预压缩资源可用 gzip_static on（需模块）。',
      'HTML 一般短缓存或不缓存，避免发版后用户看到旧壳。',
      'Brotli 需额外模块，CDN 侧压缩更常见。'
    ]
  },
  {
    id: 'rate-limit',
    title: '限流 limit_req',
    tags: ['security', 'limit'],
    description: '按 IP 限制请求速率，保护登录、接口被刷。',
    example: `http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://app_backend/;
        }

        location /login {
            limit_req zone=api_limit burst=5 nodelay;
            proxy_pass http://app_backend;
        }
    }
}`,
    notes: [
      'rate 是漏桶平均速率，burst 允许短时突发。',
      '超限默认 503，可用 limit_req_status 429 调整。',
      '真实客户端 IP 在反代后要用 real_ip 模块或 $http_x_forwarded_for 谨慎构造 key。'
    ]
  },
  {
    id: 'cors',
    title: 'CORS 跨域',
    tags: ['header', 'cors'],
    description: '接口跨域时处理 OPTIONS 预检与允许源；生产勿用 * + 凭证组合。',
    example: `location /api/ {
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        add_header Access-Control-Max-Age 86400 always;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Credentials true always;
    proxy_pass http://app_backend/;
}`,
    notes: [
      'if 在 nginx 中有副作用，复杂场景更推荐在应用层处理 CORS。',
      'Allow-Origin 反射 $http_origin 时建议白名单校验。',
      '带 Credentials 时不能写 *。'
    ]
  },
  {
    id: 'alias-root',
    title: 'root 与 alias 区别',
    tags: ['location', 'alias'],
    description: 'root 拼接 URI；alias 替换 location 前缀。尾 / 不一致是路径错乱主因。',
    example: `# root：/img/a.png → /var/www/img/a.png
location /img/ {
    root /var/www;
}

# alias：/img/a.png → /data/images/a.png
location /img/ {
    alias /data/images/;
}`,
    notes: [
      'alias 目录路径建议以 / 结尾。',
      'alias 不要和 try_files 随意混用（行为易踩坑）。',
      'Gixy 会检测 alias 配置不当导致的路径穿越风险。'
    ]
  },
  {
    id: 'basic-auth',
    title: 'Basic Auth 访问控制',
    tags: ['security', 'auth'],
    description: '临时保护预发环境或内部工具页。',
    example: `location /admin/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:3000/;
}`,
    notes: [
      'htpasswd 生成：htpasswd -c /etc/nginx/.htpasswd user',
      '必须配合 HTTPS，否则账号密码明文传输。',
      '正式系统优先 OAuth / 网关鉴权，而非 Basic Auth。'
    ]
  }
]

/** 场景模板：一键填入完整可改配置（对标 nginxconfig.io 的场景生成，轻量版） */
export const NGINX_TEMPLATES: NginxTemplate[] = [
  {
    id: 'reverse-proxy',
    name: '反向代理',
    description: 'HTTPS + /api 反代 + SPA 静态，最常见部署骨架',
    content: SAMPLE_NGINX
  },
  {
    id: 'static-spa',
    name: '纯静态 / SPA',
    description: '单页应用 try_files + 静态资源缓存',
    content: `server {
    listen 80;
    server_name app.example.com;
    root /var/www/app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        access_log off;
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
`
  },
  {
    id: 'websocket',
    name: 'WebSocket',
    description: '带 Upgrade 的长连接反代',
    content: `http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    upstream ws_backend {
        server 127.0.0.1:8080;
        keepalive 16;
    }

    server {
        listen 80;
        server_name ws.example.com;

        location / {
            proxy_pass http://ws_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 3600s;
        }
    }
}
`
  },
  {
    id: 'php-fpm',
    name: 'PHP-FPM',
    description: '经典 fastcgi_pass 站点骨架',
    content: `server {
    listen 80;
    server_name php.example.com;
    root /var/www/html;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_read_timeout 60s;
    }

    location ~ /\\. {
        deny all;
    }
}
`
  },
  {
    id: 'load-balance',
    name: '负载均衡',
    description: 'upstream 权重 + keepalive + 反代',
    content: `upstream app_backend {
    server 10.0.0.11:3000 weight=3;
    server 10.0.0.12:3000;
    server 10.0.0.13:3000 backup;
    keepalive 32;
}

server {
    listen 80;
    server_name lb.example.com;

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`
  }
]

/** proxy_pass 尾 / 对照（教学用） */
export const PROXY_PASS_SLASH_DEMOS: ProxyPassSlashDemo[] = [
  {
    location: '/api/',
    withSlash: {
      proxyPass: 'http://127.0.0.1:3000/',
      result: '/api/users → /users',
      note: '剥掉 /api 前缀再转发'
    },
    withoutSlash: {
      proxyPass: 'http://127.0.0.1:3000',
      result: '/api/users → /api/users',
      note: '完整 URI 原样转发'
    }
  },
  {
    location: '/api',
    withSlash: {
      proxyPass: 'http://127.0.0.1:3000/',
      result: '/api/users → /users（前缀 /api 被替换）',
      note: 'location 无尾 / 但 proxy_pass 有路径时仍做替换，易踩坑'
    },
    withoutSlash: {
      proxyPass: 'http://127.0.0.1:3000',
      result: '/api/users → /api/users',
      note: '无 URI 部分则原样转发'
    }
  }
]

// ─── 格式化 / 概览 ──────────────────────────────────────────────────────────

/** 轻量缩进格式化：按花括号调整层级，不解析完整语法 */
export function formatNginxConfig(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let depth = 0
  let inDQuote = false
  let inSQuote = false

  for (const raw of lines) {
    // 统计本行有效括号（忽略注释与引号）
    let code = ''
    let lineInD: boolean = inDQuote
    let lineInS: boolean = inSQuote
    for (let j = 0; j < raw.length; j++) {
      const ch = raw[j]
      const prev = j > 0 ? raw[j - 1] : ''
      if (!lineInD && !lineInS && ch === '#') break
      if (ch === '"' && prev !== '\\' && !lineInS) {
        lineInD = !lineInD
        code += ch
        continue
      }
      if (ch === "'" && prev !== '\\' && !lineInD) {
        lineInS = !lineInS
        code += ch
        continue
      }
      if (!lineInD && !lineInS) code += ch
      else code += ch
    }

    const trimmed = raw.trim()
    if (!trimmed) {
      out.push('')
      continue
    }

    const openCount = (code.match(/\{/g) || []).length
    const closeCount = (code.match(/\}/g) || []).length
    // 以 } 开头的行先减层
    const leadingClose = /^\}/.test(trimmed)
    if (leadingClose) depth = Math.max(0, depth - closeCount)

    const indent = '    '.repeat(Math.max(0, depth))
    // 保留行内注释：只规范左侧空白
    out.push(indent + trimmed)

    if (!leadingClose) {
      depth = Math.max(0, depth + openCount - closeCount)
    } else if (openCount > 0) {
      depth = Math.max(0, depth + openCount)
    }

    inDQuote = lineInD
    inSQuote = lineInS
  }

  // 合并连续空行
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim() + (source.trim() ? '\n' : '')
}

export function getNginxOverview(source: string): NginxOverview {
  const text = source || ''
  const locations = extractLocations(text)
  const servers = (text.match(/\bserver\s*\{/g) || []).length
  const upstreams = (text.match(/\bupstream\s+\S+\s*\{/g) || []).length
  const hasSsl =
    /\blisten\s+[^;]*\bssl\b/.test(text) ||
    /\bssl_certificate\b/.test(text)
  const hasGzip = /\bgzip\s+on\s*;/.test(text)
  const hasSecurityHeaders =
    /Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options|Content-Security-Policy/.test(
      text
    )
  const hasRateLimit = /\blimit_req(_zone)?\b/.test(text)
  const proxyLocations = locations.filter(l => !!l.proxyPass).length

  return {
    servers,
    locations: locations.length,
    upstreams,
    hasSsl,
    hasGzip,
    hasSecurityHeaders,
    hasRateLimit,
    proxyLocations
  }
}

// ─── location 提取与请求匹配模拟 ───────────────────────────────────────────

export type LocationModifier = 'exact' | 'prefix' | 'prefer' | 'regex' | 'iregex'

export interface NginxLocation {
  /** 配置原文，如 location /api/ 或 location ~* \.js$ */
  raw: string
  modifier: LocationModifier
  /** 匹配模式：前缀路径或正则原文 */
  pattern: string
  line: number
  /** location 块内摘要指令 */
  proxyPass?: string
  root?: string
  alias?: string
  tryFiles?: string
  returnDirective?: string
  rewrite?: string[]
}

export interface LocationMatchStep {
  location: NginxLocation
  role: 'exact' | 'prefix' | 'prefer' | 'regex' | 'fallback'
  matched: boolean
  note: string
}

export interface LocationMatchResult {
  uri: string
  path: string
  query: string
  matched: NginxLocation | null
  reason: string
  /** 若命中且有 proxy_pass，展示转发后的上游 URI */
  upstreamUri?: string
  upstreamTarget?: string
  steps: LocationMatchStep[]
  locations: NginxLocation[]
}

export const DEFAULT_SIMULATE_PATHS = [
  '/',
  '/index.html',
  '/api',
  '/api/',
  '/api/users',
  '/api/users?id=1',
  '/static/app.js',
  '/assets/logo.png',
  '/blog/hello-world',
  '/exact'
]

function stripNginxNoise(source: string): string {
  // 去掉 # 注释（引号外简化处理）与多余 \r
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  return lines
    .map(line => {
      let inD = false
      let inS = false
      let out = ''
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        const prev = i > 0 ? line[i - 1] : ''
        if (!inD && !inS && ch === '#') break
        if (ch === '"' && prev !== '\\' && !inS) {
          inD = !inD
          out += ch
          continue
        }
        if (ch === "'" && prev !== '\\' && !inD) {
          inS = !inS
          out += ch
          continue
        }
        out += ch
      }
      return out
    })
    .join('\n')
}

/**
 * 从配置中提取 location 块（扁平列表，忽略 server 边界；模拟时按出现顺序）。
 */
export function extractLocations(source: string): NginxLocation[] {
  const cleaned = stripNginxNoise(source)
  const locations: NginxLocation[] = []
  // location [=|~*|~|^~]? pattern {
  const re =
    /location\s+(?:=\s*|~\*\s*|~\s*|\^~\s*)?(?:"([^"]+)"|'([^']+)'|(\S+))\s*\{/g
  let m: RegExpExecArray | null

  while ((m = re.exec(cleaned)) !== null) {
    const full = m[0]
    const pattern = (m[1] ?? m[2] ?? m[3] ?? '').trim()
    if (!pattern) continue

    let modifier: LocationModifier = 'prefix'
    if (/location\s+=\s*/.test(full)) modifier = 'exact'
    else if (/location\s+\^~\s*/.test(full)) modifier = 'prefer'
    else if (/location\s+~\*\s*/.test(full)) modifier = 'iregex'
    else if (/location\s+~\s*/.test(full)) modifier = 'regex'

    // 找匹配的右括号（按花括号深度）
    let depth = 1
    let i = m.index + full.length
    const startBody = i
    while (i < cleaned.length && depth > 0) {
      const ch = cleaned[i]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      i++
    }
    const body = cleaned.slice(startBody, depth === 0 ? i - 1 : cleaned.length)
    const line = cleaned.slice(0, m.index).split('\n').length

    const proxyPass = body.match(/\bproxy_pass\s+([^;]+);/)?.[1]?.trim()
    const root = body.match(/\broot\s+([^;]+);/)?.[1]?.trim()
    const alias = body.match(/\balias\s+([^;]+);/)?.[1]?.trim()
    const tryFiles = body.match(/\btry_files\s+([^;]+);/)?.[1]?.trim()
    const returnDirective = body.match(/\breturn\s+([^;]+);/)?.[1]?.trim()
    const rewrite = [...body.matchAll(/\brewrite\s+([^;]+);/g)].map(x => x[1].trim())

    const modLabel =
      modifier === 'exact'
        ? '= '
        : modifier === 'prefer'
          ? '^~ '
          : modifier === 'regex'
            ? '~ '
            : modifier === 'iregex'
              ? '~* '
              : ''

    locations.push({
      raw: `location ${modLabel}${pattern}`,
      modifier,
      pattern,
      line,
      proxyPass,
      root,
      alias,
      tryFiles,
      returnDirective,
      rewrite: rewrite.length ? rewrite : undefined
    })
  }

  return locations
}

/** 规范化用户输入的请求路径：支持完整 URL，只取 pathname + search */
export function normalizeRequestUri(input: string): { uri: string; path: string; query: string } {
  const raw = input.trim() || '/'
  let path = raw
  let query = ''

  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw)
      path = u.pathname || '/'
      query = u.search
    } else {
      const q = raw.indexOf('?')
      if (q >= 0) {
        path = raw.slice(0, q) || '/'
        query = raw.slice(q)
      } else {
        path = raw
      }
    }
  } catch {
    path = raw.split('?')[0] || '/'
    query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
  }

  if (!path.startsWith('/')) path = `/${path}`
  // 折叠重复斜杠（保留开头）
  path = path.replace(/\/{2,}/g, '/')
  const uri = `${path}${query}`
  return { uri, path, query }
}

function prefixMatches(uriPath: string, prefix: string): boolean {
  // Nginx 前缀匹配是纯字符串前缀：location /api 也会匹配 /apiv2
  return prefix === '/' || uriPath === prefix || uriPath.startsWith(prefix)
}

function compileNginxRegex(pattern: string, ignoreCase: boolean): RegExp | null {
  try {
    // nginx 使用 PCRE；JS 无法完全等价，做常见转义兼容
    return new RegExp(pattern, ignoreCase ? 'i' : '')
  } catch {
    return null
  }
}

/**
 * 按 Nginx location 选择规则模拟匹配（同 server 内扁平列表）：
 * 1. = 精确匹配立即胜出
 * 2. 最长前缀；若该前缀为 ^~ 则不再测正则
 * 3. 按配置顺序测正则，先命中者胜
 * 4. 否则用最长前缀
 */
export function matchLocation(requestInput: string, source: string): LocationMatchResult {
  const { uri, path, query } = normalizeRequestUri(requestInput)
  const locations = extractLocations(source)
  const steps: LocationMatchStep[] = []

  if (!locations.length) {
    return {
      uri,
      path,
      query,
      matched: null,
      reason: '配置中未解析到任何 location',
      steps,
      locations
    }
  }

  // 1. exact
  for (const loc of locations) {
    if (loc.modifier !== 'exact') continue
    const hit = path === loc.pattern
    steps.push({
      location: loc,
      role: 'exact',
      matched: hit,
      note: hit ? '精确匹配，立即采用' : '精确匹配未命中'
    })
    if (hit) {
      return finishMatch(uri, path, query, loc, '精确匹配 location = 优先级最高', steps, locations)
    }
  }

  // 2. 收集前缀（prefix + prefer）
  let bestPrefix: NginxLocation | null = null
  for (const loc of locations) {
    if (loc.modifier !== 'prefix' && loc.modifier !== 'prefer') continue
    const hit = prefixMatches(path, loc.pattern)
    const better =
      hit &&
      (!bestPrefix || loc.pattern.length > bestPrefix.pattern.length)
    steps.push({
      location: loc,
      role: loc.modifier === 'prefer' ? 'prefer' : 'prefix',
      matched: hit,
      note: hit
        ? better || !bestPrefix
          ? `前缀命中（长度 ${loc.pattern.length}）`
          : `前缀命中但短于当前最长 ${bestPrefix?.pattern}`
        : '前缀未命中'
    })
    if (better) bestPrefix = loc
  }

  // 2b. ^~ 最长前缀则停止
  if (bestPrefix?.modifier === 'prefer') {
    steps.push({
      location: bestPrefix,
      role: 'prefer',
      matched: true,
      note: '最长前缀为 ^~，跳过正则，直接采用'
    })
    return finishMatch(
      uri,
      path,
      query,
      bestPrefix,
      '最长前缀匹配且修饰符为 ^~，不再检查正则',
      steps,
      locations
    )
  }

  // 3. 正则按配置顺序
  for (const loc of locations) {
    if (loc.modifier !== 'regex' && loc.modifier !== 'iregex') continue
    const re = compileNginxRegex(loc.pattern, loc.modifier === 'iregex')
    if (!re) {
      steps.push({
        location: loc,
        role: 'regex',
        matched: false,
        note: '正则无法在浏览器中编译，已跳过'
      })
      continue
    }
    const hit = re.test(path)
    steps.push({
      location: loc,
      role: 'regex',
      matched: hit,
      note: hit ? '正则命中（配置顺序优先，立即采用）' : '正则未命中'
    })
    if (hit) {
      return finishMatch(
        uri,
        path,
        query,
        loc,
        '正则 location 按配置顺序第一个命中',
        steps,
        locations
      )
    }
  }

  // 4. 回退最长前缀
  if (bestPrefix) {
    steps.push({
      location: bestPrefix,
      role: 'fallback',
      matched: true,
      note: '无正则命中，采用最长前缀'
    })
    return finishMatch(
      uri,
      path,
      query,
      bestPrefix,
      '无精确/正则命中，使用最长前缀匹配',
      steps,
      locations
    )
  }

  return {
    uri,
    path,
    query,
    matched: null,
    reason: '没有任何 location 匹配该路径',
    steps,
    locations
  }
}

function finishMatch(
  uri: string,
  path: string,
  query: string,
  loc: NginxLocation,
  reason: string,
  steps: LocationMatchStep[],
  locations: NginxLocation[]
): LocationMatchResult {
  const proxy = resolveProxyPass(path, query, loc)
  return {
    uri,
    path,
    query,
    matched: loc,
    reason,
    upstreamUri: proxy?.upstreamUri,
    upstreamTarget: proxy?.upstreamTarget,
    steps,
    locations
  }
}

/**
 * 计算 proxy_pass 替换后的上游 URI（简化版官方规则）：
 * - proxy_pass 带 URI 路径（含尾 /）时：用该 URI 替换 location 匹配的前缀部分
 * - 仅 host（无路径）时：原样转发完整 URI
 * - 正则 location 的 proxy_pass 一般不应带 URI 路径
 */
export function resolveProxyPass(
  path: string,
  query: string,
  loc: NginxLocation
): { upstreamUri: string; upstreamTarget: string } | null {
  if (!loc.proxyPass) return null
  const target = loc.proxyPass.trim()
  // 变量形式不展开
  if (target.includes('$')) {
    return { upstreamUri: `${path}${query}`, upstreamTarget: target }
  }

  // http://host、http://host/、http://upstream_name/path
  const m = target.match(/^(https?:\/\/[^/]+)(\/.*)?$/i)
  if (!m) {
    return { upstreamUri: `${path}${query}`, upstreamTarget: target }
  }

  const origin = m[1]
  const passUri = m[2] // undefined | "/" | "/v1/" 等

  // 无 URI 部分：原样转发
  if (passUri === undefined) {
    return {
      upstreamUri: `${path}${query}`,
      upstreamTarget: `${origin}${path}${query}`
    }
  }

  // 正则 location：官方不建议 proxy_pass 带 URI；此处仍做字面拼接提示
  if (loc.modifier === 'regex' || loc.modifier === 'iregex') {
    return {
      upstreamUri: `${passUri.replace(/\/$/, '')}${query}`,
      upstreamTarget: `${origin}${passUri}${query}`.replace(/([^:]\/)\/+/g, '$1')
    }
  }

  // 前缀替换：location 前缀 → passUri
  const prefix = loc.pattern
  let rest = path.startsWith(prefix) ? path.slice(prefix.length) : path.replace(/^\//, '')
  // passUri 已含路径，与 rest 拼接
  let newPath = `${passUri}${rest}`.replace(/\/{2,}/g, '/')
  // 保留 passUri 设计的尾 /
  if (passUri.endsWith('/') && !newPath.endsWith('/') && rest === '') {
    newPath = passUri
  }

  return {
    upstreamUri: `${newPath}${query}`,
    upstreamTarget: `${origin}${newPath}${query}`.replace(/([^:]\/)\/+/g, '$1')
  }
}

export function matchMany(paths: string[], source: string): LocationMatchResult[] {
  return paths.map(p => matchLocation(p, source))
}

/**
 * 轻量静态校验：括号配对、指令分号、常见坑位提示。
 * 不做完整 nginx 语法解析，目标是前端快速排错。
 */
function pushIssue(
  issues: NginxIssue[],
  severity: NginxIssueSeverity,
  category: NginxIssueCategory,
  line: number,
  message: string
) {
  issues.push({ severity, category, line, message })
}

/**
 * 轻量静态校验：括号配对、指令分号、常见坑位 + 安全/最佳实践提示。
 * 参考 Gixy / nginxconfig.io 常见检查，不做完整 nginx 语法解析。
 */
export function validateNginxConfig(source: string): NginxIssue[] {
  const issues: NginxIssue[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  if (!source.trim()) {
    return [{ severity: 'error', category: 'syntax', line: 1, message: '配置内容为空' }]
  }

  // 括号栈：记录 { 所在行
  const braceStack: number[] = []
  // 字符串/注释状态（按行简化，支持 " ' 与 # 注释）
  let inDQuote = false
  let inSQuote = false
  let addHeaderCount = 0
  let locationWithAddHeader = 0
  let hasSslListen = false
  let hasSslCert = false
  let hasHttpRedirect = false
  let hasProxyPass = false
  let proxyMissingHostHeader = false

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const raw = lines[i]
    let code = ''

    // 去掉注释与引号内容，仅对“代码面”做结构检查
    for (let j = 0; j < raw.length; j++) {
      const ch = raw[j]
      const prev = j > 0 ? raw[j - 1] : ''

      if (!inDQuote && !inSQuote && ch === '#') break

      if (ch === '"' && prev !== '\\' && !inSQuote) {
        inDQuote = !inDQuote
        continue
      }
      if (ch === "'" && prev !== '\\' && !inDQuote) {
        inSQuote = !inSQuote
        continue
      }

      if (!inDQuote && !inSQuote) code += ch
    }

    const trimmedCode = code.trim()
    if (!trimmedCode) continue

    for (const ch of trimmedCode) {
      if (ch === '{') braceStack.push(lineNo)
      else if (ch === '}') {
        if (braceStack.length === 0) {
          pushIssue(issues, 'error', 'syntax', lineNo, '多余的右花括号 }')
        } else {
          braceStack.pop()
        }
      }
    }

    // 指令行应以 ; 或 { 或 } 结束（忽略单独的 }）
    if (trimmedCode !== '}' && !/[;{]$/.test(trimmedCode)) {
      // 允许 if (...) 同行未写完的极少数写法外，绝大多数缺分号
      if (!/^if\s*\(/.test(trimmedCode) || !trimmedCode.endsWith(')')) {
        pushIssue(
          issues,
          'error',
          'syntax',
          lineNo,
          '指令可能缺少结尾分号 ;（或以 { 开始的块）'
        )
      }
    }

    if (/\bproxy_pass\b/.test(trimmedCode)) {
      hasProxyPass = true
      const m = trimmedCode.match(/proxy_pass\s+([^;]+);/)
      if (m) {
        const target = m[1].trim()
        if (target.includes(' ') && !target.includes('$')) {
          pushIssue(issues, 'warning', 'syntax', lineNo, 'proxy_pass 目标含空格，请确认是否写错')
        }
        // Gixy 风格：带变量的 proxy_pass 可能 SSRF
        if (/\$/.test(target) && /https?:\/\//i.test(target)) {
          pushIssue(
            issues,
            'warning',
            'security',
            lineNo,
            'proxy_pass 含变量，可能被构造成内网地址（SSRF 风险），请限制可解析目标'
          )
        }
      }
    }

    if (/\badd_header\b/.test(trimmedCode)) {
      addHeaderCount++
      if (/location\s+/.test(source.slice(Math.max(0, source.indexOf(raw) - 200), source.indexOf(raw) + raw.length))) {
        // 粗略：同行或邻近 — 下面块扫描更准
      }
    }

    // 危险/易错提示
    if (/\bserver_name\s+_;/.test(trimmedCode) || /\bserver_name\s+""\s*;/.test(trimmedCode)) {
      pushIssue(
        issues,
        'warning',
        'practice',
        lineNo,
        'server_name 使用默认占位，生产环境建议写明确域名'
      )
    }

    if (/\blisten\s+80\b/.test(trimmedCode) && /\bssl\b/.test(trimmedCode)) {
      pushIssue(
        issues,
        'warning',
        'practice',
        lineNo,
        'listen 80 上出现 ssl，通常 HTTPS 应 listen 443 ssl'
      )
    }

    if (/\blisten\s+[^;]*\bssl\b/.test(trimmedCode)) hasSslListen = true
    if (/\bssl_certificate\b/.test(trimmedCode)) hasSslCert = true
    if (/\breturn\s+301\s+https:\/\//.test(trimmedCode)) hasHttpRedirect = true

    if (/\balias\s+/.test(trimmedCode)) {
      const aliasM = trimmedCode.match(/alias\s+([^;]+);/)
      if (aliasM) {
        const aliasPath = aliasM[1].trim()
        if (!aliasPath.endsWith('/') && !/\.[a-zA-Z0-9]+$/.test(aliasPath)) {
          pushIssue(
            issues,
            'warning',
            'security',
            lineNo,
            '目录型 alias 路径建议以 / 结尾，避免路径拼接错误 / 路径穿越（Gixy: alias traversal）'
          )
        }
      }
    }

    if (/\broot\s+/.test(trimmedCode) && /\balias\s+/.test(trimmedCode)) {
      pushIssue(issues, 'warning', 'syntax', lineNo, '同一指令行同时出现 root 与 alias，请拆分检查')
    }

    // if is evil（官方警告）
    if (/^\s*if\s*\(/.test(trimmedCode) && !/return\s+\d+/.test(trimmedCode)) {
      pushIssue(
        issues,
        'info',
        'practice',
        lineNo,
        'nginx if 有副作用（if is evil），复杂逻辑优先 map / 拆 location / 应用层处理'
      )
    }

    // Host 头伪造相关
    if (/\bproxy_set_header\s+Host\s+\$http_host\s*;/.test(trimmedCode)) {
      pushIssue(
        issues,
        'info',
        'security',
        lineNo,
        'Host 使用 $http_host 含端口；多数场景用 $host 更安全一致'
      )
    }

    if (/\bvalid_referers\b/.test(trimmedCode) && /\bnone\b/.test(trimmedCode)) {
      pushIssue(
        issues,
        'warning',
        'security',
        lineNo,
        'valid_referers 含 none：允许无 Referer 请求，防盗链可能被绕过'
      )
    }

    // 绝对开放的 CORS
    if (
      /Access-Control-Allow-Origin[^;]*\*/.test(trimmedCode) &&
      /Access-Control-Allow-Credentials[^;]*true/i.test(source)
    ) {
      pushIssue(
        issues,
        'warning',
        'security',
        lineNo,
        'CORS 不能同时使用 Allow-Origin: * 与 Allow-Credentials: true'
      )
    }

    if (/\bssl_protocols\b/.test(trimmedCode) && /SSLv3|TLSv1[^.\d]|TLSv1\.0|TLSv1\.1/.test(trimmedCode)) {
      pushIssue(
        issues,
        'warning',
        'security',
        lineNo,
        'ssl_protocols 含过时协议（SSLv3/TLSv1/TLSv1.1），建议仅 TLSv1.2 TLSv1.3'
      )
    }

    if (/\bclient_max_body_size\s+0\s*;/.test(trimmedCode)) {
      pushIssue(
        issues,
        'info',
        'practice',
        lineNo,
        'client_max_body_size 0 表示不限制，可能被大包打满磁盘/内存'
      )
    }

    if (/\bautoindex\s+on\s*;/.test(trimmedCode)) {
      pushIssue(issues, 'warning', 'security', lineNo, 'autoindex on 会暴露目录列表，生产环境慎用')
    }

    if (/\bdav_methods\b/.test(trimmedCode) || /\bcreate_full_put_path\s+on\s*;/.test(trimmedCode)) {
      pushIssue(issues, 'warning', 'security', lineNo, '开启 WebDAV 写方法时请严格限制访问来源与鉴权')
    }
  }

  if (inDQuote || inSQuote) {
    pushIssue(issues, 'error', 'syntax', lines.length, '存在未闭合的引号')
  }

  for (const openLine of braceStack) {
    pushIssue(issues, 'error', 'syntax', openLine, '花括号 { 未闭合')
  }

  // 二次：location 块内 proxy_pass / 头 / add_header
  const locations = extractLocations(source)
  for (const loc of locations) {
    if (loc.proxyPass) {
      const target = loc.proxyPass
      const locHasSlash = loc.pattern.endsWith('/')
      const passHasPath = /https?:\/\/[^/]+\/./i.test(target) || /https?:\/\/[^/]+\/$/i.test(target)
      const passHasSlash = /\/$/.test(target.replace(/\$[a-zA-Z0-9_]+$/, ''))

      if (locHasSlash && !passHasSlash && /^https?:\/\//.test(target) && !target.includes('$')) {
        pushIssue(
          issues,
          'warning',
          'practice',
          loc.line,
          `location ${loc.pattern} 带尾 /，而 proxy_pass 未带尾 /：URI 会原样转发。若希望剥前缀，请写成 proxy_pass .../;`
        )
      }
      if (
        !locHasSlash &&
        passHasPath &&
        loc.modifier !== 'regex' &&
        loc.modifier !== 'iregex' &&
        /^https?:\/\//.test(target)
      ) {
        pushIssue(
          issues,
          'warning',
          'practice',
          loc.line,
          `location ${loc.pattern} 不带尾 /，proxy_pass 却带 URI 路径：前缀替换规则可能不符合预期`
        )
      }

      // 正则 location + proxy_pass 带 URI
      if (
        (loc.modifier === 'regex' || loc.modifier === 'iregex') &&
        /https?:\/\/[^/]+\//i.test(target)
      ) {
        pushIssue(
          issues,
          'warning',
          'practice',
          loc.line,
          '正则 location 的 proxy_pass 一般不应带 URI 路径，行为与预期常不符'
        )
      }
    }

    // alias + 无尾 / 已在行扫描
    if (loc.alias && loc.pattern.endsWith('/') && !loc.alias.endsWith('/')) {
      pushIssue(
        issues,
        'warning',
        'security',
        loc.line,
        `alias 与 location ${loc.pattern} 尾 / 不一致，可能导致路径穿越或 404`
      )
    }
  }

  // 块级扫描：proxy 缺 Host、location 内 add_header 覆盖
  const blockRegex =
    /location\s+(?:=\s*|~\*\s*|~\s*|\^~\s*)?(?:"[^"]+"|'[^']+'|\S+)\s*\{([\s\S]*?)\}/g
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = blockRegex.exec(source)) !== null) {
    const body = blockMatch[1]
    const line = source.slice(0, blockMatch.index).split('\n').length
    if (/\bproxy_pass\b/.test(body)) {
      if (!/\bproxy_set_header\s+Host\b/.test(body) && !/\bproxy_set_header\s+Host\b/.test(source)) {
        // 仅当该 location 自己 proxy 且未见 Host 时提示
        if (!/\bproxy_set_header\s+Host\b/.test(body)) {
          proxyMissingHostHeader = true
          pushIssue(
            issues,
            'info',
            'practice',
            line,
            '反代 location 建议设置 proxy_set_header Host $host（及 X-Forwarded-*）'
          )
        }
      }
      if (/\bproxy_set_header\s+Connection\s+""\s*;/.test(body) === false && /\bkeepalive\b/.test(source)) {
        // 有 upstream keepalive 时常见遗漏
        if (/\bupstream\b[\s\S]*keepalive/.test(source) && /\bproxy_pass\s+http:\/\/[a-zA-Z_]/.test(body)) {
          pushIssue(
            issues,
            'info',
            'practice',
            line,
            'upstream 启用了 keepalive 时，location 内建议 proxy_http_version 1.1 且 Connection ""'
          )
        }
      }
    }
    if (/\badd_header\b/.test(body)) {
      locationWithAddHeader++
    }
  }

  if (addHeaderCount > 0 && locationWithAddHeader > 0) {
    // Gixy: add_header inheritance
    pushIssue(
      issues,
      'info',
      'security',
      1,
      '存在 location 级 add_header：子块会清空父级 add_header 继承，安全头需在子块重复声明（Gixy）'
    )
  }

  if (hasSslListen && !hasSslCert) {
    pushIssue(issues, 'warning', 'practice', 1, '已 listen ssl 但未发现 ssl_certificate，证书指令可能在 include 中')
  }

  if (hasSslListen && !hasHttpRedirect && /\blisten\s+80\b/.test(source)) {
    pushIssue(
      issues,
      'info',
      'practice',
      1,
      '同时存在 80 与 SSL：可考虑 80 端口 return 301 跳转到 HTTPS'
    )
  }

  if (hasProxyPass && !/X-Forwarded-For|X-Real-IP/.test(source)) {
    pushIssue(
      issues,
      'info',
      'practice',
      1,
      '配置含 proxy_pass 但未设置 X-Real-IP / X-Forwarded-For，后端可能拿不到真实客户端 IP'
    )
  }

  // 避免未使用变量告警
  void proxyMissingHostHeader

  // 排序：error > warning > info，再按行号
  const rank: Record<NginxIssueSeverity, number> = { error: 0, warning: 1, info: 2 }
  issues.sort((a, b) => {
    if (a.severity !== b.severity) return rank[a.severity] - rank[b.severity]
    return a.line - b.line
  })

  // 去重
  const seen = new Set<string>()
  return issues.filter(issue => {
    const key = `${issue.severity}:${issue.category}:${issue.line}:${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
