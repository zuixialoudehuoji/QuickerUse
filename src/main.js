// src/main.js (Vue应用入口文件)
import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css' // 导入全局样式

// [屏蔽] Electron 开发环境的安全警告
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Electron Security Warning')) return;
  originalWarn(...args);
};

// 创建并挂载Vue应用实例
const app = createApp(App)
app.mount('#app')
