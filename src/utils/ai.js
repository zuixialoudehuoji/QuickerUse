/**
 * AI 智能助手工具
 * 支持 OpenAI 和 Claude API
 * 通过主进程代理请求解决 CORS 问题
 */

// 生成唯一请求ID
let requestIdCounter = 0;
const generateRequestId = () => `ai-${Date.now()}-${++requestIdCounter}`;

// 预设的 Prompt 模板
export const PROMPT_TEMPLATES = {
  translate: {
    name: '翻译',
    icon: 'Connection',
    prompt: '请将以下文本翻译成{targetLang}，只返回翻译结果：\n\n{text}'
  },
  summarize: {
    name: '摘要',
    icon: 'Document',
    prompt: '请用简洁的语言总结以下内容的要点（不超过3点）：\n\n{text}'
  },
  polish: {
    name: '润色',
    icon: 'EditPen',
    prompt: '请优化以下文本，使其更加流畅、专业，保持原意：\n\n{text}'
  },
  explain: {
    name: '解释代码',
    icon: 'InfoFilled',
    prompt: '请用简洁的中文解释以下代码的功能和逻辑：\n\n```\n{text}\n```'
  },
  optimize: {
    name: '优化代码',
    icon: 'MagicStick',
    prompt: '请优化以下代码，提高可读性和性能，并给出简要说明：\n\n```\n{text}\n```'
  },
  fix: {
    name: '修复代码',
    icon: 'WarnTriangleFilled',
    prompt: '请检查以下代码是否有 bug 或潜在问题，并提供修复建议：\n\n```\n{text}\n```'
  },
  convert: {
    name: '代码转换',
    icon: 'Switch',
    prompt: '请将以下代码转换为{targetLang}语言：\n\n```\n{text}\n```'
  },
  ask: {
    name: '自由问答',
    icon: 'ChatDotRound',
    prompt: '{text}'
  }
}

// 支持的 AI 服务
export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  claude: {
    name: 'Claude',
    models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  custom: {
    name: '自定义',
    models: [],
    endpoint: ''
  }
}

// 默认配置
const DEFAULT_CONFIG = {
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  apiKey: '',
  endpoint: '',
  maxTokens: 2000,
  temperature: 0.7
}

/**
 * 获取 AI 配置
 */
export function getConfig() {
  const saved = localStorage.getItem('ai-config')
  const config = saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG
  // 清理 endpoint URL（移除末尾的 # 和空白字符）
  if (config.endpoint) {
    config.endpoint = config.endpoint.trim().replace(/#$/, '');
  }
  return config
}

/**
 * 保存 AI 配置
 */
export function saveConfig(config) {
  // 清理 endpoint URL（移除末尾的 # 和空白字符）
  if (config.endpoint) {
    config.endpoint = config.endpoint.trim().replace(/#$/, '');
  }
  localStorage.setItem('ai-config', JSON.stringify(config))
}

/**
 * 检查配置是否有效
 */
export function isConfigured() {
  const config = getConfig()
  return !!(config.apiKey && (config.provider !== 'custom' || config.endpoint))
}

/**
 * 通过主进程代理发送 AI 请求
 */
async function proxyAIRequest(endpoint, headers, body, onStream = null) {
  return new Promise((resolve, reject) => {
    const requestId = generateRequestId();
    let fullContent = '';
    let resolved = false;

    console.log('[AI] Sending request:', { requestId, endpoint, model: body?.model });

    // 检查 API 是否可用
    if (!window.api) {
      console.error('[AI] window.api is not available!');
      reject(new Error('API 未初始化'));
      return;
    }

    // 清理所有之前的监听器，避免累积
    window.api.removeAllListeners?.('ai-chat-stream');
    window.api.removeAllListeners?.('ai-chat-result');

    // 监听流式响应
    const streamHandler = (data) => {
      if (data.requestId === requestId && onStream) {
        onStream(data.chunk, data.full);
        fullContent = data.full;
      }
    };

    // 监听最终结果
    const resultHandler = (data) => {
      console.log('[AI] Received result:', { requestId: data.requestId, expectedId: requestId, success: data.success });
      if (data.requestId !== requestId) return;
      if (resolved) return; // 防止重复处理
      resolved = true;

      if (data.success) {
        console.log('[AI] Request succeeded, content length:', (data.content || fullContent).length);
        resolve(data.content || fullContent);
      } else {
        console.error('[AI] Request failed:', data.error);
        reject(new Error(data.error || '请求失败'));
      }
    };

    // 注册监听器
    if (onStream) {
      window.api.on('ai-chat-stream', streamHandler);
    }
    window.api.on('ai-chat-result', resultHandler);

    // 发送请求
    window.api.send('ai-chat', { requestId, endpoint, headers, body });
    console.log('[AI] Request sent');

    // 超时处理（60秒）
    setTimeout(() => {
      if (!resolved) {
        console.error('[AI] Request timeout after 60s');
        resolved = true;
        reject(new Error('请求超时'));
      }
    }, 60000);
  });
}

/**
 * 调用 OpenAI API（通过主进程代理）
 */
async function callOpenAI(messages, config, onStream = null) {
  const endpoint = config.endpoint || AI_PROVIDERS.openai.endpoint;
  const headers = {
    'Authorization': `Bearer ${config.apiKey}`
  };
  const body = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    stream: !!onStream
  };

  return proxyAIRequest(endpoint, headers, body, onStream);
}

/**
 * 调用 Claude API（通过主进程代理）
 */
async function callClaude(messages, config, onStream = null) {
  // 转换消息格式
  const systemMsg = messages.find(m => m.role === 'system')?.content || ''
  const claudeMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const endpoint = config.endpoint || AI_PROVIDERS.claude.endpoint;
  const headers = {
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01'
  };
  const body = {
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemMsg,
    messages: claudeMessages,
    stream: !!onStream
  };

  return proxyAIRequest(endpoint, headers, body, onStream);
}

/**
 * 发送消息到 AI
 * @param {string} prompt - 用户输入
 * @param {object} options - 选项
 * @param {function} onStream - 流式响应回调
 * @returns {Promise<string>}
 */
export async function chat(prompt, options = {}, onStream = null) {
  const config = { ...getConfig(), ...options }

  if (!config.apiKey) {
    throw new Error('请先配置 API Key')
  }

  const messages = [
    { role: 'system', content: '你是一个专业的助手，请用简洁准确的语言回答问题。' },
    { role: 'user', content: prompt }
  ]

  if (config.provider === 'claude') {
    return callClaude(messages, config, onStream)
  } else {
    return callOpenAI(messages, config, onStream)
  }
}

/**
 * 使用预设模板
 * @param {string} templateKey - 模板键
 * @param {string} text - 输入文本
 * @param {object} vars - 变量替换
 * @param {function} onStream - 流式响应回调
 * @returns {Promise<string>}
 */
export async function useTemplate(templateKey, text, vars = {}, onStream = null) {
  const template = PROMPT_TEMPLATES[templateKey]
  if (!template) {
    throw new Error('未知的模板类型')
  }

  let prompt = template.prompt.replace('{text}', text)

  // 替换其他变量
  Object.keys(vars).forEach(key => {
    prompt = prompt.replace(`{${key}}`, vars[key])
  })

  return chat(prompt, {}, onStream)
}

/**
 * 翻译文本
 */
export async function translate(text, targetLang = '中文', onStream = null) {
  return useTemplate('translate', text, { targetLang }, onStream)
}

/**
 * 生成摘要
 */
export async function summarize(text, onStream = null) {
  return useTemplate('summarize', text, {}, onStream)
}

/**
 * 润色文本
 */
export async function polish(text, onStream = null) {
  return useTemplate('polish', text, {}, onStream)
}

/**
 * 解释代码
 */
export async function explainCode(text, onStream = null) {
  return useTemplate('explain', text, {}, onStream)
}

/**
 * 优化代码
 */
export async function optimizeCode(text, onStream = null) {
  return useTemplate('optimize', text, {}, onStream)
}

/**
 * 修复代码
 */
export async function fixCode(text, onStream = null) {
  return useTemplate('fix', text, {}, onStream)
}
