// electron/main/systemTools.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 执行 Windows PowerShell 脚本
 * @param {string} command - PowerShell 命令
 */
function runPowershell(command) {
  const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command}"`;
  exec(psCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`执行出错: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`脚本错误: ${stderr}`);
      return;
    }
    // console.log(`输出: ${stdout}`);
  });
}

/**
 * 系统工具集
 */
export default {
  /**
   * 结束高占用进程 (示例：结束无响应的 Chrome 或 Node)
   * 实际使用需谨慎，最好传入 PID
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
   * 切换 Hosts (需要管理员权限运行 App)
   * @param {string} content - 新的 Hosts 内容
   */
  switchHosts(content) {
    const hostsPath = this.getHostsPath();
    try {
      // 备份当前 hosts
      fs.copyFileSync(hostsPath, `${hostsPath}.bak`);
      // 写入新内容 (追加或覆盖，这里演示追加测试条目)
      // 注意：Electron 开发环境下可能无权限写入 C 盘系统目录，需以管理员启动
      fs.appendFileSync(hostsPath, `\n# QuickerUse Added\n${content}\n`);
      return { success: true, message: 'Hosts 已更新' };
    } catch (e) {
      return { success: false, message: '写入 Hosts 失败，请以管理员运行: ' + e.message };
    }
  },

  /**
   * 模拟按键发送 (用于窗口控制)
   * 依赖 Windows Script Host
   * @param {string} keys - 按键代码 (如 "{LEFT}" 代表左箭头)
   */
  sendKeys(keys) {
    // 使用 WScript.Shell 发送键盘快捷键
    // Win键通常很难直接通过 SendKeys 发送，这里使用一种变通方法
    // 或者直接调用 User32.dll (需要编译C++)。
    // 考虑到无依赖环境，我们尝试使用 PowerShell 模拟按键
    
    // 方案：使用 PowerShell 加载 .NET 类库 System.Windows.Forms.SendKeys
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
    if (action === 'minimize-all') {
      // 显示桌面 (Win + D)
      const psScript = `(New-Object -ComObject Shell.Application).ToggleDesktop()`;
      runPowershell(psScript);
    }
    // 更多复杂窗口控制需要 native 模块，暂略
  },

  /**
   * 模拟 Ctrl+C (复制) - 支持 Windows 和 macOS
   */
  simulateCopy() {
    if (process.platform === 'win32') {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait('^c')
      `;
      runPowershell(psScript);
    } else if (process.platform === 'darwin') {
      exec(`osascript -e 'tell application "System Events" to keystroke "c" using {command down}'`, (err) => {
        if (err) console.error('Mac 复制失败:', err);
      });
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
    // PowerShell 清空回收站
    runPowershell('Clear-RecycleBin -Force -ErrorAction SilentlyContinue');
  }
};
