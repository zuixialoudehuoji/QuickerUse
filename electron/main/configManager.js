import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// 判断开发模式
const isDev = process.env.NODE_ENV === 'development';

// 获取资源路径（打包后从 resources 目录读取）
const getResourcePath = (filename) => {
  if (isDev) {
    return path.join(__dirname, '../../resources', filename);
  }
  return path.join(process.resourcesPath, filename);
};

// 默认配置文件路径
const DEFAULT_CONFIG_FILE = getResourcePath('default-config.json');

// Default configuration
let configCache = {
  startMinimized: true,
  minimizeToTrayOnClose: false
};

// 检查是否首次启动（没有用户配置文件）
function isFirstLaunch() {
  return !fs.existsSync(CONFIG_FILE);
}

// 加载默认配置（从 resources 目录）
function loadDefaultConfig() {
  try {
    if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_FILE, 'utf-8'));
      console.log('[ConfigManager] Loaded default config from resources');
      return data;
    }
  } catch (e) {
    console.error('[ConfigManager] Failed to load default config:', e);
  }
  return null;
}

function loadConfig() {
  // 首次启动时，尝试加载默认配置
  if (isFirstLaunch()) {
    console.log('[ConfigManager] First launch detected');
    const defaultConfig = loadDefaultConfig();
    if (defaultConfig) {
      configCache = { ...configCache, ...defaultConfig };
      // 保存到用户目录
      saveConfig();
      console.log('[ConfigManager] Default config applied and saved');
      return;
    }
  }

  // 加载用户配置
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      configCache = { ...configCache, ...data };
      console.log('[ConfigManager] User config loaded');
    } catch (e) {
      console.error('[ConfigManager] Failed to load config:', e);
    }
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configCache, null, 2));
    return true;
  } catch (e) {
    console.error('[ConfigManager] Failed to save config:', e);
    return false;
  }
}

// 导出完整配置（用于生成 default-config.json）
function exportFullConfig(targetPath) {
  try {
    fs.writeFileSync(targetPath, JSON.stringify(configCache, null, 2));
    console.log('[ConfigManager] Config exported to:', targetPath);
    return { success: true, path: targetPath };
  } catch (e) {
    console.error('[ConfigManager] Export failed:', e);
    return { success: false, error: e.message };
  }
}

// 导入配置
function importConfig(sourcePath) {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: '文件不存在' };
    }
    const data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    configCache = { ...configCache, ...data };
    saveConfig();
    console.log('[ConfigManager] Config imported from:', sourcePath);
    return { success: true };
  } catch (e) {
    console.error('[ConfigManager] Import failed:', e);
    return { success: false, error: e.message };
  }
}

// 获取配置文件路径
function getConfigPath() {
  return CONFIG_FILE;
}

// Initial load
loadConfig();

export default {
  get(key) {
    return configCache[key];
  },
  set(key, value) {
    configCache[key] = value;
    return saveConfig();
  },
  getAll() {
    return configCache;
  },
  exportFullConfig,
  importConfig,
  getConfigPath,
  isFirstLaunch
};
