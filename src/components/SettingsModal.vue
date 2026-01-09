<template>
  <el-dialog
    v-model="visible"
    title="设置"
    width="320px"
    :close-on-click-modal="true"
    class="settings-dialog"
    :fullscreen="true"
  >
    <el-tabs v-model="activeTab" class="settings-tabs">
      <!-- 基础设置（合并外观和数据） -->
      <el-tab-pane label="基础设置" name="basic">
        <div class="setting-group">
          <!-- 外观设置部分 -->
          <div class="setting-section-title">外观</div>

          <div class="setting-row">
            <span class="setting-label">显示模式</span>
            <el-select v-model="localSettings.mode" size="small" @change="handleSettingChange">
              <el-option value="smart" label="智能感知" />
              <el-option value="all" label="全部功能" />
            </el-select>
          </div>

          <div class="setting-row">
            <span class="setting-label">主题</span>
            <el-select v-model="localSettings.theme" size="small" @change="handleSettingChange">
              <el-option value="dark" label="深色" />
              <el-option value="light" label="浅色" />
            </el-select>
          </div>

          <div class="setting-row">
            <span class="setting-label">透明度 {{ Math.round(localSettings.opacity * 100) }}%</span>
            <el-slider
              v-model="localSettings.opacity"
              :min="0.5"
              :max="1"
              :step="0.05"
              size="small"
              @change="handleSettingChange"
            />
          </div>

          <div class="setting-row">
            <span class="setting-label">智能区行数</span>
            <el-input-number
              v-model="localSettings.smartRows"
              :min="1"
              :max="5"
              size="small"
              @change="handleSettingChange"
            />
          </div>

          <div class="setting-row">
            <span class="setting-label">工具区行数</span>
            <el-input-number
              v-model="localSettings.customRows"
              :min="1"
              :max="5"
              size="small"
              @change="handleSettingChange"
            />
          </div>

          <!-- 数据设置部分 -->
          <el-divider />
          <div class="setting-section-title">启动与行为</div>

          <div class="setting-row">
            <span class="setting-label">开机自动启动</span>
            <el-switch v-model="autoStart" @change="updateAutoStart" />
          </div>

          <div class="setting-row">
            <span class="setting-label">启动后最小化到托盘</span>
            <el-switch v-model="startMinimized" @change="updateStartMinimized" />
          </div>

          <div class="setting-row">
            <span class="setting-label">中键唤醒 (仅Windows)</span>
            <el-switch v-model="middleClickEnabled" @change="updateMiddleClick" />
          </div>

          <div class="setting-row">
            <span class="setting-label">智能环境感知</span>
            <el-switch v-model="envSensingEnabled" @change="updateEnvSensing" />
          </div>
          <div class="setting-hint">
            根据当前使用的应用自动调整推荐功能顺序
          </div>

          <el-divider />
          <div class="setting-section-title">服务配置</div>

          <div class="setting-row">
            <span class="setting-label">搜索引擎</span>
            <el-select v-model="localSettings.searchEngine" size="small" @change="handleSettingChange">
              <el-option value="google" label="Google" />
              <el-option value="baidu" label="百度" />
              <el-option value="bing" label="Bing" />
              <el-option value="duckduckgo" label="DuckDuckGo" />
            </el-select>
          </div>

          <div class="setting-row">
            <span class="setting-label">翻译服务</span>
            <el-select v-model="localSettings.translateService" size="small" @change="handleSettingChange">
              <el-option value="google" label="Google翻译" />
              <el-option value="deepl" label="DeepL" />
              <el-option value="baidu" label="百度翻译" />
              <el-option value="youdao" label="有道翻译" />
            </el-select>
          </div>

          <div class="setting-row">
            <span class="setting-label">密钥管理</span>
            <el-button size="small" @click="showSecretManager = true">
              <el-icon><Key /></el-icon>
              管理密钥
            </el-button>
          </div>

          <el-divider />
          <div class="setting-section-title">配置管理</div>

          <div class="setting-row">
            <span class="setting-label">导出配置</span>
            <el-button size="small" @click="handleExportConfig">
              导出到文件
            </el-button>
          </div>
          <div class="setting-hint">
            将当前配置导出为 JSON 文件，便于备份或迁移
          </div>

          <div class="setting-row">
            <span class="setting-label">导入配置</span>
            <el-button size="small" @click="handleImportConfig">
              从文件导入
            </el-button>
          </div>
          <div class="setting-hint">
            从 JSON 文件导入配置，导入后需重启应用生效
          </div>

          <el-divider />

          <div class="danger-zone">
            <div class="danger-buttons">
              <el-button type="danger" size="small" @click="handleResetTools">
                重置我的工具
              </el-button>
              <el-button type="danger" size="small" plain @click="handleResetAll">
                恢复默认设置
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 快捷键设置 -->
      <el-tab-pane label="快捷键" name="hotkeys">
        <div class="setting-group">
          <div class="setting-row">
            <span class="setting-label">全局唤醒</span>
            <el-input
              v-model="localSettings.globalHotkey"
              size="small"
              placeholder="点击后按键"
              style="width: 100px;"
              readonly
              @keydown="captureGlobalHotkey"
              @focus="hotkeyFocused = 'global'"
              @blur="hotkeyFocused = ''"
              :class="{ 'hotkey-active': hotkeyFocused === 'global' }"
            />
          </div>

          <div class="setting-row">
            <span class="setting-label">窗口跟随鼠标</span>
            <el-switch v-model="localSettings.followMouse" @change="handleSettingChange" />
          </div>

          <el-divider content-position="center">功能快捷键
          </el-divider>

          <div class="hotkey-grid">
            <div class="hotkey-item" v-for="feature in allFeatures" :key="feature.action">
              <span class="hotkey-label">{{ feature.label }}</span>
              <el-input
                v-model="localHotkeys[feature.action]"
                size="small"
                placeholder="按键"
                style="width: 90px;"
                readonly
                @keydown="(e) => captureFeatureHotkey(e, feature.action)"
                @focus="hotkeyFocused = feature.action"
                @blur="hotkeyFocused = ''"
                :class="{ 'hotkey-active': hotkeyFocused === feature.action }"
              />
            </div>
          </div>
          <div class="hotkey-hint">
            点击输入框后按下快捷键组合，按 Esc/Delete/Backspace 清除
          </div>
        </div>
      </el-tab-pane>

      <!-- 轮盘菜单 -->
      <el-tab-pane label="轮盘菜单" name="radial">
        <RadialMenuSettings ref="radialSettingsRef" :visible="activeTab === 'radial'" @save="onRadialSettingsSave" />
      </el-tab-pane>
    </el-tabs>

    <!-- 密钥管理弹窗 -->
    <el-dialog
      v-model="showSecretManager"
      title="密钥管理"
      width="85%"
      append-to-body
      class="secret-dialog"
      @close="handleSecretDialogClose"
    >
      <!-- 未验证状态：显示密码输入 -->
      <template v-if="!isSecretAuthenticated">
        <div class="auth-container">
          <el-icon class="auth-icon"><Lock /></el-icon>
          <p class="auth-title">{{ hasPin ? '验证身份' : '设置 PIN 码' }}</p>
          <p class="auth-hint">{{ hasPin ? '请输入您的 PIN 码' : '首次使用，请设置一个 PIN 码（用于保护密钥）' }}</p>
          <el-input
            v-model="authPassword"
            type="password"
            :placeholder="hasPin ? '输入 PIN 码' : '设置 PIN 码（至少4位）'"
            size="large"
            show-password
            class="auth-input"
            @keyup.enter="verifyPassword"
          />
          <el-button
            type="primary"
            size="large"
            class="auth-btn"
            :loading="verifying"
            :disabled="authPassword.length < 4"
            @click="verifyPassword"
          >
            {{ hasPin ? '验证' : '设置 PIN' }}
          </el-button>
          <p class="auth-note">验证后 5 分钟内无需重复输入</p>
        </div>
      </template>

      <!-- 已验证状态：显示密钥管理 -->
      <template v-else>
        <div class="auth-status">
          <el-icon class="status-icon"><CircleCheck /></el-icon>
          <span>已验证</span>
          <el-button text size="small" @click="lockSecrets">锁定</el-button>
        </div>
        <div class="secret-form">
          <el-input v-model="secretKey" placeholder="Key" size="small" />
          <el-input v-model="secretValue" type="password" placeholder="Value" size="small" show-password />
          <el-button type="primary" size="small" @click="saveSecret">保存</el-button>
        </div>
        <div class="secret-list">
          <div v-for="k in secretKeys" :key="k" class="secret-item">
            <el-icon><Key /></el-icon>
            <span class="secret-name">{{ k }}</span>
            <el-button text size="small" @click="copySecret(k)">复制</el-button>
            <el-button text size="small" type="danger" @click="deleteSecret(k)">删除</el-button>
          </div>
          <div v-if="secretKeys.length === 0" class="empty-tip">
            暂无保存的密钥
          </div>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Key, Lock, CircleCheck } from '@element-plus/icons-vue';
import { ALL_FEATURES, DEFAULT_SETTINGS } from '@/utils/constants';
import * as envSensing from '@/utils/envSensing';
import RadialMenuSettings from './RadialMenuSettings.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  settings: { type: Object, default: () => ({}) },
  hotkeys: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue', 'settings-change', 'hotkeys-change', 'reset-tools', 'reset-all', 'radial-settings-change']);

const visible = ref(props.modelValue);
const activeTab = ref('basic');
const localSettings = reactive({ ...DEFAULT_SETTINGS, ...props.settings });
const localHotkeys = reactive({ ...props.hotkeys });
const radialSettingsRef = ref(null);

const showSecretManager = ref(false);
const secretKey = ref('');
const secretValue = ref('');
const secretKeys = ref([]);
const startMinimized = ref(true);
const autoStart = ref(false);
const middleClickEnabled = ref(true);
const envSensingEnabled = ref(envSensing.isEnabled());  // 环境感知开关
const hotkeyFocused = ref('');

// 密码验证相关
const isSecretAuthenticated = ref(false);
const authPassword = ref('');
const verifying = ref(false);
const hasPin = ref(false);

// 所有功能列表 (用于快捷键设置)
const allFeatures = ALL_FEATURES;

watch(() => props.modelValue, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:modelValue', val);
  // 打开设置弹窗时刷新轮盘设置中的自定义工具列表
  if (val && radialSettingsRef.value && radialSettingsRef.value.refreshCustomActions) {
    radialSettingsRef.value.refreshCustomActions();
  }
});

watch(() => props.settings, (val) => {
  Object.assign(localSettings, val);
}, { deep: true });

watch(() => props.hotkeys, (val) => {
  Object.assign(localHotkeys, val);
}, { deep: true });

const handleSettingChange = () => {
  emit('settings-change', { ...localSettings });
};

const handleHotkeyChange = () => {
  emit('hotkeys-change', { ...localHotkeys });
};

// 轮盘菜单设置保存
const onRadialSettingsSave = (settings) => {
  emit('radial-settings-change', settings);
};

// 捕获按键转换为热键字符串
const keyToHotkeyString = (e) => {
  e.preventDefault();
  e.stopPropagation();

  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');

  // 忽略单独的修饰键
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
  if (!modifierKeys.includes(e.key)) {
    // 特殊键映射
    const keyMap = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Escape': 'Escape'
    };
    const key = keyMap[e.key] || e.key.toUpperCase();
    parts.push(key);
  }

  return parts.length > 1 ? parts.join('+') : '';
};

const captureGlobalHotkey = (e) => {
  // Esc 键清除热键 (优先检查)
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Hotkey] Clearing global hotkey');
    localSettings.globalHotkey = '';
    handleSettingChange();
    return;
  }

  // Delete/Backspace 键也可清除
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Hotkey] Clearing global hotkey via Delete/Backspace');
    localSettings.globalHotkey = '';
    handleSettingChange();
    return;
  }

  const hotkey = keyToHotkeyString(e);
  if (hotkey) {
    localSettings.globalHotkey = hotkey;
    handleSettingChange();
  }
};

const captureFeatureHotkey = (e, action) => {
  // Esc 键清除热键 (优先检查)
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Hotkey] Clearing hotkey for:', action);
    localHotkeys[action] = '';
    handleHotkeyChange();
    return;
  }

  // Delete/Backspace 键也可清除
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Hotkey] Clearing hotkey via Delete/Backspace for:', action);
    localHotkeys[action] = '';
    handleHotkeyChange();
    return;
  }

  const hotkey = keyToHotkeyString(e);
  if (hotkey) {
    console.log('[Hotkey] Setting hotkey:', action, '->', hotkey);
    localHotkeys[action] = hotkey;
    handleHotkeyChange();
  }
};

const updateStartMinimized = () => {
  if (window.api) {
    window.api.send('config-action', { action: 'set', key: 'startMinimized', value: startMinimized.value });
  }
};

const updateAutoStart = () => {
  if (window.api) {
    window.api.send('set-auto-start', autoStart.value);
  }
};

const updateMiddleClick = () => {
  if (window.api) {
    window.api.send('set-middle-click', middleClickEnabled.value);
  }
};

// 更新环境感知开关
const updateEnvSensing = () => {
  envSensing.setEnabled(envSensingEnabled.value);
};

const handleResetTools = async () => {
  try {
    await ElMessageBox.confirm('确定要重置所有自定义工具吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    emit('reset-tools');
    ElMessage.success('已重置');
  } catch {}
};

const handleResetAll = async () => {
  try {
    await ElMessageBox.confirm('确定要恢复所有默认设置吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    emit('reset-all');
    ElMessage.success('已恢复默认设置');
  } catch {}
};

// 配置导出
const handleExportConfig = () => {
  if (window.api) {
    // 先收集 localStorage 中的配置
    const localStorageConfig = {};
    const keysToExport = [
      'radial-menu-settings',
      'custom-actions',
      'settings',
      'hotkeys',
      'feature-order',
      'hidden-features'
    ];
    keysToExport.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          localStorageConfig[key] = JSON.parse(value);
        } catch {
          localStorageConfig[key] = value;
        }
      }
    });
    // 先保存到主进程配置中，然后导出
    window.api.send('config-action', {
      action: 'set',
      key: 'localStorageBackup',
      value: localStorageConfig
    });
    // 稍等一下让配置保存，然后导出
    setTimeout(() => {
      window.api.send('export-config');
    }, 100);
  }
};

// 配置导入
const handleImportConfig = () => {
  if (window.api) {
    window.api.send('import-config');
  }
};

// 密钥管理
const saveSecret = () => {
  if (!secretKey.value || !secretValue.value) return;
  if (window.api) {
    window.api.send('secret-action', { action: 'set', key: secretKey.value, value: secretValue.value });
    secretKey.value = '';
    secretValue.value = '';
    ElMessage.success('密钥已保存');
  }
};

const copySecret = (k) => {
  if (window.api) {
    window.api.send('secret-action', { action: 'get', key: k });
  }
};

const deleteSecret = (k) => {
  if (window.api) {
    window.api.send('secret-action', { action: 'delete', key: k });
  }
};

// 密码验证
const verifyPassword = async () => {
  if (authPassword.value.length < 4) {
    ElMessage.warning('PIN 码至少需要 4 位');
    return;
  }
  verifying.value = true;
  if (window.api) {
    window.api.send('secret-action', { action: 'verify', password: authPassword.value });
  }
};

const lockSecrets = () => {
  if (window.api) {
    window.api.send('secret-action', { action: 'clear-auth' });
  }
  isSecretAuthenticated.value = false;
  authPassword.value = '';
};

const handleSecretDialogClose = () => {
  authPassword.value = '';
};

const checkAuthStatus = () => {
  if (window.api) {
    window.api.send('secret-action', { action: 'check-auth' });
  }
};

// 打开密钥管理器时检查认证状态
watch(showSecretManager, (val) => {
  if (val) {
    checkAuthStatus();
  }
});

onMounted(() => {
  if (window.api) {
    window.api.on('secret-list', (keys) => {
      secretKeys.value = keys;
    });
    window.api.on('secret-value', ({ value, needAuth }) => {
      if (needAuth) {
        ElMessage.warning('请先验证身份');
        isSecretAuthenticated.value = false;
      } else if (value) {
        window.api?.send('write-clipboard', value);
        ElMessage.success('已复制');
      } else {
        ElMessage.warning('密钥不存在');
      }
    });
    window.api.on('secret-op-result', () => {
      window.api.send('secret-action', { action: 'list' });
    });
    window.api.on('secret-auth-status', ({ authenticated, hasPin: pinSet }) => {
      isSecretAuthenticated.value = authenticated;
      hasPin.value = pinSet;
    });
    window.api.on('secret-verify-result', ({ success, isNewPin }) => {
      verifying.value = false;
      if (success) {
        isSecretAuthenticated.value = true;
        hasPin.value = true;
        authPassword.value = '';
        ElMessage.success(isNewPin ? 'PIN 已设置' : '验证成功');
      } else {
        ElMessage.error('PIN 码错误');
      }
    });
    window.api.on('config-data', (data) => {
      if (data.key === 'startMinimized') {
        startMinimized.value = data.value;
      }
    });
    window.api.on('auto-start-status', ({ enabled }) => {
      autoStart.value = enabled;
    });
    window.api.on('middle-click-status', ({ enabled }) => {
      middleClickEnabled.value = enabled;
    });
    // 配置导出结果
    window.api.on('export-config-result', (result) => {
      if (result.canceled) return;
      if (result.success) {
        ElMessage.success('配置已导出到: ' + result.path);
      } else {
        ElMessage.error('导出失败: ' + (result.error || '未知错误'));
      }
    });
    // 配置导入结果
    window.api.on('import-config-result', (result) => {
      if (result.canceled) return;
      if (result.success) {
        // 恢复 localStorage 数据
        if (result.localStorageBackup) {
          Object.entries(result.localStorageBackup).forEach(([key, value]) => {
            try {
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
              console.log('[Settings] Restored localStorage:', key);
            } catch (e) {
              console.error('[Settings] Failed to restore localStorage:', key, e);
            }
          });
        }
        ElMessage.success('配置导入成功，正在刷新页面...');
        // 刷新页面以应用新配置
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        ElMessage.error('导入失败: ' + (result.error || '未知错误'));
      }
    });
    window.api.send('secret-action', { action: 'list' });
    window.api.send('config-action', { action: 'get', key: 'startMinimized' });
    window.api.send('get-auto-start');
    window.api.send('get-middle-click');
  }
});
</script>

<style scoped>
.settings-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
  border: none;
  border-radius: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line);
  padding: 10px 14px;
  flex-shrink: 0;
}

.settings-dialog :deep(.el-dialog__body) {
  padding: 0;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 8px;
  background: rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.settings-tabs :deep(.el-tabs__nav-wrap) {
  width: 100%;
}

.settings-tabs :deep(.el-tabs__nav-scroll) {
  width: 100%;
}

.settings-tabs :deep(.el-tabs__nav) {
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.settings-tabs :deep(.el-tabs__item) {
  font-size: 12px;
  padding: 0 10px;
  height: 32px;
  flex: none;
}

.settings-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.settings-tabs :deep(.el-tabs__content) {
  padding: 10px;
  flex: 1;
  overflow: hidden;
}

.settings-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
}

.settings-tabs :deep(.el-tab-pane)::-webkit-scrollbar {
  display: none;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.setting-label {
  font-size: 12px;
  color: var(--text-color);
  flex-shrink: 0;
}

.setting-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.setting-hint {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: -8px;
  padding-left: 4px;
}

.setting-row :deep(.el-slider) {
  flex: 1;
  max-width: 100px;
}

.hotkey-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 295px;
  overflow-y: auto;
  padding: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
}

.hotkey-grid::-webkit-scrollbar {
  display: none;
}

.hotkey-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.hotkey-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.hotkey-label {
  font-size: 12px;
  color: var(--text-color);
  flex: 1;
}

.hotkey-active :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--accent-color) inset !important;
  background: rgba(64, 158, 255, 0.1);
}

.hotkey-hint {
  margin-top: 4px;
  font-size: 8px;
  color: var(--text-dim);
  text-align: center;
}

.danger-zone {
  padding: 12px;
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.3);
  border-radius: 4px;
}

.danger-title {
  font-size: 12px;
  color: #f56c6c;
  margin-bottom: 12px;
}

.danger-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.danger-buttons .el-button {
  width: 100%;
  margin: 0;
}

/* 密钥管理 */
.secret-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
}

.secret-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.secret-form .el-input {
  flex: 1;
}

.secret-list {
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
}

.secret-list::-webkit-scrollbar {
  display: none;
}

.secret-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--grid-line);
}

.secret-item:last-child {
  border-bottom: none;
}

.secret-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-color);
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
}

/* 密码验证界面 */
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  text-align: center;
}

.auth-icon {
  font-size: 48px;
  color: var(--accent-color);
  margin-bottom: 16px;
}

.auth-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.auth-hint {
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 20px;
}

.auth-input {
  width: 100%;
  max-width: 280px;
  margin-bottom: 16px;
}

.auth-btn {
  width: 100%;
  max-width: 280px;
}

.auth-note {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 16px;
}

.auth-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.3);
  border-radius: 4px;
  font-size: 13px;
  color: #67c23a;
}

.status-icon {
  font-size: 16px;
}

.auth-status .el-button {
  margin-left: auto;
}
</style>
