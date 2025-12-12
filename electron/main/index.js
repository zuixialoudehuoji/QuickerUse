// electron/main/index.js (主进程文件)
import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard, shell, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process' 
import fs from 'fs' 
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
    // mainWindow.show() // 不再自动显示
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
    
    // 1. 定义资源路径 (针对开发环境和生产环境可能不同，这里尝试从项目根目录找)
    // 注意：__dirname 在 dist-electron/main 中
    const projectRoot = join(__dirname, '../../'); 
    const resourceIconPath = join(projectRoot, 'resources/icon.png');
    const resourceDisabledPath = join(projectRoot, 'resources/icon-disabled.png');

    console.log('[Main] Project Root inferred as:', projectRoot);
    console.log('[Main] Looking for icon at:', resourceIconPath);

    // 2. 准备兜底图标 (32x32 红色方块) - 确保绝对可用
    const fallbackIconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABISURBVFhH7coxDQAACAOg9A/iFuuCB0zC2ZqZt9/Z+wUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFwFyGngX1090KyAAAAABJRU5ErkJggg==';
    
    // 3. 加载图标逻辑
    try {
      if (fs.existsSync(resourceIconPath)) {
        console.log('[Main] File exists. Loading...');
        normalIconImage = nativeImage.createFromPath(resourceIconPath);
        
        if (normalIconImage.isEmpty()) {
           console.error('[Main] ERROR: Icon file exists but loaded image is EMPTY!');
           normalIconImage = nativeImage.createFromDataURL(fallbackIconDataUrl);
        } else {
           console.log('[Main] Icon loaded successfully. Size:', normalIconImage.getSize());
        }
      } else {
        console.error('[Main] ERROR: Icon file NOT found at:', resourceIconPath);
        normalIconImage = nativeImage.createFromDataURL(fallbackIconDataUrl);
      }
      
      // 加载禁用图标 (类似逻辑)
      if (fs.existsSync(resourceDisabledPath)) {
        disabledIconImage = nativeImage.createFromPath(resourceDisabledPath);
      }
      if (!disabledIconImage || disabledIconImage.isEmpty()) {
        disabledIconImage = nativeImage.createFromDataURL(fallbackIconDataUrl);
      }

    } catch (e) {
      console.error('[Main] EXCEPTION during icon load:', e);
      normalIconImage = nativeImage.createFromDataURL(fallbackIconDataUrl);
    }

    // 4. 创建窗口 (此时 normalIconImage 一定有值)
    createWindow()

    // 5. 创建托盘
    try {
        tray = new Tray(normalIconImage);
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
