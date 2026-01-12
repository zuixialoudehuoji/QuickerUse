// electron/main/index.js (主进程文件)
import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard, shell, Tray, Menu, nativeImage, Notification } from 'electron'
import path, { join } from 'path'
import {execFile, spawn} from 'child_process'
import fs from 'fs'
import systemTools from './systemTools'
import scriptManager from './scriptManager'
import fileServer from './fileServer'
import secretManager from './secretManager'
import configManager from './configManager'
import ClipboardHistory from './clipboardHistory.js'
import licenseManager from './licenseManager.js'

// 剪贴板历史管理器实例
let clipboardHistory = null 

// 定义主窗口实例
let mainWindow = null
let tray = null
let isAppDisabled = false
let globalHotkey = 'Alt+Space'
let mouseHookProc = null
let normalIconImage = null
let disabledIconImage = null
let lastActiveWindowHandle = null  // 记录唤醒前的活动窗口句柄
let dialogWindow = null  // 独立弹出框窗口（全局变量，防止快捷键冲突）
let globalCreateRadialMenuWindow = null  // 全局轮盘菜单创建函数（供MouseHook调用）
let globalPreloadRadialWindow = null  // 全局预加载函数引用
let radialMenuWindow = null  // 轮盘菜单窗口（全局变量，便于清理）
let preloadedRadialWindow = null  // 预加载的轮盘窗口（用于快速弹出）
let radialWindowReady = false  // 预加载窗口是否就绪

// 全局清理相关变量（用于退出时清理）
let preloadedDialogWindow = null  // 预加载的弹出框窗口
let preloadTimer = null  // 预加载定时器
let cleanupFunctions = []  // 注册的清理函数
let windowCleanupTimer = null  // 窗口清理定时器

// 开发模式判断
const isDev = process.env.NODE_ENV === 'development'

// 生产环境下禁用 console.log 和 console.debug（保留 error/warn 用于排查问题）
if (!isDev) {
  const noop = () => {}
  console.log = noop
  console.debug = noop
}

// 资源路径 - 打包后需要从 resources 目录读取
const getResourcePath = (filename) => {
  if (isDev) {
    return join(__dirname, '../../resources', filename);
  }
  // 打包后，extraResources 会被复制到 resources 目录
  return join(process.resourcesPath, filename);
};

const mouseHookPath = getResourcePath('MouseHook.exe');
let middleClickEnabled = true; // 中键唤醒开关
let summonMode = 'popup'; // 召唤模式: 'popup' 弹框模式, 'radial' 轮盘模式

// 解密
const bridgePath = getResourcePath('Bridge.exe');


ipcMain.handle('validate-license', async (event, token) => {
  return new Promise((resolve) => {
    execFile(bridgePath, ['validate', token], (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        try {
          const result = JSON.parse(stdout.trim());
          resolve({ success: true, data: result });
        } catch (e) {
          resolve({ success: false, error: "Invalid response from bridge." });
        }
      }
    });
  });
});

// ========== 密钥验证 IPC（全局注册，确保在窗口创建前可用） ==========

// 翻译 Bridge.exe 返回的英文消息为中文
const translateLicenseMessage = (msg) => {
  if (!msg) return '未知错误';
  const translations = {
    'Valid license.': '授权有效',
    'Invalid license format.': '授权格式无效',
    'Invalid license signature.': '授权签名无效',
    'License not bound to this hardware.': '授权未绑定到此设备',
    'Decryption failed or invalid key.': '解密失败或密钥无效',
    'No valid network adapters found.': '未找到有效的网络适配器'
  };
  // 检查过期消息（包含日期）
  if (msg.startsWith('License expired on')) {
    const dateMatch = msg.match(/License expired on (.+)\./);
    if (dateMatch) {
      return `授权已于 ${dateMatch[1]} 过期`;
    }
    return '授权已过期';
  }
  // 检查错误消息前缀
  if (msg.startsWith('Error:')) {
    return '错误: ' + msg.substring(6).trim();
  }
  return translations[msg] || msg;
};

// 验证当前密钥
ipcMain.on('license-validate', (event) => {
  console.log('[LicenseManager] license-validate received');
  try {
    const licenseKey = licenseManager.readLicenseFromFile();
    console.log('[LicenseManager] License key length:', licenseKey ? licenseKey.length : 0);

    if (!licenseKey) {
      console.log('[LicenseManager] No license key found');
      event.reply('license-status', {
        isValid: false,
        remainingDays: 0,
        message: '未找到授权密钥，请输入有效密钥'
      });
      return;
    }

    // 调用 Bridge.exe 验证
    console.log('[LicenseManager] Calling Bridge.exe...');
    execFile(bridgePath, ['validate', licenseKey], { timeout: 10000, windowsHide: true }, (error, stdout) => {
      if (error) {
        console.error('[LicenseManager] Bridge.exe error:', error.message);
        event.reply('license-status', {
          isValid: false,
          remainingDays: 0,
          message: '验证失败: ' + error.message
        });
        return;
      }

      try {
        console.log('[LicenseManager] Bridge.exe output:', stdout);
        const data = JSON.parse(stdout.trim());
        if (data.valid) {
          const expiryDate = new Date(data.expiry);
          const remainingDays = Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)));
          console.log('[LicenseManager] License valid, days remaining:', remainingDays);
          event.reply('license-status', {
            isValid: true,
            remainingDays,
            expireDate: data.expiry.split(' ')[0],
            message: '授权有效'
          });
        } else {
          console.log('[LicenseManager] License invalid:', data.message);
          event.reply('license-status', {
            isValid: false,
            remainingDays: 0,
            message: translateLicenseMessage(data.message)
          });
        }
      } catch (e) {
        console.error('[LicenseManager] Parse error:', e.message);
        event.reply('license-status', {
          isValid: false,
          remainingDays: 0,
          message: '解析失败'
        });
      }
    });
  } catch (e) {
    console.error('[LicenseManager] Exception:', e.message);
    event.reply('license-status', {
      isValid: false,
      remainingDays: 0,
      message: '验证异常: ' + e.message
    });
  }
});

// 激活新密钥
ipcMain.on('license-activate', (event, licenseKey) => {
  console.log('[LicenseManager] license-activate received');
  if (!licenseKey || !licenseKey.trim()) {
    event.reply('license-activate-result', { success: false, message: '密钥不能为空' });
    return;
  }

  execFile(bridgePath, ['validate', licenseKey.trim()], { timeout: 10000, windowsHide: true }, (error, stdout) => {
    if (error) {
      event.reply('license-activate-result', { success: false, message: '验证失败: ' + error.message });
      return;
    }

    try {
      const data = JSON.parse(stdout.trim());
      if (data.valid) {
        // 保存密钥
        const saved = licenseManager.saveLicenseToFile(licenseKey.trim());

        if (saved) {
          const expiryDate = new Date(data.expiry);
          const remainingDays = Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)));
          const result = {
            success: true,
            isValid: true,
            remainingDays,
            expireDate: data.expiry.split(' ')[0],
            message: '激活成功！剩余 ' + remainingDays + ' 天'
          };
          event.reply('license-activate-result', result);
          event.reply('license-status', result);
        } else {
          event.reply('license-activate-result', { success: false, message: '密钥保存失败' });
        }
      } else {
        event.reply('license-activate-result', { success: false, message: translateLicenseMessage(data.message) });
      }
    } catch (e) {
      event.reply('license-activate-result', { success: false, message: '解析失败' });
    }
  });
});

// 获取密钥状态（使用缓存，同步）
ipcMain.on('license-get-status', (event) => {
  const result = licenseManager.getLicenseStatus();
  event.reply('license-status', result);
});

// 打开文件选择对话框（全局注册，确保在窗口创建前可用）
ipcMain.handle('open-file-dialog', async (event, options = {}) => {
  const { dialog, BrowserWindow } = require('electron');
  // 获取当前聚焦的窗口，如果没有则使用 mainWindow
  const parentWindow = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(parentWindow, {
    title: options.title || '选择文件',
    filters: options.filters || [
      { name: '可执行文件', extensions: ['exe', 'lnk', 'bat', 'cmd', 'msi'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);

  return {
    canceled: false,
    filePath: filePath,
    fileName: fileName
  };
});

function updateTrayIcon() {
  if (tray && normalIconImage && disabledIconImage) {
    const icon = isAppDisabled ? disabledIconImage : normalIconImage;
    tray.setImage(icon);
    tray.setToolTip(isAppDisabled ? 'QuickerUse (已禁用)' : 'QuickerUse');
  }
}

// Action 到弹出框类型的映射
const ACTION_TO_DIALOG = {
  'clipboard-history': { type: 'clipboard-history', title: '剪贴板历史', width: 400, height: 500 },
  'ai-assistant': { type: 'ai', title: 'AI 智能助手', width: 440, height: 480 },
  'extract-info': { type: 'extract', title: '信息提取', width: 440, height: 400 },
  'timer': { type: 'timer', title: '倒计时', width: 320, height: 280 },
  'memo': { type: 'memo', title: '闪念胶囊', width: 400, height: 350 },
  'generate-qr': { type: 'qrcode', title: '二维码', width: 320, height: 380 },
  'ocr': { type: 'ocr', title: 'OCR 识别', width: 500, height: 450 },
  'json-format': { type: 'text-editor', title: 'JSON 处理', width: 440, height: 320, actionType: 'json' },
  'sql-in': { type: 'text-editor', title: 'SQL IN', width: 440, height: 320, actionType: 'sql' },
  'timestamp-convert': { type: 'text-editor', title: '时间戳转换', width: 440, height: 320, actionType: 'timestamp' },
  'calculator': { type: 'text-editor', title: '计算器', width: 440, height: 320, actionType: 'calculator' },
  'encoder': { type: 'text-editor', title: '编码转换', width: 440, height: 320, actionType: 'encoder' },
  'regex-helper': { type: 'text-editor', title: '正则助手', width: 500, height: 400, actionType: 'regex' },
  'color-convert': { type: 'text-editor', title: '颜色转换', width: 440, height: 320, actionType: 'color' },
  'markdown-preview': { type: 'text-editor', title: 'Markdown 预览', width: 600, height: 500, actionType: 'markdown' },
  'cron-helper': { type: 'text-editor', title: 'Cron 表达式', width: 460, height: 480, actionType: 'cron' },
  // 新增：生成器类型
  'generate-uuid': { type: 'text-editor', title: 'UUID 生成器', width: 440, height: 280, actionType: 'uuid' },
  'generate-password': { type: 'text-editor', title: '密码生成器', width: 440, height: 280, actionType: 'password' },
  // 命名转换
  'to-camel': { type: 'text-editor', title: '变量命名转换', width: 440, height: 320, actionType: 'naming' },
  // YAML 处理
  'yaml-format': { type: 'text-editor', title: 'YAML 处理', width: 480, height: 400, actionType: 'yaml' },
};

// 特殊动作列表（不通过弹出框处理）
const SPECIAL_ACTIONS = {
  'pick-color': 'color-picker',      // 取色器
  'lock-screen': 'system-action',    // 锁屏
  'open-explorer': 'system-action',  // 打开我的电脑
  'minimize-all': 'system-action',   // 最小化全部
  'switch-hosts': 'system-action',   // Hosts目录
  'open-regedit': 'system-action',   // 打开注册表
  'open-env-vars': 'system-action',  // 环境变量编辑
  'open-uninstall': 'system-action', // 程序卸载页面
  'open-network-settings': 'system-action', // 网络设置
  'search-google': 'web-search',     // 搜索
  'translate': 'web-translate',      // 翻译
};

// 快捷键直接打开弹出框或执行特殊动作（不经过主窗口）
async function openDirectDialog(action) {
  // 先检查是否为特殊动作
  const specialType = SPECIAL_ACTIONS[action];
  if (specialType) {
    console.log('[Main] Executing special action via hotkey:', action, '->', specialType);

    // 获取选中内容用于搜索/翻译
    const finalText = await captureSelectionOrClipboard();

    if (specialType === 'color-picker') {
      // 取色器
      setTimeout(() => {
        // 触发取色
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('trigger-color-picker');
        }
      }, 100);
    } else if (specialType === 'system-action') {
      // 系统动作
      const { exec: execCmd } = require('child_process');
      switch (action) {
        case 'lock-screen':
          systemTools.lockScreen();
          break;
        case 'open-explorer':
          shell.openPath('C:\\');
          break;
        case 'minimize-all':
          execCmd('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).ToggleDesktop()"');
          break;
        case 'switch-hosts':
          shell.openPath('C:\\Windows\\System32\\drivers\\etc');
          break;
        case 'open-regedit':
          execCmd('regedit');
          break;
        case 'open-env-vars':
          execCmd('rundll32.exe sysdm.cpl,EditEnvironmentVariables');
          break;
        case 'open-uninstall':
          execCmd('control appwiz.cpl');
          break;
        case 'open-network-settings':
          execCmd('ncpa.cpl');
          break;
      }
    } else if (specialType === 'web-search' || specialType === 'web-translate') {
      // 搜索和翻译 - 发送到主窗口处理（使用用户设置的搜索引擎/翻译服务）
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-smart-action', {
          action: action,
          text: finalText
        });
      }
    }
    return;
  }

  // 非特殊动作，检查弹窗配置
  const config = ACTION_TO_DIALOG[action];
  if (!config) {
    console.warn('[Main] Unknown action for direct dialog:', action);
    return;
  }

  // 获取选中内容（优先）或剪贴板内容
  const finalText = await captureSelectionOrClipboard();

  // 构建弹出框数据
  const data = {
    title: config.title,
    type: config.type,
    actionType: config.actionType,
    initialText: finalText,
    text: finalText,
    width: config.width,
    height: config.height
  };

  // 使用全局函数创建弹出框
  if (global.createDialogWindow) {
    global.createDialogWindow(data);
  } else {
    console.error('[Main] createDialogWindow not available yet');
  }
}

// 捕获选中内容或剪贴板内容的通用函数
async function captureSelectionOrClipboard() {
  // 1. 记录当前活动窗口句柄（确保我们知道要从哪个窗口复制）
  const activeHandle = systemTools.getForegroundWindow();
  console.log('[Capture] Active window handle:', activeHandle);

  // 2. 备份剪贴板内容
  const originalText = clipboard.readText();
  console.log('[Capture] Original clipboard length:', originalText?.length || 0);

  // 3. 清空剪贴板
  clipboard.clear();

  // 4. 发送 Ctrl+C 获取选中内容
  systemTools.simulateCopy(true);

  // 5. 等待剪贴板更新（增加重试次数）
  let selectedText = '';
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 60));
    selectedText = clipboard.readText();
    if (selectedText && selectedText.trim()) {
      console.log('[Capture] Got text on attempt', i + 1, ', length:', selectedText.length);
      break;
    }
  }

  // 6. 判断是否为有效的选中内容
  // 排除 IDE 行复制（单行且以换行结尾）
  const trimmed = selectedText?.trim() || '';
  const isLineCopy = selectedText &&
    (selectedText.endsWith('\n') || selectedText.endsWith('\r\n')) &&
    !trimmed.includes('\n');

  if (trimmed && !isLineCopy) {
    console.log('[Capture] Using selected text, length:', trimmed.length);
    return selectedText;
  } else {
    // 恢复原剪贴板内容
    if (originalText) {
      clipboard.writeText(originalText);
    }
    console.log('[Capture] Using clipboard text, length:', originalText?.length || 0);
    return originalText || '';
  }
}

// 核心唤醒逻辑 (被热键和鼠标中键共用) - 优化版：先捕获选中内容再显示窗口
async function activateApp(targetAction = null, fromHotkey = false) {
  console.log(`[ActivateApp] Called with action: ${targetAction}, fromHotkey: ${fromHotkey}`);
  if (isAppDisabled) {
    console.log('[ActivateApp] App is disabled, skipping');
    return;
  }

  // 如果有目标动作，允许打开新的弹出框（会自动关闭旧的）
  // 只有在没有目标动作且弹出框已可见时才聚焦
  if (!targetAction && dialogWindow && !dialogWindow.isDestroyed() && dialogWindow.isVisible()) {
    console.log('[ActivateApp] No action and dialog visible, focusing existing');
    dialogWindow.focus();
    return;
  }

  // 快捷键直接打开弹出框（不显示主窗口）
  if (targetAction && fromHotkey) {
    console.log('[ActivateApp] Direct dialog for action:', targetAction);
    openDirectDialog(targetAction);
    return;
  }

  // 如果只是唤醒且窗口已显示，则隐藏
  if (!targetAction && mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
    console.log('[ActivateApp] Window already visible and focused, hiding');
    mainWindow.hide()
    return;
  }

  console.log('[ActivateApp] Starting capture and show...');

  // ========== 第一阶段：先捕获选中内容（窗口显示前） ==========
  // 先记录活动窗口句柄（在显示我们的窗口之前）
  lastActiveWindowHandle = systemTools.getForegroundWindow();
  console.log('[ActivateApp] Original window handle:', lastActiveWindowHandle);

  // 使用统一的捕获函数获取选中内容
  const capturedText = await captureSelectionOrClipboard();
  console.log('[ActivateApp] Captured text length:', capturedText?.length || 0);

  // ========== 第二阶段：显示窗口 ==========
  if (mainWindow && mainWindow.isMinimized()) mainWindow.restore();

  if (mainWindow) {
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const workArea = currentDisplay.workArea;
    const [winW, winH] = mainWindow.getSize();

    let winX = cursorPoint.x - Math.round(winW / 2);
    let winY = cursorPoint.y;

    if (winX < workArea.x) winX = workArea.x;
    if (winX + winW > workArea.x + workArea.width) winX = workArea.x + workArea.width - winW;
    if (winY < workArea.y) winY = workArea.y;
    if (winY + winH > workArea.y + workArea.height) {
      winY = cursorPoint.y - winH - 10;
      if (winY < workArea.y) winY = workArea.y;
    }

    mainWindow.setPosition(winX, winY);
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.focus();

    // ========== 第三阶段：发送数据到渲染进程 ==========
    if (targetAction) {
      mainWindow.webContents.send('trigger-smart-action', { action: targetAction, text: capturedText });
    } else {
      mainWindow.webContents.send('clipboard-data', capturedText);
      // 异步获取前台进程名（不阻塞）
      setImmediate(() => {
        const foregroundProcess = systemTools.getForegroundProcessName();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('foreground-process', foregroundProcess);
        }
      });
    }
  }
}

function registerGlobalShortcut(shortcut) {
  globalShortcut.unregisterAll();

  if (!shortcut) {
    console.warn('Attempted to register empty shortcut, using default Alt+Space');
    shortcut = 'Alt+Space';
  }

  // 验证快捷键格式（必须包含修饰键和普通键）
  const validModifiers = ['Alt', 'Ctrl', 'Control', 'Shift', 'Command', 'Cmd', 'Super', 'Meta'];
  const parts = shortcut.split('+').map(p => p.trim());
  const hasModifier = parts.some(p => validModifiers.includes(p));
  const hasKey = parts.some(p => !validModifiers.includes(p));

  if (!hasModifier || !hasKey) {
    console.error(`Invalid shortcut format: ${shortcut}`);
    return;
  }

  try {
    // 检查是否已被注册
    if (globalShortcut.isRegistered(shortcut)) {
      console.warn(`${shortcut} 已被注册，尝试强制覆盖`);
    }

    const ret = globalShortcut.register(shortcut, () => {
      // 根据召唤模式决定显示主窗口还是轮盘
      if (summonMode === 'radial' && globalCreateRadialMenuWindow) {
        const cursorPoint = screen.getCursorScreenPoint();
        console.log('[Hotkey] Opening radial menu at:', cursorPoint.x, cursorPoint.y);
        globalCreateRadialMenuWindow(cursorPoint.x, cursorPoint.y);
      } else {
        // 弹框模式 - 直接调用，不使用延迟，实现秒级启动
        activateApp(null, true);
      }
    });

    // 重新注册智能热键
    registerSmartHotkeys();
    // 重新注册自定义工具热键
    registerCustomHotkeys();

    if (!ret) {
      console.error(`${shortcut} 注册失败! 可能被其他软件占用。`);
    } else {
      console.log(`[Hotkey] ${shortcut} 注册成功`);
    }
  } catch (e) {
    console.error(`Register shortcut [${shortcut}] error:`, e);
  }
}

let cachedSmartHotkeys = {};
let cachedCustomHotkeys = {};
let hotkeyRegistrationTimer = null;  // 防抖定时器

// 系统保留快捷键列表（不允许用户设置为功能快捷键）
// 这些快捷键会干扰 captureSelectionOrClipboard() 中的 Ctrl+C 模拟
const RESERVED_HOTKEYS = new Set([
  'Ctrl+C', 'Control+C',  // 复制（核心冲突：会导致无限循环）
  'Ctrl+V', 'Control+V',  // 粘贴
  'Ctrl+X', 'Control+X',  // 剪切
  'Ctrl+A', 'Control+A',  // 全选
  'Ctrl+Z', 'Control+Z',  // 撤销
  'Ctrl+Y', 'Control+Y',  // 重做
  'Ctrl+S', 'Control+S',  // 保存
]);

// 检查是否为保留快捷键
function isReservedHotkey(hotkey) {
  if (!hotkey) return false;
  // 标准化快捷键格式（统一大小写和顺序）
  const normalized = hotkey.split('+').map(p => p.trim()).map(p => {
    if (p.toLowerCase() === 'control') return 'Ctrl';
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join('+');
  return RESERVED_HOTKEYS.has(normalized);
}

// 防抖注册所有快捷键（避免频繁重复注册）
function debouncedRegisterHotkeys() {
  if (hotkeyRegistrationTimer) {
    clearTimeout(hotkeyRegistrationTimer);
  }
  hotkeyRegistrationTimer = setTimeout(() => {
    hotkeyRegistrationTimer = null;
    console.log('[Hotkey] Debounced registration triggered');
    registerGlobalShortcut(globalHotkey);
  }, 100);  // 100ms 防抖
}

function registerSmartHotkeys() {
  const validModifiers = ['Alt', 'Ctrl', 'Control', 'Shift', 'Command', 'Cmd', 'Super', 'Meta'];
  const failedHotkeys = [];  // 收集失败的快捷键

  for (const [action, key] of Object.entries(cachedSmartHotkeys)) {
    if (!key) continue;

    // 检查是否为系统保留快捷键
    if (isReservedHotkey(key)) {
      console.warn(`[SmartHotkey] Reserved hotkey rejected: ${key} for ${action}`);
      const actionLabel = action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      failedHotkeys.push({ hotkey: key, label: actionLabel, reason: '系统保留快捷键，不可使用' });
      continue;
    }

    // 验证快捷键格式
    const parts = key.split('+').map(p => p.trim());
    const hasModifier = parts.some(p => validModifiers.includes(p));
    const hasKey = parts.some(p => !validModifiers.includes(p));

    if (!hasModifier || !hasKey) {
      console.warn(`[SmartHotkey] Invalid format: ${key} for ${action}`);
      continue;
    }

    try {
      const ret = globalShortcut.register(key, () => {
        console.log(`[SmartHotkey] ${key} triggered for ${action}`);
        // 直接调用，秒级启动
        activateApp(action, true);
      });
      if (ret) {
        console.log(`[SmartHotkey] ${key} -> ${action} 注册成功`);
      } else {
        console.warn(`[SmartHotkey] ${key} -> ${action} 注册失败，可能被占用`);
        const actionLabel = action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        failedHotkeys.push({ hotkey: key, label: actionLabel, reason: '快捷键已被占用' });
      }
    } catch (e) {
      console.error(`[SmartHotkey] Failed to register ${key} for ${action}:`, e);
      const actionLabel = action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      failedHotkeys.push({ hotkey: key, label: actionLabel, reason: e.message || '注册失败' });
    }
  }

  // 如果有失败的快捷键，通知渲染进程
  if (failedHotkeys.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hotkey-register-failed', failedHotkeys);
  }
}

// 注册自定义工具快捷键
function registerCustomHotkeys() {
  const validModifiers = ['Alt', 'Ctrl', 'Control', 'Shift', 'Command', 'Cmd', 'Super', 'Meta'];
  const failedHotkeys = [];  // 收集失败的快捷键

  for (const [id, data] of Object.entries(cachedCustomHotkeys)) {
    if (!data.hotkey) continue;

    // 检查是否为系统保留快捷键
    if (isReservedHotkey(data.hotkey)) {
      console.warn(`[CustomHotkey] Reserved hotkey rejected: ${data.hotkey}`);
      failedHotkeys.push({ hotkey: data.hotkey, label: data.tool?.label || '未知工具', reason: '系统保留快捷键，不可使用' });
      continue;
    }

    // 验证快捷键格式
    const parts = data.hotkey.split('+').map(p => p.trim());
    const hasModifier = parts.some(p => validModifiers.includes(p));
    const hasKey = parts.some(p => !validModifiers.includes(p));

    if (!hasModifier || !hasKey) {
      console.warn(`[CustomHotkey] Invalid format: ${data.hotkey}`);
      failedHotkeys.push({ hotkey: data.hotkey, label: data.tool?.label || '未知工具', reason: '格式无效（需要修饰键+按键）' });
      continue;
    }

    try {
      const ret = globalShortcut.register(data.hotkey, () => {
        const tool = data.tool;
        if (tool.type === 'file' && tool.path) {
          // 直接运行工具
          if (tool.path.startsWith('http')) {
            shell.openExternal(tool.path);
          } else if (tool.isAdmin && process.platform === 'win32') {
            const { exec } = require('child_process');
            // 转义路径中的单引号
            const escapedPath = tool.path.replace(/'/g, "''");
            const cmd = `powershell -Command "Start-Process '${escapedPath}' -Verb RunAs"`;
            exec(cmd, (err) => {
              if (err) console.error('Admin Run Error:', err);
            });
          } else {
            shell.openPath(tool.path);
          }
        } else if (tool.type === 'builtin' && tool.action) {
          // 直接触发内置功能，秒级启动
          activateApp(tool.action, true);
        }
      });
      if (ret) {
        console.log(`[CustomHotkey] ${data.hotkey} -> ${data.tool.label} 注册成功`);
      } else {
        // 注册返回 false 表示失败（可能被其他程序占用）
        failedHotkeys.push({ hotkey: data.hotkey, label: data.tool?.label || '未知工具', reason: '快捷键已被占用' });
      }
    } catch (e) {
      console.error(`[CustomHotkey] Failed to register ${data.hotkey}:`, e);
      failedHotkeys.push({ hotkey: data.hotkey, label: data.tool?.label || '未知工具', reason: e.message || '注册失败' });
    }
  }

  // 如果有失败的快捷键，通知渲染进程
  if (failedHotkeys.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hotkey-register-failed', failedHotkeys);
  }
}

// 创建主窗口函数
async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 320,
    height: 620,
    frame: false,
    transparent: false,
    backgroundColor: '#1e1e1e',
    resizable: false,
    skipTaskbar: false,
    show: false, // 默认隐藏(托盘启动)
    icon: normalIconImage, // 显式设置窗口图标
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // 允许文件拖拽 - 阻止默认的导航行为
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // 阻止拖拽文件时导航到 file:// URL
    if (url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // 忽略证书错误
  app.commandLine.appendSwitch('ignore-certificate-errors');
  mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });

  console.log('[Main] Window created');

  // 转发主窗口控制台消息到终端（调试用）
  mainWindow.webContents.on('console-message', (event, level, message) => {
    // 只转发特定前缀的日志
    if (message.includes('[RadialMenu]') || message.includes('[App]')) {
      console.log('[MainWindow Console]', message);
    }
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log('[Main] Loading Dev URL:', devServerUrl);
    await mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' }) 
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  // 窗口准备好时
  mainWindow.on('ready-to-show', () => {
    const startMinimized = configManager.get('startMinimized');
    const loginSettings = app.getLoginItemSettings();

    if (startMinimized === false) {
       mainWindow.show();
    }

    // 如果是开机自启动，显示启动成功通知
    if (loginSettings.openAtLogin && startMinimized !== false) {
      const notification = new Notification({
        title: 'QuickerUse',
        body: '启动成功，按 Alt+Space 唤醒',
        silent: true
      });
      notification.show();

      // 2秒后自动关闭通知
      setTimeout(() => {
        notification.close();
      }, 2000);
    }
  })

  // === IPC 处理逻辑 ===

  // 0. 热键管理
  ipcMain.on('update-global-hotkey', (event, newHotkey) => {
    if (newHotkey && typeof newHotkey === 'string') {
      globalHotkey = newHotkey;
      // 使用防抖注册，避免频繁重复注册
      debouncedRegisterHotkeys();
    } else {
      console.warn('Received invalid global hotkey:', newHotkey);
    }
  });
  
  ipcMain.on('update-smart-hotkeys', (event, hotkeys) => {
    cachedSmartHotkeys = hotkeys;
    // 保存到配置文件，下次启动时可恢复
    configManager.set('smartHotkeys', hotkeys);
    // 使用防抖注册，避免频繁重复注册
    debouncedRegisterHotkeys();
  });

  ipcMain.on('update-custom-hotkeys', (event, hotkeys) => {
    cachedCustomHotkeys = hotkeys;
    // 保存到配置文件
    configManager.set('customHotkeys', hotkeys);
    // 使用防抖注册，避免频繁重复注册
    debouncedRegisterHotkeys();
  });

  // === 全局轮盘菜单 ===

  // 默认轮盘菜单设置 - 使用 slots 二维数组格式
  // 图标通过渲染进程的 FEATURE_ICONS 和 SYSTEM_ICONS 映射获取
  const defaultRadialMenuSettings = {
    radius: 120,    // 轮盘半径 (80-200px)
    layers: 2,      // 显示层数 (1-3)
    showHints: true,
    customActions: [], // 自定义功能列表
    // slots[sector][layer] 格式: 8个扇区 x 3层
    slots: [
      // 扇区0: JSON相关
      [{ label: 'JSON', action: 'json-format' }, { label: '提取', action: 'extract-info' }, null],
      // 扇区1: 时间相关
      [{ label: '时间戳', action: 'timestamp-convert' }, { label: '计算器', action: 'calculator' }, null],
      // 扇区2: AI相关
      [{ label: 'AI', action: 'ai-assistant' }, { label: '剪贴板', action: 'clipboard-history' }, null],
      // 扇区3: 颜色相关
      [{ label: '颜色', action: 'color-convert' }, { label: '取色', action: 'pick-color' }, null],
      // 扇区4: 二维码
      [{ label: '二维码', action: 'generate-qr' }, { label: 'OCR', action: 'ocr' }, null],
      // 扇区5: 生成器
      [{ label: 'UUID', action: 'generate-uuid' }, { label: '密码', action: 'generate-password' }, null],
      // 扇区6: 搜索翻译
      [{ label: '搜索', action: 'search-google' }, { label: '翻译', action: 'translate' }, null],
      // 扇区7: 其他
      [{ label: '倒计时', action: 'timer' }, { label: '闪念', action: 'memo' }, null]
    ],
    // 数字键快捷功能配置 (1-8) - 默认8个系统功能
    quickSlots: [
      { elIcon: 'Lock', label: '锁屏', action: 'lock-screen' },
      { elIcon: 'Monitor', label: '我的电脑', action: 'open-explorer' },
      { elIcon: 'Fold', label: '显示桌面', action: 'minimize-all' },
      { elIcon: 'FolderOpened', label: 'Hosts', action: 'switch-hosts' },
      { elIcon: 'SetUp', label: '注册表', action: 'open-regedit' },
      { elIcon: 'Setting', label: '环境变量', action: 'open-env-vars' },
      { elIcon: 'Delete', label: '程序卸载', action: 'open-uninstall' },
      { elIcon: 'Connection', label: '网络设置', action: 'open-network-settings' }
    ],
    menuItems: []
  };

  let radialMenuSettings = configManager.get('radialMenuSettings') || defaultRadialMenuSettings;
  // 确保关键属性存在（兼容旧配置）
  if (!radialMenuSettings.slots) {
    radialMenuSettings.slots = defaultRadialMenuSettings.slots;
  }
  if (!radialMenuSettings.radius) {
    radialMenuSettings.radius = defaultRadialMenuSettings.radius;
  }
  if (!radialMenuSettings.layers) {
    radialMenuSettings.layers = defaultRadialMenuSettings.layers;
  }
  // 确保 quickSlots 存在并合并默认值
  if (!radialMenuSettings.quickSlots || !Array.isArray(radialMenuSettings.quickSlots)) {
    radialMenuSettings.quickSlots = defaultRadialMenuSettings.quickSlots;
  } else {
    // 合并用户配置和默认值，确保有8个有效槽位
    const mergedQuickSlots = [];
    for (let i = 0; i < 8; i++) {
      const slot = radialMenuSettings.quickSlots[i];
      if (slot && slot.action) {
        mergedQuickSlots.push(slot);
      } else {
        mergedQuickSlots.push(defaultRadialMenuSettings.quickSlots[i]);
      }
    }
    radialMenuSettings.quickSlots = mergedQuickSlots;
  }
  console.log('[Main] Radial menu settings loaded:', {
    radius: radialMenuSettings.radius,
    layers: radialMenuSettings.layers,
    slotsCount: radialMenuSettings.slots?.length || 0,
    menuItemsCount: radialMenuSettings.menuItems?.length || 0,
    quickSlotsCount: radialMenuSettings.quickSlots?.length || 0
  });

  // 预捕获的选中内容（在显示轮盘前捕获）
  let radialMenuPreCapturedText = '';

  // 缓存的轮盘初始化设置（避免每次都读取配置）
  let cachedRadialInitSettings = null;

  // 更新缓存的初始化设置
  function updateCachedRadialSettings() {
    cachedRadialInitSettings = {
      ...radialMenuSettings,
      theme: configManager.get("theme") || "dark",
      radialStyle: configManager.get("radialStyle") || "default"
    };
  }
  // 初始化缓存
  updateCachedRadialSettings();

  // 预加载轮盘菜单窗口 - 提升弹出速度
  function preloadRadialMenuWindow() {
    if (preloadedRadialWindow && !preloadedRadialWindow.isDestroyed()) {
      return; // 已有预加载窗口
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    preloadedRadialWindow = new BrowserWindow({
      width: width,
      height: height,
      x: 0,
      y: 0,
      show: false,  // 预加载时不显示
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,  // 禁止后台节流
        enablePreferredSizeMode: false  // 禁用首选大小模式
      }
    });

    // 加载轮盘菜单页面
    if (isDev) {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
      preloadedRadialWindow.loadURL(`${devServerUrl}?radialMenuMode=true`);
    } else {
      preloadedRadialWindow.loadFile(join(__dirname, '../../dist/index.html'), {
        query: { radialMenuMode: 'true' }
      });
    }

    preloadedRadialWindow.webContents.on('context-menu', (e) => e.preventDefault());

    preloadedRadialWindow.webContents.once("dom-ready", () => {
      radialWindowReady = true;
      // 预发送设置数据，这样显示时只需要发送坐标
      if (preloadedRadialWindow && !preloadedRadialWindow.isDestroyed()) {
        updateCachedRadialSettings();
        preloadedRadialWindow.webContents.send("radial-menu-preload-settings", cachedRadialInitSettings);
      }
      console.log('[Main] Radial menu window preloaded and settings sent');
    });

    preloadedRadialWindow.on("closed", () => {
      preloadedRadialWindow = null;
      radialWindowReady = false;
      // 关闭后立即预加载下一个（最快响应）
      setImmediate(() => preloadRadialMenuWindow());
    });
  }

  // 创建全局轮盘菜单窗口 - 极速版：优先使用预加载窗口
  function createRadialMenuWindow(x, y) {
    // 如果有已显示的轮盘窗口，先销毁
    if (radialMenuWindow && !radialMenuWindow.isDestroyed()) {
      radialMenuWindow.destroy();
      radialMenuWindow = null;
    }

    // 异步捕获选中内容（不阻塞显示）
    captureSelectionOrClipboard().then(text => {
      radialMenuPreCapturedText = text;
    });

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // 边界检测 - 确保轮盘不超出屏幕
    const radius = radialMenuSettings.radius || 120;
    const padding = radius + 30;
    let adjustedX = Math.max(padding, Math.min(x, width - padding));
    let adjustedY = Math.max(padding, Math.min(y, height - padding));

    // 优先使用预加载窗口（毫秒级弹出）
    if (preloadedRadialWindow && !preloadedRadialWindow.isDestroyed() && radialWindowReady) {
      radialMenuWindow = preloadedRadialWindow;
      preloadedRadialWindow = null;
      radialWindowReady = false;

      // 只发送坐标，设置已经预发送了
      radialMenuWindow.webContents.send("radial-menu-show", {
        centerX: adjustedX,
        centerY: adjustedY
      });
      radialMenuWindow.show();
      radialMenuWindow.focus();

      // 设置 blur 事件
      radialMenuWindow.once("blur", () => {
        if (radialMenuWindow && !radialMenuWindow.isDestroyed()) {
          radialMenuWindow.destroy();
        }
      });
      radialMenuWindow.once("closed", () => {
        radialMenuWindow = null;
      });
      return;
    }

    // 后备方案：创建新窗口（首次使用或预加载未就绪）
    radialMenuWindow = new BrowserWindow({
      width: width,
      height: height,
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });

    // 加载轮盘菜单页面
    if (isDev) {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
      radialMenuWindow.loadURL(`${devServerUrl}?radialMenuMode=true`);
    } else {
      radialMenuWindow.loadFile(join(__dirname, '../../dist/index.html'), {
        query: { radialMenuMode: 'true' }
      });
    }

    radialMenuWindow.webContents.on('context-menu', (e) => e.preventDefault());

    radialMenuWindow.webContents.once("dom-ready", () => {
      if (radialMenuWindow && !radialMenuWindow.isDestroyed()) {
        updateCachedRadialSettings();
        radialMenuWindow.webContents.send("radial-menu-init", {
          centerX: adjustedX,
          centerY: adjustedY,
          settings: cachedRadialInitSettings
        });
        radialMenuWindow.show();
        radialMenuWindow.focus();
      }
    });

    radialMenuWindow.once("blur", () => {
      if (radialMenuWindow && !radialMenuWindow.isDestroyed()) {
        radialMenuWindow.destroy();
      }
    });

    radialMenuWindow.once("closed", () => {
      radialMenuWindow = null;
      // 关闭后立即预加载
      setImmediate(() => preloadRadialMenuWindow());
    });
  }

  // 将 createRadialMenuWindow 存储到全局变量，供 MouseHook 调用
  globalCreateRadialMenuWindow = createRadialMenuWindow;
  globalPreloadRadialWindow = preloadRadialMenuWindow;

  // 打开轮盘菜单
  ipcMain.on('open-radial-menu', (event, { x, y }) => {
    console.log('[Main] Received open-radial-menu IPC at:', x, y);
    const cursorPoint = screen.getCursorScreenPoint();
    console.log('[Main] Cursor position:', cursorPoint);
    createRadialMenuWindow(x || cursorPoint.x, y || cursorPoint.y);
  });

  // 关闭轮盘菜单
  ipcMain.on('close-radial-menu', () => {
    if (radialMenuWindow && !radialMenuWindow.isDestroyed()) {
      radialMenuWindow.destroy();
      radialMenuWindow = null;
    }
  });

  // 轮盘菜单选择动作 - 添加防重复执行机制
  let lastRadialAction = { action: null, time: 0 };

  ipcMain.on('radial-menu-action', async (event, { action, data }) => {
    console.log('[Main] ====== RADIAL MENU ACTION RECEIVED ======');
    console.log('[Main] Action:', action);

    // 防重复执行：500ms 内相同动作只执行一次
    const now = Date.now();
    if (action === lastRadialAction.action && now - lastRadialAction.time < 500) {
      console.log('[Main] Duplicate action ignored:', action);
      return;
    }
    lastRadialAction = { action, time: now };

    console.log('[Main] Data:', JSON.stringify(data));

    // 关闭轮盘菜单（使用 destroy 确保立即关闭）
    if (radialMenuWindow && !radialMenuWindow.isDestroyed()) {
      radialMenuWindow.destroy();
      radialMenuWindow = null;
    }

    // 执行动作
    if (action) {
      // 检查是否为用户自定义文件工具 (格式: file:path)
      if (action.startsWith('file:')) {
        const filePath = action.substring(5); // 去掉 'file:' 前缀
        console.log('[Main] Opening user file:', filePath);
        shell.openPath(filePath).catch(err => {
          console.error('[Main] Failed to open file:', err);
        });
        return;
      }

      // 检查是否为内置工具 (格式: builtin:action)
      if (action.startsWith('builtin:')) {
        const builtinAction = action.substring(8); // 去掉 'builtin:' 前缀
        console.log('[Main] Executing builtin action:', builtinAction);
        // 递归调用自身处理内置动作
        ipcMain.emit('radial-menu-action', event, { action: builtinAction, data });
        return;
      }

      // 检查是否为特殊动作
      const specialType = SPECIAL_ACTIONS[action];
      if (specialType) {
        console.log('[Main] Special action detected:', action, '->', specialType);

        if (specialType === 'color-picker') {
          // 取色器 - 通过 IPC 触发
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('trigger-color-picker');
            }
            // 直接调用取色逻辑
            const cursorPoint = screen.getCursorScreenPoint();
            // 发送 pick-color 事件到自己处理
            ipcMain.emit('pick-color', event);
          }, 100);
        } else if (specialType === 'system-action') {
          // 系统动作 - 根据具体 action 执行不同操作
          // 添加延迟确保轮盘窗口完全关闭后再执行
          console.log('[Main] Executing system action:', action);
          setTimeout(() => {
            const { exec: execCmd } = require('child_process');
            switch (action) {
              case 'lock-screen':
                console.log('[Main] Calling systemTools.lockScreen()');
                systemTools.lockScreen();
                break;
              case 'open-explorer':
                console.log('[Main] Opening explorer');
                shell.openPath('C:\\');
                break;
              case 'minimize-all':
                console.log('[Main] Calling minimize-all via shell');
                // 使用更可靠的方式显示桌面
                execCmd('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).ToggleDesktop()"');
                break;
              case 'switch-hosts':
                console.log('[Main] Opening hosts folder');
                shell.openPath('C:\\Windows\\System32\\drivers\\etc');
                break;
              case 'open-regedit':
                console.log('[Main] Opening regedit');
                execCmd('regedit');
                break;
              case 'open-env-vars':
                console.log('[Main] Opening environment variables');
                execCmd('rundll32.exe sysdm.cpl,EditEnvironmentVariables');
                break;
              case 'open-uninstall':
                console.log('[Main] Opening programs and features');
                execCmd('control appwiz.cpl');
                break;
              case 'open-network-settings':
                console.log('[Main] Opening network settings');
                execCmd('ncpa.cpl');
                break;
              default:
                console.warn('[Main] Unknown system action:', action);
            }
          }, 150); // 延迟确保轮盘窗口完全关闭
        } else if (specialType === 'web-search') {
          // 网页搜索
          const text = radialMenuPreCapturedText || '';
          if (text.trim()) {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(text.trim())}`;
            shell.openExternal(searchUrl);
          } else {
            shell.openExternal('https://www.google.com');
          }
        } else if (specialType === 'web-translate') {
          // 网页翻译
          const text = radialMenuPreCapturedText || '';
          if (text.trim()) {
            const translateUrl = `https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(text.trim())}`;
            shell.openExternal(translateUrl);
          } else {
            shell.openExternal('https://translate.google.com');
          }
        }
        return;
      }

      // 检查是否为自定义功能 (格式: custom:type:path)
      if (action.startsWith('custom:')) {
        const parts = action.split(':');
        const customType = parts[1];
        const customPath = parts.slice(2).join(':'); // 路径可能包含冒号
        console.log('[Main] Custom action:', customType, customPath);

        if (customType === 'path') {
          // 打开路径或URL
          shell.openExternal(customPath).catch(err => {
            console.error('[Main] Failed to open path:', err);
          });
        } else if (customType === 'script') {
          // 运行脚本
          if (scriptManager && scriptManager.runScript) {
            scriptManager.runScript(customPath);
          }
        }
        return;
      }

      // 使用预捕获的内容，通过主窗口打开弹出框（保持弹窗逻辑一致）
      const config = ACTION_TO_DIALOG[action];
      if (config) {
        // 确保主窗口存在
        if (mainWindow && !mainWindow.isDestroyed()) {
          // 发送到主窗口，让主窗口的 handleAction 处理，保持弹窗一致
          mainWindow.webContents.send('trigger-smart-action', {
            action: action,
            text: radialMenuPreCapturedText
          });
          console.log('[Main] Sent action to mainWindow for consistent dialog, action:', action);
        } else {
          console.warn('[Main] Main window not available for action:', action);
        }
      } else {
        console.warn('[Main] Unknown action:', action);
      }
    }
  });

  // 更新轮盘菜单设置
  ipcMain.on('update-radial-menu-settings', (event, settings) => {
    // 如果传入 null 或无效值，使用默认设置
    if (!settings) {
      radialMenuSettings = { ...defaultRadialMenuSettings };
      configManager.set('radialMenuSettings', null); // 清除保存的配置
    } else {
      radialMenuSettings = settings;
      configManager.set('radialMenuSettings', settings);
    }
    console.log('[Main] Radial menu settings updated');
  });

  // 注册轮盘菜单快捷键
  const registerRadialMenuHotkey = () => {
    if (!radialMenuSettings || !radialMenuSettings.enabled) return;

    if (radialMenuSettings.triggerMode === 'hotkey' && radialMenuSettings.hotkey) {
      try {
        const ret = globalShortcut.register(radialMenuSettings.hotkey, () => {
          const cursorPoint = screen.getCursorScreenPoint();
          createRadialMenuWindow(cursorPoint.x, cursorPoint.y);
        });
        if (ret) {
          console.log('[Main] Radial menu hotkey registered:', radialMenuSettings.hotkey);
        }
      } catch (e) {
        console.error('[Main] Failed to register radial menu hotkey:', e);
      }
    }
  };

  // 1. 通用打开
  ipcMain.on('run-path', async (event, payload) => {
    const targetPath = typeof payload === 'string' ? payload : payload.path;
    const isAdmin = typeof payload === 'object' ? payload.isAdmin : false;

    try {
      if (targetPath.startsWith('http')) {
        await shell.openExternal(targetPath);
      } else if (isAdmin && process.platform === 'win32') {
         // Windows Run as Admin - 转义路径中的单引号
         const { exec } = require('child_process');
         const escapedPath = targetPath.replace(/'/g, "''");
         const cmd = `powershell -Command "Start-Process '${escapedPath}' -Verb RunAs"`;
         exec(cmd, (err) => {
            if (err) console.error('Admin Run Error:', err);
         });
      } else {
        const err = await shell.openPath(targetPath);
        if (err) console.error('打开路径失败:', err);
      }
    } catch (e) {
      console.error('Run path error:', e);
    }
  });

  // 1.1 获取文件图标
  ipcMain.on('get-file-icon', async (event, filePath) => {
    console.log('[Main] Getting icon for:', filePath);
    try {
      let targetPath = filePath;

      // 如果是 .lnk 快捷方式，使用 PowerShell 获取目标路径
      if (filePath.toLowerCase().endsWith('.lnk')) {
        try {
          const { execSync } = require('child_process');
          const psCommand = `(New-Object -ComObject WScript.Shell).CreateShortcut('${filePath.replace(/'/g, "''")}').TargetPath`;
          const result = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });
          const target = result.trim();
          if (target && fs.existsSync(target)) {
            targetPath = target;
            console.log('[Main] Shortcut target:', targetPath);
          }
        } catch (e) {
          console.log('[Main] PowerShell failed:', e.message);
        }
      }

      // 获取图标 - 优先 large，然后 normal
      let icon = await app.getFileIcon(targetPath, { size: 'large' });
      let iconDataUrl = icon.toDataURL();

      // 如果 large 失败尝试 normal
      if (!iconDataUrl || iconDataUrl.length < 100) {
        icon = await app.getFileIcon(targetPath, { size: 'normal' });
        iconDataUrl = icon.toDataURL();
      }

      // 直接返回获取到的图标，不检查大小
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('file-icon-data', {
          path: filePath,
          icon: iconDataUrl && iconDataUrl.length > 100 ? iconDataUrl : null
        });
      }
    } catch (e) {
      console.error('[Main] Failed to get icon:', e);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('file-icon-data', { path: filePath, icon: null });
      }
    }
  });

  // 2. 窗口控制 - 操作之前记录的活动窗口
  ipcMain.on('window-control', (event, { action }) => {
    // 先隐藏主窗口，然后对之前的活动窗口执行操作
    if (mainWindow) mainWindow.hide();

    // 延迟执行，确保主窗口已隐藏
    setTimeout(() => {
      if (lastActiveWindowHandle) {
        systemTools.windowActionByHandle(lastActiveWindowHandle, action);
      } else {
        // 如果没有记录的句柄，操作当前活动窗口
        systemTools.windowAction(action);
      }
    }, 50);  // 减少延迟
  });

  // 3. 系统操作
  ipcMain.on('system-action', (event, args) => {
    const action = typeof args === 'string' ? args : args.action;
    if (action === 'lock-screen') systemTools.lockScreen();
    if (action === 'empty-trash') systemTools.emptyTrash();
    if (action === 'minimize-all') systemTools.windowAction('minimize-all');
    if (action === 'kill-process') systemTools.killProcess('notepad');
    if (action === 'switch-hosts') systemTools.switchHosts('127.0.0.1 quicker.local');
    if (action === 'auto-clicker') {
      const interval = args.interval || 100;
      const count = args.count || 10;
      systemTools.autoClicker(interval, count);
    }
  });

  // 4. 其他服务
  ipcMain.on('script-action', (event, args) => {
    if (args.action === 'get-list') event.reply('script-list', scriptManager.getScripts());
    if (args.action === 'run') scriptManager.runScript(args.payload);
    if (args.action === 'open-folder') scriptManager.openFolder();
  });

  ipcMain.on('secret-action', async (event, args) => {
    if (args.action === 'list') {
      event.reply('secret-list', secretManager.getAllKeys());
    }
    else if (args.action === 'check-auth') {
      event.reply('secret-auth-status', {
        authenticated: secretManager.isAuthenticated(),
        hasPin: secretManager.hasPin()
      });
    }
    else if (args.action === 'verify') {
      const result = await secretManager.verifyPassword(args.password);
      event.reply('secret-verify-result', { success: result, isNewPin: !secretManager.hasPin() });
    }
    else if (args.action === 'clear-auth') {
      secretManager.clearAuth();
      event.reply('secret-auth-status', { authenticated: false, hasPin: secretManager.hasPin() });
    }
    else if (args.action === 'get') {
      const value = secretManager.getItem(args.key);
      event.reply('secret-value', { key: args.key, value, needAuth: value === null && !secretManager.isAuthenticated() });
    }
    else if (args.action === 'set') {
      secretManager.setItem(args.key, args.value);
      event.reply('secret-op-result', { success: true });
    }
    else if (args.action === 'delete') {
      secretManager.removeItem(args.key);
      event.reply('secret-op-result', { success: true });
    }
    // 导出密钥（使用 PIN 加密）
    else if (args.action === 'export') {
      const result = secretManager.exportSecrets(args.pin);
      event.reply('secret-export-result', result);
    }
    // 导入密钥（使用 PIN 解密）
    else if (args.action === 'import') {
      const success = secretManager.importSecrets(args.secrets, args.pin);
      event.reply('secret-import-result', { success });
    }
    // 检查是否有密钥
    else if (args.action === 'has-secrets') {
      event.reply('secret-has-secrets', { hasSecrets: secretManager.getAllKeys().length > 0 });
    }
    // 清除所有密钥（用于重置功能）
    else if (args.action === 'clear-all') {
      const success = secretManager.clearAll();
      event.reply('secret-op-result', { success });
      console.log('[Main] All secrets cleared:', success);
    }
  });

  ipcMain.on('file-server-action', (event, args) => {
    if (args.action === 'start') event.reply('file-server-url', fileServer.startShare(args.payload));
  });

  ipcMain.on('config-action', (event, args) => {
    if (args.action === 'get') event.reply('config-data', { key: args.key, value: configManager.get(args.key) });
    if (args.action === 'getAll') event.reply('config-data', configManager.getAll());
    if (args.action === 'set') {
      configManager.set(args.key, args.value);
      event.reply('config-data', configManager.getAll());
    }
  });

  // 配置导出/导入功能
  ipcMain.on('export-config', async (event) => {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出配置文件',
      defaultPath: `quickeruse-config-${Date.now()}.json`,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePath) {
      // 收集所有配置数据（包括 localStorage 中的数据）
      const exportResult = configManager.exportFullConfig(result.filePath);
      event.reply('export-config-result', exportResult);
    } else {
      event.reply('export-config-result', { success: false, canceled: true });
    }
  });

  ipcMain.on('import-config', async (event) => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入配置文件',
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const importResult = configManager.importConfig(result.filePaths[0]);
      // 导入成功后，检查是否有 localStorage 备份需要恢复
      if (importResult.success) {
        const localStorageBackup = configManager.get('localStorageBackup');
        if (localStorageBackup) {
          importResult.localStorageBackup = localStorageBackup;
        }
      }
      event.reply('import-config-result', importResult);
    } else {
      event.reply('import-config-result', { success: false, canceled: true });
    }
  });

  // 获取配置文件路径
  ipcMain.on('get-config-path', (event) => {
    event.reply('config-path', configManager.getConfigPath());
  });

  // 检查首次启动的默认配置恢复
  ipcMain.on('check-first-launch-config', (event) => {
    const localStorageBackup = configManager.get('localStorageBackup');
    const isFirstLaunch = configManager.get('_firstLaunchHandled') !== true;
    if (isFirstLaunch && localStorageBackup) {
      // 标记已处理过首次启动
      configManager.set('_firstLaunchHandled', true);
      event.reply('first-launch-config', { localStorageBackup });
    } else {
      event.reply('first-launch-config', null);
    }
  });

  ipcMain.on('open-image-window', (event, base64Data) => {
    // 创建图片置顶窗口
    let imgWin = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      resizable: true,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // HTML 内容：支持拖动、调整大小、关闭
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: transparent;
      overflow: hidden;
      -webkit-app-region: drag;
    }
    .container {
      width: 100%; height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      padding: 8px;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      pointer-events: none;
    }
    .close-btn {
      position: absolute;
      top: 0;
      right: 0;
      width: 28px;
      height: 28px;
      background: rgba(220,53,69,0.9);
      border: none;
      border-radius: 0 0 0 8px;
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      -webkit-app-region: no-drag;
    }
    .close-btn:hover { background: #c82333; }
    /* 调整大小的角 */
    .resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
      -webkit-app-region: no-drag;
      z-index: 10;
    }
    .resize-handle::after {
      content: '';
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 10px;
      height: 10px;
      border-right: 2px solid rgba(255,255,255,0.6);
      border-bottom: 2px solid rgba(255,255,255,0.6);
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${base64Data}" />
    <button class="close-btn" id="closeBtn">×</button>
    <div class="resize-handle"></div>
  </div>
  <script>
    const { ipcRenderer } = require('electron');

    // 关闭按钮
    document.getElementById('closeBtn').onclick = () => {
      window.close();
    };

    // 键盘事件 - Esc 或 Q 关闭
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
        window.close();
      }
    });

    // 确保窗口获得焦点
    window.focus();
  </script>
</body>
</html>`;

    imgWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

    // 确保窗口获得焦点以接收键盘事件
    imgWin.once('ready-to-show', () => {
      imgWin.focus();
    });

    imgWin.on('closed', () => {
      imgWin = null;
    });
  });

  // 闹钟提醒窗口
  let alarmWindow = null;

  ipcMain.on('show-alarm', (event, data) => {
    // 关闭之前的提醒窗口（使用 destroy 确保立即销毁）
    if (alarmWindow && !alarmWindow.isDestroyed()) {
      alarmWindow.destroy();
      alarmWindow = null;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowWidth = 360;
    const windowHeight = 160;

    // 创建底部居中的窗口
    alarmWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: screenHeight - windowHeight - 20,
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const { title = '倒计时结束', message = '时间到！', minutes = 0 } = data || {};

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @keyframes ring {
      0%, 100% { transform: rotate(-15deg); }
      50% { transform: rotate(15deg); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bellShake {
      0%, 100% { transform: rotate(0); }
      10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
      20%, 40%, 60%, 80% { transform: rotate(10deg); }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: transparent;
      font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    .container {
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      animation: fadeIn 0.4s ease-out, pulse 2s ease-in-out infinite;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
      position: relative;
      overflow: hidden;
    }
    .container::before {
      content: '';
      position: absolute;
      top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 3s ease-in-out infinite;
    }
    .alarm-icon {
      width: 80px; height: 80px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }
    .clock-svg {
      width: 50px; height: 50px;
      animation: bellShake 0.5s ease-in-out infinite;
    }
    .content {
      flex: 1;
      color: white;
      position: relative;
      z-index: 1;
    }
    .title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 6px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .message {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    .time-info {
      font-size: 12px;
      opacity: 0.7;
    }
    .close-btn {
      position: absolute;
      top: 10px; right: 10px;
      width: 24px; height: 24px;
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 10;
    }
    .close-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.1);
    }
    .dismiss-btn {
      background: rgba(255,255,255,0.25);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .dismiss-btn:hover {
      background: rgba(255,255,255,0.35);
    }
  </style>
</head>
<body>
  <div class="container">
    <button class="close-btn" onclick="window.close()">×</button>
    <div class="alarm-icon">
      <svg class="clock-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="13" r="8" stroke="white" stroke-width="2"/>
        <path d="M12 9V13L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 3L8 6" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M19 3L16 6" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="13" r="1" fill="white"/>
      </svg>
    </div>
    <div class="content">
      <div class="title">${title}</div>
      <div class="message">${message}</div>
      <button class="dismiss-btn" onclick="window.close()">知道了</button>
    </div>
  </div>
  <script>
    // 播放提示音
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQwTVLHh25htGgxBruLbkUoxD1y94tFSLxVQweLFQzsnY8nixDkxKXTO4rMsMTZ00OOrHTlFdNHkoh0wR4bU5pYcJ0KS1OaRHR40mN7kiR8gMZ/h5IQYH0Cu4N1qFy1ItuLWXBYjRsXizU0WJj3T4sU/Dzco4ebBOw0xLOXluzgOKTDq5bU4Ci0p7+WzNQgoLPLosS8EJzL16bEuAyYs+OqwLgMlK/vrrS0CIy3/7KwrACMr/+yrLAMjLP/sqyoAJC3/7KkpAiQv/+ynKAAkMv/tpSYAJTT/7qQlACY1/+6jJQAmN//uoSQAJzr/7p8jACc8/+6dIgAnPv/umyEAJ0D/7pkgACdC/+6YHwAoRP/ulR4AKEb/7pMdAChI/+2RHAAoSv/tjxsAKUz/7Y4aAClO/+2MGQApUP/tihgAKVL/7YkXAClU/+2HFgAqVv/thRUAKlj/7YMUACpa/+2BEwAqXP/sgBIAK17/7H4RACth/+x9EAArY//sexAAK2X/7HkPACtn/+x3DgAsaf/sdhAAAAA=');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch(e) {}

    // 10秒后自动关闭
    setTimeout(() => window.close(), 10000);

    // ESC关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.close();
    });

    window.focus();
  </script>
</body>
</html>`;

    alarmWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

    alarmWindow.once('ready-to-show', () => {
      alarmWindow.focus();
    });

    alarmWindow.on('closed', () => {
      alarmWindow = null;
    });
  });

  // ========== 主进程倒计时管理 ==========
  // 存储活跃的定时器（key: id, value: { timeout, data }）
  const activeTimerHandles = new Map();

  // 启动倒计时（从渲染进程调用）
  ipcMain.on('start-timer', (event, data) => {
    const { id, minutes, endTime } = data;
    console.log(`[Timer] Starting timer ${id} for ${minutes} minutes, endTime: ${endTime}`);

    // 计算剩余时间
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      console.log(`[Timer] Timer ${id} already expired, showing alarm immediately`);
      // 立即触发
      showAlarmForTimer(id, minutes);
      return;
    }

    // 清除可能存在的旧定时器
    if (activeTimerHandles.has(id)) {
      clearTimeout(activeTimerHandles.get(id).timeout);
    }

    // 设置新的定时器
    const timeout = setTimeout(() => {
      console.log(`[Timer] Timer ${id} finished!`);
      showAlarmForTimer(id, minutes);
      activeTimerHandles.delete(id);
      // 通知渲染进程移除定时器
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('timer-finished', { id });
      }
    }, remaining);

    activeTimerHandles.set(id, { timeout, minutes, endTime });
    console.log(`[Timer] Timer ${id} scheduled for ${remaining}ms`);
  });

  // 取消倒计时
  ipcMain.on('cancel-timer', (event, data) => {
    const { id } = data;
    console.log(`[Timer] Canceling timer ${id}`);
    if (activeTimerHandles.has(id)) {
      clearTimeout(activeTimerHandles.get(id).timeout);
      activeTimerHandles.delete(id);
    }
  });

  // 获取活跃定时器列表
  ipcMain.on('get-active-timers', (event) => {
    const timers = [];
    activeTimerHandles.forEach((value, id) => {
      timers.push({ id, minutes: value.minutes, endTime: value.endTime });
    });
    event.reply('active-timers-list', timers);
  });

  // 显示闹钟提醒的辅助函数
  function showAlarmForTimer(id, minutes) {
    // 关闭之前的提醒窗口
    if (alarmWindow && !alarmWindow.isDestroyed()) {
      alarmWindow.destroy();
      alarmWindow = null;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowWidth = 360;
    const windowHeight = 160;

    alarmWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: screenHeight - windowHeight - 20,
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const title = '⏰ 倒计时结束';
    const message = `${minutes} 分钟倒计时已完成！`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @keyframes ring { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes bellShake { 0%, 100% { transform: rotate(0); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); } 20%, 40%, 60%, 80% { transform: rotate(10deg); } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: transparent; font-family: 'Microsoft YaHei', sans-serif; overflow: hidden; }
    .container { width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; animation: fadeIn 0.4s ease-out, pulse 2s ease-in-out infinite; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4); }
    .alarm-icon { width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .clock-svg { width: 50px; height: 50px; animation: bellShake 0.5s ease-in-out infinite; }
    .content { flex: 1; color: white; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 6px; }
    .message { font-size: 14px; opacity: 0.9; margin-bottom: 10px; }
    .close-btn { position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; border: none; background: rgba(255,255,255,0.2); border-radius: 50%; color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
    .close-btn:hover { background: rgba(255,255,255,0.3); }
  </style>
</head>
<body>
  <div class="container">
    <button class="close-btn" onclick="window.close()">✕</button>
    <div class="alarm-icon">
      <svg class="clock-svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <circle cx="12" cy="13" r="8"/>
        <path d="M12 9v4l2 2"/>
        <path d="M5 3L2 6"/>
        <path d="M22 6l-3-3"/>
        <path d="M6 19l-2 2"/>
        <path d="M18 19l2 2"/>
      </svg>
    </div>
    <div class="content">
      <div class="title">${title}</div>
      <div class="message">${message}</div>
    </div>
  </div>
  <script>setTimeout(() => window.close(), 10000);</script>
</body>
</html>`;

    alarmWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    alarmWindow.once('ready-to-show', () => alarmWindow.focus());
    alarmWindow.on('closed', () => { alarmWindow = null; });
  }

  // 清理所有定时器（退出时调用）
  cleanupFunctions.push(() => {
    console.log('[Timer] Cleaning up all timers');
    activeTimerHandles.forEach((value, id) => {
      clearTimeout(value.timeout);
    });
    activeTimerHandles.clear();
  });

  // 开机启动设置
  ipcMain.on('set-auto-start', (event, enabled) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath
    });
    console.log('[Main] Auto-start set to:', enabled);
    event.reply('auto-start-status', { enabled });
  });

  ipcMain.on('get-auto-start', (event) => {
    const settings = app.getLoginItemSettings();
    event.reply('auto-start-status', { enabled: settings.openAtLogin });
  });

  // 窗口置顶
  ipcMain.on('set-always-on-top', (event, pinned) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(pinned);
      console.log('[Main] Always on top:', pinned);
    }
  });

  // 独立弹出框窗口（使用全局变量）
  let dialogData = null;
  let lastMainWindowBounds = null;  // 保存主窗口最后位置

  // 清理预加载窗口（使用全局变量）
  function cleanupPreloadedWindow() {
    if (preloadTimer) {
      clearTimeout(preloadTimer);
      preloadTimer = null;
    }
    if (preloadedDialogWindow && !preloadedDialogWindow.isDestroyed()) {
      preloadedDialogWindow.destroy();
      preloadedDialogWindow = null;
    }
  }

  // 注册清理函数（全局可调用）
  cleanupFunctions.push(cleanupPreloadedWindow);

  // 预创建弹出框窗口（提升响应速度）
  function preloadDialogWindow() {
    // 清理可能存在的定时器
    preloadTimer = null;

    if (preloadedDialogWindow && !preloadedDialogWindow.isDestroyed()) {
      return; // 已存在预加载窗口
    }

    preloadedDialogWindow = new BrowserWindow({
      width: 440,
      height: 400,
      x: -9999, // 屏幕外
      y: -9999,
      frame: false,
      transparent: false,
      backgroundColor: '#2b2b2b',
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
      }
    });

    // 预加载页面
    if (isDev) {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
      preloadedDialogWindow.loadURL(`${devServerUrl}?dialogMode=true&dialogType=preload`);
    } else {
      preloadedDialogWindow.loadFile(join(__dirname, '../../dist/index.html'), {
        query: { dialogMode: 'true', dialogType: 'preload' }
      });
    }

    preloadedDialogWindow.on('closed', () => {
      preloadedDialogWindow = null;
    });
  }

  // 延迟预加载（主窗口创建后1秒）
  preloadTimer = setTimeout(preloadDialogWindow, 1000);

  // 创建弹出框窗口的核心函数（优化版：秒出）
  function createDialogWindowInner(data) {
    // 关闭之前的弹出框窗口（使用 destroy 确保立即关闭）
    if (dialogWindow && !dialogWindow.isDestroyed()) {
      dialogWindow.destroy();
      dialogWindow = null;
    }

    dialogData = data;

    // 获取鼠标位置（优先）或主窗口位置
    const cursorPoint = screen.getCursorScreenPoint();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;

    // 弹出框尺寸（支持自定义尺寸）
    const dialogSizes = {
      'text-editor': { width: 440, height: 320 },
      'extract': { width: 400, height: 380 },
      'timer': { width: 340, height: 400 },
      'qrcode': { width: 320, height: 400 },
      'memo': { width: 360, height: 420 },
      'markdown': { width: 540, height: 480 },
      'ocr': { width: 420, height: 480 },
      'ai': { width: 440, height: 480 },
      'clipboard-history': { width: 400, height: 450 },
      'settings': { width: 320, height: 500 }
    };

    const size = {
      width: data.width || dialogSizes[data.type]?.width || 400,
      height: data.height || dialogSizes[data.type]?.height || 380
    };

    // 弹出框位置：鼠标位置居中
    let dialogX = cursorPoint.x - size.width / 2;
    let dialogY = cursorPoint.y - 50;

    // 确保不超出屏幕边界
    if (dialogX + size.width > workArea.width) {
      dialogX = workArea.width - size.width - 10;
    }
    if (dialogX < 0) {
      dialogX = 10;
    }
    if (dialogY + size.height > workArea.height) {
      dialogY = workArea.height - size.height - 10;
    }
    if (dialogY < 0) {
      dialogY = 10;
    }

    // 尝试复用预加载窗口
    if (preloadedDialogWindow && !preloadedDialogWindow.isDestroyed()) {
      dialogWindow = preloadedDialogWindow;
      preloadedDialogWindow = null;

      // 调整窗口大小和位置
      dialogWindow.setSize(size.width, size.height);
      dialogWindow.setPosition(Math.round(dialogX), Math.round(dialogY));

      // 直接发送初始化数据并显示（秒出）
      dialogWindow.webContents.send('dialog-init', dialogData);
      dialogWindow.show();
      dialogWindow.focus();
      console.log('[Main] Dialog window shown (reused preloaded)');

      // 重新预加载下一个窗口（取消之前的定时器）
      if (preloadTimer) {
        clearTimeout(preloadTimer);
      }
      preloadTimer = setTimeout(preloadDialogWindow, 500);
    } else {
      // 无预加载窗口，创建新窗口
      dialogWindow = new BrowserWindow({
        width: size.width,
        height: size.height,
        x: Math.round(dialogX),
        y: Math.round(dialogY),
        frame: false,
        transparent: false,
        backgroundColor: '#2b2b2b',
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        parent: null,
        modal: false,
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });

      // 加载弹出框页面
      if (isDev) {
        const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        dialogWindow.loadURL(`${devServerUrl}?dialogMode=true&dialogType=${data.type}`);
      } else {
        dialogWindow.loadFile(join(__dirname, '../../dist/index.html'), {
          query: { dialogMode: 'true', dialogType: data.type }
        });
      }

      // 使用 dom-ready 更快显示（比 did-finish-load 更快）
      dialogWindow.webContents.once('dom-ready', () => {
        if (dialogWindow && !dialogWindow.isDestroyed()) {
          dialogWindow.webContents.send('dialog-init', dialogData);
          dialogWindow.show();
          dialogWindow.focus();
          console.log('[Main] Dialog window shown (new window)');
        }
      });
    }

    // 监听窗口加载错误
    dialogWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Main] Dialog failed to load:', errorCode, errorDescription);
    });

    // 监听渲染进程错误
    dialogWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('[Main] Dialog render process gone:', details);
    });

    // 监听控制台消息（调试用）
    dialogWindow.webContents.on('console-message', (event, level, message) => {
      console.log('[Dialog Console]', message);
    });

    dialogWindow.on('closed', () => {
      dialogWindow = null;
      dialogData = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('dialog-closed');
      }
    });

    console.log('[Main] Dialog window created:', data.type, size.width, 'x', size.height);
  }

  // 暴露给 openDirectDialog 使用
  global.createDialogWindow = createDialogWindowInner;

  ipcMain.on('open-dialog-window', (event, data) => {
    // 获取主窗口位置（在隐藏前保存）
    if (mainWindow && !mainWindow.isDestroyed()) {
      lastMainWindowBounds = mainWindow.getBounds();
    }
    createDialogWindowInner(data);
  });

  // 弹出框主动请求初始化数据（备用机制）
  ipcMain.on('dialog-request-init', (event) => {
    if (dialogData && dialogWindow && !dialogWindow.isDestroyed()) {
      dialogWindow.webContents.send('dialog-init', dialogData);
      console.log('[Main] Sent dialog-init (requested):', dialogData.type);
    }
  });

  ipcMain.on('close-dialog-window', () => {
    if (dialogWindow && !dialogWindow.isDestroyed()) {
      dialogWindow.destroy();
      dialogWindow = null;
    }
  });

  // 弹出框置顶切换
  let dialogPinned = false;
  ipcMain.on('toggle-dialog-pin', (event, pinned) => {
    dialogPinned = pinned;
    if (dialogWindow && !dialogWindow.isDestroyed()) {
      dialogWindow.setAlwaysOnTop(pinned);
      console.log('[Main] Dialog pinned:', pinned);
    }
  });

  // 当主窗口显示时，检查是否需要关闭弹出框
  ipcMain.on('check-close-dialog', () => {
    if (!dialogPinned && dialogWindow && !dialogWindow.isDestroyed()) {
      dialogWindow.destroy();
      dialogWindow = null;
    }
  });

  // 弹出框窗口向主窗口发送结果
  ipcMain.on('dialog-result', (event, result) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dialog-result', result);
    }
  });

  // 写入剪贴板
  ipcMain.on('write-clipboard', (event, text) => {
    clipboard.writeText(text);
  });

  // 读取剪贴板图片（用于OCR等功能）
  ipcMain.on('read-clipboard-image', (event) => {
    try {
      const image = clipboard.readImage();
      if (image.isEmpty()) {
        event.reply('clipboard-image-result', { success: false, error: '剪贴板中没有图片' });
      } else {
        const dataUrl = image.toDataURL();
        event.reply('clipboard-image-result', { success: true, dataUrl });
      }
    } catch (err) {
      event.reply('clipboard-image-result', { success: false, error: err.message });
    }
  });

  // 取色器 - 屏幕取色
  let colorPickerWindow = null;

  ipcMain.on('pick-color', async (event) => {
    try {
      // 关闭之前的取色窗口
      if (colorPickerWindow && !colorPickerWindow.isDestroyed()) {
        colorPickerWindow.close();
      }

      // 获取主显示器
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      const scaleFactor = primaryDisplay.scaleFactor;

      // 在主进程中截取屏幕
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.floor(width * scaleFactor),
          height: Math.floor(height * scaleFactor)
        }
      });

      if (sources.length === 0) {
        event.reply('color-picked', { success: false, error: '无法获取屏幕' });
        return;
      }

      const screenshotDataUrl = sources[0].thumbnail.toDataURL();

      // 创建全屏透明窗口
      colorPickerWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width: width,
        height: height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        fullscreen: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100vw; height: 100vh;
      background: transparent;
      cursor: crosshair;
      overflow: hidden;
    }
    #screenshot {
      position: fixed;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      object-fit: cover;
      pointer-events: none;
    }
    .preview {
      position: fixed;
      width: 140px;
      padding: 12px;
      background: rgba(20, 20, 20, 0.95);
      border: 2px solid #fff;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      pointer-events: none;
      z-index: 9999;
    }
    .magnifier {
      width: 116px;
      height: 80px;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      margin-bottom: 8px;
      overflow: hidden;
      image-rendering: pixelated;
    }
    .magnifier canvas {
      width: 100%;
      height: 100%;
    }
    .color-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .color-box {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 2px solid #fff;
      flex-shrink: 0;
    }
    .color-hex {
      color: #fff;
      font-family: Consolas, monospace;
      font-size: 14px;
      font-weight: bold;
    }
    .color-rgb {
      color: #aaa;
      font-family: Consolas, monospace;
      font-size: 11px;
    }
    .hint {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      color: #fff;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 14px;
      font-family: 'Microsoft YaHei', sans-serif;
    }
  </style>
</head>
<body>
  <img id="screenshot" />
  <div class="preview" id="preview">
    <div class="magnifier"><canvas id="magnifierCanvas" width="116" height="80"></canvas></div>
    <div class="color-row">
      <div class="color-box" id="colorBox"></div>
      <div class="color-hex" id="colorHex">#FFFFFF</div>
    </div>
    <div class="color-rgb" id="colorRgb">RGB(255, 255, 255)</div>
  </div>
  <div class="hint">点击选取颜色 | ESC 取消</div>
  <script>
    const { ipcRenderer } = require('electron');
    const screenshot = document.getElementById('screenshot');
    const preview = document.getElementById('preview');
    const colorBox = document.getElementById('colorBox');
    const colorHex = document.getElementById('colorHex');
    const colorRgb = document.getElementById('colorRgb');
    const magnifierCanvas = document.getElementById('magnifierCanvas');
    const magnifierCtx = magnifierCanvas.getContext('2d', { willReadFrequently: true });

    let sourceCanvas, sourceCtx;
    let imgWidth, imgHeight;
    let isReady = false;
    const screenWidth = ${width};
    const screenHeight = ${height};

    // 使用主进程传入的截图
    const screenshotDataUrl = "${screenshotDataUrl.replace(/"/g, '\\"')}";

    const img = new Image();
    img.onload = () => {
      imgWidth = img.width;
      imgHeight = img.height;

      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = imgWidth;
      sourceCanvas.height = imgHeight;
      sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      sourceCtx.drawImage(img, 0, 0);

      screenshot.src = screenshotDataUrl;
      isReady = true;

      // 初始化预览位置
      updatePreview(screenWidth / 2, screenHeight / 2);
    };
    img.src = screenshotDataUrl;

    // 获取像素颜色
    function getColorAt(clientX, clientY) {
      if (!isReady || !sourceCtx) return { hex: '#000000', r: 0, g: 0, b: 0 };

      const x = Math.floor((clientX / screenWidth) * imgWidth);
      const y = Math.floor((clientY / screenHeight) * imgHeight);

      if (x < 0 || y < 0 || x >= imgWidth || y >= imgHeight) {
        return { hex: '#000000', r: 0, g: 0, b: 0 };
      }

      try {
        const pixel = sourceCtx.getImageData(x, y, 1, 1).data;
        const r = pixel[0], g = pixel[1], b = pixel[2];
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
        return { hex, r, g, b };
      } catch (e) {
        return { hex: '#000000', r: 0, g: 0, b: 0 };
      }
    }

    // 绘制放大镜
    function drawMagnifier(clientX, clientY) {
      if (!isReady || !sourceCtx) return;

      const x = Math.floor((clientX / screenWidth) * imgWidth);
      const y = Math.floor((clientY / screenHeight) * imgHeight);
      const size = 11;
      const half = Math.floor(size / 2);

      magnifierCtx.imageSmoothingEnabled = false;
      magnifierCtx.fillStyle = '#000';
      magnifierCtx.fillRect(0, 0, 116, 80);

      const srcX = Math.max(0, Math.min(x - half, imgWidth - size));
      const srcY = Math.max(0, Math.min(y - half, imgHeight - size));

      try {
        magnifierCtx.drawImage(sourceCanvas, srcX, srcY, size, size, 0, 0, 116, 80);
      } catch (e) {}

      magnifierCtx.strokeStyle = 'rgba(255,255,255,0.8)';
      magnifierCtx.lineWidth = 1;
      magnifierCtx.beginPath();
      magnifierCtx.moveTo(58, 30);
      magnifierCtx.lineTo(58, 50);
      magnifierCtx.moveTo(48, 40);
      magnifierCtx.lineTo(68, 40);
      magnifierCtx.stroke();
    }

    // 更新预览
    function updatePreview(clientX, clientY) {
      if (!isReady) return;

      const color = getColorAt(clientX, clientY);
      colorBox.style.backgroundColor = color.hex;
      colorHex.textContent = color.hex;
      colorRgb.textContent = 'RGB(' + color.r + ', ' + color.g + ', ' + color.b + ')';
      drawMagnifier(clientX, clientY);

      let left = clientX + 25;
      let top = clientY + 25;
      if (left + 160 > screenWidth) left = clientX - 165;
      if (top + 160 > screenHeight) top = clientY - 165;
      preview.style.left = left + 'px';
      preview.style.top = top + 'px';
    }

    document.addEventListener('mousemove', (e) => {
      updatePreview(e.clientX, e.clientY);
    });

    document.addEventListener('click', (e) => {
      if (!isReady) return;
      const color = getColorAt(e.clientX, e.clientY);
      ipcRenderer.send('color-picked-result', { success: true, color: color.hex });
      window.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ipcRenderer.send('color-picked-result', { success: false });
        window.close();
      }
    });
  </script>
</body>
</html>`;

      colorPickerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

      colorPickerWindow.on('closed', () => {
        colorPickerWindow = null;
      });

    } catch (e) {
      console.error('[ColorPicker] Error:', e);
      event.reply('color-picked', { success: false, error: e.message });
    }
  });

  // 接收取色结果
  ipcMain.on('color-picked-result', (event, result) => {
    if (result.success && result.color) {
      clipboard.writeText(result.color);
    }
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('color-picked', result);
    }
  });

  // 兼容接口
  ipcMain.on('minimize-window', () => mainWindow.minimize());
  ipcMain.on('close-window', () => app.quit());
  ipcMain.on('hide-window', () => mainWindow.hide());

  // 中键唤醒设置
  ipcMain.on('set-middle-click', (event, enabled) => {
    middleClickEnabled = enabled;
    configManager.set('middleClickEnabled', enabled);
    console.log('[Main] Middle click enabled:', enabled);

    if (process.platform === 'win32') {
      if (enabled && !mouseHookProc) {
        startMouseHook();
      } else if (!enabled && mouseHookProc) {
        stopMouseHook();
      }
    }
    event.reply('middle-click-status', { enabled });
  });

  ipcMain.on('get-middle-click', (event) => {
    event.reply('middle-click-status', { enabled: middleClickEnabled });
  });

  // 贴图置顶 - 统一的图片置顶窗口创建函数
  const createImagePinWindow = (base64Data, originalSize = null) => {
    const img = nativeImage.createFromDataURL(base64Data);
    if (img.isEmpty()) {
      return { success: false, error: '无法加载图片' };
    }

    const size = originalSize || img.getSize();

    // 限制最大尺寸，但保持原始比例
    const maxWidth = 1200;
    const maxHeight = 800;
    let displayWidth = size.width;
    let displayHeight = size.height;

    if (size.width > maxWidth || size.height > maxHeight) {
      const scale = Math.min(maxWidth / size.width, maxHeight / size.height);
      displayWidth = Math.round(size.width * scale);
      displayHeight = Math.round(size.height * scale);
    }

    let imgWin = new BrowserWindow({
      width: displayWidth + 16,
      height: displayHeight + 56, // 额外空间给工具栏
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      resizable: true,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: transparent;
      overflow: hidden;
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
    }
    .container {
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      -webkit-app-region: drag;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: rgba(30, 30, 30, 0.95);
      border-radius: 8px 8px 0 0;
      -webkit-app-region: no-drag;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .container:hover .toolbar {
      opacity: 1;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: rgba(255,255,255,0.6);
    }
    .toolbar-right {
      display: flex;
      gap: 4px;
    }
    .tool-btn {
      width: 28px;
      height: 28px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .tool-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    .tool-btn.close:hover {
      background: rgba(220,53,69,0.9);
    }
    .tool-btn.pin {
      color: #ffc107;
    }
    .tool-btn.pin.active {
      background: rgba(255,193,7,0.3);
    }
    .img-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 8px;
      min-height: 0;
    }
    .img-wrapper {
      position: relative;
      border-radius: 6px;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.1),
        0 4px 16px rgba(0,0,0,0.4),
        0 8px 32px rgba(0,0,0,0.3);
    }
    img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
    }
    .size-info {
      position: absolute;
      bottom: 8px;
      left: 8px;
      padding: 3px 8px;
      background: rgba(0,0,0,0.7);
      border-radius: 4px;
      font-size: 10px;
      color: rgba(255,255,255,0.8);
      opacity: 0;
      transition: opacity 0.2s;
    }
    .container:hover .size-info {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <div class="toolbar-left">
        <span>${size.width} × ${size.height}</span>
      </div>
      <div class="toolbar-right">
        <button class="tool-btn" id="copyBtn" title="复制图片">📋</button>
        <button class="tool-btn" id="saveBtn" title="另存为">💾</button>
        <button class="tool-btn pin" id="pinBtn" title="取消置顶">📌</button>
        <button class="tool-btn close" id="closeBtn" title="关闭">✕</button>
      </div>
    </div>
    <div class="img-container">
      <div class="img-wrapper">
        <img id="pinImage" src="${base64Data}" />
      </div>
    </div>
  </div>
  <script>
    const { ipcRenderer, clipboard, nativeImage } = require('electron');
    const fs = require('fs');
    const path = require('path');

    let isPinned = true;
    const base64Data = "${base64Data.replace(/"/g, '\\"')}";

    // 关闭
    document.getElementById('closeBtn').onclick = () => window.close();

    // 复制
    document.getElementById('copyBtn').onclick = () => {
      const img = nativeImage.createFromDataURL(base64Data);
      clipboard.writeImage(img);
      // 简单的反馈
      document.getElementById('copyBtn').textContent = '✓';
      setTimeout(() => {
        document.getElementById('copyBtn').textContent = '📋';
      }, 1000);
    };

    // 另存为
    document.getElementById('saveBtn').onclick = () => {
      // 通过 IPC 请求主进程处理保存
      ipcRenderer.send('image-pin-save', { base64: base64Data });
      // 反馈
      document.getElementById('saveBtn').textContent = '⏳';
    };

    // 监听保存结果
    ipcRenderer.on('image-pin-save-result', (event, { success, canceled }) => {
      const btn = document.getElementById('saveBtn');
      if (success) {
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = '💾'; }, 1500);
      } else if (!canceled) {
        btn.textContent = '✗';
        setTimeout(() => { btn.textContent = '💾'; }, 1500);
      } else {
        btn.textContent = '💾';
      }
    });

    // 置顶切换
    document.getElementById('pinBtn').onclick = () => {
      isPinned = !isPinned;
      ipcRenderer.send('image-pin-toggle', isPinned);
      const btn = document.getElementById('pinBtn');
      btn.classList.toggle('active', !isPinned);
      btn.title = isPinned ? '取消置顶' : '置顶';
    };

    // 键盘快捷键
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
        window.close();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('saveBtn').click();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        document.getElementById('copyBtn').click();
      }
    });

    window.focus();
  </script>
</body>
</html>`;

    imgWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    imgWin.once('ready-to-show', () => imgWin.focus());

    // 监听置顶切换
    const toggleHandler = (event, pinned) => {
      if (imgWin && !imgWin.isDestroyed()) {
        imgWin.setAlwaysOnTop(pinned);
      }
    };
    ipcMain.on('image-pin-toggle', toggleHandler);

    // 监听保存请求
    const saveHandler = async (event, { base64 }) => {
      const { dialog } = require('electron');
      const result = await dialog.showSaveDialog(imgWin, {
        title: '保存图片',
        defaultPath: `image_${Date.now()}.png`,
        filters: [
          { name: 'PNG 图片', extensions: ['png'] },
          { name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] },
          { name: 'WebP 图片', extensions: ['webp'] }
        ]
      });

      let success = false;
      if (!result.canceled && result.filePath) {
        try {
          const img = nativeImage.createFromDataURL(base64);
          const ext = result.filePath.split('.').pop().toLowerCase();
          let buffer;

          if (ext === 'jpg' || ext === 'jpeg') {
            buffer = img.toJPEG(90);
          } else if (ext === 'webp') {
            buffer = img.toPNG(); // WebP 用 PNG 代替
          } else {
            buffer = img.toPNG();
          }

          fs.writeFileSync(result.filePath, buffer);
          success = true;
          console.log('[ImagePin] Saved to:', result.filePath);
        } catch (e) {
          console.error('[ImagePin] Save error:', e);
        }
      }
      // 回复保存结果
      event.reply('image-pin-save-result', { success, canceled: result.canceled });
    };
    ipcMain.on('image-pin-save', saveHandler);

    imgWin.on('closed', () => {
      ipcMain.removeListener('image-pin-toggle', toggleHandler);
      ipcMain.removeListener('image-pin-save', saveHandler);
      imgWin = null;
    });

    return { success: true, window: imgWin };
  };

  // 贴图置顶 - 从剪贴板读取图片
  ipcMain.on('snip-pin', (event) => {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      event.reply('snip-pin-result', { success: false, error: '剪贴板中没有图片' });
      return;
    }

    const base64 = image.toDataURL();
    const size = image.getSize();
    const result = createImagePinWindow(base64, size);

    if (result.success) {
      // 隐藏主窗口
      if (mainWindow) mainWindow.hide();
    } else {
      event.reply('snip-pin-result', result);
    }
  });

  // === 剪贴板历史管理 ===

  // 初始化剪贴板历史管理器
  clipboardHistory = new ClipboardHistory({
    maxItems: 50,
    checkInterval: 500,
    onUpdate: (history) => {
      // 通知渲染进程历史更新（发送到主窗口和弹出框）
      if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard-history-update', history);
      }
      // 同时发送到弹出框窗口（剪贴板历史可能在弹出框中显示）
      if (dialogWindow && !dialogWindow.isDestroyed() && dialogWindow.webContents) {
        dialogWindow.webContents.send('clipboard-history-update', history);
      }
    }
  });
  clipboardHistory.init(app.getPath('userData'));

  // 获取剪贴板历史列表
  ipcMain.on('clipboard-history-get', (event) => {
    const history = clipboardHistory.getHistory();
    event.reply('clipboard-history-data', history);
  });

  // 使用历史记录（复制到剪贴板）
  ipcMain.on('clipboard-history-use', (event, id) => {
    const success = clipboardHistory.useItem(id);
    event.reply('clipboard-history-use-result', { success, id });
  });

  // 双击粘贴到光标处
  ipcMain.on('clipboard-history-paste', (event, id) => {
    const success = clipboardHistory.useItem(id);
    if (success) {
      // 关闭弹出框
      if (dialogWindow && !dialogWindow.isDestroyed()) {
        dialogWindow.close();
      }
      // 延迟后模拟 Ctrl+V 粘贴
      setTimeout(() => {
        systemTools.simulatePaste();
      }, 100);
    }
  });

  // 删除历史记录
  ipcMain.on('clipboard-history-delete', (event, id) => {
    const success = clipboardHistory.deleteItem(id);
    event.reply('clipboard-history-delete-result', { success, id });
  });

  // 切换置顶状态
  ipcMain.on('clipboard-history-pin', (event, id) => {
    const pinned = clipboardHistory.togglePin(id);
    event.reply('clipboard-history-pin-result', { id, pinned });
  });

  // 清空历史（保留置顶）
  ipcMain.on('clipboard-history-clear', (event) => {
    clipboardHistory.clearHistory();
    event.reply('clipboard-history-clear-result', { success: true });
  });

  // 搜索历史
  ipcMain.on('clipboard-history-search', (event, keyword) => {
    const results = clipboardHistory.search(keyword);
    event.reply('clipboard-history-search-result', results);
  });

  // 获取完整内容
  ipcMain.on('clipboard-history-content', (event, id) => {
    const content = clipboardHistory.getItemContent(id);
    event.reply('clipboard-history-content-result', { id, content });
  });

  // 图片贴图置顶（从剪贴板历史）
  ipcMain.on('clipboard-history-image-pin', (event, id) => {
    const content = clipboardHistory.getItemContent(id);
    if (!content) {
      if (dialogWindow && !dialogWindow.isDestroyed()) {
        dialogWindow.webContents.send('clipboard-history-image-pin-result', { success: false, error: '找不到图片数据' });
      }
      return;
    }

    // 关闭弹出框
    if (dialogWindow && !dialogWindow.isDestroyed()) {
      dialogWindow.close();
    }

    // 使用统一的图片置顶函数
    const result = createImagePinWindow(content);
    if (!result.success) {
      console.error('[Main] Image pin error:', result.error);
    }
  });

  // AI 请求代理（解决 CORS 问题）
  ipcMain.on('ai-chat', async (event, { requestId, endpoint, headers, body }) => {
    console.log('[Main] AI chat request received:', { requestId, endpoint, model: body?.model });

    // 验证参数
    if (!endpoint || !body) {
      console.error('[Main] AI chat: missing endpoint or body');
      event.reply('ai-chat-result', {
        requestId,
        success: false,
        error: '请求参数不完整'
      });
      return;
    }

    // 清理 endpoint URL（移除末尾的 # 和空白字符）
    const cleanEndpoint = endpoint.trim().replace(/#$/, '');

    try {
      // 使用 Node.js 原生 fetch（Electron 18+ 支持）
      console.log('[Main] AI chat: sending request to', cleanEndpoint);
      const response = await fetch(cleanEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      });

      console.log('[Main] AI chat: response status', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `请求失败: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (e) {
          if (errorText) errorMessage += ` - ${errorText.substring(0, 100)}`;
        }
        console.error('[Main] AI chat error:', errorMessage);
        event.reply('ai-chat-result', {
          requestId,
          success: false,
          error: errorMessage
        });
        return;
      }

      // 检查是否为流式响应
      const contentType = response.headers.get('content-type') || '';
      console.log('[Main] AI chat: content-type', contentType, 'stream:', body.stream);

      if (body.stream && contentType.includes('text/event-stream')) {
        // 流式响应处理
        console.log('[Main] AI chat: processing stream response');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.startsWith('data:'));

          for (const line of lines) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              // OpenAI 格式
              const content = parsed.choices?.[0]?.delta?.content || '';
              // Claude 格式
              const claudeContent = parsed.delta?.text || '';
              const newContent = content || claudeContent;

              if (newContent) {
                fullContent += newContent;
                event.reply('ai-chat-stream', { requestId, chunk: newContent, full: fullContent });
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }

        console.log('[Main] AI chat: stream completed, content length:', fullContent.length);
        event.reply('ai-chat-result', { requestId, success: true, content: fullContent });
      } else {
        // 非流式响应
        console.log('[Main] AI chat: processing non-stream response');
        const data = await response.json();
        console.log('[Main] AI chat: raw response data:', JSON.stringify(data).substring(0, 500));

        // 尝试多种格式解析
        let content = '';
        // OpenAI 格式: { choices: [{ message: { content: "..." } }] }
        if (data.choices?.[0]?.message?.content) {
          content = data.choices[0].message.content;
        }
        // Claude 格式: { content: [{ text: "..." }] }
        else if (data.content?.[0]?.text) {
          content = data.content[0].text;
        }
        // 简单格式: { content: "..." }
        else if (typeof data.content === 'string') {
          content = data.content;
        }
        // 简单格式: { message: "..." }
        else if (typeof data.message === 'string') {
          content = data.message;
        }
        // 简单格式: { text: "..." }
        else if (typeof data.text === 'string') {
          content = data.text;
        }
        // 简单格式: { result: "..." }
        else if (typeof data.result === 'string') {
          content = data.result;
        }
        // 简单格式: { data: "..." }
        else if (typeof data.data === 'string') {
          content = data.data;
        }
        // 嵌套格式: { data: { content: "..." } }
        else if (data.data?.content) {
          content = typeof data.data.content === 'string' ? data.data.content : JSON.stringify(data.data.content);
        }
        // 如果还是空，把整个响应作为内容返回（用于调试）
        if (!content && Object.keys(data).length > 0) {
          console.log('[Main] AI chat: unknown format, returning raw data');
          content = JSON.stringify(data, null, 2);
        }

        console.log('[Main] AI chat: response content length:', content.length);
        event.reply('ai-chat-result', { requestId, success: true, content });
      }
    } catch (e) {
      console.error('[Main] AI chat error:', e.message, e.stack);
      // 提供更友好的错误信息
      let errorMsg = e.message || '网络请求失败';
      if (e.cause) {
        errorMsg += ` (${e.cause.code || e.cause.message || ''})`;
      }
      if (errorMsg.includes('fetch failed')) {
        errorMsg = '网络请求失败，请检查网络连接或API地址是否正确';
      } else if (errorMsg.includes('ENOTFOUND')) {
        errorMsg = '无法连接到服务器，请检查API地址';
      } else if (errorMsg.includes('ECONNREFUSED')) {
        errorMsg = '连接被拒绝，请检查服务器是否可用';
      } else if (errorMsg.includes('certificate')) {
        errorMsg = 'SSL证书错误，请检查服务器证书';
      }
      event.reply('ai-chat-result', {
        requestId,
        success: false,
        error: errorMsg
      });
    }
  });
}

// 启动鼠标钩子
function startMouseHook() {
  if (mouseHookProc) return;

  try {
    // 获取右键长按延时配置
    const radialSettings = configManager.get('radialMenuSettings') || {};
    const longPressDelay = radialSettings.longPressDelay || 400;

    console.log('[Main] Starting MouseHook:', mouseHookPath, 'longPressDelay:', longPressDelay);
    mouseHookProc = spawn(mouseHookPath, [longPressDelay.toString()]);

    mouseHookProc.stdout.on('data', (data) => {
      const msg = data.toString().trim();

      // 中键点击 - 根据召唤模式决定打开轮盘或主窗口
      if (msg.includes('MIDDLE_CLICK') && middleClickEnabled) {
        console.log('[Main] Middle Click Detected, summonMode:', summonMode);

        if (summonMode === 'radial' && globalCreateRadialMenuWindow) {
          // 轮盘模式 - 获取当前鼠标位置并打开轮盘
          const cursorPoint = screen.getCursorScreenPoint();
          console.log('[Main] Opening radial menu at:', cursorPoint.x, cursorPoint.y);
          globalCreateRadialMenuWindow(cursorPoint.x, cursorPoint.y);
        } else {
          // 弹框模式 - 唤醒主窗口
          activateApp();
        }
      }
    });

    mouseHookProc.on('error', (err) => {
      // 忽略 EPIPE 错误
      if (err.code !== 'EPIPE') {
        console.error('[Main] MouseHook Error:', err);
      }
      mouseHookProc = null;
    });

    mouseHookProc.on('close', (code) => {
      mouseHookProc = null;
    });

  } catch (e) {
    console.error('[Main] Failed to start MouseHook:', e);
    mouseHookProc = null;
  }
}

// 停止鼠标钩子（强制终止）
function stopMouseHook() {
  console.log('[Main] Stopping MouseHook...');

  // 首先尝试正常终止
  if (mouseHookProc) {
    try {
      mouseHookProc.kill('SIGTERM');
    } catch (e) {
      // 忽略
    }
    mouseHookProc = null;
  }

  // Windows 上强制终止所有 MouseHook.exe 进程（防止残留）
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      execSync('taskkill /F /IM MouseHook.exe 2>nul', {
        windowsHide: true,
        timeout: 3000,
        stdio: 'ignore'
      });
      console.log('[Main] MouseHook forcefully terminated');
    } catch (e) {
      // 进程可能已经不存在，忽略错误
    }
  }
}

// 单例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Electron应用准备就绪
  app.whenReady().then(async () => {
    // 初始化密钥管理器
    secretManager.init();

    // 从配置读取中键设置
    middleClickEnabled = configManager.get('middleClickEnabled') !== false;

    // 1. 定义资源路径 - 使用统一的 getResourcePath
    const resourceIconPath = getResourcePath('icon-16.png');
    const resourceDisabledPath = getResourcePath('icon-disabled-16.png');

    console.log('[Main] Icon path:', resourceIconPath);

    // 2. 内嵌 Base64 图标作为后备 (16x16 闪电)
    // 金黄色 = 启用状态, 灰色 = 禁用状态
    const normalBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAPklEQVR42mNgIAD+v7b+//8gOxgzkAqopvn/DIb/A6SZVKejaybJdgzNWDB+Awhopm9ADpc0QP9Ao0QzJQAAiKW8uSSMRhMAAAAASUVORK5CYII=';
    const disabledBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAPklEQVR42mNgIAD27t37f968eWDMQCqgmubS0tL/A6OZZKejaybJdnTN2DBeAwhppm9ADpM0QP9Ao0gzJQAA3Ve+t+1gsQQAAAAASUVORK5CYII=';

    // 3. 加载图标逻辑 - 优先从文件加载，失败则用 Base64
    try {
        // 尝试从文件加载
        if (fs.existsSync(resourceIconPath)) {
            console.log('[Main] Loading icon from file...');
            normalIconImage = nativeImage.createFromPath(resourceIconPath);
            disabledIconImage = nativeImage.createFromPath(resourceDisabledPath);
        } else {
            console.log('[Main] Icon files not found, using embedded Base64...');
            normalIconImage = nativeImage.createFromDataURL(normalBase64);
            disabledIconImage = nativeImage.createFromDataURL(disabledBase64);
        }

        if (normalIconImage.isEmpty()) {
            console.warn('[Main] Icon is empty, falling back to Base64...');
            normalIconImage = nativeImage.createFromDataURL(normalBase64);
            disabledIconImage = nativeImage.createFromDataURL(disabledBase64);
        }

        console.log('[Main] Icon loaded. Size:', normalIconImage.getSize());

    } catch (e) {
      console.error('[Main] Icon load error:', e);
      normalIconImage = nativeImage.createFromDataURL(normalBase64);
      disabledIconImage = nativeImage.createFromDataURL(disabledBase64);
    }

    // 4. 创建窗口 (此时 normalIconImage 一定有值) - 必须 await 确保 IPC 初始化完成
    await createWindow()

    // 5. 创建托盘
    try {
        // 先销毁旧的 (如果有)
        if (tray) tray.destroy();

        tray = new Tray(normalIconImage);
        tray.setToolTip('QuickerUse');
        tray.setIgnoreDoubleClickEvents(false); // 允许双击事件

        // 构建托盘菜单的函数
        const buildTrayMenu = () => {
          return Menu.buildFromTemplate([
            {
              label: '显示窗口',
              click: () => {
                if (mainWindow) {
                  mainWindow.show();
                  mainWindow.focus();
                }
              }
            },
            { type: 'separator' },
            {
              label: '召唤模式',
              submenu: [
                {
                  label: '弹框模式',
                  type: 'radio',
                  checked: summonMode === 'popup',
                  click: () => {
                    summonMode = 'popup';
                    configManager.set('summonMode', 'popup');
                    tray.setContextMenu(buildTrayMenu());
                  }
                },
                {
                  label: '轮盘模式',
                  type: 'radio',
                  checked: summonMode === 'radial',
                  click: () => {
                    summonMode = 'radial';
                    configManager.set('summonMode', 'radial');
                    tray.setContextMenu(buildTrayMenu());
                  }
                }
              ]
            },
            { type: 'separator' },
            {
              label: isAppDisabled ? '启用' : '禁用',
              click: () => {
                isAppDisabled = !isAppDisabled;
                updateTrayIcon();
                tray.setContextMenu(buildTrayMenu());
              }
            },
            { type: 'separator' },
            {
              label: '关于',
              click: () => {
                if (mainWindow) {
                  mainWindow.show();
                  mainWindow.focus();
                  mainWindow.webContents.send('show-about');
                }
              }
            },
            { type: 'separator' },
            {
              label: '退出',
              click: () => app.quit()
            }
          ]);
        };

        tray.setContextMenu(buildTrayMenu());

        // 单击显示窗口
        tray.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        });

        // 双击切换禁用状态
        tray.on('double-click', () => {
          isAppDisabled = !isAppDisabled;
          updateTrayIcon();
          tray.setContextMenu(buildTrayMenu());
        });

        console.log('[Main] Tray created successfully');

        // 从配置文件加载召唤模式并更新托盘菜单
        summonMode = configManager.get('summonMode') || 'popup';
        console.log('[Main] Loaded summonMode:', summonMode);
        tray.setContextMenu(buildTrayMenu());
    } catch (err) {
        console.error('[Main] FAILED to create Tray:', err);
    }

    // 从配置文件加载快捷键（应用启动时恢复）
    cachedSmartHotkeys = configManager.get('smartHotkeys') || {};
    cachedCustomHotkeys = configManager.get('customHotkeys') || {};
    console.log('[Main] Loaded smartHotkeys from config:', Object.keys(cachedSmartHotkeys));
    console.log('[Main] Loaded customHotkeys from config:', Object.keys(cachedCustomHotkeys));

    registerGlobalShortcut(globalHotkey);

    // 启动鼠标中键监听 (仅Windows且启用时)
    if (process.platform === 'win32' && middleClickEnabled) {
      startMouseHook();
    } else {
      console.log('[Main] MouseHook skipped:', process.platform !== 'win32' ? 'non-Windows platform' : 'disabled by user');
    }

    // 预加载轮盘菜单窗口（始终预加载，因为中键召唤总是显示轮盘）
    // 立即预加载，不等待
    setImmediate(() => {
      if (globalPreloadRadialWindow) {
        globalPreloadRadialWindow();
        console.log('[Main] Radial menu preload started immediately');
      }
    });

    // 预热 desktopCapturer（提升取色器首次打开速度）
    // 首次调用 desktopCapturer.getSources() 需要初始化，会比较慢
    // 这里用小尺寸预热一次，后续调用就会快很多
    setTimeout(async () => {
      try {
        const { desktopCapturer } = require('electron');
        console.log('[Main] Pre-warming desktopCapturer...');
        await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 }  // 最小尺寸，仅用于初始化
        });
        console.log('[Main] desktopCapturer pre-warmed successfully');
      } catch (e) {
        console.warn('[Main] Failed to pre-warm desktopCapturer:', e.message);
      }
    }, 2000); // 2秒后预热，避免影响启动速度

    // 窗口监控和清理 - 每30秒检查一次残留窗口
    windowCleanupTimer = setInterval(() => {
      const allWindows = BrowserWindow.getAllWindows();
      const validWindows = allWindows.filter(w => !w.isDestroyed());

      // 正常情况：主窗口 + 预加载弹窗 + 可能的活动窗口（最多5-6个）
      if (validWindows.length > 6) {
        console.warn('[Main] Too many windows detected:', validWindows.length);
        // 清理非主窗口、非预加载窗口的隐藏窗口
        validWindows.forEach(w => {
          if (w !== mainWindow &&
              w !== preloadedDialogWindow &&
              !w.isVisible() &&
              !w.isDestroyed()) {
            console.log('[Main] Destroying hidden window');
            w.destroy();
          }
        });
      }

      // 检查轮盘窗口是否残留
      if (radialMenuWindow &&
          !radialMenuWindow.isDestroyed() &&
          !radialMenuWindow.isVisible()) {
        console.log('[Main] Cleaning up invisible radial menu window');
        radialMenuWindow.destroy();
        radialMenuWindow = null;
      }
    }, 30000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理所有资源
app.on('before-quit', () => {
  console.log('[Main] before-quit: cleaning up all resources');

  // 清理窗口监控定时器
  if (windowCleanupTimer) {
    clearInterval(windowCleanupTimer);
    windowCleanupTimer = null;
  }

  // 清理快捷键防抖定时器
  if (hotkeyRegistrationTimer) {
    clearTimeout(hotkeyRegistrationTimer);
    hotkeyRegistrationTimer = null;
  }

  // 清理预加载定时器
  if (preloadTimer) {
    clearTimeout(preloadTimer);
    preloadTimer = null;
  }

  // 清理轮盘窗口
  if (radialMenuWindow && !radialMenuWindow.isDestroyed()) {
    radialMenuWindow.destroy();
    radialMenuWindow = null;
  }

  // 清理预加载窗口
  if (preloadedDialogWindow && !preloadedDialogWindow.isDestroyed()) {
    preloadedDialogWindow.destroy();
    preloadedDialogWindow = null;
  }

  // 清理弹窗
  if (dialogWindow && !dialogWindow.isDestroyed()) {
    dialogWindow.destroy();
    dialogWindow = null;
  }

  // 调用所有注册的清理函数
  cleanupFunctions.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('[Main] Cleanup function error:', e);
    }
  });
  cleanupFunctions = [];

  // 停止剪贴板历史监听
  if (clipboardHistory) {
    clipboardHistory.stopWatching();
  }

  // 注销所有快捷键
  globalShortcut.unregisterAll();

  // 停止鼠标钩子（提前终止，避免残留）
  stopMouseHook();

  // 销毁所有窗口（包括主窗口、弹出框、图片窗口等）
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  });
  mainWindow = null;
  dialogWindow = null;
  radialMenuWindow = null;
})

app.on('will-quit', () => {
  console.log('[Main] will-quit: final cleanup');

  globalShortcut.unregisterAll();
  stopMouseHook();

  // 清理剪贴板历史
  if (clipboardHistory) {
    clipboardHistory.stopWatching();
    clipboardHistory = null;
  }

  // 清理托盘图标
  if (tray) {
    tray.destroy();
    tray = null;
  }
})

// 进程退出时强制清理（兜底机制）
process.on('exit', () => {
  console.log('[Main] Process exit: final cleanup');
  stopMouseHook();
});

// 处理未捕获的异常，确保清理
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
  stopMouseHook();
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
});

// 启动时清理可能残留的 MouseHook 进程（用于开发模式 HMR 场景）
if (process.platform === 'win32') {
  try {
    const { execSync } = require('child_process');
    execSync('taskkill /F /IM MouseHook.exe 2>nul', {
      windowsHide: true,
      timeout: 2000,
      stdio: 'ignore'
    });
    console.log('[Main] Cleaned up orphaned MouseHook processes on startup');
  } catch (e) {
    // 没有残留进程，忽略错误
  }
}
