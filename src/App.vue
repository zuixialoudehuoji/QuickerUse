<template>
  <!-- 全局轮盘菜单模式 -->
  <GlobalRadialMenu
    v-if="isRadialMenuMode"
    :visible="radialMenuVisible"
    :slots="globalRadialMenuSlots"
    :menu-items="globalRadialMenuItems"
    :center-x="radialMenuX"
    :center-y="radialMenuY"
    :theme="radialMenuTheme"
    :show-hints="radialMenuShowHints"
    @select="handleGlobalRadialSelect"
    @cancel="handleGlobalRadialCancel"
    @close="handleGlobalRadialClose"
  />

  <!-- 主界面 -->
  <div
    v-else
    class="quicker-use-app"
    @dragover.prevent
    @drop.prevent="handleDrop"
    @mousedown.capture="handleRightMouseDown"
    @mouseup.capture="handleRightMouseUp"
    @contextmenu.prevent
  >
    <!-- 顶部标题栏 (可拖动) -->
    <div class="title-bar" style="-webkit-app-region: drag;">
      <span class="app-title">QuickerUse</span>
      <div class="bar-actions" style="-webkit-app-region: no-drag;">
        <el-tooltip content="关于" placement="bottom">
          <el-icon class="action-icon" @click="showAbout = true"><InfoFilled /></el-icon>
        </el-tooltip>
        <el-tooltip content="设置" placement="bottom">
          <el-icon class="action-icon" @click="openSettingsDialog"><Setting /></el-icon>
        </el-tooltip>
        <el-tooltip :content="isPinned ? '取消置顶' : '置顶窗口'" placement="bottom">
          <span class="action-icon pin-icon" :class="{ 'is-pinned': isPinned }" @click="togglePin">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M16 4.5v-.5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v.5l-2 2v3.5h4v9l2 2 2-2v-9h4V6.5l-2-2zm0 4h-8V7l1-1V4h6v2l1 1v1.5z"/>
            </svg>
          </span>
        </el-tooltip>
        <el-tooltip content="最小化到托盘" placement="bottom">
          <el-icon class="action-icon close-icon" @click="hideToTray"><Close /></el-icon>
        </el-tooltip>
      </div>
    </div>

    <!-- 智能推荐区 -->
    <ToolGrid
      v-if="smartDisplayList.length > 0 && !showAIPanel"
      title="智能推荐"
      :items="smartDisplayList"
      :rows="settings.smartRows"
      :current-page="smartPage"
      :show-add-button="true"
      :show-add-item="false"
      :allow-drag="true"
      @item-click="handleSmartClick"
      @item-right-click="handleSmartRightClick"
      @add-click="showManageFeatures = true"
      @page-change="smartPage = $event"
      @reorder="handleSmartReorder"
    />

    <!-- 我的工具区 -->
    <ToolGrid
      v-if="!showAIPanel"
      title="我的工具"
      :items="customActions"
      :rows="settings.customRows"
      :current-page="customPage"
      :show-add-button="true"
      :show-add-item="false"
      :allow-drag="true"
      @item-click="handleCustomClick"
      @item-right-click="handleCustomRightClick"
      @add-click="showAddTool = true"
      @page-change="customPage = $event"
      @reorder="handleCustomReorder"
    />

    <!-- AI 聊天面板 -->
    <AIChatPanel
      v-if="showAIPanel"
      :initial-text="aiInitialText"
      @close="showAIPanel = false"
      class="ai-panel-container"
    />

    <!-- 功能弹窗 -->
    <FeatureModal
      v-model="showFeatureModal"
      :modal-data="featureModalData"
      :initial-text="featureTextContent"
      ref="featureModalRef"
      @close="handleFeatureModalClose"
    />

    <!-- 添加工具弹窗 -->
    <AddToolModal
      v-model="showAddTool"
      :existing-actions="customActions"
      :pending-file="pendingDropFile"
      @add-file="addCustomTool"
      @file-processed="pendingDropFile = null"
    />

    <!-- 文件信息弹窗 -->
    <FileInfoModal
      v-model="showFileInfo"
      :file-info="fileInfo"
    />

    <!-- 管理智能功能弹窗 -->
    <ManageFeaturesModal
      v-model="showManageFeatures"
      :blacklist="smartBlacklist"
      :hotkeys="smartHotkeys"
      @feature-click="handleSmartClick"
      @hide-feature="hideSmartFeature"
      @restore-feature="restoreSmartFeature"
      @hotkeys-change="handleHotkeysChange"
    />

    <!-- 设置弹窗 -->
    <SettingsModal
      v-model="showSettingsModal"
      :settings="settings"
      :hotkeys="smartHotkeys"
      @settings-change="handleSettingsChange"
      @hotkeys-change="handleHotkeysChange"
      @reset-tools="resetCustomActions"
      @reset-all="resetAllSettings"
      @radial-settings-change="handleRadialSettingsChange"
    />

    <!-- 右键确认弹窗 -->
    <el-dialog
      v-model="showConfirmDialog"
      :title="confirmDialogData.title"
      width="280px"
      :show-close="false"
      class="confirm-dialog"
      align-center
    >
      <p class="confirm-text">{{ confirmDialogData.message }}</p>
      <template #footer>
        <el-button size="small" @click="showConfirmDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmDialogData.onConfirm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 关于弹窗 -->
    <el-dialog
      v-model="showAbout"
      title="关于"
      width="300px"
      class="about-dialog"
      align-center
    >
      <div class="about-content">
        <div class="about-logo">
          <svg viewBox="0 0 64 64" width="56" height="56">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea"/>
                <stop offset="100%" style="stop-color:#764ba2"/>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="12" fill="url(#logoGrad)"/>
            <path d="M35 12L20 33h9l-4 19 19-24h-10l6-16z" fill="#FFD700"/>
          </svg>
        </div>
        <h2 class="about-name">QuickerUse</h2>
        <p class="about-ver">版本 0.1.0</p>
        <p class="about-desc">极简高效的鼠标优先效率工具</p>
        <div class="about-features">
          <span>智能感知</span>
          <span>快捷搜索</span>
          <span>开发工具</span>
          <span>自定义启动</span>
        </div>
        <p class="about-author">作者：zuixianloudehuoji</p>
        <p class="about-copy">© 2024 QuickerUse</p>
      </div>
    </el-dialog>

    <!-- 轮盘菜单 -->
    <RadialMenu
      :visible="showRadialMenu"
      :items="radialMenuItems"
      :center-x="radialMenuX"
      :center-y="radialMenuY"
      @select="handleRadialSelect"
      @cancel="handleRadialCancel"
      @close="handleRadialClose"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Setting, InfoFilled, Close } from '@element-plus/icons-vue';

// 组件
import ToolGrid from './components/ToolGrid.vue';
import FeatureModal from './components/FeatureModal.vue';
import AddToolModal from './components/AddToolModal.vue';
import FileInfoModal from './components/FileInfoModal.vue';
import ManageFeaturesModal from './components/ManageFeaturesModal.vue';
import AIChatPanel from './components/AIChatPanel.vue';
import RadialMenu from './components/RadialMenu.vue';
import GlobalRadialMenu from './components/GlobalRadialMenu.vue';
import SettingsModal from './components/SettingsModal.vue';

// 工具
import textProcessor from './utils/textProcessor';
import fileProcessor from './utils/fileProcessor';
import * as calculator from './utils/calculator';
import * as encoder from './utils/encoder';
import * as regexHelper from './utils/regex';
import * as colorConverter from './utils/colorConverter';
import * as cronUtil from './utils/cron';
import * as markdownUtil from './utils/markdown';
import * as ocrUtil from './utils/ocr';
import * as aiUtil from './utils/ai';
import * as envSensing from './utils/envSensing';
import { ALL_FEATURES, DEFAULT_SETTINGS, SEARCH_ENGINES, TRANSLATE_SERVICES } from './utils/constants';

// === 状态 ===
const clipboardContent = ref('');
const foregroundProcess = ref('');  // 前台窗口进程名（环境感知）
const smartBlacklist = ref(new Set(JSON.parse(localStorage.getItem('smart-blacklist') || '[]')));
const smartOrder = ref(JSON.parse(localStorage.getItem('smart-order') || '[]'));
const customActions = ref(JSON.parse(localStorage.getItem('custom-actions') || '[]'));
const settings = reactive(JSON.parse(localStorage.getItem('app-settings') || JSON.stringify(DEFAULT_SETTINGS)));
const smartHotkeys = reactive(JSON.parse(localStorage.getItem('smart-hotkeys') || '{}'));
const isPinned = ref(false);

// 全局轮盘菜单模式状态
const isRadialMenuMode = ref(false);
const radialMenuVisible = ref(false);
const radialMenuTheme = ref('dark');
const radialMenuShowHints = ref(true);
const globalRadialMenuItems = ref([]);
const globalRadialMenuSlots = ref([]);

// 弹窗状态
const showAddTool = ref(false);
const showFileInfo = ref(false);
const showManageFeatures = ref(false);
const showFeatureModal = ref(false);
const showConfirmDialog = ref(false);
const showAbout = ref(false);
const showAIPanel = ref(false);
const showSettingsModal = ref(false);
const aiInitialText = ref('');
const pendingDropFile = ref(null);  // 待处理的拖拽文件

// 轮盘菜单状态
const showRadialMenu = ref(false);
const radialMenuX = ref(0);
const radialMenuY = ref(0);
let rightClickTimer = null;

// 轮盘菜单设置 (从 localStorage 加载)
const radialMenuSettings = reactive({
  enabled: true,
  triggerMode: 'rightLongPress',
  longPressDelay: 400,
  theme: 'dark',
  menuItems: []
});

// 确认弹窗数据
const confirmDialogData = reactive({
  title: '确认',
  message: '',
  onConfirm: () => {}
});

// 功能弹窗数据
const featureModalRef = ref(null);
const featureModalData = reactive({ title: '', type: 'text-editor', actions: [], fields: {}, text: '' });
const featureTextContent = ref('');

// 文件信息
const fileInfo = reactive({ name: '', sha1: '', sha256: '', size: 0, isImage: false, base64: '' });

// 分页
const smartPage = ref(0);
const customPage = ref(0);

// === 计算属性 ===
// 获取自定义工具中已有的action列表
const customActionSet = computed(() => {
  return new Set(customActions.value.filter(a => a.type === 'builtin').map(a => a.action));
});

// 智能推荐列表 - 排除已添加到我的工具中的内置功能，支持环境感知
const smartFiltered = computed(() => {
  let list = [];
  if (settings.mode === 'all') {
    list = ALL_FEATURES;
  } else {
    const text = clipboardContent.value;
    list = text ? textProcessor.analyze(text) : ALL_FEATURES.slice(0, 8);
  }

  // 过滤黑名单和已添加到自定义区的内置功能
  let filtered = list.filter(i =>
    !smartBlacklist.value.has(i.action) &&
    !customActionSet.value.has(i.action)
  );

  // 环境感知：根据前台应用调整推荐顺序
  if (envSensing.isEnabled() && foregroundProcess.value) {
    const recommendations = envSensing.getSmartRecommendations(foregroundProcess.value);
    if (recommendations.matched && recommendations.features.length > 0) {
      // 将推荐的功能排到前面
      const recommendedSet = new Set(recommendations.features);
      const recommended = filtered.filter(item => recommendedSet.has(item.action));
      const others = filtered.filter(item => !recommendedSet.has(item.action));
      filtered = [...recommended, ...others];
    }
  }

  return filtered;
});

// 应用自定义排序
const smartDisplayList = computed(() => {
  const filtered = smartFiltered.value;
  if (smartOrder.value.length === 0) {
    return filtered;
  }
  // 按保存的顺序排序
  const orderMap = new Map(smartOrder.value.map((action, idx) => [action, idx]));
  return [...filtered].sort((a, b) => {
    const orderA = orderMap.has(a.action) ? orderMap.get(a.action) : 999;
    const orderB = orderMap.has(b.action) ? orderMap.get(b.action) : 999;
    return orderA - orderB;
  });
});

// 监听智能列表变化，重置分页
watch(smartFiltered, () => {
  smartPage.value = 0;
});

// === 核心方法 ===

// 执行智能功能
const handleSmartClick = (item) => {
  const action = item.action;
  const rawText = item.payload || clipboardContent.value || '';
  console.log('[SmartClick] action:', action, 'rawText长度:', rawText.length);

  // 搜索
  if (action === 'search-google') {
    if (!rawText.trim()) return ElMessage.warning('无内容可搜索');
    const engine = settings.searchEngine || 'google';
    const url = SEARCH_ENGINES[engine].replace('{query}', encodeURIComponent(rawText.trim()));
    window.api?.send('run-path', url);
    window.api?.send('hide-window');
  }
  // 翻译
  else if (action === 'translate') {
    if (!rawText.trim()) return ElMessage.warning('无内容可翻译');
    const service = settings.translateService || 'google';
    let url = TRANSLATE_SERVICES[service].replace('{text}', encodeURIComponent(rawText.trim()));
    window.api?.send('run-path', url);
    window.api?.send('hide-window');
  }
  // JSON处理
  else if (action === 'json-format') {
    const result = textProcessor.processJsonFormat(rawText);
    openTextEditor('JSON 处理', result, 'json');
  }
  // SQL处理
  else if (action === 'sql-in') {
    openTextEditor('SQL IN', textProcessor.processSqlIn(rawText), 'sql');
  }
  // 时间戳转换
  else if (action === 'timestamp-convert') {
    const isTs = textProcessor.isTimestamp(rawText.trim());
    let result = '';
    if (isTs) {
      const ts = parseInt(rawText.trim());
      const date = new Date(ts.toString().length === 10 ? ts * 1000 : ts);
      result = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
    } else {
      const date = new Date(rawText.trim());
      result = isNaN(date.getTime()) ? '无效日期' : Math.floor(date.getTime() / 1000).toString();
    }
    openTextEditor('时间戳转换', result, 'timestamp');
  }
  // 变量命名转换
  else if (action === 'to-camel') {
    const toCamel = (s) => s.trim().toLowerCase().replace(/[-_\s]+([a-z])/g, (_, c) => c.toUpperCase());
    openTextEditor('变量命名转换', toCamel(rawText), 'naming');
  }
  // YAML处理
  else if (action === 'yaml-format' || action === 'yaml-to-json') {
    openTextEditor('YAML 处理', rawText || '', 'yaml');
  }
  // 信息提取 - 带类型选择
  else if (action === 'extract-info') {
    openDialogWindow({
      title: '信息提取',
      type: 'extract',
      text: rawText
    });
  }
  // 生成器
  else if (action === 'generate-uuid') {
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    openTextEditor('UUID 生成器', generateUUID(), 'uuid');
  }
  else if (action === 'generate-password') {
    const generatePwd = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    openTextEditor('强密码生成器', generatePwd(), 'password');
  }
  // 取色器
  else if (action === 'color-picker') {
    window.api?.send('hide-window');
    setTimeout(() => {
      window.api?.send('pick-color');
    }, 200);
  }
  // 倒计时
  else if (action === 'timer') {
    openDialogWindow({
      title: '倒计时',
      type: 'timer'
    });
  }
  // 闪念胶囊
  else if (action === 'memo') {
    openDialogWindow({
      title: '闪念胶囊',
      type: 'memo'
    });
  }
  // 二维码
  else if (action === 'generate-qr') {
    if (!rawText) return ElMessage.warning('无内容生成二维码');
    openDialogWindow({
      title: '二维码',
      type: 'qrcode',
      text: rawText
    });
  }
  // 剪贴板历史
  else if (action === 'clipboard-history') {
    openDialogWindow({
      title: '剪贴板历史',
      type: 'clipboard-history'
    });
  }
  // 计算器
  else if (action === 'calculator') {
    const text = rawText.trim();
    let result = text || '输入表达式、带单位数值或进制数';

    // 检测数学表达式
    if (calculator.isMathExpression(text)) {
      const evalResult = calculator.evaluate(text);
      if (evalResult.success) {
        result = evalResult.formatted;
      } else {
        result = evalResult.error;
      }
    }
    // 检测单位值
    else if (calculator.isUnitValue(text)) {
      const conversion = calculator.smartConvert(text);
      if (conversion) {
        result = `${conversion.type}转换：\n`;
        conversion.results.slice(0, 6).forEach(r => {
          const val = typeof r.value === 'number' ? r.value.toFixed(4).replace(/\.?0+$/, '') : r.value;
          result += `${val} ${r.name}\n`;
        });
      }
    }
    // 检测进制数
    else if (calculator.isBaseNumber(text)) {
      const base = calculator.convertBase(text);
      if (base) {
        result = `十进制: ${base.decimal}\n十六进制: ${base.hex}\n二进制: ${base.binary}\n八进制: ${base.octal}`;
      }
    }

    openTextEditor('计算器', result, 'calculator');
  }
  // 编码转换
  else if (action === 'encoder') {
    const text = rawText.trim();
    let result = text;

    // 智能检测并解码
    const detected = encoder.detectEncoding(text);
    if (detected) {
      const decoded = encoder.smartDecode(text);
      if (decoded.success) {
        result = `检测到 ${decoded.type}，解码结果：\n${decoded.result}`;
      }
    }

    openTextEditor('编码转换', result, 'encoder');
  }
  // 正则表达式助手
  else if (action === 'regex-helper') {
    const text = rawText.trim();
    openTextEditor('正则助手', text || '第一行输入正则表达式\n后面输入测试文本', 'regex');
  }
  // 颜色格式转换
  else if (action === 'color-convert') {
    const text = rawText.trim();
    let result = text || '#FF5733';

    // 尝试转换颜色
    if (colorConverter.isColorString(text)) {
      const converted = colorConverter.convertColor(text);
      if (converted.success) {
        result = `HEX: ${converted.hex}\nRGB: ${converted.rgb}\nHSL: ${converted.hsl}\nCMYK: ${converted.cmyk}`;
      }
    }

    openTextEditor('颜色转换', result, 'color');
  }
  // Cron 表达式助手
  else if (action === 'cron-helper') {
    const text = rawText.trim();
    let result = text || '0 0 * * *';

    // 如果有输入，尝试解析 Cron 表达式
    if (text && cronUtil.isValidCron(text)) {
      const parsed = cronUtil.parseCron(text);
      if (parsed.valid) {
        const nextRuns = cronUtil.getNextExecutions(text, 5);
        const nextRunsStr = nextRuns.map(d => cronUtil.formatDateTime(d)).join('\n');
        result = `表达式: ${text}\n解析: ${parsed.desc}\n\n下次执行:\n${nextRunsStr || '无法计算'}`;
      }
    }

    openTextEditor('Cron 表达式', result, 'cron');
  }
  // Markdown 预览
  else if (action === 'markdown-preview') {
    const text = rawText.trim();

    // 渲染 Markdown
    const rendered = markdownUtil.render(text || '# Markdown 预览\n\n输入或粘贴 Markdown 文本进行预览');
    const stats = markdownUtil.countWords(text);
    const toc = markdownUtil.extractToc(text);

    openDialogWindow({
      title: 'Markdown 预览',
      type: 'markdown',
      markdown: {
        source: text,
        html: rendered,
        stats,
        toc
      }
    });
  }
  // OCR 文字识别
  else if (action === 'ocr') {
    openDialogWindow({
      title: 'OCR 文字识别',
      type: 'ocr',
      ocr: {
        status: 'idle',
        progress: 0,
        result: '',
        error: ''
      }
    });
  }
  // AI 智能助手 - 打开独立弹窗
  else if (action === 'ai-assistant') {
    openDialogWindow({
      title: 'AI 助手',
      type: 'ai',
      ai: {
        inputText: rawText || ''
      }
    });
  }
  else {
    console.warn('Unknown action:', action);
  }
};

// 打开文本编辑器弹窗 - 使用独立窗口
const openTextEditor = (title, content, actionType = null) => {
  // 发送IPC打开独立弹出框窗口，传递动作类型而非函数
  openDialogWindow({
    title,
    type: 'text-editor',
    actionType,  // 动作类型标识，由弹出框内部处理
    initialText: content
  });
};

// 打开独立弹出框窗口
const openDialogWindow = (data) => {
  // 隐藏主窗口到托盘
  window.api?.send('hide-window');
  // 立即打开弹出框
  window.api?.send('open-dialog-window', data);
};

const handleFeatureModalClose = () => {
  featureModalData.title = '';
  featureModalData.type = 'text-editor';
  featureModalData.actions = [];
  featureTextContent.value = '';
};

// 智能功能右键 - 显示确认弹窗
const handleSmartRightClick = (item) => {
  confirmDialogData.title = '隐藏功能';
  confirmDialogData.message = `确定要隐藏「${item.label}」吗？可在设置中恢复。`;
  confirmDialogData.onConfirm = () => {
    hideSmartFeature(item.action);
    showConfirmDialog.value = false;
  };
  showConfirmDialog.value = true;
};

const hideSmartFeature = (action) => {
  smartBlacklist.value.add(action);
  saveData();
  ElMessage.success('已隐藏');
};

const restoreSmartFeature = (action) => {
  smartBlacklist.value.delete(action);
  saveData();
  ElMessage.success('已恢复');
};

// 智能推荐拖拽重排序
const handleSmartReorder = ({ from, to }) => {
  const currentList = smartDisplayList.value;
  const newOrder = currentList.map(item => item.action);
  const [removed] = newOrder.splice(from, 1);
  newOrder.splice(to, 0, removed);
  smartOrder.value = newOrder;
  saveData();
};

// 自定义工具点击
const handleCustomClick = (item) => {
  if (item.type === 'builtin') {
    handleSmartClick({ action: item.action });
  } else if (item.type === 'file') {
    window.api?.send('run-path', { path: item.path, isAdmin: item.isAdmin });
    window.api?.send('hide-window');
  }
};

// 自定义工具右键删除 - 显示确认弹窗
const handleCustomRightClick = (item) => {
  confirmDialogData.title = '删除工具';
  confirmDialogData.message = `确定要删除「${item.label}」吗？`;
  confirmDialogData.onConfirm = () => {
    customActions.value.splice(item.originalIndex, 1);
    saveData();
    showConfirmDialog.value = false;
    ElMessage.success('已删除');
  };
  showConfirmDialog.value = true;
};

// 自定义工具拖拽重排序
const handleCustomReorder = ({ from, to }) => {
  const items = [...customActions.value];
  const [removed] = items.splice(from, 1);
  items.splice(to, 0, removed);
  customActions.value = items;
  saveData();
};

// 添加自定义工具 - 去重检查
const addCustomTool = (tool) => {
  // 检查是否重复
  const isDuplicate = customActions.value.some(existing => {
    if (tool.type === 'builtin' && existing.type === 'builtin') {
      return existing.action === tool.action;
    }
    if (tool.type === 'file' && existing.type === 'file') {
      return existing.path === tool.path;
    }
    return false;
  });

  if (isDuplicate) {
    ElMessage.warning('该工具已存在');
    return;
  }

  customActions.value.push(tool);
  saveData();
};

// 文件拖拽处理
const handleDrop = async (e) => {
  if (e.dataTransfer?.files?.length > 0) {
    const file = e.dataTransfer.files[0];
    const filePath = file.path || file.name;
    const ext = filePath.split('.').pop().toLowerCase();

    // 可执行文件 -> 添加到工具
    if (['exe', 'lnk', 'app', 'bat', 'cmd', 'msi'].includes(ext)) {
      // 设置待处理文件，然后打开弹窗
      pendingDropFile.value = { path: filePath, name: file.name };
      showAddTool.value = true;
    } else {
      // 其他文件 -> 显示文件信息
      fileInfo.name = file.name;
      fileInfo.size = file.size;
      const hashData = await fileProcessor.getFileHash(file);
      fileInfo.sha1 = hashData.sha1;
      fileInfo.sha256 = hashData.sha256;

      if (file.type.startsWith('image/')) {
        fileInfo.isImage = true;
        fileInfo.base64 = await fileProcessor.fileToBase64(file);
      } else {
        fileInfo.isImage = false;
        fileInfo.base64 = '';
      }
      showFileInfo.value = true;
    }
  }
};

// === 设置相关 ===
const handleSettingsChange = (newSettings) => {
  Object.assign(settings, newSettings);
  applySettings();
  saveData();
};

const handleHotkeysChange = (newHotkeys) => {
  Object.assign(smartHotkeys, newHotkeys);
  saveData();
  window.api?.send('update-smart-hotkeys', JSON.parse(JSON.stringify(smartHotkeys)));
};

const resetCustomActions = () => {
  customActions.value = [];
  saveData();
};

const resetAllSettings = () => {
  Object.assign(settings, DEFAULT_SETTINGS);
  applySettings();
  saveData();
};

// 轮盘菜单设置变更
const handleRadialSettingsChange = (radialSettings) => {
  console.log('[App] Radial settings changed:', radialSettings);
  // 发送到主进程更新
  window.api?.send('update-radial-menu-settings', radialSettings);
};

const applySettings = () => {
  document.documentElement.setAttribute('data-theme', settings.theme);
  const appEl = document.querySelector('.quicker-use-app');
  if (appEl) appEl.style.opacity = settings.opacity;
};

// 窗口置顶
const togglePin = () => {
  isPinned.value = !isPinned.value;
  window.api?.send('set-always-on-top', isPinned.value);
};

// 最小化到托盘
const hideToTray = () => {
  window.api?.send('hide-window');
};

// 打开设置窗口
const openSettingsDialog = () => {
  showSettingsModal.value = true;
};

// 保存数据
const saveData = () => {
  localStorage.setItem('smart-blacklist', JSON.stringify([...smartBlacklist.value]));
  localStorage.setItem('smart-order', JSON.stringify(smartOrder.value));
  localStorage.setItem('custom-actions', JSON.stringify(customActions.value));
  localStorage.setItem('app-settings', JSON.stringify(settings));
  localStorage.setItem('smart-hotkeys', JSON.stringify(smartHotkeys));

  if (window.api) {
    window.api.send('update-global-hotkey', settings.globalHotkey);
    window.api.send('update-smart-hotkeys', JSON.parse(JSON.stringify(smartHotkeys)));
    // 发送自定义工具的快捷键
    const customHotkeys = {};
    customActions.value.forEach((tool, idx) => {
      if (tool.hotkey) {
        customHotkeys[`custom_${idx}`] = { hotkey: tool.hotkey, tool };
      }
    });
    window.api.send('update-custom-hotkeys', customHotkeys);
  }
};

// === 轮盘菜单功能 ===
const radialMenuItems = computed(() => {
  // 全局轮盘模式使用从主进程传入的菜单项
  if (isRadialMenuMode.value && globalRadialMenuItems.value.length > 0) {
    return globalRadialMenuItems.value;
  }
  // 从智能推荐获取常用功能（主窗口内的轮盘）
  const items = [
    { label: 'JSON格式化', icon: '📋', action: 'json-format' },
    { label: '时间转换', icon: '⏰', action: 'timestamp-convert' },
    { label: '计算器', icon: '🔢', action: 'calculator' },
    { label: '编码转换', icon: '🔤', action: 'encoder' },
    { label: '颜色转换', icon: '🎨', action: 'color-convert' },
    { label: '正则助手', icon: '📝', action: 'regex-helper' },
    { label: 'AI助手', icon: '🤖', action: 'ai-assistant' },
    { label: '剪贴板', icon: '📎', action: 'clipboard-history' }
  ];
  return items;
});

// 右键按下 - 开始计时
const handleRightMouseDown = (e) => {
  console.log('[RadialMenu] mousedown event, button:', e.button);
  if (e.button !== 2) return; // 只处理右键

  console.log('[RadialMenu] Right click detected, settings:', {
    enabled: radialMenuSettings.enabled,
    triggerMode: radialMenuSettings.triggerMode,
    delay: radialMenuSettings.longPressDelay
  });

  // 检查轮盘菜单是否启用且触发方式为右键长按
  if (!radialMenuSettings.enabled || radialMenuSettings.triggerMode !== 'rightLongPress') {
    console.log('[RadialMenu] Radial menu disabled or wrong trigger mode');
    return;
  }

  // 记录位置 (屏幕坐标)
  const screenX = e.screenX;
  const screenY = e.screenY;
  console.log('[RadialMenu] Starting timer, position:', screenX, screenY);

  // 开始长按计时
  rightClickTimer = setTimeout(() => {
    console.log('[RadialMenu] Long press triggered at:', screenX, screenY);
    // 通过 IPC 触发全局轮盘菜单
    window.api?.send('open-radial-menu', { x: screenX, y: screenY });
    rightClickTimer = null;
  }, radialMenuSettings.longPressDelay || 400);
};

// 右键释放 - 取消计时
const handleRightMouseUp = (e) => {
  if (e.button !== 2) return;

  if (rightClickTimer) {
    clearTimeout(rightClickTimer);
    rightClickTimer = null;
  }
};

// 轮盘选择
const handleRadialSelect = (item) => {
  console.log('[RadialMenu] Selected:', item.action);
  handleSmartClick({ action: item.action, payload: clipboardContent.value });
};

// 轮盘取消
const handleRadialCancel = () => {
  console.log('[RadialMenu] Cancelled');
};

// 轮盘关闭
const handleRadialClose = () => {
  showRadialMenu.value = false;
};

// === 全局轮盘菜单处理 ===
// 全局轮盘选择
const handleGlobalRadialSelect = (item) => {
  console.log('[GlobalRadialMenu] Selected:', item);
  // 发送动作到主进程
  if (item && item.action) {
    window.api?.send('radial-menu-action', { action: item.action, data: { item } });
  }
};

// 全局轮盘取消
const handleGlobalRadialCancel = () => {
  console.log('[GlobalRadialMenu] Cancelled');
  window.api?.send('close-radial-menu');
};

// 全局轮盘关闭
const handleGlobalRadialClose = () => {
  radialMenuVisible.value = false;
  window.api?.send('close-radial-menu');
};

// === 生命周期 ===
onMounted(() => {
  // 检查是否为全局轮盘菜单模式
  const urlParams = new URLSearchParams(window.location.search);
  isRadialMenuMode.value = urlParams.get('radialMenuMode') === 'true';

  if (isRadialMenuMode.value) {
    console.log('[App] Running in Radial Menu Mode');
    // 轮盘菜单模式下，监听初始化事件
    if (window.api) {
      window.api.on('radial-menu-init', (data) => {
        console.log('[App] Radial menu init:', data);
        radialMenuX.value = data.centerX || window.innerWidth / 2;
        radialMenuY.value = data.centerY || window.innerHeight / 2;

        // 加载设置
        if (data.settings) {
          radialMenuTheme.value = data.settings.theme || 'dark';
          radialMenuShowHints.value = data.settings.showHints !== false;
          // 优先使用 slots 格式，兼容 menuItems 格式
          globalRadialMenuSlots.value = data.settings.slots || [];
          globalRadialMenuItems.value = data.settings.menuItems || [];
          console.log('[App] Radial menu slots:', globalRadialMenuSlots.value.length, 'menuItems:', globalRadialMenuItems.value.length);
        }

        // 显示轮盘
        radialMenuVisible.value = true;
      });
    }
    return; // 轮盘模式下不执行后续主界面逻辑
  }

  applySettings();

  // 加载轮盘菜单设置
  try {
    const savedRadial = localStorage.getItem('radial-menu-settings');
    console.log('[App] Raw radial settings from localStorage:', savedRadial ? 'found' : 'not found');
    if (savedRadial) {
      const parsed = JSON.parse(savedRadial);
      Object.assign(radialMenuSettings, parsed);
      console.log('[App] Loaded radial menu settings:', {
        enabled: radialMenuSettings.enabled,
        triggerMode: radialMenuSettings.triggerMode,
        delay: radialMenuSettings.longPressDelay
      });
    } else {
      console.log('[App] Using default radial menu settings:', {
        enabled: radialMenuSettings.enabled,
        triggerMode: radialMenuSettings.triggerMode,
        delay: radialMenuSettings.longPressDelay
      });
    }
  } catch (e) {
    console.error('[App] Failed to load radial menu settings:', e);
  }

  // 键盘事件
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      if (showAddTool.value || showFileInfo.value ||
          showManageFeatures.value || showFeatureModal.value || showConfirmDialog.value || showAbout.value || showSettingsModal.value) {
        showAddTool.value = false;
        showFileInfo.value = false;
        showManageFeatures.value = false;
        showFeatureModal.value = false;
        showConfirmDialog.value = false;
        showAbout.value = false;
        showSettingsModal.value = false;
      } else {
        window.api?.send('hide-window');
      }
    }
  });

  // IPC事件
  if (window.api) {
    window.api.on('clipboard-data', (text) => {
      clipboardContent.value = text;
    });

    // 接收前台进程名（环境感知）
    window.api.on('foreground-process', (processName) => {
      foregroundProcess.value = processName || '';
      console.log('[EnvSensing] Foreground process:', processName);
    });

    window.api.on('trigger-smart-action', ({ action, text }) => {
      const item = ALL_FEATURES.find(i => i.action === action);
      if (item) {
        handleSmartClick({ action: item.action, payload: text });
      }
    });

    window.api.on('color-picked', ({ success, color }) => {
      if (success) {
        ElMessage.success('颜色已复制: ' + color);
      }
    });

    // 托盘菜单显示关于
    window.api.on('show-about', () => {
      showAbout.value = true;
    });

    // 独立弹出框关闭
    window.api.on('dialog-closed', () => {
      console.log('[App] Dialog closed');
    });

    // 独立弹出框返回结果
    window.api.on('dialog-result', (result) => {
      console.log('[App] Dialog result:', result);
      // 处理弹出框返回的结果
      if (result && result.text) {
        window.api?.send('write-clipboard', result.text);
        ElMessage.success('已复制');
      }
    });

    window.api.send('update-global-hotkey', settings.globalHotkey);
    window.api.send('update-smart-hotkeys', JSON.parse(JSON.stringify(smartHotkeys)));

    // 发送自定义工具的快捷键（启动时注册）
    const customHotkeys = {};
    customActions.value.forEach((tool, idx) => {
      if (tool.hotkey) {
        customHotkeys[`custom_${idx}`] = { hotkey: tool.hotkey, tool };
      }
    });
    window.api.send('update-custom-hotkeys', customHotkeys);
  }
});
</script>

<style scoped>
.quicker-use-app {
  height: 100vh;
  background: var(--bg-color);
  color: var(--text-color);
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: opacity 0.2s;
}

.quicker-use-app::-webkit-scrollbar {
  display: none;
}

/* 标题栏 */
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--grid-line);
  flex-shrink: 0;
}

.app-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.5px;
}

.bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon {
  font-size: 30px;
  color: var(--text-dim);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon:hover {
  color: var(--text-color);
  background: rgba(255, 255, 255, 0.08);
}

.action-icon.is-pinned {
  color: var(--accent-color);
}

/* 图钉图标样式 */
.pin-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pin-icon svg {
  width: 18px;
  height: 18px;
}

.pin-icon.is-pinned {
  transform: rotate(45deg);
}

/* 确认弹窗 */
.confirm-dialog :deep(.el-dialog) {
  border-radius: 12px;
}

.confirm-text {
  text-align: center;
  color: var(--text-color);
  font-size: 14px;
  line-height: 1.6;
}

/* 关闭按钮 */
.close-icon:hover {
  color: #f56c6c !important;
  background: rgba(245, 108, 108, 0.15) !important;
}

/* 关于弹窗 */
.about-dialog :deep(.el-dialog) {
  border-radius: 12px;
  background: var(--modal-bg);
}

.about-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line);
  padding: 12px 16px;
}

.about-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.about-logo {
  margin-bottom: 12px;
}

.about-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 4px 0;
}

.about-ver {
  font-size: 12px;
  color: var(--text-dim);
  margin: 0 0 8px 0;
}

.about-desc {
  font-size: 13px;
  color: var(--text-color);
  margin: 0 0 12px 0;
}

.about-features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
}

.about-features span {
  font-size: 10px;
  padding: 3px 8px;
  background: rgba(64, 158, 255, 0.1);
  color: var(--accent-color);
  border-radius: 10px;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.about-author {
  font-size: 13px;
  color: var(--text-color);
  margin: 0 0 8px 0;
}

.about-copy {
  font-size: 11px;
  color: var(--text-dim);
  margin: 0;
}

/* AI 面板容器 */
.ai-panel-container {
  flex: 1;
  min-height: 0;
  margin: 0 10px 10px 10px;
  border: 1px solid var(--grid-line);
  border-radius: 8px;
}
</style>
