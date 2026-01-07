<template>
  <div class="ai-chat-panel">
    <!-- 头部 -->
    <div class="chat-header">
      <span class="chat-title">AI 助手</span>
      <div class="chat-actions">
        <el-tooltip content="清空对话" placement="bottom">
          <el-icon class="action-icon" @click="clearChat"><Delete /></el-icon>
        </el-tooltip>
        <el-tooltip content="设置" placement="bottom">
          <el-icon class="action-icon" @click="showConfig = true"><Setting /></el-icon>
        </el-tooltip>
        <el-tooltip content="关闭" placement="bottom">
          <el-icon class="action-icon" @click="$emit('close')"><Close /></el-icon>
        </el-tooltip>
      </div>
    </div>

    <!-- 未配置提示 -->
    <div v-if="!isConfigured" class="not-configured">
      <el-icon class="warn-icon"><Warning /></el-icon>
      <p>请先配置 API Key</p>
      <el-button type="primary" size="small" @click="showConfig = true">配置</el-button>
    </div>

    <!-- 聊天区域 -->
    <template v-else>
      <div class="chat-messages" ref="messagesRef">
        <div v-if="messages.length === 0" class="empty-hint">
          <p>输入问题开始对话</p>
          <div class="quick-prompts">
            <span @click="setInput('翻译这段文字')">翻译</span>
            <span @click="setInput('总结要点')">摘要</span>
            <span @click="setInput('解释这段代码')">解释代码</span>
            <span @click="setInput('润色优化')">润色</span>
          </div>
        </div>
        <div v-for="(msg, idx) in messages" :key="idx" class="message" :class="msg.role">
          <div class="msg-content">
            <div v-if="msg.role === 'user'" class="msg-text">{{ msg.content }}</div>
            <div v-else class="msg-text" v-html="formatMarkdown(msg.content)"></div>
          </div>
          <div class="msg-actions" v-if="msg.role === 'assistant'">
            <span @click="copyText(msg.content)">复制</span>
          </div>
        </div>
        <div v-if="loading" class="message assistant loading">
          <div class="msg-content">
            <div class="msg-text typing">{{ streamContent || '思考中...' }}</div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input-area">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          :autosize="{ minRows: 1, maxRows: 4 }"
          placeholder="输入消息，Enter发送，Shift+Enter换行"
          @keydown.enter.exact.prevent="sendMessage"
          :disabled="loading"
        />
        <el-button
          type="primary"
          :icon="Promotion"
          circle
          @click="sendMessage"
          :loading="loading"
          :disabled="!inputText.trim() || loading"
          class="send-btn"
        />
      </div>
    </template>

    <!-- 配置弹窗 -->
    <el-dialog v-model="showConfig" title="AI 配置" width="300px" append-to-body>
      <el-form label-width="70px" size="small">
        <el-form-item label="服务商">
          <el-select v-model="config.provider" style="width: 100%;" @change="onProviderChange">
            <el-option label="OpenAI" value="openai" />
            <el-option label="Claude" value="claude" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="config.apiKey" type="password" show-password placeholder="API Key" />
        </el-form-item>
        <el-form-item label="模型">
          <el-select v-model="config.model" style="width: 100%;" v-if="config.provider !== 'custom'">
            <el-option v-for="m in models" :key="m" :label="m" :value="m" />
          </el-select>
          <el-input v-else v-model="config.model" placeholder="模型名称" />
        </el-form-item>
        <el-form-item label="Endpoint" v-if="config.provider === 'custom'">
          <el-input v-model="config.endpoint" placeholder="API地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showConfig = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveConfiguration">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Setting, Delete, Close, Warning, Promotion } from '@element-plus/icons-vue';
import * as aiUtil from '../utils/ai';

const emit = defineEmits(['close']);
const props = defineProps({
  initialText: { type: String, default: '' }
});

// 状态
const messagesRef = ref(null);
const messages = ref([]);
const inputText = ref('');
const loading = ref(false);
const streamContent = ref('');
const showConfig = ref(false);

// 配置
const config = ref(aiUtil.getConfig());
const isConfigured = computed(() => !!(config.value.apiKey));
const models = computed(() => {
  const p = aiUtil.AI_PROVIDERS[config.value.provider];
  return p ? p.models : [];
});

// 初始化
onMounted(() => {
  if (props.initialText) {
    inputText.value = props.initialText;
  }
});

// 监听初始文本变化
watch(() => props.initialText, (val) => {
  if (val) inputText.value = val;
});

// 服务商切换
function onProviderChange() {
  const p = aiUtil.AI_PROVIDERS[config.value.provider];
  if (p && p.models.length > 0) {
    config.value.model = p.models[0];
  }
}

// 保存配置
function saveConfiguration() {
  aiUtil.saveConfig(config.value);
  showConfig.value = false;
  ElMessage.success('配置已保存');
}

// 设置输入
function setInput(text) {
  inputText.value = text;
}

// 发送消息
async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  console.log('[AIChatPanel] Sending message:', text.substring(0, 50));

  // 添加用户消息
  messages.value.push({ role: 'user', content: text });
  inputText.value = '';
  loading.value = true;
  streamContent.value = '';
  scrollToBottom();

  try {
    const response = await aiUtil.chat(text, {}, (chunk, full) => {
      streamContent.value = full;
      scrollToBottom();
    });
    console.log('[AIChatPanel] Response received, length:', response?.length || 0);
    messages.value.push({ role: 'assistant', content: response || '(空响应)' });
  } catch (err) {
    console.error('[AIChatPanel] Error:', err);
    messages.value.push({ role: 'assistant', content: `错误: ${err.message || '未知错误'}` });
  } finally {
    loading.value = false;
    streamContent.value = '';
    scrollToBottom();
  }
}

// 清空对话
function clearChat() {
  messages.value = [];
}

// 复制文本
function copyText(text) {
  navigator.clipboard.writeText(text);
  ElMessage.success('已复制');
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  });
}

// 简单的Markdown格式化
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
</script>

<style scoped>
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--grid-line);
  flex-shrink: 0;
}

.chat-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.action-icon {
  font-size: 16px;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-icon:hover {
  color: var(--text-color);
  background: rgba(255,255,255,0.08);
}

.not-configured {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-dim);
}

.warn-icon {
  font-size: 36px;
  color: #e6a23c;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-hint {
  text-align: center;
  color: var(--text-dim);
  padding: 20px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.quick-prompts span {
  padding: 4px 12px;
  background: rgba(64,158,255,0.1);
  color: var(--accent-color);
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-prompts span:hover {
  background: rgba(64,158,255,0.2);
}

.message {
  max-width: 90%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.msg-content {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.message.user .msg-content {
  background: var(--accent-color);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .msg-content {
  background: var(--card-bg);
  color: var(--text-color);
  border-bottom-left-radius: 4px;
}

.msg-text :deep(pre) {
  background: rgba(0,0,0,0.3);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 8px 0;
}

.msg-text :deep(code) {
  background: rgba(0,0,0,0.2);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

.msg-actions {
  margin-top: 4px;
  text-align: right;
}

.msg-actions span {
  font-size: 11px;
  color: var(--text-dim);
  cursor: pointer;
}

.msg-actions span:hover {
  color: var(--accent-color);
}

.typing {
  color: var(--text-dim);
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--grid-line);
  flex-shrink: 0;
}

.chat-input-area :deep(.el-textarea__inner) {
  background: var(--card-bg);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  resize: none;
}

.send-btn {
  align-self: flex-end;
  flex-shrink: 0;
}
</style>
