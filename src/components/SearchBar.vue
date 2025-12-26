<template>
  <div class="search-bar" style="-webkit-app-region: drag;">
    <el-icon class="search-icon"><Search /></el-icon>
    <input
      ref="searchInput"
      type="text"
      v-model="localSearchText"
      @input="handleInput"
      @keyup.enter="handleSearch"
      @keyup.escape="handleEscape"
      placeholder="输入命令 / 搜索..."
      style="-webkit-app-region: no-drag;"
    />
    <div class="bar-actions" style="-webkit-app-region: no-drag;">
      <el-tooltip content="设置" placement="bottom">
        <el-icon class="action-icon" @click="$emit('open-settings')"><Setting /></el-icon>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { Search, Setting } from '@element-plus/icons-vue';

const props = defineProps({
  searchText: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:searchText', 'search', 'open-settings']);

const searchInput = ref(null);
const localSearchText = ref(props.searchText);

// 双向绑定搜索文本
watch(() => props.searchText, (newVal) => {
  localSearchText.value = newVal;
});

const handleInput = () => {
  emit('update:searchText', localSearchText.value);
};

const handleSearch = () => {
  emit('search', localSearchText.value);
};

const handleEscape = () => {
  if (window.api) {
    window.api.send('hide-window');
  }
};

// 自动聚焦
onMounted(() => {
  setTimeout(() => {
    searchInput.value?.focus();
  }, 100);
});

// 暴露聚焦方法
defineExpose({
  focus: () => searchInput.value?.focus()
});
</script>

<style scoped>
.search-bar {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--grid-line);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 20;
}

.search-icon {
  font-size: 18px;
  color: var(--text-dim);
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-color);
  font-size: 14px;
  outline: none;
  padding: 4px 0;
}

.search-bar input::placeholder {
  color: var(--text-dim);
}

.bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon {
  font-size: 18px;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-icon:hover {
  color: var(--text-color);
  background: rgba(255, 255, 255, 0.1);
}
</style>
