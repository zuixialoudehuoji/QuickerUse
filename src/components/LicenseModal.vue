<template>
  <!-- 全屏遮罩层 - 密钥无效时阻止所有操作 -->
  <div class="license-overlay" v-if="!isValid && !isChecking">
    <div class="license-dialog">
      <div class="license-header">
        <div class="license-icon">
          <svg viewBox="0 0 64 64" width="48" height="48">
            <defs>
              <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#f56c6c"/>
                <stop offset="100%" style="stop-color:#c45656"/>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="12" fill="url(#lockGrad)"/>
            <path d="M32 18c-5.5 0-10 4.5-10 10v6h-2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V36c0-1.1-.9-2-2-2h-2v-6c0-5.5-4.5-10-10-10zm6 16H26v-6c0-3.3 2.7-6 6-6s6 2.7 6 6v6zm-6 4c1.7 0 3 1.3 3 3 0 1.1-.6 2-1.4 2.6V47c0 .9-.7 1.6-1.6 1.6s-1.6-.7-1.6-1.6v-3.4c-.9-.6-1.4-1.5-1.4-2.6 0-1.7 1.3-3 3-3z" fill="#fff"/>
          </svg>
        </div>
        <h2 class="license-title">软件授权验证</h2>
        <p class="license-subtitle">{{ message || '请输入有效的授权密钥以继续使用' }}</p>
      </div>

      <div class="license-body">
        <div class="input-group">
          <label class="input-label">授权密钥</label>
          <el-input
            v-model="inputKey"
            type="textarea"
            :rows="3"
            placeholder="请输入您的授权密钥..."
            :disabled="isActivating"
            class="license-input"
          />
        </div>

        <div class="license-actions">
          <el-button
            type="primary"
            size="large"
            :loading="isActivating"
            :disabled="!inputKey.trim()"
            @click="activateLicense"
            class="activate-btn"
          >
            {{ isActivating ? '验证中...' : '激活授权' }}
          </el-button>
        </div>

        <div class="license-result" v-if="activateMessage">
          <el-alert
            :title="activateMessage"
            :type="activateSuccess ? 'success' : 'error'"
            :closable="false"
            show-icon
          />
        </div>
      </div>

      <div class="license-footer">
        <p class="license-hint">如需获取授权密钥，请联系软件提供方</p>
      </div>
    </div>

    <!-- 防止通过开发者工具操作的保护层 -->
    <div class="protection-layer" @contextmenu.prevent @selectstart.prevent></div>
  </div>

  <!-- 检查中状态 -->
  <div class="license-checking" v-if="isChecking">
    <div class="checking-content">
      <el-icon class="is-loading checking-icon"><Loading /></el-icon>
      <span>正在验证授权...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineExpose } from 'vue'
import { Loading } from '@element-plus/icons-vue'

const props = defineProps({
  // 初始是否有效（用于首次加载）
  initialValid: { type: Boolean, default: false }
})

const emit = defineEmits(['license-validated', 'license-invalid'])

// 状态
const isValid = ref(props.initialValid)
const isChecking = ref(true)
const isActivating = ref(false)
const inputKey = ref('')
const message = ref('')
const remainingDays = ref(0)
const expireDate = ref('')
const activateMessage = ref('')
const activateSuccess = ref(false)

// 定时检查间隔（防止运行时绕过）
let checkInterval = null

// 验证密钥
const validateLicense = () => {
  if (window.api) {
    isChecking.value = true
    window.api.send('license-validate')
  }
}

// 激活密钥
const activateLicense = () => {
  if (!inputKey.value.trim()) return

  isActivating.value = true
  activateMessage.value = ''

  if (window.api) {
    window.api.send('license-activate', inputKey.value.trim())
  }
}

// 处理验证结果
const handleLicenseStatus = (status) => {
  isChecking.value = false
  isValid.value = status.isValid
  remainingDays.value = status.remainingDays || 0
  expireDate.value = status.expireDate || ''
  message.value = status.message || ''

  if (status.isValid) {
    emit('license-validated', {
      remainingDays: remainingDays.value,
      expireDate: expireDate.value
    })
  } else {
    emit('license-invalid', { message: message.value })
  }
}

// 处理激活结果
const handleActivateResult = (result) => {
  isActivating.value = false
  activateSuccess.value = result.success
  activateMessage.value = result.message

  if (result.success) {
    // 激活成功，清空输入
    inputKey.value = ''
    // 状态会通过 license-status 事件更新
  }
}

// 获取当前状态（供外部调用）
const getStatus = () => ({
  isValid: isValid.value,
  remainingDays: remainingDays.value,
  expireDate: expireDate.value
})

onMounted(() => {
  if (window.api) {
    // 监听验证状态
    window.api.on('license-status', handleLicenseStatus)
    // 监听激活结果
    window.api.on('license-activate-result', handleActivateResult)

    // 立即验证（仅启动时检查一次）
    validateLicense()

    // 超时保护：10秒后如果还在检查中，强制显示输入界面
    setTimeout(() => {
      if (isChecking.value) {
        console.warn('[LicenseModal] Validation timeout, forcing input UI')
        isChecking.value = false
        isValid.value = false
        message.value = '验证超时，请输入密钥'
      }
    }, 10000)

    // 注意：移除定时检查，只在启动时验证一次
    // 避免使用过程中突然弹出密钥输入框
  } else {
    // 没有 API 时默认无效
    isChecking.value = false
    isValid.value = false
    message.value = '系统初始化失败'
  }
})

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})

defineExpose({
  validateLicense,
  getStatus
})
</script>

<style scoped>
.license-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.protection-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  user-select: none;
  -webkit-user-select: none;
}

.license-dialog {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 32px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.license-header {
  text-align: center;
  margin-bottom: 24px;
}

.license-icon {
  margin-bottom: 16px;
}

.license-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px 0;
}

.license-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.license-body {
  margin-bottom: 20px;
}

.input-group {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.license-input :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.license-input :deep(.el-textarea__inner):focus {
  border-color: #409eff;
}

.license-input :deep(.el-textarea__inner)::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.license-actions {
  margin-bottom: 16px;
}

.activate-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
}

.license-result {
  margin-top: 12px;
}

.license-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.license-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

/* 检查中状态 */
.license-checking {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checking-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.checking-icon {
  font-size: 24px;
  color: #409eff;
}
</style>
