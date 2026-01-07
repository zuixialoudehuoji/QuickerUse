<template>
  <div class="dialog-app">
    <!-- 标题栏 (可拖动) -->
    <div class="dialog-title-bar" style="-webkit-app-region: drag;">
      <span class="dialog-title">{{ dialogTitle }}</span>
      <div class="dialog-actions" style="-webkit-app-region: no-drag;">
        <!-- 置顶按钮 -->
        <span class="dialog-action-btn" :class="{ active: isPinned }" @click="togglePin" title="置顶窗口">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <path d="M16 4.5v-.5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v.5l-2 2v3.5h4v9l2 2 2-2v-9h4V6.5l-2-2zm0 4h-8V7l1-1V4h6v2l1 1v1.5z"/>
          </svg>
        </span>
        <!-- 关闭按钮 -->
        <span class="dialog-close" @click="closeDialog">&times;</span>
      </div>
    </div>

    <!-- 弹出框内容 -->
    <div class="dialog-content">
      <FeatureModalContent
        v-if="dialogReady"
        :modal-data="modalData"
        :initial-text="initialText"
        ref="featureContentRef"
        @close="closeDialog"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import FeatureModalContent from './components/FeatureModalContent.vue';
import { DEFAULT_SETTINGS } from './utils/constants';

const dialogReady = ref(false);
const dialogType = ref('');
const modalData = reactive({ title: '', type: 'text-editor', actions: [], text: '' });
const initialText = ref('');
const featureContentRef = ref(null);
const isPinned = ref(false);

const dialogTitle = computed(() => modalData.title || '功能');

const closeDialog = () => {
  window.api?.send('close-dialog-window');
};

// 置顶切换
const togglePin = () => {
  isPinned.value = !isPinned.value;
  window.api?.send('toggle-dialog-pin', isPinned.value);
};

// 应用主题设置
const applyTheme = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('app-settings') || JSON.stringify(DEFAULT_SETTINGS));
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    // 应用透明度
    const appEl = document.querySelector('.dialog-app');
    if (appEl && settings.opacity) {
      appEl.style.opacity = settings.opacity;
    }
  } catch (e) {
    console.error('[DialogApp] Failed to apply theme:', e);
  }
};

onMounted(() => {
  // 应用主题
  applyTheme();

  // 从URL获取弹出框类型
  const params = new URLSearchParams(window.location.search);
  dialogType.value = params.get('dialogType') || 'text-editor';

  // 监听弹出框初始化数据
  if (window.api) {
    window.api.on('dialog-init', (data) => {
      console.log('[DialogApp] Received init data:', data);
      Object.assign(modalData, data);
      initialText.value = data.initialText || '';
      dialogReady.value = true;
    });

    // 主动请求初始化数据（备用机制，确保不会因时序问题丢失数据）
    setTimeout(() => {
      if (!dialogReady.value) {
        console.log('[DialogApp] Requesting init data...');
        window.api.send('dialog-request-init');
      }
    }, 100);
  }

  // ESC键关闭
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      closeDialog();
    }
  });
});
</script>

<style scoped>
.dialog-app {
  height: 100vh;
  background: var(--bg-color);
  color: var(--text-color);
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--grid-line);
}

.dialog-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--modal-bg);
  border-bottom: 1px solid var(--grid-line);
  flex-shrink: 0;
}

.dialog-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
}

.dialog-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dialog-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.dialog-action-btn:hover {
  color: var(--text-color);
  background: var(--bg-item-hover);
}

.dialog-action-btn.active {
  color: var(--accent-color);
  transform: rotate(45deg);
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 18px;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.dialog-close:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.15);
}

.dialog-content {
  flex: 1;
  padding: 12px;
  overflow: auto;
  background: var(--bg-color);
}
</style>
