<template>
  <div class="clipboard-history">
    <!-- 搜索栏 -->
    <div class="history-search">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索历史..."
        :prefix-icon="Search"
        clearable
        size="small"
        @input="handleSearch"
      />
      <el-button
        type="danger"
        text
        size="small"
        @click="handleClearAll"
        :disabled="historyList.length === 0"
      >
        清空
      </el-button>
    </div>

    <!-- 历史列表 -->
    <div class="history-list" v-if="filteredList.length > 0">
      <div
        v-for="item in filteredList"
        :key="item.id"
        class="history-item"
        :class="{ 'pinned': item.pinned }"
        @click="handleSelect(item)"
        @dblclick="handlePaste(item)"
      >
        <!-- 图片类型 -->
        <div v-if="item.type === 'image'" class="item-content image-content">
          <img :src="item.thumbnail" alt="图片" class="thumbnail" />
          <span class="item-preview">{{ item.preview }}</span>
        </div>

        <!-- 文本类型 -->
        <div v-else class="item-content text-content">
          <span class="item-preview">{{ item.preview }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="item-actions">
          <!-- 图片类型显示贴图置顶按钮 -->
          <el-tooltip v-if="item.type === 'image'" content="贴图置顶" placement="top">
            <el-button
              text
              size="small"
              type="primary"
              @click.stop="handleImagePin(item)"
            >
              <el-icon><PictureRounded /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="item.pinned ? '取消置顶' : '置顶'" placement="top">
            <el-button
              text
              size="small"
              @click.stop="handlePin(item)"
              :type="item.pinned ? 'warning' : 'default'"
            >
              <el-icon><Star /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button
              text
              size="small"
              type="danger"
              @click.stop="handleDelete(item)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>

        <!-- 时间戳 -->
        <span class="item-time">{{ formatTime(item.timestamp) }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon :size="40"><DocumentCopy /></el-icon>
      <p>{{ searchKeyword ? '没有找到匹配的记录' : '暂无剪贴板历史' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, Star, Delete, DocumentCopy, PictureRounded } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 响应式数据
const searchKeyword = ref('')
const historyList = ref([])

// 计算属性：过滤后的列表
const filteredList = computed(() => {
  if (!searchKeyword.value) {
    return historyList.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return historyList.value.filter(item => {
    if (item.type === 'text') {
      return item.preview.toLowerCase().includes(keyword)
    }
    return item.preview.toLowerCase().includes(keyword)
  })
})

// 格式化时间
const formatTime = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前'
  } else if (diff < 604800000) {
    return Math.floor(diff / 86400000) + '天前'
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
}

// 加载历史记录
const loadHistory = () => {
  window.api.send('clipboard-history-get')
}

// 搜索处理
const handleSearch = () => {
  if (searchKeyword.value) {
    window.api.send('clipboard-history-search', searchKeyword.value)
  } else {
    loadHistory()
  }
}

// 单击选中（不复制，仅视觉反馈）
const handleSelect = (item) => {
  // 单击不做任何操作，仅保留视觉反馈
}

// 双击粘贴到光标处
const handlePaste = (item) => {
  window.api.send('clipboard-history-paste', item.id)
}

// 图片贴图置顶
const handleImagePin = (item) => {
  if (item.type !== 'image') return
  window.api.send('clipboard-history-image-pin', item.id)
}

// 置顶/取消置顶（置顶时同时复制到剪贴板）
const handlePin = (item) => {
  // 如果是置顶操作，同时复制到剪贴板
  if (!item.pinned) {
    window.api.send('clipboard-history-use', item.id)
  }
  window.api.send('clipboard-history-pin', item.id)
}

// 删除记录
const handleDelete = (item) => {
  window.api.send('clipboard-history-delete', item.id)
}

// 清空历史
const handleClearAll = () => {
  if (historyList.value.some(item => !item.pinned)) {
    window.api.send('clipboard-history-clear')
    ElMessage.success('已清空（置顶项保留）')
  }
}

// 监听历史更新
const handleHistoryUpdate = (history) => {
  historyList.value = history
}

const handleHistoryData = (history) => {
  historyList.value = history || []
}

const handleUseResult = ({ success, id }) => {
  // 复制操作（从置顶触发时）不显示消息也不隐藏窗口
}

const handleSearchResult = (results) => {
  historyList.value = results
}

// 置顶结果处理
const handlePinResult = ({ id, pinned }) => {
  // 更新本地状态
  const item = historyList.value.find(i => i.id === id)
  if (item) {
    item.pinned = pinned
    ElMessage.success(pinned ? '已置顶' : '已取消置顶')
  }
}

// 删除结果处理
const handleDeleteResult = ({ success, id }) => {
  if (success) {
    // 从本地列表移除
    const index = historyList.value.findIndex(i => i.id === id)
    if (index !== -1) {
      historyList.value.splice(index, 1)
    }
    ElMessage.success('已删除')
  }
}

// 清空结果处理
const handleClearResult = ({ success }) => {
  if (success) {
    // 只保留置顶项
    historyList.value = historyList.value.filter(item => item.pinned)
  }
}

// 生命周期
onMounted(() => {
  console.log('[ClipboardHistory] Component mounted')

  // 检查 API 是否可用
  if (!window.api) {
    console.error('[ClipboardHistory] window.api is not available!')
    return
  }

  // 注册监听器
  window.api.on('clipboard-history-update', handleHistoryUpdate)
  window.api.on('clipboard-history-data', handleHistoryData)
  window.api.on('clipboard-history-use-result', handleUseResult)
  window.api.on('clipboard-history-search-result', handleSearchResult)
  window.api.on('clipboard-history-pin-result', handlePinResult)
  window.api.on('clipboard-history-delete-result', handleDeleteResult)
  window.api.on('clipboard-history-clear-result', handleClearResult)

  console.log('[ClipboardHistory] Listeners registered')

  // 加载初始数据
  loadHistory()

  // 备用机制：如果500ms后仍无数据，重试一次
  setTimeout(() => {
    if (historyList.value.length === 0) {
      console.log('[ClipboardHistory] Retrying to load history...')
      loadHistory()
    }
  }, 500)
})

// 暴露刷新方法
defineExpose({
  refresh: loadHistory
})
</script>

<style scoped>
.clipboard-history {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 400px;
  background: var(--modal-bg, #2b2b2b);
}

.history-search {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  background: var(--modal-bg, #2b2b2b);
}

.history-search .el-input {
  flex: 1;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  background: var(--modal-bg, #2b2b2b);
}

.history-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--item-bg, rgba(255, 255, 255, 0.03));
  position: relative;
  border-bottom: 1px solid var(--grid-line, rgba(255, 255, 255, 0.08));
}

/* 交替行颜色 */
.history-item:nth-child(odd) {
  background: var(--item-bg-alt, rgba(255, 255, 255, 0.05));
}

.history-item:nth-child(even) {
  background: var(--item-bg, rgba(255, 255, 255, 0.02));
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background: var(--item-hover-bg, rgba(64, 158, 255, 0.15));
}

.history-item.pinned {
  background: var(--pinned-bg, rgba(250, 173, 20, 0.1)) !important;
  border-left: 3px solid #faad14;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-color, #fff);
}

.thumbnail {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .item-actions {
  opacity: 1;
}

.item-time {
  font-size: 11px;
  color: var(--text-dim, rgba(180, 180, 180, 0.9));
  margin-left: 8px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  background: var(--modal-bg, #2b2b2b);
  flex: 1;
}

.empty-state p {
  margin-top: 12px;
  font-size: 13px;
}

/* 滚动条样式 */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
