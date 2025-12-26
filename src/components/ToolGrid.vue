<template>
  <div class="tool-grid-container">
    <!-- 标题栏 -->
    <div class="section-header">
      <span class="section-title">{{ title }}</span>
      <el-icon v-if="showAddButton" class="add-icon" @click="$emit('add-click')">
        <Plus />
      </el-icon>
    </div>

    <!-- 网格区域 -->
    <div
      ref="gridBoxRef"
      class="grid-box"
      :class="{ 'edge-left': edgeHover === 'left', 'edge-right': edgeHover === 'right' }"
      :style="{ 'grid-template-rows': `repeat(${rows}, 1fr)` }"
      @dragover.prevent="handleGridDragOver"
      @dragleave="handleGridDragLeave"
      @drop.prevent="handleGridDrop"
    >
      <div
        v-for="(item, index) in displayItems"
        :key="index"
        class="grid-item"
        :class="{
          'empty': item.type === 'empty',
          'add-item': item.type === 'add',
          'dragging': dragIndex === index,
          'drag-over': dragOverIndex === index && dragIndex !== index
        }"
        :draggable="item.type === 'action' && allowDrag"
        @click="handleClick(item)"
        @contextmenu.prevent="handleRightClick(item)"
        @dragstart="handleDragStart($event, index, item)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleItemDragOver($event, index, item)"
        @drop.prevent="handleDrop($event, index, item)"
        :title="getTooltip(item)"
      >
        <!-- 正常项目 -->
        <template v-if="item.type === 'action'">
          <div class="item-icon">
            <img v-if="item.data.icon && item.data.icon.startsWith('data:')" :src="item.data.icon" class="custom-icon">
            <component v-else-if="getIconComponent(item.data)" :is="getIconComponent(item.data)" />
            <span v-else class="emoji-icon">{{ item.data.icon || '📦' }}</span>
          </div>
          <span class="item-label">{{ item.data.label }}</span>
        </template>

        <!-- 添加按钮 -->
        <template v-else-if="item.type === 'add'">
          <el-icon class="add-plus-icon"><Plus /></el-icon>
        </template>
      </div>
    </div>

    <!-- 分页点 -->
    <div v-if="totalPages > 1" class="pagination">
      <span
        v-for="p in totalPages"
        :key="p"
        class="page-dot"
        :class="{ active: currentPage === p - 1 }"
        @click="$emit('page-change', p - 1)"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import * as ElementPlusIcons from '@element-plus/icons-vue';
import { FEATURE_ICONS } from '@/utils/constants';

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  rows: { type: Number, default: 2 },
  columns: { type: Number, default: 4 },
  currentPage: { type: Number, default: 0 },
  showAddButton: { type: Boolean, default: false },
  showAddItem: { type: Boolean, default: true },
  allowDrag: { type: Boolean, default: false }
});

const emit = defineEmits(['item-click', 'item-right-click', 'add-click', 'page-change', 'reorder']);

// 网格容器引用
const gridBoxRef = ref(null);

// 拖拽状态
const dragIndex = ref(-1);
const dragOverIndex = ref(-1);
const dragOriginalIndex = ref(-1); // 存储拖拽项的原始索引
const edgeHover = ref(''); // 'left' | 'right' | ''

// 自动换页相关
let pageChangeTimer = null;
let lastEdgeTime = 0;
const EDGE_ZONE = 60; // 边缘检测区域宽度(px)
const PAGE_CHANGE_DELAY = 300; // 换页延迟(ms) - 减少延迟更流畅

// 计算分页数据
const pageSize = computed(() => props.rows * props.columns);

const pagedData = computed(() => {
  const rawList = props.items.map((item, idx) => ({
    type: 'action',
    data: { ...item, originalIndex: idx }
  }));

  // 添加"添加"按钮
  if (props.showAddItem) {
    rawList.push({ type: 'add' });
  }

  const total = Math.ceil(rawList.length / pageSize.value) || 1;
  const start = props.currentPage * pageSize.value;
  let pageItems = rawList.slice(start, start + pageSize.value);

  // 填充空白
  while (pageItems.length < pageSize.value) {
    pageItems.push({ type: 'empty' });
  }

  return { pageItems, totalPages: total };
});

const displayItems = computed(() => pagedData.value.pageItems);
const totalPages = computed(() => pagedData.value.totalPages);

// 获取图标组件
const getIconComponent = (itemData) => {
  // 优先使用自定义icon属性
  let iconName = itemData.icon;

  // 如果是内置功能，使用映射
  if (!iconName || iconName.length <= 2) {
    iconName = FEATURE_ICONS[itemData.action];
  }

  if (iconName && ElementPlusIcons[iconName]) {
    return ElementPlusIcons[iconName];
  }
  return null;
};

const getTooltip = (item) => {
  if (item.type === 'action') {
    return item.data.description || item.data.label;
  }
  if (item.type === 'add') return '添加工具';
  return '';
};

const handleClick = (item) => {
  if (item.type === 'action') {
    emit('item-click', item.data);
  } else if (item.type === 'add') {
    emit('add-click');
  }
};

const handleRightClick = (item) => {
  if (item.type === 'action') {
    emit('item-right-click', item.data);
  }
};

// 拖拽事件处理
const handleDragStart = (e, index, item) => {
  if (item.type !== 'action' || !props.allowDrag) return;
  dragIndex.value = index;
  dragOriginalIndex.value = item.data.originalIndex;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(dragOriginalIndex.value));
};

const clearDragState = () => {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
  dragOriginalIndex.value = -1;
  edgeHover.value = '';
  if (pageChangeTimer) {
    clearTimeout(pageChangeTimer);
    pageChangeTimer = null;
  }
};

const handleDragEnd = () => {
  clearDragState();
};

// 容器级别的拖拽事件 - 用于边缘检测
const handleGridDragOver = (e) => {
  if (!props.allowDrag) return;

  // 尝试从 dataTransfer 恢复拖拽状态（跨页后）
  if (dragOriginalIndex.value === -1) {
    const data = e.dataTransfer.getData('text/plain');
    if (data) {
      dragOriginalIndex.value = parseInt(data, 10);
    }
  }

  if (dragOriginalIndex.value === -1) return;

  const rect = gridBoxRef.value?.getBoundingClientRect();
  if (!rect) return;

  const x = e.clientX;
  const now = Date.now();

  // 检测左边缘
  if (x < rect.left + EDGE_ZONE && props.currentPage > 0) {
    if (edgeHover.value !== 'left') {
      edgeHover.value = 'left';
      lastEdgeTime = now;

      if (pageChangeTimer) clearTimeout(pageChangeTimer);
      pageChangeTimer = setTimeout(() => {
        if (edgeHover.value === 'left') {
          emit('page-change', props.currentPage - 1);
        }
      }, PAGE_CHANGE_DELAY);
    }
  }
  // 检测右边缘
  else if (x > rect.right - EDGE_ZONE && props.currentPage < totalPages.value - 1) {
    if (edgeHover.value !== 'right') {
      edgeHover.value = 'right';
      lastEdgeTime = now;

      if (pageChangeTimer) clearTimeout(pageChangeTimer);
      pageChangeTimer = setTimeout(() => {
        if (edgeHover.value === 'right') {
          emit('page-change', props.currentPage + 1);
        }
      }, PAGE_CHANGE_DELAY);
    }
  }
  // 离开边缘区域
  else if (edgeHover.value) {
    edgeHover.value = '';
    if (pageChangeTimer) {
      clearTimeout(pageChangeTimer);
      pageChangeTimer = null;
    }
  }

  e.dataTransfer.dropEffect = 'move';
};

const handleGridDragLeave = (e) => {
  // 检查是否真的离开了网格（而不是进入子元素）
  if (gridBoxRef.value && !gridBoxRef.value.contains(e.relatedTarget)) {
    edgeHover.value = '';
    if (pageChangeTimer) {
      clearTimeout(pageChangeTimer);
      pageChangeTimer = null;
    }
  }
};

const handleGridDrop = (e) => {
  // 如果没有放在具体item上，放到当前页最后
  if (dragOriginalIndex.value === -1) return;

  const fromOriginal = dragOriginalIndex.value;
  const pageStart = props.currentPage * pageSize.value;
  const pageEnd = Math.min(pageStart + pageSize.value, props.items.length);
  const toOriginal = Math.max(0, pageEnd - 1);

  if (fromOriginal !== toOriginal && fromOriginal >= 0) {
    emit('reorder', { from: fromOriginal, to: toOriginal });
  }

  clearDragState();
};

// 单个item的拖拽事件
const handleItemDragOver = (e, index, item) => {
  if (!props.allowDrag) return;

  // 尝试恢复拖拽状态
  if (dragOriginalIndex.value === -1) {
    const data = e.dataTransfer.getData('text/plain');
    if (data) {
      dragOriginalIndex.value = parseInt(data, 10);
    }
  }

  if (dragOriginalIndex.value === -1) return;

  if (item.type === 'action' || item.type === 'empty') {
    dragOverIndex.value = index;
  }

  e.dataTransfer.dropEffect = 'move';
};

const handleDrop = (e, targetIndex, targetItem) => {
  if (!props.allowDrag) return;

  // 尝试恢复拖拽状态
  if (dragOriginalIndex.value === -1) {
    const data = e.dataTransfer.getData('text/plain');
    if (data) {
      dragOriginalIndex.value = parseInt(data, 10);
    }
  }

  if (dragOriginalIndex.value === -1) return;

  const fromOriginal = dragOriginalIndex.value;
  let toOriginal;

  if (targetItem.type === 'action') {
    toOriginal = targetItem.data.originalIndex;
  } else if (targetItem.type === 'empty') {
    // 拖到空白位置，计算当前页的有效位置
    const pageStart = props.currentPage * pageSize.value;
    const pageEnd = Math.min(pageStart + pageSize.value, props.items.length);
    toOriginal = Math.max(0, pageEnd - 1);
  } else {
    clearDragState();
    return;
  }

  if (fromOriginal !== toOriginal && fromOriginal >= 0) {
    emit('reorder', { from: fromOriginal, to: toOriginal });
  }

  clearDragState();
  e.stopPropagation(); // 阻止冒泡到grid
};
</script>

<style scoped>
.tool-grid-container {
  flex-shrink: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(128, 128, 128, 0.08);
  border-bottom: 1px solid var(--grid-line);
}

.section-title {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.add-icon {
  font-size: 25px;
  font-weight: bold;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.add-icon:hover {
  color: var(--accent-color);
  background: rgba(255, 255, 255, 0.1);
}

.grid-box {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--grid-line);
  border-bottom: 1px solid var(--grid-line);
  position: relative;
}

/* 边缘换页指示器 */
.grid-box::before,
.grid-box::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 60px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.grid-box::before {
  left: 0;
  background: linear-gradient(to right, rgba(64, 158, 255, 0.6), transparent);
}

.grid-box::after {
  right: 0;
  background: linear-gradient(to left, rgba(64, 158, 255, 0.6), transparent);
}

.grid-box.edge-left::before,
.grid-box.edge-right::after {
  opacity: 1;
  animation: edge-pulse 0.3s ease-in-out infinite alternate;
}

@keyframes edge-pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.grid-item {
  aspect-ratio: 1;
  background: var(--bg-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 8px 4px;
  overflow: hidden;
  min-width: 0;
}

.grid-item:hover:not(.empty) {
  background: var(--bg-item-hover);
  transform: scale(1.02);
}

.grid-item:active:not(.empty) {
  transform: scale(0.98);
}

.grid-item.dragging {
  opacity: 0.5;
  background: var(--accent-color);
}

.grid-item.drag-over {
  background: rgba(64, 158, 255, 0.3);
  border: 2px dashed var(--accent-color);
}

.grid-item[draggable="true"] {
  cursor: grab;
}

.grid-item[draggable="true"]:active {
  cursor: grabbing;
}

.grid-item.empty {
  cursor: default;
  pointer-events: none;
}

.grid-item.add-item {
  color: var(--text-dim);
}

.grid-item.add-item:hover {
  color: var(--accent-color);
}

.item-icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--accent-color);
}

.item-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.custom-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.emoji-icon {
  font-size: 24px;
}

.item-label {
  font-size: 10px;
  color: var(--text-dim);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
}

.add-plus-icon {
  font-size: 32px;
  opacity: 0.4;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--grid-line);
  min-height: 20px;
}

.page-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dot-color);
  cursor: pointer;
  transition: all 0.2s;
}

.page-dot.active {
  background: var(--dot-active);
  transform: scale(1.3);
}

.page-dot:hover:not(.active) {
  background: var(--text-dim);
}
</style>
