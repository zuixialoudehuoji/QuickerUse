<template>
  <div class="radial-settings">
    <!-- 基础设置 -->
    <div class="basic-settings">
      <div class="setting-row">
        <span class="label">半径</span>
        <el-slider
          v-model="settings.radius"
          :min="80"
          :max="200"
          :step="1"
          :format-tooltip="formatRadius"
          style="width: 120px;"
        />
        <span class="radius-value">{{ settings.radius }}px</span>
      </div>
      <div class="setting-row">
        <span class="label">层数</span>
        <el-radio-group v-model="settings.layers" size="small">
          <el-radio-button :value="1">1层</el-radio-button>
          <el-radio-button :value="2">2层</el-radio-button>
          <el-radio-button :value="3">3层</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 可视化轮盘配置 -->
    <div class="radial-visual">
      <div class="radial-preview-container">
        <svg :viewBox="`0 0 ${svgSize} ${svgSize}`" class="radial-svg">
          <circle :cx="center" :cy="center" :r="displayOuterRadius + 5" fill="rgba(0,0,0,0.05)" />
          <circle :cx="center" :cy="center" :r="displayOuterRadius" fill="none" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
          <circle v-if="settings.layers >= 2" :cx="center" :cy="center" :r="displayMiddleRadius" fill="none" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
          <circle v-if="settings.layers >= 3" :cx="center" :cy="center" :r="displayInnerRadius" fill="none" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
          <circle :cx="center" :cy="center" :r="displayCenterRadius" fill="rgba(128,128,128,0.2)" stroke="rgba(128,128,128,0.3)" stroke-width="1" />

          <line
            v-for="i in sectorCount"
            :key="'line-'+i"
            :x1="center" :y1="center"
            :x2="center + (displayOuterRadius + 5) * Math.cos((i - 1) * sectorAngle - Math.PI/2)"
            :y2="center + (displayOuterRadius + 5) * Math.sin((i - 1) * sectorAngle - Math.PI/2)"
            stroke="rgba(128,128,128,0.3)" stroke-width="1"
          />

          <g v-for="sector in sectorCount" :key="'sector-'+sector">
            <path
              :d="getSectorPath(sector - 1, settings.layers === 1 ? displayCenterRadius : displayMiddleRadius, displayOuterRadius)"
              :fill="getSlotFill(sector - 1, 0)"
              :stroke="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 0 ? '#409eff' : 'rgba(128,128,128,0.2)'"
              :stroke-width="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 0 ? 2 : 1"
              class="slot-path" @click="selectSlot(sector - 1, 0)"
            />
            <path v-if="settings.layers >= 2"
              :d="getSectorPath(sector - 1, settings.layers === 2 ? displayCenterRadius : displayInnerRadius, displayMiddleRadius)"
              :fill="getSlotFill(sector - 1, 1)"
              :stroke="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 1 ? '#409eff' : 'rgba(128,128,128,0.2)'"
              :stroke-width="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 1 ? 2 : 1"
              class="slot-path" @click="selectSlot(sector - 1, 1)"
            />
            <path v-if="settings.layers === 3"
              :d="getSectorPath(sector - 1, displayCenterRadius, displayInnerRadius)"
              :fill="getSlotFill(sector - 1, 2)"
              :stroke="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 2 ? '#409eff' : 'rgba(128,128,128,0.2)'"
              :stroke-width="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 2 ? 2 : 1"
              class="slot-path" @click="selectSlot(sector - 1, 2)"
            />
          </g>
        </svg>
        <!-- 图标层 - 使用 Element Plus 图标 -->
        <div class="preview-icon-layer">
          <template v-for="sector in sectorCount" :key="'picon-'+sector">
            <div v-if="getSlotData(sector - 1, 0)" class="preview-icon-wrapper" :style="getPreviewIconStyle(sector - 1, 0)">
              <img v-if="getSlotImgIcon(sector - 1, 0)" :src="getSlotImgIcon(sector - 1, 0)" class="preview-img-icon" />
              <el-icon v-else-if="getSlotElIcon(sector - 1, 0)" :size="14"><component :is="getSlotElIcon(sector - 1, 0)" /></el-icon>
              <span v-else class="preview-fallback-icon">{{ getSlotIcon(sector - 1, 0) }}</span>
            </div>
            <div v-if="settings.layers >= 2 && getSlotData(sector - 1, 1)" class="preview-icon-wrapper" :style="getPreviewIconStyle(sector - 1, 1)">
              <img v-if="getSlotImgIcon(sector - 1, 1)" :src="getSlotImgIcon(sector - 1, 1)" class="preview-img-icon" style="width: 12px; height: 12px;" />
              <el-icon v-else-if="getSlotElIcon(sector - 1, 1)" :size="12"><component :is="getSlotElIcon(sector - 1, 1)" /></el-icon>
              <span v-else class="preview-fallback-icon" style="font-size: 10px;">{{ getSlotIcon(sector - 1, 1) }}</span>
            </div>
            <div v-if="settings.layers === 3 && getSlotData(sector - 1, 2)" class="preview-icon-wrapper" :style="getPreviewIconStyle(sector - 1, 2)">
              <img v-if="getSlotImgIcon(sector - 1, 2)" :src="getSlotImgIcon(sector - 1, 2)" class="preview-img-icon" style="width: 10px; height: 10px;" />
              <el-icon v-else-if="getSlotElIcon(sector - 1, 2)" :size="10"><component :is="getSlotElIcon(sector - 1, 2)" /></el-icon>
              <span v-else class="preview-fallback-icon" style="font-size: 8px;">{{ getSlotIcon(sector - 1, 2) }}</span>
            </div>
          </template>
        </div>
      </div>
      <div class="slot-hint" v-if="selectedSlot">位置: 扇区{{ selectedSlot.sector + 1 }} - {{ layerNames[selectedSlot.layer] }}</div>
    </div>

    <!-- 功能选择面板 -->
    <div class="action-panel" v-if="selectedSlot">
      <div class="panel-header">
        <span class="panel-title">选择功能</span>
        <el-button size="small" text type="danger" @click="clearSlot">清空此位置</el-button>
      </div>

      <!-- 智能推荐功能 -->
      <div class="action-section">
        <div class="section-title">智能推荐 ({{ smartActions.length }})</div>
        <div class="action-list">
          <div v-for="action in smartActions" :key="action.value" class="action-item"
            :class="{ active: getSlotData(selectedSlot.sector, selectedSlot.layer)?.action === action.value }"
            @click="setSlotAction(action)">
            <el-icon v-if="action.elIcon" class="action-el-icon"><component :is="action.elIcon" /></el-icon>
            <span v-else class="action-emoji">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </div>
        </div>
      </div>

      <!-- 用户自定义工具 -->
      <div class="action-section" v-if="userCustomActions.length > 0">
        <div class="section-title">我的工具 ({{ userCustomActions.length }})</div>
        <div class="action-list">
          <div v-for="action in userCustomActions" :key="action.value" class="action-item"
            :class="{ active: getSlotData(selectedSlot.sector, selectedSlot.layer)?.action === action.value }"
            @click="setSlotAction(action)">
            <img v-if="action.imgIcon" :src="action.imgIcon" class="action-img-icon" />
            <el-icon v-else-if="action.elIcon" class="action-el-icon"><component :is="action.elIcon" /></el-icon>
            <span v-else class="action-emoji">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部数字快捷功能区 - 可配置 -->
    <div class="quick-actions">
      <div class="section-title">数字键快捷功能 (轮盘显示后按1-8触发)</div>
      <div class="quick-grid">
        <div v-for="(action, idx) in quickSlots" :key="idx"
          class="quick-item"
          :class="{ active: selectedQuickSlot === idx, empty: !action }"
          @click="selectQuickSlot(idx)">
          <span class="quick-number">{{ idx + 1 }}</span>
          <span v-if="action" class="quick-icon">{{ action.icon }}</span>
          <span v-else class="quick-icon empty-icon">+</span>
          <span class="quick-label">{{ action?.label || '空' }}</span>
        </div>
      </div>
    </div>

    <!-- 数字键功能配置面板 -->
    <div class="quick-config-panel" v-if="selectedQuickSlot !== null">
      <div class="panel-header">
        <span class="panel-title">配置数字键 {{ selectedQuickSlot + 1 }}</span>
        <el-button size="small" text type="danger" @click="clearQuickSlot">清空</el-button>
      </div>

      <!-- 智能推荐功能 -->
      <div class="action-section">
        <div class="section-title">智能推荐</div>
        <div class="action-list">
          <div v-for="action in smartActions" :key="action.value" class="action-item"
            :class="{ active: quickSlots[selectedQuickSlot]?.action === action.value }"
            @click="setQuickSlotAction(action)">
            <el-icon v-if="action.elIcon" class="action-el-icon"><component :is="action.elIcon" /></el-icon>
            <span v-else class="action-emoji">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </div>
        </div>
      </div>

      <!-- 用户自定义工具 -->
      <div class="action-section" v-if="userCustomActions.length > 0">
        <div class="section-title">我的工具</div>
        <div class="action-list">
          <div v-for="action in userCustomActions" :key="action.value" class="action-item"
            :class="{ active: quickSlots[selectedQuickSlot]?.action === action.value }"
            @click="setQuickSlotAction(action)">
            <img v-if="action.imgIcon" :src="action.imgIcon" class="action-img-icon" />
            <el-icon v-else-if="action.elIcon" class="action-el-icon"><component :is="action.elIcon" /></el-icon>
            <span v-else class="action-emoji">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </div>
        </div>
      </div>

      <!-- 系统功能 -->
      <div class="action-section">
        <div class="section-title">系统功能</div>
        <div class="action-list">
          <div v-for="action in defaultSystemActions" :key="action.value" class="action-item"
            :class="{ active: quickSlots[selectedQuickSlot]?.action === action.value }"
            @click="setQuickSlotAction(action)">
            <span class="action-emoji">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="preset-bar">
      <el-button size="small" text @click="applyPreset('default')">默认</el-button>
      <el-button size="small" text @click="applyPreset('dev')">开发</el-button>
      <el-button size="small" text @click="applyPreset('simple')">精简</el-button>
      <el-button size="small" text type="danger" @click="clearAll">清空</el-button>
    </div>

    <div class="save-bar">
      <el-button type="primary" size="small" @click="saveSettings">保存设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import { ALL_FEATURES, FEATURE_ICONS } from '../utils/constants'

const props = defineProps({
  // 父组件可以传递 visible 来触发刷新
  visible: { type: Boolean, default: true }
})

const emit = defineEmits(['save'])

const svgSize = 220
const center = svgSize / 2
const sectorCount = 8
const sectorAngle = (Math.PI * 2) / sectorCount
const layerNames = ['外层', '中层', '内层']

const settings = reactive({
  radius: 120,
  layers: 2,
  slots: Array(sectorCount).fill(null).map(() => Array(3).fill(null))
})

const selectedSlot = ref(null)
const selectedQuickSlot = ref(null)

// 数字键快捷功能配置（8个位置）
const quickSlots = ref([
  { icon: '🔒', label: '锁屏', action: 'lock-screen' },
  { icon: '💻', label: '我的电脑', action: 'open-explorer' },
  { icon: '📥', label: '显示桌面', action: 'minimize-all' },
  { icon: '📁', label: 'Hosts', action: 'switch-hosts' },
  { icon: '🎯', label: '取色', action: 'pick-color' },
  { icon: '📋', label: '注册表', action: 'open-regedit' },
  { icon: '⏳', label: '倒计时', action: 'timer' },
  { icon: '💡', label: '闪念', action: 'memo' }
])

// 默认系统功能列表（供选择）
const defaultSystemActions = [
  { icon: '🔒', label: '锁屏', value: 'lock-screen' },
  { icon: '💻', label: '我的电脑', value: 'open-explorer' },
  { icon: '📥', label: '显示桌面', value: 'minimize-all' },
  { icon: '📁', label: 'Hosts', value: 'switch-hosts' },
  { icon: '📋', label: '注册表', value: 'open-regedit' }
]

const displayOuterRadius = computed(() => Math.round(100 * settings.radius / 200))
const displayMiddleRadius = computed(() => Math.round(70 * settings.radius / 200))
const displayInnerRadius = computed(() => Math.round(45 * settings.radius / 200))
const displayCenterRadius = computed(() => Math.round(20 * settings.radius / 200))

const formatRadius = (val) => `${val}px`

// emoji 图标映射（备用）
const emojiMap = {
  'search-google': '🌐', 'translate': '🌍', 'sql-in': '📊', 'json-format': '📋',
  'yaml-format': '📄', 'timestamp-convert': '⏰', 'to-camel': '🔤', 'regex-helper': '📝',
  'color-convert': '🎨', 'extract-info': '🔍', 'generate-qr': '📱', 'memo': '💡',
  'clipboard-history': '📎', 'cron-helper': '⏱️', 'generate-uuid': '🔑', 'generate-password': '🔐',
  'color-picker': '🎯', 'pick-color': '🎯', 'timer': '⏳', 'calculator': '🔢',
  'encoder': '🔤', 'markdown-preview': '📄', 'ocr': '👁️', 'ai-assistant': '🤖'
}

// 智能推荐功能 - 统一使用 Element Plus 图标
const smartActions = computed(() => {
  return ALL_FEATURES.map(f => {
    const iconName = FEATURE_ICONS[f.action]
    const elIcon = iconName && ElementPlusIcons[iconName] ? ElementPlusIcons[iconName] : null
    return {
      icon: emojiMap[f.action] || '⚡',
      elIcon,
      label: f.label,
      value: f.action
    }
  })
})

// 用户自定义工具 - 使用 ref 以支持实时刷新
const userCustomActionsData = ref([])

// 刷新自定义工具数据
const refreshCustomActions = () => {
  try {
    const saved = localStorage.getItem('custom-actions')
    if (saved) {
      const parsed = JSON.parse(saved)
      userCustomActionsData.value = parsed.map((item, idx) => {
        let imgIcon = null
        let elIcon = null
        let icon = '📁'

        const iconStr = (item.icon || '').trim()

        // 如果是 base64 图片（支持多种格式）
        if (iconStr && (iconStr.startsWith('data:') || iconStr.startsWith('data:image'))) {
          imgIcon = iconStr
        } else if (iconStr && ElementPlusIcons[iconStr]) {
          // 如果是 Element Plus 图标名称
          elIcon = ElementPlusIcons[iconStr]
        } else if (iconStr && iconStr.length <= 2) {
          // 如果是 emoji
          icon = iconStr
        } else if (iconStr && iconStr.length > 10) {
          // 可能是未识别的 base64 或长字符串，忽略显示默认图标
          icon = '📁'
        }

        return {
          icon,
          imgIcon,
          elIcon,
          label: item.label || item.name || `工具${idx + 1}`,
          value: item.type === 'file' ? `file:${item.path}` : item.action,
          path: item.path,
          type: item.type
        }
      })
    } else {
      userCustomActionsData.value = []
    }
    console.log('[RadialMenuSettings] Refreshed custom actions:', userCustomActionsData.value.length)
  } catch (e) {
    console.error('读取自定义工具失败:', e)
    userCustomActionsData.value = []
  }
}

// 计算属性保持兼容
const userCustomActions = computed(() => userCustomActionsData.value)

// 监听 storage 事件实现跨窗口同步
const handleStorageChange = (e) => {
  if (e.key === 'custom-actions') {
    console.log('[RadialMenuSettings] Storage changed, refreshing custom actions')
    refreshCustomActions()
  }
}

// 监听 visible 属性变化，显示时刷新数据
watch(() => props.visible, (val) => {
  if (val) {
    refreshCustomActions()
  }
})

// 选择数字键位置
const selectQuickSlot = (idx) => {
  selectedQuickSlot.value = selectedQuickSlot.value === idx ? null : idx
  selectedSlot.value = null // 取消轮盘选择
}

// 设置数字键功能
const setQuickSlotAction = (action) => {
  if (selectedQuickSlot.value === null) return
  quickSlots.value[selectedQuickSlot.value] = {
    icon: action.icon || emojiMap[action.value] || '⚡',
    label: action.label,
    action: action.value,
    path: action.path,
    type: action.type
  }
}

// 清空数字键功能
const clearQuickSlot = () => {
  if (selectedQuickSlot.value === null) return
  quickSlots.value[selectedQuickSlot.value] = null
}

// 获取槽位显示的图标（emoji）
const getSlotIcon = (sector, layer) => {
  const data = getSlotData(sector, layer)
  if (!data) return ''
  // 优先使用 emoji
  if (data.icon && data.icon.length <= 2) return data.icon
  // 否则使用映射
  return emojiMap[data.action] || '⚡'
}

// 获取槽位的 Element Plus 图标组件
const getSlotElIcon = (sector, layer) => {
  const data = getSlotData(sector, layer)
  if (!data || !data.action) return null
  const iconName = FEATURE_ICONS[data.action]
  if (iconName && ElementPlusIcons[iconName]) {
    return ElementPlusIcons[iconName]
  }
  return null
}

// 获取槽位的图片图标（用户自定义工具）
const getSlotImgIcon = (sector, layer) => {
  const data = getSlotData(sector, layer)
  if (!data) return null
  return data.imgIcon || null
}

// 获取图标在预览区的位置样式
const getPreviewIconStyle = (sector, layer) => {
  const pos = getSlotCenter(sector, layer)
  return {
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    transform: 'translate(-50%, -50%)'
  }
}

const getSectorPath = (sectorIndex, r1, r2) => {
  const startAngle = sectorIndex * sectorAngle - Math.PI / 2 - sectorAngle / 2
  const endAngle = startAngle + sectorAngle
  const gap = 0.02
  const x1 = center + r1 * Math.cos(startAngle + gap), y1 = center + r1 * Math.sin(startAngle + gap)
  const x2 = center + r2 * Math.cos(startAngle + gap), y2 = center + r2 * Math.sin(startAngle + gap)
  const x3 = center + r2 * Math.cos(endAngle - gap), y3 = center + r2 * Math.sin(endAngle - gap)
  const x4 = center + r1 * Math.cos(endAngle - gap), y4 = center + r1 * Math.sin(endAngle - gap)
  const largeArc = sectorAngle > Math.PI ? 1 : 0
  return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 ${largeArc} 0 ${x1} ${y1} Z`
}

const getSlotCenter = (sector, layer) => {
  const angle = sector * sectorAngle - Math.PI / 2
  let r1, r2
  if (settings.layers === 1) { r1 = displayCenterRadius.value; r2 = displayOuterRadius.value }
  else if (settings.layers === 2) {
    if (layer === 0) { r1 = displayMiddleRadius.value; r2 = displayOuterRadius.value }
    else { r1 = displayCenterRadius.value; r2 = displayMiddleRadius.value }
  } else {
    if (layer === 0) { r1 = displayMiddleRadius.value; r2 = displayOuterRadius.value }
    else if (layer === 1) { r1 = displayInnerRadius.value; r2 = displayMiddleRadius.value }
    else { r1 = displayCenterRadius.value; r2 = displayInnerRadius.value }
  }
  const radius = (r1 + r2) / 2
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }
}

const getSlotFill = (sector, layer) => {
  if (layer >= settings.layers) return 'rgba(0, 0, 0, 0.02)'
  const data = getSlotData(sector, layer)
  if (selectedSlot.value?.sector === sector && selectedSlot.value?.layer === layer) return 'rgba(64, 158, 255, 0.3)'
  if (data) return 'rgba(103, 194, 58, 0.2)'
  return 'rgba(0, 0, 0, 0.02)'
}

const getSlotData = (sector, layer) => settings.slots[sector]?.[layer] || null

const selectSlot = (sector, layer) => {
  if (layer >= settings.layers) return
  selectedSlot.value = { sector, layer }
  selectedQuickSlot.value = null // 取消数字键选择
}

const setSlotAction = (action) => {
  if (!selectedSlot.value) return
  const { sector, layer } = selectedSlot.value
  settings.slots[sector][layer] = {
    icon: action.icon,
    imgIcon: action.imgIcon,  // 保存自定义工具的图片图标
    label: action.label,
    action: action.value,
    path: action.path,
    type: action.type
  }
}

const clearSlot = () => {
  if (!selectedSlot.value) return
  settings.slots[selectedSlot.value.sector][selectedSlot.value.layer] = null
}

const clearAll = () => {
  settings.slots = Array(sectorCount).fill(null).map(() => Array(3).fill(null))
  selectedSlot.value = null
  ElMessage.success('已清空所有配置')
}

const presets = {
  default: [
    [{ icon: '📋', label: 'JSON', action: 'json-format' }, { icon: '🔍', label: '提取', action: 'extract-info' }, null],
    [{ icon: '⏰', label: '时间戳', action: 'timestamp-convert' }, { icon: '🔢', label: '计算器', action: 'calculator' }, null],
    [{ icon: '🤖', label: 'AI', action: 'ai-assistant' }, { icon: '📎', label: '剪贴板', action: 'clipboard-history' }, null],
    [{ icon: '🎨', label: '颜色', action: 'color-convert' }, { icon: '🎯', label: '取色', action: 'pick-color' }, null],
    [{ icon: '📱', label: '二维码', action: 'generate-qr' }, { icon: '👁️', label: 'OCR', action: 'ocr' }, null],
    [{ icon: '🔑', label: 'UUID', action: 'generate-uuid' }, { icon: '🔐', label: '密码', action: 'generate-password' }, null],
    [{ icon: '🌐', label: '搜索', action: 'search-google' }, { icon: '🌍', label: '翻译', action: 'translate' }, null],
    [{ icon: '⏳', label: '倒计时', action: 'timer' }, { icon: '💡', label: '闪念', action: 'memo' }, null]
  ],
  dev: [
    [{ icon: '📋', label: 'JSON', action: 'json-format' }, null, null],
    [{ icon: '⏰', label: '时间戳', action: 'timestamp-convert' }, null, null],
    [{ icon: '🔤', label: '编码', action: 'encoder' }, null, null],
    [{ icon: '📝', label: '正则', action: 'regex-helper' }, null, null],
    [{ icon: '⏱️', label: 'Cron', action: 'cron-helper' }, null, null],
    [{ icon: '🔑', label: 'UUID', action: 'generate-uuid' }, null, null],
    [{ icon: '🔐', label: '密码', action: 'generate-password' }, null, null],
    [{ icon: '🎨', label: '颜色', action: 'color-convert' }, null, null]
  ],
  simple: [
    [{ icon: '📋', label: 'JSON', action: 'json-format' }, null, null],
    [{ icon: '🤖', label: 'AI', action: 'ai-assistant' }, null, null],
    [{ icon: '📎', label: '剪贴板', action: 'clipboard-history' }, null, null],
    [{ icon: '🔢', label: '计算器', action: 'calculator' }, null, null],
    [null, null, null], [null, null, null],
    [{ icon: '🌐', label: '搜索', action: 'search-google' }, null, null],
    [{ icon: '🌍', label: '翻译', action: 'translate' }, null, null]
  ]
}

const applyPreset = (name) => {
  if (presets[name]) {
    settings.slots = JSON.parse(JSON.stringify(presets[name]))
    selectedSlot.value = null
    ElMessage.success('已应用预设')
  }
}

const saveSettings = () => {
  try {
    let configuredCount = 0
    const slotsClone = JSON.parse(JSON.stringify(settings.slots))
    const quickSlotsClone = JSON.parse(JSON.stringify(quickSlots.value))
    const menuItems = []
    slotsClone.forEach((layers, sectorIndex) => {
      layers.forEach((slot, layerIndex) => {
        if (slot && layerIndex < settings.layers) {
          configuredCount++
          menuItems.push({ id: `${sectorIndex}-${layerIndex}`, sector: sectorIndex, layer: layerIndex, ...slot })
        }
      })
    })
    const saved = {
      radius: settings.radius,
      layers: settings.layers,
      slots: slotsClone,
      menuItems,
      quickSlots: quickSlotsClone  // 保存数字键配置
    }
    localStorage.setItem('radial-menu-settings', JSON.stringify(saved))
    if (window.api) window.api.send('update-radial-menu-settings', saved)
    emit('save', saved)
    ElMessage.success({ message: `保存成功！配置了 ${configuredCount} 个轮盘功能`, duration: 3000 })
  } catch (e) {
    console.error('保存轮盘设置失败:', e)
    ElMessage.error('保存失败: ' + e.message)
  }
}

const loadSettings = () => {
  try {
    const saved = localStorage.getItem('radial-menu-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      settings.radius = parsed.radius ?? 120
      settings.layers = parsed.layers ?? 2
      if (parsed.slots?.length === sectorCount) settings.slots = parsed.slots
      else applyPreset('default')
      // 加载数字键配置
      if (parsed.quickSlots?.length === 8) {
        quickSlots.value = parsed.quickSlots
      }
    } else applyPreset('default')
  } catch (e) {
    console.error('加载轮盘设置失败:', e)
    applyPreset('default')
  }
}

onMounted(() => {
  loadSettings()
  refreshCustomActions()
  // 监听 localStorage 变化实现实时同步
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})

defineExpose({ settings, saveSettings, loadSettings, refreshCustomActions })
</script>

<style scoped>
.radial-settings { display: flex; flex-direction: column; gap: 10px; padding: 4px; }
.basic-settings { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 8px; background: rgba(0, 0, 0, 0.02); border-radius: 6px; }
.setting-row { display: flex; align-items: center; gap: 8px; }
.setting-row .label { font-size: 12px; color: #666; min-width: 36px; }
.radius-value { font-size: 11px; color: #999; min-width: 45px; }
.radial-visual { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.radial-preview-container { position: relative; width: 220px; height: 220px; }
.radial-svg { width: 220px; height: 220px; cursor: pointer; }
.slot-path { cursor: pointer; transition: fill 0.2s; }
.slot-path:hover { filter: brightness(1.1); }
.slot-icon { pointer-events: none; user-select: none; }
.slot-hint { font-size: 11px; color: #666; padding: 4px 8px; background: rgba(64, 158, 255, 0.1); border-radius: 4px; }

/* 轮盘预览图标层 */
.preview-icon-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
.preview-icon-wrapper { position: absolute; display: flex; align-items: center; justify-content: center; color: #409eff; }
.preview-fallback-icon { font-size: 12px; line-height: 1; }
.preview-img-icon { width: 14px; height: 14px; object-fit: contain; border-radius: 2px; }

.action-panel { background: rgba(0, 0, 0, 0.02); border-radius: 6px; padding: 8px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.panel-title { font-size: 11px; color: #999; }
.action-section { margin-bottom: 8px; }
.section-title { font-size: 10px; color: #666; margin-bottom: 4px; padding-left: 2px; }

/* 功能列表 - 网格布局，等宽对齐 */
.action-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
  overflow-x: hidden;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid transparent;
}
.action-item:hover { background: rgba(64, 158, 255, 0.1); }
.action-item.active { background: rgba(64, 158, 255, 0.2); border-color: #409eff; }

.action-emoji { font-size: 16px; line-height: 1; }
.action-el-icon { font-size: 18px; color: #409eff; }
.action-img-icon { width: 18px; height: 18px; object-fit: contain; }
.action-label { font-size: 9px; color: #666; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: center; }

/* 底部数字快捷功能区 */
.quick-actions { background: rgba(0, 0, 0, 0.03); border-radius: 6px; padding: 8px; margin-top: 4px; }
.quick-actions .section-title .hint { font-size: 9px; color: #999; margin-left: 8px; }
.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.quick-item { display: flex; flex-direction: column; align-items: center; padding: 4px 2px; border-radius: 4px; cursor: pointer; transition: all 0.2s; position: relative; border: 1px solid transparent; min-height: 40px; }
.quick-item:hover { background: rgba(64, 158, 255, 0.15); }
.quick-item.active { background: rgba(64, 158, 255, 0.2); border-color: #409eff; }
.quick-item.empty { background: rgba(0, 0, 0, 0.02); border: 1px dashed rgba(0, 0, 0, 0.1); }
.quick-number { position: absolute; top: 2px; right: 2px; font-size: 8px; color: #999; background: rgba(0,0,0,0.1); border-radius: 2px; padding: 0 3px; }
.quick-icon { font-size: 14px; line-height: 1; }
.quick-icon.empty-icon { color: #ccc; font-size: 16px; }
.quick-label { font-size: 8px; color: #666; margin-top: 2px; white-space: nowrap; }

/* 数字键配置面板 */
.quick-config-panel { background: rgba(64, 158, 255, 0.05); border: 1px solid rgba(64, 158, 255, 0.2); border-radius: 6px; padding: 8px; margin-top: 4px; }

.preset-bar { display: flex; justify-content: center; gap: 4px; padding: 4px 0; border-top: 1px solid rgba(0, 0, 0, 0.05); }
.save-bar { display: flex; justify-content: center; padding-top: 8px; }
</style>
