<template>
  <el-dialog
    v-model="visible"
    title="添加自定义工具"
    width="90%"
    :close-on-click-modal="true"
    class="add-tool-dialog"
    @dragover.prevent="onDragOver"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="handleFileDrop"
  >
    <!-- 拖放区域 - 点击也可以选择文件 -->
    <div class="drop-zone"
         :class="{ 'drop-active': isDragging }"
         @dragenter.prevent="onDragEnter"
         @dragover.prevent="onDragOver"
         @dragleave.prevent="onDragLeave"
         @drop.prevent="handleFileDrop"
         @click="handleDropZoneClick">
      <template v-if="newItem.path">
        <!-- 已选择文件的预览 -->
        <div class="file-preview" @click.stop>
          <div class="file-icon-large" @click="showIconPicker = true">
            <img v-if="newItem.icon && newItem.icon.startsWith('data:')" :src="newItem.icon" class="preview-icon-img" @error="onIconError">
            <span v-else class="preview-icon-emoji">{{ newItem.icon || '📦' }}</span>
            <div class="icon-overlay">
              <el-icon><Edit /></el-icon>
            </div>
          </div>
          <div class="file-info">
            <el-input v-model="newItem.label" placeholder="输入显示名称" class="name-input" />
            <span class="file-path" :title="newItem.path">{{ newItem.path }}</span>
          </div>
          <el-button text size="small" @click="clearFile" class="clear-btn">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </template>
      <template v-else>
        <!-- 拖放/点击提示 -->
        <el-icon class="drop-icon"><Upload /></el-icon>
        <p class="drop-text">拖放或点击选择可执行文件</p>
        <p class="drop-hint">支持 .exe, .lnk, .bat, .cmd, .msi 文件</p>
      </template>
    </div>

    <!-- 选项区域 -->
    <div class="options-section" v-if="newItem.path">
      <div class="option-row">
        <el-checkbox v-model="newItem.isAdmin" class="admin-check">
          <el-icon><Key /></el-icon>
          <span>以管理员身份运行</span>
        </el-checkbox>
      </div>
      <div class="option-row hotkey-row">
        <span class="hotkey-label">
          <el-icon><Position /></el-icon>
          快捷键
        </span>
        <el-input
          v-model="newItem.hotkey"
          size="small"
          placeholder="点击后按键"
          style="width: 120px;"
          readonly
          @keydown="captureHotkey"
          @focus="hotkeyFocused = true"
          @blur="hotkeyFocused = false"
          :class="{ 'hotkey-active': hotkeyFocused }"
        />
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="dialog-footer" v-if="newItem.path">
      <el-button @click="clearFile">重新选择</el-button>
      <el-button type="primary" @click="confirmAddFile" :disabled="!newItem.path || !newItem.label">
        添加到工具栏
      </el-button>
    </div>

    <!-- 图标选择器 -->
    <el-dialog
      v-model="showIconPicker"
      title="选择图标"
      width="85%"
      append-to-body
      :z-index="3000"
      class="icon-picker-dialog"
      destroy-on-close
    >
      <!-- 保留系统图标选项 -->
      <div class="system-icon-section" v-if="systemIcon">
        <p class="section-title">系统图标</p>
        <div class="system-icon-option" :class="{ active: newItem.icon === systemIcon }" @click="selectSystemIcon">
          <img :src="systemIcon" class="system-icon-img" @error="systemIcon = ''">
          <span>使用系统图标</span>
        </div>
      </div>

      <div class="emoji-section">
        <p class="section-title">快捷选择</p>
        <div class="emoji-grid">
          <span
            v-for="emoji in commonEmojis"
            :key="emoji"
            class="emoji-option"
            :class="{ active: newItem.icon === emoji }"
            @click="selectEmoji(emoji)"
          >{{ emoji }}</span>
        </div>
      </div>

      <div class="icon-section" v-if="ICON_LIBRARY && ICON_LIBRARY.length > 0">
        <p class="section-title">自定义图标</p>
        <div class="icon-grid">
          <div
            v-for="(icon, idx) in ICON_LIBRARY"
            :key="idx"
            class="icon-option"
            :title="icon.name"
            @click="selectSvgIcon(icon.svg)"
          >
            <div v-html="icon.svg" class="icon-svg"></div>
          </div>
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload, Close, Edit, Key, Position } from '@element-plus/icons-vue';
import { ICON_LIBRARY } from '@/utils/iconLibrary';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  existingActions: { type: Array, default: () => [] },
  pendingFile: { type: Object, default: null }  // 从父组件传入的待处理文件
});

const emit = defineEmits(['update:modelValue', 'add-file', 'file-processed']);

const visible = ref(props.modelValue);
const showIconPicker = ref(false);
const isDragging = ref(false);
const systemIcon = ref('');  // 保存系统图标
const hotkeyFocused = ref(false);

const newItem = reactive({
  path: '',
  label: '',
  icon: '',
  isAdmin: false,
  hotkey: ''
});

// 常用 emoji
const commonEmojis = ['📁', '📦', '🎮', '🔧', '⚙️', '🌐', '📝', '🎨', '🎵', '📷', '💻', '🖥️', '📊', '📈', '🔒', '🔑', '📱', '🎯', '🚀', '⚡', '🔥', '💡', '📌', '🎪'];

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val) {
    clearFile();
    // 如果有待处理的文件，立即处理
    if (props.pendingFile) {
      nextTick(() => {
        setFileInfo(props.pendingFile.path, props.pendingFile.name);
        emit('file-processed');
      });
    }
  }
});

// 监听 pendingFile 变化（弹窗已打开时文件拖入）
watch(() => props.pendingFile, (file) => {
  if (file && visible.value) {
    setFileInfo(file.path, file.name);
    emit('file-processed');
  }
}, { immediate: false });

watch(visible, (val) => {
  emit('update:modelValue', val);
});

const clearFile = () => {
  newItem.path = '';
  newItem.label = '';
  newItem.icon = '';
  newItem.isAdmin = false;
  newItem.hotkey = '';
  systemIcon.value = '';
  isDragging.value = false;
};

// 捕获快捷键
const captureHotkey = (e) => {
  e.preventDefault();
  e.stopPropagation();

  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');

  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
  if (!modifierKeys.includes(e.key)) {
    const keyMap = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Escape': 'Esc'
    };
    const key = keyMap[e.key] || e.key.toUpperCase();
    parts.push(key);
  }

  // Esc 清除热键
  if (e.key === 'Escape') {
    newItem.hotkey = '';
    return;
  }

  const hotkey = parts.length > 1 ? parts.join('+') : '';
  if (hotkey) {
    newItem.hotkey = hotkey;
  }
};

const onDragEnter = (e) => {
  e.preventDefault();
  isDragging.value = true;
};

const onDragOver = (e) => {
  e.preventDefault();
  // 必须设置 dropEffect，否则打包后会显示禁止图标
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
  isDragging.value = true;
};

const onDragLeave = (e) => {
  e.preventDefault();
  // 检查是否真的离开了 drop-zone
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragging.value = false;
  }
};

const handleFileDrop = (e) => {
  e.preventDefault();
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    // 获取文件路径：优先使用 Electron API，回退到 file.path 或 file.name
    let filePath = file.name;
    try {
      if (window.api && typeof window.api.getPathForFile === 'function') {
        filePath = window.api.getPathForFile(file);
      } else if (file.path) {
        filePath = file.path;
      }
    } catch (err) {
      console.warn('[AddToolModal] getPathForFile failed:', err);
      filePath = file.path || file.name;
    }

    const ext = filePath.split('.').pop().toLowerCase();

    // 检查是否是支持的文件类型
    if (!['exe', 'lnk', 'bat', 'cmd', 'msi', 'app'].includes(ext)) {
      ElMessage.warning('请拖放可执行文件 (.exe, .lnk, .bat 等)');
      return;
    }

    setFileInfo(filePath, file.name);
  }
};

const setFileInfo = (filePath, fileName) => {
  newItem.path = filePath;
  // 移除扩展名作为默认名称
  newItem.label = fileName.replace(/\.(exe|lnk|app|bat|cmd|msi)$/i, '');
  newItem.icon = '📦';  // 默认图标

  // 获取系统文件图标
  if (window.api) {
    window.api.send('get-file-icon', filePath);
  }
};

// 点击拖放区域 - 弹出文件选择对话框
const handleDropZoneClick = async () => {
  // 如果已有选中的文件，不触发（已有文件时点击由 file-preview 处理）
  if (newItem.path) return;

  if (!window.api?.openFileDialog) {
    ElMessage.warning('文件选择功能不可用');
    return;
  }

  try {
    const result = await window.api.openFileDialog({
      title: '选择可执行文件',
      filters: [
        { name: '可执行文件', extensions: ['exe', 'lnk', 'bat', 'cmd', 'msi'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      const ext = result.filePath.split('.').pop().toLowerCase();
      if (!['exe', 'lnk', 'bat', 'cmd', 'msi', 'app'].includes(ext)) {
        ElMessage.warning('请选择可执行文件 (.exe, .lnk, .bat 等)');
        return;
      }
      setFileInfo(result.filePath, result.fileName);
    }
  } catch (e) {
    console.error('文件选择失败:', e);
    ElMessage.error('文件选择失败: ' + e.message);
  }
};

const confirmAddFile = () => {
  if (!newItem.path || !newItem.label) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  // 检查是否已存在
  const isDuplicate = props.existingActions.some(existing =>
    existing.type === 'file' && existing.path === newItem.path
  );

  if (isDuplicate) {
    ElMessage.warning('该工具已存在');
    return;
  }

  emit('add-file', {
    type: 'file',
    path: newItem.path,
    label: newItem.label,
    icon: newItem.icon || '📦',
    isAdmin: newItem.isAdmin,
    hotkey: newItem.hotkey || ''
  });
  visible.value = false;
  ElMessage.success('工具已添加');
};

const selectSystemIcon = () => {
  if (systemIcon.value) {
    newItem.icon = systemIcon.value;
    showIconPicker.value = false;
  }
};

// 图标加载失败时回退到 emoji
const onIconError = () => {
  newItem.icon = '📦';
  systemIcon.value = '';
};

const selectEmoji = (emoji) => {
  newItem.icon = emoji;
  showIconPicker.value = false;
};

const selectSvgIcon = (svgContent) => {
  // 使用 encodeURIComponent 处理 Unicode 字符
  const encoded = encodeURIComponent(svgContent)
    .replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1));
  const base64 = btoa(encoded);
  newItem.icon = `data:image/svg+xml;base64,${base64}`;
  showIconPicker.value = false;
};

// 监听文件图标返回
const handleFileIconData = (data) => {
  if (data && data.icon && data.path === newItem.path) {
    systemIcon.value = data.icon;  // 保存系统图标
    newItem.icon = data.icon;  // 默认使用系统图标
  }
};

onMounted(() => {
  // 监听文件图标返回
  if (window.api) {
    window.api.on('file-icon-data', handleFileIconData);
  }
});

onUnmounted(() => {
  // 清理（如有必要）
});
</script>

<style scoped>
/* 确保 dialog 遮罩层允许拖拽事件穿透 */
.add-tool-dialog :deep(.el-overlay) {
  pointer-events: auto;
}

.add-tool-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
}

.add-tool-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line);
  padding: 14px 18px;
}

.add-tool-dialog :deep(.el-dialog__body) {
  padding: 16px;
}

/* 拖放区域 */
.drop-zone {
  border: 2px dashed var(--grid-line);
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  transition: all 0.2s;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.drop-zone:hover {
  border-color: var(--accent-color);
  background: rgba(64, 158, 255, 0.05);
}

.drop-zone.drop-active {
  border-color: var(--accent-color);
  background: rgba(64, 158, 255, 0.1);
  border-style: solid;
}

.drop-icon {
  font-size: 40px;
  color: var(--text-dim);
  margin-bottom: 12px;
}

.drop-text {
  font-size: 14px;
  color: var(--text-color);
  margin-bottom: 6px;
  font-weight: 500;
}

.drop-hint {
  font-size: 12px;
  color: var(--text-dim);
}

/* 文件预览 */
.file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.file-icon-large {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-item);
  border-radius: 12px;
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.file-icon-large:hover {
  border-color: var(--accent-color);
}

.file-icon-large:hover .icon-overlay {
  opacity: 1;
}

.icon-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
  font-size: 18px;
}

.preview-icon-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.preview-icon-emoji {
  font-size: 32px;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.name-input :deep(.el-input__wrapper) {
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.name-input :deep(.el-input__inner) {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  padding: 0;
}

.file-path {
  font-size: 11px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-btn {
  flex-shrink: 0;
  color: var(--text-dim);
}

.clear-btn:hover {
  color: #f56c6c;
}

/* 选项区域 */
.options-section {
  margin-top: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.option-row {
  display: flex;
  align-items: center;
}

.option-row.hotkey-row {
  margin-top: 12px;
  justify-content: space-between;
}

.hotkey-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-color);
}

.hotkey-active :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--accent-color) inset !important;
  background: rgba(64, 158, 255, 0.1);
}

.admin-check :deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-color);
}

/* 底部按钮 */
.dialog-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 图标选择器 - 使用全局样式确保正确显示 */
.icon-picker-dialog :deep(.el-dialog) {
  background: var(--modal-bg, #2a2a2a) !important;
  border-radius: 12px;
  border: 1px solid var(--grid-line, #404040);
}

.icon-picker-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line, #404040);
  padding: 12px 16px;
}

.icon-picker-dialog :deep(.el-dialog__body) {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.section-title {
  font-size: 12px;
  color: var(--text-dim, #888);
  margin-bottom: 10px;
  font-weight: 500;
  padding-left: 2px;
}

.system-icon-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line, #404040);
}

.system-icon-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 2px solid var(--grid-line, #404040);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: var(--text-color, #fff);
  background: var(--bg-item, #333);
}

.system-icon-option:hover,
.system-icon-option.active {
  border-color: var(--accent-color, #409eff);
  background: rgba(64, 158, 255, 0.15);
}

.system-icon-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.emoji-section {
  margin-bottom: 16px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-option {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid var(--grid-line, #404040);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--bg-item, #333);
}

.emoji-option:hover {
  border-color: var(--accent-color, #409eff);
  background: rgba(64, 158, 255, 0.15);
  transform: scale(1.08);
}

.emoji-option.active {
  border-color: var(--accent-color, #409eff);
  background: rgba(64, 158, 255, 0.25);
}

.icon-section {
  border-top: 1px solid var(--grid-line, #404040);
  padding-top: 16px;
  margin-top: 8px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.icon-option {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--grid-line, #404040);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  padding: 8px;
  background: var(--bg-item, #333);
}

.icon-option:hover {
  border-color: var(--accent-color, #409eff);
  background: rgba(64, 158, 255, 0.15);
  transform: scale(1.08);
}

.icon-svg {
  width: 24px;
  height: 24px;
}

.icon-svg :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
