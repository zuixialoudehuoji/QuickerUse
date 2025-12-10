<template>
  <div class="quicker-use-app" @dragover.prevent @drop.prevent="handleDrop">
    <!-- 1. 顶部搜索栏 -->
    <div class="search-bar" style="-webkit-app-region: drag;">
      <input type="text" v-model="searchText" @keyup.enter="handleSearch" placeholder="输入命令 / 搜索..." style="-webkit-app-region: no-drag;" />
      <span class="settings-icon" @click="showSettings = true" style="-webkit-app-region: no-drag;">⚙️</span>
    </div>

    <!-- 2. 智能推荐区 (Strict Grid) -->
    <div class="section-container" v-if="smartDisplayList.length > 0">
      <div class="section-title">
        <span>智能推荐</span>
        <span v-if="settings.mode === 'smart'" class="add-btn-small" @click="showAllSmart = true" title="管理功能">➕</span>
      </div>
      <div class="grid-box" :style="{ 'grid-template-rows': `repeat(${settings.smartRows}, 1fr)` }">
        <div 
          v-for="(item, index) in smartDisplayList" 
          :key="'smart-' + index" 
          class="grid-item" 
          :class="{ 'add-btn': item.type === 'add', 'empty': item.type === 'empty' }"
          @click="handleGridClick(item, 'smart')" 
          @contextmenu.prevent="handleGridRightClick(item, 'smart')"
          :title="getItemTitle(item)"
        >
          <span v-if="item.type === 'action'" class="icon">{{ getIcon(item.data.label) }}</span>
          <span v-if="item.type === 'add'" class="icon">➕</span>
        </div>
      </div>
      <div v-if="smartTotalPages > 1" class="pagination-dots">
        <span v-for="p in smartTotalPages" :key="p" class="dot" :class="{active: smartPage === p-1}" @click="smartPage = p-1"></span>
      </div>
    </div>

    <!-- 3. 我的工具区 (Strict 4x4 Grid) -->
    <div class="section-container">
      <div class="section-title">
        <span>我的工具</span>
      </div>
      <div class="grid-box" :style="{ 'grid-template-rows': `repeat(${settings.customRows}, 1fr)` }">
        <div 
          v-for="(item, index) in customDisplayList" 
          :key="'custom-' + index" 
          class="grid-item" 
          :class="{ 'add-btn': item.type === 'add', 'empty': item.type === 'empty' }"
          @click="handleGridClick(item, 'custom')" 
          @contextmenu.prevent="item.type === 'action' && handleGridRightClick(item, 'custom')"
          :title="getItemTitle(item)"
        >
          <span v-if="item.type === 'action'" class="icon">{{ item.data.icon || '📦' }}</span>
          <span v-if="item.type === 'add'" class="icon">➕</span>
        </div>
      </div>
      <!-- 分页指示器 -->
      <div v-if="customTotalPages > 1" class="pagination-dots">
        <span v-for="p in customTotalPages" :key="p" class="dot" :class="{active: customPage === p-1}" @click="customPage = p-1"></span>
      </div>
    </div>

    <!-- 弹窗：设置 -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="modal-content">
        <h3>设置</h3>
        <div class="form-row">
          <label>显示模式</label>
          <select v-model="settings.mode" @change="applySettings">
            <option value="smart">✨ 智能感知</option>
            <option value="all">🧩 全部功能</option>
          </select>
        </div>
        <div class="form-row">
          <label>透明度</label>
          <input type="range" min="0.5" max="1" step="0.05" v-model="settings.opacity" @change="applySettings">
        </div>
        <div class="form-row">
          <label>智能区行数: {{ settings.smartRows }}</label>
          <input type="range" min="1" max="5" v-model="settings.smartRows" @change="saveSettings">
        </div>
        <div class="form-row">
          <label>工具区行数: {{ settings.customRows }}</label>
          <input type="range" min="1" max="5" v-model="settings.customRows" @change="saveSettings">
        </div>
        <div class="form-row">
          <label>全局热键</label>
          <input v-model.lazy="settings.globalHotkey" @change="saveSettings" placeholder="例如 Alt+Space" style="width: 120px; text-align: right; background: rgba(0,0,0,0.2); border: 1px solid #444; color: inherit;">
        </div>
        <div class="form-row">
          <label>主题</label>
          <select v-model="settings.theme" @change="applySettings">
            <option value="dark">纯黑</option>
            <option value="light">明亮</option>
          </select>
        </div>
        <div class="form-row">
          <label>管理</label>
          <button @click="showSecretManager = true">密钥管理</button>
        </div>
        <div class="form-row" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #333;">
          <button @click="resetCustomActions" style="width: 100%; background: #a33; color: white;">重置我的工具</button>
        </div>
      </div>
    </div>

    <!-- 弹窗：管理智能功能 -->
    <div v-if="showAllSmart" class="modal-overlay" @click.self="showAllSmart = false">
      <div class="modal-content">
        <h3>管理智能功能</h3>
        <div class="list-view">
          <div v-for="action in ALL_FEATURES" :key="action.action" class="list-item">
            <span @click="performAction(action); showAllSmart = false" style="cursor:pointer; flex: 1;">
              {{ getIcon(action.label) }} {{ action.label }}
            </span>
            
            <!-- 热键设置 -->
            <input 
              v-model.lazy="smartHotkeys[action.action]" 
              @change="saveData"
              placeholder="热键 (如 Alt+1)" 
              style="width: 100px; margin-right: 10px; background: rgba(0,0,0,0.2); border: 1px solid #444; color: #aaa; padding: 2px 5px; font-size: 0.8em;"
            >

            <div @click.stop>
              <button v-if="smartBlacklist.has(action.action)" @click="restoreSmartAction(action.action)" class="btn-restore">已隐藏</button>
              <button v-else @click="hideSmartAction(action)" class="btn-hide">显示中</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗：添加自定义工具 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <h3>添加工具</h3>
        <div class="tab-header">
          <span :class="{active: addType==='file'}" @click="addType='file'">文件/软件</span>
          <span :class="{active: addType==='builtin'}" @click="addType='builtin'">内置功能</span>
        </div>
        <div v-if="addType==='file'" class="form-body">
          <input v-model="newItem.path" placeholder="文件路径 (支持拖入)" class="full-input">
          <input v-model="newItem.label" placeholder="名称" class="full-input">
          <input v-model="newItem.icon" placeholder="图标 (Emoji)" class="full-input" style="width: 60px">
          <button class="confirm-btn" @click="confirmAdd">添加</button>
        </div>
        <div v-if="addType==='builtin'" class="grid-select">
          <div v-for="tool in BUILTIN_TOOLS" :key="tool.action" class="tool-option" @click="selectBuiltin(tool)">
            {{ tool.icon }} {{ tool.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗：密钥管理 -->
    <div v-if="showSecretManager" class="modal-overlay" @click.self="showSecretManager = false">
      <div class="modal-content">
        <h3>密钥管理</h3>
        <div class="form-row">
          <input v-model="secretKey" placeholder="Key" style="flex:1">
          <input v-model="secretValue" type="password" placeholder="Value" style="flex:1">
          <button @click="doSaveSecret">保存</button>
        </div>
        <div class="list-view">
          <div v-for="k in secretKeys" :key="k" class="list-item">
            <span>🔑 {{ k }}</span>
            <div>
              <button @click="doGetSecret(k)">复制</button>
              <button @click="doDeleteSecret(k)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue';
import textProcessor from './utils/textProcessor';

// === 1. 常量定义 ===
const ALL_FEATURES = [
  { label: '🔍 搜索', action: 'search-google' },
  { label: '🌍 翻译', action: 'translate' },
  { label: '🚀 打开链接', action: 'open-url' },
  { label: '⚡ SQL 转 IN', action: 'sql-in' },
  { label: '🔗 智能拼接', action: 'join-comma' },
  { label: '📄 格式化 JSON', action: 'json-format' },
  { label: '📦 压缩 JSON', action: 'json-minify' },
  { label: '📋 YAML 转 JSON', action: 'yaml-to-json' },
  { label: '⏰ 时间戳转换', action: 'timestamp-convert' },
  { label: '💰 汇率换算', action: 'convert-currency' },
  { label: '🐫 转驼峰', action: 'to-camel' },
  { label: '➖ 转下划线', action: 'to-snake' },
  { label: '🔍 提取 IP', action: 'extract-ip' },
  { label: '📧 提取邮箱', action: 'extract-email' },
  { label: '📱 提取手机', action: 'extract-phone' },
  { label: '📡 API 调试', action: 'api-get' },
  { label: '📷 转二维码', action: 'generate-qr' },
  { label: '🖼️ 贴图置顶', action: 'snip-pin' },
  { label: '🎲 生成 UUID', action: 'generate-uuid' },
  { label: '🔑 生成强密码', action: 'generate-password' },
  { label: '📄 图片转 PDF', action: 'doc-pdf' },
  { label: '🖱️ 连点器', action: 'auto-clicker' },
  { label: '👓 演示模式', action: 'presentation-mode' },
];

const BUILTIN_TOOLS = [
  { label: '取色', action: 'color-picker', icon: '🎨' },
  { label: '置顶', action: 'window-pin', icon: '📌' },
  { label: '左分屏', action: 'window-left', icon: '⬅️' },
  { label: '右分屏', action: 'window-right', icon: '➡️' },
  { label: '全屏', action: 'window-full', icon: '⬆️' },
  { label: '倒计时', action: 'timer', icon: '⏱️' },
  { label: '清理内存', action: 'kill-process', icon: '🧹' },
  { label: 'Hosts切换', action: 'switch-hosts', icon: '📝' },
];

// === 2. 响应式状态 (State) ===
const searchText = ref('');
const clipboardContent = ref('');
const smartBlacklist = ref(new Set(JSON.parse(localStorage.getItem('smart-blacklist') || '[]')));
// [重要] 初始化自定义列表
const customActions = ref(JSON.parse(localStorage.getItem('custom-actions') || '[]'));

// 弹窗开关 (Fix: 确保所有变量都已定义)
const showSettings = ref(false);
const showAddModal = ref(false);
const showAllSmart = ref(false);
const showSecretManager = ref(false);

// 表单数据
const addType = ref('file');
const newItem = reactive({ path: '', label: '', icon: '📦', type: 'file' });
const secretKey = ref('');
const secretValue = ref('');
const secretKeys = ref([]);

// 设置对象
const defaultSettings = { theme: "dark", opacity: 0.95, mode: "all", smartRows: 2, customRows: 4, globalHotkey: 'Alt+Space' };
const settings = reactive(JSON.parse(localStorage.getItem('app-settings') || JSON.stringify(defaultSettings)));
const smartHotkeys = reactive(JSON.parse(localStorage.getItem('smart-hotkeys') || '{}'));

// === 3. 分页逻辑 (Pagination) ===
const smartPage = ref(0);
const customPage = ref(0);

function getPagedList(rawList, currentPage, rows) {
  const pageSize = rows * 4;
  const fullList = [...rawList.map(i => ({ type: 'action', data: i })), { type: 'add' }];
  const totalPages = Math.ceil(fullList.length / pageSize);
  const start = currentPage * pageSize;
  let pageItems = fullList.slice(start, start + pageSize);
  while (pageItems.length < pageSize) pageItems.push({ type: 'empty' });
  return { pageItems, totalPages };
}

const smartFiltered = computed(() => {
  if (settings.mode === 'all') return ALL_FEATURES;
  const text = searchText.value || clipboardContent.value;
  const matched = text ? textProcessor.analyze(text) : ALL_FEATURES.slice(0, 3);
  return matched.filter(i => !smartBlacklist.value.has(i.action));
});

watch(smartFiltered, () => smartPage.value = 0);

const smartData = computed(() => getPagedList(smartFiltered.value, smartPage.value, settings.smartRows));
const smartDisplayList = computed(() => smartData.value?.pageItems || []);
const smartTotalPages = computed(() => smartData.value?.totalPages || 0);

const indexedCustomActions = computed(() => customActions.value.map((item, idx) => ({ ...item, originalIndex: idx })));
const customData = computed(() => getPagedList(indexedCustomActions.value, customPage.value, settings.customRows));
const customDisplayList = computed(() => customData.value?.pageItems || []);
const customTotalPages = computed(() => customData.value?.totalPages || 0);

// === 4. 交互处理 (Interactions) ===
const handleGridClick = (item, source) => {
  if (item.type === 'add') {
    if (source === 'smart') showAllSmart.value = true;
    if (source === 'custom') showAddModal.value = true;
  } else if (item.type === 'action') {
    if (source === 'smart') performAction(item.data);
    if (source === 'custom') performCustomAction(item.data);
  }
};

const handleGridRightClick = (item, source) => {
  if (item.type !== 'action') return;
  if (source === 'smart') hideSmartAction(item.data);
  if (source === 'custom') removeCustomAction(item.data.originalIndex);
};

const getItemTitle = (item) => {
  if (item.type === 'add') return '添加/管理';
  if (item.type === 'action') return item.data.label;
  return '';
};

// === 5. 核心动作逻辑 (Actions) ===
const handleSearch = () => {
  if (textProcessor.isUrl(searchText.value)) window.api.send('run-path', searchText.value);
  else window.api.send('run-path', `https://www.google.com/search?q=${encodeURIComponent(searchText.value)}`);
  window.api.send('hide-window'); // 搜索后隐藏
};

const performAction = (item) => {
  const action = typeof item === 'string' ? item : item.action;
  const payload = typeof item === 'object' ? item.payload || (searchText.value || clipboardContent.value) : null;
  
  if (action === 'search-google') {
    if (!payload) { alert('无选中内容'); return; } // 不隐藏，提示用户
    window.api.send('run-path', `https://www.google.com/search?q=${encodeURIComponent(payload)}`);
  }
  else if (action === 'translate') window.api.send('run-path', `https://translate.google.com/?text=${encodeURIComponent(payload)}`);
  else if (action === 'open-url') window.api.send('run-path', payload);
  else if (action === 'generate-qr') window.api.send('run-path', `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(payload)}`);
  else if (action === 'snip-pin') window.api.send('open-image-window', payload || 'https://via.placeholder.com/300');
  
  else if (action === 'sql-in') searchText.value = textProcessor.processSqlIn(payload);
  else if (action === 'json-format') searchText.value = textProcessor.processJsonFormat(payload);
  else if (action === 'yaml-to-json') searchText.value = textProcessor.processYamlToJson(payload);
  else if (action === 'to-camel') searchText.value = payload.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  else if (action === 'extract-ip' || action === 'extract-email') { searchText.value = payload; navigator.clipboard.writeText(payload); alert('已提取'); }
  else if (action === 'generate-uuid') searchText.value = crypto.randomUUID();
  else if (action === 'convert-currency') alert(textProcessor.processCurrency(payload));
  
  else if (action.startsWith('window-')) window.api.send('window-control', { action: action.replace('window-', '') });
  else if (action === 'kill-process') window.api.send('system-action', 'kill-process');
  else if (action === 'switch-hosts') window.api.send('system-action', 'switch-hosts');
  
  else if (action === 'color-picker') { if('EyeDropper' in window) new window.EyeDropper().open().then(r => { searchText.value = r.sRGBHex; navigator.clipboard.writeText(r.sRGBHex); }); }
  else if (action === 'timer') setTimeout(() => new Notification('时间到').show(), 5000);

  // [修改] 只有文本处理类的不隐藏窗口，其他操作（外部打开、系统操作）执行后隐藏
  const stayOpenActions = ['sql-in', 'json-format', 'yaml-to-json', 'to-camel', 'generate-uuid', 'extract-ip', 'extract-email'];
  if (!stayOpenActions.includes(action)) {
    window.api.send('hide-window');
  }
};

const performCustomAction = (item) => {
  if (item.type === 'builtin') performAction({ action: item.action });
  else if (item.type === 'file') {
    window.api.send('run-path', item.path);
    window.api.send('hide-window');
  }
};

// ...

const saveData = () => {
  localStorage.setItem('smart-blacklist', JSON.stringify([...smartBlacklist.value]));
  localStorage.setItem('custom-actions', JSON.stringify(customActions.value));
  localStorage.setItem('app-settings', JSON.stringify(settings));
  localStorage.setItem('smart-hotkeys', JSON.stringify(smartHotkeys)); // [新增]
  
    // 更新后端热键
  
    if (window.api) {
    window.api.send('update-global-hotkey', settings.globalHotkey);
    // [Fix] 解除 Proxy 包装，防止 IPC 克隆错误
    window.api.send('update-smart-hotkeys', JSON.parse(JSON.stringify(smartHotkeys)));
  }
  
  };
  
  const applySettings = () => {
  saveData();
  // [修复] 强制应用主题到 html 标签
  document.documentElement.setAttribute('data-theme', settings.theme);
  
  // 应用透明度
  const appEl = document.querySelector('.quicker-use-app');
  if(appEl) appEl.style.opacity = settings.opacity;
};
const getIcon = (label) => {
  const match = label.match(/^(\P{L}+)/u);
  return match ? match[0].trim() : label.charAt(0);
};

// 密钥管理
const doSaveSecret = () => window.api.send('secret-action', { action: 'set', key: secretKey.value, value: secretValue.value });
const doGetSecret = (k) => window.api.send('secret-action', { action: 'get', key: k });
const doDeleteSecret = (k) => window.api.send('secret-action', { action: 'delete', key: k });

// === 7. 生命周期 ===
onMounted(() => {
  applySettings();
  
  // ESC 退出
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      if (showSettings.value || showAllSmart.value || showAddModal.value || showSecretManager.value) {
        // 如果有弹窗，先关弹窗
        showSettings.value = false;
        showAllSmart.value = false;
        showAddModal.value = false;
        showSecretManager.value = false;
      } else {
        // 没弹窗则隐藏主窗口
        window.api.send('hide-window');
      }
    }
  });
  
  // [强制清理] 如果检测到是脏数据（比如全是测试数据），则清空
  if (customActions.value.length === 20 && customActions.value[0].label === '测试1') {
    console.log('检测到测试数据，自动清理...');
    customActions.value = [];
    saveData();
  }

  if (window.api) {
    window.api.on('clipboard-data', (text) => clipboardContent.value = text);
    window.api.on('secret-list', (k) => secretKeys.value = k);
    window.api.on('secret-value', ({value}) => { if(value) { navigator.clipboard.writeText(value); alert('已复制'); } });
    window.api.on('secret-op-result', () => window.api.send('secret-action', { action: 'list' }));
    window.api.on('trigger-smart-action', ({ action, text }) => {
      // 直接执行动作，不显示UI
      console.log('Trigger Smart Action:', action, text);
      const item = ALL_FEATURES.find(i => i.action === action);
      if (item) {
        performAction({ action: item.action, payload: text });
      }
    });
    
    // 初始化热键
    window.api.send('update-global-hotkey', settings.globalHotkey);
    window.api.send('update-smart-hotkeys', smartHotkeys);
    window.api.send('secret-action', { action: 'list' });
  }
});
</script>

<style scoped>
/* 变量已移至 assets/main.css 全局定义 */

.quicker-use-app {
  height: 100vh;
  background: var(--bg-color);
  color: var(--text-color);
  font-family: sans-serif;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  scrollbar-width: none;
}
.quicker-use-app::-webkit-scrollbar { display: none; }

.search-bar { padding: 15px; border-bottom: 1px solid var(--grid-line); display: flex; align-items: center; background: var(--bg-color); flex-shrink: 0; position: sticky; top: 0; z-index: 20; }
.search-bar input { flex: 1; background: transparent; border: none; color: inherit; font-size: 1.1em; outline: none; }
.settings-icon { cursor: pointer; opacity: 0.5; padding: 5px; }
.settings-icon:hover { opacity: 1; }

.section-container { margin-bottom: 0; flex-shrink: 0; }
.section-title { font-size: 0.8em; opacity: 0.5; padding: 5px 10px; background: rgba(128,128,128,0.1); border-bottom: 1px solid var(--grid-line); display: flex; justify-content: space-between; align-items: center; }
.add-btn-small { cursor: pointer; padding: 0 5px; font-size: 1.2em; transition: opacity 0.2s; }
.add-btn-small:hover { opacity: 1; color: #fff; }

.grid-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--grid-line); border-bottom: 1px solid var(--grid-line); }
.grid-item { background: var(--bg-color); aspect-ratio: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.8em; transition: background 0.2s; position: relative; }
.grid-item:hover { filter: brightness(1.2); background: rgba(128,128,128,0.1); }
.grid-item.empty { cursor: default; background: var(--bg-color); pointer-events: none; }
.grid-item.add-btn { color: #666; font-size: 1.5em; }

.pagination-dots { display: flex; justify-content: center; gap: 10px; padding: 4px; border-bottom: 1px solid var(--grid-line); background: rgba(255, 255, 255, 0.05); z-index: 10; position: relative; min-height: 20px; flex-shrink: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #666; cursor: pointer; transition: all 0.2s; }
.dot.active { background: #fff; transform: scale(1.3); box-shadow: 0 0 5px rgba(255,255,255,0.5); }

.modal-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(5px); }
.modal-content { background: var(--modal-bg); border: 1px solid var(--grid-line); padding: 20px; width: 85%; max-height: 80%; overflow-y: auto; border-radius: 8px; }
.modal-content h3 { margin-bottom: 15px; font-size: 1.1em; border-bottom: 1px solid var(--grid-line); padding-bottom: 10px; }
.form-row { margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.full-input { width: 100%; margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--grid-line); color: inherit; }
.confirm-btn { width: 100%; padding: 12px; background: #007acc; color: white; border: none; cursor: pointer; margin-top: 10px; border-radius: 4px; }
.tab-header { display: flex; margin-bottom: 15px; border-bottom: 1px solid var(--grid-line); }
.tab-header span { flex: 1; text-align: center; padding: 10px; cursor: pointer; opacity: 0.5; }
.tab-header span.active { opacity: 1; border-bottom: 2px solid #007acc; }
.grid-select { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tool-option { padding: 15px; border: 1px solid var(--grid-line); cursor: pointer; text-align: center; font-size: 0.9em; }
.list-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--grid-line); align-items: center; }
.btn-restore { padding: 5px 10px; background: #333; color: #aaa; border: none; cursor: pointer; }
.btn-hide { padding: 5px 10px; background: #007acc; color: #fff; border: none; cursor: pointer; }
</style>
