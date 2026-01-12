<template>
  <div
    class="radial-menu-overlay"
    v-if="visible"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @contextmenu.prevent
  >
    <!-- 中心点指示 -->
    <div class="radial-center" :style="centerStyle">
      <div class="center-circle">
        <span class="center-icon">{{ activeItem ? getIconSymbol(activeItem.action) : '⚡' }}</span>
      </div>
      <div class="center-label" v-if="activeItem">{{ activeItem.label }}</div>
    </div>

    <!-- 轮盘扇区 -->
    <svg
      class="radial-svg"
      :style="svgStyle"
      :viewBox="`0 0 ${size} ${size}`"
    >
      <g :transform="`translate(${size/2}, ${size/2})`">
        <!-- 背景圆 -->
        <circle r="120" fill="rgba(30, 30, 30, 0.95)" />

        <!-- 扇区 -->
        <g v-for="(item, index) in items" :key="index">
          <path
            :d="getSectorPath(index)"
            :fill="activeIndex === index ? 'rgba(64, 158, 255, 0.6)' : 'rgba(60, 60, 60, 0.8)'"
            :stroke="activeIndex === index ? '#409eff' : 'rgba(255,255,255,0.1)'"
            stroke-width="2"
            class="sector-path"
          />
          <!-- 图标 -->
          <text
            :x="getIconPosition(index).x"
            :y="getIconPosition(index).y"
            text-anchor="middle"
            dominant-baseline="central"
            :fill="activeIndex === index ? '#fff' : 'rgba(255,255,255,0.7)'"
            font-size="20"
            class="sector-icon"
          >{{ getIconSymbol(item.action) }}</text>
          <!-- 标签 -->
          <text
            :x="getLabelPosition(index).x"
            :y="getLabelPosition(index).y"
            text-anchor="middle"
            dominant-baseline="central"
            :fill="activeIndex === index ? '#fff' : 'rgba(255,255,255,0.5)'"
            font-size="11"
            class="sector-label"
          >{{ item.label }}</text>
        </g>

        <!-- 中心圆 -->
        <circle r="35" fill="rgba(40, 40, 40, 0.95)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
        <text
          x="0"
          y="0"
          text-anchor="middle"
          dominant-baseline="central"
          fill="#fff"
          font-size="12"
        >取消</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { FEATURE_ICONS } from '../utils/constants'

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: {
    type: Array,
    default: () => [
      { label: 'JSON格式化', action: 'json-format' },
      { label: '时间转换', action: 'timestamp-convert' },
      { label: '计算器', action: 'calculator' },
      { label: '编码转换', action: 'encoder' },
      { label: '颜色转换', action: 'color-convert' },
      { label: '正则助手', action: 'regex-helper' },
      { label: 'AI助手', action: 'ai-assistant' },
      { label: '剪贴板', action: 'clipboard-history' }
    ]
  },
  centerX: { type: Number, default: 0 },
  centerY: { type: Number, default: 0 }
})

const emit = defineEmits(['select', 'cancel', 'close'])

// 简化图标符号映射 (SVG text 无法使用 Element Plus 图标，使用文字符号)
const ICON_SYMBOLS = {
  'json-format': '{}',
  'timestamp-convert': '⏰',
  'calculator': '🔢',
  'encoder': '🔤',
  'color-convert': '🎨',
  'regex-helper': '.*',
  'ai-assistant': 'AI',
  'clipboard-history': '📋',
  'search-google': '🔍',
  'translate': '🌐',
  'generate-qr': '▣',
  'generate-uuid': '#',
  'generate-password': '🔑',
  'timer': '⏱',
  'memo': '📝',
  'ocr': '👁',
  'lock-screen': '🔒',
  'open-explorer': '💻',
  'minimize-all': '⬇',
  'switch-hosts': '📁',
  'open-regedit': '⚙',
  'open-env-vars': '⚙',
  'open-uninstall': '🗑',
  'open-network-settings': '🌐'
}

const getIconSymbol = (action) => {
  return ICON_SYMBOLS[action] || '•'
}

const size = 280
const innerRadius = 45
const outerRadius = 115

const activeIndex = ref(-1)
const activeItem = computed(() => activeIndex.value >= 0 ? props.items[activeIndex.value] : null)

// 中心点样式
const centerStyle = computed(() => ({
  left: `${props.centerX}px`,
  top: `${props.centerY}px`
}))

// SVG 位置样式
const svgStyle = computed(() => ({
  left: `${props.centerX - size / 2}px`,
  top: `${props.centerY - size / 2}px`,
  width: `${size}px`,
  height: `${size}px`
}))

// 计算扇区路径
const getSectorPath = (index) => {
  const count = props.items.length
  const anglePerSector = (Math.PI * 2) / count
  const startAngle = index * anglePerSector - Math.PI / 2 - anglePerSector / 2
  const endAngle = startAngle + anglePerSector
  const gap = 0.02 // 扇区间隙

  const x1 = innerRadius * Math.cos(startAngle + gap)
  const y1 = innerRadius * Math.sin(startAngle + gap)
  const x2 = outerRadius * Math.cos(startAngle + gap)
  const y2 = outerRadius * Math.sin(startAngle + gap)
  const x3 = outerRadius * Math.cos(endAngle - gap)
  const y3 = outerRadius * Math.sin(endAngle - gap)
  const x4 = innerRadius * Math.cos(endAngle - gap)
  const y4 = innerRadius * Math.sin(endAngle - gap)

  const largeArc = anglePerSector > Math.PI ? 1 : 0

  return `M ${x1} ${y1}
          L ${x2} ${y2}
          A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}
          L ${x4} ${y4}
          A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1} Z`
}

// 计算图标位置
const getIconPosition = (index) => {
  const count = props.items.length
  const anglePerSector = (Math.PI * 2) / count
  const angle = index * anglePerSector - Math.PI / 2
  const radius = (innerRadius + outerRadius) / 2 - 5
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle) - 8
  }
}

// 计算标签位置
const getLabelPosition = (index) => {
  const count = props.items.length
  const anglePerSector = (Math.PI * 2) / count
  const angle = index * anglePerSector - Math.PI / 2
  const radius = (innerRadius + outerRadius) / 2 + 5
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle) + 10
  }
}

// 处理鼠标移动
const handleMouseMove = (e) => {
  const dx = e.clientX - props.centerX
  const dy = e.clientY - props.centerY
  const distance = Math.sqrt(dx * dx + dy * dy)

  // 在中心区域或太远则不选中
  if (distance < innerRadius || distance > outerRadius + 30) {
    activeIndex.value = -1
    return
  }

  // 计算角度并确定扇区
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += Math.PI * 2

  const count = props.items.length
  const anglePerSector = (Math.PI * 2) / count
  const index = Math.floor((angle + anglePerSector / 2) / anglePerSector) % count

  activeIndex.value = index
}

// 处理鼠标释放
const handleMouseUp = (e) => {
  if (activeIndex.value >= 0) {
    emit('select', props.items[activeIndex.value])
  } else {
    emit('cancel')
  }
  emit('close')
}

// 键盘事件
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    emit('cancel')
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.radial-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99999;
  cursor: default;
}

.radial-center {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 100001;
}

.center-circle {
  width: 12px;
  height: 12px;
  background: #409eff;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.center-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(64, 158, 255, 0.95);
  color: #fff;
  font-size: 12px;
  border-radius: 12px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.radial-svg {
  position: absolute;
  pointer-events: none;
  z-index: 100000;
}

.sector-path {
  cursor: pointer;
  pointer-events: all;
  transition: fill 0.15s, stroke 0.15s;
}

.sector-icon {
  pointer-events: none;
  transition: fill 0.15s;
}

.sector-label {
  pointer-events: none;
  transition: fill 0.15s;
  font-family: 'Microsoft YaHei', sans-serif;
}
</style>
