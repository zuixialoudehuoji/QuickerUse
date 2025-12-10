// electron/main/fileServer.js
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

let server = null;
const PORT = 54321; // 固定端口

/**
 * 获取本机局域网 IP
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部 IP 和非 IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

export default {
  /**
   * 启动文件分享服务
   * @param {string} filePath 文件绝对路径
   * @returns {string} 下载链接 URL
   */
  startShare(filePath) {
    // 如果已有服务在运行，先关闭
    if (server) {
      server.close();
    }

    const fileName = path.basename(filePath);
    
    server = http.createServer((req, res) => {
      // 只允许下载指定文件
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // 下载完成后关闭服务 (一次性分享)
      // res.on('finish', () => { setTimeout(() => server.close(), 1000); });
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
