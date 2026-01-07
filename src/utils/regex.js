/**
 * 正则表达式助手
 * 提供常用正则模式和测试功能
 */

// 正则语法帮助（小白友好）
export const REGEX_SYNTAX_HELP = [
  { char: '.', name: '任意字符', desc: '匹配除换行符外的任意单个字符', example: 'a.c 匹配 abc、a1c' },
  { char: '*', name: '零次或多次', desc: '匹配前一个字符零次或多次', example: 'ab* 匹配 a、ab、abb' },
  { char: '+', name: '一次或多次', desc: '匹配前一个字符一次或多次', example: 'ab+ 匹配 ab、abb，不匹配 a' },
  { char: '?', name: '零次或一次', desc: '匹配前一个字符零次或一次', example: 'colou?r 匹配 color、colour' },
  { char: '^', name: '开头', desc: '匹配字符串的开头', example: '^Hello 匹配以Hello开头的文本' },
  { char: '$', name: '结尾', desc: '匹配字符串的结尾', example: 'world$ 匹配以world结尾的文本' },
  { char: '\\d', name: '数字', desc: '匹配任意数字 0-9', example: '\\d{3} 匹配3位数字如 123' },
  { char: '\\w', name: '单词字符', desc: '匹配字母、数字、下划线', example: '\\w+ 匹配 hello_123' },
  { char: '\\s', name: '空白', desc: '匹配空格、制表符、换行符', example: 'a\\sb 匹配 a b' },
  { char: '[abc]', name: '字符集', desc: '匹配方括号内的任意字符', example: '[aeiou] 匹配任意元音' },
  { char: '[^abc]', name: '排除', desc: '匹配不在方括号内的字符', example: '[^0-9] 匹配非数字' },
  { char: '()', name: '分组', desc: '将括号内作为一组，可捕获', example: '(ab)+ 匹配 ab、abab' },
  { char: '|', name: '或', desc: '匹配左边或右边的表达式', example: 'cat|dog 匹配 cat 或 dog' },
  { char: '{n}', name: '精确次数', desc: '匹配前一个字符恰好n次', example: 'a{3} 匹配 aaa' },
  { char: '{n,m}', name: '范围次数', desc: '匹配前一个字符n到m次', example: 'a{2,4} 匹配 aa、aaa、aaaa' },
]

// 正则修饰符说明
export const REGEX_FLAGS = [
  { flag: 'g', name: '全局', desc: '查找所有匹配，而非第一个就停止' },
  { flag: 'i', name: '忽略大小写', desc: '不区分大小写匹配' },
  { flag: 'm', name: '多行', desc: '^和$匹配每行的开头结尾' },
  { flag: 's', name: '点号匹配全部', desc: '让.也能匹配换行符' },
]

// 常用正则表达式库
export const REGEX_PATTERNS = {
  email: {
    name: '邮箱',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    example: 'test@example.com'
  },
  phone: {
    name: '手机号(中国)',
    pattern: /1[3-9]\d{9}/g,
    example: '13812345678'
  },
  url: {
    name: 'URL链接',
    pattern: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
    example: 'https://example.com/path'
  },
  ip: {
    name: 'IP地址',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    example: '192.168.1.1'
  },
  ipv6: {
    name: 'IPv6地址',
    pattern: /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g,
    example: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
  },
  date: {
    name: '日期(YYYY-MM-DD)',
    pattern: /\d{4}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])/g,
    example: '2024-01-15'
  },
  time: {
    name: '时间(HH:MM:SS)',
    pattern: /([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?/g,
    example: '14:30:00'
  },
  idCard: {
    name: '身份证号(中国)',
    pattern: /[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
    example: '110101199001011234'
  },
  hex: {
    name: '十六进制颜色',
    pattern: /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
    example: '#FF5733'
  },
  chinese: {
    name: '中文字符',
    pattern: /[\u4e00-\u9fa5]+/g,
    example: '中文测试'
  },
  number: {
    name: '数字',
    pattern: /-?\d+\.?\d*/g,
    example: '123.45'
  },
  word: {
    name: '英文单词',
    pattern: /\b[a-zA-Z]+\b/g,
    example: 'hello'
  },
  html: {
    name: 'HTML标签',
    pattern: /<[^>]+>/g,
    example: '<div class="test">'
  },
  spaces: {
    name: '多余空白',
    pattern: /\s{2,}/g,
    example: '  多个空格  '
  }
}

// 测试正则表达式
export function testRegex(pattern, text, flags = 'g') {
  try {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, flags) : pattern
    const matches = []
    let match

    // 重置 lastIndex
    regex.lastIndex = 0

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.slice(1)
      })

      // 防止无限循环
      if (!regex.global) break
      if (match.index === regex.lastIndex) {
        regex.lastIndex++
      }
    }

    return {
      success: true,
      matches,
      count: matches.length
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    }
  }
}

// 替换测试
export function testReplace(pattern, text, replacement, flags = 'g') {
  try {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, flags) : pattern
    const result = text.replace(regex, replacement)
    return {
      success: true,
      result
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    }
  }
}

// 高亮匹配结果
export function highlightMatches(pattern, text, flags = 'g') {
  try {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, flags) : pattern
    const highlighted = text.replace(regex, match => `【${match}】`)
    return {
      success: true,
      highlighted
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    }
  }
}

// 提取所有匹配
export function extractMatches(pattern, text, flags = 'g') {
  const result = testRegex(pattern, text, flags)
  if (!result.success) return result

  return {
    success: true,
    values: result.matches.map(m => m.value),
    unique: [...new Set(result.matches.map(m => m.value))]
  }
}

// 验证正则表达式语法
export function validatePattern(pattern) {
  try {
    new RegExp(pattern)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e.message }
  }
}

// 转义正则特殊字符
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 从文本生成匹配正则
export function generatePattern(text) {
  // 简单的模式生成
  const escaped = escapeRegex(text)
  return {
    exact: `^${escaped}$`,
    contains: escaped,
    word: `\\b${escaped}\\b`
  }
}

/**
 * 解释正则表达式（小白友好）
 * @param {string} pattern - 正则表达式字符串
 * @returns {Array} - 解释列表
 */
export function explainPattern(pattern) {
  if (!pattern) return []

  const explanations = []
  let i = 0

  while (i < pattern.length) {
    const char = pattern[i]
    const next = pattern[i + 1]

    // 转义字符
    if (char === '\\' && next) {
      const escapeMap = {
        'd': { char: '\\d', desc: '任意数字(0-9)' },
        'D': { char: '\\D', desc: '非数字字符' },
        'w': { char: '\\w', desc: '单词字符(字母、数字、下划线)' },
        'W': { char: '\\W', desc: '非单词字符' },
        's': { char: '\\s', desc: '空白字符(空格、制表符等)' },
        'S': { char: '\\S', desc: '非空白字符' },
        'n': { char: '\\n', desc: '换行符' },
        't': { char: '\\t', desc: '制表符' },
        'b': { char: '\\b', desc: '单词边界' },
        'B': { char: '\\B', desc: '非单词边界' },
      }
      if (escapeMap[next]) {
        explanations.push(escapeMap[next])
        i += 2
        continue
      }
      // 转义特殊字符
      explanations.push({ char: `\\${next}`, desc: `字面字符 ${next}` })
      i += 2
      continue
    }

    // 特殊字符
    const specialMap = {
      '.': '任意字符(除换行)',
      '*': '前一个字符出现0次或多次',
      '+': '前一个字符出现1次或多次',
      '?': '前一个字符出现0次或1次',
      '^': '字符串开头',
      '$': '字符串结尾',
      '|': '或(匹配左边或右边)',
    }
    if (specialMap[char]) {
      explanations.push({ char, desc: specialMap[char] })
      i++
      continue
    }

    // 字符集 [...]
    if (char === '[') {
      let end = pattern.indexOf(']', i)
      if (end !== -1) {
        const set = pattern.slice(i, end + 1)
        const isNegate = pattern[i + 1] === '^'
        explanations.push({
          char: set,
          desc: isNegate ? `不是${set.slice(2, -1)}中的任意字符` : `${set.slice(1, -1)}中的任意字符`
        })
        i = end + 1
        continue
      }
    }

    // 分组 (...)
    if (char === '(') {
      let depth = 1, end = i + 1
      while (end < pattern.length && depth > 0) {
        if (pattern[end] === '(') depth++
        if (pattern[end] === ')') depth--
        end++
      }
      const group = pattern.slice(i, end)
      explanations.push({ char: group, desc: `分组: ${group.slice(1, -1)}` })
      i = end
      continue
    }

    // 量词 {n} {n,} {n,m}
    if (char === '{') {
      const end = pattern.indexOf('}', i)
      if (end !== -1) {
        const quantifier = pattern.slice(i, end + 1)
        const nums = quantifier.slice(1, -1).split(',')
        let desc = ''
        if (nums.length === 1) {
          desc = `恰好${nums[0]}次`
        } else if (nums[1] === '') {
          desc = `至少${nums[0]}次`
        } else {
          desc = `${nums[0]}到${nums[1]}次`
        }
        explanations.push({ char: quantifier, desc: `前一个字符出现${desc}` })
        i = end + 1
        continue
      }
    }

    // 普通字符
    explanations.push({ char, desc: `字面字符 "${char}"` })
    i++
  }

  return explanations
}

// 常用正则快速提取
export function quickExtract(text, type) {
  const pattern = REGEX_PATTERNS[type]
  if (!pattern) return { success: false, error: '未知的提取类型' }

  return extractMatches(pattern.pattern, text)
}
