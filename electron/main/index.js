// electron/main/index.js (主进程文件)
import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard, shell, Tray, Menu, nativeImage } from 'electron'
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
    if (startMinimized === false) {
       mainWindow.show();
    }
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
  ipcMain.on('get-file-icon', async (event, path) => {
    try {
      const icon = await app.getFileIcon(path, { size: 'normal' });
      event.reply('file-icon-data', { path, icon: icon.toDataURL() });
    } catch (e) {
      console.error('Failed to get icon:', e);
      // 失败返回 null
      event.reply('file-icon-data', { path, icon: null });
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

  ipcMain.on('config-action', (event, args) => {
    if (args.action === 'get') event.reply('config-data', { key: args.key, value: configManager.get(args.key) });
    if (args.action === 'getAll') event.reply('config-data', configManager.getAll());
    if (args.action === 'set') {
      configManager.set(args.key, args.value);
      event.reply('config-data', configManager.getAll());
    }
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
