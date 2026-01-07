/**
 * 编码转换工具
 * 支持 Base64、URL、Unicode、HTML 编解码
 */

// ===== Base64 =====

// Base64 编码
export function base64Encode(text) {
  try {
    // 使用 TextEncoder 处理 Unicode
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const binary = String.fromCharCode(...data)
    return btoa(binary)
  } catch (e) {
    return { error: 'Base64编码失败: ' + e.message }
  }
}

// Base64 解码
export function base64Decode(text) {
  try {
    const binary = atob(text.trim())
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    const decoder = new TextDecoder()
    return decoder.decode(bytes)
  } catch (e) {
    return { error: 'Base64解码失败: 无效的Base64字符串' }
  }
}

// 检测是否为 Base64
export function isBase64(text) {
  const trimmed = text.trim()
  // Base64 只包含这些字符
  if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed)) return false
  // 长度检查（Base64长度是4的倍数）
  if (trimmed.length % 4 !== 0) return false
  // 尝试解码
  try {
    atob(trimmed)
    return trimmed.length > 10 // 太短的字符串可能误判
  } catch {
    return false
  }
}

// ===== URL 编码 =====

// URL 编码
export function urlEncode(text) {
  try {
    return encodeURIComponent(text)
  } catch (e) {
    return { error: 'URL编码失败' }
  }
}

// URL 解码
export function urlDecode(text) {
  try {
    return decodeURIComponent(text.trim())
  } catch (e) {
    return { error: 'URL解码失败: 无效的编码字符串' }
  }
}

// 检测是否为 URL 编码
export function isUrlEncoded(text) {
  // 包含 %XX 格式
  return /%[0-9A-Fa-f]{2}/.test(text)
}

// ===== Unicode =====

// Unicode 编码 (\uXXXX)
export function unicodeEncode(text) {
  return text.split('').map(char => {
    const code = char.charCodeAt(0)
    if (code > 127) {
      return '\\u' + code.toString(16).padStart(4, '0')
    }
    return char
  }).join('')
}

// Unicode 解码
export function unicodeDecode(text) {
  try {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
  } catch (e) {
    return { error: 'Unicode解码失败' }
  }
}

// 检测是否包含 Unicode 转义
export function hasUnicodeEscape(text) {
  return /\\u[0-9a-fA-F]{4}/.test(text)
}

// ===== HTML 实体 =====

// HTML 实体编码
export function htmlEncode(text) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }
  return text.replace(/[&<>"'`=/]/g, char => entities[char])
}

// HTML 实体解码
export function htmlDecode(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&nbsp;': ' '
  }

  // 处理命名实体
  let result = text
  Object.keys(entities).forEach(entity => {
    result = result.replace(new RegExp(entity, 'gi'), entities[entity])
  })

  // 处理数字实体 &#xxx; 和 &#xXXX;
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  return result
}

// 检测是否包含 HTML 实体
export function hasHtmlEntity(text) {
  return /&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/.test(text)
}

// ===== 哈希计算 =====

// MD5（简化版，用于显示）
export async function md5(text) {
  // 注意：Web Crypto API 不支持 MD5，这里使用简单的哈希模拟
  // 实际应用中建议使用 crypto-js 库
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  // 取前16字节模拟MD5
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')
}

// SHA-1
export async function sha1(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// SHA-256
export async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ===== 智能检测 =====

// 智能检测编码类型
export function detectEncoding(text) {
  const trimmed = text.trim()

  if (isBase64(trimmed)) {
    return { type: 'base64', label: 'Base64' }
  }

  if (isUrlEncoded(trimmed)) {
    return { type: 'url', label: 'URL编码' }
  }

  if (hasUnicodeEscape(trimmed)) {
    return { type: 'unicode', label: 'Unicode' }
  }

  if (hasHtmlEntity(trimmed)) {
    return { type: 'html', label: 'HTML实体' }
  }

  return null
}

// 智能解码
export function smartDecode(text) {
  const detected = detectEncoding(text)

  if (!detected) {
    return { success: false, error: '未检测到特定编码格式' }
  }

  let result

  switch (detected.type) {
    case 'base64':
      result = base64Decode(text)
      break
    case 'url':
      result = urlDecode(text)
      break
    case 'unicode':
      result = unicodeDecode(text)
      break
    case 'html':
      result = htmlDecode(text)
      break
  }

  if (typeof result === 'object' && result.error) {
    return { success: false, error: result.error }
  }

  return { success: true, result, type: detected.label }
}

// 全部编码结果
export function encodeAll(text) {
  return {
    base64: base64Encode(text),
    url: urlEncode(text),
    unicode: unicodeEncode(text),
    html: htmlEncode(text)
  }
}

// 全部哈希结果
export async function hashAll(text) {
  const [sha1Hash, sha256Hash] = await Promise.all([
    sha1(text),
    sha256(text)
  ])

  return {
    sha1: sha1Hash,
    sha256: sha256Hash
  }
}
