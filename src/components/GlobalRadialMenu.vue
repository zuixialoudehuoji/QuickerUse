<template>
  <div
    class="global-radial-menu"
    :class="[{ visible: visible }, `style-${styleType}`, `theme-${theme}`]"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @contextmenu.prevent
  >
    <!-- 中心信息 -->
    <div class="radial-center" :style="centerStyle">
      <div class="center-circle" :class="{ 'pulse-ring': styleType === 'tech' }">
        <span class="center-icon">{{ activeItem?.icon || '⚡' }}</span>
      </div>
      <div class="center-label" v-if="activeItem">{{ activeItem.label }}</div>
      <div class="center-hint" v-else>取消</div>
    </div>

    <!-- SVG 轮盘 SVG -->
    <svg
      class="radial-svg"
      :style="svgStyle"
      :viewBox="`0 0 ${size} ${size}`"
    >
      <defs>
        <!-- 中心渐变 -->
        <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="themeColors.centerLight" />
          <stop offset="100%" :stop-color="themeColors.centerDark" />
        </radialGradient>
        
        <!-- 激活扇区渐变：科技蓝 -->
        <radialGradient id="grad-scifi" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="rgba(0, 255, 255, 0.1)" />
          <stop offset="100%" stop-color="rgba(0, 204, 255, 0.6)" />
        </radialGradient>
        
        <!-- 激活扇区渐变：赛博粉 -->
        <radialGradient id="grad-cyberpunk" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="rgba(252, 238, 10, 0.2)" />
          <stop offset="100%" stop-color="rgba(255, 0, 85, 0.7)" />
        </radialGradient>

        <!-- 激活扇区渐变：深空紫 -->
        <radialGradient id="grad-space" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="rgba(180, 100, 255, 0.2)" />
          <stop offset="100%" stop-color="rgba(123, 66, 255, 0.7)" />
        </radialGradient>

        <!-- 阴影滤镜 -->
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
        </filter>
        
        <!-- 强辉光滤镜 (用于 Tech/Glitch 模式) -->
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- 背景裁切 -->
        <clipPath id="bgClip">
          <circle :cx="size/2" :cy="size/2" :r="outerRadius + 5" />
        </clipPath>
        <!-- 网格纹理 -->
        <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
        </pattern>
      </defs>

      <g :transform="`translate(${size/2}, ${size/2})`">
        <!-- 装饰层：HUD 环 (仅在 Tech/Sci-Fi/Cyberpunk 模式下显示) -->
        <!-- 优化：降低透明度，避免干扰图标显示 -->
        <g v-if="['tech', 'scifi', 'glitch'].includes(styleType) && !['light', 'dark'].includes(theme)" class="decorations">
           <circle :r="outerRadius + 15" fill="none" :stroke="themeColors.sectorStroke" stroke-width="1" stroke-dasharray="20 10" opacity="0.25" class="rotate-ring" />
           <circle :r="outerRadius + 8" fill="none" :stroke="themeColors.sectorStroke" stroke-width="0.5" opacity="0.4" />
           <path :d="`M -${outerRadius+20} 0 L -${outerRadius+10} 0 M ${outerRadius+10} 0 L ${outerRadius+20} 0`" stroke="white" stroke-width="2" opacity="0.3" />
           <path :d="`M 0 -${outerRadius+20} L 0 -${outerRadius+10} M 0 ${outerRadius+10} L 0 ${outerRadius+20}`" stroke="white" stroke-width="2" opacity="0.3" />
        </g>

        <!-- 背景圆 -->
        <circle v-if="styleType !== 'glass'" :r="outerRadius + 5" :fill="themeColors.background" />
        <circle v-else :r="outerRadius + 5" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

        <!-- 网格纹理叠加 (仅在科技类主题显示，避免影响 Deep/Light) -->
        <rect
          v-if="['cyberpunk', 'scifi', 'space', 'neon'].includes(theme)"
          :x="-(outerRadius + 5)"
          :y="-(outerRadius + 5)"
          :width="(outerRadius + 5) * 2"
          :height="(outerRadius + 5) * 2"
          fill="url(#gridPattern)"
          clip-path="url(#bgClip)"
          opacity="0.3"
        />

        <!-- 扇区层 -->
        <g v-for="sector in sectorCount" :key="'sector-'+sector" class="sector-group">
          <template v-for="layerIdx in layers" :key="'layer-'+layerIdx">
             <path
              v-if="getSlotData(sector - 1, layerIdx - 1) || styleType !== 'glass'"
              :d="getLayerSectorPath(sector - 1, layerIdx - 1)"
              :fill="getSectorFill(sector - 1, layerIdx - 1)"
              :stroke="getSectorStroke(sector - 1, layerIdx - 1)"
              :stroke-width="getSectorStrokeWidth(sector - 1, layerIdx - 1)"
              class="sector-path"
              :class="{ 'glitch-hover': styleType === 'glitch' && isActive(sector - 1, layerIdx - 1) }"
              :filter="shouldApplyGlow(sector - 1, layerIdx - 1) ? 'url(#glow)' : ''"
              @mouseenter="setActive(sector - 1, layerIdx - 1)"
              @mouseleave="clearActive"
            />
          </template>
        </g>

        <!-- 中心圆 -->
        <circle
          :r="centerRadius"
          :fill="styleType === 'glass' ? 'rgba(255,255,255,0.1)' : 'url(#centerGradient)'"
          :stroke="themeColors.centerStroke"
          stroke-width="2"
          class="center-area"
          @mouseenter="clearActive"
        />
        
        <!-- 中心装饰 (Tech 且非基础主题) -->
        <g v-if="styleType === 'tech' && !['light', 'dark'].includes(theme)" opacity="0.5">
           <line x1="-10" y1="0" x2="10" y2="0" stroke="white" stroke-width="1" />
           <line x1="0" y1="-10" x2="0" y2="10" stroke="white" stroke-width="1" />
           <circle :r="centerRadius - 5" fill="none" stroke="white" stroke-width="1" class="pulse-ring" />
        </g>

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

    <!-- 图标层 -->
    <div class="icon-layer" :style="iconLayerStyle">
      <template v-for="sector in sectorCount" :key="'icon-'+sector">
        <template v-for="layerIdx in layers" :key="'icon-layer-'+layerIdx">
          <div
            v-if="getSlotData(sector - 1, layerIdx - 1)"
            class="slot-icon-wrapper"
            :style="getIconStyle(sector - 1, layerIdx - 1)"
          >
            <img v-if="getSlotImgIcon(sector - 1, layerIdx - 1)" :src="getSlotImgIcon(sector - 1, layerIdx - 1)" class="slot-img-icon" :style="getIconImgSize(layerIdx-1)" />
            <el-icon
              v-else-if="getSlotElIcon(sector - 1, layerIdx - 1)"
              :size="getIconSize(layerIdx-1)"
              :color="isActive(sector - 1, layerIdx - 1) ? '#fff' : themeColors.iconNormal"
              :class="{ 'icon-glow': isActive(sector - 1, layerIdx - 1) && !['light', 'dark'].includes(theme) }"
            >
              <component :is="getSlotElIcon(sector - 1, layerIdx - 1)" />
            </el-icon>
            <span 
              v-else 
              class="fallback-icon" 
              :style="{ color: isActive(sector - 1, layerIdx - 1) ? '#fff' : themeColors.iconNormal, fontSize: getIconSize(layerIdx-1)+'px' }"
              :class="{ 'icon-glow': isActive(sector - 1, layerIdx - 1) && !['light', 'dark'].includes(theme) }"
            >
              {{ getSlotData(sector - 1, layerIdx - 1)?.icon }}
            </span>
          </div>
        </template>
      </template>
    </div>

    <!-- 数字快捷按钮 -->
    <div class="quick-buttons" @mouseup.stop @mousedown.stop>
      <template v-for="(action, idx) in systemActions" :key="idx">
        <div
          v-if="action && action.action"
          class="quick-btn"
          @mousedown.stop.prevent="triggerQuickAction(idx)"
        >
          <kbd>{{ idx + 1 }}</kbd>
          <img v-if="action.imgIcon" :src="action.imgIcon" class="btn-img-icon" />
          <el-icon v-else class="btn-el-icon">
            <component :is="getQuickActionElIcon(action)" />
          </el-icon>
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

// 数字键默认配置 - 8个系统功能
const defaultQuickSlots = [
  { elIcon: 'Lock', label: '锁屏', action: 'lock-screen' },
  { elIcon: 'Monitor', label: '我的电脑', action: 'open-explorer' },
  { elIcon: 'Fold', label: '显示桌面', action: 'minimize-all' },
  { elIcon: 'FolderOpened', label: 'Hosts', action: 'switch-hosts' },
  { elIcon: 'SetUp', label: '注册表', action: 'open-regedit' },
  { elIcon: 'Setting', label: '环境变量', action: 'open-env-vars' },
  { elIcon: 'Delete', label: '程序卸载', action: 'open-uninstall' },
  { elIcon: 'Connection', label: '网络设置', action: 'open-network-settings' }
]

const props = defineProps({
  visible: { type: Boolean, default: false },
  slots: { type: Array, default: () => [] },
  menuItems: { type: Array, default: () => [] },
  quickSlots: { type: Array, default: () => [] },
  centerX: { type: Number, default: 0 },
  centerY: { type: Number, default: 0 },
  theme: { type: String, default: 'dark' },
  styleType: { type: String, default: 'default' },
  showHints: { type: Boolean, default: false },
  radius: { type: Number, default: 120 },
  layers: { type: Number, default: 2 }
})

const systemActions = computed(() => {
  // 只要传入了有效的 quickSlots，就使用它（补齐空位）
  if (props.quickSlots && props.quickSlots.length > 0) {
    const result = []
    for (let i = 0; i < 8; i++) {
      const slot = props.quickSlots[i]
      if (slot && slot.action) {
        result.push(slot)
      } else {
        // 使用默认值填充空位
        result.push(defaultQuickSlots[i] || { elIcon: 'QuestionFilled', label: '空', action: null })
      }
    }
    return result
  }
  return defaultQuickSlots
})

const emit = defineEmits(['select', 'cancel', 'close'])

const size = computed(() => props.radius * 2.5)
const sectorCount = 8
const sectorAngle = (Math.PI * 2) / sectorCount

const outerRadius = computed(() => props.radius)
const middleRadius = computed(() => Math.round(props.radius * 0.7))
const innerRadius = computed(() => Math.round(props.radius * 0.45))
const centerRadius = computed(() => Math.round(props.radius * 0.2))

const activeSector = ref(-1)
const activeLayer = ref(-1)
const isProcessingAction = ref(false)

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
    centerLight: 'rgba(250, 250, 250, 0.95)',
    centerDark: 'rgba(230, 230, 230, 0.95)',
    centerStroke: 'rgba(0, 0, 0, 0.1)',
    centerText: '#333'
  },
  cyberpunk: {
    background: 'rgba(11, 12, 21, 0.95)',
    glow: 'rgba(252, 238, 10, 0.3)',
    sectorNormal: 'rgba(26, 27, 38, 0.9)',
    sectorActive: 'rgba(255, 0, 85, 0.8)', // Pink accent for gradient
    sectorEmpty: 'rgba(20, 20, 30, 0.6)',
    sectorStroke: 'rgba(0, 243, 255, 0.3)',
    sectorActiveStroke: '#ff0055',
    iconNormal: 'rgba(0, 243, 255, 0.9)',
    centerLight: 'rgba(45, 27, 54, 0.95)',
    centerDark: 'rgba(11, 12, 21, 0.95)',
    centerStroke: 'rgba(0, 243, 255, 0.5)',
    centerText: '#00f3ff'
  },
  scifi: {
    background: 'rgba(2, 4, 8, 0.95)',
    glow: 'rgba(0, 204, 255, 0.3)',
    sectorNormal: 'rgba(5, 10, 20, 0.9)',
    sectorActive: 'rgba(0, 204, 255, 0.6)',
    sectorEmpty: 'rgba(2, 5, 10, 0.6)',
    sectorStroke: 'rgba(0, 68, 102, 0.5)',
    sectorActiveStroke: '#aaddff',
    iconNormal: 'rgba(170, 221, 255, 0.9)',
    centerLight: 'rgba(0, 51, 77, 0.95)',
    centerDark: 'rgba(2, 4, 8, 0.95)',
    centerStroke: 'rgba(0, 204, 255, 0.4)',
    centerText: '#00ccff'
  },
  space: {
    background: 'rgba(15, 11, 26, 0.95)',
    glow: 'rgba(157, 0, 255, 0.3)',
    sectorNormal: 'rgba(26, 20, 46, 0.9)',
    sectorActive: 'rgba(157, 0, 255, 0.6)',
    sectorEmpty: 'rgba(20, 14, 36, 0.6)',
    sectorStroke: 'rgba(61, 44, 99, 0.4)',
    sectorActiveStroke: '#e0d4ff',
    iconNormal: 'rgba(224, 212, 255, 0.9)',
    centerLight: 'rgba(43, 31, 69, 0.95)',
    centerDark: 'rgba(15, 11, 26, 0.95)',
    centerStroke: 'rgba(157, 0, 255, 0.4)',
    centerText: '#e0d4ff'
  },
  neon: {
    background: 'rgba(26, 5, 20, 0.95)',
    glow: 'rgba(255, 0, 153, 0.3)',
    sectorNormal: 'rgba(43, 10, 36, 0.9)',
    sectorActive: 'rgba(0, 255, 204, 0.6)',
    sectorEmpty: 'rgba(33, 6, 27, 0.6)',
    sectorStroke: 'rgba(255, 0, 153, 0.4)',
    sectorActiveStroke: '#00ffcc',
    iconNormal: 'rgba(255, 230, 242, 0.9)',
    centerLight: 'rgba(77, 15, 61, 0.95)',
    centerDark: 'rgba(26, 5, 20, 0.95)',
    centerStroke: 'rgba(255, 0, 153, 0.4)',
    centerText: '#ffe6f2'
  }
}

const themeColors = computed(() => themes[props.theme] || themes.dark)

const normalizedSlots = computed(() => {
  if (props.slots && props.slots.length === sectorCount && props.slots.some(s => s && s.some(l => l))) {
    return props.slots
  }
  return Array(sectorCount).fill(null).map(() => Array(3).fill(null))
})

const getSlotData = (sector, layer) => normalizedSlots.value[sector]?.[layer] || null

const getSlotElIcon = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  if (!slot || !slot.action) return null
  // 优先使用保存的 elIcon
  if (slot.elIcon && ElementPlusIcons[slot.elIcon]) {
    return ElementPlusIcons[slot.elIcon]
  }
  // 其次使用 FEATURE_ICONS 映射
  const iconName = FEATURE_ICONS[slot.action]
  return iconName && ElementPlusIcons[iconName] ? ElementPlusIcons[iconName] : ElementPlusIcons.Document
}

const getSlotImgIcon = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  return slot ? slot.imgIcon || null : null
}

const getQuickActionElIcon = (action) => {
  if (!action || !action.action) return null
  // 优先使用保存的 elIcon
  if (action.elIcon && ElementPlusIcons[action.elIcon]) {
    return ElementPlusIcons[action.elIcon]
  }
  // 其次使用 FEATURE_ICONS 映射
  const iconName = FEATURE_ICONS[action.action]
  return iconName && ElementPlusIcons[iconName] ? ElementPlusIcons[iconName] : ElementPlusIcons.Document
}

const activeItem = computed(() => {
  if (activeSector.value >= 0 && activeLayer.value >= 0) {
    return getSlotData(activeSector.value, activeLayer.value)
  }
  return null
})

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

const iconLayerStyle = computed(() => ({
  left: `${props.centerX - size.value / 2}px`,
  top: `${props.centerY - size.value / 2}px`,
  width: `${size.value}px`,
  height: `${size.value}px`,
  pointerEvents: 'none'
}))

const getIconStyle = (sector, layer) => {
  const pos = getSlotCenter(sector, layer)
  return {
    left: `${pos.x + size.value / 2}px`,
    top: `${pos.y + size.value / 2}px`,
    transform: 'translate(-50%, -50%)'
  }
}

const getIconSize = (layer) => {
  if (layer === 0) return 20
  if (layer === 1) return 16
  return 12
}

const getIconImgSize = (layer) => {
  const s = getIconSize(layer)
  return { width: s+'px', height: s+'px' }
}

const getLayerRadii = (layer) => {
  if (props.layers === 1) return { inner: centerRadius.value, outer: outerRadius.value }
  if (props.layers === 2) {
    if (layer === 0) return { inner: middleRadius.value, outer: outerRadius.value }
    return { inner: centerRadius.value, outer: middleRadius.value }
  }
  if (layer === 0) return { inner: middleRadius.value, outer: outerRadius.value }
  if (layer === 1) return { inner: innerRadius.value, outer: middleRadius.value }
  return { inner: centerRadius.value, outer: innerRadius.value }
}

const getLayerSectorPath = (sector, layer) => {
  const { inner, outer } = getLayerRadii(layer)
  const startAngle = sector * sectorAngle - Math.PI / 2 - sectorAngle / 2
  const endAngle = startAngle + sectorAngle
  let gap = 0.02
  // 如果是基础主题，保持小间隙；如果是 Tech 风格且不是基础主题，加大间隙
  if (props.styleType === 'tech' && !['dark', 'light'].includes(props.theme)) gap = 0.08
  if (props.styleType === 'glitch') gap = 0.04
  if (props.styleType === 'glass') gap = 0.01

  const x1 = inner * Math.cos(startAngle + gap)
  const y1 = inner * Math.sin(startAngle + gap)
  const x2 = outer * Math.cos(startAngle + gap)
  const y2 = outer * Math.sin(startAngle + gap)
  const x3 = outer * Math.cos(endAngle - gap)
  const y3 = outer * Math.sin(endAngle - gap)
  const x4 = inner * Math.cos(endAngle - gap)
  const y4 = inner * Math.sin(endAngle - gap)

  const largeArc = sectorAngle > Math.PI ? 1 : 0
  return `M ${x1} ${y1} L ${x2} ${y2} A ${outer} ${outer} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${inner} ${inner} 0 ${largeArc} 0 ${x1} ${y1} Z`
}

const getSectorFill = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  const active = isActive(sector, layer)
  
  // 基础主题 (Dark/Light) 保持纯色，忽略花哨样式
  if (['dark', 'light'].includes(props.theme)) {
    if (!slot) return themeColors.value.sectorEmpty
    return active ? themeColors.value.sectorActive : themeColors.value.sectorNormal
  }

  // 科技主题的高级填充
  if (props.styleType === 'tech') {
    if (!slot) return 'transparent'
    if (active) {
      if (props.theme === 'scifi') return 'url(#grad-scifi)'
      if (props.theme === 'cyberpunk') return 'url(#grad-cyberpunk)'
      if (props.theme === 'space') return 'url(#grad-space)'
      return themeColors.value.sectorActive
    }
    return 'rgba(0,0,0,0.3)'
  }
  
  if (props.styleType === 'glass') {
    if (!slot) return 'transparent'
    return active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)'
  }
  
  if (!slot) return themeColors.value.sectorEmpty
  if (active) {
      if (props.theme === 'scifi') return 'url(#grad-scifi)'
      if (props.theme === 'cyberpunk') return 'url(#grad-cyberpunk)'
      if (props.theme === 'space') return 'url(#grad-space)'
  }
  return active ? themeColors.value.sectorActive : themeColors.value.sectorNormal
}

const getSectorStroke = (sector, layer) => {
  const active = isActive(sector, layer)
  if (props.styleType === 'tech') return active ? '#fff' : themeColors.value.sectorStroke
  if (props.styleType === 'glass') return active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'
  return active ? themeColors.value.sectorActiveStroke : themeColors.value.sectorStroke
}

const getSectorStrokeWidth = (sector, layer) => {
  const active = isActive(sector, layer)
  if (props.styleType === 'tech') return active ? 2 : 1.5
  if (props.styleType === 'glass') return 0.5
  return active ? 2 : 1
}

const shouldApplyGlow = (sector, layer) => {
  if (['dark', 'light'].includes(props.theme)) return false
  return isActive(sector, layer) && ['tech', 'glitch'].includes(props.styleType)
}

const getSlotCenter = (sector, layer) => {
  const { inner, outer } = getLayerRadii(layer)
  const radius = (inner + outer) / 2
  const angle = sector * sectorAngle - Math.PI / 2
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
}

const isActive = (sector, layer) => activeSector.value === sector && activeLayer.value === layer
const setActive = (sector, layer) => {
  const slot = getSlotData(sector, layer)
  if (slot && slot.action) { activeSector.value = sector; activeLayer.value = layer }
}
const clearActive = () => { activeSector.value = -1; activeLayer.value = -1 }

const handleMouseMove = (e) => {
  const dx = e.clientX - props.centerX
  const dy = e.clientY - props.centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance < centerRadius.value || distance > outerRadius.value + 20) { clearActive(); return }

  let layer = -1
  if (props.layers === 1) layer = 0
  else if (props.layers === 2) layer = distance < middleRadius.value ? 1 : 0
  else {
    if (distance < innerRadius.value) layer = 2
    else if (distance < middleRadius.value) layer = 1
    else layer = 0
  }
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += Math.PI * 2
  const sector = Math.floor((angle + sectorAngle / 2) / sectorAngle) % sectorCount
  setActive(sector, layer)
}

const handleMouseUp = (e) => {
  if (isProcessingAction.value) return
  const target = e.target
  if (target && (target.closest('.quick-buttons') || target.closest('.quick-btn'))) return
  if (activeItem.value && activeItem.value.action) {
    if (window.api) window.api.send('radial-menu-action', { action: activeItem.value.action, data: { ...activeItem.value } })
    emit('select', activeItem.value)
    resetAndClose()
  } else {
    emit('cancel')
    resetAndClose()
  }
}

const resetAndClose = () => { activeSector.value = -1; activeLayer.value = -1; emit('close') }

const triggerQuickAction = (idx) => {
  if (isProcessingAction.value) return
  isProcessingAction.value = true
  activeSector.value = -1; activeLayer.value = -1
  const action = systemActions.value[idx]
  if (action && action.action && window.api) {
    window.api.send('radial-menu-action', { action: action.action, data: JSON.parse(JSON.stringify(action)) })
    emit('select', action)
    setTimeout(() => resetAndClose(), 100)
  } else isProcessingAction.value = false
}

const handleKeydown = (e) => {
  if (!props.visible || isProcessingAction.value) return
  if (e.key === 'Escape') { emit('cancel'); resetAndClose() }
  else if (e.key >= '1' && e.key <= '8') triggerQuickAction(parseInt(e.key) - 1)
}

watch(() => props.visible, (visible) => { if (visible) isProcessingAction.value = false })
onMounted(() => { window.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { window.removeEventListener('keydown', handleKeydown) })
defineExpose({ resetAndClose })
</script>

<style scoped>
.global-radial-menu {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4); z-index: 99999;
  opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
}
.global-radial-menu.visible { opacity: 1; pointer-events: all; }
.radial-center { position: absolute; transform: translate(-50%, -50%); pointer-events: none; z-index: 100001; }
.center-circle { width: 16px; height: 16px; background: #409eff; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 12px rgba(64,158,255,0.5); }
.center-label { 
  position: absolute; 
  top: 100%; 
  left: 50%; 
  transform: translateX(-50%); 
  margin-top: 10px; 
  padding: 6px 16px; 
  background: #409eff; 
  color: #fff; 
  font-size: 13px; 
  border-radius: 16px; 
  white-space: nowrap; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  /* 优化：添加过渡动画，让文字变化更柔和 */
  transition: all 0.15s ease-out;
  z-index: 100005; /* 确保层级极高，不被装饰遮挡 */
}
.center-hint { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 10px; padding: 4px 12px; background: rgba(0,0,0,0.6); color: #fff; font-size: 11px; border-radius: 12px; }
.radial-svg { position: absolute; pointer-events: none; z-index: 100000; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.sector-path { cursor: pointer; pointer-events: all; transition: fill 0.15s, stroke 0.15s; }
.icon-layer { position: absolute; pointer-events: none; z-index: 100001; }
.slot-icon-wrapper { position: absolute; display: flex; align-items: center; justify-content: center; transition: transform 0.15s; }
.icon-glow { filter: drop-shadow(0 0 5px rgba(255,255,255,0.8)); }
/* 数字快捷按钮 - 独立悬浮风格 */
.quick-buttons {
  position: fixed;
  bottom: 25px; /* 稍微再上移一点，避免贴底 */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px; /* 增加按钮之间的间距 */
  z-index: 100002;
  pointer-events: none; /* 容器本身不阻挡点击，让间隙穿透 */
  padding: 0;
  background: transparent; /* 移除容器背景 */
  border: none; /* 移除容器边框 */
  box-shadow: none; /* 移除容器阴影 */
  backdrop-filter: none; /* 移除容器模糊 */
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px; /* 增加内边距，让单个胶囊更饱满 */
  background: rgba(0, 0, 0, 0.6); /* 默认深色半透明背景 */
  backdrop-filter: blur(10px); /* 按钮自身添加磨砂效果 */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px; /* 完全圆润的胶囊 */
  cursor: pointer;
  color: #fff;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  min-width: auto; /* 自适应宽度 */
  pointer-events: auto; /* 按钮恢复点击 */
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.quick-btn:hover {
  background: rgba(64, 158, 255, 0.9); /* 悬停变亮蓝 */
  transform: translateY(-4px) scale(1.05); /* 更明显的上浮 */
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.quick-btn:active {
  transform: translateY(-1px);
  background: rgba(64, 158, 255, 1);
}

/* 键盘提示标 */
.quick-btn kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-family: 'Consolas', monospace;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%; /* 圆形提示标 */
  color: #fff;
  font-weight: bold;
}

/* 图标 */
.quick-btn .btn-icon,
.quick-btn .btn-el-icon {
  font-size: 15px;
  display: flex;
  align-items: center;
}

.quick-btn .btn-img-icon {
  width: 15px;
  height: 15px;
  object-fit: contain;
  border-radius: 2px;
}

/* 文字标签 */
.quick-btn .btn-label {
  font-size: 12px; /* 再次微调字体 */
  color: #fff;
  white-space: nowrap;
  font-weight: 500;
  text-shadow: none; /* 移除投影，保持干净 */
}

/* === 主题适配 === */

/* 科技/赛博主题：按钮样式 */
.theme-cyberpunk .quick-buttons,
.theme-scifi .quick-buttons,
.theme-space .quick-buttons {
  background: transparent;
  border: none;
}

.theme-cyberpunk .quick-btn {
  background: rgba(11, 12, 21, 0.8);
  border-color: rgba(252, 238, 10, 0.3);
  color: #00f3ff;
}
.theme-cyberpunk .quick-btn:hover {
  background: rgba(252, 238, 10, 0.2);
  border-color: #fcee0a;
  box-shadow: 0 0 15px rgba(252, 238, 10, 0.4);
  color: #fcee0a;
}
.theme-cyberpunk .quick-btn kbd {
  background: rgba(255, 0, 85, 0.8);
  color: #fff;
}

.theme-scifi .quick-btn {
  background: rgba(2, 4, 8, 0.85);
  border-color: rgba(0, 204, 255, 0.3);
  color: #aaddff;
}
.theme-scifi .quick-btn:hover {
  background: rgba(0, 204, 255, 0.2);
  border-color: #00ccff;
  box-shadow: 0 0 15px rgba(0, 204, 255, 0.4);
  color: #fff;
}
.theme-scifi .quick-btn kbd {
  background: rgba(0, 68, 102, 0.8);
  color: #00ccff;
}

/* 浅色主题：独立悬浮胶囊 */
.theme-light .quick-buttons {
  background: transparent;
  border: none;
  box-shadow: none;
}
.theme-light .quick-btn {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.theme-light .quick-btn:hover {
  background: #fff;
  border-color: #409eff;
  color: #409eff;
  box-shadow: 0 4px 12px rgba(64,158,255,0.2);
}
.theme-light .quick-btn kbd {
  background: rgba(0, 0, 0, 0.05);
  color: #666;
}

/* 动画定义 */
@keyframes rotate-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse-fast { 0% { transform: scale(0.9); opacity: 0.3; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(0.9); opacity: 0.3; } }
.rotate-ring { transform-origin: center; animation: rotate-slow 20s linear infinite; }
.pulse-ring { transform-origin: center; animation: pulse-fast 2s ease-in-out infinite; }

/* 样式特化 */
.style-glass .radial-svg { backdrop-filter: blur(8px); border-radius: 50%; }
.style-glass .center-label { background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); }
.style-glitch .sector-path.glitch-hover { filter: drop-shadow(-2px 0 0 #ff0055) drop-shadow(2px 0 0 #00ffff); }
.style-tech .sector-path { filter: none !important; }
.theme-cyberpunk .center-label { background: linear-gradient(135deg, #ff0055, #b800e6); border: 1px solid #fcee0a; }
.theme-scifi .center-label { background: linear-gradient(135deg, #00334d, #005580); border: 1px solid #00ccff; }

/* 主题特化 - 基础类 (深色/浅色) 的精致化 */
.theme-dark .center-circle {
  background: linear-gradient(145deg, #444, #222);
  border-color: #555;
  box-shadow: 0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1);
}
.theme-dark .center-label {
  background: #333;
  border: 1px solid #444;
  color: #eee;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.theme-dark .sector-path:hover {
  filter: brightness(1.2); /* 简单的亮度提升 */
}

.theme-light .center-circle {
  background: linear-gradient(145deg, #fff, #e6e6e6);
  border-color: #fff;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1);
}
.theme-light .center-icon {
  color: #333; /* 确保图标可见 */
  opacity: 0.8 !important; /* 覆盖默认透明度 */
}
.theme-light .center-label {
  background: #fff;
  border: 1px solid #eee;
  color: #333;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.theme-light .sector-path {
  stroke: rgba(0,0,0,0.05); /* 更柔和的描边 */
}
.theme-light .sector-path:hover {
  fill: #409eff; /* 选中变蓝 */
  filter: drop-shadow(0 2px 4px rgba(64,158,255,0.3));
}
</style>
