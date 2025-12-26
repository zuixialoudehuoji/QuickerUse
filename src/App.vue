<template>
  <div class="quicker-use-app" @dragover.prevent @drop.prevent="handleDrop">
    <!-- 顶部标题栏 (可拖动) -->
    <div class="title-bar" style="-webkit-app-region: drag;">
      <span class="app-title">QuickerUse</span>
      <div class="bar-actions" style="-webkit-app-region: no-drag;">
        <el-tooltip content="关于" placement="bottom">
          <el-icon class="action-icon" @click="showAbout = true"><InfoFilled /></el-icon>
        </el-tooltip>
        <el-tooltip content="设置" placement="bottom">
          <el-icon class="action-icon" @click="showSettings = true"><Setting /></el-icon>
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
      v-if="smartDisplayList.length > 0"
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

    <!-- 功能弹窗 -->
    <FeatureModal
      v-model="showFeatureModal"
      :modal-data="featureModalData"
      :initial-text="featureTextContent"
      ref="featureModalRef"
      @close="handleFeatureModalClose"
    />

    <!-- 设置弹窗 -->
    <SettingsModal
      v-model="showSettings"
      :settings="settings"
      :hotkeys="smartHotkeys"
      @settings-change="handleSettingsChange"
      @hotkeys-change="handleHotkeysChange"
      @reset-tools="resetCustomActions"
      @reset-all="resetAllSettings"
    />

    <!-- 添加工具弹窗 -->
    <AddToolModal
      v-model="showAddTool"
      :existing-actions="customActions"
      @add-file="addCustomTool"
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Setting, InfoFilled, Close } from '@element-plus/icons-vue';

// 组件
import ToolGrid from './components/ToolGrid.vue';
import FeatureModal from './components/FeatureModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import AddToolModal from './components/AddToolModal.vue';
import FileInfoModal from './components/FileInfoModal.vue';
import ManageFeaturesModal from './components/ManageFeaturesModal.vue';

// 工具
import textProcessor from './utils/textProcessor';
import fileProcessor from './utils/fileProcessor';
import { ALL_FEATURES, DEFAULT_SETTINGS, SEARCH_ENGINES, TRANSLATE_SERVICES } from './utils/constants';

// === 状态 ===
const clipboardContent = ref('');
const smartBlacklist = ref(new Set(JSON.parse(localStorage.getItem('smart-blacklist') || '[]')));
const smartOrder = ref(JSON.parse(localStorage.getItem('smart-order') || '[]'));
const customActions = ref(JSON.parse(localStorage.getItem('custom-actions') || '[]'));
const settings = reactive(JSON.parse(localStorage.getItem('app-settings') || JSON.stringify(DEFAULT_SETTINGS)));
const smartHotkeys = reactive(JSON.parse(localStorage.getItem('smart-hotkeys') || '{}'));
const isPinned = ref(false);

// 弹窗状态
const showSettings = ref(false);
const showAddTool = ref(false);
const showFileInfo = ref(false);
const showManageFeatures = ref(false);
const showFeatureModal = ref(false);
const showConfirmDialog = ref(false);
const showAbout = ref(false);

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

// 智能推荐列表 - 排除已添加到我的工具中的内置功能
const smartFiltered = computed(() => {
  let list = [];
  if (settings.mode === 'all') {
    list = ALL_FEATURES;
  } else {
    const text = clipboardContent.value;
    list = text ? textProcessor.analyze(text) : ALL_FEATURES.slice(0, 8);
  }
  // 过滤黑名单和已添加到自定义区的内置功能
  return list.filter(i =>
    !smartBlacklist.value.has(i.action) &&
    !customActionSet.value.has(i.action)
  );
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
    openTextEditor('JSON 处理', result, [
      { label: '格式化', handler: (t) => { featureModalRef.value?.setContent(textProcessor.processJsonFormat(t)); } },
      { label: '压缩', handler: (t) => { featureModalRef.value?.setContent(textProcessor.processJsonMinify(t)); } },
      { label: '校验', handler: (t) => {
        try { JSON.parse(t); ElMessage.success('JSON格式正确'); }
        catch { ElMessage.error('JSON格式错误'); }
      }}
    ]);
  }
  // SQL处理
  else if (action === 'sql-in') {
    openTextEditor('SQL IN', textProcessor.processSqlIn(rawText), [
      { label: '转IN', handler: (t) => { featureModalRef.value?.setContent(textProcessor.processSqlIn(t)); } },
      { label: '逗号分隔', handler: (t) => { featureModalRef.value?.setContent(t.replace(/(\r\n|\n|\r)/gm, ',')); } }
    ]);
  }
  // 时间戳转换
  else if (action === 'timestamp-convert') {
    const pad = (n) => String(n).padStart(2, '0');

    const formatDate = (date, format) => {
      const y = date.getFullYear(), m = pad(date.getMonth() + 1), d = pad(date.getDate());
      const H = pad(date.getHours()), M = pad(date.getMinutes()), S = pad(date.getSeconds());
      const formats = {
        'std': `${y}-${m}-${d} ${H}:${M}:${S}`,
        'date': `${y}-${m}-${d}`,
        'time': `${H}:${M}:${S}`,
        'cn': `${y}年${m}月${d}日 ${H}:${M}:${S}`,
        'compact': `${y}${m}${d}${H}${M}${S}`
      };
      return formats[format] || formats['std'];
    };

    const parse = (t) => {
      const s = t.trim();
      if (/^\d{10}$/.test(s)) return new Date(parseInt(s) * 1000);
      if (/^\d{13}$/.test(s)) return new Date(parseInt(s));
      return new Date(s);
    };

    const toFormat = (t, fmt) => {
      const date = parse(t);
      return isNaN(date.getTime()) ? '无效时间' : formatDate(date, fmt);
    };

    const toTs = (t, ms) => {
      const date = new Date(t.trim());
      if (isNaN(date.getTime())) return '无效日期';
      return ms ? date.getTime().toString() : Math.floor(date.getTime() / 1000).toString();
    };

    const isTs = textProcessor.isTimestamp(rawText.trim());
    const result = isTs ? toFormat(rawText, 'std') : toTs(rawText, false);

    openTextEditor('时间戳转换', result, [
      { label: '标准', handler: (t) => { featureModalRef.value?.setContent(toFormat(t, 'std')); } },
      { label: '日期', handler: (t) => { featureModalRef.value?.setContent(toFormat(t, 'date')); } },
      { label: '时间', handler: (t) => { featureModalRef.value?.setContent(toFormat(t, 'time')); } },
      { label: '中文', handler: (t) => { featureModalRef.value?.setContent(toFormat(t, 'cn')); } },
      { label: '紧凑', handler: (t) => { featureModalRef.value?.setContent(toFormat(t, 'compact')); } },
      { label: '秒戳', handler: (t) => { featureModalRef.value?.setContent(toTs(t, false)); } },
      { label: '毫秒戳', handler: (t) => { featureModalRef.value?.setContent(toTs(t, true)); } }
    ]);
  }
  // 变量命名转换
  else if (action === 'to-camel') {
    // 支持空格、下划线、横线分隔的转换
    const toCamel = (s) => s.trim().toLowerCase().replace(/[-_\s]+([a-z])/g, (_, c) => c.toUpperCase());
    const toSnake = (s) => s.trim().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[-\s]+/g, '_');
    const toKebab = (s) => s.trim().replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[_\s]+/g, '-');
    const toPascal = (s) => { const c = toCamel(s); return c.charAt(0).toUpperCase() + c.slice(1); };
    const toUpper = (s) => toSnake(s).toUpperCase();

    // 保存原始文本用于复原
    const originalText = rawText;

    openTextEditor('变量命名转换', toCamel(rawText), [
      { label: '小驼峰', handler: (t) => { featureModalRef.value?.setContent(toCamel(t)); } },
      { label: '大驼峰', handler: (t) => { featureModalRef.value?.setContent(toPascal(t)); } },
      { label: '下划线', handler: (t) => { featureModalRef.value?.setContent(toSnake(t)); } },
      { label: '横线', handler: (t) => { featureModalRef.value?.setContent(toKebab(t)); } },
      { label: '大写', handler: (t) => { featureModalRef.value?.setContent(toUpper(t)); } },
      { label: '复原', handler: () => { featureModalRef.value?.setContent(originalText); } }
    ]);
  }
  // YAML处理
  else if (action === 'yaml-format' || action === 'yaml-to-json') {
    openTextEditor('YAML 处理', rawText || '', [
      { label: '格式化', handler: (t) => {
        try {
          const lines = t.split('\n');
          let indent = 0;
          const formatted = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.endsWith(':')) {
              const result = '  '.repeat(indent) + trimmed;
              indent++;
              return result;
            }
            if (trimmed.startsWith('-')) {
              return '  '.repeat(indent) + trimmed;
            }
            return '  '.repeat(indent) + trimmed;
          }).join('\n');
          featureModalRef.value?.setContent(formatted);
        } catch (e) {
          ElMessage.error('格式化失败: ' + e.message);
        }
      }},
      { label: '校验', handler: (t) => {
        const lines = t.split('\n').filter(l => l.trim());
        let valid = true;
        lines.forEach((line) => {
          if (line.trim() && !line.includes(':') && !line.trim().startsWith('-') && !line.trim().startsWith('#')) {
            valid = false;
          }
        });
        if (valid) {
          ElMessage.success('YAML 格式正确');
        } else {
          ElMessage.warning('YAML 格式可能有问题');
        }
      }},
      { label: '转JSON', handler: (t) => {
        const result = textProcessor.processYamlToJson(t);
        if (result.startsWith('转换失败')) {
          ElMessage.error(result);
        } else {
          featureModalRef.value?.setContent(result);
        }
      }}
    ]);
  }
  // 信息提取 - 带类型选择
  else if (action === 'extract-info') {
    featureModalData.title = '信息提取';
    featureModalData.type = 'extract';
    featureModalData.text = rawText;
    showFeatureModal.value = true;
  }
  // 生成器
  else if (action === 'generate-uuid') {
    // 生成标准UUID
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    // 生成无横杠UUID
    const generateUUIDNoHyphen = () => generateUUID().replace(/-/g, '');
    // 生成指定位数
    const generateShortId = (len) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const uuid = generateUUID();
    openTextEditor('UUID 生成器', uuid, [
      { label: '标准UUID', handler: () => { featureModalRef.value?.setContent(generateUUID()); } },
      { label: '无短横', handler: () => { featureModalRef.value?.setContent(generateUUIDNoHyphen()); } },
      { label: '大写', handler: (t) => { featureModalRef.value?.setContent(t.toUpperCase()); } },
      { label: '小写', handler: (t) => { featureModalRef.value?.setContent(t.toLowerCase()); } },
      { label: '8位ID', handler: () => { featureModalRef.value?.setContent(generateShortId(8)); } },
      { label: '12位ID', handler: () => { featureModalRef.value?.setContent(generateShortId(12)); } },
      { label: '16位ID', handler: () => { featureModalRef.value?.setContent(generateShortId(16)); } },
      { label: '32位ID', handler: () => { featureModalRef.value?.setContent(generateShortId(32)); } },
      { label: '重新生成', handler: () => { featureModalRef.value?.setContent(generateUUID()); } }
    ]);
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
    openTextEditor('强密码生成器', generatePwd(), [
      { label: '重新生成', handler: () => { featureModalRef.value?.setContent(generatePwd()); } }
    ]);
  }
  // 取色器
  else if (action === 'color-picker') {
    window.api?.send('hide-window');
    setTimeout(() => {
      window.api?.send('pick-color');
    }, 200);
  }
  // 贴图置顶
  else if (action === 'snip-pin') {
    window.api?.send('snip-pin');
  }
  // 倒计时
  else if (action === 'timer') {
    featureModalData.title = '倒计时';
    featureModalData.type = 'timer';
    showFeatureModal.value = true;
  }
  // 闪念胶囊
  else if (action === 'memo') {
    featureModalData.title = '闪念胶囊';
    featureModalData.type = 'memo';
    showFeatureModal.value = true;
  }
  // 二维码
  else if (action === 'generate-qr') {
    if (!rawText) return ElMessage.warning('无内容生成二维码');
    featureModalData.title = '二维码';
    featureModalData.type = 'qrcode';
    featureModalData.text = rawText;
    showFeatureModal.value = true;
  }
  else {
    console.warn('Unknown action:', action);
  }
};

// 打开文本编辑器弹窗
const openTextEditor = (title, content, actions) => {
  featureTextContent.value = content;
  featureModalData.title = title;
  featureModalData.type = 'text-editor';
  featureModalData.actions = actions || [];
  showFeatureModal.value = true;
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
      showAddTool.value = true;
      // 延迟设置拖拽的文件信息，等待弹窗完全渲染
      setTimeout(() => {
        // 通过事件通知AddToolModal
        window.dispatchEvent(new CustomEvent('file-dropped', {
          detail: { path: filePath, name: file.name }
        }));
      }, 200);
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

// === 生命周期 ===
onMounted(() => {
  applySettings();

  // 键盘事件
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      if (showSettings.value || showAddTool.value || showFileInfo.value ||
          showManageFeatures.value || showFeatureModal.value || showConfirmDialog.value || showAbout.value) {
        showSettings.value = false;
        showAddTool.value = false;
        showFileInfo.value = false;
        showManageFeatures.value = false;
        showFeatureModal.value = false;
        showConfirmDialog.value = false;
        showAbout.value = false;
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

    // 贴图置顶结果
    window.api.on('snip-pin-result', ({ success, error }) => {
      if (!success) {
        ElMessage.warning(error || '贴图失败');
      }
    });

    window.api.send('update-global-hotkey', settings.globalHotkey);
    window.api.send('update-smart-hotkeys', JSON.parse(JSON.stringify(smartHotkeys)));
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
</style>
