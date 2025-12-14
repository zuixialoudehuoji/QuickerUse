// electron/preload/index.js (预加载脚本)
import { contextBridge, ipcRenderer } from 'electron'

// 暴露一个安全的API给渲染进程
// 渲染进程可以通过 window.api.xxx 调用主进程功能
contextBridge.exposeInMainWorld('api', {
  /**
   * 隐藏主窗口
   */
  hideWindow: () => ipcRenderer.send('hide-window'),
  
  /**
   * 显示主窗口，可指定位置
   * @param {number} [x] - 窗口X坐标
   * @param {number} [y] - 窗口Y坐标
   */
  showWindow: (x, y) => ipcRenderer.send('show-window', { x, y }),

  /**
   * 最小化主窗口
   */
  minimizeWindow: () => ipcRenderer.send('minimize-window'),

  /**
   * 关闭主窗口/退出应用
   */
  closeWindow: () => ipcRenderer.send('close-window'),

  /**
   * 从主进程接收消息的监听器
   * @param {string} channel - 通道名称
   * @param {Function} listener - 监听回调函数
   */
  on: (channel, listener) => {
    // 确保只监听允许的通道，增加安全性
    const validChannels = ['main-process-message', 'clipboard-data', 'window-pinned', 'script-list', 'file-server-url', 'secret-status', 'secret-op-result', 'secret-value', 'secret-list', 'trigger-smart-action', 'config-data', 'file-icon-data']; 
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => listener(...args));
    }
  },

  /**
   * 从主进程接收一次性消息的监听器
   * @param {string} channel - 通道名称
   * @param {Function} listener - 监听回调函数
   */
  once: (channel, listener) => {
    const validChannels = ['main-process-message', 'file-icon-data'];
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => listener(...args));
    }
  },

  /**
   * 向主进程发送异步消息
   * @param {string} channel - 通道名称
   * @param {...any} args - 传递给主进程的参数
   */
  send: (channel, ...args) => {
    const validChannels = ['to-main-process', 'hide-window', 'show-window', 'minimize-window', 'close-window', 'system-action', 'window-control', 'set-window-size', 'script-action', 'file-server-action', 'secret-action', 'open-image-window', 'run-path', 'update-global-hotkey', 'update-smart-hotkeys', 'config-action', 'get-file-icon']; // 允许渲染进程发送消息的通道
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  // ... 更多功能将在此处暴露 ...
});
