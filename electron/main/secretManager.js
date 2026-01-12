// electron/main/secretManager.js
import { safeStorage, app } from 'electron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// 密钥存储路径
const SECRETS_FILE = path.join(app.getPath('userData'), 'secrets.json');
const APP_PIN_FILE = path.join(app.getPath('userData'), 'app-pin.json');

// 内存缓存
let secretsCache = {};

// 验证状态缓存
let authCache = {
  verified: false,
  expireAt: 0
};

// 验证缓存有效期（5分钟）
const AUTH_CACHE_DURATION = 5 * 60 * 1000;

// 简单加密密钥（SafeStorage 不可用时的备用方案）
const FALLBACK_KEY = crypto.createHash('sha256').update(app.getPath('userData')).digest();

// 备用加密方法
function fallbackEncrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', FALLBACK_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function fallbackDecrypt(encryptedText) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', FALLBACK_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 检查 SafeStorage 是否可用
function isSafeStorageAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch (e) {
    return false;
  }
}

// 获取应用 PIN 码哈希
function getAppPinHash() {
  try {
    if (fs.existsSync(APP_PIN_FILE)) {
      const data = JSON.parse(fs.readFileSync(APP_PIN_FILE, 'utf-8'));
      return data.pinHash;
    }
  } catch (e) {
    console.error('读取 PIN 失败:', e);
  }
  return null;
}

// 设置应用 PIN 码
function setAppPin(pin) {
  try {
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
    fs.writeFileSync(APP_PIN_FILE, JSON.stringify({ pinHash }));
    return true;
  } catch (e) {
    console.error('保存 PIN 失败:', e);
    return false;
  }
}

// 验证应用 PIN 码
function verifyAppPin(pin) {
  const storedHash = getAppPinHash();
  if (!storedHash) {
    // 首次使用，设置 PIN
    return setAppPin(pin);
  }
  const inputHash = crypto.createHash('sha256').update(pin).digest('hex');
  return storedHash === inputHash;
}

// 检查是否已设置 PIN
function hasAppPin() {
  return getAppPinHash() !== null;
}

// 初始化：读取并解密
function loadSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return;
  try {
    const rawData = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8'));
    const useSafeStorage = isSafeStorageAvailable();

    // 解密每一项
    for (const [key, data] of Object.entries(rawData)) {
      try {
        if (typeof data === 'object' && data.fallback) {
          // 使用备用加密
          secretsCache[key] = fallbackDecrypt(data.value);
        } else if (useSafeStorage) {
          // 使用 SafeStorage
          const buffer = Buffer.from(data, 'hex');
          secretsCache[key] = safeStorage.decryptString(buffer);
        } else {
          // SafeStorage 不可用，尝试备用解密
          if (typeof data === 'string' && data.includes(':')) {
            secretsCache[key] = fallbackDecrypt(data);
          }
        }
      } catch (e) {
        console.error(`解密 key [${key}] 失败:`, e.message);
      }
    }
    console.log('[SecretManager] 已加载密钥数量:', Object.keys(secretsCache).length);
  } catch (e) {
    console.error('加载密钥文件失败:', e);
  }
}

// 保存：加密并写入
function saveSecrets() {
  const useSafeStorage = isSafeStorageAvailable();
  const encryptedData = {};

  for (const [key, plainText] of Object.entries(secretsCache)) {
    try {
      if (useSafeStorage) {
        const buffer = safeStorage.encryptString(plainText);
        encryptedData[key] = buffer.toString('hex');
      } else {
        // 使用备用加密
        encryptedData[key] = { fallback: true, value: fallbackEncrypt(plainText) };
      }
    } catch (e) {
      console.error(`加密 key [${key}] 失败:`, e);
    }
  }

  try {
    fs.writeFileSync(SECRETS_FILE, JSON.stringify(encryptedData, null, 2));
    console.log('[SecretManager] 密钥已保存', useSafeStorage ? '(SafeStorage)' : '(Fallback)');
    return true;
  } catch (e) {
    console.error('写入密钥文件失败:', e);
    return false;
  }
}

/**
 * 检查是否已验证（缓存有效期内）
 */
function isAuthenticated() {
  if (authCache.verified && Date.now() < authCache.expireAt) {
    return true;
  }
  authCache.verified = false;
  return false;
}

/**
 * 清除验证状态
 */
function clearAuth() {
  authCache.verified = false;
  authCache.expireAt = 0;
}

// 延迟加载（等待 app ready）
let loaded = false;
function ensureLoaded() {
  if (!loaded) {
    loadSecrets();
    loaded = true;
  }
}

export default {
  /** 验证 PIN 码（使用应用自定义 PIN，非 Windows PIN） */
  async verifyPassword(pin) {
    const result = verifyAppPin(pin);
    if (result) {
      authCache.verified = true;
      authCache.expireAt = Date.now() + AUTH_CACHE_DURATION;
    }
    return result;
  },

  /** 检查是否已设置 PIN */
  hasPin() {
    return hasAppPin();
  },

  /** 检查是否已验证 */
  isAuthenticated() {
    return isAuthenticated();
  },

  /** 清除验证状态 */
  clearAuth() {
    clearAuth();
  },

  /** 设置/更新密码 (需要验证) */
  setItem(key, value) {
    ensureLoaded();
    secretsCache[key] = value;
    return saveSecrets();
  },

  /** 获取密码 (需要验证) */
  getItem(key) {
    ensureLoaded();
    if (!isAuthenticated()) {
      return null;
    }
    return secretsCache[key] || null;
  },

  /** 删除密码 */
  removeItem(key) {
    ensureLoaded();
    delete secretsCache[key];
    return saveSecrets();
  },

  /** 获取所有 Key (不含密码明文) */
  getAllKeys() {
    ensureLoaded();
    return Object.keys(secretsCache);
  },

  /** 检查是否可用 */
  isAvailable() {
    return true;
  },

  /** 初始化 */
  init() {
    ensureLoaded();
  },

  /**
   * 导出密钥（使用 PIN 加密）
   * @param {string} pin - 用于加密的 PIN 码
   * @returns {object} 加密后的密钥数据
   */
  exportSecrets(pin) {
    ensureLoaded();
    if (Object.keys(secretsCache).length === 0) {
      return { secrets: {}, hasSecrets: false };
    }
    // 使用 PIN 派生加密密钥
    const exportKey = crypto.createHash('sha256').update(pin + '_export_key').digest();
    const encryptedSecrets = {};
    for (const [key, value] of Object.entries(secretsCache)) {
      try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', exportKey, iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        encryptedSecrets[key] = iv.toString('hex') + ':' + encrypted;
      } catch (e) {
        console.error(`导出密钥 [${key}] 失败:`, e.message);
      }
    }
    return { secrets: encryptedSecrets, hasSecrets: true };
  },

  /**
   * 导入密钥（使用 PIN 解密）
   * @param {object} encryptedSecrets - 加密的密钥数据
   * @param {string} pin - 用于解密的 PIN 码
   * @returns {boolean} 是否导入成功
   */
  importSecrets(encryptedSecrets, pin) {
    ensureLoaded();
    if (!encryptedSecrets || Object.keys(encryptedSecrets).length === 0) {
      return true;
    }
    // 使用 PIN 派生解密密钥
    const exportKey = crypto.createHash('sha256').update(pin + '_export_key').digest();
    let importedCount = 0;
    for (const [key, encryptedValue] of Object.entries(encryptedSecrets)) {
      try {
        const [ivHex, encrypted] = encryptedValue.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', exportKey, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        secretsCache[key] = decrypted;
        importedCount++;
      } catch (e) {
        console.error(`导入密钥 [${key}] 失败:`, e.message);
        return false; // PIN 错误会导致解密失败
      }
    }
    if (importedCount > 0) {
      saveSecrets();
    }
    console.log(`[SecretManager] 成功导入 ${importedCount} 个密钥`);
    return true;
  },

  /**
   * 清除所有密钥（用于重置功能）
   * @returns {boolean} 是否清除成功
   */
  clearAll() {
    ensureLoaded();
    secretsCache = {};
    clearAuth();
    // 删除密钥文件
    try {
      if (fs.existsSync(SECRETS_FILE)) {
        fs.unlinkSync(SECRETS_FILE);
      }
      // 也删除 PIN 文件
      if (fs.existsSync(APP_PIN_FILE)) {
        fs.unlinkSync(APP_PIN_FILE);
      }
      console.log('[SecretManager] 所有密钥已清除');
      return true;
    } catch (e) {
      console.error('[SecretManager] 清除密钥失败:', e);
      return false;
    }
  }
};
