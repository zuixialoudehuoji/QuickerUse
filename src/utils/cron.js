/**
 * Cron 表达式工具
 * 支持 Cron 表达式的解析、生成和说明
 */

// Cron 字段说明
export const CRON_FIELDS = [
  { name: '秒', range: '0-59', special: ', - * /', desc: '可选字段' },
  { name: '分', range: '0-59', special: ', - * /', desc: '必填' },
  { name: '时', range: '0-23', special: ', - * /', desc: '必填' },
  { name: '日', range: '1-31', special: ', - * / ? L W', desc: '必填' },
  { name: '月', range: '1-12', special: ', - * /', desc: '必填，或 JAN-DEC' },
  { name: '周', range: '0-6', special: ', - * / ? L #', desc: '必填，0=周日，或 SUN-SAT' },
  { name: '年', range: '1970-2099', special: ', - * /', desc: '可选字段' },
]

// 特殊字符说明
export const CRON_SPECIAL_CHARS = [
  { char: '*', name: '任意值', desc: '匹配该字段的所有可能值' },
  { char: '?', name: '不指定', desc: '用于日和周字段，表示不指定具体值' },
  { char: '-', name: '范围', desc: '如 10-12 表示 10、11、12' },
  { char: ',', name: '列表', desc: '如 1,3,5 表示这几个值' },
  { char: '/', name: '步长', desc: '如 */5 表示每隔5个单位，0/5 从0开始每5个' },
  { char: 'L', name: '最后', desc: '日字段表示月末，周字段表示周六' },
  { char: 'W', name: '工作日', desc: '如 15W 表示最接近15号的工作日' },
  { char: '#', name: '第几个', desc: '如 2#3 表示第3个周二' },
]

// 常用 Cron 模板
export const CRON_PRESETS = [
  { name: '每分钟', cron: '* * * * *', desc: '每分钟执行一次' },
  { name: '每小时', cron: '0 * * * *', desc: '每小时整点执行' },
  { name: '每天零点', cron: '0 0 * * *', desc: '每天凌晨0点执行' },
  { name: '每天8点', cron: '0 8 * * *', desc: '每天早上8点执行' },
  { name: '每天18点', cron: '0 18 * * *', desc: '每天下午6点执行' },
  { name: '每周一', cron: '0 0 * * 1', desc: '每周一凌晨0点执行' },
  { name: '每月1号', cron: '0 0 1 * *', desc: '每月1号凌晨0点执行' },
  { name: '每月最后一天', cron: '0 0 L * *', desc: '每月最后一天凌晨执行' },
  { name: '工作日8点', cron: '0 8 * * 1-5', desc: '周一到周五早上8点执行' },
  { name: '每5分钟', cron: '*/5 * * * *', desc: '每5分钟执行一次' },
  { name: '每30分钟', cron: '*/30 * * * *', desc: '每30分钟执行一次' },
  { name: '每2小时', cron: '0 */2 * * *', desc: '每2小时执行一次' },
]

/**
 * 解析 Cron 表达式，返回人类可读的说明
 * @param {string} cron - Cron 表达式
 * @returns {object} - { valid: boolean, desc: string, parts: array }
 */
export function parseCron(cron) {
  if (!cron || typeof cron !== 'string') {
    return { valid: false, desc: '请输入 Cron 表达式', parts: [] }
  }

  const parts = cron.trim().split(/\s+/)

  // 支持 5-7 个字段
  if (parts.length < 5 || parts.length > 7) {
    return {
      valid: false,
      desc: `Cron 表达式应有 5-7 个字段，当前有 ${parts.length} 个`,
      parts
    }
  }

  // 标准化为 7 字段格式（秒 分 时 日 月 周 年）
  let normalized = []
  if (parts.length === 5) {
    // 分 时 日 月 周
    normalized = ['0', ...parts, '*']
  } else if (parts.length === 6) {
    // 秒 分 时 日 月 周 或 分 时 日 月 周 年
    // 简单判断：如果第一个字段像秒，就是带秒的格式
    normalized = [...parts, '*']
  } else {
    normalized = parts
  }

  const [second, minute, hour, day, month, week, year] = normalized
  const descriptions = []

  // 解析各字段
  descriptions.push(describeField(second, '秒', 0, 59))
  descriptions.push(describeField(minute, '分', 0, 59))
  descriptions.push(describeField(hour, '时', 0, 23))
  descriptions.push(describeDay(day))
  descriptions.push(describeMonth(month))
  descriptions.push(describeWeek(week))
  descriptions.push(describeYear(year))

  // 生成整体描述
  const desc = generateDescription(normalized)

  return {
    valid: true,
    desc,
    parts: normalized,
    details: descriptions
  }
}

/**
 * 描述单个字段
 */
function describeField(value, name, min, max) {
  if (value === '*') return `每${name}`
  if (value === '?') return `不指定${name}`

  if (value.includes('/')) {
    const [start, step] = value.split('/')
    if (start === '*') return `每隔 ${step} ${name}`
    return `从 ${start} ${name}开始，每隔 ${step} ${name}`
  }

  if (value.includes('-')) {
    const [from, to] = value.split('-')
    return `${from} 到 ${to} ${name}`
  }

  if (value.includes(',')) {
    return `第 ${value} ${name}`
  }

  return `第 ${value} ${name}`
}

/**
 * 描述日字段
 */
function describeDay(value) {
  if (value === '*') return '每天'
  if (value === '?') return '不指定日期'
  if (value === 'L') return '每月最后一天'
  if (value.includes('W')) {
    const day = value.replace('W', '')
    return `最接近 ${day} 号的工作日`
  }
  return describeField(value, '日', 1, 31)
}

/**
 * 描述月字段
 */
function describeMonth(value) {
  const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '十一月', '十二月']
  if (value === '*') return '每月'
  if (/^\d+$/.test(value) && parseInt(value) >= 1 && parseInt(value) <= 12) {
    return monthNames[parseInt(value)]
  }
  return describeField(value, '月', 1, 12)
}

/**
 * 描述周字段
 */
function describeWeek(value) {
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  if (value === '*') return '每周'
  if (value === '?') return '不指定星期'
  if (value === 'L') return '周六'

  if (value.includes('#')) {
    const [week, nth] = value.split('#')
    return `每月第 ${nth} 个${weekNames[parseInt(week)] || '周' + week}`
  }

  if (/^\d+$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 6) {
    return weekNames[parseInt(value)]
  }

  return describeField(value, '周', 0, 6)
}

/**
 * 描述年字段
 */
function describeYear(value) {
  if (value === '*') return '每年'
  return `${value} 年`
}

/**
 * 生成整体描述
 */
function generateDescription(parts) {
  const [second, minute, hour, day, month, week, year] = parts
  let desc = ''

  // 简化常见模式
  if (minute === '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
    return '每分钟执行'
  }
  if (minute === '0' && hour === '*' && day === '*' && month === '*' && week === '*') {
    return '每小时整点执行'
  }
  if (minute === '0' && hour === '0' && day === '*' && month === '*' && week === '*') {
    return '每天凌晨0点执行'
  }

  // 构建描述
  if (year !== '*') desc += `${year}年 `
  if (month !== '*') desc += describeMonth(month) + ' '
  if (week !== '*' && week !== '?') desc += describeWeek(week) + ' '
  if (day !== '*' && day !== '?') desc += describeDay(day) + ' '
  if (hour !== '*') desc += `${hour}点 `
  if (minute !== '*') desc += `${minute}分 `
  if (second !== '0' && second !== '*') desc += `${second}秒 `

  desc += '执行'
  return desc.trim()
}

/**
 * 根据配置生成 Cron 表达式
 * @param {object} config - { minute, hour, day, month, week }
 * @returns {string}
 */
export function generateCron(config) {
  const {
    second = '*',
    minute = '*',
    hour = '*',
    day = '*',
    month = '*',
    week = '*'
  } = config

  // 如果指定了周，日应该用 ?
  const finalDay = week !== '*' ? '?' : day
  const finalWeek = day !== '*' && day !== '?' ? '?' : week

  return `${minute} ${hour} ${finalDay} ${month} ${finalWeek}`
}

/**
 * 计算下N次执行时间
 * @param {string} cron - Cron 表达式
 * @param {number} count - 计算次数
 * @returns {Array<Date>}
 */
export function getNextExecutions(cron, count = 5) {
  // 简化实现：只支持常见模式
  const result = []
  const now = new Date()
  const parsed = parseCron(cron)

  if (!parsed.valid) return result

  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return result

  // 简单实现：基于当前时间推算
  let [minute, hour, day, month, week] = parts.length === 5 ? parts : parts.slice(1, 6)

  for (let i = 0; i < count * 100 && result.length < count; i++) {
    const next = new Date(now.getTime() + i * 60000) // 每分钟检查

    let match = true

    if (minute !== '*' && !matchField(minute, next.getMinutes())) match = false
    if (hour !== '*' && !matchField(hour, next.getHours())) match = false
    if (day !== '*' && day !== '?' && !matchField(day, next.getDate())) match = false
    if (month !== '*' && !matchField(month, next.getMonth() + 1)) match = false
    if (week !== '*' && week !== '?' && !matchField(week, next.getDay())) match = false

    if (match && (result.length === 0 || next.getTime() > result[result.length - 1].getTime())) {
      result.push(new Date(next))
    }
  }

  return result
}

/**
 * 检查值是否匹配字段
 */
function matchField(field, value) {
  if (field === '*') return true

  if (field.includes('/')) {
    const [start, step] = field.split('/')
    const startVal = start === '*' ? 0 : parseInt(start)
    return (value - startVal) % parseInt(step) === 0
  }

  if (field.includes('-')) {
    const [from, to] = field.split('-').map(Number)
    return value >= from && value <= to
  }

  if (field.includes(',')) {
    return field.split(',').map(Number).includes(value)
  }

  return parseInt(field) === value
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 验证 Cron 表达式是否有效
 * @param {string} cron - Cron 表达式
 * @returns {boolean}
 */
export function isValidCron(cron) {
  if (!cron || typeof cron !== 'string') return false
  const parts = cron.trim().split(/\s+/)
  return parts.length >= 5 && parts.length <= 7
}
