// src/utils/textProcessor.js (智能文本处理引擎)

/**
 * 智能文本处理器
 * 负责分析剪贴板内容，返回推荐的操作列表 (Smart Chips)
 */
export default {
  /**
   *分析文本并生成推荐动作
   * @param {string} text - 剪贴板的原始文本
   * @returns {Array} - 动作列表 [{ label: '显示名称', action: '动作标识', payload: '参数' }]
   */
  analyze(text) {
    if (!text || text.trim() === '') return [];

    const actions = [];
    const trimmedText = text.trim();

    // --- 1. 基础通用功能 ---

    // 默认浏览器搜索 (总是显示，除非内容过长)
    if (trimmedText.length < 100) {
      actions.push({ label: '搜索', action: 'search-google', payload: trimmedText });
    }

    // 翻译 (总是显示)
    actions.push({ label: '翻译', action: 'translate', payload: trimmedText });

    // --- 2. 格式识别 ---

    // 识别 URL
    if (this.isUrl(trimmedText)) {
      actions.push({ label: '打开链接', action: 'open-url', payload: trimmedText });
      actions.push({ label: '转二维码', action: 'generate-qr', payload: trimmedText });
    }

    // 识别 JSON (以 { 或 [ 开头，且能解析)
    if (this.isJson(trimmedText)) {
      actions.push({ label: '格式化 JSON', action: 'json-format', payload: trimmedText });
    }

    // 识别多行文本 (用于 SQL 助手，智能拼接功能已整合到 SQL IN 中)
    if (this.isMultiLine(trimmedText)) {
      actions.push({ label: '转 SQL IN', action: 'sql-in', payload: trimmedText });
    }

    // 识别简单的变量名 (驼峰/下划线转换)
    if (this.isVariable(trimmedText)) {
      actions.push({ label: '变量命名', action: 'to-camel', payload: trimmedText });
    }

    // --- 3. 正则提取 ---
    const ips = this.extractIps(text);
    if (ips.length > 0) {
      actions.push({ label: `提取 ${ips.length} 个 IP`, action: 'extract-info', payload: ips.join('\n') });
    }

    const emails = this.extractEmails(text);
    if (emails.length > 0) {
      actions.push({ label: `提取 ${emails.length} 个邮箱`, action: 'extract-info', payload: emails.join('\n') });
    }

    // 提取手机号
    const phones = this.extractPhones(text);
    if (phones.length > 0) {
      actions.push({ label: `提取 ${phones.length} 个号码`, action: 'extract-info', payload: phones.join('\n') });
    }

    // --- 4. 时间戳识别 ---
    if (this.isTimestamp(trimmedText)) {
      actions.push({ label: '转为日期时间', action: 'timestamp-convert', payload: trimmedText });
    } else if (this.isDateString(trimmedText)) {
      actions.push({ label: '转为时间戳', action: 'timestamp-convert', payload: trimmedText });
    }

    // --- 5. YAML 识别 (简易) ---
    if (this.isYaml(trimmedText)) {
      actions.push({ label: 'YAML 处理', action: 'yaml-format', payload: trimmedText });
    }

    return actions;
  },

  // --- 辅助判断函数 ---

  /** 提取 IP 地址 */
  extractIps(text) {
    const regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    return [...new Set(text.match(regex) || [])]; // 去重
  },

  /** 提取邮箱 */
  extractEmails(text) {
    const regex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return [...new Set(text.match(regex) || [])];
  },

  /** 提取手机号 (简单泛用规则) */
  extractPhones(text) {
    const regex = /\b1[3-9]\d{9}\b/g;
    return [...new Set(text.match(regex) || [])];
  },

  /** 判断是否为 YAML (包含冒号结构的行) */
  isYaml(text) {
    return text.includes(':') && !text.trim().startsWith('{') && text.includes('\n');
  },

  /** 简单 YAML 转 JSON */
  processYamlToJson(text) {
    // 这里仅演示简单 KV 解析，生产环境应使用 js-yaml 库
    try {
      const lines = text.split('\n');
      const obj = {};
      lines.forEach(line => {
        const [k, v] = line.split(':');
        if(k && v) obj[k.trim()] = v.trim();
      });
      return JSON.stringify(obj, null, 2);
    } catch(e) { return '转换失败: ' + e.message; }
  },

  /** 判断是否为 URL */
  isUrl(text) {
    // 简单的正则判断，以 http 或 https 开头
    return /^(http|https):\/\/[^ " ]+$/.test(text);
  },

  /** 判断是否为有效的 JSON 字符串 */
  isJson(text) {
    if (!text.startsWith('{') && !text.startsWith('[')) return false;
    try {
      JSON.parse(text);
      return true;
    } catch (e) {
      return false;
    }
  },

  /** 判断是否为多行文本 (超过1行) */
  isMultiLine(text) {
    return text.includes('\n') || text.includes('\r');
  },

  /** 判断是否为单个变量名 (不含空格，长度适中) */
  isVariable(text) {
    return !text.includes(' ') && !text.includes('\n') && text.length < 50 && text.length > 1;
  },

  /** 判断是否为时间戳 (10位或13位数字) */
  isTimestamp(text) {
    return /^\d{10}$|^\d{13}$/.test(text);
  },

  /** 判断是否为日期字符串 (简单判断) */
  isDateString(text) {
    return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text);
  },

  // --- 具体的处理逻辑 (执行动作时调用) ---

  /**
   * 时间戳转日期
   */
  processTimestamp(text) {
    const ts = parseInt(text);
    const date = new Date(text.length === 10 ? ts * 1000 : ts);
    if (isNaN(date.getTime())) return '无效时间戳';
    return date.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
  },

  /**
   * 日期转时间戳
   */
  processToTimestamp(text) {
    const date = new Date(text);
    if (isNaN(date.getTime())) return '无效日期';
    return date.getTime().toString();
  },

  /**
   * 将多行文本转换为 SQL IN ('a', 'b') 格式
   */
  processSqlIn(text) {
    const lines = text.split(/[\r\n]+/).map(line => line.trim()).filter(line => line);
    // 默认按字符串处理，加单引号
    return `('${lines.join("', '")}')`;
  },

  /**
   * 格式化 JSON
   */
  processJsonFormat(text) {
    try {
      const obj = JSON.parse(text);
      return JSON.stringify(obj, null, 2); // 缩进2空格
    } catch (e) {
      return 'JSON 解析错误';
    }
  },
  
  /**
   * 压缩 JSON
   */
  processJsonMinify(text) {
    try {
      const obj = JSON.parse(text);
      return JSON.stringify(obj);
    } catch (e) {
      return 'JSON 解析错误';
    }
  }
};
