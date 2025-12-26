<template>
  <el-dialog
    v-model="visible"
    title="管理智能功能"
    width="90%"
    :close-on-click-modal="true"
    class="manage-dialog"
  >
    <!-- 分类筛选 -->
    <div class="category-filter">
      <div
        v-for="cat in categories"
        :key="cat.value"
        class="category-chip"
        :class="{ active: selectedCategory === cat.value }"
        @click="selectedCategory = cat.value"
      >
        {{ cat.label }}
        <span class="chip-count" v-if="cat.value !== 'all'">{{ getCategoryCount(cat.value) }}</span>
      </div>
    </div>

    <!-- 功能网格 -->
    <div class="feature-grid">
      <el-tooltip
        v-for="feature in filteredFeatures"
        :key="feature.action"
        :content="feature.description"
        placement="top"
        :show-after="300"
      >
        <div
          class="feature-item"
          :class="{ hidden: blacklist.has(feature.action) }"
          @click="handleFeatureClick(feature)"
        >
          <div class="item-icon">
            <component :is="getIconComponent(feature.action)" />
          </div>
          <span class="item-name">{{ feature.label }}</span>
          <div class="item-actions" @click.stop>
            <el-input
              v-model="localHotkeys[feature.action]"
              size="small"
              placeholder="热键"
              readonly
              class="hotkey-input"
              @keydown="(e) => captureHotkey(e, feature.action)"
              @focus="focusedAction = feature.action"
              @blur="focusedAction = ''"
              :class="{ active: focusedAction === feature.action }"
            />
            <el-icon
              v-if="blacklist.has(feature.action)"
              class="toggle-icon show"
              @click="restoreFeature(feature.action)"
            ><View /></el-icon>
            <el-icon
              v-else
              class="toggle-icon hide"
              @click="hideFeature(feature.action)"
            ><Hide /></el-icon>
          </div>
        </div>
      </el-tooltip>
    </div>

    <!-- 底部提示 -->
    <div class="footer-hint">
      点击功能可执行 | 输入框设置全局热键 | 眼睛图标控制显示/隐藏
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { View, Hide } from '@element-plus/icons-vue';
import * as ElementPlusIcons from '@element-plus/icons-vue';
import { ALL_FEATURES, FEATURE_ICONS, CATEGORIES } from '@/utils/constants';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  blacklist: { type: Set, default: () => new Set() },
  hotkeys: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue', 'feature-click', 'hide-feature', 'restore-feature', 'hotkeys-change']);

const visible = ref(props.modelValue);
const selectedCategory = ref('all');
const localHotkeys = reactive({ ...props.hotkeys });
const focusedAction = ref('');

const categories = CATEGORIES;

const filteredFeatures = computed(() => {
  if (selectedCategory.value === 'all') {
    return ALL_FEATURES;
  }
  return ALL_FEATURES.filter(f => f.category === selectedCategory.value);
});

const getCategoryCount = (category) => {
  return ALL_FEATURES.filter(f => f.category === category).length;
};

watch(() => props.modelValue, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

watch(() => props.hotkeys, (val) => {
  Object.assign(localHotkeys, val);
}, { deep: true });

const getIconComponent = (action) => {
  const iconName = FEATURE_ICONS[action];
  return ElementPlusIcons[iconName] || ElementPlusIcons.Document;
};

const handleFeatureClick = (feature) => {
  emit('feature-click', feature);
  visible.value = false;
};

const hideFeature = (action) => {
  emit('hide-feature', action);
};

const restoreFeature = (action) => {
  emit('restore-feature', action);
};

// 捕获按键
const captureHotkey = (e, action) => {
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
    localHotkeys[action] = '';
    emit('hotkeys-change', { ...localHotkeys });
    return;
  }

  const hotkey = parts.length > 1 ? parts.join('+') : '';
  if (hotkey) {
    localHotkeys[action] = hotkey;
    emit('hotkeys-change', { ...localHotkeys });
  }
};
</script>

<style scoped>
.manage-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
}

.manage-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line);
  padding: 12px 16px;
}

.manage-dialog :deep(.el-dialog__body) {
  padding: 12px;
  max-height: 65vh;
  overflow-y: auto;
}

/* 分类筛选 */
.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.category-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-chip:hover {
  border-color: var(--accent-color);
  color: var(--text-color);
}

.category-chip.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}

.chip-count {
  font-size: 9px;
  padding: 1px 4px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.category-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.2);
}

/* 功能网格 */
.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-item);
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.feature-item:hover {
  border-color: var(--accent-color);
  background: var(--bg-item-hover);
}

.feature-item.hidden {
  opacity: 0.5;
}

.item-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 6px;
  color: var(--accent-color);
  font-size: 14px;
  flex-shrink: 0;
}

.item-name {
  font-size: 12px;
  color: var(--text-color);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.hotkey-input {
  width: 90px;
}

.hotkey-input :deep(.el-input__wrapper) {
  padding: 0 8px;
  height: 24px;
  font-size: 11px;
}

.hotkey-input.active :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--accent-color) inset !important;
  background: rgba(64, 158, 255, 0.1);
}

.toggle-icon {
  font-size: 25px;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-icon.hide {
  color: var(--text-dim);
}

.toggle-icon.hide:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.toggle-icon.show {
  color: #67c23a;
}

.toggle-icon.show:hover {
  background: rgba(103, 194, 58, 0.1);
}

/* 底部提示 */
.footer-hint {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--grid-line);
  font-size: 10px;
  color: var(--text-dim);
  text-align: center;
}
</style>
