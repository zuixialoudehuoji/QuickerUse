/**
 * 智能环境感知工具
 * 根据当前活动应用推荐相关功能
 */

// 应用类型与推荐功能映射
export const APP_FEATURE_MAP = {
  // 开发工具
  ide: {
    apps: ['code', 'vscode', 'idea', 'intellij', 'webstorm', 'pycharm', 'sublime', 'atom', 'notepad++', 'vim', 'nvim', 'eclipse', 'android studio'],
    features: ['json-format', 'to-camel', 'regex-helper', 'timestamp-convert', 'encoder', 'color-convert', 'generate-uuid'],
    label: '开发工具'
  },
  // 浏览器
  browser: {
    apps: ['chrome', 'firefox', 'edge', 'msedge', 'safari', 'opera', 'brave'],
    features: ['translate', 'search-google', 'generate-qr', 'extract-info', 'ocr'],
    label: '浏览器'
  },
  // 办公软件
  office: {
    apps: ['excel', 'word', 'powerpoint', 'wps', 'et', 'wpp', 'numbers', 'pages', 'keynote', 'libreoffice'],
    features: ['sql-in', 'json-format', 'timestamp-convert', 'calculator', 'extract-info'],
    label: '办公软件'
  },
  // 设计工具
  design: {
    apps: ['photoshop', 'illustrator', 'figma', 'sketch', 'xd', 'aftereffects', 'premiere', 'blender', 'gimp'],
    features: ['color-picker', 'color-convert', 'generate-qr', 'ocr'],
    label: '设计工具'
  },
  // 通讯软件
  communication: {
    apps: ['wechat', 'weixin', 'qq', 'dingtalk', 'slack', 'teams', 'telegram', 'discord', 'zoom'],
    features: ['translate', 'cron-helper', 'ocr', 'generate-qr', 'memo'],
    label: '通讯软件'
  },
  // 终端
  terminal: {
    apps: ['cmd', 'powershell', 'terminal', 'iterm', 'hyper', 'alacritty', 'windowsterminal', 'conemu'],
    features: ['encoder', 'regex-helper', 'generate-uuid', 'timestamp-convert', 'calculator'],
    label: '终端'
  },
  // 数据库工具
  database: {
    apps: ['navicat', 'dbeaver', 'datagrip', 'mysql', 'pgadmin', 'mongodb', 'robo3t', 'sqlitebrowser'],
    features: ['sql-in', 'json-format', 'timestamp-convert', 'encoder', 'generate-uuid'],
    label: '数据库'
  },
  // 文本编辑
  textEditor: {
    apps: ['notepad', 'textedit', 'typora', 'obsidian', 'notion', 'marktext', 'bear'],
    features: ['markdown-preview', 'translate', 'to-camel', 'cron-helper', 'generate-uuid'],
    label: '文本编辑'
  }
}

// 默认推荐（未匹配到特定应用时）
export const DEFAULT_FEATURES = [
  'search-google', 'translate', 'clipboard-history', 'calculator', 'memo', 'generate-qr'
]

/**
 * 从进程名匹配应用类型
 * @param {string} processName - 进程名（不含扩展名）
 * @returns {object|null}
 */
export function matchAppType(processName) {
  if (!processName) return null

  const name = processName.toLowerCase().replace(/\.exe$/i, '')

  for (const [type, config] of Object.entries(APP_FEATURE_MAP)) {
    for (const app of config.apps) {
      if (name.includes(app) || app.includes(name)) {
        return { type, ...config }
      }
    }
  }

  return null
}

/**
 * 获取当前环境推荐的功能
 * @param {string} processName - 当前活动进程名
 * @returns {object}
 */
export function getRecommendedFeatures(processName) {
  const matched = matchAppType(processName)

  if (matched) {
    return {
      matched: true,
      appType: matched.type,
      appLabel: matched.label,
      features: matched.features
    }
  }

  return {
    matched: false,
    appType: 'default',
    appLabel: '通用',
    features: DEFAULT_FEATURES
  }
}

/**
 * 自定义映射规则（存储在 localStorage）
 */
export function getCustomRules() {
  return JSON.parse(localStorage.getItem('env-custom-rules') || '{}')
}

export function saveCustomRules(rules) {
  localStorage.setItem('env-custom-rules', JSON.stringify(rules))
}

export function addCustomRule(processName, features) {
  const rules = getCustomRules()
  rules[processName.toLowerCase()] = features
  saveCustomRules(rules)
}

export function removeCustomRule(processName) {
  const rules = getCustomRules()
  delete rules[processName.toLowerCase()]
  saveCustomRules(rules)
}

/**
 * 获取推荐功能（包含自定义规则）
 * @param {string} processName
 * @returns {object}
 */
export function getSmartRecommendations(processName) {
  if (!processName) {
    return { matched: false, appType: 'default', appLabel: '通用', features: DEFAULT_FEATURES }
  }

  const name = processName.toLowerCase().replace(/\.exe$/i, '')

  // 先检查自定义规则
  const customRules = getCustomRules()
  if (customRules[name]) {
    return {
      matched: true,
      appType: 'custom',
      appLabel: '自定义',
      features: customRules[name]
    }
  }

  // 再使用默认规则
  return getRecommendedFeatures(processName)
}

/**
 * 环境感知是否启用
 */
export function isEnabled() {
  return localStorage.getItem('env-sensing-enabled') !== 'false'
}

export function setEnabled(enabled) {
  localStorage.setItem('env-sensing-enabled', enabled ? 'true' : 'false')
}
