<template>
  <div class="feature-content">
    <!-- 文本编辑器类型 -->
    <template v-if="modalData.type === 'text-editor'">
      <div class="toolbar">
        <div class="action-btns">
          <!-- 根据 actionType 显示不同的操作按钮 -->
          <template v-if="modalData.actionType === 'json'">
            <span class="action-btn" @click="jsonFormat">格式化</span>
            <span class="action-btn" @click="jsonMinify">压缩</span>
            <span class="action-btn" @click="jsonValidate">校验</span>
          </template>
          <template v-else-if="modalData.actionType === 'sql'">
            <span class="action-btn" @click="sqlToIn">转IN</span>
            <span class="action-btn" @click="sqlToComma">逗号分隔</span>
          </template>
          <template v-else-if="modalData.actionType === 'timestamp'">
            <span class="action-btn" @click="tsToStd">标准</span>
            <span class="action-btn" @click="tsToDate">日期</span>
            <span class="action-btn" @click="tsToTime">时间</span>
            <span class="action-btn" @click="tsToSec">秒戳</span>
            <span class="action-btn" @click="tsToMs">毫秒戳</span>
          </template>
          <template v-else-if="modalData.actionType === 'naming'">
            <span class="action-btn" @click="toCamel">小驼峰</span>
            <span class="action-btn" @click="toPascal">大驼峰</span>
            <span class="action-btn" @click="toSnake">下划线</span>
            <span class="action-btn" @click="toKebab">横线</span>
            <span class="action-btn" @click="toUpper">大写</span>
          </template>
          <template v-else-if="modalData.actionType === 'yaml'">
            <span class="action-btn" @click="yamlFormat">格式化</span>
            <span class="action-btn" @click="yamlValidate">校验</span>
            <span class="action-btn" @click="yamlToJson">转JSON</span>
          </template>
          <template v-else-if="modalData.actionType === 'uuid'">
            <span class="action-btn" @click="genUUID">标准UUID</span>
            <span class="action-btn" @click="genUUIDNoHyphen">无短横</span>
            <span class="action-btn" @click="toUpperCase">大写</span>
            <span class="action-btn" @click="toLowerCase">小写</span>
            <span class="action-btn" @click="genShortId(8)">8位ID</span>
            <span class="action-btn" @click="genShortId(16)">16位ID</span>
          </template>
          <template v-else-if="modalData.actionType === 'password'">
            <span class="action-btn" @click="genPassword">重新生成</span>
          </template>
          <template v-else-if="modalData.actionType === 'calculator'">
            <span class="action-btn" @click="calculate">计算</span>
            <span class="action-btn" @click="calculateStatistics">统计</span>
            <span class="action-btn" @click="unitConvert">单位换算</span>
            <span class="action-btn" @click="baseConvert">进制转换</span>
          </template>
          <template v-else-if="modalData.actionType === 'encoder'">
            <span class="action-btn" @click="base64Encode">Base64编码</span>
            <span class="action-btn" @click="base64Decode">Base64解码</span>
            <span class="action-btn" @click="urlEncode">URL编码</span>
            <span class="action-btn" @click="urlDecode">URL解码</span>
            <span class="action-btn" @click="unicodeEncode">Unicode编码</span>
            <span class="action-btn" @click="unicodeDecode">Unicode解码</span>
          </template>
          <template v-else-if="modalData.actionType === 'regex'">
            <span class="action-btn" :class="{ active: regexMode === 'test' }" @click="regexMode = 'test'">测试</span>
            <span class="action-btn" :class="{ active: regexMode === 'explain' }" @click="regexMode = 'explain'">解释</span>
            <span class="action-btn" :class="{ active: regexMode === 'help' }" @click="regexMode = 'help'">语法</span>
            <span class="action-btn" :class="{ active: regexMode === 'patterns' }" @click="regexMode = 'patterns'">模板</span>
          </template>
          <template v-else-if="modalData.actionType === 'color'">
            <span class="action-btn picker-btn" @click="openColorPicker">
              <input type="color" ref="colorPickerInput" @input="onColorPicked" class="color-picker-input" />
              调色盘
            </span>
            <span class="action-btn" @click="colorConvert">转换</span>
            <span class="action-btn" @click="colorComplement">互补色</span>
            <span class="action-btn" @click="colorPalette">色板</span>
            <span class="action-btn" @click="colorLighter">变亮</span>
            <span class="action-btn" @click="colorDarker">变暗</span>
          </template>
        </div>
        <span class="action-btn primary" @click="copyResult">复制</span>
      </div>

      <!-- 正则助手特殊视图 -->
      <template v-if="modalData.actionType === 'regex'">
        <!-- 语法帮助 -->
        <div class="regex-help" v-if="regexMode === 'help'">
          <div v-for="(item, idx) in regexSyntaxHelp" :key="idx" class="help-row">
            <code class="help-char">{{ item.char }}</code>
            <span class="help-name">{{ item.name }}</span>
            <span class="help-desc">{{ item.desc }}</span>
          </div>
        </div>

        <!-- 常用模式 -->
        <div class="regex-patterns" v-else-if="regexMode === 'patterns'">
          <div
            v-for="(pattern, key) in regexPatterns"
            :key="key"
            class="pattern-item"
            @click="useRegexPattern(key)"
          >
            <span class="pattern-name">{{ pattern.name }}</span>
            <code class="pattern-code">{{ pattern.pattern.source || pattern.pattern }}</code>
          </div>
        </div>

        <!-- 解释模式 -->
        <div class="regex-explain" v-else-if="regexMode === 'explain'">
          <div class="explain-input">
            <el-input v-model="regexPattern" placeholder="输入正则表达式..." size="small" @input="explainRegex" />
          </div>
          <div class="explain-result" v-if="regexExplanation.length > 0">
            <div v-for="(item, idx) in regexExplanation" :key="idx" class="explain-item">
              <code class="explain-char">{{ item.char }}</code>
              <span class="explain-desc">{{ item.desc }}</span>
            </div>
          </div>
          <div class="explain-empty" v-else>
            输入正则表达式查看解释
          </div>
        </div>

        <!-- 测试模式 -->
        <div class="regex-test" v-else>
          <div class="test-input">
            <el-input v-model="regexPattern" placeholder="正则表达式" size="small" />
            <div class="test-flags">
              <el-checkbox v-model="regexFlags.g" label="g" title="全局匹配" />
              <el-checkbox v-model="regexFlags.i" label="i" title="忽略大小写" />
              <el-checkbox v-model="regexFlags.m" label="m" title="多行模式" />
            </div>
          </div>
          <el-input
            v-model="regexTestText"
            type="textarea"
            :rows="4"
            placeholder="输入测试文本..."
            class="test-text"
          />
          <div class="test-actions">
            <el-button type="primary" size="small" @click="runRegexTest">测试</el-button>
            <el-button size="small" @click="runRegexHighlight">高亮</el-button>
          </div>
          <div class="test-result" v-if="regexTestResult">
            <div class="result-header">匹配结果 ({{ regexTestResult.count }} 个)</div>
            <div class="result-content" v-html="regexTestResult.html"></div>
          </div>
        </div>
      </template>

      <!-- Cron 表达式特殊视图 -->
      <template v-else-if="modalData.actionType === 'cron'">
        <div class="cron-container">
          <!-- Cron 输入 -->
          <div class="cron-input">
            <el-input v-model="cronExpression" placeholder="输入 Cron 表达式，如 0 8 * * *" @input="parseCronExpr" />
          </div>

          <!-- 解析结果 -->
          <div class="cron-result" v-if="cronParsed.valid">
            <div class="cron-desc">{{ cronParsed.desc }}</div>
            <div class="cron-next" v-if="cronNextTimes.length > 0">
              <div class="next-title">接下来 5 次执行：</div>
              <div v-for="(time, idx) in cronNextTimes" :key="idx" class="next-time">
                {{ formatCronTime(time) }}
              </div>
            </div>
          </div>
          <div class="cron-error" v-else-if="cronExpression">
            {{ cronParsed.desc }}
          </div>

          <!-- 常用模板 -->
          <div class="cron-presets">
            <div class="presets-title">常用模板</div>
            <div class="presets-grid">
              <div
                v-for="preset in cronPresets"
                :key="preset.cron"
                class="preset-item"
                @click="useCronPreset(preset)"
              >
                <span class="preset-name">{{ preset.name }}</span>
                <code class="preset-cron">{{ preset.cron }}</code>
              </div>
            </div>
          </div>

          <!-- 字段说明 -->
          <div class="cron-help">
            <div class="help-title">字段说明</div>
            <div class="help-fields">
              <div v-for="field in cronFields" :key="field.name" class="field-item">
                <span class="field-name">{{ field.name }}</span>
                <span class="field-range">{{ field.range }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 颜色选择器增强视图 -->
      <template v-else-if="modalData.actionType === 'color'">
        <div class="color-picker-container">
          <!-- 颜色预览和输入 -->
          <div class="color-preview-row">
            <div class="color-preview-box" :style="{ backgroundColor: colorHex }"></div>
            <div class="color-inputs">
              <div class="input-group">
                <label>HEX</label>
                <el-input v-model="colorHex" size="small" placeholder="#FFFFFF" @input="onHexInput" />
              </div>
              <div class="input-group rgb-inputs">
                <label>RGB</label>
                <el-input-number v-model="colorR" :min="0" :max="255" size="small" controls-position="right" @change="onRgbChange" />
                <el-input-number v-model="colorG" :min="0" :max="255" size="small" controls-position="right" @change="onRgbChange" />
                <el-input-number v-model="colorB" :min="0" :max="255" size="small" controls-position="right" @change="onRgbChange" />
              </div>
            </div>
          </div>

          <!-- 颜色格式输出 -->
          <div class="color-formats">
            <div class="format-item" @click="copyText(colorFormats.hex)">
              <span class="format-label">HEX</span>
              <code class="format-value">{{ colorFormats.hex }}</code>
            </div>
            <div class="format-item" @click="copyText(colorFormats.rgb)">
              <span class="format-label">RGB</span>
              <code class="format-value">{{ colorFormats.rgb }}</code>
            </div>
            <div class="format-item" @click="copyText(colorFormats.hsl)">
              <span class="format-label">HSL</span>
              <code class="format-value">{{ colorFormats.hsl }}</code>
            </div>
          </div>

          <!-- 预设颜色面板 -->
          <div class="color-presets">
            <div class="preset-title">基础颜色</div>
            <div class="preset-grid">
              <div
                v-for="(color, idx) in presetColors"
                :key="idx"
                class="preset-color"
                :style="{ backgroundColor: color }"
                @click="selectPresetColor(color)"
              ></div>
            </div>
          </div>

          <!-- 生成的色板 -->
          <div class="color-palette" v-if="generatedPalette.length > 0">
            <div class="palette-title">色板</div>
            <div class="palette-colors">
              <div
                v-for="(color, idx) in generatedPalette"
                :key="idx"
                class="palette-color"
                :style="{ backgroundColor: color }"
                @click="selectPresetColor(color)"
              >
                <span class="palette-hex">{{ color }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 普通文本编辑器 -->
      <el-input
        v-else
        v-model="textContent"
        type="textarea"
        :rows="10"
        class="code-editor"
        spellcheck="false"
        resize="none"
      />
    </template>

    <!-- 信息提取类型 -->
    <template v-else-if="modalData.type === 'extract'">
      <div class="extract-container">
        <div class="extract-bar">
          <div class="extract-btns">
            <span
              v-for="type in extractTypes"
              :key="type.key"
              class="action-btn"
              :class="{ active: activeExtractType === type.key }"
              @click="doExtract(type.key)"
            >{{ type.label }}</span>
          </div>
          <span v-if="extractResult.length > 0" class="action-btn primary" @click="copyExtractResult">复制全部</span>
        </div>
        <el-input
            v-model="extractInput"
            type="textarea"
            :rows="10"
            placeholder="输入或粘贴要提取的文本..."
            class="extract-input"
        />
        <div class="extract-result" v-if="extractResult.length > 0">
          <div
            v-for="(item, idx) in extractResult"
            :key="idx"
            class="result-item"
            @click="copyText(item)"
          >{{ item }}</div>
        </div>
        <div v-else-if="activeExtractType" class="extract-empty">
          未找到匹配项
        </div>
      </div>
    </template>

    <!-- 倒计时类型 -->
    <template v-else-if="modalData.type === 'timer'">
      <div class="timer-container">
        <div class="timer-presets">
          <div
            v-for="preset in timerPresets"
            :key="preset.minutes"
            class="timer-preset"
            @click="startTimer(preset.minutes)"
          >
            <span class="preset-time">{{ preset.minutes }}</span>
            <span class="preset-unit">分钟</span>
          </div>
        </div>
        <div class="timer-custom-row">
          <div class="timer-preset custom" @click="showCustomTimer = true">
            <el-icon><Plus /></el-icon>
            <span>自定义时间</span>
          </div>
        </div>

        <div v-if="showCustomTimer" class="custom-timer">
          <el-input-number v-model="customMinutes" :min="1" :max="999" size="small" />
          <span class="custom-unit">分钟</span>
          <el-button type="primary" size="small" @click="startTimer(customMinutes)">开始</el-button>
        </div>

        <div class="active-timers" v-if="activeTimers.length > 0">
          <div class="timers-header">进行中的倒计时</div>
          <div v-for="timer in activeTimers" :key="timer.id" class="timer-item">
            <div class="timer-info">
              <span class="timer-remaining">{{ formatRemaining(timer) }}</span>
              <span class="timer-end">{{ formatEndTime(timer) }} 结束</span>
            </div>
            <el-button text size="small" type="danger" @click="cancelTimer(timer.id)">取消</el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 二维码显示类型 -->
    <template v-else-if="modalData.type === 'qrcode'">
      <div class="qrcode-container">
        <canvas ref="qrcodeCanvas"></canvas>
        <p class="qrcode-text">{{ modalData.text?.slice(0, 100) }}{{ modalData.text?.length > 100 ? '...' : '' }}</p>
        <el-button type="primary" size="small" @click="downloadQRCode">
          <el-icon><Download /></el-icon>
          下载二维码
        </el-button>
      </div>
    </template>

    <!-- 闪念胶囊类型 -->
    <template v-else-if="modalData.type === 'memo'">
      <div class="memo-container">
        <el-input
          v-model="memoText"
          type="textarea"
          :rows="3"
          placeholder="快速记录你的想法..."
          autofocus
        />
        <div class="memo-list" v-if="memoList.length > 0">
          <div class="memo-list-header">
            <span>备忘录 ({{ memoList.length }})</span>
            <el-button text size="small" @click="clearMemos">清空</el-button>
          </div>
          <div v-for="(memo, idx) in memoList" :key="idx" class="memo-item">
            <span class="memo-content">{{ memo.text }}</span>
            <span class="memo-time">{{ formatTime(memo.time) }}</span>
            <el-icon class="memo-delete" @click="deleteMemo(idx)"><Delete /></el-icon>
          </div>
        </div>
        <el-button type="primary" class="confirm-btn" @click="saveMemo" :disabled="!memoText.trim()">
          保存备忘
        </el-button>
      </div>
    </template>

    <!-- Markdown预览类型 -->
    <template v-else-if="modalData.type === 'markdown'">
      <div
        class="markdown-container"
        @dragover.prevent="onMdDragOver"
        @dragleave="onMdDragLeave"
        @drop.prevent="onMdDrop"
        :class="{ 'drag-over': mdDragOver }"
      >
        <div class="md-toolbar">
          <div class="md-tabs">
            <span class="md-tab" :class="{ active: mdViewMode === 'preview' }" @click="mdViewMode = 'preview'">预览</span>
            <span class="md-tab" :class="{ active: mdViewMode === 'split' }" @click="mdViewMode = 'split'">分栏</span>
            <span class="md-tab" :class="{ active: mdViewMode === 'source' }" @click="mdViewMode = 'source'">源码</span>
            <span class="md-tab" :class="{ active: mdViewMode === 'help' }" @click="mdViewMode = 'help'">语法</span>
          </div>
          <div class="md-stats" v-if="mdStats.chars > 0">
            <span>{{ mdStats.chars }} 字符</span>
            <span>{{ mdStats.words }} 词</span>
            <span>{{ mdStats.lines }} 行</span>
          </div>
          <div class="md-actions">
            <span class="action-btn" @click="copyMarkdownHtml">复制HTML</span>
            <span class="action-btn primary" @click="copyMarkdownSource">复制源码</span>
          </div>
        </div>

        <!-- 快速插入工具栏 -->
        <div class="md-quick-insert" v-if="mdViewMode !== 'preview' && mdViewMode !== 'help'">
          <span
            v-for="(tpl, key) in mdTemplates"
            :key="key"
            class="quick-btn"
            @click="insertMdTemplate(key)"
            :title="tpl.label"
          >{{ tpl.label }}</span>
        </div>

        <!-- 拖拽提示 -->
        <div class="md-drop-hint" v-if="mdDragOver">
          <el-icon><Upload /></el-icon>
          <span>拖放 .md 文件到这里</span>
        </div>

        <!-- 目录导航 -->
        <div class="md-toc" v-if="mdToc.length > 0 && mdViewMode === 'preview'">
          <div class="toc-title">目录</div>
          <div
            v-for="(item, idx) in mdToc"
            :key="idx"
            class="toc-item"
            :style="{ paddingLeft: (item.level - 1) * 12 + 'px' }"
          >{{ item.text }}</div>
        </div>

        <!-- 语法帮助 -->
        <div class="md-help" v-if="mdViewMode === 'help'">
          <div v-for="(item, idx) in mdSyntaxHelp" :key="idx" class="help-item">
            <div class="help-name">{{ item.name }}</div>
            <div class="help-desc">{{ item.desc }}</div>
            <pre class="help-syntax">{{ item.syntax }}</pre>
          </div>
        </div>

        <!-- 预览/编辑区域 -->
        <div class="md-content" :class="mdViewMode" v-if="mdViewMode !== 'help'">
          <div class="md-editor" v-if="mdViewMode !== 'preview'">
            <el-input
              ref="mdEditorRef"
              v-model="mdSource"
              type="textarea"
              :rows="12"
              placeholder="输入 Markdown 文本，或拖放 .md 文件..."
              class="md-source"
              @input="updateMarkdownPreview"
            />
          </div>
          <div
            class="md-preview markdown-body"
            v-if="mdViewMode !== 'source'"
            v-html="mdHtml"
          ></div>
        </div>
      </div>
    </template>

    <!-- OCR 文字识别类型 -->
    <template v-else-if="modalData.type === 'ocr'">
      <div class="ocr-container">
        <!-- 图片输入区 -->
        <div class="ocr-input">
          <div
            class="ocr-dropzone"
            :class="{ 'has-image': ocrImage }"
            @click="selectOcrImage"
            @dragover.prevent
            @drop.prevent="handleOcrDrop"
          >
            <template v-if="!ocrImage">
              <el-icon class="drop-icon"><Upload /></el-icon>
              <p>点击选择图片或拖拽图片到此处</p>
              <p class="drop-hint">支持 PNG、JPG、BMP 格式</p>
            </template>
            <img v-else :src="ocrImage" class="preview-image" />
          </div>
          <input
            ref="ocrFileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleOcrFileSelect"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="ocr-actions">
          <el-button @click="pasteOcrImage" size="small" class="ocr-btn">
            <el-icon><DocumentCopy /></el-icon>
            从剪贴板粘贴
          </el-button>
          <el-button
            type="primary"
            @click="startOcr"
            :loading="ocrStatus === 'recognizing'"
            :disabled="!ocrImage"
            size="small"
            class="ocr-btn"
          >
            <el-icon v-if="ocrStatus !== 'recognizing'"><Search /></el-icon>
            {{ ocrStatus === 'recognizing' ? `识别中 ${ocrProgress}%` : '开始识别' }}
          </el-button>
        </div>

        <!-- 进度条 -->
        <el-progress
          v-if="ocrStatus === 'recognizing'"
          :percentage="ocrProgress"
          :stroke-width="6"
          class="ocr-progress"
        />

        <!-- 识别结果 -->
        <div class="ocr-result" v-if="ocrResult || ocrError">
          <div class="result-header">
            <span>识别结果</span>
            <div class="result-actions" v-if="ocrResult">
              <span class="action-btn" @click="copyOcrResult">复制</span>
              <span class="action-btn" @click="clearOcr">清空</span>
            </div>
          </div>
          <el-input
            v-if="ocrResult"
            v-model="ocrResult"
            type="textarea"
            :rows="6"
            class="result-text"
          />
          <div v-if="ocrError" class="ocr-error">
            <el-icon><Warning /></el-icon>
            {{ ocrError }}
          </div>
        </div>
      </div>
    </template>

    <!-- AI 智能助手类型 (对话式界面) -->
    <template v-else-if="modalData.type === 'ai'">
      <div class="ai-chat-container">
        <!-- 未配置提示 -->
        <div v-if="!aiConfigured" class="ai-not-configured">
          <el-icon class="warn-icon"><Warning /></el-icon>
          <p>请先配置 API Key</p>
          <el-button type="primary" size="small" @click="showAiConfig = true">配置 AI</el-button>
        </div>

        <!-- 主界面 -->
        <template v-else>
          <!-- 头部操作栏 -->
          <div class="ai-chat-header">
            <div class="ai-quick-actions">
              <span
                v-for="(template, key) in aiTemplates"
                :key="key"
                class="ai-action-btn"
                :class="{ active: aiSelectedTemplate === key }"
                @click="selectAiTemplate(key)"
              >{{ template.name }}</span>
            </div>
            <div class="ai-header-btns">
              <el-tooltip content="清空对话" placement="bottom">
                <el-icon class="header-icon" @click="clearAiChat"><Delete /></el-icon>
              </el-tooltip>
              <el-tooltip content="设置" placement="bottom">
                <el-icon class="header-icon" @click="showAiConfig = true"><Setting /></el-icon>
              </el-tooltip>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="ai-messages" ref="aiMessagesRef">
            <div v-if="aiMessages.length === 0" class="ai-empty-hint">
              <p>输入问题开始对话</p>
            </div>
            <div
              v-for="(msg, idx) in aiMessages"
              :key="idx"
              class="ai-message"
              :class="msg.role"
            >
              <div class="ai-msg-content">
                <div v-if="msg.role === 'user'" class="ai-msg-text">{{ msg.content }}</div>
                <div v-else class="ai-msg-text" v-html="formatAiResponse(msg.content)"></div>
              </div>
              <div class="ai-msg-actions" v-if="msg.role === 'assistant'">
                <span @click="copyText(msg.content)">复制</span>
              </div>
            </div>
            <!-- 加载中状态 -->
            <div v-if="aiLoading" class="ai-message assistant loading">
              <div class="ai-msg-content">
                <div class="ai-msg-text typing">{{ aiStreamContent || '思考中...' }}</div>
              </div>
            </div>
          </div>

          <!-- 输入区 -->
          <div class="ai-chat-input">
            <el-input
              v-model="aiInput"
              type="textarea"
              :rows="2"
              :autosize="{ minRows: 1, maxRows: 3 }"
              placeholder="输入消息，Enter发送"
              @keydown.enter.exact.prevent="sendAiMessage"
              :disabled="aiLoading"
            />
            <el-button
              type="primary"
              circle
              @click="sendAiMessage"
              :loading="aiLoading"
              :disabled="!aiInput.trim() || aiLoading"
              class="send-btn"
            >
              <el-icon v-if="!aiLoading"><Message /></el-icon>
            </el-button>
          </div>
        </template>

        <!-- 配置弹窗 -->
        <el-dialog
          v-model="showAiConfig"
          title="AI 配置"
          width="380px"
          append-to-body
          class="ai-config-dialog"
        >
          <el-form label-width="80px" size="small">
            <el-form-item label="服务商">
              <el-select v-model="aiConfig.provider" @change="onProviderChange" style="width: 100%;">
                <el-option label="OpenAI" value="openai" />
                <el-option label="Claude" value="claude" />
                <el-option label="自定义" value="custom" />
              </el-select>
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="aiConfig.apiKey" type="password" show-password placeholder="输入 API Key" />
            </el-form-item>
            <el-form-item label="模型" v-if="aiConfig.provider !== 'custom'">
              <el-select v-model="aiConfig.model" style="width: 100%;">
                <el-option
                  v-for="model in availableModels"
                  :key="model"
                  :label="model"
                  :value="model"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="模型名称" v-if="aiConfig.provider === 'custom'">
              <el-input v-model="aiConfig.model" placeholder="如 gpt-4, claude-3-opus 等" />
            </el-form-item>
            <el-form-item label="Endpoint" v-if="aiConfig.provider === 'custom'">
              <el-input v-model="aiConfig.endpoint" placeholder="自定义 API 地址" />
            </el-form-item>
            <el-form-item label="上下文">
              <el-input-number v-model="aiConfig.maxTokens" :min="100" :max="128000" :step="100" style="width: 100%;" />
              <div class="form-hint">最大 Token 数量</div>
            </el-form-item>
            <el-form-item label="随机性">
              <el-slider v-model="aiConfig.temperature" :min="0" :max="2" :step="0.1" :show-tooltip="true" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showAiConfig = false">取消</el-button>
            <el-button type="primary" @click="saveAiConfig">保存</el-button>
          </template>
        </el-dialog>
      </div>
    </template>

    <!-- 剪贴板历史类型 -->
    <template v-else-if="modalData.type === 'clipboard-history'">
      <ClipboardHistory ref="clipboardHistoryRef" />
    </template>

    <!-- 设置类型 -->
    <template v-else-if="modalData.type === 'settings'">
      <div class="settings-panel">
        <el-tabs v-model="settingsTab" class="settings-tabs">
          <el-tab-pane label="外观" name="appearance">
            <div class="setting-group">
              <div class="setting-item">
                <span class="setting-label">主题</span>
                <el-select v-model="localSettings.theme" size="small" @change="saveLocalSettings">
                  <el-option value="dark" label="深色" />
                  <el-option value="light" label="浅色" />
                </el-select>
              </div>
              <div class="setting-item">
                <span class="setting-label">透明度</span>
                <el-slider v-model="localSettings.opacity" :min="0.5" :max="1" :step="0.05" size="small" @change="saveLocalSettings" />
              </div>
              <div class="setting-item">
                <span class="setting-label">智能区行数</span>
                <el-input-number v-model="localSettings.smartRows" :min="1" :max="5" size="small" @change="saveLocalSettings" />
              </div>
              <div class="setting-item">
                <span class="setting-label">工具区行数</span>
                <el-input-number v-model="localSettings.customRows" :min="1" :max="5" size="small" @change="saveLocalSettings" />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="快捷键" name="hotkeys">
            <div class="setting-group">
              <div class="setting-item">
                <span class="setting-label">全局唤醒</span>
                <el-input v-model="localSettings.globalHotkey" size="small" placeholder="点击按键" readonly @keydown="captureHotkey" style="width: 100px;" />
              </div>
              <div class="setting-item">
                <span class="setting-label">中键唤醒</span>
                <el-switch v-model="localSettings.middleClickEnabled" @change="saveLocalSettings" />
              </div>
              <div class="setting-item">
                <span class="setting-label">窗口跟随鼠标</span>
                <el-switch v-model="localSettings.followMouse" @change="saveLocalSettings" />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="轮盘" name="radial">
            <div class="setting-group">
              <div class="setting-item">
                <span class="setting-label">启用轮盘</span>
                <el-switch v-model="radialSettings.enabled" @change="saveRadialSettings" />
              </div>
              <div class="setting-item">
                <span class="setting-label">触发方式</span>
                <el-select v-model="radialSettings.triggerMode" size="small" @change="saveRadialSettings">
                  <el-option value="rightLongPress" label="右键长按" />
                  <el-option value="hotkey" label="快捷键" />
                </el-select>
              </div>
              <div class="setting-item" v-if="radialSettings.triggerMode === 'rightLongPress'">
                <span class="setting-label">长按时间</span>
                <el-input-number v-model="radialSettings.longPressDelay" :min="200" :max="1000" :step="50" size="small" @change="saveRadialSettings" />
                <span class="setting-unit">ms</span>
              </div>
              <div class="setting-item">
                <span class="setting-label">主题风格</span>
                <el-select v-model="radialSettings.theme" size="small" @change="saveRadialSettings">
                  <el-option value="dark" label="深色" />
                  <el-option value="light" label="浅色" />
                  <el-option value="blue" label="蓝色" />
                  <el-option value="purple" label="紫色" />
                </el-select>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="其他" name="other">
            <div class="setting-group">
              <div class="setting-item">
                <span class="setting-label">开机自启</span>
                <el-switch v-model="localSettings.autoStart" @change="handleAutoStartChange" />
              </div>
              <div class="setting-item">
                <el-button size="small" @click="resetAllSettings" type="danger" plain>重置所有设置</el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download, Delete, Plus, Monitor, Message, Iphone, Link, Upload, DocumentCopy, Warning, Setting, Search, Star } from '@element-plus/icons-vue';
import QRCode from 'qrcode';
import * as markdownUtil from '../utils/markdown';
import * as ocrUtil from '../utils/ocr';
import * as aiUtil from '../utils/ai';
import * as calculator from '../utils/calculator';
import * as encoder from '../utils/encoder';
import * as regexHelper from '../utils/regex';
import * as colorConverter from '../utils/colorConverter';
import * as cronUtil from '../utils/cron';
import textProcessor from '../utils/textProcessor';
import ClipboardHistory from './ClipboardHistory.vue';

const props = defineProps({
  modalData: { type: Object, default: () => ({ title: '', type: 'text-editor' }) },
  initialText: { type: String, default: '' }
});

const emit = defineEmits(['close']);

const textContent = ref(props.initialText);
const qrcodeCanvas = ref(null);
const clipboardHistoryRef = ref(null);
const colorPickerInput = ref(null);

// 设置相关
const settingsTab = ref('appearance');
const localSettings = reactive({
  theme: 'dark',
  opacity: 0.95,
  smartRows: 2,
  customRows: 2,
  globalHotkey: 'Alt+Space',
  middleClickEnabled: true,
  followMouse: true,
  autoStart: false
});
const radialSettings = reactive({
  enabled: true,
  triggerMode: 'rightLongPress',
  longPressDelay: 400,
  theme: 'dark'
});

// 加载设置
const loadLocalSettings = () => {
  try {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(localSettings, parsed);
    }
  } catch (e) {}

  try {
    const radialSaved = localStorage.getItem('radial-menu-settings');
    if (radialSaved) {
      const parsed = JSON.parse(radialSaved);
      Object.assign(radialSettings, {
        enabled: parsed.enabled ?? true,
        triggerMode: parsed.triggerMode ?? 'rightLongPress',
        longPressDelay: parsed.longPressDelay ?? 400,
        theme: parsed.theme ?? 'dark'
      });
    }
  } catch (e) {}
};

// 保存设置
const saveLocalSettings = () => {
  localStorage.setItem('app-settings', JSON.stringify(localSettings));
  if (window.api) {
    window.api.send('update-global-hotkey', localSettings.globalHotkey);
    window.api.send('set-middle-click', localSettings.middleClickEnabled);
  }
  ElMessage.success('设置已保存');
};

const saveRadialSettings = () => {
  const radialSaved = localStorage.getItem('radial-menu-settings');
  let fullSettings = {};
  try {
    fullSettings = radialSaved ? JSON.parse(radialSaved) : {};
  } catch (e) {}

  Object.assign(fullSettings, radialSettings);
  localStorage.setItem('radial-menu-settings', JSON.stringify(fullSettings));

  if (window.api) {
    window.api.send('update-radial-menu-settings', fullSettings);
  }
  ElMessage.success('轮盘设置已保存');
};

const captureHotkey = (e) => {
  e.preventDefault();
  const keys = [];
  if (e.ctrlKey) keys.push('Ctrl');
  if (e.altKey) keys.push('Alt');
  if (e.shiftKey) keys.push('Shift');
  if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
    keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
  }
  if (keys.length > 1) {
    localSettings.globalHotkey = keys.join('+');
    saveLocalSettings();
  }
};

const handleAutoStartChange = () => {
  window.api?.send('set-auto-start', localSettings.autoStart);
  saveLocalSettings();
};

const resetAllSettings = async () => {
  try {
    await ElMessageBox.confirm('确定重置所有设置？', '警告', { type: 'warning' });
    localStorage.clear();
    ElMessage.success('设置已重置，请重启应用');
  } catch {}
};

// 信息提取
const extractInput = ref('');
const extractResult = ref([]);
const activeExtractType = ref('');
const extractTypes = [
  { key: 'ip', label: 'IP地址', icon: Monitor },
  { key: 'email', label: '邮箱', icon: Message },
  { key: 'phone', label: '手机号', icon: Iphone },
  { key: 'url', label: '链接', icon: Link }
];

// 倒计时
const timerPresets = [
  { minutes: 5 },
  { minutes: 15 },
  { minutes: 25 },
  { minutes: 60 }
];
const showCustomTimer = ref(false);
const customMinutes = ref(10);
const activeTimers = ref(JSON.parse(localStorage.getItem('active-timers') || '[]'));
let timerInterval = null;

// 闪念胶囊
const memoText = ref('');
const memoList = ref(JSON.parse(localStorage.getItem('quick-memos') || '[]'));

// Markdown预览
const mdViewMode = ref('preview'); // preview | split | source | help
const mdSource = ref('');
const mdHtml = ref('');
const mdDragOver = ref(false);
const mdStats = ref({ chars: 0, words: 0, lines: 0 });
const mdToc = ref([]);
const mdSyntaxHelp = markdownUtil.MD_SYNTAX_HELP;
const mdTemplates = markdownUtil.MD_TEMPLATES;
const mdEditorRef = ref(null);

// 正则助手
const regexMode = ref('test'); // test | explain | help | patterns
const regexPattern = ref('');
const regexTestText = ref('');
const regexFlags = reactive({ g: true, i: false, m: false });
const regexTestResult = ref(null);
const regexExplanation = ref([]);
const regexSyntaxHelp = regexHelper.REGEX_SYNTAX_HELP;
const regexPatterns = regexHelper.REGEX_PATTERNS;

// Cron 表达式
const cronExpression = ref('');
const cronParsed = ref({ valid: false, desc: '' });
const cronNextTimes = ref([]);
const cronPresets = cronUtil.CRON_PRESETS;
const cronFields = cronUtil.CRON_FIELDS;

// 颜色选择器增强
const colorHex = ref('#FF5733');
const colorR = ref(255);
const colorG = ref(87);
const colorB = ref(51);
const presetColors = colorConverter.PRESET_COLORS;
const generatedPalette = ref([]);
const colorFormats = computed(() => {
  const result = colorConverter.convertColor(colorHex.value);
  if (result.success) {
    return { hex: result.hex, rgb: result.rgb, hsl: result.hsl };
  }
  return { hex: colorHex.value, rgb: '', hsl: '' };
});

// OCR 识别
const ocrFileInput = ref(null);
const ocrImage = ref('');
const ocrStatus = ref('idle'); // idle | recognizing | done | error
const ocrProgress = ref(0);
const ocrResult = ref('');
const ocrError = ref('');

// AI 助手 (对话式)
const showAiConfig = ref(false);
const aiConfigured = ref(aiUtil.isConfigured());  // 立即初始化配置状态
const aiTemplates = ref(aiUtil.PROMPT_TEMPLATES);  // 直接使用模板
const aiSelectedTemplate = ref('ask');
const aiInput = ref('');
const aiLoading = ref(false);
const aiMessages = ref([]);  // 对话历史
const aiStreamContent = ref('');  // 流式输出内容
const aiMessagesRef = ref(null);  // 消息列表DOM引用
const aiConfig = reactive(aiUtil.getConfig());
const availableModels = ref([]);

// AI 对话历史存储键
const AI_HISTORY_KEY = 'ai-chat-history';
const AI_HISTORY_EXPIRE_MS = 24 * 60 * 60 * 1000; // 1天

// AI 模型列表更新函数（需要在 initContent 之前定义）
const updateAvailableModels = () => {
  const provider = aiUtil.AI_PROVIDERS[aiConfig.provider];
  availableModels.value = provider?.models || [];
  if (availableModels.value.length > 0 && !availableModels.value.includes(aiConfig.model)) {
    aiConfig.model = availableModels.value[0];
  }
};

// 倒计时辅助函数（需要在 initContent 之前定义）
const saveTimers = () => {
  localStorage.setItem('active-timers', JSON.stringify(activeTimers.value));
};

const refreshTimers = () => {
  // 移除已过期的计时器
  const now = Date.now();
  activeTimers.value = activeTimers.value.filter(t => t.endTime > now);
  saveTimers();
};

// AI 历史记录管理函数（需要在 initContent 之前定义）
const scrollToAiBottom = () => {
  nextTick(() => {
    if (aiMessagesRef.value) {
      aiMessagesRef.value.scrollTop = aiMessagesRef.value.scrollHeight;
    }
  });
};

const loadAiHistory = () => {
  try {
    const stored = localStorage.getItem(AI_HISTORY_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // 检查是否过期
      if (data.timestamp && (Date.now() - data.timestamp) < AI_HISTORY_EXPIRE_MS) {
        aiMessages.value = data.messages || [];
        // 滚动到底部
        nextTick(() => scrollToAiBottom());
      } else {
        // 已过期，清除
        localStorage.removeItem(AI_HISTORY_KEY);
        aiMessages.value = [];
      }
    }
  } catch (e) {
    console.error('[AI] Failed to load history:', e);
    aiMessages.value = [];
  }
};

const saveAiHistory = () => {
  try {
    const data = {
      timestamp: Date.now(),
      messages: aiMessages.value
    };
    localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[AI] Failed to save history:', e);
  }
};

// 初始化逻辑
const initContent = () => {
  if (props.modalData.type === 'extract') {
    extractInput.value = props.modalData.text || '';
    extractResult.value = [];
    activeExtractType.value = '';
  }
  if (props.modalData.type === 'timer') {
    refreshTimers();
  }
  // 二维码显示
  if (props.modalData.type === 'qrcode' && props.modalData.text) {
    setTimeout(() => generateQRCode(props.modalData.text), 100);
  }
  // Markdown预览初始化
  if (props.modalData.type === 'markdown') {
    mdSource.value = props.modalData.markdown?.source || '';
    mdHtml.value = props.modalData.markdown?.html || '';
    mdViewMode.value = 'preview';
  }
  // OCR初始化
  if (props.modalData.type === 'ocr') {
    ocrImage.value = '';
    ocrStatus.value = 'idle';
    ocrProgress.value = 0;
    ocrResult.value = '';
    ocrError.value = '';
  }
  // AI初始化
  if (props.modalData.type === 'ai') {
    aiInput.value = props.modalData.ai?.inputText || '';
    aiTemplates.value = props.modalData.ai?.templates || aiUtil.PROMPT_TEMPLATES;
    aiConfigured.value = aiUtil.isConfigured();
    aiSelectedTemplate.value = 'ask';
    aiStreamContent.value = '';
    updateAvailableModels();
    // 加载对话历史（如果未过期）
    loadAiHistory();
  }
  // 设置初始化
  if (props.modalData.type === 'settings') {
    loadLocalSettings();
  }
};

watch(() => props.modalData, () => {
  initContent();
  if (props.modalData.type === 'qrcode' && props.modalData.text) {
    nextTick(() => generateQRCode(props.modalData.text));
  }
}, { immediate: true, deep: true });

watch(() => props.initialText, (val) => {
  textContent.value = val;
});

// 信息提取功能
const doExtract = (type) => {
  activeExtractType.value = type;
  const text = extractInput.value;
  let result = [];

  if (type === 'ip') {
    // 改进的IP正则，排除邮箱中的数字
    const ipRegex = /(?<![.\w])(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?![.\w@])/g;
    result = [...new Set(text.match(ipRegex) || [])];
  } else if (type === 'email') {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    result = [...new Set(text.match(emailRegex) || [])];
  } else if (type === 'phone') {
    const phoneRegex = /1[3-9]\d{9}/g;
    result = [...new Set(text.match(phoneRegex) || [])];
  } else if (type === 'url') {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    result = [...new Set(text.match(urlRegex) || [])];
  }

  extractResult.value = result;
};

const copyExtractResult = () => {
  window.api?.send('write-clipboard', extractResult.value.join('\n'));
  ElMessage.success('已复制全部结果');
};

// 倒计时功能
const startTimer = (minutes) => {
  const timer = {
    id: Date.now(),
    minutes,
    endTime: Date.now() + minutes * 60 * 1000
  };
  activeTimers.value.push(timer);
  saveTimers();

  // 通知主进程设置定时器（主进程管理，关闭窗口也能触发）
  window.api?.send('start-timer', {
    id: timer.id,
    minutes,
    endTime: timer.endTime
  });

  ElMessage.success(`已设置 ${minutes} 分钟倒计时`);
  showCustomTimer.value = false;
};

const cancelTimer = (id) => {
  activeTimers.value = activeTimers.value.filter(t => t.id !== id);
  saveTimers();
  // 通知主进程取消定时器
  window.api?.send('cancel-timer', { id });
};

const formatRemaining = (timer) => {
  const remaining = Math.max(0, timer.endTime - Date.now());
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatEndTime = (timer) => {
  const d = new Date(timer.endTime);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 复制功能
const copyResult = () => {
  window.api?.send('write-clipboard', textContent.value);
  ElMessage.success('已复制到剪贴板');
};

const copyText = (text) => {
  window.api?.send('write-clipboard', text);
  ElMessage.success('已复制: ' + text.slice(0, 20) + (text.length > 20 ? '...' : ''));
};

// 二维码
const generateQRCode = async (text) => {
  if (!qrcodeCanvas.value || !text) return;
  try {
    await QRCode.toCanvas(qrcodeCanvas.value, text, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (err) {
    console.error('QRCode generation failed:', err);
  }
};

const downloadQRCode = () => {
  if (!qrcodeCanvas.value) return;
  const link = document.createElement('a');
  link.download = 'qrcode.png';
  link.href = qrcodeCanvas.value.toDataURL();
  link.click();
};

// 闪念胶囊
const saveMemo = () => {
  if (!memoText.value.trim()) return;
  memoList.value.unshift({ text: memoText.value.trim(), time: Date.now() });
  localStorage.setItem('quick-memos', JSON.stringify(memoList.value));
  memoText.value = '';
  ElMessage.success('备忘已保存');
};

const deleteMemo = (index) => {
  memoList.value.splice(index, 1);
  localStorage.setItem('quick-memos', JSON.stringify(memoList.value));
};

const clearMemos = () => {
  memoList.value = [];
  localStorage.setItem('quick-memos', '[]');
};

const formatTime = (ts) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Markdown 预览功能
const updateMarkdownPreview = () => {
  if (mdSource.value) {
    mdHtml.value = markdownUtil.render(mdSource.value);
    mdStats.value = markdownUtil.countWords(mdSource.value);
    mdToc.value = markdownUtil.extractToc(mdSource.value);
  } else {
    mdHtml.value = '';
    mdStats.value = { chars: 0, words: 0, lines: 0 };
    mdToc.value = [];
  }
};

// Markdown 拖拽功能
const onMdDragOver = () => {
  mdDragOver.value = true;
};

const onMdDragLeave = () => {
  mdDragOver.value = false;
};

const onMdDrop = (e) => {
  mdDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type === 'text/markdown')) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      mdSource.value = ev.target.result;
      updateMarkdownPreview();
      mdViewMode.value = 'split';
      ElMessage.success(`已加载: ${file.name}`);
    };
    reader.readAsText(file);
  } else {
    ElMessage.warning('请拖放 .md 文件');
  }
};

// Markdown 快速插入
const insertMdTemplate = (key) => {
  const template = mdTemplates[key];
  if (!template) return;

  // 在当前光标位置插入
  const textarea = mdEditorRef.value?.$el?.querySelector('textarea');
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = mdSource.value.substring(0, start);
    const after = mdSource.value.substring(end);
    mdSource.value = before + template.insert + after;
    updateMarkdownPreview();

    // 设置光标位置
    nextTick(() => {
      textarea.focus();
      textarea.setSelectionRange(start + template.cursor, start + template.cursor);
    });
  } else {
    mdSource.value += template.insert;
    updateMarkdownPreview();
  }
};

const copyMarkdownHtml = () => {
  window.api?.send('write-clipboard', mdHtml.value);
  ElMessage.success('已复制 HTML');
};

const copyMarkdownSource = () => {
  window.api?.send('write-clipboard', mdSource.value);
  ElMessage.success('已复制源码');
};

// OCR 识别功能
const selectOcrImage = () => {
  ocrFileInput.value?.click();
};

const handleOcrFileSelect = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    loadImageFile(file);
  }
};

const handleOcrDrop = (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    loadImageFile(file);
  }
};

const loadImageFile = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    ocrImage.value = e.target.result;
    ocrResult.value = '';
    ocrError.value = '';
    ocrStatus.value = 'idle';
  };
  reader.readAsDataURL(file);
};

const pasteOcrImage = async () => {
  // 通过 IPC 从主进程读取剪贴板图片（Electron 中 navigator.clipboard.read() 不可用）
  if (window.api) {
    window.api.send('read-clipboard-image');
  } else {
    ElMessage.error('无法访问剪贴板');
  }
};

const startOcr = async () => {
  if (!ocrImage.value) return;

  ocrStatus.value = 'recognizing';
  ocrProgress.value = 0;
  ocrResult.value = '';
  ocrError.value = '';

  const result = await ocrUtil.recognize(ocrImage.value, {}, (progress) => {
    ocrProgress.value = progress;
  });

  if (result.success) {
    ocrStatus.value = 'done';
    ocrResult.value = result.text;
    ElMessage.success(`识别完成，置信度 ${result.confidence.toFixed(1)}%`);
  } else {
    ocrStatus.value = 'error';
    ocrError.value = result.error;
  }
};

const copyOcrResult = () => {
  window.api?.send('write-clipboard', ocrResult.value);
  ElMessage.success('已复制识别结果');
};

const clearOcr = () => {
  ocrImage.value = '';
  ocrResult.value = '';
  ocrError.value = '';
  ocrStatus.value = 'idle';
  ocrProgress.value = 0;
};

// AI 助手功能
const onProviderChange = () => {
  updateAvailableModels();
};

const saveAiConfig = () => {
  aiUtil.saveConfig(aiConfig);
  aiConfigured.value = aiUtil.isConfigured();
  showAiConfig.value = false;
  ElMessage.success('配置已保存');
};

const selectAiTemplate = (key) => {
  aiSelectedTemplate.value = key;
};

// 发送AI消息（对话式）
const sendAiMessage = async () => {
  const text = aiInput.value.trim();
  if (!text || aiLoading.value) return;

  // 添加用户消息
  aiMessages.value.push({ role: 'user', content: text });
  aiInput.value = '';
  aiLoading.value = true;
  aiStreamContent.value = '';
  scrollToAiBottom();

  try {
    // 根据选中的模板处理
    let prompt = text;
    if (aiSelectedTemplate.value !== 'ask') {
      const template = aiTemplates.value[aiSelectedTemplate.value];
      if (template) {
        prompt = template.prompt.replace('{text}', text);
      }
    }

    const result = await aiUtil.chat(prompt, {}, (chunk, full) => {
      aiStreamContent.value = full;
      scrollToAiBottom();
    });

    aiMessages.value.push({ role: 'assistant', content: result || '(空响应)' });
    saveAiHistory();
  } catch (e) {
    aiMessages.value.push({ role: 'assistant', content: `错误: ${e.message || '请求失败'}` });
    saveAiHistory();
  } finally {
    aiLoading.value = false;
    aiStreamContent.value = '';
    scrollToAiBottom();
  }
};

// 清空AI对话
const clearAiChat = () => {
  aiMessages.value = [];
  localStorage.removeItem(AI_HISTORY_KEY);
};

const copyAiResponse = () => {
  // 兼容旧代码 - 使用已有的 copyText 函数
};

const clearAi = () => {
  // 兼容旧代码
  clearAiChat();
};

const formatAiResponse = (text) => {
  // 简单的 markdown 渲染：代码块、换行
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
};

// === 文本编辑器动作处理函数 ===

// JSON 处理
const jsonFormat = () => {
  textContent.value = textProcessor.processJsonFormat(textContent.value);
};
const jsonMinify = () => {
  textContent.value = textProcessor.processJsonMinify(textContent.value);
};
const jsonValidate = () => {
  try {
    JSON.parse(textContent.value);
    ElMessage.success('JSON格式正确');
  } catch {
    ElMessage.error('JSON格式错误');
  }
};

// SQL 处理
const sqlToIn = () => {
  textContent.value = textProcessor.processSqlIn(textContent.value);
};
const sqlToComma = () => {
  textContent.value = textContent.value.replace(/(\r\n|\n|\r)/gm, ',');
};

// 时间戳转换
const parseTimestamp = (t) => {
  const s = t.trim();
  if (/^\d{10}$/.test(s)) return new Date(parseInt(s) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(parseInt(s));
  return new Date(s);
};
const formatDateStr = (date, format) => {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear(), m = pad(date.getMonth() + 1), d = pad(date.getDate());
  const H = pad(date.getHours()), M = pad(date.getMinutes()), S = pad(date.getSeconds());
  const formats = {
    'std': `${y}-${m}-${d} ${H}:${M}:${S}`,
    'date': `${y}-${m}-${d}`,
    'time': `${H}:${M}:${S}`
  };
  return formats[format] || formats['std'];
};
const tsToStd = () => {
  const date = parseTimestamp(textContent.value);
  textContent.value = isNaN(date.getTime()) ? '无效时间' : formatDateStr(date, 'std');
};
const tsToDate = () => {
  const date = parseTimestamp(textContent.value);
  textContent.value = isNaN(date.getTime()) ? '无效时间' : formatDateStr(date, 'date');
};
const tsToTime = () => {
  const date = parseTimestamp(textContent.value);
  textContent.value = isNaN(date.getTime()) ? '无效时间' : formatDateStr(date, 'time');
};
const tsToSec = () => {
  const date = new Date(textContent.value.trim());
  textContent.value = isNaN(date.getTime()) ? '无效日期' : Math.floor(date.getTime() / 1000).toString();
};
const tsToMs = () => {
  const date = new Date(textContent.value.trim());
  textContent.value = isNaN(date.getTime()) ? '无效日期' : date.getTime().toString();
};

// 变量命名转换
const toCamel = () => {
  textContent.value = textContent.value.trim().toLowerCase().replace(/[-_\s]+([a-z])/g, (_, c) => c.toUpperCase());
};
const toPascal = () => {
  const camel = textContent.value.trim().toLowerCase().replace(/[-_\s]+([a-z])/g, (_, c) => c.toUpperCase());
  textContent.value = camel.charAt(0).toUpperCase() + camel.slice(1);
};
const toSnake = () => {
  textContent.value = textContent.value.trim().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[-\s]+/g, '_');
};
const toKebab = () => {
  textContent.value = textContent.value.trim().replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[_\s]+/g, '-');
};
const toUpper = () => {
  const snake = textContent.value.trim().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[-\s]+/g, '_');
  textContent.value = snake.toUpperCase();
};

// YAML 处理
const yamlFormat = () => {
  ElMessage.info('YAML 格式化功能待完善');
};
const yamlValidate = () => {
  const lines = textContent.value.split('\n').filter(l => l.trim());
  let valid = true;
  lines.forEach((line) => {
    if (line.trim() && !line.includes(':') && !line.trim().startsWith('-') && !line.trim().startsWith('#')) {
      valid = false;
    }
  });
  if (valid) {
    ElMessage.success('YAML 格式正确');
  } else {
    ElMessage.warning('YAML 格式可能有问题');
  }
};
const yamlToJson = () => {
  const result = textProcessor.processYamlToJson(textContent.value);
  if (result.startsWith('转换失败')) {
    ElMessage.error(result);
  } else {
    textContent.value = result;
  }
};

// UUID 生成
const genUUID = () => {
  textContent.value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
const genUUIDNoHyphen = () => {
  genUUID();
  textContent.value = textContent.value.replace(/-/g, '');
};
const toUpperCase = () => {
  textContent.value = textContent.value.toUpperCase();
};
const toLowerCase = () => {
  textContent.value = textContent.value.toLowerCase();
};
const genShortId = (len) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  textContent.value = result;
};

// 密码生成
const genPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  textContent.value = password;
};

// 计算器
const calculate = () => {
  const evalResult = calculator.evaluate(textContent.value);
  if (evalResult.success) {
    textContent.value = evalResult.formatted;
  } else {
    ElMessage.error(evalResult.error);
  }
};

// 多行数字统计
const calculateStatistics = () => {
  const stats = calculator.calculateStats(textContent.value);
  if (stats.success) {
    textContent.value = calculator.formatStats(stats);
    ElMessage.success(`统计完成，共 ${stats.count} 个数字`);
  } else {
    ElMessage.error(stats.error);
  }
};

const unitConvert = () => {
  const conversion = calculator.smartConvert(textContent.value);
  if (conversion) {
    let r = `${conversion.type}转换：\n`;
    conversion.results.forEach(item => {
      const val = typeof item.value === 'number' ? item.value.toFixed(4).replace(/\.?0+$/, '') : item.value;
      r += `${val} ${item.name}\n`;
    });
    textContent.value = r;
  } else {
    ElMessage.warning('请输入带单位的数值，如 100km、50kg');
  }
};
const baseConvert = () => {
  const base = calculator.convertBase(textContent.value);
  if (base) {
    textContent.value = `十进制: ${base.decimal}\n十六进制: ${base.hex}\n二进制: ${base.binary}\n八进制: ${base.octal}`;
  } else {
    ElMessage.warning('请输入数字，支持 0x(十六进制)、0b(二进制)、0o(八进制)');
  }
};

// 编码转换
const base64Encode = () => {
  const r = encoder.base64Encode(textContent.value);
  textContent.value = typeof r === 'object' ? r.error : r;
};
const base64Decode = () => {
  const r = encoder.base64Decode(textContent.value);
  textContent.value = typeof r === 'object' ? r.error : r;
};
const urlEncode = () => {
  const r = encoder.urlEncode(textContent.value);
  textContent.value = typeof r === 'object' ? r.error : r;
};
const urlDecode = () => {
  const r = encoder.urlDecode(textContent.value);
  textContent.value = typeof r === 'object' ? r.error : r;
};
const unicodeEncode = () => {
  textContent.value = encoder.unicodeEncode(textContent.value);
};
const unicodeDecode = () => {
  const r = encoder.unicodeDecode(textContent.value);
  textContent.value = typeof r === 'object' ? r.error : r;
};

// 正则助手
const regexTest = () => {
  const lines = textContent.value.split('\n');
  if (lines.length >= 2) {
    const pattern = lines[0];
    const testText = lines.slice(1).join('\n');
    const result = regexHelper.testRegex(pattern, testText);
    if (result.success) {
      textContent.value = `匹配数: ${result.count}\n结果:\n${result.matches.map(m => m.value).join('\n')}`;
    } else {
      ElMessage.error(result.error);
    }
  } else {
    ElMessage.warning('格式: 第一行正则表达式，后面是测试文本');
  }
};
const regexHighlight = () => {
  const lines = textContent.value.split('\n');
  if (lines.length >= 2) {
    const pattern = lines[0];
    const testText = lines.slice(1).join('\n');
    const result = regexHelper.highlightMatches(pattern, testText);
    if (result.success) {
      textContent.value = result.highlighted;
    } else {
      ElMessage.error(result.error);
    }
  }
};
const extractEmails = () => {
  const result = regexHelper.extractMatches(regexHelper.REGEX_PATTERNS.email.pattern, textContent.value);
  if (result.success && result.values.length > 0) {
    textContent.value = `找到 ${result.values.length} 个邮箱:\n${result.unique.join('\n')}`;
  } else {
    ElMessage.warning('未找到邮箱');
  }
};
const extractUrls = () => {
  const result = regexHelper.extractMatches(regexHelper.REGEX_PATTERNS.url.pattern, textContent.value);
  if (result.success && result.values.length > 0) {
    textContent.value = `找到 ${result.values.length} 个链接:\n${result.unique.join('\n')}`;
  } else {
    ElMessage.warning('未找到链接');
  }
};

// 正则助手新功能
const explainRegex = () => {
  if (regexPattern.value) {
    regexExplanation.value = regexHelper.explainPattern(regexPattern.value);
  } else {
    regexExplanation.value = [];
  }
};

const runRegexTest = () => {
  if (!regexPattern.value) {
    ElMessage.warning('请输入正则表达式');
    return;
  }
  const flags = (regexFlags.g ? 'g' : '') + (regexFlags.i ? 'i' : '') + (regexFlags.m ? 'm' : '');
  const result = regexHelper.testRegex(regexPattern.value, regexTestText.value, flags || 'g');
  if (result.success) {
    regexTestResult.value = {
      count: result.count,
      html: result.matches.map(m => `<span class="match-item">${escapeHtml(m.value)}</span>`).join('<br>')
    };
  } else {
    ElMessage.error(result.error);
    regexTestResult.value = null;
  }
};

const runRegexHighlight = () => {
  if (!regexPattern.value) {
    ElMessage.warning('请输入正则表达式');
    return;
  }
  const flags = (regexFlags.g ? 'g' : '') + (regexFlags.i ? 'i' : '') + (regexFlags.m ? 'm' : '');
  const result = regexHelper.highlightMatches(regexPattern.value, regexTestText.value, flags || 'g');
  if (result.success) {
    regexTestResult.value = {
      count: (result.highlighted.match(/【/g) || []).length,
      html: escapeHtml(result.highlighted).replace(/【/g, '<mark>').replace(/】/g, '</mark>')
    };
  } else {
    ElMessage.error(result.error);
  }
};

const useRegexPattern = (key) => {
  const pattern = regexPatterns[key];
  if (pattern) {
    regexPattern.value = pattern.pattern.source || String(pattern.pattern);
    regexMode.value = 'test';
    ElMessage.success(`已选择: ${pattern.name}`);
  }
};

const escapeHtml = (text) => {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
};

// Cron 表达式功能
const parseCronExpr = () => {
  if (cronExpression.value) {
    cronParsed.value = cronUtil.parseCron(cronExpression.value);
    if (cronParsed.value.valid) {
      cronNextTimes.value = cronUtil.getNextExecutions(cronExpression.value, 5);
    } else {
      cronNextTimes.value = [];
    }
  } else {
    cronParsed.value = { valid: false, desc: '' };
    cronNextTimes.value = [];
  }
};

const useCronPreset = (preset) => {
  cronExpression.value = preset.cron;
  parseCronExpr();
  ElMessage.success(`已选择: ${preset.name}`);
};

const formatCronTime = (date) => {
  return cronUtil.formatDateTime(date);
};

// 颜色转换
const colorConvert = () => {
  const converted = colorConverter.convertColor(textContent.value);
  if (converted.success) {
    textContent.value = `HEX: ${converted.hex}\nRGB: ${converted.rgb}\nHSL: ${converted.hsl}\nCMYK: ${converted.cmyk}`;
  } else {
    ElMessage.error(converted.error);
  }
};
const colorComplement = () => {
  const comp = colorConverter.getComplementary(textContent.value);
  if (typeof comp === 'string') {
    textContent.value = `原色: ${textContent.value}\n互补色: ${comp}`;
  } else {
    ElMessage.error('无法获取互补色');
  }
};
const colorPalette = () => {
  const palette = colorConverter.generatePalette(textContent.value);
  if (palette.length > 0) {
    textContent.value = `色板:\n${palette.join('\n')}`;
  } else {
    ElMessage.error('无法生成色板');
  }
};
const colorLighter = () => {
  const lighter = colorConverter.adjustBrightness(textContent.value, 20);
  if (typeof lighter === 'string') {
    textContent.value = lighter;
  }
};
const colorDarker = () => {
  const darker = colorConverter.adjustBrightness(textContent.value, -20);
  if (typeof darker === 'string') {
    textContent.value = darker;
  }
};

// 调色盘功能
const openColorPicker = () => {
  colorPickerInput.value?.click();
};
const onColorPicked = (e) => {
  const color = e.target.value;
  textContent.value = color;
  // 自动转换显示所有格式
  const converted = colorConverter.convertColor(color);
  if (converted.success) {
    textContent.value = `HEX: ${converted.hex}\nRGB: ${converted.rgb}\nHSL: ${converted.hsl}\nCMYK: ${converted.cmyk}`;
  }
};

// 颜色选择器增强方法
const onHexInput = (val) => {
  const parsed = colorConverter.parseColor(val);
  if (parsed) {
    colorR.value = parsed.r;
    colorG.value = parsed.g;
    colorB.value = parsed.b;
    generatedPalette.value = colorConverter.generatePalette(val);
  }
};

const onRgbChange = () => {
  colorHex.value = colorConverter.rgbToHex(colorR.value, colorG.value, colorB.value);
  generatedPalette.value = colorConverter.generatePalette(colorHex.value);
};

const selectPresetColor = (color) => {
  colorHex.value = color;
  const parsed = colorConverter.parseColor(color);
  if (parsed) {
    colorR.value = parsed.r;
    colorG.value = parsed.g;
    colorB.value = parsed.b;
  }
  generatedPalette.value = colorConverter.generatePalette(color);
  ElMessage.success(`已选择 ${color}`);
};

// 定时刷新倒计时显示
onMounted(() => {
  initContent();
  // 初始化AI可用模型列表
  updateAvailableModels();
  timerInterval = setInterval(() => {
    if (props.modalData.type === 'timer') {
      refreshTimers();
    }
  }, 1000);

  // 监听剪贴板图片读取结果（用于OCR）
  if (window.api) {
    window.api.on('clipboard-image-result', ({ success, dataUrl, error }) => {
      if (success && dataUrl) {
        ocrImage.value = dataUrl;
        ocrResult.value = '';
        ocrError.value = '';
        ocrStatus.value = 'idle';
        ElMessage.success('已从剪贴板读取图片');
      } else {
        ElMessage.warning(error || '剪贴板中没有图片');
      }
    });

    // 监听主进程定时器完成通知
    window.api.on('timer-finished', ({ id }) => {
      console.log('[Timer] Received timer-finished for id:', id);
      activeTimers.value = activeTimers.value.filter(t => t.id !== id);
      saveTimers();
    });
  }

  // 组件加载时，恢复之前的定时器到主进程
  if (props.modalData.type === 'timer') {
    activeTimers.value.forEach(timer => {
      if (timer.endTime > Date.now()) {
        window.api?.send('start-timer', {
          id: timer.id,
          minutes: timer.minutes,
          endTime: timer.endTime
        });
      }
    });
  }
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

defineExpose({
  textContent,
  setContent: (val) => { textContent.value = val; }
});
</script>

<style scoped>
.feature-content {
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: var(--modal-bg);
  border-radius: 6px;
  border: 1px solid var(--grid-line);
  gap: 6px;
  flex-wrap: wrap;
}

.action-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-color);
  background: var(--bg-item);
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  height: 24px;
  line-height: 1;
}

.action-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}

.action-btn.primary {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
  font-weight: 500;
}

.action-btn.primary:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.code-editor :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  background: var(--bg-item);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  height: 200px;
  width: 100%;
  resize: none;
  border-radius: 6px;
}

/* 信息提取 */
.extract-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 360px;
}

.extract-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  border-radius: 6px;
  font-size: 13px;
}

.extract-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--modal-bg);
  border-radius: 6px;
  border: 1px solid var(--grid-line);
  gap: 6px;
  flex-wrap: wrap;
}

.extract-btns {
  display: flex;
  gap: 4px;
}

.action-btn.active {
  background: #409eff;
  color: #fff;
}

.extract-result {
  border: 1px solid var(--grid-line);
  border-radius: 6px;
  overflow: hidden;
}

.result-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--grid-line);
  font-size: 12px;
  font-family: 'Consolas', monospace;
  cursor: pointer;
  color: var(--text-color);
}

.result-item:hover {
  background: rgba(64, 158, 255, 0.15);
}

.result-item:last-child {
  border-bottom: none;
}

.extract-empty {
  text-align: center;
  padding: 16px;
  color: var(--text-dim);
  font-size: 12px;
}

/* 倒计时 */
.timer-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 320px;
}

.timer-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.timer-custom-row {
  display: flex;
  justify-content: center;
}

.timer-custom-row .timer-preset {
  flex: 1;
  flex-direction: row;
  gap: 6px;
  padding: 10px 16px;
}

.timer-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 10px;
  background: rgba(64, 158, 255, 0.08);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.timer-preset:hover {
  border-color: var(--accent-color);
  background: rgba(64, 158, 255, 0.15);
}

.preset-time {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-color);
}

.preset-unit {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}

.timer-preset.custom {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-dim);
}

.timer-preset.custom .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.custom-timer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.custom-unit {
  color: var(--text-dim);
  font-size: 13px;
}

.active-timers {
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  overflow: hidden;
}

.timers-header {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 500;
}

.timer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--grid-line);
}

.timer-item:last-child {
  border-bottom: none;
}

.timer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timer-remaining {
  font-size: 20px;
  font-weight: 600;
  font-family: 'Consolas', monospace;
  color: var(--accent-color);
}

.timer-end {
  font-size: 12px;
  color: var(--text-dim);
}

/* 二维码 */
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(103, 126, 234, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid var(--grid-line);
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.qrcode-container canvas {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  padding: 10px;
}

.qrcode-text {
  font-size: 12px;
  color: var(--text-dim);
  word-break: break-all;
  text-align: center;
  max-width: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Consolas', monospace;
}

.qrcode-container .el-button {
  width: 100%;
}

/* 闪念胶囊 */
.memo-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 320px;
}

.memo-list {
  border: 1px solid var(--grid-line);
  border-radius: 8px;
}

.memo-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--grid-line);
  font-size: 12px;
  color: var(--text-dim);
}

.memo-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--grid-line);
  gap: 8px;
}

.memo-item:last-child {
  border-bottom: none;
}

.memo-content {
  flex: 1;
  font-size: 13px;
  color: var(--text-color);
}

.memo-time {
  font-size: 11px;
  color: var(--text-dim);
}

.memo-delete {
  cursor: pointer;
  color: var(--text-dim);
  transition: color 0.2s;
}

.memo-delete:hover {
  color: #f56c6c;
}

.confirm-btn {
  width: 100%;
}

/* Markdown 预览 */
.markdown-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 480px;
}

.md-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.md-tabs {
  display: flex;
  gap: 4px;
}

.md-tab {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.15s;
}

.md-tab:hover {
  color: var(--text-color);
  background: rgba(255, 255, 255, 0.1);
}

.md-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
}

.md-stats {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-dim);
}

.md-actions {
  display: flex;
  gap: 4px;
}

.md-toc {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 6px;
}

.toc-title {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 4px;
  font-weight: 500;
}

.toc-item {
  font-size: 12px;
  color: var(--text-color);
  padding: 2px 0;
  cursor: pointer;
}

.toc-item:hover {
  color: #409eff;
}

.md-content {
  display: flex;
  gap: 10px;
}

.md-content.preview {
  flex-direction: column;
}

.md-content.source {
  flex-direction: column;
}

.md-content.split {
  flex-direction: row;
}

.md-content.split .md-editor,
.md-content.split .md-preview {
  flex: 1;
  min-width: 0;
}

.md-editor {
  flex: 1;
}

.md-source :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  height: 220px;
  line-height: 1.6;
}

.md-preview {
  flex: 1;
  padding: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  color: #24292e;
  max-height: 220px;
  overflow-y: auto;
}

/* Markdown 渲染样式 */
.markdown-body {
  font-size: 13px;
  line-height: 1.5;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  line-height: 1.25;
  color: #1a1a1a;
}

.markdown-body h1 { font-size: 1.6em; border-bottom: 1px solid #eaecef; padding-bottom: 0.25em; }
.markdown-body h2 { font-size: 1.3em; border-bottom: 1px solid #eaecef; padding-bottom: 0.25em; }
.markdown-body h3 { font-size: 1.1em; }
.markdown-body h4 { font-size: 1em; }

.markdown-body p {
  margin-top: 0;
  margin-bottom: 10px;
}

.markdown-body code {
  padding: 0.15em 0.35em;
  margin: 0;
  font-size: 85%;
  background: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: #d63384;
}

.markdown-body pre {
  padding: 10px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.4;
  background: #282c34;
  border-radius: 5px;
  margin-bottom: 10px;
}

.markdown-body pre code {
  padding: 0;
  margin: 0;
  font-size: 100%;
  background: transparent;
  border: 0;
  color: #abb2bf;
}

.markdown-body blockquote {
  padding: 0 0.8em;
  color: #6a737d;
  border-left: 0.2em solid #dfe2e5;
  margin: 0 0 10px 0;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 1.8em;
  margin-top: 0;
  margin-bottom: 10px;
}

.markdown-body li {
  margin: 3px 0;
}

.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 10px;
}

.markdown-body table th,
.markdown-body table td {
  padding: 5px 10px;
  border: 1px solid #dfe2e5;
}

.markdown-body table tr:nth-child(2n) {
  background: #f6f8fa;
}

.markdown-body table th {
  font-weight: 600;
  background: #f6f8fa;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
}

.markdown-body a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body hr {
  height: 0.2em;
  padding: 0;
  margin: 16px 0;
  background: #e1e4e8;
  border: 0;
}

/* OCR 识别样式 */
.ocr-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 380px;
}

.ocr-input {
  width: 100%;
}

.ocr-dropzone {
  border: 2px dashed var(--grid-line);
  border-radius: 10px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0, 0, 0, 0.08);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ocr-dropzone:hover {
  border-color: var(--accent-color);
  background: rgba(64, 158, 255, 0.05);
}

.ocr-dropzone.has-image {
  padding: 10px;
  border-style: solid;
}

.drop-icon {
  font-size: 36px;
  color: var(--text-dim);
  margin-bottom: 8px;
}

.ocr-dropzone p {
  margin: 4px 0;
  color: var(--text-color);
  font-size: 13px;
}

.drop-hint {
  color: var(--text-dim) !important;
  font-size: 11px !important;
}

.preview-image {
  max-width: 100%;
  max-height: 150px;
  border-radius: 8px;
  object-fit: contain;
}

.ocr-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.ocr-actions .el-button,
.ocr-actions .ocr-btn {
  font-size: 13px;
  padding: 8px 16px;
  height: 32px;
  min-width: 130px;
  flex: 1;
  max-width: 160px;
}

.ocr-progress {
  margin: 6px 0;
}

.ocr-result {
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--text-dim);
}

.result-actions {
  display: flex;
  gap: 4px;
}

.result-text :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.12);
  border: none;
  border-radius: 0;
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.6;
  height: 120px;
}

.ocr-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #f56c6c;
  font-size: 13px;
}

.ocr-error .el-icon {
  font-size: 18px;
}

/* AI 助手样式 */
.ai-container,
.ai-chat-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 400px;
  height: 100%;
  max-height: 420px;
}

.ai-not-configured {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  flex: 1;
}

.ai-not-configured .warn-icon {
  font-size: 48px;
  color: #e6a23c;
  margin-bottom: 12px;
}

.ai-not-configured p {
  color: var(--text-dim);
  margin-bottom: 16px;
  font-size: 14px;
}

/* AI 聊天头部 */
.ai-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  flex-shrink: 0;
}

.ai-header-btns {
  display: flex;
  gap: 6px;
}

.header-icon {
  font-size: 16px;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.header-icon:hover {
  color: var(--text-color);
  background: rgba(255,255,255,0.08);
}

.ai-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ai-action-btn {
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-color);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  height: 24px;
  display: inline-flex;
  align-items: center;
}

.ai-action-btn:hover {
  background: rgba(64, 158, 255, 0.2);
}

.ai-action-btn.active {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  color: #fff;
}

/* AI 消息列表 */
.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 150px;
}

.ai-empty-hint {
  text-align: center;
  color: var(--text-dim);
  padding: 40px 20px;
  font-size: 13px;
}

.ai-message {
  max-width: 90%;
}

.ai-message.user {
  align-self: flex-end;
}

.ai-message.assistant {
  align-self: flex-start;
}

.ai-msg-content {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.ai-message.user .ai-msg-content {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ai-message.assistant .ai-msg-content {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-color);
  border-bottom-left-radius: 4px;
}

.ai-msg-text pre {
  background: rgba(0,0,0,0.3);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 8px 0;
}

.ai-msg-text code {
  background: rgba(0,0,0,0.2);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

.ai-msg-actions {
  margin-top: 4px;
  text-align: right;
}

.ai-msg-actions span {
  font-size: 11px;
  color: var(--text-dim);
  cursor: pointer;
}

.ai-msg-actions span:hover {
  color: var(--accent-color);
}

.typing {
  color: var(--text-dim);
}

/* AI 输入区 */
.ai-chat-input {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--grid-line);
  flex-shrink: 0;
}

.ai-chat-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  font-size: 13px;
  resize: none;
}

.ai-chat-input .send-btn {
  align-self: flex-end;
  flex-shrink: 0;
}

/* 旧版AI输入样式 */
.ai-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.6;
  height: 100px;
}

.ai-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ai-actions .el-button {
  font-size: 13px;
  padding: 8px 18px;
  height: 32px;
}

.ai-response {
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  overflow: hidden;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--text-dim);
}

.response-actions {
  display: flex;
  gap: 4px;
}

.response-content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-color);
}

.response-content pre {
  background: rgba(0, 0, 0, 0.25);
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.response-content code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.response-content :not(pre) > code {
  background: rgba(64, 158, 255, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  color: #409eff;
}

.ai-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #f56c6c;
  font-size: 13px;
}

.ai-config-dialog :deep(.el-dialog) {
  background: var(--modal-bg);
}

.ai-config-dialog :deep(.el-form-item__label) {
  color: var(--text-color);
}

.form-hint {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 4px;
}

/* 调色盘按钮 */
.picker-btn {
  position: relative;
  overflow: hidden;
}

.color-picker-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

/* Markdown 快速插入工具栏 */
.md-quick-insert {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  margin-bottom: 8px;
}

.quick-btn {
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-color);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-btn:hover {
  background: var(--accent-color);
  color: #fff;
}

/* Markdown 拖拽提示 */
.md-drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(64, 158, 255, 0.15);
  border: 2px dashed var(--accent-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--accent-color);
  z-index: 10;
}

.md-drop-hint .el-icon {
  font-size: 32px;
}

.markdown-container.drag-over {
  position: relative;
}

/* Markdown 语法帮助 */
.md-help {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.help-item {
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.help-item .help-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-color);
  margin-bottom: 4px;
}

.help-item .help-desc {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.help-item .help-syntax {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  color: var(--text-color);
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
}

/* 正则助手样式 */
.regex-help,
.regex-patterns,
.regex-explain,
.regex-test {
  padding: 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.regex-help {
  max-height: 280px;
  overflow-y: auto;
}

.help-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--grid-line);
}

.help-row:last-child {
  border-bottom: none;
}

.help-char {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-color);
  background: rgba(64, 158, 255, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
  min-width: 40px;
  text-align: center;
}

.help-name {
  font-size: 12px;
  color: var(--text-color);
  min-width: 60px;
}

.help-desc {
  font-size: 11px;
  color: var(--text-dim);
  flex: 1;
}

/* 正则模式列表 */
.regex-patterns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.pattern-item {
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.pattern-item:hover {
  background: rgba(64, 158, 255, 0.15);
}

.pattern-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}

.pattern-code {
  display: block;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 10px;
  color: var(--accent-color);
  word-break: break-all;
}

/* 正则解释 */
.regex-explain .explain-input {
  margin-bottom: 12px;
}

.explain-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.explain-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.explain-char {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-color);
  min-width: 30px;
}

.explain-desc {
  font-size: 12px;
  color: var(--text-color);
}

.explain-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-dim);
  font-size: 13px;
}

/* 正则测试 */
.regex-test .test-input {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.test-flags {
  display: flex;
  gap: 8px;
}

.test-flags :deep(.el-checkbox__label) {
  font-family: 'Consolas', monospace;
  font-size: 12px;
  padding-left: 4px;
}

.test-text {
  margin-bottom: 10px;
}

.test-text :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--grid-line);
  color: var(--text-color);
}

.test-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.test-result {
  border: 1px solid var(--grid-line);
  border-radius: 6px;
  overflow: hidden;
}

.test-result .result-header {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--text-dim);
}

.test-result .result-content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.8;
}

.test-result .result-content :deep(mark) {
  background: rgba(64, 158, 255, 0.3);
  color: #fff;
  padding: 1px 3px;
  border-radius: 2px;
}

.test-result .result-content :deep(.match-item) {
  display: inline-block;
  background: rgba(64, 158, 255, 0.2);
  padding: 2px 8px;
  margin: 2px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
}

/* Cron 表达式样式 */
.cron-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cron-input :deep(.el-input__wrapper) {
  background: rgba(0, 0, 0, 0.15);
}

.cron-input :deep(.el-input__inner) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
}

.cron-result {
  padding: 12px;
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.3);
  border-radius: 8px;
}

.cron-desc {
  font-size: 14px;
  font-weight: 500;
  color: #67c23a;
  margin-bottom: 10px;
}

.cron-next {
  padding-top: 8px;
  border-top: 1px solid rgba(103, 194, 58, 0.2);
}

.next-title {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.next-time {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-color);
  padding: 3px 0;
}

.cron-error {
  padding: 12px;
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.3);
  border-radius: 8px;
  color: #f56c6c;
  font-size: 13px;
}

.cron-presets {
  padding: 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.presets-title,
.help-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-dim);
  margin-bottom: 10px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-item:hover {
  background: rgba(64, 158, 255, 0.15);
}

.preset-name {
  font-size: 12px;
  color: var(--text-color);
}

.preset-cron {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  color: var(--accent-color);
}

.cron-help {
  padding: 12px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.help-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.field-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color);
}

.field-range {
  font-size: 11px;
  color: var(--text-dim);
  font-family: 'Consolas', monospace;
}

/* 颜色选择器增强样式 */
.color-picker-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.color-preview-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.color-preview-box {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  border: 2px solid var(--grid-line);
  flex-shrink: 0;
}

.color-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.color-inputs .input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-inputs .input-group label {
  font-size: 12px;
  color: var(--text-dim);
  width: 35px;
  flex-shrink: 0;
}

.color-inputs .rgb-inputs {
  display: flex;
  gap: 6px;
}

.color-inputs .rgb-inputs :deep(.el-input-number) {
  width: 70px;
}

.color-formats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.format-item {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.format-item:hover {
  background: rgba(64, 158, 255, 0.2);
}

.format-label {
  font-size: 10px;
  color: var(--text-dim);
  display: block;
  margin-bottom: 4px;
}

.format-value {
  font-size: 12px;
  color: var(--text-color);
  font-family: 'Consolas', monospace;
}

.color-presets {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 12px;
}

.color-presets .preset-title,
.color-palette .palette-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-dim);
  margin-bottom: 10px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.preset-color {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.15s, box-shadow 0.15s;
}

.preset-color:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 1;
}

.color-palette {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 12px;
}

.palette-colors {
  display: flex;
  gap: 8px;
}

.palette-color {
  flex: 1;
  height: 50px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
  transition: transform 0.15s;
}

.palette-color:hover {
  transform: scale(1.05);
}

.palette-hex {
  font-size: 9px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 设置面板样式 */
.settings-panel {
  width: 100%;
  height: 100%;
}

.settings-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.settings-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 8px;
}

.settings-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  color: var(--text-dim);
  padding: 0 14px;
  height: 36px;
}

.settings-tabs :deep(.el-tabs__item.is-active) {
  color: var(--accent-color);
}

.settings-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--accent-color);
}

.settings-tabs :deep(.el-tabs__content) {
  padding: 0 8px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid var(--grid-line);
}

.setting-label {
  font-size: 13px;
  color: var(--text-color);
  flex-shrink: 0;
}

.setting-unit {
  font-size: 12px;
  color: var(--text-dim);
  margin-left: 6px;
}

.setting-item :deep(.el-select) {
  width: 100px;
}

.setting-item :deep(.el-input-number) {
  width: 100px;
}

.setting-item :deep(.el-slider) {
  width: 120px;
  margin: 0 10px;
}

.setting-item :deep(.el-input) {
  width: 100px;
}

.setting-item :deep(.el-button) {
  font-size: 12px;
}
</style>
