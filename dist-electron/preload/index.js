"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  /**
   * 隐藏主窗口
   */
  hideWindow: () => electron.ipcRenderer.send("hide-window"),
  /**
   * 显示主窗口，可指定位置
   * @param {number} [x] - 窗口X坐标
   * @param {number} [y] - 窗口Y坐标
   */
  showWindow: (x, y) => electron.ipcRenderer.send("show-window", { x, y }),
  /**
   * 最小化主窗口
   */
  minimizeWindow: () => electron.ipcRenderer.send("minimize-window"),
  /**
   * 关闭主窗口/退出应用
   */
  closeWindow: () => electron.ipcRenderer.send("close-window"),
  /**
   * 从主进程接收消息的监听器
   * @param {string} channel - 通道名称
   * @param {Function} listener - 监听回调函数
   */
  on: (channel, listener) => {
    const validChannels = ["main-process-message", "clipboard-data", "foreground-process", "window-pinned", "script-list", "file-server-url", "secret-status", "secret-op-result", "secret-value", "secret-list", "trigger-smart-action", "config-data", "file-icon-data", "secret-auth-status", "secret-verify-result", "auto-start-status", "color-picked", "middle-click-status", "show-about", "snip-pin-result", "clipboard-history-update", "clipboard-history-data", "clipboard-history-use-result", "clipboard-history-delete-result", "clipboard-history-pin-result", "clipboard-history-clear-result", "clipboard-history-search-result", "clipboard-history-content-result", "clipboard-history-image-pin-result", "dialog-init", "dialog-closed", "dialog-result", "ai-chat-result", "ai-chat-stream", "radial-menu-init", "image-pin-save-result", "clipboard-image-result", "timer-finished", "active-timers-list"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (event, ...args) => listener(...args));
    }
  },
  /**
   * 移除消息监听器
   * @param {string} channel - 通道名称
   * @param {Function} listener - 监听回调函数
   */
  off: (channel, listener) => {
    const validChannels = ["main-process-message", "clipboard-data", "foreground-process", "window-pinned", "script-list", "file-server-url", "secret-status", "secret-op-result", "secret-value", "secret-list", "trigger-smart-action", "config-data", "file-icon-data", "secret-auth-status", "secret-verify-result", "auto-start-status", "color-picked", "middle-click-status", "show-about", "snip-pin-result", "clipboard-history-update", "clipboard-history-data", "clipboard-history-use-result", "clipboard-history-delete-result", "clipboard-history-pin-result", "clipboard-history-clear-result", "clipboard-history-search-result", "clipboard-history-content-result", "clipboard-history-image-pin-result", "dialog-init", "dialog-closed", "dialog-result", "ai-chat-result", "ai-chat-stream", "radial-menu-init", "image-pin-save-result", "timer-finished", "active-timers-list"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.removeListener(channel, listener);
    }
  },
  /**
   * 移除指定通道的所有监听器
   * @param {string} channel - 通道名称
   */
  removeAllListeners: (channel) => {
    const validChannels = ["ai-chat-result", "ai-chat-stream"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.removeAllListeners(channel);
    }
  },
  /**
   * 从主进程接收一次性消息的监听器
   * @param {string} channel - 通道名称
   * @param {Function} listener - 监听回调函数
   */
  once: (channel, listener) => {
    const validChannels = ["main-process-message", "file-icon-data"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.once(channel, (event, ...args) => listener(...args));
    }
  },
  /**
   * 向主进程发送异步消息
   * @param {string} channel - 通道名称
   * @param {...any} args - 传递给主进程的参数
   */
  send: (channel, ...args) => {
    const validChannels = ["to-main-process", "hide-window", "show-window", "minimize-window", "close-window", "system-action", "window-control", "set-window-size", "script-action", "file-server-action", "secret-action", "open-image-window", "run-path", "update-global-hotkey", "update-smart-hotkeys", "update-custom-hotkeys", "config-action", "get-file-icon", "set-auto-start", "get-auto-start", "set-always-on-top", "write-clipboard", "read-clipboard-image", "pick-color", "color-picked-result", "show-alarm", "set-middle-click", "get-middle-click", "snip-pin", "clipboard-history-get", "clipboard-history-use", "clipboard-history-paste", "clipboard-history-delete", "clipboard-history-pin", "clipboard-history-clear", "clipboard-history-search", "clipboard-history-content", "clipboard-history-image-pin", "open-dialog-window", "close-dialog-window", "dialog-result", "toggle-dialog-pin", "check-close-dialog", "dialog-request-init", "ai-chat", "open-radial-menu", "close-radial-menu", "radial-menu-action", "update-radial-menu-settings", "start-timer", "cancel-timer", "get-active-timers"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.send(channel, ...args);
    }
  }
  // ... 更多功能将在此处暴露 ...
});
