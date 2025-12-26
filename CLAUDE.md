# 项目开发规范

## 一、模型规范
**规则1**：全程请用中文和我对话
**规则2**：每次更新CLAUDE.md 使用精简的语言描述
**规则3**：文档统一放在项目根目录`docs/`文件夹
**规则4**：代码注释请使用中文

## 二、技术栈
- **核心框架**: Electron (主进程)
- **前端视图**: Vue 3 + Vite + Setup语法糖
- **UI组件库**: Element Plus (按需引入)
- **系统集成**: PowerShell + C# (P/Invoke User32.dll) 用于窗口管理
- **文件处理**: Web Crypto API (SHA-256) + FileReader
- **状态管理**: Pinia (预留), LocalStorage (轻量配置)
- **脚本执行**: Node.js `child_process`
- **图标库**: Remix Icon 或 Element Plus Icons

## 三、目录结构规范

```text
QuickerUse/
├── electron/                 # Electron 主进程
│   ├── main/                 # 主进程核心代码
│   │   ├── index.js          # 入口
│   │   ├── systemTools.js    # 系统底层工具 (含PowerShell注入)
│   │   └── ...
│   ├── preload/              # 预加载脚本 (IPC桥梁)
│   └── utils/                # Node端工具类
├── src/                      # Vue 渲染进程
│   ├── components/           # 公共组件 (将来拆分)
│   ├── utils/                # 前端工具
│   │   ├── textProcessor.js  # 智能文本引擎
│   │   └── fileProcessor.js  # 文件哈希/Base64处理
│   ├── App.vue               # 核心视图逻辑 (MVP阶段)
│   └── store/                # Pinia 状态
├── resources/                # 静态资源 (脚本, 图标, MouseHook)
└── docs/                     # 项目文档
```

## 四、开发规范

### 4.1 进程通信 (IPC)
- **原则**: 渲染进程只负责 UI，系统操作必须通过 IPC 通知主进程。
- **命名**: 
  - 渲染进程发出: `renderer:action-name`
  - 主进程回复: `main:reply-name`

### 4.2 智能文本处理 (Core)
- **位置**: `src/utils/textProcessor.js`
- **逻辑**: 分析剪贴板内容，返回 Action List。
- **交互**: 优先支持鼠标点击（Smart Chips），其次支持命令输入。

### 4.3 魔法拖拽 (Magic Drag)
- **逻辑**: 
  - 可执行文件 (.exe/.lnk) -> 添加到快捷启动 Grid。
  - 图片文件 -> 显示预览并提供 Base64 复制。
  - 其他文件 -> 计算 SHA1/SHA256 哈希值。

### 4.4 系统微操 (System Tools)
- **外部窗口管理**: 通过 PowerShell 动态编译 C# 代码调用 `User32.dll`，实现对当前活动窗口的 `Left/Right/Maximize` 控制。

## 五、命名规范
| 类型 | 规则 | 示例 |
|------|------|------|
| Vue组件 | PascalCase | `SmartPanel.vue` |
| JS工具类 | PascalCase | `SqlFormatter.js` |
| 文件夹 | camelCase | `textProcessors/` |
| IPC事件 | kebab-case | `window-close` |
