<template>
  <el-dialog
    v-model="visible"
    :title="modalData.title"
    width="90%"
    :close-on-click-modal="true"
    :show-close="true"
    class="feature-dialog"
    @closed="handleClose"
  >
    <!-- 文本编辑器类型 -->
    <template v-if="modalData.type === 'text-editor'">
      <div class="toolbar" v-if="modalData.actions?.length > 0">
        <el-button
          v-for="btn in modalData.actions"
          :key="btn.label"
          size="small"
          @click="btn.handler(textContent)"
        >
          {{ btn.label }}
        </el-button>
        <el-button size="small" type="primary" class="copy-btn" @click="copyResult">
          <el-icon><DocumentCopy /></el-icon>
          复制
        </el-button>
      </div>
      <div v-else class="toolbar">
        <el-button size="small" type="primary" @click="copyResult">
          <el-icon><DocumentCopy /></el-icon>
          复制结果
        </el-button>
      </div>
      <el-input
        v-model="textContent"
        type="textarea"
        :rows="10"
        class="code-editor"
        spellcheck="false"
        resize="none"
      />
    </template>

    <!-- 信息提取类型 -->
    <template v-else-if="modalData.type === 'extract'">
      <div class="extract-container">
        <el-input
          v-model="extractInput"
          type="textarea"
          :rows="4"
          placeholder="输入或粘贴要提取的文本..."
          class="extract-input"
        />
        <div class="extract-types">
          <el-button
            v-for="type in extractTypes"
            :key="type.key"
            size="small"
            :type="activeExtractType === type.key ? 'primary' : 'default'"
            @click="doExtract(type.key)"
          >
            <el-icon><component :is="type.icon" /></el-icon>
            {{ type.label }}
          </el-button>
        </div>
        <div class="extract-result" v-if="extractResult.length > 0">
          <div class="result-header">
            <span>提取结果 ({{ extractResult.length }})</span>
            <el-button text size="small" @click="copyExtractResult">复制全部</el-button>
          </div>
          <div class="result-list">
            <div
              v-for="(item, idx) in extractResult"
              :key="idx"
              class="result-item"
              @click="copyText(item)"
            >
              {{ item }}
            </div>
          </div>
        </div>
        <div v-else-if="activeExtractType" class="extract-empty">
          未提取到{{ extractTypes.find(t => t.key === activeExtractType)?.label }}
        </div>
      </div>
    </template>

    <!-- 倒计时类型 -->
    <template v-else-if="modalData.type === 'timer'">
      <div class="timer-container">
        <div class="timer-presets">
          <div
            v-for="preset in timerPresets"
            :key="preset.minutes"
            class="timer-preset"
            @click="startTimer(preset.minutes)"
          >
            <span class="preset-time">{{ preset.minutes }}</span>
            <span class="preset-unit">分钟</span>
          </div>
          <div class="timer-preset custom" @click="showCustomTimer = true">
            <el-icon><Plus /></el-icon>
            <span>自定义</span>
          </div>
        </div>

        <div v-if="showCustomTimer" class="custom-timer">
          <el-input-number v-model="customMinutes" :min="1" :max="999" size="small" />
          <span class="custom-unit">分钟</span>
          <el-button type="primary" size="small" @click="startTimer(customMinutes)">开始</el-button>
        </div>

        <div class="active-timers" v-if="activeTimers.length > 0">
          <div class="timers-header">进行中的倒计时</div>
          <div v-for="timer in activeTimers" :key="timer.id" class="timer-item">
            <div class="timer-info">
              <span class="timer-remaining">{{ formatRemaining(timer) }}</span>
              <span class="timer-end">{{ formatEndTime(timer) }} 结束</span>
            </div>
            <el-button text size="small" type="danger" @click="cancelTimer(timer.id)">取消</el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 二维码显示类型 -->
    <template v-else-if="modalData.type === 'qrcode'">
      <div class="qrcode-container">
        <canvas ref="qrcodeCanvas"></canvas>
        <p class="qrcode-text">{{ modalData.text?.slice(0, 100) }}{{ modalData.text?.length > 100 ? '...' : '' }}</p>
        <el-button type="primary" size="small" @click="downloadQRCode">
          <el-icon><Download /></el-icon>
          下载二维码
        </el-button>
      </div>
    </template>

    <!-- 闪念胶囊类型 -->
    <template v-else-if="modalData.type === 'memo'">
      <div class="memo-container">
        <el-input
          v-model="memoText"
          type="textarea"
          :rows="3"
          placeholder="快速记录你的想法..."
          autofocus
        />
        <div class="memo-list" v-if="memoList.length > 0">
          <div class="memo-list-header">
            <span>备忘录 ({{ memoList.length }})</span>
            <el-button text size="small" @click="clearMemos">清空</el-button>
          </div>
          <div v-for="(memo, idx) in memoList" :key="idx" class="memo-item">
            <span class="memo-content">{{ memo.text }}</span>
            <span class="memo-time">{{ formatTime(memo.time) }}</span>
            <el-icon class="memo-delete" @click="deleteMemo(idx)"><Delete /></el-icon>
          </div>
        </div>
        <el-button type="primary" class="confirm-btn" @click="saveMemo" :disabled="!memoText.trim()">
          保存备忘
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { DocumentCopy, Download, Delete, Plus, Monitor, Message, Iphone, Link } from '@element-plus/icons-vue';
import QRCode from 'qrcode';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  modalData: { type: Object, default: () => ({ title: '', type: 'text-editor' }) },
  initialText: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'close']);

const visible = ref(props.modelValue);
const textContent = ref(props.initialText);
const qrcodeCanvas = ref(null);

// 信息提取
const extractInput = ref('');
const extractResult = ref([]);
const activeExtractType = ref('');
const extractTypes = [
  { key: 'ip', label: 'IP地址', icon: Monitor },
  { key: 'email', label: '邮箱', icon: Message },
  { key: 'phone', label: '手机号', icon: Iphone },
  { key: 'url', label: '链接', icon: Link }
];

// 倒计时
const timerPresets = [
  { minutes: 5 },
  { minutes: 15 },
  { minutes: 25 },
  { minutes: 60 }
];
const showCustomTimer = ref(false);
const customMinutes = ref(10);
const activeTimers = ref(JSON.parse(localStorage.getItem('active-timers') || '[]'));
let timerInterval = null;

// 闪念胶囊
const memoText = ref('');
const memoList = ref(JSON.parse(localStorage.getItem('quick-memos') || '[]'));

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val && props.modalData.type === 'extract') {
    extractInput.value = props.modalData.text || '';
    extractResult.value = [];
    activeExtractType.value = '';
  }
  if (val && props.modalData.type === 'timer') {
    refreshTimers();
  }
  // 二维码显示
  if (val && props.modalData.type === 'qrcode' && props.modalData.text) {
    setTimeout(() => generateQRCode(props.modalData.text), 100);
  }
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

watch(() => props.initialText, (val) => {
  textContent.value = val;
});

watch(() => props.modalData, (data) => {
  if (data.type === 'qrcode' && data.text) {
    nextTick(() => generateQRCode(data.text));
  }
}, { immediate: true, deep: true });

// 信息提取功能
const doExtract = (type) => {
  activeExtractType.value = type;
  const text = extractInput.value;
  let result = [];

  if (type === 'ip') {
    // 改进的IP正则，排除邮箱中的数字
    const ipRegex = /(?<![.\w])(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?![.\w@])/g;
    result = [...new Set(text.match(ipRegex) || [])];
  } else if (type === 'email') {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    result = [...new Set(text.match(emailRegex) || [])];
  } else if (type === 'phone') {
    const phoneRegex = /1[3-9]\d{9}/g;
    result = [...new Set(text.match(phoneRegex) || [])];
  } else if (type === 'url') {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    result = [...new Set(text.match(urlRegex) || [])];
  }

  extractResult.value = result;
};

const copyExtractResult = () => {
  window.api?.send('write-clipboard', extractResult.value.join('\n'));
  ElMessage.success('已复制全部结果');
};

// 倒计时功能
const startTimer = (minutes) => {
  const timer = {
    id: Date.now(),
    minutes,
    endTime: Date.now() + minutes * 60 * 1000
  };
  activeTimers.value.push(timer);
  saveTimers();

  // 设置提醒
  setTimeout(() => {
    const t = activeTimers.value.find(x => x.id === timer.id);
    if (t) {
      // 使用美观的闹钟提醒窗口
      window.api.send('show-alarm', {
        title: '⏰ 倒计时结束',
        message: `${minutes} 分钟倒计时已完成！`,
        minutes
      });
      cancelTimer(timer.id);
    }
  }, minutes * 60 * 1000);

  ElMessage.success(`已设置 ${minutes} 分钟倒计时`);
  showCustomTimer.value = false;
};

const cancelTimer = (id) => {
  activeTimers.value = activeTimers.value.filter(t => t.id !== id);
  saveTimers();
};

const saveTimers = () => {
  localStorage.setItem('active-timers', JSON.stringify(activeTimers.value));
};

const refreshTimers = () => {
  // 移除已过期的计时器
  const now = Date.now();
  activeTimers.value = activeTimers.value.filter(t => t.endTime > now);
  saveTimers();
};

const formatRemaining = (timer) => {
  const remaining = Math.max(0, timer.endTime - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatEndTime = (timer) => {
  const d = new Date(timer.endTime);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 复制功能
const copyResult = () => {
  window.api?.send('write-clipboard', textContent.value);
  ElMessage.success('已复制到剪贴板');
};

const copyText = (text) => {
  window.api?.send('write-clipboard', text);
  ElMessage.success('已复制: ' + text.slice(0, 20) + (text.length > 20 ? '...' : ''));
};

// 二维码
const generateQRCode = async (text) => {
  if (!qrcodeCanvas.value || !text) return;
  try {
    await QRCode.toCanvas(qrcodeCanvas.value, text, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (err) {
    console.error('QRCode generation failed:', err);
  }
};

const downloadQRCode = () => {
  if (!qrcodeCanvas.value) return;
  const link = document.createElement('a');
  link.download = 'qrcode.png';
  link.href = qrcodeCanvas.value.toDataURL();
  link.click();
};

// 闪念胶囊
const saveMemo = () => {
  if (!memoText.value.trim()) return;
  memoList.value.unshift({ text: memoText.value.trim(), time: Date.now() });
  localStorage.setItem('quick-memos', JSON.stringify(memoList.value));
  memoText.value = '';
  ElMessage.success('备忘已保存');
};

const deleteMemo = (index) => {
  memoList.value.splice(index, 1);
  localStorage.setItem('quick-memos', JSON.stringify(memoList.value));
};

const clearMemos = () => {
  memoList.value = [];
  localStorage.setItem('quick-memos', '[]');
};

const formatTime = (ts) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const handleClose = () => {
  emit('close');
};

// 定时刷新倒计时显示
onMounted(() => {
  timerInterval = setInterval(() => {
    if (visible.value && props.modalData.type === 'timer') {
      refreshTimers();
    }
  }, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

defineExpose({
  textContent,
  setContent: (val) => { textContent.value = val; }
});
</script>

<style scoped>
.feature-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
}

.feature-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line);
  padding: 14px 18px;
}

.feature-dialog :deep(.el-dialog__title) {
  color: var(--text-color);
  font-size: 15px;
  font-weight: 600;
}

.feature-dialog :deep(.el-dialog__body) {
  padding: 16px;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  padding: 10px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.toolbar .el-button {
  border-radius: 18px;
  font-size: 12px;
  padding: 6px 14px;
  height: auto;
}

.toolbar .el-button--primary {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.copy-btn {
  margin-left: auto;
}

.code-editor :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  min-height: 200px;
}

/* 信息提取 */
.extract-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.extract-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  border-radius: 8px;
}

.extract-types {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.extract-types .el-button {
  border-radius: 20px;
  padding: 8px 16px;
}

.extract-result {
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.15) 0%, rgba(103, 126, 234, 0.15) 100%);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-color);
}

.result-list {
  max-height: 220px;
  overflow-y: auto;
}

.result-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--grid-line);
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-item::before {
  content: '📋';
  font-size: 12px;
  opacity: 0.5;
}

.result-item:hover {
  background: rgba(64, 158, 255, 0.15);
  padding-left: 20px;
}

.result-item:hover::before {
  opacity: 1;
}

.result-item:last-child {
  border-bottom: none;
}

.extract-empty {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-dim);
  font-size: 14px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

/* 倒计时 */
.timer-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timer-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.timer-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  background: rgba(64, 158, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.timer-preset:hover {
  border-color: var(--accent-color);
  background: rgba(64, 158, 255, 0.2);
}

.preset-time {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-color);
}

.preset-unit {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
}

.timer-preset.custom {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-dim);
}

.timer-preset.custom .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.custom-timer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.custom-unit {
  color: var(--text-dim);
  font-size: 13px;
}

.active-timers {
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  overflow: hidden;
}

.timers-header {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
}

.timer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--grid-line);
}

.timer-item:last-child {
  border-bottom: none;
}

.timer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timer-remaining {
  font-size: 18px;
  font-weight: 600;
  font-family: 'Consolas', monospace;
  color: var(--accent-color);
}

.timer-end {
  font-size: 11px;
  color: var(--text-dim);
}

/* 二维码 */
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(103, 126, 234, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid var(--grid-line);
}

.qrcode-container canvas {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  padding: 10px;
}

.qrcode-text {
  font-size: 12px;
  color: var(--text-dim);
  word-break: break-all;
  text-align: center;
  max-width: 100%;
  background: rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Consolas', monospace;
}

/* 闪念胶囊 */
.memo-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memo-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--grid-line);
  border-radius: 8px;
}

.memo-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--grid-line);
  font-size: 12px;
  color: var(--text-dim);
}

.memo-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--grid-line);
  gap: 8px;
}

.memo-item:last-child {
  border-bottom: none;
}

.memo-content {
  flex: 1;
  font-size: 13px;
  color: var(--text-color);
}

.memo-time {
  font-size: 11px;
  color: var(--text-dim);
}

.memo-delete {
  cursor: pointer;
  color: var(--text-dim);
  transition: color 0.2s;
}

.memo-delete:hover {
  color: #f56c6c;
}

.confirm-btn {
  width: 100%;
}
</style>
