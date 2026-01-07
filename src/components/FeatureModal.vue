<template>
  <el-dialog
    v-model="visible"
    :title="modalData.title"
    width="auto"
    :close-on-click-modal="true"
    :show-close="true"
    class="feature-dialog"
    @closed="handleClose"
  >
    <!-- 文本编辑器类型 -->
    <template v-if="modalData.type === 'text-editor'">
      <div class="toolbar" v-if="modalData.actions?.length > 0">
        <div class="action-btns">
          <span
            v-for="btn in modalData.actions"
            :key="btn.label"
            class="action-btn"
            @click="btn.handler(textContent)"
          >{{ btn.label }}</span>
        </div>
        <span class="action-btn primary" @click="copyResult">复制</span>
      </div>
      <div v-else class="toolbar">
        <span class="action-btn primary" @click="copyResult">复制结果</span>
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
        <div class="extract-bar">
          <div class="extract-btns">
            <span
              v-for="type in extractTypes"
              :key="type.key"
              class="action-btn"
              :class="{ active: activeExtractType === type.key }"
              @click="doExtract(type.key)"
            >{{ type.label }}</span>
          </div>
          <span v-if="extractResult.length > 0" class="action-btn primary" @click="copyExtractResult">复制全部</span>
        </div>
        <el-input
            v-model="extractInput"
            type="textarea"
            :rows="10"
            placeholder="输入或粘贴要提取的文本..."
            class="extract-input"
        />
        <div class="extract-result" v-if="extractResult.length > 0">
          <div
            v-for="(item, idx) in extractResult"
            :key="idx"
            class="result-item"
            @click="copyText(item)"
          >{{ item }}</div>
        </div>
        <div v-else-if="activeExtractType" class="extract-empty">
          未找到匹配项
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

    <!-- Markdown预览类型 -->
    <template v-else-if="modalData.type === 'markdown'">
      <div class="markdown-container">
        <div class="md-toolbar">
          <div class="md-tabs">
            <span class="md-tab" :class="{ active: mdViewMode === 'preview' }" @click="mdViewMode = 'preview'">预览</span>
            <span class="md-tab" :class="{ active: mdViewMode === 'split' }" @click="mdViewMode = 'split'">分栏</span>
            <span class="md-tab" :class="{ active: mdViewMode === 'source' }" @click="mdViewMode = 'source'">源码</span>
          </div>
          <div class="md-stats" v-if="modalData.markdown?.stats">
            <span>{{ modalData.markdown.stats.chars }} 字符</span>
            <span>{{ modalData.markdown.stats.words }} 词</span>
            <span>{{ modalData.markdown.stats.lines }} 行</span>
          </div>
          <div class="md-actions">
            <span class="action-btn" @click="copyMarkdownHtml">复制HTML</span>
            <span class="action-btn primary" @click="copyMarkdownSource">复制源码</span>
          </div>
        </div>

        <!-- 目录导航 -->
        <div class="md-toc" v-if="modalData.markdown?.toc?.length > 0 && mdViewMode === 'preview'">
          <div class="toc-title">目录</div>
          <div
            v-for="(item, idx) in modalData.markdown.toc"
            :key="idx"
            class="toc-item"
            :style="{ paddingLeft: (item.level - 1) * 12 + 'px' }"
          >{{ item.text }}</div>
        </div>

        <!-- 预览/编辑区域 -->
        <div class="md-content" :class="mdViewMode">
          <div class="md-editor" v-if="mdViewMode !== 'preview'">
            <el-input
              v-model="mdSource"
              type="textarea"
              :rows="15"
              placeholder="输入 Markdown 文本..."
              class="md-source"
              @input="updateMarkdownPreview"
            />
          </div>
          <div
            class="md-preview markdown-body"
            v-if="mdViewMode !== 'source'"
            v-html="mdHtml"
          ></div>
        </div>
      </div>
    </template>

    <!-- OCR 文字识别类型 -->
    <template v-else-if="modalData.type === 'ocr'">
      <div class="ocr-container">
        <!-- 图片输入区 -->
        <div class="ocr-input">
          <div
            class="ocr-dropzone"
            :class="{ 'has-image': ocrImage }"
            @click="selectOcrImage"
            @dragover.prevent
            @drop.prevent="handleOcrDrop"
          >
            <template v-if="!ocrImage">
              <el-icon class="drop-icon"><Upload /></el-icon>
              <p>点击选择图片或拖拽图片到此处</p>
              <p class="drop-hint">支持 PNG、JPG、BMP 格式</p>
            </template>
            <img v-else :src="ocrImage" class="preview-image" />
          </div>
          <input
            ref="ocrFileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleOcrFileSelect"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="ocr-actions">
          <el-button @click="pasteOcrImage" size="small">
            <el-icon><DocumentCopy /></el-icon>
            从剪贴板粘贴
          </el-button>
          <el-button
            type="primary"
            @click="startOcr"
            :loading="ocrStatus === 'recognizing'"
            :disabled="!ocrImage"
            size="small"
          >
            {{ ocrStatus === 'recognizing' ? `识别中 ${ocrProgress}%` : '开始识别' }}
          </el-button>
        </div>

        <!-- 进度条 -->
        <el-progress
          v-if="ocrStatus === 'recognizing'"
          :percentage="ocrProgress"
          :stroke-width="6"
          class="ocr-progress"
        />

        <!-- 识别结果 -->
        <div class="ocr-result" v-if="ocrResult || ocrError">
          <div class="result-header">
            <span>识别结果</span>
            <div class="result-actions" v-if="ocrResult">
              <span class="action-btn" @click="copyOcrResult">复制</span>
              <span class="action-btn" @click="clearOcr">清空</span>
            </div>
          </div>
          <el-input
            v-if="ocrResult"
            v-model="ocrResult"
            type="textarea"
            :rows="6"
            class="result-text"
          />
          <div v-if="ocrError" class="ocr-error">
            <el-icon><Warning /></el-icon>
            {{ ocrError }}
          </div>
        </div>
      </div>
    </template>

    <!-- AI 智能助手类型 -->
    <template v-else-if="modalData.type === 'ai'">
      <div class="ai-container">
        <!-- 未配置提示 -->
        <div v-if="!aiConfigured" class="ai-not-configured">
          <el-icon class="warn-icon"><Warning /></el-icon>
          <p>请先配置 API Key</p>
          <el-button type="primary" size="small" @click="showAiConfig = true">配置 AI</el-button>
        </div>

        <!-- 主界面 -->
        <template v-else>
          <!-- 快捷操作 -->
          <div class="ai-quick-actions">
            <span
              v-for="(template, key) in aiTemplates"
              :key="key"
              class="ai-action-btn"
              :class="{ active: aiSelectedTemplate === key }"
              @click="selectAiTemplate(key)"
            >{{ template.name }}</span>
          </div>

          <!-- 输入区 -->
          <el-input
            v-model="aiInput"
            type="textarea"
            :rows="4"
            placeholder="输入文本或问题..."
            class="ai-input"
          />

          <!-- 操作按钮 -->
          <div class="ai-actions">
            <el-button
              type="primary"
              @click="sendAiRequest"
              :loading="aiLoading"
              :disabled="!aiInput.trim()"
            >
              {{ aiLoading ? '处理中...' : '发送' }}
            </el-button>
            <el-button @click="clearAi" :disabled="aiLoading">清空</el-button>
            <el-button @click="showAiConfig = true" size="small" text>
              <el-icon><Setting /></el-icon>
            </el-button>
          </div>

          <!-- AI 响应 -->
          <div class="ai-response" v-if="aiResponse || aiError">
            <div class="response-header">
              <span>AI 回复</span>
              <div class="response-actions" v-if="aiResponse">
                <span class="action-btn" @click="copyAiResponse">复制</span>
              </div>
            </div>
            <div v-if="aiResponse" class="response-content" v-html="formatAiResponse(aiResponse)"></div>
            <div v-if="aiError" class="ai-error">
              <el-icon><Warning /></el-icon>
              {{ aiError }}
            </div>
          </div>
        </template>

        <!-- 配置弹窗 -->
        <el-dialog
          v-model="showAiConfig"
          title="AI 配置"
          width="360px"
          append-to-body
          class="ai-config-dialog"
        >
          <el-form label-width="80px" size="small">
            <el-form-item label="服务商">
              <el-select v-model="aiConfig.provider" @change="onProviderChange">
                <el-option label="OpenAI" value="openai" />
                <el-option label="Claude" value="claude" />
                <el-option label="自定义" value="custom" />
              </el-select>
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="aiConfig.apiKey" type="password" show-password placeholder="输入 API Key" />
            </el-form-item>
            <el-form-item label="模型">
              <el-select v-model="aiConfig.model">
                <el-option
                  v-for="model in availableModels"
                  :key="model"
                  :label="model"
                  :value="model"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Endpoint" v-if="aiConfig.provider === 'custom'">
              <el-input v-model="aiConfig.endpoint" placeholder="自定义 API 地址" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showAiConfig = false">取消</el-button>
            <el-button type="primary" @click="saveAiConfig">保存</el-button>
          </template>
        </el-dialog>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, Delete, Plus, Monitor, Message, Iphone, Link, Upload, DocumentCopy, Warning, Setting } from '@element-plus/icons-vue';
import QRCode from 'qrcode';
import * as markdownUtil from '../utils/markdown';
import * as ocrUtil from '../utils/ocr';
import * as aiUtil from '../utils/ai';

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

// Markdown预览
const mdViewMode = ref('preview'); // preview | split | source
const mdSource = ref('');
const mdHtml = ref('');

// OCR 识别
const ocrFileInput = ref(null);
const ocrImage = ref('');
const ocrStatus = ref('idle'); // idle | recognizing | done | error
const ocrProgress = ref(0);
const ocrResult = ref('');
const ocrError = ref('');

// AI 助手
const showAiConfig = ref(false);
const aiConfigured = ref(false);
const aiTemplates = ref({});
const aiSelectedTemplate = ref('ask');
const aiInput = ref('');
const aiLoading = ref(false);
const aiResponse = ref('');
const aiError = ref('');
const aiConfig = reactive(aiUtil.getConfig());
const availableModels = ref([]);

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
  // Markdown预览初始化
  if (val && props.modalData.type === 'markdown') {
    mdSource.value = props.modalData.markdown?.source || '';
    mdHtml.value = props.modalData.markdown?.html || '';
    mdViewMode.value = 'preview';
  }
  // OCR初始化
  if (val && props.modalData.type === 'ocr') {
    ocrImage.value = '';
    ocrStatus.value = 'idle';
    ocrProgress.value = 0;
    ocrResult.value = '';
    ocrError.value = '';
  }
  // AI初始化
  if (val && props.modalData.type === 'ai') {
    aiInput.value = props.modalData.ai?.inputText || '';
    aiTemplates.value = props.modalData.ai?.templates || aiUtil.PROMPT_TEMPLATES;
    aiConfigured.value = aiUtil.isConfigured();
    aiResponse.value = '';
    aiError.value = '';
    aiSelectedTemplate.value = 'ask';
    updateAvailableModels();
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

// Markdown 预览功能
const updateMarkdownPreview = () => {
  if (mdSource.value) {
    mdHtml.value = markdownUtil.render(mdSource.value);
  } else {
    mdHtml.value = '';
  }
};

const copyMarkdownHtml = () => {
  window.api?.send('write-clipboard', mdHtml.value);
  ElMessage.success('已复制 HTML');
};

const copyMarkdownSource = () => {
  window.api?.send('write-clipboard', mdSource.value);
  ElMessage.success('已复制源码');
};

// OCR 识别功能
const selectOcrImage = () => {
  ocrFileInput.value?.click();
};

const handleOcrFileSelect = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    loadImageFile(file);
  }
};

const handleOcrDrop = (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    loadImageFile(file);
  }
};

const loadImageFile = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    ocrImage.value = e.target.result;
    ocrResult.value = '';
    ocrError.value = '';
    ocrStatus.value = 'idle';
  };
  reader.readAsDataURL(file);
};

const pasteOcrImage = async () => {
  try {
    // 尝试从剪贴板读取图片
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const reader = new FileReader();
        reader.onload = (e) => {
          ocrImage.value = e.target.result;
          ocrResult.value = '';
          ocrError.value = '';
          ocrStatus.value = 'idle';
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
    ElMessage.warning('剪贴板中没有图片');
  } catch (e) {
    ElMessage.error('无法读取剪贴板: ' + e.message);
  }
};

const startOcr = async () => {
  if (!ocrImage.value) return;

  ocrStatus.value = 'recognizing';
  ocrProgress.value = 0;
  ocrResult.value = '';
  ocrError.value = '';

  const result = await ocrUtil.recognize(ocrImage.value, {}, (progress) => {
    ocrProgress.value = progress;
  });

  if (result.success) {
    ocrStatus.value = 'done';
    ocrResult.value = result.text;
    ElMessage.success(`识别完成，置信度 ${result.confidence.toFixed(1)}%`);
  } else {
    ocrStatus.value = 'error';
    ocrError.value = result.error;
  }
};

const copyOcrResult = () => {
  window.api?.send('write-clipboard', ocrResult.value);
  ElMessage.success('已复制识别结果');
};

const clearOcr = () => {
  ocrImage.value = '';
  ocrResult.value = '';
  ocrError.value = '';
  ocrStatus.value = 'idle';
  ocrProgress.value = 0;
};

// AI 助手功能
const updateAvailableModels = () => {
  const provider = aiUtil.AI_PROVIDERS[aiConfig.provider];
  availableModels.value = provider?.models || [];
  if (availableModels.value.length > 0 && !availableModels.value.includes(aiConfig.model)) {
    aiConfig.model = availableModels.value[0];
  }
};

const onProviderChange = () => {
  updateAvailableModels();
};

const saveAiConfig = () => {
  aiUtil.saveConfig(aiConfig);
  aiConfigured.value = aiUtil.isConfigured();
  showAiConfig.value = false;
  ElMessage.success('配置已保存');
};

const selectAiTemplate = (key) => {
  aiSelectedTemplate.value = key;
};

const sendAiRequest = async () => {
  if (!aiInput.value.trim()) return;

  aiLoading.value = true;
  aiError.value = '';
  aiResponse.value = '';

  try {
    const result = await aiUtil.useTemplate(
      aiSelectedTemplate.value,
      aiInput.value,
      {},
      (chunk, full) => {
        aiResponse.value = full;
      }
    );
    aiResponse.value = result;
  } catch (e) {
    aiError.value = e.message || '请求失败';
  } finally {
    aiLoading.value = false;
  }
};

const copyAiResponse = () => {
  window.api?.send('write-clipboard', aiResponse.value);
  ElMessage.success('已复制');
};

const clearAi = () => {
  aiInput.value = '';
  aiResponse.value = '';
  aiError.value = '';
};

const formatAiResponse = (text) => {
  // 简单的 markdown 渲染：代码块、换行
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
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
.feature-dialog :deep(.el-overlay) {
  position: fixed;
  inset: 0;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-dialog :deep(.el-overlay-dialog) {
  position: static;
  overflow: visible;
}

.feature-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  margin: 0;
  position: relative;
  max-height: none;
  overflow: visible;
}

.feature-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line);
  padding: 12px 16px;
}

.feature-dialog :deep(.el-dialog__title) {
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
}

.feature-dialog :deep(.el-dialog__body) {
  padding: 14px;
  overflow: visible;
  max-height: none;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: var(--modal-bg);
  border-radius: 6px;
  border: 1px solid var(--grid-line);
  gap: 6px;
  flex-wrap: wrap;
}

.action-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-color);
  background: var(--bg-item);
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  height: 24px;
  line-height: 1;
}

.action-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}

.action-btn.primary {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
  font-weight: 500;
}

.action-btn.primary:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.code-editor :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  height: 200px;
  width: 380px;
  resize: none;
}

/* 信息提取 */
.extract-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 360px;
}

.extract-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  border-radius: 6px;
  font-size: 13px;
}

.extract-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--modal-bg);
  border-radius: 6px;
  border: 1px solid var(--grid-line);
  gap: 6px;
  flex-wrap: wrap;
}

.extract-btns {
  display: flex;
  gap: 4px;
}

.action-btn.active {
  background: #409eff;
  color: #fff;
}

.extract-result {
  border: 1px solid var(--grid-line);
  border-radius: 6px;
  overflow: hidden;
}

.result-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--grid-line);
  font-size: 12px;
  font-family: 'Consolas', monospace;
  cursor: pointer;
  color: var(--text-color);
}

.result-item:hover {
  background: rgba(64, 158, 255, 0.15);
}

.result-item:last-child {
  border-bottom: none;
}

.extract-empty {
  text-align: center;
  padding: 16px;
  color: var(--text-dim);
  font-size: 12px;
}

/* 倒计时 */
.timer-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 300px;
}

.timer-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.timer-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 10px;
  background: rgba(64, 158, 255, 0.08);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.timer-preset:hover {
  border-color: var(--accent-color);
  background: rgba(64, 158, 255, 0.15);
}

.preset-time {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-color);
}

.preset-unit {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}

.timer-preset.custom {
  background: rgba(0, 0, 0, 0.08);
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
  padding: 10px 12px;
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
  font-size: 20px;
  font-weight: 600;
  font-family: 'Consolas', monospace;
  color: var(--accent-color);
}

.timer-end {
  font-size: 12px;
  color: var(--text-dim);
}

/* 二维码 */
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(103, 126, 234, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid var(--grid-line);
  width: 260px;
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
  width: 320px;
}

.memo-list {
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

/* Markdown 预览 */
.markdown-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 480px;
}

.md-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.md-tabs {
  display: flex;
  gap: 4px;
}

.md-tab {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.15s;
}

.md-tab:hover {
  color: var(--text-color);
  background: rgba(255, 255, 255, 0.1);
}

.md-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
}

.md-stats {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-dim);
}

.md-actions {
  display: flex;
  gap: 4px;
}

.md-toc {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 6px;
}

.toc-title {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 4px;
  font-weight: 500;
}

.toc-item {
  font-size: 12px;
  color: var(--text-color);
  padding: 2px 0;
  cursor: pointer;
}

.toc-item:hover {
  color: #409eff;
}

.md-content {
  display: flex;
  gap: 10px;
}

.md-content.preview {
  flex-direction: column;
}

.md-content.source {
  flex-direction: column;
}

.md-content.split {
  flex-direction: row;
}

.md-content.split .md-editor,
.md-content.split .md-preview {
  flex: 1;
  min-width: 0;
}

.md-editor {
  flex: 1;
}

.md-source :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  height: 220px;
  line-height: 1.6;
}

.md-preview {
  flex: 1;
  padding: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  color: #24292e;
  max-height: 220px;
  overflow-y: auto;
}

/* Markdown 渲染样式 */
.markdown-body {
  font-size: 13px;
  line-height: 1.5;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  line-height: 1.25;
  color: #1a1a1a;
}

.markdown-body h1 { font-size: 1.6em; border-bottom: 1px solid #eaecef; padding-bottom: 0.25em; }
.markdown-body h2 { font-size: 1.3em; border-bottom: 1px solid #eaecef; padding-bottom: 0.25em; }
.markdown-body h3 { font-size: 1.1em; }
.markdown-body h4 { font-size: 1em; }

.markdown-body p {
  margin-top: 0;
  margin-bottom: 10px;
}

.markdown-body code {
  padding: 0.15em 0.35em;
  margin: 0;
  font-size: 85%;
  background: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: #d63384;
}

.markdown-body pre {
  padding: 10px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.4;
  background: #282c34;
  border-radius: 5px;
  margin-bottom: 10px;
}

.markdown-body pre code {
  padding: 0;
  margin: 0;
  font-size: 100%;
  background: transparent;
  border: 0;
  color: #abb2bf;
}

.markdown-body blockquote {
  padding: 0 0.8em;
  color: #6a737d;
  border-left: 0.2em solid #dfe2e5;
  margin: 0 0 10px 0;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 1.8em;
  margin-top: 0;
  margin-bottom: 10px;
}

.markdown-body li {
  margin: 3px 0;
}

.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 10px;
}

.markdown-body table th,
.markdown-body table td {
  padding: 5px 10px;
  border: 1px solid #dfe2e5;
}

.markdown-body table tr:nth-child(2n) {
  background: #f6f8fa;
}

.markdown-body table th {
  font-weight: 600;
  background: #f6f8fa;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
}

.markdown-body a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body hr {
  height: 0.2em;
  padding: 0;
  margin: 16px 0;
  background: #e1e4e8;
  border: 0;
}

/* 代码高亮样式 */
.markdown-body .hljs-keyword { color: #c678dd; }
.markdown-body .hljs-string { color: #98c379; }
.markdown-body .hljs-number { color: #d19a66; }
.markdown-body .hljs-function { color: #61afef; }
.markdown-body .hljs-title { color: #61afef; }
.markdown-body .hljs-comment { color: #5c6370; font-style: italic; }
.markdown-body .hljs-params { color: #abb2bf; }
.markdown-body .hljs-attr { color: #d19a66; }
.markdown-body .hljs-built_in { color: #e6c07b; }
.markdown-body .hljs-literal { color: #56b6c2; }
.markdown-body .hljs-type { color: #e6c07b; }
.markdown-body .hljs-meta { color: #61afef; }

/* OCR 识别样式 */
.ocr-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 360px;
}

.ocr-input {
  width: 100%;
}

.ocr-dropzone {
  border: 2px dashed var(--grid-line);
  border-radius: 10px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0, 0, 0, 0.08);
}

.ocr-dropzone:hover {
  border-color: var(--accent-color);
  background: rgba(64, 158, 255, 0.05);
}

.ocr-dropzone.has-image {
  padding: 10px;
  border-style: solid;
}

.drop-icon {
  font-size: 36px;
  color: var(--text-dim);
  margin-bottom: 8px;
}

.ocr-dropzone p {
  margin: 4px 0;
  color: var(--text-color);
  font-size: 13px;
}

.drop-hint {
  color: var(--text-dim) !important;
  font-size: 11px !important;
}

.preview-image {
  max-width: 100%;
  max-height: 150px;
  border-radius: 8px;
  object-fit: contain;
}

.ocr-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.ocr-actions .el-button {
  font-size: 13px;
  padding: 8px 16px;
  height: 32px;
}

.ocr-progress {
  margin: 6px 0;
}

.ocr-result {
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--text-dim);
}

.result-actions {
  display: flex;
  gap: 4px;
}

.result-text :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.12);
  border: none;
  border-radius: 0;
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.6;
  height: 120px;
}

.ocr-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #f56c6c;
  font-size: 13px;
}

.ocr-error .el-icon {
  font-size: 18px;
}

/* AI 助手样式 */
.ai-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 380px;
}

.ai-not-configured {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.ai-not-configured .warn-icon {
  font-size: 48px;
  color: #e6a23c;
  margin-bottom: 12px;
}

.ai-not-configured p {
  color: var(--text-dim);
  margin-bottom: 16px;
  font-size: 14px;
}

.ai-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ai-action-btn {
  padding: 6px 14px;
  font-size: 12px;
  color: var(--text-color);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
  height: 28px;
  display: inline-flex;
  align-items: center;
}

.ai-action-btn:hover {
  background: rgba(64, 158, 255, 0.2);
}

.ai-action-btn.active {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  color: #fff;
}

.ai-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.6;
  height: 100px;
}

.ai-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ai-actions .el-button {
  font-size: 13px;
  padding: 8px 18px;
  height: 32px;
}

.ai-response {
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  overflow: hidden;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--text-dim);
}

.response-actions {
  display: flex;
  gap: 4px;
}

.response-content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-color);
}

.response-content pre {
  background: rgba(0, 0, 0, 0.25);
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.response-content code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.response-content :not(pre) > code {
  background: rgba(64, 158, 255, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  color: #409eff;
}

.ai-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #f56c6c;
  font-size: 13px;
}

.ai-config-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
}

.ai-config-dialog :deep(.el-form-item__label) {
  color: var(--text-color);
}
</style>
