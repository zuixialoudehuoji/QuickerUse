<template>
  <div class="radial-settings">
    <!-- 基础设置 -->
    <div class="basic-settings">
      <div class="setting-row">
        <span class="label">启用</span>
        <el-switch v-model="settings.enabled" size="small" />
      </div>
      <div class="setting-row">
        <span class="label">触发</span>
        <el-select v-model="settings.triggerMode" size="small" style="width: 90px;">
          <el-option label="右键长按" value="rightLongPress" />
          <el-option label="快捷键" value="hotkey" />
        </el-select>
      </div>
      <div class="setting-row" v-if="settings.triggerMode === 'rightLongPress'">
        <span class="label">延时（ms）</span>
        <el-input-number v-model="settings.longPressDelay" :min="200" :max="1000" :step="50" size="small" style="width: 90px;" />
      </div>
      <div class="setting-row">
        <span class="label">主题</span>
        <el-select v-model="settings.theme" size="small" style="width: 90px;">
          <el-option label="深色" value="dark" />
          <el-option label="浅色" value="light" />
          <el-option label="蓝色" value="blue" />
          <el-option label="紫色" value="purple" />
        </el-select>
      </div>
    </div>

    <!-- 可视化轮盘配置 -->
    <div class="radial-visual">
      <svg :viewBox="`0 0 ${svgSize} ${svgSize}`" class="radial-svg">
        <!-- 背景圆 -->
        <circle :cx="center" :cy="center" :r="outerRadius + 5" fill="rgba(0,0,0,0.05)" />

        <!-- 三层圆环分隔线 -->
        <circle :cx="center" :cy="center" :r="outerRadius" fill="none" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
        <circle :cx="center" :cy="center" :r="middleRadius" fill="none" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
        <circle :cx="center" :cy="center" :r="innerRadius" fill="none" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
        <circle :cx="center" :cy="center" :r="centerRadius" fill="rgba(128,128,128,0.2)" stroke="rgba(128,128,128,0.3)" stroke-width="1" />

        <!-- 扇区分隔线 -->
        <line
          v-for="i in sectorCount"
          :key="'line-'+i"
          :x1="center"
          :y1="center"
          :x2="center + (outerRadius + 5) * Math.cos((i - 1) * sectorAngle - Math.PI/2)"
          :y2="center + (outerRadius + 5) * Math.sin((i - 1) * sectorAngle - Math.PI/2)"
          stroke="rgba(128,128,128,0.3)"
          stroke-width="1"
        />

        <!-- 可点击的格子 -->
        <g v-for="sector in sectorCount" :key="'sector-'+sector">
          <!-- 外层格子 -->
          <path
            :d="getSectorPath(sector - 1, middleRadius, outerRadius)"
            :fill="getSlotFill(sector - 1, 0)"
            :stroke="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 0 ? '#409eff' : 'rgba(128,128,128,0.2)'"
            :stroke-width="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 0 ? 2 : 1"
            class="slot-path"
            @click="selectSlot(sector - 1, 0)"
          />
          <!-- 中层格子 -->
          <path
            :d="getSectorPath(sector - 1, innerRadius, middleRadius)"
            :fill="getSlotFill(sector - 1, 1)"
            :stroke="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 1 ? '#409eff' : 'rgba(128,128,128,0.2)'"
            :stroke-width="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 1 ? 2 : 1"
            class="slot-path"
            @click="selectSlot(sector - 1, 1)"
          />
          <!-- 内层格子 -->
          <path
            :d="getSectorPath(sector - 1, centerRadius, innerRadius)"
            :fill="getSlotFill(sector - 1, 2)"
            :stroke="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 2 ? '#409eff' : 'rgba(128,128,128,0.2)'"
            :stroke-width="selectedSlot?.sector === sector - 1 && selectedSlot?.layer === 2 ? 2 : 1"
            class="slot-path"
            @click="selectSlot(sector - 1, 2)"
          />

          <!-- 显示图标 -->
          <text
            v-if="getSlotData(sector - 1, 0)"
            :x="getSlotCenter(sector - 1, 0).x"
            :y="getSlotCenter(sector - 1, 0).y"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="14"
            class="slot-icon"
          >{{ getSlotData(sector - 1, 0)?.icon }}</text>
          <text
            v-if="getSlotData(sector - 1, 1)"
            :x="getSlotCenter(sector - 1, 1).x"
            :y="getSlotCenter(sector - 1, 1).y"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="12"
            class="slot-icon"
          >{{ getSlotData(sector - 1, 1)?.icon }}</text>
          <text
            v-if="getSlotData(sector - 1, 2)"
            :x="getSlotCenter(sector - 1, 2).x"
            :y="getSlotCenter(sector - 1, 2).y"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="10"
            class="slot-icon"
          >{{ getSlotData(sector - 1, 2)?.icon }}</text>
        </g>
      </svg>

      <!-- 选中提示 -->
      <div class="slot-hint" v-if="selectedSlot">
        位置: 扇区{{ selectedSlot.sector + 1 }} - {{ layerNames[selectedSlot.layer] }}
      </div>
    </div>

    <!-- 功能选择面板 -->
    <div class="action-panel" v-if="selectedSlot">
      <div class="panel-title">选择功能</div>
      <div class="action-grid">
        <div
          v-for="action in allActions"
          :key="action.value"
          class="action-item"
          :class="{ active: getSlotData(selectedSlot.sector, selectedSlot.layer)?.action === action.value }"
          @click="setSlotAction(action)"
        >
          <span class="action-icon">{{ action.icon }}</span>
          <span class="action-label">{{ action.label }}</span>
        </div>
        <div class="action-item clear-item" @click="clearSlot">
          <span class="action-icon">✕</span>
          <span class="action-label">清空</span>
        </div>
      </div>
    </div>

    <div class="preset-bar">
      <el-button size="small" text @click="applyPreset('default')">默认</el-button>
      <el-button size="small" text @click="applyPreset('dev')">开发</el-button>
      <el-button size="small" text @click="applyPreset('simple')">精简</el-button>
      <el-button size="small" text type="danger" @click="clearAll">清空</el-button>
    </div>
    <!-- 保存按钮 -->
    <div class="save-bar">
      <el-button type="primary" size="small" @click="saveSettings">保存设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['save'])

// SVG 尺寸配置
const svgSize = 220
const center = svgSize / 2
const outerRadius = 100
const middleRadius = 70
const innerRadius = 45
const centerRadius = 20
const sectorCount = 8
const sectorAngle = (Math.PI * 2) / sectorCount

const layerNames = ['外层', '中层', '内层']

// 设置数据
const settings = reactive({
  enabled: true,
  triggerMode: 'rightLongPress',
  hotkey: 'Alt+R',
  longPressDelay: 400,
  theme: 'dark',
  // 轮盘槽位数据: slots[sector][layer] = { icon, label, action }
  slots: Array(sectorCount).fill(null).map(() => Array(3).fill(null))
})

// 当前选中的槽位
const selectedSlot = ref(null)

// 所有可用功能
const allActions = [
  { icon: '📋', label: 'JSON', value: 'json-format' },
  { icon: '⏰', label: '时间戳', value: 'timestamp-convert' },
  { icon: '🔢', label: '计算器', value: 'calculator' },
  { icon: '🔤', label: '编码', value: 'encoder' },
  { icon: '🎨', label: '颜色', value: 'color-convert' },
  { icon: '📝', label: '正则', value: 'regex-helper' },
  { icon: '⏱️', label: 'Cron', value: 'cron-helper' },
  { icon: '🤖', label: 'AI', value: 'ai-assistant' },
  { icon: '📎', label: '剪贴板', value: 'clipboard-history' },
  { icon: '👁️', label: 'OCR', value: 'ocr' },
  { icon: '📄', label: 'Markdown', value: 'markdown-preview' },
  { icon: '📱', label: '二维码', value: 'generate-qr' },
  { icon: '🔍', label: '提取', value: 'extract-info' },
  { icon: '⏳', label: '倒计时', value: 'timer' },
  { icon: '💡', label: '闪念', value: 'memo' },
  { icon: '🔒', label: '锁屏', value: 'lock-screen' },
  { icon: '🎯', label: '取色', value: 'pick-color' },
  { icon: '🔑', label: 'UUID', value: 'generate-uuid' },
  { icon: '🔐', label: '密码', value: 'generate-password' },
  { icon: '🌐', label: '搜索', value: 'search-google' },
  { icon: '🌍', label: '翻译', value: 'translate' }
]

// 计算扇区路径
const getSectorPath = (sectorIndex, r1, r2) => {
  const startAngle = sectorIndex * sectorAngle - Math.PI / 2 - sectorAngle / 2
  const endAngle = startAngle + sectorAngle
  const gap = 0.02

  const x1 = center + r1 * Math.cos(startAngle + gap)
  const y1 = center + r1 * Math.sin(startAngle + gap)
  const x2 = center + r2 * Math.cos(startAngle + gap)
  const y2 = center + r2 * Math.sin(startAngle + gap)
  const x3 = center + r2 * Math.cos(endAngle - gap)
  const y3 = center + r2 * Math.sin(endAngle - gap)
  const x4 = center + r1 * Math.cos(endAngle - gap)
  const y4 = center + r1 * Math.sin(endAngle - gap)

  const largeArc = sectorAngle > Math.PI ? 1 : 0

  return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 ${largeArc} 0 ${x1} ${y1} Z`
}

// 获取槽位中心点
const getSlotCenter = (sector, layer) => {
  const angle = sector * sectorAngle - Math.PI / 2
  let radius
  if (layer === 0) radius = (middleRadius + outerRadius) / 2
  else if (layer === 1) radius = (innerRadius + middleRadius) / 2
  else radius = (centerRadius + innerRadius) / 2

  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle)
  }
}

// 获取槽位填充色
const getSlotFill = (sector, layer) => {
  const data = getSlotData(sector, layer)
  if (selectedSlot.value?.sector === sector && selectedSlot.value?.layer === layer) {
    return 'rgba(64, 158, 255, 0.3)'
  }
  if (data) {
    return 'rgba(103, 194, 58, 0.2)'
  }
  return 'rgba(0, 0, 0, 0.02)'
}

// 获取槽位数据
const getSlotData = (sector, layer) => {
  return settings.slots[sector]?.[layer] || null
}

// 选中槽位
const selectSlot = (sector, layer) => {
  selectedSlot.value = { sector, layer }
}

// 设置槽位功能
const setSlotAction = (action) => {
  if (!selectedSlot.value) return
  const { sector, layer } = selectedSlot.value
  settings.slots[sector][layer] = {
    icon: action.icon,
    label: action.label,
    action: action.value
  }
}

// 清空槽位
const clearSlot = () => {
  if (!selectedSlot.value) return
  const { sector, layer } = selectedSlot.value
  settings.slots[sector][layer] = null
}

// 清空所有
const clearAll = () => {
  settings.slots = Array(sectorCount).fill(null).map(() => Array(3).fill(null))
  selectedSlot.value = null
}

// 预设配置 - 三层完整配置
const presets = {
  default: [
    // 扇区0: JSON相关
    [{ icon: '📋', label: 'JSON', action: 'json-format' }, { icon: '🔍', label: '提取', action: 'extract-info' }, { icon: '🔑', label: 'UUID', action: 'generate-uuid' }],
    // 扇区1: 时间相关
    [{ icon: '⏰', label: '时间戳', action: 'timestamp-convert' }, { icon: '⏱️', label: 'Cron', action: 'cron-helper' }, { icon: '⏳', label: '倒计时', action: 'timer' }],
    // 扇区2: 计算相关
    [{ icon: '🔢', label: '计算器', action: 'calculator' }, { icon: '🔤', label: '编码', action: 'encoder' }, { icon: '🔐', label: '密码', action: 'generate-password' }],
    // 扇区3: 文本相关
    [{ icon: '📝', label: '正则', action: 'regex-helper' }, { icon: '📄', label: 'MD', action: 'markdown-preview' }, { icon: '💡', label: '闪念', action: 'memo' }],
    // 扇区4: 颜色相关
    [{ icon: '🎨', label: '颜色', action: 'color-convert' }, { icon: '🎯', label: '取色', action: 'pick-color' }, null],
    // 扇区5: AI相关
    [{ icon: '🤖', label: 'AI', action: 'ai-assistant' }, { icon: '🌍', label: '翻译', action: 'translate' }, { icon: '🌐', label: '搜索', action: 'search-google' }],
    // 扇区6: 剪贴板相关
    [{ icon: '📎', label: '剪贴板', action: 'clipboard-history' }, { icon: '👁️', label: 'OCR', action: 'ocr' }, { icon: '📱', label: '二维码', action: 'generate-qr' }],
    // 扇区7: 系统相关
    [{ icon: '🔒', label: '锁屏', action: 'lock-screen' }, null, null]
  ],
  dev: [
    // 开发者常用
    [{ icon: '📋', label: 'JSON', action: 'json-format' }, { icon: '🔍', label: '提取', action: 'extract-info' }, { icon: '🔑', label: 'UUID', action: 'generate-uuid' }],
    [{ icon: '🔤', label: '编码', action: 'encoder' }, { icon: '🔐', label: '密码', action: 'generate-password' }, null],
    [{ icon: '📝', label: '正则', action: 'regex-helper' }, { icon: '📄', label: 'MD', action: 'markdown-preview' }, null],
    [{ icon: '⏰', label: '时间戳', action: 'timestamp-convert' }, { icon: '⏱️', label: 'Cron', action: 'cron-helper' }, null],
    [{ icon: '🎨', label: '颜色', action: 'color-convert' }, { icon: '🎯', label: '取色', action: 'pick-color' }, null],
    [{ icon: '🤖', label: 'AI', action: 'ai-assistant' }, { icon: '🌍', label: '翻译', action: 'translate' }, null],
    [{ icon: '📎', label: '剪贴板', action: 'clipboard-history' }, { icon: '👁️', label: 'OCR', action: 'ocr' }, null],
    [{ icon: '🔢', label: '计算器', action: 'calculator' }, null, null]
  ],
  simple: [
    // 精简版 - 只使用外层
    [{ icon: '📋', label: 'JSON', action: 'json-format' }, null, null],
    [{ icon: '🔢', label: '计算器', action: 'calculator' }, null, null],
    [{ icon: '🤖', label: 'AI', action: 'ai-assistant' }, null, null],
    [{ icon: '📎', label: '剪贴板', action: 'clipboard-history' }, null, null],
    [{ icon: '🎨', label: '颜色', action: 'color-convert' }, null, null],
    [{ icon: '⏰', label: '时间戳', action: 'timestamp-convert' }, null, null],
    [{ icon: '🔤', label: '编码', action: 'encoder' }, null, null],
    [{ icon: '🎯', label: '取色', action: 'pick-color' }, null, null]
  ]
}

const applyPreset = (name) => {
  if (presets[name]) {
    settings.slots = JSON.parse(JSON.stringify(presets[name]))
    selectedSlot.value = null
    ElMessage.success('已应用预设')
  }
}

// 保存设置
const saveSettings = () => {
  // 转换为菜单项格式（兼容原有结构）
  const menuItems = []
  settings.slots.forEach((layers, sectorIndex) => {
    layers.forEach((slot, layerIndex) => {
      if (slot) {
        menuItems.push({
          id: `${sectorIndex}-${layerIndex}`,
          sector: sectorIndex,
          layer: layerIndex,
          ...slot
        })
      }
    })
  })

  const saved = {
    enabled: settings.enabled,
    triggerMode: settings.triggerMode,
    hotkey: settings.hotkey,
    longPressDelay: settings.longPressDelay,
    theme: settings.theme,
    slots: settings.slots,
    menuItems
  }

  localStorage.setItem('radial-menu-settings', JSON.stringify(saved))

  if (window.api) {
    window.api.send('update-radial-menu-settings', saved)
  }

  emit('save', saved)
  ElMessage.success('设置已保存')
}

// 加载设置
const loadSettings = () => {
  try {
    const saved = localStorage.getItem('radial-menu-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      settings.enabled = parsed.enabled ?? true
      settings.triggerMode = parsed.triggerMode ?? 'rightLongPress'
      settings.hotkey = parsed.hotkey ?? 'Alt+R'
      settings.longPressDelay = parsed.longPressDelay ?? 400
      settings.theme = parsed.theme ?? 'dark'

      if (parsed.slots) {
        settings.slots = parsed.slots
      } else if (parsed.menuItems) {
        // 兼容旧格式：将 menuItems 转换为 slots
        settings.slots = Array(sectorCount).fill(null).map(() => Array(3).fill(null))
        parsed.menuItems.forEach((item, index) => {
          if (index < sectorCount) {
            settings.slots[index][0] = {
              icon: item.icon,
              label: item.label,
              action: item.action
            }
          }
        })
      }
    }
  } catch (e) {
    console.error('加载轮盘设置失败:', e)
  }
}

onMounted(loadSettings)

defineExpose({ settings, saveSettings, loadSettings })
</script>

<style scoped>
.radial-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px;
}

/* 基础设置 */
.basic-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}


.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.setting-row .label {
  font-size: 11px;
  color: var(--text-color);
  /* width: 32px; */
  flex-shrink: 0;
}


.setting-row .unit {
  font-size: 10px;
  color: var(--text-dim);
}

/* 可视化轮盘 */
.radial-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.radial-svg {
  width: 200px;
  height: 200px;
}

.slot-path {
  cursor: pointer;
  transition: fill 0.15s;
}

.slot-path:hover {
  fill: rgba(64, 158, 255, 0.2) !important;
}

.slot-icon {
  pointer-events: none;
  fill: var(--text-color);
}

.slot-hint {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 4px;
}

/* 功能选择面板 */
.action-panel {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 8px;
}

.panel-title {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  border-radius: 4px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.15s;
}

.action-item:hover {
  background: rgba(64, 158, 255, 0.15);
}

.action-item.active {
  background: rgba(103, 194, 58, 0.2);
  border: 1px solid rgba(103, 194, 58, 0.5);
}

.action-item.clear-item {
  background: rgba(245, 108, 108, 0.1);
}

.action-item.clear-item:hover {
  background: rgba(245, 108, 108, 0.2);
}

.action-icon {
  font-size: 14px;
}

.action-label {
  font-size: 9px;
  color: var(--text-dim);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 预设栏 */
.preset-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.preset-label {
  font-size: 11px;
  color: var(--text-dim);
}

/* 保存栏 */
.save-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
