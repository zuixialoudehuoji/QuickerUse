<template>
  <el-dialog
    v-model="visible"
    :title="'文件工具: ' + fileInfo.name"
    width="90%"
    :close-on-click-modal="true"
    class="file-info-dialog"
  >
    <!-- 图片预览 -->
    <div v-if="fileInfo.isImage" class="image-preview">
      <img :src="fileInfo.base64" class="preview-img" />
      <el-button type="primary" size="small" @click="copyBase64">
        <el-icon><DocumentCopy /></el-icon>
        复制 Base64
      </el-button>
    </div>

    <!-- 哈希值 -->
    <div class="hash-section">
      <div class="hash-row">
        <span class="hash-label">SHA-1</span>
        <el-input :value="fileInfo.sha1" readonly size="small" class="hash-input" />
        <el-button size="small" @click="copyText(fileInfo.sha1)">复制</el-button>
      </div>
      <div class="hash-row">
        <span class="hash-label">SHA-256</span>
        <el-input :value="fileInfo.sha256" readonly size="small" class="hash-input" />
        <el-button size="small" @click="copyText(fileInfo.sha256)">复制</el-button>
      </div>
      <div class="hash-row" v-if="fileInfo.size">
        <span class="hash-label">大小</span>
        <span class="file-size">{{ formatSize(fileInfo.size) }}</span>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DocumentCopy } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  fileInfo: {
    type: Object,
    default: () => ({
      name: '',
      sha1: '',
      sha256: '',
      size: 0,
      isImage: false,
      base64: ''
    })
  }
});

const emit = defineEmits(['update:modelValue']);

const visible = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

const copyText = (text) => {
  if (!text) return;
  window.api?.send('write-clipboard', text);
  ElMessage.success('已复制');
};

const copyBase64 = () => {
  if (props.fileInfo.base64) {
    window.api?.send('write-clipboard', props.fileInfo.base64);
    ElMessage.success('Base64 已复制');
  }
};

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};
</script>

<style scoped>
.file-info-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
  border: 1px solid var(--grid-line);
  border-radius: 8px;
}

.image-preview {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.preview-img {
  max-height: 120px;
  max-width: 100%;
  border-radius: 4px;
  margin-bottom: 12px;
}

.hash-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hash-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hash-label {
  width: 60px;
  font-size: 12px;
  color: var(--text-dim);
  flex-shrink: 0;
}

.hash-input {
  flex: 1;
}

.hash-input :deep(.el-input__inner) {
  font-family: 'Consolas', monospace;
  font-size: 11px;
}

.file-size {
  font-size: 13px;
  color: var(--text-color);
}
</style>
