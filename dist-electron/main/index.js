"use strict";
const electron = require("electron");
const path$1 = require("path");
const child_process = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
function runPowershell(command) {
  const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command}"`;
  child_process.exec(psCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`执行出错: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`脚本错误: ${stderr}`);
      return;
    }
  });
}
const systemTools = {
  /**
   * 结束高占用进程 (示例：结束无响应的 Chrome 或 Node)
   * 实际使用需谨慎，最好传入 PID
   */
  killProcess(processName) {
    const cmd = `taskkill /F /IM "${processName}.exe"`;
    child_process.exec(cmd, (err) => {
      if (err) console.error("结束进程失败:", err);
    });
  },
  /**
   * 获取系统 Hosts 路径
   */
  getHostsPath() {
    return process.platform === "win32" ? "C:\\Windows\\System32\\drivers\\etc\\hosts" : "/etc/hosts";
  },
  /**
   * 切换 Hosts (需要管理员权限运行 App)
   * @param {string} content - 新的 Hosts 内容
   */
  switchHosts(content) {
    const hostsPath = this.getHostsPath();
    try {
      fs.copyFileSync(hostsPath, `${hostsPath}.bak`);
      fs.appendFileSync(hostsPath, `
# QuickerUse Added
${content}
`);
      return { success: true, message: "Hosts 已更新" };
    } catch (e) {
      return { success: false, message: "写入 Hosts 失败，请以管理员运行: " + e.message };
    }
  },
  /**
   * 模拟按键发送 (用于窗口控制)
   * 依赖 Windows Script Host
   * @param {string} keys - 按键代码 (如 "{LEFT}" 代表左箭头)
   */
  sendKeys(keys) {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${keys}')
    `;
    runPowershell(psScript);
  },
  /**
   * 窗口分屏控制 (Win + 方向键)
   * 注意：SendWait 无法直接发送 Win 键。
   * 替代方案：使用 PowerShell 调用 User32 API (较复杂) 或 简单的 Shell.Application
   * 
   * 简易版实现：这里演示控制 QuickerUse 自身的窗口位置，
   * 如果要控制"其他"窗口，最佳方式是打包一个小的 .exe 工具或使用 python 脚本。
   * 
   * 为了不引入复杂依赖，我们暂时只实现 "QuickerUse 自身位置控制" 或者 "简单的最小化所有窗口"。
   */
  windowAction(action) {
    if (action === "minimize-all") {
      const psScript = `(New-Object -ComObject Shell.Application).ToggleDesktop()`;
      runPowershell(psScript);
    }
  },
  /**
   * 模拟 Ctrl+C (复制) - 支持 Windows 和 macOS
   */
  simulateCopy() {
    if (process.platform === "win32") {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait('^c')
      `;
      runPowershell(psScript);
    } else if (process.platform === "darwin") {
      child_process.exec(`osascript -e 'tell application "System Events" to keystroke "c" using {command down}'`, (err) => {
        if (err) console.error("Mac 复制失败:", err);
      });
    }
  },
  /**
   * 锁定屏幕
   */
  lockScreen() {
    runPowershell("rundll32.exe user32.dll,LockWorkStation");
  },
  /**
   * 清空回收站
   */
  emptyTrash() {
    runPowershell("Clear-RecycleBin -Force -ErrorAction SilentlyContinue");
  }
};
function getScriptDir() {
  const dir = path$1.join(electron.app.getPath("documents"), "QuickerUse", "scripts");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
const scriptManager = {
  /**
   * 获取脚本列表
   * @returns {Array} 脚本信息列表
   */
  getScripts() {
    try {
      const scriptDir = getScriptDir();
      const files = fs.readdirSync(scriptDir);
      return files.filter((file) => /\.(bat|cmd|ps1|sh|py|js)$/i.test(file)).map((file) => ({
        name: file,
        path: path$1.join(scriptDir, file),
        type: path$1.extname(file).substring(1)
      }));
    } catch (e) {
      console.error("读取脚本目录失败:", e);
      return [];
    }
  },
  /**
   * 执行脚本
   * @param {string} scriptPath 脚本绝对路径
   */
  runScript(scriptPath) {
    if (!fs.existsSync(scriptPath)) return { success: false, message: "文件不存在" };
    let command = "";
    const ext = path$1.extname(scriptPath).toLowerCase();
    switch (ext) {
      case ".bat":
      case ".cmd":
        command = `"${scriptPath}"`;
        break;
      case ".ps1":
        command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
        break;
      case ".py":
        command = `python "${scriptPath}"`;
        break;
      case ".js":
        command = `node "${scriptPath}"`;
        break;
      case ".sh":
        command = `bash "${scriptPath}"`;
        break;
      default:
        command = `"${scriptPath}"`;
    }
    child_process.exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行脚本出错: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`脚本输出错误: ${stderr}`);
      }
      console.log(`脚本输出: ${stdout}`);
    });
    return { success: true, message: "脚本已启动" };
  },
  /**
   * 打开脚本文件夹
   */
  openFolder() {
    const scriptDir = getScriptDir();
    const cmd = process.platform === "win32" ? `explorer "${scriptDir}"` : `open "${scriptDir}"`;
    child_process.exec(cmd);
  }
};
let server = null;
const PORT = 54321;
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}
const fileServer = {
  /**
   * 启动文件分享服务
   * @param {string} filePath 文件绝对路径
   * @returns {string} 下载链接 URL
   */
  startShare(filePath) {
    if (server) {
      server.close();
    }
    const fileName = path$1.basename(filePath);
    server = http.createServer((req, res) => {
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    });
    server.listen(PORT);
    const ip = getLocalIP();
    return `http://${ip}:${PORT}`;
  },
  /**
   * 停止服务
   */
  stop() {
    if (server) {
      server.close();
      server = null;
    }
  }
};
const SECRETS_FILE = path$1.join(electron.app.getPath("userData"), "secrets.json");
let secretsCache = {};
function loadSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return;
  try {
    const rawData = JSON.parse(fs.readFileSync(SECRETS_FILE, "utf-8"));
    if (!electron.safeStorage.isEncryptionAvailable()) {
      console.warn("SafeStorage 加密不可用，无法解密数据");
      return;
    }
    for (const [key, hexStr] of Object.entries(rawData)) {
      try {
        const buffer = Buffer.from(hexStr, "hex");
        const decrypted = electron.safeStorage.decryptString(buffer);
        secretsCache[key] = decrypted;
      } catch (e) {
        console.error(`解密 key [${key}] 失败:`, e);
      }
    }
  } catch (e) {
    console.error("加载密钥文件失败:", e);
  }
}
function saveSecrets() {
  if (!electron.safeStorage.isEncryptionAvailable()) {
    console.error("SafeStorage 加密不可用，无法保存");
    return false;
  }
  const encryptedData = {};
  for (const [key, plainText] of Object.entries(secretsCache)) {
    try {
      const buffer = electron.safeStorage.encryptString(plainText);
      encryptedData[key] = buffer.toString("hex");
    } catch (e) {
      console.error(`加密 key [${key}] 失败:`, e);
    }
  }
  try {
    fs.writeFileSync(SECRETS_FILE, JSON.stringify(encryptedData, null, 2));
    return true;
  } catch (e) {
    console.error("写入密钥文件失败:", e);
    return false;
  }
}
loadSecrets();
const secretManager = {
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
    return electron.safeStorage.isEncryptionAvailable();
  }
};
let mainWindow = null;
let tray = null;
let isAppDisabled = false;
let globalHotkey = "Alt+Space";
let mouseHookProc = null;
const isDev = process.env.NODE_ENV === "development";
const iconPath = path$1.join(__dirname, "../../resources/icon.png");
const disabledIconPath = path$1.join(__dirname, "../../resources/icon-disabled.png");
const mouseHookPath = path$1.join(__dirname, "../../resources/MouseHook.exe");
function updateTrayIcon() {
  if (tray) {
    const icon = isAppDisabled ? disabledIconPath : iconPath;
    tray.setImage(electron.nativeImage.createFromPath(icon));
    tray.setToolTip(isAppDisabled ? "QuickerUse (已禁用)" : "QuickerUse");
  }
}
function activateApp(targetAction = null) {
  if (isAppDisabled) return;
  if (!targetAction && mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
    return;
  }
  const originalText = electron.clipboard.readText();
  electron.clipboard.clear();
  systemTools.simulateCopy();
  setTimeout(() => {
    let selectedText = electron.clipboard.readText();
    if (!selectedText) {
      electron.clipboard.writeText(originalText);
      selectedText = "";
    }
    if (mainWindow && mainWindow.isMinimized()) mainWindow.restore();
    if (targetAction && mainWindow) {
      mainWindow.webContents.send("trigger-smart-action", { action: targetAction, text: selectedText });
    } else if (mainWindow) {
      const { x, y } = electron.screen.getCursorScreenPoint();
      const [winW, winH] = mainWindow.getSize();
      const winX = x - Math.round(winW / 2);
      const winY = y;
      mainWindow.setPosition(winX, winY);
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.focus();
      mainWindow.webContents.send("clipboard-data", selectedText);
    }
  }, 200);
}
function registerGlobalShortcut(shortcut) {
  electron.globalShortcut.unregisterAll();
  const ret = electron.globalShortcut.register(shortcut, () => {
    activateApp();
  });
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
      electron.globalShortcut.register(key, () => {
        console.log(`Smart Hotkey Triggered: ${action}`);
        activateApp(action);
      });
    } catch (e) {
      console.error(`Failed to register ${key} for ${action}`);
    }
  }
}
async function createWindow() {
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow = new electron.BrowserWindow({
    width: 320,
    height: 665,
    frame: false,
    transparent: false,
    backgroundColor: "#1e1e1e",
    resizable: false,
    skipTaskbar: false,
    show: false,
    // [修改] 默认隐藏(托盘启动)
    webPreferences: {
      preload: path$1.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  electron.app.commandLine.appendSwitch("ignore-certificate-errors");
  mainWindow.webContents.on("certificate-error", (event, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
  console.log("[Main] Window created");
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    console.log("[Main] Loading Dev URL:", devServerUrl);
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path$1.join(__dirname, "../../dist/index.html"));
  }
  mainWindow.on("ready-to-show", () => {
  });
  electron.ipcMain.on("update-global-hotkey", (event, newHotkey) => {
    globalHotkey = newHotkey;
    registerGlobalShortcut(globalHotkey);
  });
  electron.ipcMain.on("update-smart-hotkeys", (event, hotkeys) => {
    cachedSmartHotkeys = hotkeys;
    registerGlobalShortcut(globalHotkey);
  });
  electron.ipcMain.on("run-path", async (event, targetPath) => {
    try {
      if (targetPath.startsWith("http")) {
        await electron.shell.openExternal(targetPath);
      } else {
        const err = await electron.shell.openPath(targetPath);
        if (err) console.error("打开路径失败:", err);
      }
    } catch (e) {
      console.error("Run path error:", e);
    }
  });
  electron.ipcMain.on("window-control", (event, { action }) => {
    if (!mainWindow) return;
    const { width: screenW, height: screenH } = electron.screen.getPrimaryDisplay().workAreaSize;
    switch (action) {
      case "left":
        mainWindow.setBounds({ x: 0, y: 0, width: Math.round(screenW / 2), height: screenH });
        break;
      case "right":
        mainWindow.setBounds({ x: Math.round(screenW / 2), y: 0, width: Math.round(screenW / 2), height: screenH });
        break;
      case "full":
        mainWindow.maximize();
        break;
      case "center":
        mainWindow.setSize(320, 650);
        mainWindow.center();
        break;
      case "pin":
        mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
        break;
      case "minimize":
        mainWindow.minimize();
        break;
      case "hide":
        mainWindow.hide();
        break;
    }
  });
  electron.ipcMain.on("system-action", (event, action) => {
    if (action === "lock-screen") systemTools.lockScreen();
    if (action === "empty-trash") systemTools.emptyTrash();
    if (action === "minimize-all") systemTools.windowAction("minimize-all");
    if (action === "kill-process") systemTools.killProcess("notepad");
    if (action === "switch-hosts") systemTools.switchHosts("127.0.0.1 quicker.local");
  });
  electron.ipcMain.on("script-action", (event, args) => {
    if (args.action === "get-list") event.reply("script-list", scriptManager.getScripts());
    if (args.action === "run") scriptManager.runScript(args.payload);
    if (args.action === "open-folder") scriptManager.openFolder();
  });
  electron.ipcMain.on("secret-action", (event, args) => {
    if (args.action === "list") event.reply("secret-list", secretManager.getAllKeys());
    if (args.action === "get") event.reply("secret-value", { key: args.key, value: secretManager.getItem(args.key) });
    if (args.action === "set") secretManager.setItem(args.key, args.value) && event.reply("secret-op-result", { success: true });
    if (args.action === "delete") secretManager.removeItem(args.key) && event.reply("secret-op-result", { success: true });
  });
  electron.ipcMain.on("file-server-action", (event, args) => {
    if (args.action === "start") event.reply("file-server-url", fileServer.startShare(args.payload));
  });
  electron.ipcMain.on("open-image-window", (event, url) => {
    let win = new electron.BrowserWindow({ width: 400, height: 300, frame: false, alwaysOnTop: true, webPreferences: { nodeIntegration: false } });
    win.loadURL(`data:text/html,<style>body{margin:0;background:black;display:flex;justify-content:center;align-items:center;height:100vh}img{max-width:100%;max-height:100%}</style><img src="${url}">`);
  });
  electron.ipcMain.on("minimize-window", () => mainWindow.minimize());
  electron.ipcMain.on("close-window", () => electron.app.quit());
  electron.ipcMain.on("hide-window", () => mainWindow.hide());
}
electron.app.whenReady().then(() => {
  createWindow();
  const iconsDir = path.join(electron.app.getPath("userData"), "icons");
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  const normalIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVDhP7YxBCgAgDMX8/6d7u3QJItok5iF4zdq2/7M25mDOzLw7iJiglEDvQG+CUgK9A70JSgn0DvQmKCXQO9CboJRA70BvglICvQO9CcoaG9cKAuQYl/JmAAAAAElFTkSuQmCC";
  const disabledIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVDhP7YxBCgAgDMPh/0/3dokaRJSF5iF4zdq2/7M25mDOzLw7iJiglEDvQG+CUgK9A70JSgn0DvQmKCXQO9CboJRA70BvglICvQO9CcoaG9cK8+Iq+1oAAAAASUVORK5CYII=";
  fs.writeFileSync(path.join(iconsDir, "icon.png"), Buffer.from(normalIconBase64, "base64"));
  fs.writeFileSync(path.join(iconsDir, "icon-disabled.png"), Buffer.from(disabledIconBase64, "base64"));
  iconPath = path.join(iconsDir, "icon.png");
  disabledIconPath = path.join(iconsDir, "icon-disabled.png");
  tray = new electron.Tray(electron.nativeImage.createFromPath(iconPath));
  tray.setToolTip("QuickerUse");
  const contextMenu = electron.Menu.buildFromTemplate([
    { label: "退出", click: () => electron.app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    isAppDisabled = !isAppDisabled;
    updateTrayIcon();
    console.log(`App ${isAppDisabled ? "Disabled" : "Enabled"}`);
  });
  registerGlobalShortcut(globalHotkey);
  try {
    console.log("Starting MouseHook:", mouseHookPath);
    mouseHookProc = child_process.spawn(mouseHookPath);
    mouseHookProc.stdout.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg.includes("MIDDLE_CLICK")) {
        console.log("Middle Click Detected");
        activateApp();
      }
    });
    mouseHookProc.on("error", (err) => {
      console.error("MouseHook Error:", err);
    });
    mouseHookProc.on("close", (code) => {
      console.log("MouseHook exited with code:", code);
    });
  } catch (e) {
    console.error("Failed to start MouseHook:", e);
  }
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
  if (mouseHookProc) {
    mouseHookProc.kill();
  }
});
