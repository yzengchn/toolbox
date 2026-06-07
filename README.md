# ![ToolBox Logo](public/logo-icon.png) ToolBox - 开发者工具箱

一款简洁高效的在线开发工具集合，专为开发者打造。支持编码转换、数据格式化、车联网协议解析等 20+ 实用工具，无需安装，开箱即用。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

## 在线使用
直接访问在线版本，无需安装：[https://tools.neocockpit.cn](https://tools.neocockpit.cn)

## ✨ 功能特性

### 🔐 编码工具
- **Base64 编码/解码** - 支持文本与 Base64 互转
- **Hash 计算** - MD5、SHA-1、SHA-256、SHA-512 等多种哈希算法
- **JWT 解码** - 解析 JWT Token，查看 Header 和 Payload

### 📝 格式化工具
- **JSON 格式化** - 美化/压缩 JSON，支持语法高亮
- **XML 格式化** - XML 代码美化与验证
- **SQL 格式化** - SQL 语句格式化，提升可读性

### ⏰ 时间工具
- **时间戳转换** - Unix 时间戳与日期时间互转
- **Cron 表达式解析** - 解析 Cron 表达式，查看执行时间

### 🛠️ 实用工具
- **UUID 生成器** - 批量生成 UUID v4
- **密码生成器** - 自定义规则生成强密码
- **二维码生成器** - 文本/URL 转二维码，支持下载
- **颜色转换器** - HEX、RGB、HSL 颜色格式互转

### 🚗 车联网工具
- **JT808/JT809 解析** - JT808/JT809 报文解析与组包
  - 支持 JT808 2013/2019 版本
  - 支持 JT809 平台通信协议
  - Hex 转换与字段换算
  - BCD 编码、经纬度、时间格式转换
- **经纬度 GeoHash** - 地图展示与 GeoHash 编码解码

### 🌐 网络工具
- **URL 编码/解码** - URL 编解码工具
- **User-Agent 解析器** - 解析浏览器、系统、设备、渲染引擎和爬虫标识
- **HTTP 状态码查询** - 快速查询 HTTP 状态码含义
- **IP 地址查询** - 查询 IP 归属地信息
- **子网计算器** - CIDR 子网计算与划分
- **端口扫描工具** - 批量探测 HTTP/HTTPS 端口可访问性

### 🔌 连接工具
- **WebSocket 客户端** - 在线 WebSocket 测试工具
- **MQTT 客户端** - MQTT 连接与消息收发测试

## 🚀 快速开始

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

## 🎨 界面预览

- 🌓 **深色/浅色主题** - 自由切换，护眼舒适
- 📱 **响应式设计** - 完美适配桌面端和移动端
- ⭐ **收藏功能** - 快速访问常用工具
- 🔍 **全局搜索** - 快速定位所需工具

## 🛠️ 技术栈

- **前端框架：** Vue 3 + TypeScript
- **构建工具：** Vite
- **UI 组件库：** Naive UI
- **状态管理：** Pinia
- **路由管理：** Vue Router
- **地图组件：** Leaflet
- **时间处理：** Day.js
- **代码高亮：** Highlight.js

## 📦 环境要求

- Node.js >= 18
- npm >= 9

## 🔧 开发指南

### 项目结构

```
toolbox/
├── src/
│   ├── components/     # 公共组件
│   ├── tools/          # 工具模块
│   │   ├── encoding/   # 编码工具
│   │   ├── formatter/  # 格式化工具
│   │   ├── time/       # 时间工具
│   │   ├── utilities/  # 实用工具
│   │   ├── vehicle-iot/# 车联网工具
│   │   ├── network/    # 网络工具
│   │   └── connection/ # 连接工具
│   ├── router/         # 路由配置
│   ├── stores/         # 状态管理
│   └── types/          # 类型定义
├── public/             # 静态资源
└── docs/               # 文档
```

### 添加新工具

1. 在 `src/tools/{category}/` 下创建工具组件
2. 在 `src/tools/{category}/index.ts` 中注册工具
3. 配置工具元信息（名称、图标、关键词等）

### 统计配置（可选）

支持百度统计和 Google Analytics：

```bash
# 复制配置模板
cp .env.example .env.production

# 编辑配置文件
# VITE_BAIDU_ANALYTICS_ID=your_baidu_analytics_id
# VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

开发环境下统计功能自动禁用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

⭐ 如果这个项目对你有帮助，欢迎 Star 支持！
