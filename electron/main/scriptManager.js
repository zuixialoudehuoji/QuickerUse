// electron/main/scriptManager.js
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { exec } from 'child_process';
import iconv from 'iconv-lite';

// 默认脚本目录: 用户文档/QuickerUse/scripts
// const SCRIPT_DIR = path.join(app.getPath('documents'), 'QuickerUse', 'scripts'); // [修复] 移除顶层调用

function getScriptDir() {
  const dir = path.join(app.getPath('documents'), 'QuickerUse', 'scripts');
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export default {
  /**
   * 获取脚本列表
   * @returns {Array} 脚本信息列表
   */
  getScripts() {
    try {
      const scriptDir = getScriptDir();
      const files = fs.readdirSync(scriptDir);
      return files
        .filter(file => /\.(bat|cmd|ps1|sh|py|js)$/i.test(file)) // 仅限可执行脚本
        .map(file => ({
          name: file,
          path: path.join(scriptDir, file),
          type: path.extname(file).substring(1)
        }));
    } catch (e) {
      console.error('读取脚本目录失败:', e);
      return [];
    }
  },

  /**
   * 执行脚本
   * @param {string} scriptPath 脚本绝对路径
   */
  runScript(scriptPath) {
    if (!fs.existsSync(scriptPath)) return { success: false, message: '文件不存在' };
    // ...


    let command = '';
    const ext = path.extname(scriptPath).toLowerCase();

    // 根据扩展名决定执行方式
    switch (ext) {
      case '.bat':
      case '.cmd':
        command = `"${scriptPath}"`;
        break;
      case '.ps1':
        command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
        break;
      case '.py':
        command = `python "${scriptPath}"`;
        break;
      case '.js':
        command = `node "${scriptPath}"`;
        break;
      case '.sh':
        command = `bash "${scriptPath}"`;
        break;
      default:
        // 尝试直接打开
        command = `"${scriptPath}"`;
    }

    // 执行
    exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
      if (error) {
        const errorMsg = iconv.decode(stderr || stdout, 'cp936');
        console.error(`执行脚本出错: ${error.message}`);
        console.error(`详细错误: ${errorMsg}`);
        return;
      }
      
      const outStr = iconv.decode(stdout, 'cp936');
      const errStr = iconv.decode(stderr, 'cp936');

      if (errStr) {
        console.error(`脚本输出错误: ${errStr}`);
      }
      console.log(`脚本输出: ${outStr}`);
    });

    return { success: true, message: '脚本已启动' };
  },

  /**
   * 打开脚本文件夹
   */
  openFolder() {
    const scriptDir = getScriptDir();
    const cmd = process.platform === 'win32' ? `explorer "${scriptDir}"` : `open "${scriptDir}"`;
    exec(cmd);
  }
};
