// electron/main/systemTools.js
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// 使用 createRequire 加载原生模块
const require = createRequire(import.meta.url);

// 尝试加载 robotjs
let robot = null;
try {
  robot = require('robotjs');
  console.log('[SystemTools] robotjs loaded successfully');
} catch (e) {
  console.warn('[SystemTools] robotjs not available:', e.message);
}

/**
 * 执行 Windows PowerShell 脚本
 * @param {string} command - PowerShell 命令
 * @returns {Promise<string>} - 命令输出
 */
function runPowershell(command) {
  return new Promise((resolve, reject) => {
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`;
    exec(psCommand, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行出错: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`脚本错误: ${stderr}`);
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * 同步执行PowerShell并返回结果
 */
function runPowershellSync(command) {
  try {
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`;
    return execSync(psCommand, { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('PowerShell sync error:', e);
    return null;
  }
}

/**
 * 系统工具集
 */
export default {
  /**
   * 获取当前前台窗口句柄
   * @returns {string|null} 窗口句柄
   */
  getForegroundWindow() {
    if (process.platform !== 'win32') return null;

    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Win32 {
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
      }
"@
      [Win32]::GetForegroundWindow().ToInt64()
    `;

    try {
      const result = runPowershellSync(script);
      return result;
    } catch (e) {
      console.error('获取前台窗口失败:', e);
      return null;
    }
  },

  /**
   * 获取前台窗口的进程名（用于智能环境感知）
   * @returns {string|null} 进程名（如 "code", "chrome"）
   */
  getForegroundProcessName() {
    if (process.platform !== 'win32') return null;

    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      using System.Diagnostics;
      public class Win32Proc {
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
      }
"@
      $hwnd = [Win32Proc]::GetForegroundWindow()
      $pid = 0
      [Win32Proc]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
      if ($pid -gt 0) {
        try {
          (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
        } catch {}
      }
    `;

    try {
      const result = runPowershellSync(script);
      return result || null;
    } catch (e) {
      console.error('获取前台进程名失败:', e);
      return null;
    }
  },

  /**
   * 通过句柄操作指定窗口
   * @param {string} hwnd - 窗口句柄
   * @param {string} action - 操作类型
   */
  windowActionByHandle(hwnd, action) {
    if (process.platform !== 'win32' || !hwnd) return;

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $code = @"
      using System;
      using System.Runtime.InteropServices;
      public class Win32 {
        [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
        [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
        public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
      }
"@
      Add-Type $code

      $hwnd = [IntPtr]${hwnd}
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
      $w = $screen.Width
      $h = $screen.Height

      # 先激活窗口
      [Win32]::SetForegroundWindow($hwnd)

      if ("${action}" -eq "maximize" -or "${action}" -eq "full") {
        [Win32]::ShowWindowAsync($hwnd, 3)  # SW_MAXIMIZE
      }
      elseif ("${action}" -eq "restore") {
        [Win32]::ShowWindowAsync($hwnd, 9)  # SW_RESTORE
      }
      elseif ("${action}" -eq "left") {
        [Win32]::ShowWindowAsync($hwnd, 9)
        Start-Sleep -Milliseconds 50
        [Win32]::MoveWindow($hwnd, 0, 0, $w/2, $h, $true)
      }
      elseif ("${action}" -eq "right") {
        [Win32]::ShowWindowAsync($hwnd, 9)
        Start-Sleep -Milliseconds 50
        [Win32]::MoveWindow($hwnd, $w/2, 0, $w/2, $h, $true)
      }
      elseif ("${action}" -eq "pin") {
        # 置顶窗口
        [Win32]::SetWindowPos($hwnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, 0x0003)
      }
      elseif ("${action}" -eq "unpin") {
        # 取消置顶
        [Win32]::SetWindowPos($hwnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0, 0x0003)
      }
    `;

    runPowershell(psScript).catch(e => console.error('窗口操作失败:', e));
  },

  /**
   * 结束高占用进程
   */
  killProcess(processName) {
    const cmd = `taskkill /F /IM "${processName}.exe"`;
    exec(cmd, (err) => {
      if (err) console.error('结束进程失败:', err);
    });
  },

  /**
   * 获取系统 Hosts 路径
   */
  getHostsPath() {
    return process.platform === 'win32'
      ? 'C:\\Windows\\System32\\drivers\\etc\\hosts'
      : '/etc/hosts';
  },

  /**
   * 打开 Hosts 文件所在目录
   */
  openHostsFolder() {
    const hostsPath = this.getHostsPath();
    const hostsDir = path.dirname(hostsPath);
    if (process.platform === 'win32') {
      exec(`explorer "${hostsDir}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${hostsDir}"`);
    } else {
      exec(`xdg-open "${hostsDir}"`);
    }
    return { success: true, message: '已打开 Hosts 目录' };
  },

  /**
   * 切换 Hosts (需要管理员权限)
   */
  switchHosts(content) {
    // 如果没有传入内容，默认打开 hosts 目录
    if (!content || content === '127.0.0.1 quicker.local') {
      return this.openHostsFolder();
    }
    const hostsPath = this.getHostsPath();
    try {
      fs.copyFileSync(hostsPath, `${hostsPath}.bak`);
      fs.appendFileSync(hostsPath, `\n# QuickerUse Added\n${content}\n`);
      return { success: true, message: 'Hosts 已更新' };
    } catch (e) {
      return { success: false, message: '写入 Hosts 失败，请以管理员运行: ' + e.message };
    }
  },

  /**
   * 模拟按键发送
   */
  sendKeys(keys) {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${keys}')
    `;
    runPowershell(psScript);
  },

  /**
   * 窗口分屏控制 (操作当前活动窗口)
   */
  windowAction(action) {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $code = @"
      using System;
      using System.Runtime.InteropServices;
      public class Win32 {
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
      }
"@
      Add-Type $code

      $hwnd = [Win32]::GetForegroundWindow()
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
      $w = $screen.Width
      $h = $screen.Height

      if ("${action}" -eq "maximize") {
        [Win32]::ShowWindowAsync($hwnd, 3)
      }
      elseif ("${action}" -eq "restore") {
        [Win32]::ShowWindowAsync($hwnd, 9)
      }
      elseif ("${action}" -eq "left") {
        [Win32]::ShowWindowAsync($hwnd, 9)
        [Win32]::MoveWindow($hwnd, 0, 0, $w/2, $h, $true)
      }
      elseif ("${action}" -eq "right") {
        [Win32]::ShowWindowAsync($hwnd, 9)
        [Win32]::MoveWindow($hwnd, $w/2, 0, $w/2, $h, $true)
      }
      elseif ("${action}" -eq "minimize-all") {
        (New-Object -ComObject Shell.Application).ToggleDesktop()
      }
    `;
    runPowershell(psScript);
  },

  /**
   * 激活指定窗口
   * @param {string} hwnd - 窗口句柄
   */
  activateWindow(hwnd) {
    if (process.platform !== 'win32' || !hwnd) return;
    try {
      execSync(`powershell -NoProfile -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W { [DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr h); }'; [W]::SetForegroundWindow([IntPtr]${hwnd})"`, {
        encoding: 'utf8',
        timeout: 500,
        windowsHide: true
      });
    } catch (e) {}
  },

  /**
   * 模拟 Ctrl+C (复制) - 使用 robotjs（超快）
   * @param {boolean} fromHotkey - 是否从快捷键触发（需要额外处理）
   */
  simulateCopy(fromHotkey = false) {
    if (process.platform === 'win32') {
      if (robot) {
        try {
          // 先释放所有可能被按住的修饰键
          robot.keyToggle('alt', 'up');
          robot.keyToggle('shift', 'up');
          robot.keyToggle('control', 'up');

          // 如果是从快捷键触发，需要先按 Escape 关闭可能打开的系统菜单
          if (fromHotkey) {
            robot.keyTap('escape');
            // 等待菜单关闭
            const start = Date.now();
            while (Date.now() - start < 30) {}
          }

          // 发送 Ctrl+C
          robot.keyTap('c', 'control');
          return;
        } catch (e) {
          console.error('robotjs error:', e.message);
        }
      }
      // 备用方案
      try {
        execSync('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^c\')"', {
          encoding: 'utf8',
          timeout: 1000,
          windowsHide: true
        });
      } catch (e) {}
    } else if (process.platform === 'darwin') {
      if (robot) {
        try {
          robot.keyTap('c', 'command');
          return;
        } catch (e) {}
      }
    }
  },

  /**
   * 模拟 Ctrl+V (粘贴) - 使用 robotjs
   */
  simulatePaste() {
    if (process.platform === 'win32') {
      if (robot) {
        try {
          // 先释放所有可能被按住的修饰键
          robot.keyToggle('alt', 'up');
          robot.keyToggle('shift', 'up');
          robot.keyToggle('control', 'up');

          // 发送 Ctrl+V
          robot.keyTap('v', 'control');
          return;
        } catch (e) {
          console.error('robotjs paste error:', e.message);
        }
      }
      // 备用方案
      try {
        execSync('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"', {
          encoding: 'utf8',
          timeout: 1000,
          windowsHide: true
        });
      } catch (e) {}
    } else if (process.platform === 'darwin') {
      if (robot) {
        try {
          robot.keyTap('v', 'command');
          return;
        } catch (e) {}
      }
    }
  },

  /**
   * 锁定屏幕
   */
  lockScreen() {
    runPowershell('rundll32.exe user32.dll,LockWorkStation');
  },

  /**
   * 清空回收站
   */
  emptyTrash() {
    runPowershell('Clear-RecycleBin -Force -ErrorAction SilentlyContinue');
  },

  /**
   * 自动连点器
   * @param {number} interval - 点击间隔(毫秒)
   * @param {number} count - 点击次数
   */
  autoClicker(interval = 100, count = 10) {
    const psScript = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
        public const int MOUSEEVENTF_LEFTDOWN = 0x02;
        public const int MOUSEEVENTF_LEFTUP = 0x04;
      }
"@
      for ($i = 0; $i -lt ${count}; $i++) {
        [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
        Start-Sleep -Milliseconds ${interval}
      }
    `;
    runPowershell(psScript);
  }
};
