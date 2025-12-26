// src/utils/constants.js
// 功能常量定义

// 功能图标映射 (使用Element Plus Icons名称)
export const FEATURE_ICONS = {
  // 搜索与翻译
  'search-google': 'Search',
  'translate': 'Connection',

  // 数据处理
  'sql-in': 'Tickets',
  'json-format': 'Document',
  'yaml-format': 'Switch',

  // 开发辅助
  'timestamp-convert': 'Clock',
  'to-camel': 'EditPen',

  // 信息提取
  'extract-info': 'Postcard',

  // 工具
  'generate-qr': 'Grid',
  'snip-pin': 'Picture',

  // 生成器
  'generate-uuid': 'Key',
  'generate-password': 'Lock',

  // 系统工具
  'color-picker': 'Brush',
  'timer': 'AlarmClock',
  'memo': 'Memo'
};

// 所有智能功能定义
export const ALL_FEATURES = [
  // === 搜索与翻译 ===
  {
    label: '搜索',
    action: 'search-google',
    category: 'search',
    description: '使用默认浏览器搜索选中文本'
  },
  {
    label: '翻译',
    action: 'translate',
    category: 'search',
    description: '翻译选中的文本内容'
  },

  // === 数据处理 ===
  {
    label: 'SQL IN',
    action: 'sql-in',
    category: 'data',
    description: '多行文本转为SQL IN语句格式'
  },
  {
    label: 'JSON处理',
    action: 'json-format',
    category: 'data',
    description: '格式化/压缩/校验JSON数据'
  },
  {
    label: 'YAML处理',
    action: 'yaml-format',
    category: 'data',
    description: 'YAML格式化/校验/转JSON'
  },

  // === 开发辅助 ===
  {
    label: '时间戳转换',
    action: 'timestamp-convert',
    category: 'dev',
    description: '时间戳与日期时间互转'
  },
  {
    label: '变量命名',
    action: 'to-camel',
    category: 'dev',
    description: '驼峰/下划线/短横线命名互转'
  },

  // === 信息提取 ===
  {
    label: '信息提取',
    action: 'extract-info',
    category: 'extract',
    description: '提取IP/邮箱/手机号/链接'
  },

  // === 工具 ===
  {
    label: '二维码',
    action: 'generate-qr',
    category: 'tool',
    description: '将文本或链接生成二维码'
  },
  {
    label: '贴图置顶',
    action: 'snip-pin',
    category: 'tool',
    description: '将剪贴板图片悬浮置顶'
  },
  {
    label: '闪念胶囊',
    action: 'memo',
    category: 'tool',
    description: '快速记录想法和备忘'
  },

  // === 生成器 ===
  {
    label: 'UUID',
    action: 'generate-uuid',
    category: 'generator',
    description: '生成随机UUID标识符'
  },
  {
    label: '强密码',
    action: 'generate-password',
    category: 'generator',
    description: '生成16位随机强密码'
  },

  // === 系统工具 ===
  {
    label: '屏幕取色',
    action: 'color-picker',
    category: 'system',
    description: '拾取屏幕任意位置颜色'
  },
  {
    label: '倒计时',
    action: 'timer',
    category: 'system',
    description: '设置定时提醒'
  }
];

// 内置工具列表 (可添加到自定义区)
export const BUILTIN_TOOLS = [
  { label: '屏幕取色', action: 'color-picker', icon: 'Brush', description: '拾取屏幕颜色' },
  { label: '倒计时', action: 'timer', icon: 'AlarmClock', description: '定时提醒' },
  { label: 'UUID', action: 'generate-uuid', icon: 'Key', description: '生成UUID' },
  { label: '强密码', action: 'generate-password', icon: 'Lock', description: '生成密码' },
  { label: '闪念胶囊', action: 'memo', icon: 'Memo', description: '快速备忘' },
  { label: '二维码', action: 'generate-qr', icon: 'Grid', description: '生成二维码' }
];

// 默认设置
export const DEFAULT_SETTINGS = {
  theme: 'dark',
  opacity: 0.95,
  mode: 'smart',  // smart | all
  smartRows: 2,
  customRows: 3,
  globalHotkey: 'Alt+Space',
  followMouse: true,
  autoStart: false,
  searchEngine: 'google',
  translateService: 'google'
};

// 搜索引擎URL模板
export const SEARCH_ENGINES = {
  google: 'https://www.google.com/search?q={query}',
  baidu: 'https://www.baidu.com/s?wd={query}',
  bing: 'https://www.bing.com/search?q={query}',
  duckduckgo: 'https://duckduckgo.com/?q={query}'
};

// 翻译服务URL模板
export const TRANSLATE_SERVICES = {
  google: 'https://translate.google.com/?sl=auto&tl=zh-CN&text={text}',
  deepl: 'https://www.deepl.com/translator#auto/zh/{text}',
  baidu: 'https://fanyi.baidu.com/#auto/zh/{text}',
  youdao: 'https://fanyi.youdao.com/?keyfrom=fanyi.web'
};

// 分类定义
export const CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'search', label: '搜索' },
  { value: 'data', label: '数据' },
  { value: 'dev', label: '开发' },
  { value: 'extract', label: '提取' },
  { value: 'tool', label: '工具' },
  { value: 'generator', label: '生成' },
  { value: 'system', label: '系统' }
];
