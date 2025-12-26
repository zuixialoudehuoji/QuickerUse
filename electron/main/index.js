// electron/main/index.js (主进程文件)
import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard, shell, Tray, Menu, nativeImage, Notification } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process' 
import fs from 'fs' 
import systemTools from './systemTools' 
import scriptManager from './scriptManager' 
import fileServer from './fileServer' 
import secretManager from './secretManager' 
import configManager from './configManager' 

// 定义主窗口实例
let mainWindow = null
let tray = null
let isAppDisabled = false
let globalHotkey = 'Alt+Space'
let mouseHookProc = null
let normalIconImage = null
let disabledIconImage = null
let lastActiveWindowHandle = null  // 记录唤醒前的活动窗口句柄

// 开发模式判断
const isDev = process.env.NODE_ENV === 'development'

// 资源路径
const mouseHookPath = join(__dirname, '../../resources/MouseHook.exe');

function updateTrayIcon() {
  if (tray && normalIconImage && disabledIconImage) {
    const icon = isAppDisabled ? disabledIconImage : normalIconImage;
    tray.setImage(icon);
    tray.setToolTip(isAppDisabled ? 'QuickerUse (已禁用)' : 'QuickerUse');
  }
}

// 核心唤醒逻辑 (被热键和鼠标中键共用)
function activateApp(targetAction = null, fromHotkey = false) {
  if (isAppDisabled) return;

  // 如果只是唤醒且窗口已显示，则隐藏
  if (!targetAction && mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
    return;
  }

  // 1. 备份剪贴板内容
  const originalText = clipboard.readText();
  console.log('========== 唤醒 ==========');
  console.log('[1] 原始剪贴板内容:');
  console.log(originalText || '(空)');
  console.log('[1] 原始剪贴板长度:', originalText ? originalText.length : 0);

  // 2. 清空剪贴板
  clipboard.clear();

  // 3. 发送 Ctrl+C 获取选中内容
  systemTools.simulateCopy(fromHotkey);

  // 4. 等待剪贴板更新
  let selectedText = '';
  const start = Date.now();
  while (Date.now() - start < 80) {
    const currentClip = clipboard.readText();
    if (currentClip) {
      selectedText = currentClip;
      break;
    }
  }

  console.log('[2] Ctrl+C后获取:');
  console.log(selectedText || '(无)');
  console.log('[2] 获取长度:', selectedText ? selectedText.length : 0);

  // 5. 记录活动窗口句柄
  lastActiveWindowHandle = systemTools.getForegroundWindow();

  // 6. 判断是否为真正的选中内容
  let finalText = '';
  // 检测整行复制的特征：
  // 1. 以换行符结尾
  // 2. 只有一行内容（不含换行符的情况下）
  // 3. 内容与原剪贴板相同（说明Ctrl+C没有效果）
  const isLineCopy = selectedText && (
    selectedText.endsWith('\n') ||
    selectedText.endsWith('\r\n') ||
    selectedText.endsWith('\r')
  );
  // 检查是否只是单行内容（去掉结尾换行后没有其他换行）
  const isSingleLineCopy = isLineCopy && !selectedText.trim().includes('\n');
  // 如果复制的内容与原剪贴板完全相同，可能是没有选中任何内容
  const isSameAsOriginal = selectedText && originalText && selectedText === originalText;

  console.log('[3] 是否整行复制:', isLineCopy, '单行:', isSingleLineCopy, '与原相同:', isSameAsOriginal);

  // 只有当：有内容、不是整行复制、不是单行自动复制、与原内容不同时，才使用选中内容
  if (selectedText && selectedText.trim() && !isSingleLineCopy && !isSameAsOriginal) {
    finalText = selectedText;
    console.log('[结果] => 使用选中内容');
  } else {
    if (originalText) {
      clipboard.writeText(originalText);
    }
    // 传递完整剪贴板内容，让前端决定如何使用
    finalText = originalText || '';
    console.log('[结果] => 恢复原剪贴板，传递完整内容');
  }
  console.log('==========================');

  // 7. 显示窗口
  if (mainWindow && mainWindow.isMinimized()) mainWindow.restore();

  if (targetAction && mainWindow) {
    mainWindow.webContents.send('trigger-smart-action', { action: targetAction, text: finalText });
  } else if (mainWindow) {
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
    mainWindow.webContents.send('clipboard-data', finalText);
  }
}

function registerGlobalShortcut(shortcut) {
  globalShortcut.unregisterAll();

  if (!shortcut) {
    console.warn('Attempted to register empty shortcut, using default Alt+Space');
    shortcut = 'Alt+Space';
  }

  try {
    const ret = globalShortcut.register(shortcut, () => {
      setTimeout(() => {
        activateApp(null, true);
      }, 100);
    });
    
    // 重新注册智能热键
    registerSmartHotkeys();
    // 重新注册自定义工具热键
    registerCustomHotkeys();

    if (!ret) {
      console.error(`${shortcut} 注册失败! 可能被其他软件占用。`);
    } else {
      console.log(`${shortcut} 注册成功`);
    }
  } catch (e) {
    console.error(`Register shortcut [${shortcut}] error:`, e);
  }
}

let cachedSmartHotkeys = {};
let cachedCustomHotkeys = {};

function registerSmartHotkeys() {
  for (const [action, key] of Object.entries(cachedSmartHotkeys)) {
    if (!key) continue;
    try {
      globalShortcut.register(key, () => {
        setTimeout(() => {
          activateApp(action, true);
        }, 100);
      });
    } catch (e) {
      console.error(`Failed to register ${key} for ${action}`);
    }
  }
}

// 注册自定义工具快捷键
function registerCustomHotkeys() {
  for (const [id, data] of Object.entries(cachedCustomHotkeys)) {
    if (!data.hotkey) continue;
    try {
      globalShortcut.register(data.hotkey, () => {
        const tool = data.tool;
        if (tool.type === 'file' && tool.path) {
          // 直接运行工具
          if (tool.path.startsWith('http')) {
            shell.openExternal(tool.path);
          } else if (tool.isAdmin && process.platform === 'win32') {
            const { exec } = require('child_process');
            const cmd = `powershell -Command "Start-Process '${tool.path}' -Verb RunAs"`;
            exec(cmd, (err) => {
              if (err) console.error('Admin Run Error:', err);
            });
          } else {
            shell.openPath(tool.path);
          }
        } else if (tool.type === 'builtin' && tool.action) {
          // 触发内置功能
          setTimeout(() => {
            activateApp(tool.action, true);
          }, 100);
        }
      });
      console.log(`Registered custom hotkey: ${data.hotkey} for ${data.tool.label}`);
    } catch (e) {
      console.error(`Failed to register custom hotkey ${data.hotkey}:`, e);
    }
  }
}

// 创建主窗口函数
async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 320,
    height: 600,
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
      nodeIntegration: false
    }
  })

  // 忽略证书错误
  app.commandLine.appendSwitch('ignore-certificate-errors');
  mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });

  console.log('[Main] Window created');

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
      registerGlobalShortcut(globalHotkey);
    } else {
      console.warn('Received invalid global hotkey:', newHotkey);
    }
  });
  
  ipcMain.on('update-smart-hotkeys', (event, hotkeys) => {
    cachedSmartHotkeys = hotkeys;
    registerGlobalShortcut(globalHotkey);
  });

  ipcMain.on('update-custom-hotkeys', (event, hotkeys) => {
    cachedCustomHotkeys = hotkeys;
    registerGlobalShortcut(globalHotkey);
  });

  // 1. 通用打开
  ipcMain.on('run-path', async (event, payload) => {
    const targetPath = typeof payload === 'string' ? payload : payload.path;
    const isAdmin = typeof payload === 'object' ? payload.isAdmin : false;

    try {
      if (targetPath.startsWith('http')) {
        await shell.openExternal(targetPath);
      } else if (isAdmin && process.platform === 'win32') {
         // Windows Run as Admin
         const { exec } = require('child_process');
         // 使用 PowerShell 启动以获得管理员权限
         const cmd = `powershell -Command "Start-Process '${targetPath}' -Verb RunAs"`;
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
    }, 100);
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
    // 关闭之前的提醒窗口
    if (alarmWindow && !alarmWindow.isDestroyed()) {
      alarmWindow.close();
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

  // 写入剪贴板
  ipcMain.on('write-clipboard', (event, text) => {
    clipboard.writeText(text);
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
  app.whenReady().then(() => {
    // 初始化密钥管理器
    secretManager.init();

    // 1. 定义资源路径
    const projectRoot = join(__dirname, '../../');
    const resourceIconPath = join(projectRoot, 'resources/icon-16.png');
    const resourceDisabledPath = join(projectRoot, 'resources/icon-disabled-16.png');

    console.log('[Main] Project Root:', projectRoot);
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

    // 4. 创建窗口 (此时 normalIconImage 一定有值)
    createWindow()

    // 5. 创建托盘
    try {
        // 先销毁旧的 (如果有)
        if (tray) tray.destroy();

        tray = new Tray(normalIconImage);
        tray.setToolTip('QuickerUse');
        tray.setIgnoreDoubleClickEvents(false); // 允许双击事件
        
        const contextMenu = Menu.buildFromTemplate([
          { label: '退出', click: () => app.quit() }
        ]);
        tray.setContextMenu(contextMenu);

        tray.on('double-click', () => {
          isAppDisabled = !isAppDisabled;
          updateTrayIcon();
          console.log(`App ${isAppDisabled ? 'Disabled' : 'Enabled'}`);
        });
        
        console.log('[Main] Tray created successfully');
    } catch (err) {
        console.error('[Main] FAILED to create Tray:', err);
    }

    registerGlobalShortcut(globalHotkey);

    // 启动鼠标中键监听 (仅Windows)
    if (process.platform === 'win32') {
      try {
        console.log('Starting MouseHook:', mouseHookPath);
        mouseHookProc = spawn(mouseHookPath);

        mouseHookProc.stdout.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg.includes('MIDDLE_CLICK')) {
            console.log('Middle Click Detected');
            activateApp();
          }
        });

        mouseHookProc.on('error', (err) => {
          console.error('MouseHook Error:', err);
        });

        mouseHookProc.on('close', (code) => {
           console.log('MouseHook exited with code:', code);
        });

      } catch (e) {
        console.error('Failed to start MouseHook:', e);
      }
    } else {
      console.log('[Main] MouseHook skipped on non-Windows platform');
    }

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (mouseHookProc) {
    mouseHookProc.kill();
  }
})
