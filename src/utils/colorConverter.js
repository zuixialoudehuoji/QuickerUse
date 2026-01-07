/**
 * 颜色格式转换工具
 * 支持 HEX/RGB/HSL/CMYK 格式互转
 */

// 解析颜色字符串
export function parseColor(colorStr) {
  const str = colorStr.trim().toLowerCase()

  // HEX 格式
  const hexMatch = str.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    return { type: 'hex', r, g, b, a }
  }

  // RGB/RGBA 格式
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (rgbMatch) {
    return {
      type: 'rgb',
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
    }
  }

  // HSL/HSLA 格式
  const hslMatch = str.match(/hsla?\s*\(\s*(\d+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*([\d.]+))?\s*\)/)
  if (hslMatch) {
    return {
      type: 'hsl',
      h: parseInt(hslMatch[1]),
      s: parseFloat(hslMatch[2]),
      l: parseFloat(hslMatch[3]),
      a: hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1
    }
  }

  return null
}

// RGB 转 HEX
export function rgbToHex(r, g, b, a = 1) {
  const toHex = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  let hex = '#' + toHex(r) + toHex(g) + toHex(b)
  if (a < 1) {
    hex += toHex(Math.round(a * 255))
  }
  return hex.toUpperCase()
}

// RGB 转 HSL
export function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

// HSL 转 RGB
export function hslToRgb(h, s, l) {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

// RGB 转 CMYK
export function rgbToCmyk(r, g, b) {
  r /= 255
  g /= 255
  b /= 255

  const k = 1 - Math.max(r, g, b)
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }

  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  }
}

// CMYK 转 RGB
export function cmykToRgb(c, m, y, k) {
  c /= 100
  m /= 100
  y /= 100
  k /= 100

  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k))
  }
}

// 转换为所有格式
export function convertColor(colorStr) {
  const parsed = parseColor(colorStr)
  if (!parsed) {
    return { success: false, error: '无法识别的颜色格式' }
  }

  let r, g, b, a = parsed.a || 1

  if (parsed.type === 'hex' || parsed.type === 'rgb') {
    r = parsed.r
    g = parsed.g
    b = parsed.b
  } else if (parsed.type === 'hsl') {
    const rgb = hslToRgb(parsed.h, parsed.s, parsed.l)
    r = rgb.r
    g = rgb.g
    b = rgb.b
  }

  const hsl = rgbToHsl(r, g, b)
  const cmyk = rgbToCmyk(r, g, b)

  return {
    success: true,
    hex: rgbToHex(r, g, b, a),
    rgb: a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`,
    hsl: a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    values: { r, g, b, a, ...hsl, ...cmyk }
  }
}

// 检测是否为颜色字符串
export function isColorString(text) {
  return parseColor(text) !== null
}

// 调整亮度
export function adjustBrightness(colorStr, percent) {
  const result = convertColor(colorStr)
  if (!result.success) return result

  const { r, g, b, a } = result.values
  const factor = 1 + percent / 100

  return rgbToHex(
    Math.min(255, Math.max(0, r * factor)),
    Math.min(255, Math.max(0, g * factor)),
    Math.min(255, Math.max(0, b * factor)),
    a
  )
}

// 调整饱和度
export function adjustSaturation(colorStr, percent) {
  const result = convertColor(colorStr)
  if (!result.success) return result

  const { r, g, b, a } = result.values
  const hsl = rgbToHsl(r, g, b)

  hsl.s = Math.min(100, Math.max(0, hsl.s + percent))
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)

  return rgbToHex(rgb.r, rgb.g, rgb.b, a)
}

// 获取互补色
export function getComplementary(colorStr) {
  const result = convertColor(colorStr)
  if (!result.success) return result

  const { r, g, b, a } = result.values
  const hsl = rgbToHsl(r, g, b)

  hsl.h = (hsl.h + 180) % 360
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)

  return rgbToHex(rgb.r, rgb.g, rgb.b, a)
}

// 生成色板（变亮和变暗）
export function generatePalette(colorStr, steps = 5) {
  const result = convertColor(colorStr)
  if (!result.success) return []

  const { r, g, b, a } = result.values
  const hsl = rgbToHsl(r, g, b)
  const palette = []

  for (let i = 0; i < steps; i++) {
    const lightness = 10 + (80 * i / (steps - 1))
    const rgb = hslToRgb(hsl.h, hsl.s, lightness)
    palette.push(rgbToHex(rgb.r, rgb.g, rgb.b, a))
  }

  return palette
}

// 预设基础颜色
export const PRESET_COLORS = [
  // 红色系
  '#FF0000', '#FF4444', '#FF6666', '#FF8888', '#FFAAAA',
  // 橙色系
  '#FF6600', '#FF8833', '#FFAA66', '#FFCC99', '#FFDDBB',
  // 黄色系
  '#FFFF00', '#FFFF44', '#FFFF88', '#FFFFAA', '#FFFFCC',
  // 绿色系
  '#00FF00', '#44FF44', '#66FF66', '#88FF88', '#AAFFAA',
  // 青色系
  '#00FFFF', '#44FFFF', '#66FFFF', '#88FFFF', '#AAFFFF',
  // 蓝色系
  '#0000FF', '#4444FF', '#6666FF', '#8888FF', '#AAAAFF',
  // 紫色系
  '#8800FF', '#AA44FF', '#BB66FF', '#CC88FF', '#DDAAFF',
  // 粉色系
  '#FF00FF', '#FF44FF', '#FF66FF', '#FF88FF', '#FFAAFF',
  // 灰度
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'
]

// 常用Web颜色
export const WEB_COLORS = {
  '红色': '#FF0000',
  '橙色': '#FFA500',
  '黄色': '#FFFF00',
  '绿色': '#00FF00',
  '青色': '#00FFFF',
  '蓝色': '#0000FF',
  '紫色': '#800080',
  '粉色': '#FFC0CB',
  '白色': '#FFFFFF',
  '黑色': '#000000',
  '灰色': '#808080',
  '棕色': '#A52A2A'
}
