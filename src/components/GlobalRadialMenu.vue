<template>
  <div
    class="global-radial-menu"
    :class="{ visible: visible }"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @contextmenu.prevent
  >
    <!-- 中心信息 -->
    <div class="radial-center" :style="centerStyle">
      <div class="center-circle">
        <span class="center-icon">{{ activeItem?.icon || '⚡' }}</span>
      </div>
      <div class="center-label" v-if="activeItem">{{ activeItem.label }}</div>
      <div class="center-hint" v-else>取消</div>
    </div>

    <!-- 轮盘 SVG - 三层同心环 -->
    <svg
      class="radial-svg"
      :style="svgStyle"
      :viewBox="`0 0 ${size} ${size}`"
    >
      <defs>
        <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="themeColors.centerLight" />
          <stop offset="100%" :stop-color="themeColors.centerDark" />
        </radialGradient>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
        </filter>
      </defs>

      <g :transform="`translate(${size/2}, ${size/2})`">
        <!-- 外圈光晕 -->
        <circle :r="outerRadius + 10" :fill="themeColors.glow" filter="url(#dropShadow)" />
        <!-- 背景圆 -->
        <circle :r="outerRadius + 5" :fill="themeColors.background" />

        <!-- 三层扇区 -->
        <g v-for="sector in sectorCount" :key="'sector-'+sector">
          <!-- 外层 (layer 0) -->
          <path
            :d="getLayerSectorPath(sector - 1, 0)"
            :fill="getSectorFill(sector - 1, 0)"
            :stroke="getSectorStroke(sector - 1, 0)"
            stroke-width="1.5"
            class="sector-path"
            @mouseenter="setActive(sector - 1, 0)"
            @mouseleave="clearActive"
          />
          <!-- 中层 (layer 1) -->
          <path
            :d="getLayerSectorPath(sector - 1, 1)"
            :fill="getSectorFill(sector - 1, 1)"
            :stroke="getSectorStroke(sector - 1, 1)"
            stroke-width="1.5"
            class="sector-path"
            @mouseenter="setActive(sector - 1, 1)"
            @mouseleave="clearActive"
          />
          <!-- 内层 (layer 2) -->
          <path
            :d="getLayerSectorPath(sector - 1, 2)"
            :fill="getSectorFill(sector - 1, 2)"
            :stroke="getSectorStroke(sector - 1, 2)"
            stroke-width="1.5"
            class="sector-path"
            @mouseenter="setActive(sector - 1, 2)"
            @mouseleave="clearActive"
          />

          <!-- 各层图标 -->
          <text
            v-if="getSlotData(sector - 1, 0)"
            :x="getSlotCenter(sector - 1, 0).x"
            :y="getSlotCenter(sector - 1, 0).y"
            text-anchor="middle"
            dominant-baseline="central"
            :fill="isActive(sector - 1, 0) ? '#fff' : themeColors.iconNormal"
            font-size="20"
            class="sector-icon"
          >{{ getSlotData(sector - 1, 0)?.icon }}</text>

          <text
            v-if="getSlotData(sector - 1, 1)"
            :x="getSlotCenter(sector - 1, 1).x"
            :y="getSlotCenter(sector - 1, 1).y"
            text-anchor="middle"
            dominant-baseline="central"
            :fill="isActive(sector - 1, 1) ? '#fff' : themeColors.iconNormal"
            font-size="16"
            class="sector-icon"
          >{{ getSlotData(sector - 1, 1)?.icon }}</text>

          <text
            v-if="getSlotData(sector - 1, 2)"
            :x="getSlotCenter(sector - 1, 2).x"
            :y="getSlotCenter(sector - 1, 2).y"
            text-anchor="middle"
            dominant-baseline="central"
            :fill="isActive(sector - 1, 2) ? '#fff' : themeColors.iconNormal"
            font-size="12"
            class="sector-icon"
          >{{ getSlotData(sector - 1, 2)?.icon }}</text>
        </g>

        <!-- 中心圆 -->
        <circle
          :r="centerRadius"
          fill="url(#centerGradient)"
          :stroke="themeColors.centerStroke"
          stroke-width="2"
          class="center-area"
          @mouseenter="clearActive"
        />

        <!-- 中心关闭图标 -->
        <text
          x="0"
          y="0"
          text-anchor="middle"
          dominant-baseline="central"
          :fill="themeColors.centerText"
          font-size="14"
          font-weight="500"
        >✕</text>
      </g>
    </svg>

    <!-- 快捷键提示 -->
    <div class="shortcut-hints" v-if="showHints">
      <span v-for="n in sectorCount" :key="n">
        <kbd>{{ n }}</kbd> {{ getSlotData(n - 1, 0)?.label || '-' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  slots: { type: Array, default: () => [] },       // slots[sector][layer] 结构
  menuItems: { type: Array, default: () => [] },   // 兼容旧格式
  centerX: { type: Number, default: 0 },
  centerY: { type: Number, default: 0 },
  theme: { type: String, default: 'dark' },
  showHints: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'cancel', 'close'])

// 尺寸配置
const size = 340
const sectorCount = 8
const sectorAngle = (Math.PI * 2) / sectorCount

// 三层半径配置
const outerRadius = 150
const middleRadius = 110
const innerRadius = 70
const centerRadius = 35

// 状态
const activeSector = ref(-1)
const activeLayer = ref(-1)

// 主题颜色配置
const themes = {
  dark: {
    background: 'rgba(30, 30, 30, 0.95)',
    glow: 'rgba(64, 158, 255, 0.1)',
    sectorNormal: 'rgba(60, 60, 60, 0.85)',
    sectorActive: 'rgba(64, 158, 255, 0.7)',
    sectorEmpty: 'rgba(50, 50, 50, 0.5)',
    sectorStroke: 'rgba(255, 255, 255, 0.1)',
    sectorActiveStroke: '#409eff',
    iconNormal: 'rgba(255, 255, 255, 0.8)',
    labelNormal: 'rgba(255, 255, 255, 0.6)',
    centerLight: 'rgba(60, 60, 60, 0.95)',
    centerDark: 'rgba(40, 40, 40, 0.95)',
    centerStroke: 'rgba(255, 255, 255, 0.15)',
    centerText: '#fff'
  },
  light: {
    background: 'rgba(255, 255, 255, 0.95)',
    glow: 'rgba(64, 158, 255, 0.15)',
    sectorNormal: 'rgba(240, 240, 240, 0.9)',
    sectorActive: 'rgba(64, 158, 255, 0.8)',
    sectorEmpty: 'rgba(230, 230, 230, 0.5)',
    sectorStroke: 'rgba(0, 0, 0, 0.1)',
    sectorActiveStroke: '#409eff',
    iconNormal: 'rgba(0, 0, 0, 0.7)',
    labelNormal: 'rgba(0, 0, 0, 0.5)',
    centerLight: 'rgba(250, 250, 250, 0.95)',
    centerDark: 'rgba(230, 230, 230, 0.95)',
    centerStroke: 'rgba(0, 0, 0, 0.1)',
    centerText: '#333'
  },
  blue: {
    background: 'rgba(20, 40, 80, 0.95)',
    glow: 'rgba(100, 180, 255, 0.2)',
    sectorNormal: 'rgba(40, 70, 120, 0.85)',
    sectorActive: 'rgba(64, 158, 255, 0.8)',
    sectorEmpty: 'rgba(30, 50, 90, 0.5)',
    sectorStroke: 'rgba(100, 180, 255, 0.2)',
    sectorActiveStroke: '#64b5ff',
    iconNormal: 'rgba(200, 230, 255, 0.9)',
    labelNormal: 'rgba(200, 230, 255, 0.7)',
    centerLight: 'rgba(30, 60, 100, 0.95)',
    centerDark: 'rgba(20, 40, 80, 0.95)',
    centerStroke: 'rgba(100, 180, 255, 0.3)',
    centerText: '#e0f0ff'
  },
  purple: {
    background: 'rgba(40, 20, 60, 0.95)',
    glow: 'rgba(180, 100, 255, 0.2)',
    sectorNormal: 'rgba(70, 40, 100, 0.85)',
    sectorActive: 'rgba(150, 100, 255, 0.8)',
    sectorEmpty: 'rgba(50, 30, 70, 0.5)',
    sectorStroke: 'rgba(180, 140, 255, 0.2)',
    sectorActiveStroke: '#b080ff',
    iconNormal: 'rgba(230, 200, 255, 0.9)',
    labelNormal: 'rgba(230, 200, 255, 0.7)',
    centerLight: 'rgba(60, 30, 90, 0.95)',
    centerDark: 'rgba(40, 20, 60, 0.95)',
    centerStroke: 'rgba(180, 140, 255, 0.3)',
    centerText: '#f0e0ff'
  }
}

const themeColors = computed(() => themes[props.theme] || themes.dark)

// 将 menuItems 转换为 slots 结构
const normalizedSlots = computed(() => {
  // 如果直接传入 slots，使用它
  if (props.slots && props.slots.length > 0) {
    return props.slots
  }
  // 否则从 menuItems 转换
  const result = Array(sectorCount).fill(null).map(() => Array(3).fill(null))
  if (props.menuItems && props.menuItems.length > 0) {
    props.menuItems.forEach((item, index) => {
      // 如果有 sector/layer 属性则使用，否则按索引分配到不同扇区的外层
      const sector = item.sector !== undefined ? item.sector : (index % sectorCount)
      const layer = item.layer !== undefined ? item.layer : 0
      if (sector >= 0 && sector < sectorCount && layer >= 0 && layer < 3) {
        result[sector][layer] = {
          icon: item.icon,
          label: item.label,
          action: item.action
        }
      }
    })
  }
  return result
})

// 获取槽位数据
const getSlotData = (sector, layer) => {
  return normalizedSlots.value[sector]?.[layer] || null
}

// 当前选中项
const activeItem = computed(() => {
  if (activeSector.value >= 0 && activeLayer.value >= 0) {
    return getSlotData(activeSector.value, activeLayer.value)
  }
  return null
})

// 样式计算
const centerStyle = computed(() => ({
  left: `${props.centerX}px`,
  top: `${props.centerY}px`
}))

const svgStyle = computed(() => ({
  left: `${props.centerX - size / 2}px`,
  top: `${props.centerY - size / 2}px`,
  width: `${size}px`,
  height: `${size}px`
}))

// 获取层的内外半径
const getLayerRadii = (layer) => {
  if (layer === 0) return { inner: middleRadius, outer: outerRadius }
  if (layer === 1) return { inner: innerRadius, outer: middleRadius }
  return { inner: centerRadius, outer: innerRadius }
}

// 计算扇区路径
const getLayerSectorPath = (sector, layer) => {
  const { inner, outer } = getLayerRadii(layer)
  const startAngle = sector * sectorAngle - Math.PI / 2 - sectorAngle / 2
  const endAngle = startAngle + sectorAngle
  const gap = 0.02

  const x1 = inner * Math.cos(startAngle + gap)
  const y1 = inner * Math.sin(startAngle + gap)
  const x2 = outer * Math.cos(startAngle + gap)
  const y2 = outer * Math.sin(startAngle + gap)
  const x3 = outer * Math.cos(endAngle - gap)
  const y3 = outer * Math.sin(endAngle - gap)
  const x4 = inner * Math.cos(endAngle - gap)
  const y4 = inner * Math.sin(endAngle - gap)

  const largeArc = sectorAngle > Math.PI ? 1 : 0

  return `M ${x1} ${y1}
          L ${x2} ${y2}
          A ${outer} ${outer} 0 ${largeArc} 1 ${x3} ${y3}
          L ${x4} ${y4}
          A ${inner} ${inner} 0 ${largeArc} 0 ${x1} ${y1} Z`
}

// 获取槽位中心位置
const getSlotCenter = (sector, layer) => {
  const { inner, outer } = getLayerRadii(layer)
  const radius = (inner + outer) / 2
  const angle = sector * sectorAngle - Math.PI / 2
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle)
  }
}

// 判断是否激活
const isActive = (sector, layer) => {
  return activeSector.value === sector && activeLayer.value === layer
}

// 设置激活状态
const setActive = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  if (slot && slot.action) {
    activeSector.value = sector
    activeLayer.value = layer
  }
}

const clearActive = () => {
  activeSector.value = -1
  activeLayer.value = -1
}

// 扇区填充色
const getSectorFill = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  if (!slot || !slot.action) {
    return themeColors.value.sectorEmpty
  }
  return isActive(sector, layer)
    ? themeColors.value.sectorActive
    : themeColors.value.sectorNormal
}

// 扇区描边色
const getSectorStroke = (sector, layer) => {
  return isActive(sector, layer)
    ? themeColors.value.sectorActiveStroke
    : themeColors.value.sectorStroke
}

// 鼠标移动处理
const handleMouseMove = (e) => {
  const dx = e.clientX - props.centerX
  const dy = e.clientY - props.centerY
  const distance = Math.sqrt(dx * dx + dy * dy)

  // 判断所在层
  let layer = -1
  if (distance < centerRadius) {
    clearActive()
    return
  } else if (distance < innerRadius) {
    layer = 2  // 内层
  } else if (distance < middleRadius) {
    layer = 1  // 中层
  } else if (distance < outerRadius + 20) {
    layer = 0  // 外层
  } else {
    clearActive()
    return
  }

  // 计算扇区
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += Math.PI * 2
  const sector = Math.floor((angle + sectorAngle / 2) / sectorAngle) % sectorCount

  setActive(sector, layer)
}

// 鼠标释放处理
const handleMouseUp = () => {
  if (activeItem.value && activeItem.value.action) {
    emit('select', activeItem.value)
    resetAndClose()
  } else {
    emit('cancel')
    resetAndClose()
  }
}

// 重置并关闭
const resetAndClose = () => {
  activeSector.value = -1
  activeLayer.value = -1
  emit('close')
}

// 键盘事件
const handleKeydown = (e) => {
  if (!props.visible) return

  if (e.key === 'Escape') {
    emit('cancel')
    resetAndClose()
  } else if (e.key >= '1' && e.key <= '8') {
    const sector = parseInt(e.key) - 1
    // 优先选择外层，如果外层没有则选中层、内层
    for (let layer = 0; layer < 3; layer++) {
      const slot = getSlotData(sector, layer)
      if (slot && slot.action) {
        emit('select', slot)
        resetAndClose()
        return
      }
    }
  }
}

// 重置状态
watch(() => props.visible, (visible) => {
  if (visible) {
    activeSector.value = -1
    activeLayer.value = -1
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineExpose({
  resetAndClose
})
</script>

<style scoped>
.global-radial-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99999;
  cursor: default;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.global-radial-menu.visible {
  opacity: 1;
  pointer-events: all;
}

/* 中心区域 */
.radial-center {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 100001;
}

.center-circle {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #409eff, #337ecc);
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-icon {
  font-size: 10px;
  opacity: 0;
}

.center-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 10px;
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.95), rgba(51, 126, 204, 0.95));
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.center-hint {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 10px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  border-radius: 12px;
  white-space: nowrap;
}

/* SVG 轮盘 */
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

.center-area {
  cursor: pointer;
  pointer-events: all;
}

/* 快捷键提示 */
.shortcut-hints {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 500px;
  z-index: 100002;
}

.shortcut-hints span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.shortcut-hints kbd {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 4px;
  font-size: 10px;
  font-family: 'Consolas', monospace;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
}
</style>
