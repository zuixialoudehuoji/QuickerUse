// electron/main/secretManager.js
import { safeStorage, app } from 'electron';
import path from 'path';
import fs from 'fs';

// 密钥存储路径
const SECRETS_FILE = path.join(app.getPath('userData'), 'secrets.json');

// 内存缓存
let secretsCache = {};

// 初始化：读取并解密
function loadSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return;
  try {
    const rawData = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8'));
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('SafeStorage 加密不可用，无法解密数据');
      return;
    }
    
    // 解密每一项
    for (const [key, hexStr] of Object.entries(rawData)) {
      try {
        const buffer = Buffer.from(hexStr, 'hex');
        const decrypted = safeStorage.decryptString(buffer);
        secretsCache[key] = decrypted;
      } catch (e) {
        console.error(`解密 key [${key}] 失败:`, e);
      }
    }
  } catch (e) {
    console.error('加载密钥文件失败:', e);
  }
}

// 保存：加密并写入
function saveSecrets() {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error('SafeStorage 加密不可用，无法保存');
    return false;
  }

  const encryptedData = {};
  for (const [key, plainText] of Object.entries(secretsCache)) {
    try {
      const buffer = safeStorage.encryptString(plainText);
      encryptedData[key] = buffer.toString('hex');
    } catch (e) {
      console.error(`加密 key [${key}] 失败:`, e);
    }
  }

  try {
    fs.writeFileSync(SECRETS_FILE, JSON.stringify(encryptedData, null, 2));
    return true;
  } catch (e) {
    console.error('写入密钥文件失败:', e);
    return false;
  }
}

// 首次加载
loadSecrets();

export default {
  /** 设置/更新密码 */
  setItem(key, value) {
    secretsCache[key] = value;
    return saveSecrets();
  },

  /** 获取密码 */
  getItem(key) {
    return secretsCache[key] || null;
  },

  /** 删除密码 */
  removeItem(key) {
    delete secretsCache[key];
    return saveSecrets();
  },

  /** 获取所有 Key (不含密码明文) */
  getAllKeys() {
    return Object.keys(secretsCache);
  },

  /** 检查是否可用 */
  isAvailable() {
    return safeStorage.isEncryptionAvailable();
  }
};
