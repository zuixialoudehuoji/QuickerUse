// electron/main/index.js (主进程文件)
import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard, shell, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process' 
import fs from 'fs' // [新增]
import systemTools from './systemTools' 
import scriptManager from './scriptManager' 
import fileServer from './fileServer' 
import secretManager from './secretManager' 

// 定义主窗口实例
let mainWindow = null
let tray = null
let isAppDisabled = false
let globalHotkey = 'Alt+Space'
let mouseHookProc = null 

// 开发模式判断
const isDev = process.env.NODE_ENV === 'development'

// 资源路径
const iconPath = join(__dirname, '../../resources/icon.png');
const disabledIconPath = join(__dirname, '../../resources/icon-disabled.png');
const mouseHookPath = join(__dirname, '../../resources/MouseHook.exe');

function updateTrayIcon() {
  if (tray) {
    const icon = isAppDisabled ? disabledIconPath : iconPath;
    tray.setImage(nativeImage.createFromPath(icon));
    tray.setToolTip(isAppDisabled ? 'QuickerUse (已禁用)' : 'QuickerUse');
  }
}

// 核心唤醒逻辑 (被热键和鼠标中键共用)
function activateApp(targetAction = null) {
  if (isAppDisabled) return;

  // 如果只是唤醒(targetAction=null)且窗口已显示，则隐藏
  if (!targetAction && mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
    return;
  }

  // 1. 备份并清空剪贴板
  const originalText = clipboard.readText();
  clipboard.clear();

  // 2. 尝试触发复制
  systemTools.simulateCopy();

  // 3. 延时等待复制完成
  setTimeout(() => {
    let selectedText = clipboard.readText();
    
    if (!selectedText) {
      clipboard.writeText(originalText);
      selectedText = ''; 
    }

    if (mainWindow && mainWindow.isMinimized()) mainWindow.restore();
    
    // 如果是特定动作，不需要显示主窗口，直接执行
    if (targetAction && mainWindow) {
      mainWindow.webContents.send('trigger-smart-action', { action: targetAction, text: selectedText });
    } else if (mainWindow) {
      // 获取鼠标位置并跟随
      const { x, y } = screen.getCursorScreenPoint();
      const [winW, winH] = mainWindow.getSize();
      // 计算窗口左上角位置，使窗口水平中心对准鼠标，上边界对准鼠标
      const winX = x - Math.round(winW / 2);
      const winY = y; // 窗口上边界与鼠标Y坐标对齐
      
      mainWindow.setPosition(winX, winY);
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false); 
      mainWindow.focus();
      mainWindow.webContents.send('clipboard-data', selectedText);
    }
  }, 200); 
}

function registerGlobalShortcut(shortcut) {
  globalShortcut.unregisterAll();

  const ret = globalShortcut.register(shortcut, () => {
    activateApp();
  });
  
  // 重新注册智能热键
  registerSmartHotkeys();

  if (!ret) {
    console.error(`${shortcut} 注册失败! 可能被其他软件占用。`);
  } else {
    console.log(`${shortcut} 注册成功`);
  }
}

let cachedSmartHotkeys = {};

function registerSmartHotkeys() {
  for (const [action, key] of Object.entries(cachedSmartHotkeys)) {
    if (!key) continue;
    try {
      globalShortcut.register(key, () => {
        console.log(`Smart Hotkey Triggered: ${action}`);
        activateApp(action);
      });
    } catch (e) {
      console.error(`Failed to register ${key} for ${action}`);
    }
  }
}

// 创建主窗口函数
async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 320, 
    height: 665,
    frame: false, 
    transparent: false,
    backgroundColor: '#1e1e1e',
    resizable: false,
    skipTaskbar: false, 
    show: false, // [修改] 默认隐藏(托盘启动)
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false 
    }
  })

  // [修复] 忽略证书错误
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
    // mainWindow.show() // [修改] 不再自动显示
  })

  // === IPC 处理逻辑 ===

  // 0. 热键管理
  ipcMain.on('update-global-hotkey', (event, newHotkey) => {
    globalHotkey = newHotkey;
    registerGlobalShortcut(globalHotkey);
  });
  
  ipcMain.on('update-smart-hotkeys', (event, hotkeys) => {
    cachedSmartHotkeys = hotkeys;
    registerGlobalShortcut(globalHotkey);
  });

  // 1. 通用打开
  ipcMain.on('run-path', async (event, targetPath) => {
    try {
      if (targetPath.startsWith('http')) {
        await shell.openExternal(targetPath);
      } else {
        const err = await shell.openPath(targetPath);
        if (err) console.error('打开路径失败:', err);
      }
    } catch (e) {
      console.error('Run path error:', e);
    }
  });

  // 2. 窗口控制
  ipcMain.on('window-control', (event, { action }) => {
    if (!mainWindow) return;
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
    
    switch (action) {
      case 'left': mainWindow.setBounds({ x: 0, y: 0, width: Math.round(screenW/2), height: screenH }); break;
      case 'right': mainWindow.setBounds({ x: Math.round(screenW/2), y: 0, width: Math.round(screenW/2), height: screenH }); break;
      case 'full': mainWindow.maximize(); break;
      case 'center': mainWindow.setSize(320, 650); mainWindow.center(); break;
      case 'pin': mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop()); break;
      case 'minimize': mainWindow.minimize(); break;
      case 'hide': mainWindow.hide(); break;
    }
  });

  // 3. 系统操作
  ipcMain.on('system-action', (event, action) => {
    if (action === 'lock-screen') systemTools.lockScreen();
    if (action === 'empty-trash') systemTools.emptyTrash();
    if (action === 'minimize-all') systemTools.windowAction('minimize-all');
    if (action === 'kill-process') systemTools.killProcess('notepad'); 
    if (action === 'switch-hosts') systemTools.switchHosts('127.0.0.1 quicker.local');
  });

  // 4. 其他服务
  ipcMain.on('script-action', (event, args) => {
    if (args.action === 'get-list') event.reply('script-list', scriptManager.getScripts());
    if (args.action === 'run') scriptManager.runScript(args.payload);
    if (args.action === 'open-folder') scriptManager.openFolder();
  });

  ipcMain.on('secret-action', (event, args) => {
    if (args.action === 'list') event.reply('secret-list', secretManager.getAllKeys());
    if (args.action === 'get') event.reply('secret-value', { key: args.key, value: secretManager.getItem(args.key) });
    if (args.action === 'set') secretManager.setItem(args.key, args.value) && event.reply('secret-op-result', { success: true });
    if (args.action === 'delete') secretManager.removeItem(args.key) && event.reply('secret-op-result', { success: true });
  });

  ipcMain.on('file-server-action', (event, args) => {
    if (args.action === 'start') event.reply('file-server-url', fileServer.startShare(args.payload));
  });
  
  ipcMain.on('open-image-window', (event, url) => {
    let win = new BrowserWindow({ width: 400, height: 300, frame: false, alwaysOnTop: true, webPreferences: { nodeIntegration: false } });
    win.loadURL(`data:text/html,<style>body{margin:0;background:black;display:flex;justify-content:center;align-items:center;height:100vh}img{max-width:100%;max-height:100%}</style><img src="${url}">`);
  });

  // 兼容接口
  ipcMain.on('minimize-window', () => mainWindow.minimize());
  ipcMain.on('close-window', () => app.quit());
  ipcMain.on('hide-window', () => mainWindow.hide());
}

// Electron应用准备就绪
app.whenReady().then(() => {
  createWindow()

  // [修改] 确保图标路径在生产环境正确
  const iconsDir = path.join(app.getPath('userData'), 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 绿色圆点 (正常) Base64
  const normalIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVDhP7YxBCgAgDMX8/6d7u3QJItok5iF4zdq2/7M25mDOzLw7iJiglEDvQG+CUgK9A70JSgn0DvQmKCXQO9CboJRA70BvglICvQO9CcoaG9cKAuQYl/JmAAAAAElFTkSuQmCC';
  // 灰色圆点 (禁用) Base64
  const disabledIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVDhP7YxBCgAgDMPh/0/3dokaRJSF5iF4zdq2/7M25mDOzLw7iJiglEDvQG+CUgK9A70JSgn0DvQmKCXQO9CboJRA70BvglICvQO9CcoaG9cK8+Iq+1oAAAAASUVORK5CYII=';

  fs.writeFileSync(path.join(iconsDir, 'icon.png'), Buffer.from(normalIconBase64, 'base64'));
  fs.writeFileSync(path.join(iconsDir, 'icon-disabled.png'), Buffer.from(disabledIconBase64, 'base64'));

  iconPath = path.join(iconsDir, 'icon.png');
  disabledIconPath = path.join(iconsDir, 'icon-disabled.png');

  // 托盘图标
  tray = new Tray(nativeImage.createFromPath(iconPath));
  tray.setToolTip('QuickerUse');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '退出', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    isAppDisabled = !isAppDisabled;
    updateTrayIcon();
    console.log(`App ${isAppDisabled ? 'Disabled' : 'Enabled'}`);
  });

  registerGlobalShortcut(globalHotkey);

  // 启动鼠标中键监听
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

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