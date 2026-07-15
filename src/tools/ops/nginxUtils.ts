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
  /** 分组：basic / security / performance / proxy / advanced / log */
  group?: string
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
    group: 'proxy',
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
    group: 'basic',
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
    group: 'proxy',
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
    group: 'basic',
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
    group: 'security',
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
    group: 'proxy',
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
    group: 'basic',
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
    group: 'advanced',
    description: '简单跳转优先 return；复杂路径改写再用 rewrite，并注意 last/break/redirect/permanent。',
    example: `# 推荐：固定跳转
location = /old {
    return 301 /new;
}

# 捕获改写（站内）
location /blog/ {
    rewrite ^/blog/(.*)$ /posts/$1 last;
}

# 整段路径 301 到外站，并保留后续 path
location ^~ /old/path {
    rewrite ^/old/path(.*)$ http://a.com/new/path$1 permanent;
}

# 等价写法（更直观时优先 return）
# location ^~ /old/path {
#     return 301 http://a.com/new/path$request_uri;  # 注意：会带上 /old/path 前缀，需自行裁剪时仍用 rewrite
# }`,
    notes: [
      'last：停止本 location 规则，用新 URI 重新匹配 location。',
      'break：停止本 location 后续 rewrite，不重新匹配。',
      'redirect / permanent：对外 302 / 301 跳转。',
      'rewrite 目标若是 http:// 或 https:// 完整 URL，会直接对外跳转。',
      'location ^~ 前缀匹配且不再走正则 location，适合整目录搬家。',
      '能 return 就不要 rewrite，可读性更好；需要改写 path 前缀时再用 rewrite 捕获。'
    ]
  },
  {
    id: 'websocket',
    title: 'WebSocket 反代',
    tags: ['websocket', 'proxy_pass'],
    group: 'proxy',
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
    group: 'security',
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
    group: 'performance',
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
    group: 'security',
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
    group: 'basic',
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
    group: 'basic',
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
    group: 'security',
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
  },
  {
    id: 'ssl-optimization',
    title: 'SSL 调优',
    tags: ['ssl', 'performance'],
    group: 'performance',
    description: 'SSL 会话缓存、OCSP Stapling、HSTS 与协议配置，提升 HTTPS 性能与安全。',
    example: `server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/example.crt;
    ssl_certificate_key /etc/nginx/ssl/example.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    ssl_session_cache    shared:SSL:10m;
    ssl_session_timeout  10m;
    ssl_session_tickets  off;

    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}`,
    notes: [
      'ssl_session_cache shared:SSL:10m 约可存 40000 个会话。',
      'OCSP Stapling 减少客户端证书验证延迟。',
      'HSTS max-age 从低到高逐渐加大，确认 HTTPS 正常后再长时间锁死。',
      'TLSv1.3 需 OpenSSL 1.1.1+。'
    ]
  },
  {
    id: 'server-tokens',
    title: '隐藏版本号',
    tags: ['security'],
    group: 'security',
    description: 'server_tokens off 隐藏 Nginx 版本号，减少信息泄露风险。',
    example: `http {
    server_tokens off;

    # 若需要保留 Server 头但只显示 nginx，也可用 server_tokens on;
}`,
    notes: [
      'server_tokens off 使 Server 头仅显示 nginx 不带版本号。',
      '建议配合 error_page 自定义错误页，避免版本信息暴露在错误页脚注中。',
      '这不是安全防御，只是减少信息收集面。'
    ]
  },
  {
    id: 'custom-error-pages',
    title: '自定义错误页',
    tags: ['error_page'],
    group: 'basic',
    description: '统一错误页样式，用户看不到后端 502 原始页。',
    example: `server {
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;

    location /404.html {
        internal;
        root /var/www/errors;
    }

    location /50x.html {
        internal;
        root /var/www/errors;
    }
}`,
    notes: [
      '错误页 location 设为 internal，禁止外部直接访问。',
      '可在 error_page 后加 named location 实现更复杂逻辑：error_page 502 @fallback;',
      '状态码替换可用 = 保持原状态：error_page 404 =200 /custom.html;'
    ]
  },
  {
    id: 'log-format',
    title: '日志格式与条件',
    tags: ['log'],
    group: 'log',
    description: '自定义日志格式，便于排查反代后链路的真实 IP 与耗时。',
    example: `http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    log_format upstream '$remote_addr [$time_local] "$request" '
                        'status=$status body_bytes=$body_bytes_sent '
                        'upstream_addr=$upstream_addr '
                        'upstream_status=$upstream_status '
                        'upstream_response_time=\${upstream_response_time}s '
                        'request_time=$request_time';

    access_log /var/log/nginx/access.log main;

    # 健康检查/静态资源不记 access_log
    location /health {
        access_log off;
        return 200 "ok";
    }
}`,
    notes: [
      'upstream 日志格式记录上游地址、响应状态码与耗时，排查 502/504 必备。',
      'access_log off 可关闭特定 location 的日志，减轻 I/O。',
      'error_log 支持 warn / error / crit 级别。'
    ]
  },
  {
    id: 'microcache',
    title: 'FastCGI 微缓存',
    tags: ['cache', 'performance'],
    group: 'performance',
    description: '对 PHP 动态页做几秒微缓存，大幅降低上游压力（需 FastCGI 模块）。',
    example: `http {
    fastcgi_cache_path /var/cache/nginx levels=1:2 keys_zone=fcgicache:10m inactive=60m;
    fastcgi_cache_key "$scheme$request_method$host$request_uri";
    fastcgi_cache_use_stale error timeout invalid_header updating;

    server {
        location ~ \\.php$ {
            include fastcgi_params;
            fastcgi_pass 127.0.0.1:9000;

            fastcgi_cache fcgicache;
            fastcgi_cache_valid 200 60m;
        }
    }
}`,
    notes: [
      'keys_zone 大小建议 5–10m，大约可存几千个缓存键。',
      '对动态内容设置 1m–5m 极短缓存即可显著降低 90% 上游请求。',
      'fastcgi_cache_bypass 与 fastcgi_no_cache 配合 Cookie 判断跳过缓存。'
    ]
  },
  {
    id: 'deny-sensitive',
    title: '拦截敏感路径与隐藏文件',
    tags: ['security', 'deny'],
    group: 'security',
    description: '禁止访问 .git、.env、备份文件等，减少源码与密钥泄露面。',
    example: `# 隐藏文件 / 版本库
location ~ /\\.(?!well-known) {
    deny all;
}

# 常见敏感后缀
location ~* \\.(env|ini|log|bak|sql|swp|dist|old)$ {
    deny all;
}

# 明确拦截
location ~* /(composer\\.(json|lock)|package(-lock)?\\.json|yarn\\.lock)$ {
    deny all;
}

location = /.env {
    deny all;
}`,
    notes: [
      '^(?!well-known) 保留 ACME / Let’s Encrypt 验证路径。',
      'deny all 默认 403；也可用 return 404 降低探测价值。',
      '静态站更建议在构建产物目录外根本不放敏感文件。'
    ]
  },
  {
    id: 'ip-allowlist',
    title: 'IP 白名单 / 黑名单',
    tags: ['security', 'allow', 'deny'],
    group: 'security',
    description: '管理后台、内网接口按 IP 放行；配合 real_ip 模块才可信。',
    example: `location /admin/ {
    # 先 allow 后 deny
    allow 10.0.0.0/8;
    allow 192.168.1.0/24;
    allow 203.0.113.10;
    deny all;

    proxy_pass http://127.0.0.1:3000/;
}

# 全局黑名单可用 geo + if / map
geo $blocked {
    default 0;
    198.51.100.0/24 1;
}

server {
    if ($blocked) {
        return 403;
    }
}`,
    notes: [
      'allow/deny 按顺序匹配，最后一条 deny all 兜底。',
      '反代后 $remote_addr 是上游 IP，需配合 set_real_ip_from。',
      '云环境 IP 变动大时优先网关鉴权，而不是硬编码 IP。'
    ]
  },
  {
    id: 'real-ip',
    title: '真实客户端 IP（CDN/反代）',
    tags: ['real_ip', 'proxy'],
    group: 'proxy',
    description: '在 CDN 或前置 LB 后还原真实 IP，供限流、日志、白名单使用。',
    example: `# 信任的前置代理网段
set_real_ip_from 10.0.0.0/8;
set_real_ip_from 172.16.0.0/12;
set_real_ip_from 192.168.0.0/16;
# Cloudflare 等还需填其官方回源 IP 段

real_ip_header X-Forwarded-For;
real_ip_recursive on;

# 之后 $remote_addr 即为真实客户端 IP
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;`,
    notes: [
      '只信任自己的前置代理网段，勿对全网开放 real_ip。',
      'real_ip_recursive on 会从右往左跳过受信任代理。',
      '日志里同时记 $remote_addr 与 $http_x_forwarded_for 便于核对。'
    ]
  },
  {
    id: 'www-redirect',
    title: 'www 与裸域互跳',
    tags: ['server', 'rewrite'],
    group: 'basic',
    description: '统一主域名，避免 Cookie / SEO 双域分裂。',
    example: `# 裸域 → www
server {
    listen 80;
    listen 443 ssl http2;
    server_name example.com;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    return 301 https://www.example.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.example.com;
    # 业务配置 ...
}

# 或 www → 裸域
# return 301 https://example.com$request_uri;`,
    notes: [
      '证书需覆盖跳转前后两个域名（或泛域名）。',
      '优先 return 301，不要用 rewrite 做固定域名跳转。',
      'HSTS 开启后改主域要更谨慎。'
    ]
  },
  {
    id: 'default-server',
    title: 'default_server 防误匹配',
    tags: ['server', 'security'],
    group: 'security',
    description: '未识别 Host 时落到默认站，避免被扫到错误业务站。',
    example: `# 默认拒绝未知域名
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    ssl_certificate     /etc/nginx/ssl/dummy.crt;
    ssl_certificate_key /etc/nginx/ssl/dummy.key;
    return 444;   # 直接断开，或 404
}

server {
    listen 443 ssl http2;
    server_name app.example.com;
    # 真实业务
}`,
    notes: [
      '444 是 Nginx 特有状态：关闭连接不回响应体。',
      '每个 listen 地址端口只能有一个 default_server。',
      '公网证书扫描时 dummy 证书仍可能被发现，可配合防火墙。'
    ]
  },
  {
    id: 'maintenance-mode',
    title: '维护模式 / 维护页',
    tags: ['maintenance', 'error_page'],
    group: 'basic',
    description: '发版时一键切维护页，可对探活或白名单 IP 放行。',
    example: `server {
    listen 80;
    server_name app.example.com;
    root /var/www/app;

    # 存在该文件则进入维护（可用脚本 touch/rm）
    if (-f $document_root/maintenance.on) {
        return 503;
    }

    error_page 503 @maintenance;
    location @maintenance {
        root /var/www/errors;
        rewrite ^(.*)$ /maintenance.html break;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 健康检查始终可用
    location = /health {
        access_log off;
        return 200 "ok\\n";
        add_header Content-Type text/plain;
    }
}`,
    notes: [
      'if 文件存在判断适合简单开关；复杂场景可用 map + 变量。',
      '维护期间可 allow 运维 IP 继续访问真实应用。',
      '503 比 200 更利于监控与搜索引擎理解临时不可用。'
    ]
  },
  {
    id: 'health-check',
    title: '健康检查端点',
    tags: ['health', 'ops'],
    group: 'basic',
    description: '给 LB / K8s 探针用的轻量探活，不打业务日志。',
    example: `location = /health {
    access_log off;
    add_header Content-Type text/plain;
    return 200 "ok\\n";
}

location = /ready {
    access_log off;
    # 可代理到应用就绪接口
    proxy_pass http://127.0.0.1:3000/ready;
    proxy_connect_timeout 1s;
    proxy_read_timeout 1s;
}

# 可选：仅内网可访问
# allow 10.0.0.0/8;
# deny all;`,
    notes: [
      'liveness 用本地 return 200；readiness 再查上游更稳妥。',
      'access_log off 避免探针打爆磁盘。',
      '不要把复杂业务逻辑塞进 /health。'
    ]
  },
  {
    id: 'proxy-cache',
    title: 'proxy_cache 反代缓存',
    tags: ['cache', 'proxy', 'performance'],
    group: 'performance',
    description: '缓存上游 GET 响应，适合只读 API、活动页、文档站。',
    example: `http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=apicache:20m
                     max_size=2g inactive=60m use_temp_path=off;

    server {
        location /api/public/ {
            proxy_pass http://app_backend/;
            proxy_cache apicache;
            proxy_cache_valid 200 301 10m;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_background_update on;
            proxy_cache_lock on;
            add_header X-Cache-Status $upstream_cache_status;
            proxy_ignore_headers Set-Cookie;
            proxy_hide_header Set-Cookie;
        }
    }
}`,
    notes: [
      '带 Cookie / Authorization 的个性化接口不要盲目缓存。',
      'X-Cache-Status: MISS/HIT/BYPASS/EXPIRED/STALE 便于排障。',
      'keys_zone 存键元数据，max_size 限制磁盘缓存总量。'
    ]
  },
  {
    id: 'proxy-buffering-sse',
    title: '关闭缓冲（SSE/流式）',
    tags: ['proxy', 'sse', 'stream'],
    group: 'proxy',
    description: 'SSE、大文件流式下载、LLM 流式输出需关闭 proxy_buffering。',
    example: `location /api/stream/ {
    proxy_pass http://app_backend/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding on;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}`,
    notes: [
      'proxy_buffering off 会立刻把上游字节转给客户端。',
      '同时建议拉长 read/send 超时，避免长流被掐断。',
      '高并发流式会占用更多 worker 连接，注意容量。'
    ]
  },
  {
    id: 'grpc-proxy',
    title: 'gRPC 反向代理',
    tags: ['grpc', 'proxy'],
    group: 'proxy',
    description: 'HTTP/2 + grpc_pass 转发 gRPC 服务（需 Nginx 1.13.10+）。',
    example: `server {
    listen 443 ssl http2;
    server_name grpc.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        grpc_pass grpc://127.0.0.1:50051;
        # 上游也是 TLS 时用 grpcs://
        # grpc_pass grpcs://grpc_backend;

        grpc_set_header Host $host;
        grpc_set_header X-Real-IP $remote_addr;
        grpc_read_timeout 300s;
        error_page 502 = /grpc_internal_error;
    }

    location = /grpc_internal_error {
        internal;
        default_type application/grpc;
        add_header grpc-status 14;
        add_header content-length 0;
        return 204;
    }
}`,
    notes: [
      '客户端到 Nginx 必须是 HTTP/2（listen ... http2）。',
      'grpc_pass 与 proxy_pass 不要混用在同一 gRPC location。',
      '超时、包体大小按业务 RPC 调整 client_max_body_size。'
    ]
  },
  {
    id: 'auth-request',
    title: 'auth_request 鉴权转发',
    tags: ['auth', 'security', 'advanced'],
    group: 'advanced',
    description: '每个请求先问鉴权服务，通过后再访问上游（网关常见模式）。',
    example: `location /api/ {
    auth_request /_auth;
    auth_request_set $auth_user $upstream_http_x_user_id;
    proxy_set_header X-User-Id $auth_user;
    proxy_pass http://app_backend/;
}

location = /_auth {
    internal;
    proxy_pass http://auth_service/verify;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
    proxy_set_header Authorization $http_authorization;
}`,
    notes: [
      '鉴权 location 必须 internal，禁止外部直访。',
      '2xx 放行，401/403 直接返回给客户端。',
      'auth_request_set 可把鉴权服务响应头注入业务请求。'
    ]
  },
  {
    id: 'x-accel-redirect',
    title: 'X-Accel-Redirect 受控下载',
    tags: ['download', 'internal', 'advanced'],
    group: 'advanced',
    description: '应用鉴权后通过内部重定向让 Nginx 高效发送文件。',
    example: `location /download/ {
    # 应用接口：校验权限后返回头 X-Accel-Redirect: /protected/file.pdf
    proxy_pass http://app_backend;
}

location /protected/ {
    internal;
    alias /data/files/;
    # 可选强制下载名
    # add_header Content-Disposition 'attachment; filename="file.pdf"';
}`,
    notes: [
      'internal 保证 /protected/ 不能被用户直接访问。',
      '比应用自己流式读盘更省内存、吞吐更高。',
      '对象存储场景可改为应用签发短时 URL。'
    ]
  },
  {
    id: 'hotlink-protection',
    title: '防盗链 valid_referers',
    tags: ['security', 'referer'],
    group: 'security',
    description: '限制图片/静态资源只能从本站或白名单域名引用。',
    example: `location ~* \\.(gif|jpg|jpeg|png|webp|mp4)$ {
    valid_referers none blocked server_names
                   *.example.com example.com;
    if ($invalid_referer) {
        return 403;
        # 或 rewrite 到提示图：rewrite .* /hotlink.png break;
    }
    root /var/www/static;
    expires 30d;
}`,
    notes: [
      'none：无 Referer；blocked：被防火墙抹掉的畸形 Referer。',
      'Referer 可伪造，只能防小白盗链，不能当鉴权。',
      '移动 App / 直接打开图片链接可能无 Referer，按业务取舍 none。'
    ]
  },
  {
    id: 'autoindex',
    title: '目录列表 autoindex',
    tags: ['autoindex', 'static'],
    group: 'basic',
    description: '临时开放目录浏览（内网分发、制品目录）；公网慎用。',
    example: `location /releases/ {
    alias /data/releases/;
    autoindex on;
    autoindex_exact_size off;
    autoindex_localtime on;
    autoindex_format html;

    # 建议加访问控制
    allow 10.0.0.0/8;
    deny all;
}`,
    notes: [
      '公网开启等于暴露文件清单，务必配合鉴权或 IP 限制。',
      'autoindex_format json 便于脚本消费。',
      '生产制品分发更推荐对象存储 + 签名 URL。'
    ]
  },
  {
    id: 'map-common',
    title: 'map 变量映射',
    tags: ['map', 'advanced'],
    group: 'advanced',
    description: '用 map 做 UA 分流、WebSocket Connection、缓存旁路等，比层层 if 更清晰。',
    example: `http {
    # WebSocket
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    # 移动端标记
    map $http_user_agent $is_mobile {
        default 0;
        ~*iphone|android|mobile 1;
    }

    # 登录用户跳过缓存
    map $http_cookie $skip_cache {
        default 0;
        ~*session_id= 1;
    }

    server {
        location / {
            proxy_cache_bypass $skip_cache;
            proxy_no_cache $skip_cache;
            proxy_pass http://app_backend;
        }
    }
}`,
    notes: [
      'map 只能写在 http 上下文。',
      '正则用 ~ / ~*，精确匹配优先于正则。',
      '能 map 解决的就不要堆 if。'
    ]
  },
  {
    id: 'limit-conn',
    title: '连接数限制 limit_conn',
    tags: ['security', 'limit'],
    group: 'security',
    description: '限制单 IP 并发连接，配合 limit_req 防慢速占用与暴力爬取。',
    example: `http {
    limit_conn_zone $binary_remote_addr zone=perip:10m;
    limit_conn_zone $server_name zone=perserver:10m;

    server {
        limit_conn perip 20;
        limit_conn perserver 1000;
        limit_conn_status 429;

        location /download/ {
            limit_conn perip 2;   # 下载更严
            alias /data/files/;
        }
    }
}`,
    notes: [
      'limit_req 限速率，limit_conn 限并发，两者常一起用。',
      '大文件下载场景单 IP 连接数建议收紧。',
      'zone 内存不足时新连接会失败，按 QPS 估算大小。'
    ]
  },
  {
    id: 'subpath-deploy',
    title: '子路径部署 /app/',
    tags: ['location', 'proxy', 'alias'],
    group: 'proxy',
    description: '应用挂在二级路径时处理静态资源与反代前缀剥离。',
    example: `# 前端静态挂在 /app/
location /app/ {
    alias /var/www/app/;
    try_files $uri $uri/ /app/index.html;
}

# API 挂在 /app/api/ 并剥前缀
location /app/api/ {
    proxy_pass http://127.0.0.1:3000/;  # /app/api/users → /users
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Prefix /app;
}

# 注意：alias + try_files 组合易踩坑，复杂 SPA 更推荐独立子域`,
    notes: [
      '前端 publicPath / base 需与子路径一致（如 Vite base: "/app/"）。',
      'proxy_pass 尾 / 决定是否剥前缀。',
      '子路径坑多，条件允许优先子域名部署。'
    ]
  },
  {
    id: 'split-clients',
    title: 'A/B 分流 split_clients',
    tags: ['split_clients', 'advanced'],
    group: 'advanced',
    description: '按百分比把流量分到不同上游，做灰度或实验。',
    example: `http {
    split_clients "$remote_addr$uri" $upstream_variant {
        10%     canary;
        *       stable;
    }

    upstream stable {
        server 10.0.0.11:3000;
    }
    upstream canary {
        server 10.0.0.21:3000;
    }

    server {
        location / {
            proxy_pass http://$upstream_variant;
            proxy_set_header Host $host;
            add_header X-Variant $upstream_variant always;
        }
    }
}`,
    notes: [
      'hash 源建议含 $remote_addr，保证同一用户尽量粘滞。',
      '百分比之和不必写满，* 表示剩余全部。',
      '生产灰度常结合 Cookie / Header 强制进组。'
    ]
  },
  {
    id: 'stub-status',
    title: 'stub_status 基础监控',
    tags: ['status', 'ops', 'log'],
    group: 'log',
    description: '暴露 Nginx 连接计数，供 Prometheus exporter 或探活脚本抓取。',
    example: `location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    deny all;
}`,
    notes: [
      '必须限制来源 IP，切勿公网裸奔。',
      '输出 Active/Accepts/Handled/Requests 等计数。',
      '更完整指标可用 nginx-prometheus-exporter / VTS 模块。'
    ]
  },
  {
    id: 'open-file-cache',
    title: 'open_file_cache 文件元数据缓存',
    tags: ['performance', 'cache'],
    group: 'performance',
    description: '缓存静态文件的 open/stat 结果，降低高并发静态站系统调用。',
    example: `http {
    open_file_cache max=10000 inactive=30s;
    open_file_cache_valid 60s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    server {
        root /var/www/static;
        location / {
            try_files $uri =404;
        }
    }
}`,
    notes: [
      '适合文件数量多、变更不频繁的静态资源盘。',
      '发版替换文件后，inactive/valid 到期前可能短暂旧元数据。',
      '与 sendfile on; tcp_nopush on; 常一起开。'
    ]
  },
  {
    id: 'range-download',
    title: '大文件下载与断点续传',
    tags: ['download', 'performance'],
    group: 'performance',
    description: '开启 sendfile/tcp_nopush，并正确支持 Range 请求。',
    example: `http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
}

server {
    location /files/ {
        alias /data/files/;
        # 默认支持 Range；若上游反代需：
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        max_ranges 1;
        expires 1d;
        add_header Accept-Ranges bytes;
    }
}`,
    notes: [
      '本地静态文件 Nginx 原生支持断点续传。',
      '反代对象存储时要透传 Range，并确认上游 206 行为。',
      '超大文件可配合 limit_rate 限制单连接速度。'
    ]
  },
  {
    id: 'multi-domain',
    title: '多域名 / 多站点',
    tags: ['server', 'server_name'],
    group: 'basic',
    description: '一台 Nginx 托管多个 server_name，证书与根目录分离。',
    example: `server {
    listen 443 ssl http2;
    server_name a.example.com;
    ssl_certificate     /etc/nginx/ssl/a.fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/a.key;
    root /var/www/a;
    location / { try_files $uri $uri/ /index.html; }
}

server {
    listen 443 ssl http2;
    server_name b.example.com api.example.com;
    ssl_certificate     /etc/nginx/ssl/b.fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/b.key;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }
}`,
    notes: [
      'server_name 可写多个；也支持 *.example.com 通配。',
      '证书按域名分文件，或用 SAN / 泛域名一张证。',
      '配合 default_server 兜住未知 Host。'
    ]
  },
  {
    id: 'docker-upstream',
    title: '容器 / Docker 反代',
    tags: ['docker', 'proxy', 'resolver'],
    group: 'proxy',
    description: 'Docker Compose / Swarm 下用解析器动态发现容器 IP。',
    example: `resolver 127.0.0.11 valid=10s ipv6=off;

upstream app {
    zone app 64k;
    server app:3000 resolve;  # 需 plus 或第三方；开源可用变量法
}

server {
    listen 80;
    set $upstream_app app:3000;

    location / {
        # 开源 Nginx 动态 DNS 常用变量 + resolver
        proxy_pass http://$upstream_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`,
    notes: [
      'Docker 内置 DNS 为 127.0.0.11。',
      'proxy_pass 写死容器 IP 会在重建后失效；用主机名 + resolver。',
      '变量形式的 proxy_pass 不会使用 upstream 块的部分特性，注意权衡。'
    ]
  },
  {
    id: 'nextjs-ssr',
    title: 'Next.js / Node SSR 反代',
    tags: ['ssr', 'proxy', 'nextjs'],
    group: 'proxy',
    description: '静态资源长缓存，页面与 API 反代到 Node，兼容 WebSocket。',
    example: `map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name next.example.com;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}`,
    notes: [
      '/_next/static 可长缓存；HTML 页面不要强缓存。',
      'HMR 开发环境需要 WebSocket 头。',
      '生产也可用 export 纯静态 + CDN，无需 Node 常驻。'
    ]
  },
  {
    id: 'acme-challenge',
    title: 'ACME / Let’s Encrypt 验证',
    tags: ['ssl', 'acme', 'certbot'],
    group: 'security',
    description: 'HTTP-01 证书签发时放行 /.well-known/acme-challenge/，其余可继续跳 HTTPS。',
    example: `server {
    listen 80;
    server_name example.com www.example.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}`,
    notes: [
      'certbot webroot 模式常用 root /var/www/certbot。',
      '用 ^~ 前缀避免被正则 location 抢走。',
      'DNS-01 不依赖此路径，适合泛域名证书。'
    ]
  },
  {
    id: 'unix-socket-proxy',
    title: 'Unix Socket 反代',
    tags: ['proxy', 'socket', 'uwsgi'],
    group: 'proxy',
    description: '本机 PHP-FPM / uWSGI / Node 通过 unix socket 通信，比 TCP 少一层网络栈。',
    example: `# PHP-FPM
location ~ \\.php$ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
}

# 通用 HTTP upstream over socket
upstream app_sock {
    server unix:/run/app.sock;
    keepalive 16;
}

location / {
    proxy_pass http://app_sock;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
}`,
    notes: [
      'socket 文件权限需允许 nginx worker 用户访问（www-data 等）。',
      'proxy_pass 写 http://unix:/path: 时语法易错，优先用 upstream。',
      '容器场景 socket 需挂载到同一路径。'
    ]
  },
  {
    id: 'ip-hash-sticky',
    title: '会话保持 ip_hash / hash',
    tags: ['upstream', 'sticky', 'session'],
    group: 'proxy',
    description: '同一客户端尽量打到同一后端，适合有本地会话、未做集中 Session 的应用。',
    example: `# 按客户端 IP 粘滞
upstream app_iphash {
    ip_hash;
    server 10.0.0.11:3000;
    server 10.0.0.12:3000;
}

# 按 Cookie / Header 自定义哈希（一致性更好）
upstream app_hash {
    hash $cookie_jsessionid consistent;
    server 10.0.0.11:3000;
    server 10.0.0.12:3000;
}

server {
    location / {
        proxy_pass http://app_iphash;
        proxy_set_header Host $host;
    }
}`,
    notes: [
      'ip_hash 在 NAT / 公司出口 IP 相同用户多时粘滞效果变差。',
      'consistent 可在扩缩容时减少会话迁移。',
      '现代应用更推荐 Redis 等集中 Session，而不是粘滞。'
    ]
  },
  {
    id: 'proxy-next-upstream',
    title: '上游失败重试 proxy_next_upstream',
    tags: ['proxy', 'upstream', 'retry'],
    group: 'proxy',
    description: '后端 502/超时等失败时自动换下一台 upstream，提高可用性。',
    example: `upstream app_backend {
    server 10.0.0.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:3000 max_fails=3 fail_timeout=30s;
    server 10.0.0.13:3000 backup;
}

server {
    location / {
        proxy_pass http://app_backend;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 2;
        proxy_next_upstream_timeout 10s;
        proxy_connect_timeout 3s;
        proxy_read_timeout 30s;
        proxy_set_header Host $host;
    }
}`,
    notes: [
      '非幂等 POST 慎开自动重试，可能重复下单。',
      'max_fails / fail_timeout 控制短时摘除故障节点。',
      'backup 仅在主节点都不可用时启用。'
    ]
  },
  {
    id: 'proxy-redirect-cookie',
    title: 'proxy_redirect 与 Cookie 路径',
    tags: ['proxy', 'cookie', 'redirect'],
    group: 'proxy',
    description: '修正上游绝对跳转与 Set-Cookie 路径/域名，避免反代后登录态错乱。',
    example: `location /app/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;

    # 把上游 Location: http://127.0.0.1:3000/xxx 改成对外路径
    proxy_redirect http://127.0.0.1:3000/ /app/;
    proxy_redirect / /app/;

    proxy_cookie_path / /app/;
    proxy_cookie_domain localhost example.com;
}`,
    notes: [
      '上游若写死内网域名跳转，浏览器会访问失败，需 proxy_redirect。',
      '子路径部署时 Cookie Path 常要从 / 改成 /app/。',
      '能改应用生成相对 URL 时优先改应用。'
    ]
  },
  {
    id: 'named-location',
    title: '命名 location @name',
    tags: ['location', 'try_files', 'advanced'],
    group: 'advanced',
    description: 'try_files / error_page 跳到命名 location，做回退反代或统一错误处理。',
    example: `location / {
    root /var/www/app;
    try_files $uri $uri/ @backend;
}

location @backend {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

error_page 502 503 504 @fallback;
location @fallback {
    root /var/www/errors;
    rewrite ^(.*)$ /50x.html break;
}`,
    notes: [
      '命名 location 只能内部跳转，不能被浏览器直接请求。',
      'try_files 最后一项可以是 URI 或 @name。',
      '比嵌套 if 更清晰，适合静态优先、未命中再反代。'
    ]
  },
  {
    id: 'satisfy-any',
    title: 'satisfy any：IP 或密码',
    tags: ['auth', 'allow', 'security'],
    group: 'security',
    description: '内网 IP 免密，外网需 Basic Auth，常见于预发/管理端。',
    example: `location /admin/ {
    satisfy any;
    allow 10.0.0.0/8;
    allow 192.168.0.0/16;
    deny all;

    auth_basic "Admin";
    auth_basic_user_file /etc/nginx/.htpasswd;

    proxy_pass http://127.0.0.1:4000/;
}`,
    notes: [
      'satisfy any：allow 或 auth 任一通过即可。',
      'satisfy all：两者都要满足（更严）。',
      '仍须 HTTPS，否则 Basic Auth 明文。'
    ]
  },
  {
    id: 'bot-block-ua',
    title: '按 UA 拦截扫描器 / 爬虫',
    tags: ['security', 'map', 'bot'],
    group: 'security',
    description: '用 map 识别恶意 UA 并直接 403，减轻扫描噪音（可被伪造，仅作辅助）。',
    example: `map $http_user_agent $bad_bot {
    default 0;
    ~* (sqlmap|nikto|nmap|masscan|dirbuster|zgrab) 1;
    ~* (scrapy|httpclient|python-requests)/ 1;
    "" 1;   # 空 UA 视情况拦截
}

server {
    if ($bad_bot) {
        return 403;
    }

    location / {
        proxy_pass http://app_backend;
    }
}`,
    notes: [
      'UA 可伪造，不能替代 WAF / 鉴权。',
      '误杀合法监控探针时把其 UA 加入白名单。',
      '高流量站优先在 CDN / WAF 层拦。'
    ]
  },
  {
    id: 'geo-country-block',
    title: 'geo 网段标记 / 区域限制',
    tags: ['geo', 'security', 'advanced'],
    group: 'advanced',
    description: '用 geo 模块按 IP 网段打标，实现内部放行或粗粒度区域策略。',
    example: `geo $is_internal {
    default 0;
    10.0.0.0/8     1;
    172.16.0.0/12  1;
    192.168.0.0/16 1;
    127.0.0.1/32   1;
}

server {
    location /internal/ {
        if ($is_internal = 0) {
            return 403;
        }
        proxy_pass http://127.0.0.1:3000/;
    }
}`,
    notes: [
      'geo 写在 http 上下文；按最长前缀匹配。',
      '国家级封锁需 GeoIP 数据库与额外模块，本例是网段标记。',
      '复杂条件优先 map，少嵌套 if。'
    ]
  },
  {
    id: 'limit-rate',
    title: '下载限速 limit_rate',
    tags: ['performance', 'download', 'limit'],
    group: 'performance',
    description: '限制单连接下载速度，保护带宽，适合大文件分发。',
    example: `location /files/ {
    alias /data/files/;
    # 前 5MB 不限速，之后 512KB/s
    limit_rate_after 5m;
    limit_rate 512k;

    # 也可按条件：
    # set $limit_rate 100k;
}`,
    notes: [
      'limit_rate 按连接限速，多线程下载会叠加。',
      '可与 limit_conn 组合限制单 IP 并发下载。',
      '单位 k/m 是字节每秒，不是 bit。'
    ]
  },
  {
    id: 'http2-http3',
    title: 'HTTP/2 与 HTTP/3（QUIC）',
    tags: ['ssl', 'http2', 'http3', 'performance'],
    group: 'performance',
    description: '开启 HTTP/2；在支持的版本上补充 QUIC/HTTP/3 监听。',
    example: `server {
    listen 443 ssl;
    listen 443 quic reuseport;   # HTTP/3，需 Nginx 构建支持
    http2 on;                    # 1.25.1+ 推荐写法；旧版用 listen ... http2

    server_name example.com;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # 告知客户端可升级到 h3
    add_header Alt-Svc 'h3=":443"; ma=86400' always;

    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}`,
    notes: [
      'HTTP/3 需要 UDP 443 放行与对应构建（quic 模块）。',
      '旧配置 listen 443 ssl http2 在新版本仍常见，按发行版文档选择。',
      '证书与 TLS1.3 对 H2/H3 体验影响大。'
    ]
  },
  {
    id: 'ssl-reject-handshake',
    title: 'ssl_reject_handshake 默认站',
    tags: ['ssl', 'security', 'default_server'],
    group: 'security',
    description: '未知 SNI 直接拒绝握手，避免默认证书泄露真实站点信息（Nginx 1.19.4+）。',
    example: `server {
    listen 443 ssl default_server;
    ssl_reject_handshake on;
    server_name _;
}

server {
    listen 443 ssl;
    http2 on;
    server_name app.example.com;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # 业务配置
}`,
    notes: [
      '比挂 dummy 证书 + return 444 更干净。',
      'HTTP 80 的 default_server 仍建议单独处理。',
      '老版本可退回 dummy 证书方案。'
    ]
  },
  {
    id: 'brotli-gzip',
    title: 'Brotli + Gzip 压缩',
    tags: ['performance', 'brotli', 'gzip'],
    group: 'performance',
    description: '有 Brotli 模块时优先 br，兼容客户端回落 gzip。',
    example: `http {
    # 需 ngx_brotli 模块
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript
                 application/xml image/svg+xml;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               application/xml image/svg+xml;
    gzip_vary on;
    gzip_proxied any;
}`,
    notes: [
      'Brotli 对文本压缩率通常优于 gzip，CPU 略高。',
      '已预压缩文件可用 brotli_static / gzip_static。',
      '图片/视频等二进制资源不要再压。'
    ]
  },
  {
    id: 'mirror-traffic',
    title: 'mirror 流量镜像',
    tags: ['mirror', 'proxy', 'advanced'],
    group: 'advanced',
    description: '把线上请求复制一份到测试上游，用于回放、压测影子流量（响应丢弃）。',
    example: `location /api/ {
    mirror /mirror-api;
    mirror_request_body on;
    proxy_pass http://prod_backend/;
}

location = /mirror-api {
    internal;
    proxy_pass http://shadow_backend$request_uri;
    proxy_set_header X-Shadow-Request 1;
    proxy_pass_request_body on;
    # 影子流量失败不影响主请求
    proxy_connect_timeout 100ms;
    proxy_read_timeout 100ms;
}`,
    notes: [
      'mirror 子请求失败不会改变主响应。',
      '注意脱敏：镜像可能带 Token / 隐私数据。',
      '高 QPS 时影子上游要能扛或做采样。'
    ]
  },
  {
    id: 'stream-tcp-proxy',
    title: 'stream TCP/UDP 四层反代',
    tags: ['stream', 'tcp', 'udp', 'advanced'],
    group: 'advanced',
    description: '在 stream{} 中转发数据库、MQTT、游戏等非 HTTP 端口。',
    example: `stream {
    upstream mysql_backend {
        server 10.0.0.11:3306;
        server 10.0.0.12:3306 backup;
    }

    server {
        listen 3306;
        proxy_pass mysql_backend;
        proxy_connect_timeout 5s;
        proxy_timeout 10m;
    }

    # UDP 示例
    # server {
    #     listen 53 udp;
    #     proxy_pass dns_backend;
    # }
}`,
    notes: [
      'stream 与 http 同级，写在主配置，不是 server 里。',
      '需要 --with-stream 编译；包管理器版通常已带。',
      'TLS 透传可用 ssl_preread 按 SNI 分流。'
    ]
  },
  {
    id: 'worker-tuning',
    title: 'worker 进程与连接数',
    tags: ['performance', 'worker', 'events'],
    group: 'performance',
    description: '全局进程模型基础调优，高并发静态/反代的起点。',
    example: `worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;   # Linux
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    reset_timedout_connection on;
}`,
    notes: [
      '理论最大连接约 worker_processes × worker_connections。',
      '系统 ulimit -n 需 ≥ worker_rlimit_nofile。',
      '反代场景每个客户端可能占 2 条连接（到客户端 + 到上游）。'
    ]
  },
  {
    id: 'access-log-buffer',
    title: 'access_log 缓冲与条件日志',
    tags: ['log', 'performance'],
    group: 'log',
    description: '缓冲写盘降 I/O；用 if= 条件跳过健康检查与静态资源日志。',
    example: `map $request_uri $loggable {
    default 1;
    ~*^/health 0;
    ~*\\.(js|css|png|jpg|ico|woff2?)$ 0;
}

http {
    access_log /var/log/nginx/access.log main buffer=64k flush=5s if=$loggable;
    error_log  /var/log/nginx/error.log warn;
}`,
    notes: [
      'buffer/flush 减少频繁 write，崩溃时可能丢少量日志。',
      'if= 变量为 0 / 空则不记该请求。',
      '排障时可临时改回同步全量日志。'
    ]
  },
  {
    id: 'json-access-log',
    title: 'JSON 访问日志',
    tags: ['log', 'json', 'ops'],
    group: 'log',
    description: '结构化 access_log，方便 Filebeat / Loki / ELK 解析。',
    example: `log_format json_combined escape=json
    '{'
      '"time_local":"$time_local",'
      '"remote_addr":"$remote_addr",'
      '"request":"$request",'
      '"status":$status,'
      '"body_bytes_sent":$body_bytes_sent,'
      '"request_time":$request_time,'
      '"upstream_response_time":"$upstream_response_time",'
      '"http_referer":"$http_referer",'
      '"http_user_agent":"$http_user_agent",'
      '"http_x_forwarded_for":"$http_x_forwarded_for"'
    '}';

access_log /var/log/nginx/access.json json_combined;`,
    notes: [
      'escape=json 避免 UA 等字段弄坏 JSON。',
      '数值字段不要加引号，便于下游聚合。',
      '字段按团队观测规范增删，保持稳定 schema。'
    ]
  },
  {
    id: 'permissions-policy',
    title: 'Permissions-Policy / 现代安全头',
    tags: ['security', 'header'],
    group: 'security',
    description: '补充 Permissions-Policy、COOP/COEP 等现代头，收紧浏览器能力。',
    example: `server {
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    # 需要跨域隔离时再开（可能影响第三方脚本）
    # add_header Cross-Origin-Opener-Policy same-origin always;
    # add_header Cross-Origin-Embedder-Policy require-corp always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; object-src 'none'" always;
}`,
    notes: [
      '子 location 写了 add_header 会覆盖父级，需重复声明或 include。',
      'CSP 过严会导致页面白屏，先 report-only 再收紧。',
      'always 确保错误响应也带上头。'
    ]
  },
  {
    id: 'proxy-intercept-errors',
    title: '统一上游错误页',
    tags: ['error_page', 'proxy'],
    group: 'basic',
    description: '拦截上游 5xx/4xx，展示站点统一错误页而不是框架默认页。',
    example: `location / {
    proxy_pass http://app_backend;
    proxy_intercept_errors on;
    error_page 500 502 503 504 /50x.html;
    error_page 404 /404.html;
}

location = /50x.html {
    root /var/www/errors;
    internal;
}

location = /404.html {
    root /var/www/errors;
    internal;
}`,
    notes: [
      'proxy_intercept_errors on 后才会用 error_page 接管上游状态码。',
      'API 接口可能更希望返回上游 JSON 错误，不要全局拦截。',
      'internal 防止用户直接打开错误页 URL。'
    ]
  },
  {
    id: 'include-snippets',
    title: 'include 复用片段',
    tags: ['include', 'basic', 'ops'],
    group: 'basic',
    description: '把 SSL、代理头、安全头抽成文件，多站点 include 复用。',
    example: `# /etc/nginx/snippets/proxy-params.conf
# proxy_http_version 1.1;
# proxy_set_header Host $host;
# proxy_set_header X-Real-IP $remote_addr;
# proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
# proxy_set_header X-Forwarded-Proto $scheme;

# /etc/nginx/snippets/ssl-params.conf
# ssl_protocols TLSv1.2 TLSv1.3;
# ssl_session_cache shared:SSL:10m;
# ssl_session_timeout 10m;

server {
    listen 443 ssl;
    http2 on;
    server_name app.example.com;
    include snippets/ssl-params.conf;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location /api/ {
        include snippets/proxy-params.conf;
        proxy_pass http://127.0.0.1:3000/;
    }
}`,
    notes: [
      'include 路径相对 nginx 前缀或写绝对路径。',
      '改公共片段后 nginx -t && reload 全局生效。',
      '避免循环 include；敏感差异仍写在 server 内。'
    ]
  },
  {
    id: 'ipv6-listen',
    title: 'IPv4 / IPv6 双栈监听',
    tags: ['listen', 'ipv6', 'basic'],
    group: 'basic',
    description: '同时监听 IPv4 与 IPv6，避免只开 80/443 的 v4。',
    example: `server {
    listen 80;
    listen [::]:80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name example.com;
    # ...
}`,
    notes: [
      '[::] 为 IPv6 任意地址；部分系统需 net.ipv6.bindv6only 相关设置。',
      '证书与 server_name 对 v4/v6 相同即可。',
      '云安全组 / 防火墙也要放行 IPv6。'
    ]
  },
  {
    id: 'proxy-ssl-upstream',
    title: '上游 HTTPS / 双向 TLS',
    tags: ['proxy', 'ssl', 'mtls'],
    group: 'proxy',
    description: '反代到 HTTPS 上游，校验证书或启用 mTLS 客户端证书。',
    example: `location /secure-api/ {
    proxy_pass https://upstream.internal/;
    proxy_ssl_server_name on;
    proxy_ssl_name upstream.internal;
    proxy_ssl_verify on;
    proxy_ssl_trusted_certificate /etc/nginx/ssl/upstream-ca.pem;
    proxy_ssl_verify_depth 2;

    # 可选：客户端证书（mTLS）
    # proxy_ssl_certificate     /etc/nginx/ssl/client.crt;
    # proxy_ssl_certificate_key /etc/nginx/ssl/client.key;

    proxy_set_header Host upstream.internal;
    proxy_set_header X-Real-IP $remote_addr;
}`,
    notes: [
      'proxy_ssl_server_name on 才会发 SNI，很多上游依赖它。',
      '内网自签证书把 CA 放到 proxy_ssl_trusted_certificate。',
      '调试阶段可临时 proxy_ssl_verify off，生产务必开启。'
    ]
  },
  {
    id: 'internal-only-location',
    title: 'internal 内部 location',
    tags: ['internal', 'security', 'advanced'],
    group: 'advanced',
    description: '仅允许内部重定向访问，用于错误页、鉴权子请求、受控下载。',
    example: `location /private-files/ {
    internal;
    alias /data/private/;
}

location /download/ {
    # 应用返回 X-Accel-Redirect: /private-files/report.pdf
    proxy_pass http://app_backend;
}

location = /_auth {
    internal;
    proxy_pass http://auth_service/verify;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
}`,
    notes: [
      'external 直接访问 internal location 会 404。',
      'error_page / auth_request / mirror / X-Accel-Redirect 可进入。',
      '别把需要公网直链的资源放 internal。'
    ]
  },
  {
    id: 'etag-last-modified',
    title: 'ETag / if_modified_since 缓存协商',
    tags: ['cache', 'etag', 'performance'],
    group: 'performance',
    description: '静态资源 304 协商缓存相关指令，减少重复传输。',
    example: `location /static/ {
    root /var/www;
    etag on;
    if_modified_since exact;
    expires 7d;
    add_header Cache-Control "public";
    access_log off;
}

# 动态内容常关闭 ETag，避免无意义协商
location /api/ {
    etag off;
    proxy_pass http://app_backend/;
}`,
    notes: [
      'etag on 为默认；gzip 后 ETag 行为与模块版本有关。',
      'HTML 入口文件建议 no-cache，静态 hash 文件才长缓存。',
      '反代场景也可透传上游 ETag / Last-Modified。'
    ]
  },
  {
    id: 'add-header-include',
    title: '安全头 include 复用',
    tags: ['security', 'header', 'include'],
    group: 'security',
    description: '把安全响应头抽成片段，避免子 location 覆盖父级 add_header。',
    example: `# /etc/nginx/snippets/security-headers.conf
# add_header X-Content-Type-Options nosniff always;
# add_header X-Frame-Options SAMEORIGIN always;
# add_header Referrer-Policy strict-origin-when-cross-origin always;
# add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

server {
    include snippets/security-headers.conf;

    location /api/ {
        # 子块一旦写 add_header 就不会继承父级，需再次 include
        include snippets/security-headers.conf;
        add_header Access-Control-Allow-Origin $http_origin always;
        proxy_pass http://app_backend/;
    }
}`,
    notes: [
      'Gixy 经典问题：子 location 的 add_header 覆盖父级全部头。',
      'include 同一片段可避免漏加。',
      'HSTS 只放在 HTTPS server。'
    ]
  },
  {
    id: 'ocsp-stapling',
    title: 'OCSP Stapling 详解',
    tags: ['ssl', 'ocsp', 'performance'],
    group: 'performance',
    description: '由 Nginx 代取 OCSP 并钉扎到握手，降低客户端校验证书延迟。',
    example: `server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_trusted_certificate /etc/nginx/ssl/chain.pem;

    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;
}`,
    notes: [
      'ssl_trusted_certificate 需包含中间证书以便校验 OCSP 响应。',
      '必须配置 resolver，Nginx 才能查询 OCSP 响应者。',
      '可用 openssl s_client -status 验证 stapling 是否生效。'
    ]
  },
  {
    id: 'gzip-static',
    title: 'gzip_static / 预压缩文件',
    tags: ['gzip', 'performance', 'static'],
    group: 'performance',
    description: '优先发送构建期生成的 .gz，避免运行时压缩占 CPU。',
    example: `location /assets/ {
    root /var/www;
    gzip_static on;     # 有 file.js.gz 则直接发
    brotli_static on;   # 若编译了 brotli 模块
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}`,
    notes: [
      '构建流水线需同时产出 .gz / .br。',
      '无预压缩文件时不会自动回落 gzip on 压缩，可两者同开。',
      '适合 hash 文件名的前端静态资源。'
    ]
  },
  {
    id: 'proxy-hide-header',
    title: '隐藏 / 忽略上游头',
    tags: ['proxy', 'header'],
    group: 'proxy',
    description: '去掉上游 Server、多余 CORS 或缓存头，统一由网关控制。',
    example: `location /api/ {
    proxy_pass http://app_backend/;
    proxy_hide_header Server;
    proxy_hide_header X-Powered-By;
    proxy_hide_header Set-Cookie;          # 缓存场景常见
    proxy_ignore_headers Cache-Control Expires Set-Cookie;
    proxy_set_header Host $host;
}`,
    notes: [
      'proxy_hide_header 影响响应给客户端的头。',
      'proxy_ignore_headers 影响 Nginx 是否遵守上游缓存指令。',
      '不要误删业务必需的 CORS / 鉴权相关头。'
    ]
  },
  {
    id: 'debug-return-headers',
    title: '调试：返回匹配信息',
    tags: ['debug', 'return', 'basic'],
    group: 'basic',
    description: '临时用 return / add_header 确认 location 命中与变量值。',
    example: `location /api/ {
    # 临时调试，确认完务必删掉
    add_header X-Debug-Uri $request_uri always;
    add_header X-Debug-Host $host always;
    add_header X-Debug-Real-IP $remote_addr always;
    return 200 "hit /api/  uri=$request_uri\\n";
    # proxy_pass http://app_backend/;
}

# 也可用：
# return 200 "$scheme://$host$request_uri\\n";`,
    notes: [
      'return 会短路后续 proxy_pass，适合快速验证匹配。',
      '生产排障优先看 access_log 自定义字段，少改配置。',
      '调试头可能泄露内网信息，用完删除。'
    ]
  },
  {
    id: 'trailing-slash-redirect',
    title: '目录尾斜杠规范化',
    tags: ['rewrite', 'slash', 'basic'],
    group: 'basic',
    description: '统一 /path 与 /path/ ，避免相对资源路径错乱与重复内容。',
    example: `# /docs → /docs/
rewrite ^([^.]*[^/])$ $1/ permanent;

# 或只对某前缀
location /docs {
    return 301 /docs/;
}

location /docs/ {
    alias /var/www/docs/;
    try_files $uri $uri/ /docs/index.html;
}`,
    notes: [
      'alias 目录 location 通常应带尾 /。',
      'API 路径是否强制尾 / 要与后端约定一致。',
      'permanent 为 301，调试期可用 302。'
    ]
  },
  {
    id: 'client-cert-auth',
    title: '客户端证书认证（mTLS）',
    tags: ['ssl', 'mtls', 'security'],
    group: 'security',
    description: '双向 TLS：校验客户端证书，适合内部 API、设备接入。',
    example: `server {
    listen 443 ssl;
    http2 on;
    server_name mtls.example.com;

    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_client_certificate /etc/nginx/ssl/client-ca.crt;
    ssl_verify_client on;
    # ssl_verify_client optional;  # 可选证书

    location / {
        proxy_pass http://app_backend;
        proxy_set_header X-SSL-Client-S-DN $ssl_client_s_dn;
        proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
    }
}`,
    notes: [
      'ssl_verify_client on 无证书或校验失败会握手失败/400。',
      '把 $ssl_client_s_dn 传给上游做身份映射。',
      '证书吊销需配合 CRL / OCSP，按合规要求配置。'
    ]
  },
  {
    id: 'slice-filter',
    title: 'slice 分片缓存大文件',
    tags: ['cache', 'slice', 'performance'],
    group: 'performance',
    description: '把大文件按字节切片缓存，提升 Range 请求命中率（需 slice 模块）。',
    example: `location /videos/ {
    slice 1m;
    proxy_cache video_cache;
    proxy_cache_key $uri$is_args$args$slice_range;
    proxy_set_header Range $slice_range;
    proxy_http_version 1.1;
    proxy_cache_valid 200 206 24h;
    proxy_pass http://origin_backend;
}`,
    notes: [
      'slice 适合视频点播、大包分发。',
      '缓存键必须包含 $slice_range。',
      '确认 Nginx 构建包含 http_slice_module。'
    ]
  },
  {
    id: 'upstream-zone-shared',
    title: 'upstream zone 共享内存',
    tags: ['upstream', 'zone', 'performance'],
    group: 'proxy',
    description: 'zone 让多 worker 共享上游状态，配合动态解析 / 健康检查。',
    example: `upstream app_backend {
    zone app_backend 64k;
    server 10.0.0.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# 开源版无主动 health_check 时，依赖 max_fails 被动摘除
server {
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
    }
}`,
    notes: [
      'zone 大小通常 64k 足够中小上游列表。',
      '主动 health_check 多为 Plus 特性；开源靠被动失败计数。',
      '与 resolver + resolve 参数组合可做动态上游（视版本）。'
    ]
  },
  {
    id: 'map-method-block',
    title: '限制 HTTP 方法',
    tags: ['security', 'method', 'map'],
    group: 'security',
    description: '只允许业务需要的方法，拒绝 TRACE/TRACK 等，降低探测面。',
    example: `map $request_method $is_bad_method {
    default 0;
    TRACE   1;
    TRACK   1;
}

server {
    if ($is_bad_method) {
        return 405;
    }

    location /api/ {
        # 也可在 location 内限制
        limit_except GET POST PUT PATCH DELETE OPTIONS {
            deny all;
        }
        proxy_pass http://app_backend/;
    }
}`,
    notes: [
      'limit_except 列表内方法走块内逻辑，其余走 deny。',
      '静态站通常只需 GET/HEAD。',
      'CORS 预检需要放行 OPTIONS。'
    ]
  },
  {
    id: 'favicon-robots',
    title: 'favicon / robots 专项',
    tags: ['static', 'basic'],
    group: 'basic',
    description: '单独处理浏览器默认探测，避免无意义 404 刷屏。',
    example: `location = /favicon.ico {
    root /var/www/static;
    access_log off;
    log_not_found off;
    expires 30d;
}

location = /robots.txt {
    root /var/www/static;
    access_log off;
    log_not_found off;
}`,
    notes: [
      'log_not_found off 避免文件不存在时打 error_log。',
      '也可 return 204 直接空响应。',
      'SPA 不要把这些请求回退到 index.html 除非有意为之。'
    ]
  },
  {
    id: 'proxy-buffer-sizes',
    title: 'proxy 缓冲与大头调优',
    tags: ['proxy', 'buffer', 'performance'],
    group: 'performance',
    description: '上游响应头过大或大包体时调整缓冲，消除 upstream sent too big header。',
    example: `location / {
    proxy_pass http://app_backend;
    proxy_buffer_size 16k;
    proxy_buffers 8 32k;
    proxy_busy_buffers_size 64k;
    proxy_temp_file_write_size 64k;
    # 需要完整缓冲完再发给客户端时：
    # proxy_buffering on;
    # 大文件下载可：
    # proxy_max_temp_file_size 1024m;
}`,
    notes: [
      '“upstream sent too big header” 优先加大 proxy_buffer_size / buffers。',
      '缓冲过大会抬升内存占用，按实际响应头体积调。',
      'SSE 场景应 proxy_buffering off，与此相反。'
    ]
  },
  {
    id: 'absolute-redirect-off',
    title: 'absolute_redirect 与 port_in_redirect',
    tags: ['redirect', 'basic'],
    group: 'basic',
    description: '控制 Nginx 自动跳转生成的 Location 是否带绝对 URL / 端口。',
    example: `server {
    listen 80;
    server_name example.com;
    root /var/www/html;

    absolute_redirect off;   # Location: /dir/  而不是 http://host/dir/
    # port_in_redirect off;  # 隐藏非标准端口

    location /dir {
        # 自动补尾 / 时受上述指令影响
    }
}`,
    notes: [
      '反代在 HTTPS 终止后，错误的绝对跳转容易变成 http://。',
      '也可用 server_name_in_redirect / port_in_redirect 细调。',
      '应用自己返回的 Location 还需 proxy_redirect 修正。'
    ]
  },
  {
    id: 'grpc-web-gateway',
    title: 'gRPC-Web 网关注意点',
    tags: ['grpc', 'proxy', 'advanced'],
    group: 'advanced',
    description: '浏览器 gRPC-Web 与原生 gRPC 的路径、CORS、超时差异提示。',
    example: `server {
    listen 443 ssl;
    http2 on;
    server_name grpc.example.com;

    # 浏览器端常需 CORS（按实际前端域收紧）
    location / {
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin $http_origin always;
            add_header Access-Control-Allow-Methods "POST, OPTIONS" always;
            add_header Access-Control-Allow-Headers "content-type,x-grpc-web,x-user-agent" always;
            add_header Access-Control-Max-Age 86400 always;
            return 204;
        }

        grpc_pass grpc://127.0.0.1:50051;
        grpc_set_header Host $host;
        grpc_read_timeout 300s;
        add_header Access-Control-Allow-Origin $http_origin always;
    }
}`,
    notes: [
      '真·浏览器 gRPC-Web 有时还需 Envoy 转码；原生 grpc_pass 服务非 Web 客户端。',
      '必须 http2；超时按流式 RPC 加长。',
      'CORS 头在子 location 覆盖问题上同样适用。'
    ]
  },
  {
    id: 'time-variables-log',
    title: '耗时变量与慢请求日志',
    tags: ['log', 'timing', 'ops'],
    group: 'log',
    description: '记录 request_time / upstream_response_time，并用 map 标慢请求。',
    example: `map $request_time $slow_request {
    default 0;
    ~^[5-9]\\d*\\. 1;   # >= 5s 粗略标记（示例）
}

log_format timed '$remote_addr $request '
                 'rt=$request_time urt=$upstream_response_time '
                 'status=$status slow=$slow_request';

access_log /var/log/nginx/access.log timed;
access_log /var/log/nginx/slow.log timed if=$slow_request;`,
    notes: [
      'request_time 含接收请求体到响应发完；urt 是上游时间。',
      '慢请求阈值按业务 SLA 调整，也可用外部日志管道过滤。',
      '502/504 时 urt 可能为 “-” 或含多上游逗号分隔。'
    ]
  },
  {
    id: 'error-log-level',
    title: 'error_log 级别与分文件',
    tags: ['log', 'error_log', 'ops'],
    group: 'log',
    description: '按全局/站点分流错误日志，生产避免 debug 刷盘。',
    example: `error_log /var/log/nginx/error.log warn;

http {
    error_log /var/log/nginx/http-error.log error;

    server {
        server_name app.example.com;
        error_log /var/log/nginx/app-error.log warn;
        # 临时排障：
        # error_log /var/log/nginx/app-debug.log debug;
    }
}`,
    notes: [
      '级别：debug/info/notice/warn/error/crit/alert/emerg。',
      'debug 需编译支持且极影响性能，用完改回。',
      '可用 syslog: server=... 远程采集。'
    ]
  },
  {
    id: 'sub-filter',
    title: 'sub_filter 响应体替换',
    tags: ['sub_filter', 'advanced'],
    group: 'advanced',
    description: '改写上游 HTML 中的链接或埋点（需 sub_filter 模块，注意缓冲）。',
    example: `location / {
    proxy_pass http://legacy_backend;
    sub_filter_types text/html;
    sub_filter 'http://legacy.internal' 'https://www.example.com';
    sub_filter_once off;
    # 压缩内容无法直接替换时需关闭上游压缩或用 gunzip
    proxy_set_header Accept-Encoding "";
}`,
    notes: [
      '只对未压缩文本可靠；常强制 Accept-Encoding 为空。',
      '大页 + 多次替换有 CPU 开销，能改应用则改应用。',
      '现代前端更多在构建期改 publicPath。'
    ]
  },
  {
    id: 'dav-upload',
    title: 'WebDAV 简易上传（慎用）',
    tags: ['dav', 'upload', 'advanced'],
    group: 'advanced',
    description: '开启有限 WebDAV 方法做内网文件投递；公网必须强鉴权。',
    example: `location /dropbox/ {
    alias /data/incoming/;
    client_max_body_size 200m;
    dav_methods PUT DELETE MKCOL COPY MOVE;
    create_full_put_path on;
    dav_access user:rw group:rw all:r;

    auth_basic "Upload";
    auth_basic_user_file /etc/nginx/.htpasswd_upload;
    allow 10.0.0.0/8;
    deny all;
}`,
    notes: [
      '需 http_dav_module；公网裸奔风险极高。',
      '权限与 SELinux/AppArmor 路径可写性要一起查。',
      '更推荐预签名对象存储上传。'
    ]
  },
  {
    id: 'image-filter-thumb',
    title: 'image_filter 缩略图（模块）',
    tags: ['image', 'filter', 'advanced'],
    group: 'advanced',
    description: '用 image_filter 做简单缩放（需 image_filter 模块，生产慎用 CPU）。',
    example: `location ~* /thumb/(\\d+)x(\\d+)/(.*)$ {
    set $w $1;
    set $h $2;
    set $img $3;
    alias /data/images/$img;
    image_filter resize $w $h;
    image_filter_jpeg_quality 85;
    image_filter_buffer 20m;
}`,
    notes: [
      'CPU 密集，高流量站优先用专用图片服务 / CDN。',
      'image_filter_buffer 要大于源图内存占用。',
      '模块未编译时配置会直接失败。'
    ]
  },
  {
    id: 'proxy-bind',
    title: 'proxy_bind 指定出口 IP',
    tags: ['proxy', 'network', 'advanced'],
    group: 'advanced',
    description: '多网卡 / 多线路机器上指定访问上游的源地址。',
    example: `location / {
    proxy_pass http://app_backend;
    proxy_bind 10.0.0.8;
    # transparent 需 root/CAP_NET_RAW，用于保留客户端 IP 透传（特殊拓扑）
    # proxy_bind $remote_addr transparent;
    proxy_set_header Host $host;
}`,
    notes: [
      '普通场景很少需要；多出口路由策略时有用。',
      'transparent 模式运维复杂度高，需内核路由配合。',
      '先确认本机该 IP 已配置在网卡上。'
    ]
  },
  {
    id: 'charset-utf8',
    title: 'charset UTF-8',
    tags: ['charset', 'basic'],
    group: 'basic',
    description: '统一默认字符集，减少中文乱码与遗漏 Content-Type charset。',
    example: `charset utf-8;
charset_types text/css text/plain application/javascript
               application/json application/xml;

source_charset utf-8;  # 源文件编码，一般与站点一致`,
    notes: [
      '已带 charset 的 Content-Type 不会被强行覆盖。',
      'API JSON 建议应用自己输出 application/json; charset=utf-8。',
      '转换编码有 CPU 成本，源文件尽量就是 UTF-8。'
    ]
  },
  {
    id: 'merge-slashes',
    title: 'merge_slashes 与路径规范化',
    tags: ['security', 'path', 'basic'],
    group: 'basic',
    description: '合并多余斜杠；理解关闭后对 //path 匹配的影响。',
    example: `# 默认 on：//api/users 视为 /api/users
merge_slashes on;

# 若应用刻意区分，可关闭（少见，且安全风险更高）
# merge_slashes off;

location /api/ {
    proxy_pass http://app_backend/;
}`,
    notes: [
      '默认合并更安全，减少绕过前缀匹配的花式路径。',
      '仍需注意 /api/../ 与解码问题，核心靠正确 location/alias。',
      '与 try_files、alias 联用时先画清最终路径。'
    ]
  },
  {
    id: 'proxy-set-body',
    title: 'proxy_method / proxy_set_body',
    tags: ['proxy', 'advanced'],
    group: 'advanced',
    description: '改写发往上游的方法或 body，用于内部子请求或协议适配。',
    example: `location = /internal/purge {
    internal;
    proxy_pass http://app_backend/purge;
    proxy_method POST;
    proxy_set_body "token=secret&uri=$arg_uri";
    proxy_set_header Content-Type application/x-www-form-urlencoded;
}`,
    notes: [
      '主要用于内部 location，不要对公网随意改 body。',
      '改 body 后注意 Content-Length 由 Nginx 处理。',
      '鉴权子请求、缓存清洗接口常见。'
    ]
  },
  {
    id: 'js-njs-hook',
    title: 'njs 简单钩子（可选模块）',
    tags: ['njs', 'js', 'advanced'],
    group: 'advanced',
    description: '用 njs 做复杂头处理/鉴权逻辑的示意（需 njs 模块）。',
    example: `# /etc/nginx/njs/auth.js
# function authorize(r) {
#   var token = r.headersIn.Authorization || '';
#   if (token === 'Bearer secret') { r.return(200); }
#   else { r.return(403); }
# }
# export default {authorize};

http {
    js_import auth from /etc/nginx/njs/auth.js;

    server {
        location /api/ {
            auth_request /_njs_auth;
            proxy_pass http://app_backend/;
        }
        location = /_njs_auth {
            internal;
            js_content auth.authorize;
        }
    }
}`,
    notes: [
      'njs 强大但增加运维与攻击面，能用 map/auth_request 则优先。',
      '改 JS 后需 reload；语法错误会导致配置失败。',
      '性能敏感路径慎用重逻辑。'
    ]
  },
  {
    id: 'default-type-return',
    title: 'default_type + return 直接响应',
    tags: ['return', 'default_type', 'json', 'basic'],
    group: 'basic',
    description:
      '不走文件、不反代，用 return 直接返回固定内容；配合 default_type / Content-Type 输出 JSON、文本、XML 等。',
    example: `# JSON（接口探活 / 占位响应）
location = /api/ping {
    default_type application/json;
    return 200 '{"code":0,"data":"OK"}';
}

# 带 charset 的 JSON
location = /api/status {
    default_type application/json;
    charset utf-8;
    return 200 '{"msg":"成功","data":{"ok":true}}';
}

# 纯文本
location = /health {
    default_type text/plain;
    return 200 'ok\\n';
}

# HTML 片段
location = /hello {
    default_type text/html;
    return 200 '<!doctype html><h1>Hello</h1>';
}

# XML
location = /feed.xml {
    default_type application/xml;
    return 200 '<?xml version="1.0"?><ok/>';
}

# JavaScript / CSS（少见，调试或占位）
location = /ping.js {
    default_type application/javascript;
    return 200 'console.log("ok");';
}
location = /ping.css {
    default_type text/css;
    return 200 'body{margin:0}';
}

# 无 body，只状态码
location = /no-content {
    return 204;
}

# 也可用 add_header 显式声明（与 default_type 二选一即可）
location = /api/v2/ping {
    add_header Content-Type 'application/json; charset=utf-8' always;
    return 200 '{"data":"OK"}';
}

# 注意：单引号字符串里若含单引号，需改用双引号包裹或拆分
# return 200 "{\\"data\\":\\"OK\\"}";`,
    notes: [
      'default_type 设置的是响应 Content-Type（未由其它指令覆盖时）。',
      'return CODE body; 的 body 是固定字符串，不会做变量替换（变量要用 return CODE $var 且 body 另有限制）。',
      'JSON 推荐 default_type application/json; 再 return 200 \'{"data":"OK"}\';',
      'body 里尽量用单引号包 JSON，内部双引号就不用大量转义。',
      'return 会立刻结束请求，后面的 proxy_pass / try_files 不会执行。',
      '需要动态 JSON 时用 njs、lua 或反代到应用，而不是硬编码 return。'
    ]
  }
]

/** 片段分组（用于导航筛选） */
export const SNIPPET_GROUPS: Array<{ key: string; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'basic', label: '基础' },
  { key: 'proxy', label: '反代' },
  { key: 'security', label: '安全' },
  { key: 'performance', label: '性能' },
  { key: 'advanced', label: '进阶' },
  { key: 'log', label: '日志' }
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
  },
  {
    id: 'api-gateway',
    name: 'API 网关',
    description: 'HTTPS + 限流 + CORS + /api 反代 + 健康检查',
    content: `http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

    upstream api_backend {
        server 127.0.0.1:3000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name api.example.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.example.com;

        ssl_certificate     /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;

        client_max_body_size 20m;
        server_tokens off;

        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options DENY always;

        location = /health {
            access_log off;
            return 200 "ok\\n";
            add_header Content-Type text/plain;
        }

        location /api/ {
            limit_req zone=api_limit burst=40 nodelay;
            limit_req_status 429;

            if ($request_method = OPTIONS) {
                add_header Access-Control-Allow-Origin $http_origin always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
                add_header Access-Control-Max-Age 86400 always;
                add_header Content-Length 0;
                return 204;
            }

            add_header Access-Control-Allow-Origin $http_origin always;
            add_header Access-Control-Allow-Credentials true always;

            proxy_pass http://api_backend/;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
`
  },
  {
    id: 'file-download',
    name: '静态下载站',
    description: '大文件目录 + 断点续传 + 可选防盗链 / 限速',
    content: `server {
    listen 80;
    server_name dl.example.com;
    root /data/files;
    server_tokens off;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    # 可选限速（字节/秒），突发桶
    # limit_rate_after 10m;
    # limit_rate 1m;

    location / {
        autoindex off;
        try_files $uri =404;
        expires 1d;
        add_header Accept-Ranges bytes;
        add_header X-Content-Type-Options nosniff;
    }

    location ~* \\.(zip|tar\\.gz|dmg|exe|iso)$ {
        valid_referers none blocked server_names *.example.com;
        if ($invalid_referer) {
            return 403;
        }
        expires 7d;
        add_header Content-Disposition "attachment";
    }

    location ~ /\\. {
        deny all;
    }
}
`
  },
  {
    id: 'admin-protected',
    name: '后台保护',
    description: 'IP 白名单 + Basic Auth + HTTPS 管理端',
    content: `server {
    listen 80;
    server_name admin.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    server_tokens off;

    # 仅内网 / 办公网
    allow 10.0.0.0/8;
    allow 192.168.0.0/16;
    allow 203.0.113.10;
    deny all;

    location / {
        auth_basic "Admin";
        auth_basic_user_file /etc/nginx/.htpasswd_admin;

        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health {
        access_log off;
        auth_basic off;
        allow all;
        return 200 "ok\\n";
        add_header Content-Type text/plain;
    }
}
`
  },
  {
    id: 'multi-site',
    name: '多站点',
    description: '单机多 server_name：静态站 + API 子域',
    content: `# 未知 Host 直接断开
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    ssl_certificate     /etc/nginx/ssl/dummy.crt;
    ssl_certificate_key /etc/nginx/ssl/dummy.key;
    return 444;
}

server {
    listen 80;
    server_name www.example.com example.com;
    return 301 https://www.example.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.example.com;

    ssl_certificate     /etc/nginx/ssl/www.fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/www.key;
    root /var/www/www;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        access_log off;
    }
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/nginx/ssl/api.fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/api.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Node SSR 反代 + /_next/static 长缓存 + WS',
    content: `http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    upstream next_app {
        server 127.0.0.1:3000;
        keepalive 16;
    }

    server {
        listen 80;
        server_name next.example.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name next.example.com;

        ssl_certificate     /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        client_max_body_size 20m;

        location /_next/static/ {
            proxy_pass http://next_app;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            expires 365d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        location / {
            proxy_pass http://next_app;
            proxy_http_version 1.1;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
`
  },
  {
    id: 'maintenance',
    name: '维护模式',
    description: 'touch maintenance.on 一键切 503 维护页',
    content: `server {
    listen 80;
    server_name app.example.com;
    root /var/www/app;
    index index.html;

    # 存在该文件则全局 503（运维 touch / rm 切换）
    if (-f $document_root/maintenance.on) {
        return 503;
    }

    error_page 503 @maintenance;
    location @maintenance {
        root /var/www/errors;
        rewrite ^(.*)$ /maintenance.html break;
        add_header Retry-After 3600 always;
    }

    location = /health {
        access_log off;
        return 200 "ok\\n";
        add_header Content-Type text/plain;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`
  },
  {
    id: 'media-streaming',
    name: '流式 / SSE',
    description: '关闭缓冲的流式 API / SSE / LLM 输出',
    content: `upstream stream_backend {
    server 127.0.0.1:3000;
    keepalive 16;
}

server {
    listen 80;
    server_name stream.example.com;

    location /api/stream/ {
        proxy_pass http://stream_backend/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        proxy_pass http://stream_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
`
  },
  {
    id: 'https-acme',
    name: 'HTTPS + ACME',
    description: '80 验证证书 + 443 业务 + 安全头骨架',
    content: `server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name example.com www.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;

    server_tokens off;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /health {
        access_log off;
        return 200 "ok\\n";
        add_header Content-Type text/plain;
    }
}
`
  },
  {
    id: 'cdn-origin',
    name: 'CDN 源站',
    description: '信任 CDN IP + 真实 IP + 仅回源缓存头',
    content: `# 将 CDN 回源网段填入 set_real_ip_from
set_real_ip_from 10.0.0.0/8;
set_real_ip_from 192.168.0.0/16;
real_ip_header X-Forwarded-For;
real_ip_recursive on;

server {
    listen 80;
    server_name origin.example.com;
    root /var/www/origin;
    server_tokens off;

    # 可选：只允许 CDN / 内网回源
    # allow 10.0.0.0/8;
    # deny all;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=60";
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "public, max-age=30, must-revalidate";
    }

    location ~ /\\. {
        deny all;
    }
}
`
  },
  {
    id: 'microservices',
    name: '微服务路由',
    description: '按路径拆分到多个 upstream 服务',
    content: `upstream svc_user {
    server 127.0.0.1:3001;
    keepalive 16;
}

upstream svc_order {
    server 127.0.0.1:3002;
    keepalive 16;
}

upstream svc_pay {
    server 127.0.0.1:3003;
    keepalive 16;
}

server {
    listen 80;
    server_name api.example.com;
    client_max_body_size 20m;
    server_tokens off;

    location = /health {
        access_log off;
        return 200 "ok\\n";
        add_header Content-Type text/plain;
    }

    location /api/users/ {
        proxy_pass http://svc_user/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/orders/ {
        proxy_pass http://svc_order/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/pay/ {
        proxy_pass http://svc_pay/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
`
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'PHP-FPM + 伪静态 + 禁止敏感文件',
    content: `server {
    listen 80;
    server_name blog.example.com;
    root /var/www/wordpress;
    index index.php index.html;
    client_max_body_size 64m;
    server_tokens off;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \\.php$ {
        try_files $uri =404;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_read_timeout 120s;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        access_log off;
        log_not_found off;
        try_files $uri =404;
    }

    location ~* /(?:uploads|files)/.*\\.php$ {
        deny all;
    }

    location ~ /\\. {
        deny all;
    }

    location = /xmlrpc.php {
        deny all;
    }
}
`
  },
  {
    id: 'auth-gateway',
    name: '鉴权网关',
    description: 'auth_request 统一鉴权后再进业务上游',
    content: `upstream app_backend {
    server 127.0.0.1:3000;
    keepalive 16;
}

upstream auth_service {
    server 127.0.0.1:3100;
}

server {
    listen 80;
    server_name app.example.com;
    server_tokens off;

    location = /_auth {
        internal;
        proxy_pass http://auth_service/verify;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Original-URI $request_uri;
        proxy_set_header Cookie $http_cookie;
    }

    location /api/public/ {
        proxy_pass http://app_backend/public/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        auth_request /_auth;
        auth_request_set $user_id $upstream_http_x_user_id;
        proxy_pass http://app_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-User-Id $user_id;
    }

    location / {
        root /var/www/app;
        try_files $uri $uri/ /index.html;
    }
}
`
  },
  {
    id: 'static-cache-origin',
    name: '反代缓存',
    description: 'proxy_cache 缓存公开 API / 文档页',
    content: `proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=pubcache:32m
                 max_size=4g inactive=60m use_temp_path=off;

upstream origin_app {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name cache.example.com;
    server_tokens off;

    location /api/public/ {
        proxy_pass http://origin_app/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_cache pubcache;
        proxy_cache_methods GET HEAD;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        proxy_ignore_headers Set-Cookie;
        proxy_hide_header Set-Cookie;
        add_header X-Cache-Status $upstream_cache_status;
    }

    location / {
        proxy_pass http://origin_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
`
  },
  {
    id: 'mqtt-stream',
    name: 'TCP 透传',
    description: 'stream 四层转发数据库 / MQTT 端口',
    content: `stream {
    log_format basic '$remote_addr [$time_local] '
                     '$protocol $status $bytes_sent $bytes_received '
                     '$session_time';

    access_log /var/log/nginx/stream-access.log basic;

    upstream mqtt_backend {
        server 10.0.0.11:1883;
        server 10.0.0.12:1883 backup;
    }

    server {
        listen 1883;
        proxy_pass mqtt_backend;
        proxy_connect_timeout 5s;
        proxy_timeout 1h;
    }

    upstream pg_backend {
        server 10.0.0.21:5432;
    }

    server {
        listen 5432;
        proxy_pass pg_backend;
        proxy_connect_timeout 3s;
        proxy_timeout 30m;
    }
}
`
  },
  {
    id: 'canary-release',
    name: '金丝雀发布',
    description: 'split_clients 按比例切到 canary 上游',
    content: `split_clients "$remote_addr$uri" $upstream_pool {
    10%     canary;
    *       stable;
}

upstream stable {
    server 10.0.0.11:3000;
    server 10.0.0.12:3000;
    keepalive 16;
}

upstream canary {
    server 10.0.0.21:3000;
    keepalive 8;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://$upstream_pool;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header X-Release-Pool $upstream_pool always;
    }
}
`
  },
  {
    id: 'secure-download',
    name: '受控下载',
    description: '应用鉴权 + X-Accel-Redirect 由 Nginx 送文件',
    content: `server {
    listen 80;
    server_name dl.example.com;
    server_tokens off;
    client_max_body_size 20m;
    sendfile on;
    tcp_nopush on;

    location /api/download/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # 应用鉴权通过后返回：
        # X-Accel-Redirect: /protected/path/to/file.zip
        # Content-Disposition: attachment; filename="file.zip"
    }

    location /protected/ {
        internal;
        alias /data/files/;
        add_header X-Content-Type-Options nosniff;
    }

    location = /health {
        access_log off;
        return 200 "ok\\n";
        add_header Content-Type text/plain;
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
  },
  {
    location: '/app/',
    withSlash: {
      proxyPass: 'http://127.0.0.1:3000/v1/',
      result: '/app/users → /v1/users',
      note: '用 proxy_pass 路径替换 location 前缀'
    },
    withoutSlash: {
      proxyPass: 'http://127.0.0.1:3000/v1',
      result: '/app/users → /v1/users（/v1 无尾 / 时拼接规则更绕）',
      note: '不推荐：路径拼接难读，统一写成两侧都带 /'
    }
  }
]

// ─── 共享解析小工具 ─────────────────────────────────────────────────────────

/** 去掉 # 注释（引号外），返回代码面字符；可选同步更新跨行引号状态 */
function stripLineCode(
  line: string,
  state: { inDQuote: boolean; inSQuote: boolean } = { inDQuote: false, inSQuote: false }
): string {
  let code = ''
  for (let j = 0; j < line.length; j++) {
    const ch = line[j]
    const prev = j > 0 ? line[j - 1] : ''
    if (!state.inDQuote && !state.inSQuote && ch === '#') break
    if (ch === '"' && prev !== '\\' && !state.inSQuote) {
      state.inDQuote = !state.inDQuote
      continue
    }
    if (ch === "'" && prev !== '\\' && !state.inDQuote) {
      state.inSQuote = !state.inSQuote
      continue
    }
    if (!state.inDQuote && !state.inSQuote) code += ch
  }
  return code
}

function stripNginxNoise(source: string): string {
  const state = { inDQuote: false, inSQuote: false }
  return source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => stripLineCode(line, state))
    .join('\n')
}

function pushIssue(
  issues: NginxIssue[],
  severity: NginxIssueSeverity,
  category: NginxIssueCategory,
  line: number,
  message: string
) {
  issues.push({ severity, category, line, message })
}

function dedupeIssues(issues: NginxIssue[]): NginxIssue[] {
  const rank: Record<NginxIssueSeverity, number> = { error: 0, warning: 1, info: 2 }
  issues.sort((a, b) => {
    if (a.severity !== b.severity) return rank[a.severity] - rank[b.severity]
    return a.line - b.line
  })
  const seen = new Set<string>()
  return issues.filter(issue => {
    const key = `${issue.severity}:${issue.category}:${issue.line}:${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── 格式化 ────────────────────────────────────────────────────────────────

/** 轻量缩进格式化：按花括号调整层级，不解析完整语法 */
export function formatNginxConfig(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let depth = 0
  const quoteState = { inDQuote: false, inSQuote: false }

  for (const raw of lines) {
    const code = stripLineCode(raw, quoteState)
    const trimmed = raw.trim()
    if (!trimmed) {
      out.push('')
      continue
    }

    const openCount = (code.match(/\{/g) || []).length
    const closeCount = (code.match(/\}/g) || []).length
    const leadingClose = /^\}/.test(trimmed)
    if (leadingClose) depth = Math.max(0, depth - closeCount)

    out.push('    '.repeat(Math.max(0, depth)) + trimmed)

    if (!leadingClose) {
      depth = Math.max(0, depth + openCount - closeCount)
    } else if (openCount > 0) {
      depth = Math.max(0, depth + openCount)
    }
  }

  return (
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim() + (source.trim() ? '\n' : '')
  )
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

/**
 * 从配置中提取 location 块（扁平列表，忽略 server 边界；模拟时按出现顺序）。
 */
export function extractLocations(source: string): NginxLocation[] {
  const cleaned = stripNginxNoise(source)
  const locations: NginxLocation[] = []
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
  path = path.replace(/\/{2,}/g, '/')
  return { uri: `${path}${query}`, path, query }
}

function prefixMatches(uriPath: string, prefix: string): boolean {
  // Nginx 前缀匹配是纯字符串前缀：location /api 也会匹配 /apiv2
  return prefix === '/' || uriPath === prefix || uriPath.startsWith(prefix)
}

function compileNginxRegex(pattern: string, ignoreCase: boolean): RegExp | null {
  try {
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

  let bestPrefix: NginxLocation | null = null
  for (const loc of locations) {
    if (loc.modifier !== 'prefix' && loc.modifier !== 'prefer') continue
    const hit = prefixMatches(path, loc.pattern)
    const better = hit && (!bestPrefix || loc.pattern.length > bestPrefix.pattern.length)
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
 */
export function resolveProxyPass(
  path: string,
  query: string,
  loc: NginxLocation
): { upstreamUri: string; upstreamTarget: string } | null {
  if (!loc.proxyPass) return null
  const target = loc.proxyPass.trim()
  if (target.includes('$')) {
    return { upstreamUri: `${path}${query}`, upstreamTarget: target }
  }

  const m = target.match(/^(https?:\/\/[^/]+)(\/.*)?$/i)
  if (!m) {
    return { upstreamUri: `${path}${query}`, upstreamTarget: target }
  }

  const origin = m[1]
  const passUri = m[2]

  if (passUri === undefined) {
    return {
      upstreamUri: `${path}${query}`,
      upstreamTarget: `${origin}${path}${query}`
    }
  }

  if (loc.modifier === 'regex' || loc.modifier === 'iregex') {
    return {
      upstreamUri: `${passUri.replace(/\/$/, '')}${query}`,
      upstreamTarget: `${origin}${passUri}${query}`.replace(/([^:]\/)\/+/g, '$1')
    }
  }

  const prefix = loc.pattern
  const rest = path.startsWith(prefix) ? path.slice(prefix.length) : path.replace(/^\//, '')
  let newPath = `${passUri}${rest}`.replace(/\/{2,}/g, '/')
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
 * 轻量静态校验：括号配对、指令分号、常见坑位 + 安全/最佳实践提示。
 * 参考 Gixy / nginxconfig.io 常见检查，不做完整 nginx 语法解析。
 */
export function validateNginxConfig(source: string): NginxIssue[] {
  const issues: NginxIssue[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  if (!source.trim()) {
    return [{ severity: 'error', category: 'syntax', line: 1, message: '配置内容为空' }]
  }

  const braceStack: number[] = []
  const quoteState = { inDQuote: false, inSQuote: false }
  let addHeaderCount = 0
  let locationWithAddHeader = 0
  let hasSslListen = false
  let hasSslCert = false
  let hasHttpRedirect = false
  let hasProxyPass = false

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const raw = lines[i]
    const code = stripLineCode(raw, quoteState)
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

    // 指令行应以 ; 或 { 或 } 结束
    if (trimmedCode !== '}' && !/[;{]$/.test(trimmedCode)) {
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

    if (/\badd_header\b/.test(trimmedCode)) addHeaderCount++

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

    if (/^\s*if\s*\(/.test(trimmedCode) && !/return\s+\d+/.test(trimmedCode)) {
      pushIssue(
        issues,
        'info',
        'practice',
        lineNo,
        'nginx if 有副作用（if is evil），复杂逻辑优先 map / 拆 location / 应用层处理'
      )
    }

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

    if (
      /\bssl_protocols\b/.test(trimmedCode) &&
      /SSLv3|TLSv1[^.\d]|TLSv1\.0|TLSv1\.1/.test(trimmedCode)
    ) {
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
      pushIssue(
        issues,
        'warning',
        'security',
        lineNo,
        '开启 WebDAV 写方法时请严格限制访问来源与鉴权'
      )
    }
  }

  if (quoteState.inDQuote || quoteState.inSQuote) {
    pushIssue(issues, 'error', 'syntax', lines.length, '存在未闭合的引号')
  }

  for (const openLine of braceStack) {
    pushIssue(issues, 'error', 'syntax', openLine, '花括号 { 未闭合')
  }

  // location 级：proxy_pass 尾 /、alias 一致性
  const locations = extractLocations(source)
  for (const loc of locations) {
    if (loc.proxyPass) {
      const target = loc.proxyPass
      const locHasSlash = loc.pattern.endsWith('/')
      const passHasPath = /https?:\/\/[^/]+\//i.test(target)
      const passHasSlash = /\/$/.test(target.replace(/\$[a-zA-Z0-9_]+$/, ''))
      const isHttp = /^https?:\/\//.test(target)
      const isRegex = loc.modifier === 'regex' || loc.modifier === 'iregex'

      if (locHasSlash && !passHasSlash && isHttp && !target.includes('$')) {
        pushIssue(
          issues,
          'warning',
          'practice',
          loc.line,
          `location ${loc.pattern} 带尾 /，而 proxy_pass 未带尾 /：URI 会原样转发。若希望剥前缀，请写成 proxy_pass .../;`
        )
      }
      if (!locHasSlash && passHasPath && !isRegex && isHttp) {
        pushIssue(
          issues,
          'warning',
          'practice',
          loc.line,
          `location ${loc.pattern} 不带尾 /，proxy_pass 却带 URI 路径：前缀替换规则可能不符合预期`
        )
      }
      if (isRegex && /https?:\/\/[^/]+\//i.test(target)) {
        pushIssue(
          issues,
          'warning',
          'practice',
          loc.line,
          '正则 location 的 proxy_pass 一般不应带 URI 路径，行为与预期常不符'
        )
      }
    }

    if (loc.alias && loc.pattern.endsWith('/') && !loc.alias.endsWith('/')) {
      pushIssue(
        issues,
        'warning',
        'security',
        loc.line,
        `alias 与 location ${loc.pattern} 尾 / 不一致，可能导致路径穿越或 404`
      )
    }

    if (
      (loc.modifier === 'regex' || loc.modifier === 'iregex') &&
      /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|webp)$/.test(loc.pattern) &&
      loc.tryFiles &&
      !/=\s*404/.test(loc.tryFiles)
    ) {
      pushIssue(
        issues,
        'info',
        'practice',
        loc.line,
        '静态文件 location 的 try_files 建议以 =404 结尾，避免不存在的文件内部重定向循环'
      )
    }
  }

  // 块级扫描：proxy 头、keepalive、add_header
  const blockRegex =
    /location\s+(?:=\s*|~\*\s*|~\s*|\^~\s*)?(?:"[^"]+"|'[^']+'|\S+)\s*\{([\s\S]*?)\}/g
  let blockMatch: RegExpExecArray | null
  const hasUpstreamKeepalive = /\bupstream\b[\s\S]*\bkeepalive\b/.test(source)

  while ((blockMatch = blockRegex.exec(source)) !== null) {
    const body = blockMatch[1]
    const line = source.slice(0, blockMatch.index).split('\n').length

    if (/\bproxy_pass\b/.test(body)) {
      if (!/\bproxy_set_header\s+Host\b/.test(body)) {
        pushIssue(
          issues,
          'info',
          'practice',
          line,
          '反代 location 建议设置 proxy_set_header Host $host（及 X-Forwarded-*）'
        )
      }
      if (
        hasUpstreamKeepalive &&
        /\bproxy_pass\s+http:\/\/[a-zA-Z_]/.test(body) &&
        !/\bproxy_set_header\s+Connection\s+""\s*;/.test(body)
      ) {
        pushIssue(
          issues,
          'info',
          'practice',
          line,
          'upstream 启用了 keepalive 时，location 内建议 proxy_http_version 1.1 且 Connection ""'
        )
      }
    }
    if (/\badd_header\b/.test(body)) locationWithAddHeader++
  }

  if (addHeaderCount > 0 && locationWithAddHeader > 0) {
    pushIssue(
      issues,
      'info',
      'security',
      1,
      '存在 location 级 add_header：子块会清空父级 add_header 继承，安全头需在子块重复声明（Gixy）'
    )
  }

  if (hasSslListen && !hasSslCert) {
    pushIssue(
      issues,
      'warning',
      'practice',
      1,
      '已 listen ssl 但未发现 ssl_certificate，证书指令可能在 include 中'
    )
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

  if (hasProxyPass && !/\bserver_tokens\s+off\s*;/.test(source) && /\bserver\s*\{/.test(source)) {
    pushIssue(
      issues,
      'info',
      'security',
      1,
      '建议添加 server_tokens off 隐藏 Nginx 版本号，减少信息泄露'
    )
  }

  if (hasProxyPass && !/add_header\s+X-Frame-Options/i.test(source)) {
    pushIssue(
      issues,
      'info',
      'security',
      1,
      '反代服务缺少 X-Frame-Options 安全头，建议 add_header X-Frame-Options SAMEORIGIN always'
    )
  }

  if (hasProxyPass && !/add_header\s+X-Content-Type-Options/i.test(source)) {
    pushIssue(
      issues,
      'info',
      'security',
      1,
      '反代服务缺少 X-Content-Type-Options 安全头，建议 add_header X-Content-Type-Options nosniff always'
    )
  }

  if (hasSslListen && hasSslCert) {
    if (!/\bssl_session_cache\b/.test(source)) {
      pushIssue(
        issues,
        'info',
        'practice',
        1,
        'HTTPS 配置未设置 ssl_session_cache 共享缓存，SSL 握手性能可能较低'
      )
    }
    if (/\bssl_protocols\b/.test(source) && !/\bTLSv1\.(?:2|3)\b/.test(source)) {
      pushIssue(
        issues,
        'info',
        'practice',
        1,
        'ssl_protocols 中未包含 TLSv1.2 / TLSv1.3 以支持现代客户端'
      )
    }
  }

  if (hasProxyPass) {
    let hasSizeAbove1m = false
    for (const line of lines) {
      const m = line.match(/client_max_body_size\s+(\d+)([mk]?)\s*;/i)
      if (!m) continue
      const val = parseInt(m[1], 10)
      const unit = (m[2] || '').toLowerCase()
      if (unit === 'm' && val > 1) hasSizeAbove1m = true
      else if (unit === 'k' && val > 1024) hasSizeAbove1m = true
      else if (!unit && val > 1048576) hasSizeAbove1m = true
      else if (val === 0) hasSizeAbove1m = true
    }
    if (!hasSizeAbove1m) {
      pushIssue(
        issues,
        'info',
        'practice',
        1,
        '配置含 proxy_pass 但 client_max_body_size 未显式设置（默认 1m），上传可能遇到 413'
      )
    }
  }

  if (hasSslListen && hasProxyPass && !/X-Forwarded-Proto/i.test(source)) {
    pushIssue(
      issues,
      'info',
      'practice',
      1,
      'HTTPS 反代建议设置 proxy_set_header X-Forwarded-Proto $scheme，便于后端判断协议'
    )
  }

  return dedupeIssues(issues)
}

