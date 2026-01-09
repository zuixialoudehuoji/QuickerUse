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

    <!-- SVG 轮盘 SVG - 三层同心环 -->
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

    <!-- 图标层 - 使用 Element Plus 图标 -->
    <div class="icon-layer" :style="iconLayerStyle">
      <template v-for="sector in sectorCount" :key="'icon-'+sector">
        <!-- 外层图标 -->
        <div
          v-if="getSlotData(sector - 1, 0)"
          class="slot-icon-wrapper"
          :style="getIconStyle(sector - 1, 0)"
        >
          <img v-if="getSlotImgIcon(sector - 1, 0)" :src="getSlotImgIcon(sector - 1, 0)" class="slot-img-icon" />
          <el-icon
            v-else-if="getSlotElIcon(sector - 1, 0)"
            :size="20"
            :color="isActive(sector - 1, 0) ? '#fff' : themeColors.iconNormal"
          >
            <component :is="getSlotElIcon(sector - 1, 0)" />
          </el-icon>
          <span v-else class="fallback-icon" :style="{ color: isActive(sector - 1, 0) ? '#fff' : themeColors.iconNormal }">
            {{ getSlotData(sector - 1, 0)?.icon }}
          </span>
        </div>
        <!-- 中层图标 -->
        <div
          v-if="getSlotData(sector - 1, 1)"
          class="slot-icon-wrapper"
          :style="getIconStyle(sector - 1, 1)"
        >
          <img v-if="getSlotImgIcon(sector - 1, 1)" :src="getSlotImgIcon(sector - 1, 1)" class="slot-img-icon" style="width: 16px; height: 16px;" />
          <el-icon
            v-else-if="getSlotElIcon(sector - 1, 1)"
            :size="16"
            :color="isActive(sector - 1, 1) ? '#fff' : themeColors.iconNormal"
          >
            <component :is="getSlotElIcon(sector - 1, 1)" />
          </el-icon>
          <span v-else class="fallback-icon" :style="{ color: isActive(sector - 1, 1) ? '#fff' : themeColors.iconNormal, fontSize: '14px' }">
            {{ getSlotData(sector - 1, 1)?.icon }}
          </span>
        </div>
        <!-- 内层图标 -->
        <div
          v-if="getSlotData(sector - 1, 2)"
          class="slot-icon-wrapper"
          :style="getIconStyle(sector - 1, 2)"
        >
          <img v-if="getSlotImgIcon(sector - 1, 2)" :src="getSlotImgIcon(sector - 1, 2)" class="slot-img-icon" style="width: 12px; height: 12px;" />
          <el-icon
            v-else-if="getSlotElIcon(sector - 1, 2)"
            :size="12"
            :color="isActive(sector - 1, 2) ? '#fff' : themeColors.iconNormal"
          >
            <component :is="getSlotElIcon(sector - 1, 2)" />
          </el-icon>
          <span v-else class="fallback-icon" :style="{ color: isActive(sector - 1, 2) ? '#fff' : themeColors.iconNormal, fontSize: '10px' }">
            {{ getSlotData(sector - 1, 2)?.icon }}
          </span>
        </div>
      </template>
    </div>

    <!-- 数字快捷按钮 - 可点击，只显示非空的 -->
    <div class="quick-buttons" @mouseup.stop @mousedown.stop>
      <template v-for="(action, idx) in systemActions" :key="idx">
        <div
          v-if="action && action.action"
          class="quick-btn"
          @mousedown.stop.prevent="triggerQuickAction(idx)"
        >
          <kbd>{{ idx + 1 }}</kbd>
          <el-icon v-if="getQuickActionElIcon(action)" class="btn-el-icon">
            <component :is="getQuickActionElIcon(action)" />
          </el-icon>
          <span v-else class="btn-icon">{{ action.icon }}</span>
          <span class="btn-label">{{ action.label }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import { FEATURE_ICONS } from '../utils/constants'

// 默认数字键功能（当没有配置时使用）
const defaultQuickSlots = [
  { icon: '🔒', label: '锁屏', action: 'lock-screen' },
  { icon: '💻', label: '我的电脑', action: 'open-explorer' },
  { icon: '📥', label: '显示桌面', action: 'minimize-all' },
  { icon: '📁', label: 'Hosts', action: 'switch-hosts' },
  { icon: '🎯', label: '取色', action: 'pick-color' },
  { icon: '📋', label: '注册表', action: 'open-regedit' },
  { icon: '⏳', label: '倒计时', action: 'timer' },
  { icon: '💡', label: '闪念', action: 'memo' }
]

const props = defineProps({
  visible: { type: Boolean, default: false },
  slots: { type: Array, default: () => [] },       // slots[sector][layer] 结构
  menuItems: { type: Array, default: () => [] },   // 兼容旧格式
  quickSlots: { type: Array, default: () => [] },  // 数字键功能配置
  centerX: { type: Number, default: 0 },
  centerY: { type: Number, default: 0 },
  theme: { type: String, default: 'dark' },
  showHints: { type: Boolean, default: false },
  radius: { type: Number, default: 120 },          // 轮盘半径 (80-189px)
  layers: { type: Number, default: 2 }             // 显示层数 (1-3)
})

// 数字键功能列表（优先使用配置，否则使用默认值）
const systemActions = computed(() => {
  console.log('[GlobalRadialMenu] Computing systemActions, quickSlots:', props.quickSlots?.length, props.quickSlots)
  if (props.quickSlots && props.quickSlots.length === 8) {
    const result = props.quickSlots.map(slot => slot || { icon: '❓', label: '空', action: null })
    console.log('[GlobalRadialMenu] Using props.quickSlots:', result)
    return result
  }
  console.log('[GlobalRadialMenu] Using defaultQuickSlots')
  return defaultQuickSlots
})

const emit = defineEmits(['select', 'cancel', 'close'])

// 尺寸配置 - 根据 radius 动态计算
const size = computed(() => props.radius * 2.2)
const sectorCount = 8
const sectorAngle = (Math.PI * 2) / sectorCount

// 三层半径配置 - 根据 radius 动态计算
const outerRadius = computed(() => props.radius)
const middleRadius = computed(() => Math.round(props.radius * 0.7))
const innerRadius = computed(() => Math.round(props.radius * 0.45))
const centerRadius = computed(() => Math.round(props.radius * 0.2))
const iconFontSize = computed(() => Math.max(14, Math.round(props.radius / 6)))
const labelFontSize = computed(() => Math.max(10, Math.round(props.radius / 10)))

// 状态
const activeSector = ref(-1)
const activeLayer = ref(-1)
const isProcessingAction = ref(false)  // 防止重复处理

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

// 默认槽位配置（当没有传入配置时使用）
const defaultSlots = [
  [{ icon: '📋', label: 'JSON', action: 'json-format' }, { icon: '🔍', label: '提取', action: 'extract-info' }, { icon: '🔑', label: 'UUID', action: 'generate-uuid' }],
  [{ icon: '⏰', label: '时间戳', action: 'timestamp-convert' }, { icon: '⏱️', label: 'Cron', action: 'cron-helper' }, { icon: '⏳', label: '倒计时', action: 'timer' }],
  [{ icon: '🔢', label: '计算器', action: 'calculator' }, { icon: '🔤', label: '编码', action: 'encoder' }, { icon: '🔐', label: '密码', action: 'generate-password' }],
  [{ icon: '📝', label: '正则', action: 'regex-helper' }, { icon: '📄', label: 'MD', action: 'markdown-preview' }, { icon: '💡', label: '闪念', action: 'memo' }],
  [{ icon: '🎨', label: '颜色', action: 'color-convert' }, { icon: '🎯', label: '取色', action: 'pick-color' }, null],
  [{ icon: '🤖', label: 'AI', action: 'ai-assistant' }, { icon: '🌍', label: '翻译', action: 'translate' }, { icon: '🌐', label: '搜索', action: 'search-google' }],
  [{ icon: '📎', label: '剪贴板', action: 'clipboard-history' }, { icon: '👁️', label: 'OCR', action: 'ocr' }, { icon: '📱', label: '二维码', action: 'generate-qr' }],
  [{ icon: '🔒', label: '锁屏', action: 'lock-screen' }, null, null]
]

// 将 menuItems 转换为 slots 结构
const normalizedSlots = computed(() => {
  // 如果直接传入有效的 slots，使用它
  if (props.slots && props.slots.length === sectorCount && props.slots.some(s => s && s.some(l => l))) {
    console.log('[GlobalRadialMenu] Using provided slots')
    return props.slots
  }
  // 从 menuItems 转换
  if (props.menuItems && props.menuItems.length > 0) {
    console.log('[GlobalRadialMenu] Converting menuItems to slots')
    const result = Array(sectorCount).fill(null).map(() => Array(3).fill(null))
    props.menuItems.forEach((item) => {
      // 如果有 sector/layer 属性则使用，否则按索引分配到不同扇区的外层
      const sector = item.sector !== undefined ? item.sector : 0
      const layer = item.layer !== undefined ? item.layer : 0
      if (sector >= 0 && sector < sectorCount && layer >= 0 && layer < 3) {
        result[sector][layer] = {
          icon: item.icon,
          label: item.label,
          action: item.action
        }
      }
    })
    return result
  }
  // 使用默认配置
  console.log('[GlobalRadialMenu] Using default slots')
  return defaultSlots
})

// 获取槽位数据
const getSlotData = (sector, layer) => {
  return normalizedSlots.value[sector]?.[layer] || null
}

// 获取 Element Plus 图标组件
const getSlotElIcon = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  if (!slot || !slot.action) return null
  const iconName = FEATURE_ICONS[slot.action]
  if (iconName && ElementPlusIcons[iconName]) {
    return ElementPlusIcons[iconName]
  }
  return null
}

// 获取槽位的图片图标（用户自定义工具）
const getSlotImgIcon = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  if (!slot) return null
  return slot.imgIcon || null
}

// 获取快捷按钮的 Element Plus 图标
const getQuickActionElIcon = (action) => {
  if (!action || !action.action) return null
  const iconName = FEATURE_ICONS[action.action]
  if (iconName && ElementPlusIcons[iconName]) {
    return ElementPlusIcons[iconName]
  }
  return null
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
  left: `${props.centerX - size.value / 2}px`,
  top: `${props.centerY - size.value / 2}px`,
  width: `${size.value}px`,
  height: `${size.value}px`
}))

// 图标层样式
const iconLayerStyle = computed(() => ({
  left: `${props.centerX - size.value / 2}px`,
  top: `${props.centerY - size.value / 2}px`,
  width: `${size.value}px`,
  height: `${size.value}px`
}))

// 获取图标在屏幕上的位置样式
const getIconStyle = (sector, layer) => {
  const pos = getSlotCenter(sector, layer)
  // 转换为相对于图标层的位置
  const x = pos.x + size.value / 2
  const y = pos.y + size.value / 2
  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%, -50%)'
  }
}

// 获取层的内外半径 - 根据层数动态计算
const getLayerRadii = (layer) => {
  if (props.layers === 1) {
    // 单层模式：整个环都是外层
    return { inner: centerRadius.value, outer: outerRadius.value }
  } else if (props.layers === 2) {
    // 双层模式
    if (layer === 0) return { inner: middleRadius.value, outer: outerRadius.value }
    return { inner: centerRadius.value, outer: middleRadius.value }
  } else {
    // 三层模式
    if (layer === 0) return { inner: middleRadius.value, outer: outerRadius.value }
    if (layer === 1) return { inner: innerRadius.value, outer: middleRadius.value }
    return { inner: centerRadius.value, outer: innerRadius.value }
  }
}

// 检查层是否在当前显示范围内
const isLayerVisible = (layer) => {
  return layer < props.layers
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

  // 判断所在层 - 根据层数动态计算
  let layer = -1
  if (distance < centerRadius.value) {
    clearActive()
    return
  } else if (distance > outerRadius.value + 20) {
    clearActive()
    return
  }

  // 根据层数确定层
  if (props.layers === 1) {
    // 单层模式
    layer = 0
  } else if (props.layers === 2) {
    // 双层模式
    if (distance < middleRadius.value) {
      layer = 1  // 内层
    } else {
      layer = 0  // 外层
    }
  } else {
    // 三层模式
    if (distance < innerRadius.value) {
      layer = 2  // 内层
    } else if (distance < middleRadius.value) {
      layer = 1  // 中层
    } else {
      layer = 0  // 外层
    }
  }

  // 计算扇区
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += Math.PI * 2
  const sector = Math.floor((angle + sectorAngle / 2) / sectorAngle) % sectorCount

  setActive(sector, layer)
}

// 鼠标释放处理
const handleMouseUp = (e) => {
  // 如果已经在处理动作，跳过
  if (isProcessingAction.value) {
    console.log('[GlobalRadialMenu] handleMouseUp: already processing, skip')
    return
  }

  // 检查是否点击在数字快捷按钮区域，如果是则忽略（让 click 事件处理）
  const target = e.target
  if (target && (target.closest('.quick-buttons') || target.closest('.quick-btn'))) {
    console.log('[GlobalRadialMenu] mouseup on quick-buttons area, ignoring')
    return
  }

  console.log('[GlobalRadialMenu] handleMouseUp called, activeItem:', activeItem.value)
  if (activeItem.value && activeItem.value.action) {
    const action = activeItem.value.action
    const data = { ...activeItem.value }
    console.log('[GlobalRadialMenu] Action to execute:', action)
    console.log('[GlobalRadialMenu] window.api available:', !!window.api)

    // 通过 IPC 发送到主进程执行动作
    if (window.api) {
      console.log('[GlobalRadialMenu] Sending radial-menu-action IPC:', action)
      window.api.send('radial-menu-action', { action, data })
    } else {
      console.error('[GlobalRadialMenu] window.api is NOT available!')
    }

    emit('select', activeItem.value)
    resetAndClose()
  } else {
    console.log('[GlobalRadialMenu] No activeItem, canceling')
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

// 触发数字快捷功能（鼠标点击）
const triggerQuickAction = (idx) => {
  if (isProcessingAction.value) {
    console.log('[GlobalRadialMenu] Already processing, skip')
    return
  }

  console.log('[GlobalRadialMenu] ====== triggerQuickAction START ======')

  // 立即设置处理标志，防止 handleMouseUp 也触发
  isProcessingAction.value = true

  // 清除轮盘选中状态，防止 handleMouseUp 也发送动作
  activeSector.value = -1
  activeLayer.value = -1

  const action = systemActions.value[idx]
  // 将 Proxy 对象转换为普通对象，否则 IPC 无法序列化
  const plainAction = JSON.parse(JSON.stringify(action))
  console.log('[GlobalRadialMenu] Action:', plainAction)

  if (plainAction && plainAction.action && window.api) {
    console.log('[GlobalRadialMenu] Executing:', plainAction.action)

    try {
      window.api.send('radial-menu-action', {
        action: plainAction.action,
        data: plainAction
      })
      console.log('[GlobalRadialMenu] IPC sent successfully')
    } catch (err) {
      console.error('[GlobalRadialMenu] IPC error:', err)
    }

    emit('select', plainAction)
    setTimeout(() => {
      resetAndClose()
    }, 100)
  } else {
    // 如果动作无效，重置处理标志
    isProcessingAction.value = false
  }
  console.log('[GlobalRadialMenu] ====== triggerQuickAction END ======')
}

// 键盘事件
const handleKeydown = (e) => {
  if (!props.visible || isProcessingAction.value) {
    return
  }

  if (e.key === 'Escape') {
    emit('cancel')
    resetAndClose()
  } else if (e.key >= '1' && e.key <= '8') {
    const idx = parseInt(e.key) - 1
    const action = systemActions.value[idx]
    // 将 Proxy 对象转换为普通对象
    const plainAction = JSON.parse(JSON.stringify(action))

    if (plainAction && plainAction.action && window.api) {
      isProcessingAction.value = true
      console.log('[GlobalRadialMenu] Key', e.key, '-> action:', plainAction.action)
      window.api.send('radial-menu-action', {
        action: plainAction.action,
        data: plainAction
      })
      emit('select', plainAction)
      setTimeout(() => {
        resetAndClose()
      }, 100)
    }
  }
}

// 重置状态
watch(() => props.visible, (visible) => {
  console.log('[GlobalRadialMenu] visible changed to:', visible)
  console.log('[GlobalRadialMenu] systemActions at visible change:', systemActions.value)
  if (visible) {
    activeSector.value = -1
    activeLayer.value = -1
    isProcessingAction.value = false  // 重置处理标志
  }
})

onMounted(() => {
  console.log('[GlobalRadialMenu] Component mounted')
  console.log('[GlobalRadialMenu] props.visible:', props.visible)
  console.log('[GlobalRadialMenu] props.quickSlots:', props.quickSlots)
  console.log('[GlobalRadialMenu] systemActions:', systemActions.value)
  console.log('[GlobalRadialMenu] window.api available:', !!window.api)

  // 添加原生点击事件监听器作为调试
  setTimeout(() => {
    const quickBtns = document.querySelectorAll('.quick-btn')
    console.log('[GlobalRadialMenu] Found quick-btn elements:', quickBtns.length)
    quickBtns.forEach((btn, idx) => {
      btn.addEventListener('mousedown', (e) => {
        console.log('[GlobalRadialMenu] Native mousedown on quick-btn index:', idx)
      })
    })
  }, 500)

  // 额外添加文档级键盘监听器作为调试
  document.addEventListener('keydown', (e) => {
    console.log('[GlobalRadialMenu] Document keydown:', e.key, 'visible:', props.visible)
  })

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

/* 图标层 */
.icon-layer {
  position: absolute;
  pointer-events: none;
  z-index: 100001;
}

.slot-icon-wrapper {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.fallback-icon {
  font-size: 18px;
  line-height: 1;
}

.slot-img-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 3px;
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

/* 数字快捷按钮 - 一行显示 */
.quick-buttons {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  z-index: 100002;
  pointer-events: auto;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  pointer-events: auto;
}

.quick-btn:hover {
  background: rgba(64, 158, 255, 0.8);
  border-color: #409eff;
  transform: translateY(-2px);
}

.quick-btn:active {
  background: rgba(64, 158, 255, 1);
  transform: translateY(0);
}

.quick-btn kbd {
  display: inline-block;
  padding: 2px 5px;
  font-size: 10px;
  font-family: 'Consolas', monospace;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  color: #fff;
}

.quick-btn .btn-icon {
  font-size: 14px;
}

.quick-btn .btn-el-icon {
  font-size: 14px;
  color: #fff;
}

.quick-btn .btn-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}
</style>
