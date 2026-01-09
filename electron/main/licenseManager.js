/**
 * 密钥管理模块 - 处理软件授权验证
 */
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';

// 开发/生产环境判断
const isDev = process.env.NODE_ENV === 'development';

// 获取用户数据目录下的密钥文件路径（用于写入）
const getUserLicenseFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'license.txt');
};

// 密钥文件路径（读取时优先用户目录，写入始终用户目录）
const getLicenseFilePath = () => {
  if (isDev) {
    return path.join(__dirname, '../../resources/license.txt');
  }
  // 生产环境：优先检查用户数据目录
  const userLicensePath = getUserLicenseFilePath();
  if (fs.existsSync(userLicensePath)) {
    return userLicensePath;
  }
  // 兼容：检查 resources 目录（只读，用于预置密钥）
  const resourceLicensePath = path.join(process.resourcesPath, 'license.txt');
  if (fs.existsSync(resourceLicensePath)) {
    return resourceLicensePath;
  }
  // 默认返回用户目录路径
  return userLicensePath;
};

// Bridge.exe 路径
const getBridgePath = () => {
  if (isDev) {
    return path.join(__dirname, '../../resources/Bridge.exe');
  }
  return path.join(process.resourcesPath, 'Bridge.exe');
};

// 验证状态缓存
let licenseCache = {
  isValid: false,
  remainingDays: 0,
  message: '',
  lastCheck: 0
};

/**
 * 解密密钥并获取有效期信息（异步版本）
 * @param {string} encryptedKey - 加密的密钥字符串
 * @returns {Promise<{ valid: boolean, remainingDays: number, expireDate: string, message: string }>}
 */
function decryptAndValidate(encryptedKey) {
  return new Promise((resolve) => {
    if (!encryptedKey || encryptedKey.trim().length === 0) {
      resolve({
        valid: false,
        remainingDays: 0,
        expireDate: '',
        message: '密钥不能为空'
      });
      return;
    }

    const bridgePath = getBridgePath();

    // 检查 Bridge.exe 是否存在
    if (!fs.existsSync(bridgePath)) {
      console.error('[LicenseManager] Bridge.exe not found:', bridgePath);
      resolve({
        valid: false,
        remainingDays: 0,
        expireDate: '',
        message: '验证程序不存在'
      });
      return;
    }

    // 异步调用 Bridge.exe validate 命令
    const child = execFile(bridgePath, ['validate', encryptedKey.trim()], {
      encoding: 'utf-8',
      timeout: 10000,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('[LicenseManager] Validation error:', error.message);
        resolve({
          valid: false,
          remainingDays: 0,
          expireDate: '',
          message: '密钥验证失败: ' + error.message
        });
        return;
      }

      try {
        console.log('[LicenseManager] Bridge.exe output:', stdout);
        const data = JSON.parse(stdout.trim());

        if (data.valid) {
          // 计算剩余天数
          const expiryDate = new Date(data.expiry);
          const now = new Date();
          const remainingMs = expiryDate.getTime() - now.getTime();
          const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

          resolve({
            valid: true,
            remainingDays: remainingDays,
            expireDate: data.expiry.split(' ')[0],
            message: '授权有效'
          });
        } else {
          resolve({
            valid: false,
            remainingDays: 0,
            expireDate: '',
            message: data.message || '授权无效或已过期'
          });
        }
      } catch (e) {
        console.error('[LicenseManager] Parse error:', e.message);
        resolve({
          valid: false,
          remainingDays: 0,
          expireDate: '',
          message: '验证结果解析失败'
        });
      }
    });

    // 确保子进程资源释放
    child.on('close', () => {
      child.removeAllListeners();
    });
  });
}

/**
 * 从文件读取密钥
 * @returns {string} 密钥字符串，如果文件不存在则返回空字符串
 */
function readLicenseFromFile() {
  try {
    const licensePath = getLicenseFilePath();
    if (fs.existsSync(licensePath)) {
      const content = fs.readFileSync(licensePath, 'utf-8');
      // 移除所有空白字符（包括换行符）
      return content.replace(/\s+/g, '');
    }
  } catch (e) {
    console.error('[LicenseManager] Failed to read license file:', e.message);
  }
  return '';
}

/**
 * 将密钥保存到文件（始终保存到用户数据目录）
 * @param {string} licenseKey - 密钥字符串
 * @returns {boolean} 是否保存成功
 */
function saveLicenseToFile(licenseKey) {
  try {
    // 生产环境始终保存到用户数据目录（可写）
    const licensePath = isDev
      ? path.join(__dirname, '../../resources/license.txt')
      : getUserLicenseFilePath();

    // 确保目录存在
    const dir = path.dirname(licensePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(licensePath, licenseKey.replace(/\s+/g, ''), 'utf-8');
    console.log('[LicenseManager] License saved to:', licensePath);
    return true;
  } catch (e) {
    console.error('[LicenseManager] Failed to save license file:', e.message);
    return false;
  }
}

/**
 * 验证当前保存的密钥（异步）
 * @returns {Promise<{ isValid: boolean, remainingDays: number, message: string }>}
 */
async function validateLicense() {
  const licenseKey = readLicenseFromFile();

  if (!licenseKey) {
    licenseCache = {
      isValid: false,
      remainingDays: 0,
      message: '未找到授权密钥，请输入有效密钥',
      lastCheck: Date.now()
    };
    return licenseCache;
  }

  const result = await decryptAndValidate(licenseKey);

  licenseCache = {
    isValid: result.valid,
    remainingDays: result.remainingDays,
    message: result.message,
    expireDate: result.expireDate,
    lastCheck: Date.now()
  };

  return licenseCache;
}

/**
 * 激活新密钥（异步）
 * @param {string} newKey - 新的密钥字符串
 * @returns {Promise<{ success: boolean, isValid: boolean, remainingDays: number, message: string }>}
 */
async function activateLicense(newKey) {
  if (!newKey || newKey.trim().length === 0) {
    return {
      success: false,
      isValid: false,
      remainingDays: 0,
      message: '密钥不能为空'
    };
  }

  // 先验证新密钥
  const result = await decryptAndValidate(newKey);

  if (result.valid) {
    // 验证通过，保存到文件
    const saved = saveLicenseToFile(newKey);
    if (saved) {
      licenseCache = {
        isValid: true,
        remainingDays: result.remainingDays,
        message: result.message,
        expireDate: result.expireDate,
        lastCheck: Date.now()
      };
      return {
        success: true,
        isValid: true,
        remainingDays: result.remainingDays,
        expireDate: result.expireDate,
        message: '激活成功！剩余 ' + result.remainingDays + ' 天'
      };
    } else {
      return {
        success: false,
        isValid: false,
        remainingDays: 0,
        message: '密钥保存失败'
      };
    }
  } else {
    return {
      success: false,
      isValid: false,
      remainingDays: 0,
      message: result.message || '密钥无效'
    };
  }
}

/**
 * 获取缓存的验证状态（同步，仅返回缓存）
 * 注意：前端已有定时重新验证机制，此处不再自动触发
 * @returns {{ isValid: boolean, remainingDays: number, message: string }}
 */
function getLicenseStatus() {
  return licenseCache;
}

export default {
  validateLicense,
  activateLicense,
  getLicenseStatus,
  getLicenseFilePath,
  readLicenseFromFile,
  saveLicenseToFile
};
