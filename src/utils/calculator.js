/**
 * 智能计算器工具
 * 支持数学表达式、单位换算、进制转换
 */

// 安全的数学表达式计算
export function evaluate(expression) {
  try {
    // 清理表达式
    let expr = expression.trim()
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/％/g, '%')
      .replace(/，/g, '')
      .replace(/\s+/g, '')

    // 处理百分比
    expr = expr.replace(/(\d+)%/g, '($1/100)')

    // 处理幂次 (^)
    expr = expr.replace(/\^/g, '**')

    // 安全检查：只允许数字、运算符、括号、小数点
    if (!/^[0-9+\-*/.()%\s]+$/.test(expr.replace(/\*\*/g, ''))) {
      return { success: false, error: '包含不支持的字符' }
    }

    // 使用 Function 进行计算（比 eval 安全一些）
    const result = new Function('return ' + expr)()

    if (typeof result !== 'number' || !isFinite(result)) {
      return { success: false, error: '计算结果无效' }
    }

    // 格式化结果
    const formatted = formatNumber(result)
    return { success: true, result, formatted }
  } catch (e) {
    return { success: false, error: '表达式错误' }
  }
}

// 格式化数字
function formatNumber(num) {
  if (Number.isInteger(num)) {
    return num.toLocaleString()
  }
  // 保留最多10位小数，去除末尾0
  return parseFloat(num.toFixed(10)).toLocaleString(undefined, { maximumFractionDigits: 10 })
}

// 检测是否为数学表达式
export function isMathExpression(text) {
  const trimmed = text.trim()
  // 包含运算符且主要由数字和运算符组成
  if (!/[+\-*/^%]/.test(trimmed)) return false
  // 清理后检查
  const cleaned = trimmed.replace(/[0-9+\-*/.()%^×÷％，\s]/g, '')
  return cleaned.length === 0 && /\d/.test(trimmed)
}

// ===== 单位换算 =====

// 长度单位（基准：米）
const LENGTH_UNITS = {
  km: { factor: 1000, name: '千米' },
  m: { factor: 1, name: '米' },
  cm: { factor: 0.01, name: '厘米' },
  mm: { factor: 0.001, name: '毫米' },
  mi: { factor: 1609.344, name: '英里' },
  yd: { factor: 0.9144, name: '码' },
  ft: { factor: 0.3048, name: '英尺' },
  in: { factor: 0.0254, name: '英寸' }
}

// 重量单位（基准：千克）
const WEIGHT_UNITS = {
  t: { factor: 1000, name: '吨' },
  kg: { factor: 1, name: '千克' },
  g: { factor: 0.001, name: '克' },
  mg: { factor: 0.000001, name: '毫克' },
  lb: { factor: 0.453592, name: '磅' },
  oz: { factor: 0.0283495, name: '盎司' },
  斤: { factor: 0.5, name: '斤' }
}

// 温度单位
const TEMP_UNITS = ['c', '°c', 'celsius', 'f', '°f', 'fahrenheit', 'k', 'kelvin']

// 数据大小（基准：字节）
const DATA_UNITS = {
  b: { factor: 1, name: 'B' },
  kb: { factor: 1024, name: 'KB' },
  mb: { factor: 1024 * 1024, name: 'MB' },
  gb: { factor: 1024 * 1024 * 1024, name: 'GB' },
  tb: { factor: 1024 * 1024 * 1024 * 1024, name: 'TB' }
}

// 解析单位值
function parseUnitValue(text) {
  const match = text.trim().match(/^([\d,.]+)\s*([a-zA-Z°\u4e00-\u9fa5]+)$/i)
  if (!match) return null
  const value = parseFloat(match[1].replace(/,/g, ''))
  const unit = match[2].toLowerCase()
  return { value, unit }
}

// 长度转换
export function convertLength(value, fromUnit, toUnit) {
  const from = LENGTH_UNITS[fromUnit.toLowerCase()]
  const to = LENGTH_UNITS[toUnit.toLowerCase()]
  if (!from || !to) return null
  const meters = value * from.factor
  return meters / to.factor
}

// 重量转换
export function convertWeight(value, fromUnit, toUnit) {
  const from = WEIGHT_UNITS[fromUnit.toLowerCase()]
  const to = WEIGHT_UNITS[toUnit.toLowerCase()]
  if (!from || !to) return null
  const kg = value * from.factor
  return kg / to.factor
}

// 温度转换
export function convertTemperature(value, fromUnit, toUnit) {
  const from = fromUnit.toLowerCase().replace('°', '')
  const to = toUnit.toLowerCase().replace('°', '')

  // 先转为摄氏度
  let celsius
  if (from === 'c' || from === 'celsius') {
    celsius = value
  } else if (from === 'f' || from === 'fahrenheit') {
    celsius = (value - 32) * 5 / 9
  } else if (from === 'k' || from === 'kelvin') {
    celsius = value - 273.15
  } else {
    return null
  }

  // 从摄氏度转为目标单位
  if (to === 'c' || to === 'celsius') {
    return celsius
  } else if (to === 'f' || to === 'fahrenheit') {
    return celsius * 9 / 5 + 32
  } else if (to === 'k' || to === 'kelvin') {
    return celsius + 273.15
  }
  return null
}

// 数据大小转换
export function convertDataSize(value, fromUnit, toUnit) {
  const from = DATA_UNITS[fromUnit.toLowerCase()]
  const to = DATA_UNITS[toUnit.toLowerCase()]
  if (!from || !to) return null
  const bytes = value * from.factor
  return bytes / to.factor
}

// 智能单位转换
export function smartConvert(text) {
  const parsed = parseUnitValue(text)
  if (!parsed) return null

  const { value, unit } = parsed
  const results = []

  // 检测单位类型并转换
  if (LENGTH_UNITS[unit]) {
    Object.keys(LENGTH_UNITS).forEach(u => {
      if (u !== unit) {
        const converted = convertLength(value, unit, u)
        results.push({ value: converted, unit: u, name: LENGTH_UNITS[u].name })
      }
    })
    return { type: '长度', from: { value, unit, name: LENGTH_UNITS[unit].name }, results }
  }

  if (WEIGHT_UNITS[unit]) {
    Object.keys(WEIGHT_UNITS).forEach(u => {
      if (u !== unit) {
        const converted = convertWeight(value, unit, u)
        results.push({ value: converted, unit: u, name: WEIGHT_UNITS[u].name })
      }
    })
    return { type: '重量', from: { value, unit, name: WEIGHT_UNITS[unit].name }, results }
  }

  if (DATA_UNITS[unit]) {
    Object.keys(DATA_UNITS).forEach(u => {
      if (u !== unit) {
        const converted = convertDataSize(value, unit, u)
        results.push({ value: converted, unit: u, name: DATA_UNITS[u].name })
      }
    })
    return { type: '数据大小', from: { value, unit, name: DATA_UNITS[unit].name }, results }
  }

  // 温度
  const tempUnit = unit.replace('°', '')
  if (['c', 'f', 'k', 'celsius', 'fahrenheit', 'kelvin'].includes(tempUnit)) {
    const targets = [
      { unit: 'c', name: '摄氏度' },
      { unit: 'f', name: '华氏度' },
      { unit: 'k', name: '开尔文' }
    ]
    targets.forEach(t => {
      if (t.unit !== tempUnit[0]) {
        const converted = convertTemperature(value, tempUnit, t.unit)
        results.push({ value: converted, unit: t.unit.toUpperCase(), name: t.name })
      }
    })
    const fromName = tempUnit[0] === 'c' ? '摄氏度' : tempUnit[0] === 'f' ? '华氏度' : '开尔文'
    return { type: '温度', from: { value, unit: unit.toUpperCase(), name: fromName }, results }
  }

  return null
}

// ===== 进制转换 =====

// 检测进制
export function detectBase(text) {
  const t = text.trim().toLowerCase()
  if (/^0x[0-9a-f]+$/i.test(t)) return { value: t, base: 16, prefix: '0x' }
  if (/^0b[01]+$/i.test(t)) return { value: t, base: 2, prefix: '0b' }
  if (/^0o[0-7]+$/i.test(t)) return { value: t, base: 8, prefix: '0o' }
  if (/^[0-9a-f]+h$/i.test(t)) return { value: t.slice(0, -1), base: 16, suffix: 'h' }
  if (/^\d+$/.test(t)) return { value: t, base: 10, prefix: '' }
  return null
}

// 进制转换
export function convertBase(text) {
  const detected = detectBase(text)
  if (!detected) return null

  const { value, base, prefix, suffix } = detected
  let decimal

  try {
    if (base === 16) {
      decimal = parseInt(value.replace(/^0x/i, '').replace(/h$/i, ''), 16)
    } else if (base === 2) {
      decimal = parseInt(value.replace(/^0b/i, ''), 2)
    } else if (base === 8) {
      decimal = parseInt(value.replace(/^0o/i, ''), 8)
    } else {
      decimal = parseInt(value, 10)
    }

    if (isNaN(decimal)) return null

    return {
      decimal: decimal.toString(),
      hex: '0x' + decimal.toString(16).toUpperCase(),
      binary: '0b' + decimal.toString(2),
      octal: '0o' + decimal.toString(8),
      original: { value, base }
    }
  } catch (e) {
    return null
  }
}

// 检测是否为进制数
export function isBaseNumber(text) {
  return detectBase(text) !== null
}

// 检测是否为单位值
export function isUnitValue(text) {
  return parseUnitValue(text) !== null
}

// ===== 多行数字统计 =====

/**
 * 从多行文本中提取数字
 * @param {string} text - 多行文本
 * @returns {number[]} 数字数组
 */
export function extractNumbers(text) {
  if (!text) return []

  // 匹配数字（包括负数、小数）
  const matches = text.match(/-?[\d,]+\.?\d*/g)
  if (!matches) return []

  return matches
    .map(n => parseFloat(n.replace(/,/g, '')))
    .filter(n => !isNaN(n) && isFinite(n))
}

/**
 * 计算多行数字的统计信息
 * @param {string} text - 多行文本
 * @returns {object} 统计结果
 */
export function calculateStats(text) {
  const numbers = extractNumbers(text)

  if (numbers.length === 0) {
    return { success: false, error: '未找到有效数字' }
  }

  // 排序用于中位数
  const sorted = [...numbers].sort((a, b) => a - b)

  // 求和
  const sum = numbers.reduce((acc, n) => acc + n, 0)

  // 平均值
  const avg = sum / numbers.length

  // 中位数
  let median
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2
  } else {
    median = sorted[mid]
  }

  // 最大值、最小值
  const max = Math.max(...numbers)
  const min = Math.min(...numbers)

  // 方差和标准差
  const variance = numbers.reduce((acc, n) => acc + Math.pow(n - avg, 2), 0) / numbers.length
  const stdDev = Math.sqrt(variance)

  return {
    success: true,
    count: numbers.length,
    sum: formatNumber(sum),
    avg: formatNumber(avg),
    median: formatNumber(median),
    max: formatNumber(max),
    min: formatNumber(min),
    range: formatNumber(max - min),
    stdDev: formatNumber(stdDev),
    numbers
  }
}

/**
 * 检测是否为多行数字
 * @param {string} text - 输入文本
 * @returns {boolean}
 */
export function isMultiLineNumbers(text) {
  if (!text) return false
  const lines = text.trim().split(/\n/)
  if (lines.length < 2) return false

  const numbers = extractNumbers(text)
  return numbers.length >= 2
}

/**
 * 格式化统计结果为字符串
 * @param {object} stats - 统计结果
 * @returns {string}
 */
export function formatStats(stats) {
  if (!stats.success) return stats.error

  return `统计结果（共 ${stats.count} 个数字）

求和: ${stats.sum}
平均值: ${stats.avg}
中位数: ${stats.median}
最大值: ${stats.max}
最小值: ${stats.min}
范围: ${stats.range}
标准差: ${stats.stdDev}`
}
