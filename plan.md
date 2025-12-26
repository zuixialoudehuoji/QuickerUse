# QuickerUse 开发计划

## 1. 项目概述
QuickerUse 是一个跨平台（Windows/Mac）的桌面效率工具。
**核心理念**: 极简交互。通过全局快捷键或鼠标中键唤起，自动获取选中文本，根据内容智能推荐操作，并提供"一键式"快捷功能。

## 2. 当前已实现功能

### 智能推荐功能 (Smart Features)

| 功能名称 | 操作标识 | 说明 |
|---------|---------|------|
| **搜索** | `search-google` | 使用默认浏览器 Google 搜索选中文本 |
| **翻译** | `translate` | 打开 Google 翻译页面翻译选中文本 |
| **打开链接** | `open-url` | 在浏览器中打开选中的 URL 链接 |
| **SQL IN** | `sql-in` | 将多行文本转为 SQL IN 语句格式，如：`('a', 'b', 'c')` |
| **逗号拼接** | `join-comma` | 将多行文本用逗号连接成一行，直接复制到剪贴板 |
| **JSON处理** | `json-format` | 提供格式化/压缩/校验 JSON 数据的完整工具 |
| **YAML转JSON** | `yaml-to-json` | 将 YAML 格式文本转换为 JSON 格式 |
| **时间戳转换** | `timestamp-convert` | 时间戳与日期时间双向转换，支持秒/毫秒级时间戳 |
| **变量命名转换** | `to-camel` | 驼峰(camelCase)/下划线(snake_case)/短横线(kebab-case)命名风格互转 |
| **信息提取** | `extract-info` | 从文本中批量提取 IP 地址、邮箱、手机号、链接等信息 |
| **二维码** | `generate-qr` | 将文本或链接生成二维码图片，支持下载 |
| **UUID** | `generate-uuid` | 生成随机 UUID 标识符并复制到剪贴板 |
| **强密码** | `generate-password` | 生成 16 位随机强密码（含大小写字母、数字、特殊符号） |
| **屏幕取色** | `color-picker` | 使用系统取色器拾取屏幕任意位置的颜色，返回 HEX/RGB 值 |
| **窗口左分屏** | `window-left` | 将之前的活动窗口移动到屏幕左半边 |
| **窗口右分屏** | `window-right` | 将之前的活动窗口移动到屏幕右半边 |
| **窗口最大化** | `window-full` | 最大化之前的活动窗口 |
| **窗口置顶** | `window-pin` | 将之前的活动窗口设为始终置顶 |
| **倒计时** | `timer` | 快速设置 5/25/60 分钟定时提醒，到时系统通知 |
| **连点器** | `auto-clicker` | 自动鼠标连续点击，可设置间隔和次数 |
| **闪念胶囊** | `memo` | 快速记录想法和备忘，数据本地存储 |

### 我的工具 (Custom Tools)
- 支持添加文件/快捷方式作为快速启动项
- 支持将内置功能添加到工具栏
- 支持管理员身份运行
- 支持自定义图标（emoji 或系统图标）
- 拖放文件自动获取文件图标

### 设置功能
- **外观设置**: 深色/浅色主题、窗口透明度、智能区/工具区行数
- **快捷键设置**: 全局唤醒热键（按键捕获）、功能独立热键
- **数据管理**: 启动后最小化、密钥管理、重置工具/恢复默认

### 系统特性
- 全局快捷键唤醒（默认 Alt+Space）
- 鼠标中键唤醒
- 窗口跟随鼠标位置显示（不超出屏幕边界）
- 自动获取选中文本（模拟 Ctrl+C）
- 系统托盘驻留（双击切换启用/禁用）

## 3. 技术架构

### 技术栈
- **Runtime**: Electron (主进程)
- **Frontend**: Vue 3 + Vite + Element Plus
- **组件化**: 7 个独立组件（ToolGrid、FeatureModal、SettingsModal 等）
- **Storage**: LocalStorage (配置)、Electron safeStorage (密钥)

### 目录结构
```
QuickerUse/
├── electron/
│   ├── main/
│   │   ├── index.js          # 主进程入口
│   │   ├── systemTools.js    # 系统工具（PowerShell 调用）
│   │   ├── secretManager.js  # 密钥管理
│   │   └── configManager.js  # 配置管理
│   └── preload/
│       └── index.js          # 预加载脚本
├── src/
│   ├── components/           # Vue 组件
│   │   ├── ToolGrid.vue
│   │   ├── FeatureModal.vue
│   │   ├── SettingsModal.vue
│   │   ├── AddToolModal.vue
│   │   ├── FileInfoModal.vue
│   │   └── ManageFeaturesModal.vue
│   ├── utils/
│   │   ├── constants.js      # 功能定义和常量
│   │   ├── textProcessor.js  # 文本处理工具
│   │   └── fileProcessor.js  # 文件处理工具
│   ├── assets/
│   │   └── main.css          # 全局样式
│   ├── App.vue               # 主应用组件
│   └── main.js               # Vue 入口
└── resources/
    └── MouseHook.exe         # 鼠标中键监听
```

## 4. 待开发功能

### 高优先级
- [ ] 密钥管理增加系统密码验证
- [ ] API 调试功能（GET 请求）
- [ ] 汇率换算功能
- [ ] 贴图置顶功能

### 中优先级
- [ ] 脚本管理（扫描指定目录）
- [ ] 局域网文件分享
- [ ] 演示模式
- [ ] 进程管理器

### 低优先级
- [ ] Mac 平台适配
- [ ] 右键手势
- [ ] 智能环境切换
- [ ] 文档转换

## 5. 打包与发布
- 工具: `electron-builder`
- 目标:
    - Windows: `nsis` (安装包) + `portable` (免安装)
    - Mac: `dmg`
