// src/main.js (Vue应用入口文件)
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import DialogApp from './DialogApp.vue'
import './assets/main.css'

// 生产环境下禁用 console.log 和 console.debug
if (import.meta.env.PROD) {
  const noop = () => {}
  console.log = noop
  console.debug = noop
}

// 屏蔽 Electron 开发环境的安全警告
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Electron Security Warning')) return;
  originalWarn(...args);
};

// 检测是否为弹出框模式
const params = new URLSearchParams(window.location.search);
const isDialogMode = params.get('dialogMode') === 'true';

// 根据模式选择应用组件
const AppComponent = isDialogMode ? DialogApp : App;

// 创建Vue应用实例
const app = createApp(AppComponent)

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用Element Plus
app.use(ElementPlus, {
  // 配置Element Plus使用暗色主题
  size: 'small'
})

app.mount('#app')
