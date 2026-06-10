# ![ToolBox Logo](public/logo-icon.png) ToolBox - 在线开发者工具箱

ToolBox 是一款面向开发者、测试工程师和车联网联调场景的在线工具集合。覆盖编码转换、格式化校验、时间处理、网络排查、连接调试、正则表达式测试，以及 JT808、JT809、JT1078、GB/T 32960、GB/T 27930、OCPP、CAN/J1939、OBD/UDS 等车联网工具。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue.svg)](https://www.typescriptlang.org/)

## 在线使用

直接访问在线版本，无需安装：[https://tools.neocockpit.cn](https://tools.neocockpit.cn)

## 功能特性

- 开箱即用：浏览器内完成常用开发、编码、解析和联调任务。
- 分类清晰：按实用、编码、格式化、时间、网络、车联网、连接工具组织。
- 快速定位：支持全局搜索、关键词匹配、收藏和常用入口。
- 按需加载：首页轻量化，工具页面按需加载对应组件和重型依赖。
- 响应式界面：适配桌面端和移动端，支持深色/浅色主题。
- 车联网专项：覆盖报文解析、报文构造、日志时间线、轨迹分析、充电协议、CAN 诊断等高频场景。

## 工具列表

工具清单以 `src/tools/catalog.ts` 为准。

### 实用工具

| 工具 | 功能 |
| --- | --- |
| 密码生成器 | 生成安全的随机密码 |
| 正则表达式 | 测试 JavaScript 正则表达式，查看匹配分组并执行文本替换 |
| UUID 生成器 | 生成 UUID 通用唯一识别码 |
| 二维码生成器 | 生成二维码图片 |

### 编码工具

| 工具 | 功能 |
| --- | --- |
| Base64 编码/解码 | 支持 Hex、Base64、Base64URL、Base58、Base58Check、Bech32 的编码、解码和校验 |
| Base64 图片 | 图片与 Base64 字符串互转，支持拖拽上传 |
| 颜色转换器 | 在 HEX、RGB、HSL 等颜色格式之间转换 |
| JWT 解码 | 解析 JWT 的 Header、Payload、Signature 与过期状态 |
| RSA、AES加解密 | RSA、AES、DES、MD5/SHA、HMAC 常用加密解密和摘要计算 |
| 哈希计算 | 计算文本或文件的 MD5、SHA1、SHA256、SHA512 |

### 格式化工具

| 工具 | 功能 |
| --- | --- |
| JSON 格式化 | 格式化、压缩和验证 JSON 数据 |
| SQL 格式化 | 格式化 SQL 查询语句 |
| XML/HTML 格式化 | 格式化 XML 和 HTML 代码 |

### 时间工具

| 工具 | 功能 |
| --- | --- |
| 时间戳转换 | 在时间戳、本地时间、UTC 和 ISO 8601 之间快速转换 |
| Cron 表达式解析 | 校验 Cron 表达式并查看标准化结果与下一次执行时间 |

### 网络工具

| 工具 | 功能 |
| --- | --- |
| CIDR 网段计算器 | 计算 IPv4 CIDR 网段的网络地址、广播地址、可用主机数等信息 |
| 端口扫描工具 | 批量探测目标主机的 HTTP/HTTPS 端口可访问性 |
| URL 编码/解码 | 对 URL 进行编码和解码操作 |
| User-Agent 解析器 | 解析浏览器、系统、设备、渲染引擎和爬虫标识 |
| HTTP 状态码查询 | 查询 HTTP 状态码的含义和说明 |

### 车联网工具

| 工具 | 功能 |
| --- | --- |
| JT808/JT809 解析 | JT808 与 JT809 报文解析、基础组包、Hex 转换和常用字段换算 |
| JT1078 音视频流解析 | JT1078 RTP 包头、SIM/通道、音视频帧类型、分包状态和 H264/H265 NALU 解析 |
| GB/T 32960 解析 | 新能源车远程服务通信报文解析，支持头部、校验、实时信息和常见数据块拆解 |
| GB/T 27930 解析 | 电动汽车非车载充电机与 BMS 通信 CAN 报文解析，覆盖握手、辨识、配置、充电和错误阶段 |
| OCPP 报文校验 | OCPP 1.6J / 2.0.1 JSON 报文结构校验、常用 Action 必填字段检查和示例构造 |
| 报文构造器 | JT808、GB32960、OCPP、GB/T 27930 常用报文模板构造、校验和字段核对 |
| VIN 解析/校验 | 解析 VIN 结构、年份、WMI 区域并校验第 9 位校验位 |
| J1939 ID/PGN 计算器 | 29 位 CAN ID 与 J1939 PGN、优先级、源地址、目标地址互转 |
| CAN/J1939 解码器 | CAN 日志解析、J1939 PGN 拆解、DM1 故障码和 DBC 信号换算 |
| CAN 信号曲线分析 | 导入 CAN/DBC 日志，按信号绘制趋势、统计跳变和帧周期 |
| OBD/UDS 诊断工具 | OBD-II PID、DTC 故障码、UDS 服务和 ISO-TP 诊断载荷解析 |
| 轨迹点分析 | 坐标转换、轨迹压缩、电子围栏、停留点、超速、漂移、NMEA 解析 |
| 坐标系转换 | WGS84/GCJ02/BD09 坐标互转并在地图上定位 |
| 经纬度 GeoHash | 经纬度地图展示和 GeoHash 编码解码 |
| 日志时间线 | 混合日志按时间归档，自动识别协议、方向、设备、事件类型和相邻事件间隔 |

### 连接工具

| 工具 | 功能 |
| --- | --- |
| WebSocket 连接 | 连接 WebSocket 服务，发送消息并查看收发日志 |
| MQTT 连接 | 通过 MQTT over WebSocket 连接 Broker，订阅主题并发布消息 |

## 快速开始

### 本地运行

```bash
# 克隆项目
git clone https://github.com/yzengchn/toolbox.git
cd toolbox

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 技术栈

- 前端框架：Vue 3 + TypeScript
- 构建工具：Vite
- UI 组件库：Naive UI
- 状态管理：Pinia
- 路由管理：Vue Router
- 地图能力：Leaflet
- 时间处理：Day.js、cron-parser
- 编码与加密：crypto-js、qrcode、原生 Web Crypto API
- 格式化与高亮：sql-formatter、highlight.js

## 环境要求

- Node.js >= 18
- npm >= 9

## 项目结构

```text
toolbox/
├── src/
│   ├── components/          # 公共组件
│   ├── config/              # 运行配置
│   ├── router/              # 路由配置
│   ├── stores/              # 状态管理
│   ├── tools/               # 工具模块
│   │   ├── catalog.ts       # 工具元信息、分类、关键词
│   │   ├── componentLoaders.ts # 工具组件按需加载注册
│   │   ├── connection/      # 连接工具
│   │   ├── encoding/        # 编码工具
│   │   ├── formatter/       # 格式化工具
│   │   ├── network/         # 网络工具
│   │   ├── time/            # 时间工具
│   │   ├── utilities/       # 实用工具
│   │   └── vehicle-iot/     # 车联网工具
│   ├── types/               # 类型定义
│   ├── utils/               # 通用工具函数
│   └── views/               # 页面视图
├── public/                  # 静态资源
└── docs/                    # 文档
```

## 项目文档

- [项目设计](docs/PROJECT_DESIGN.md)：项目目标、架构、工具清单、性能策略和部署说明。
- [开发指南](docs/DEVELOPMENT.md)：本地开发、新增工具流程、性能注意事项和发布检查。
- [工具规划](docs/TOOLS_RESEARCH.md)：通用工具和车联网工具的后续扩展方向。

## 添加新工具

1. 在 `src/tools/{category}/` 下创建工具组件。
2. 在 `src/tools/catalog.ts` 中补充工具元信息，包括 `id`、`name`、`description`、`category`、`keywords` 和 `path`。
3. 在 `src/tools/componentLoaders.ts` 中为工具 `id` 注册按需加载函数。
4. 如新增分类，需要同步更新 `src/types/tool.ts` 的 `ToolCategory`、`catalog.ts` 的 `categoryMeta` 和 `toolCategoryColors`。
5. 运行 `npm run build` 验证类型检查和生产构建。

## 统计配置（可选）

支持百度统计和 Google Analytics：

```bash
# 复制配置模板
cp .env.example .env.production

# 编辑配置文件
# VITE_BAIDU_ANALYTICS_ID=your_baidu_analytics_id
# VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

开发环境下统计功能自动禁用。

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
