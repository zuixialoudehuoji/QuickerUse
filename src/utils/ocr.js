/**
 * OCR 文字识别工具
 * 使用 Tesseract.js 进行本地识别
 */

import { createWorker } from 'tesseract.js'

// 识别状态
let isRecognizing = false
let currentWorker = null

/**
 * 识别图片中的文字
 * @param {string|Blob|File} image - 图片源（Base64、Blob、File）
 * @param {object} options - 选项
 * @param {function} onProgress - 进度回调
 * @returns {Promise<object>}
 */
export async function recognize(image, options = {}, onProgress = null) {
  const {
    lang = 'chi_sim+eng',  // 默认中英文混合
  } = options

  isRecognizing = true

  try {
    // 创建 worker
    const worker = await createWorker(lang, 1, {
      logger: (m) => {
        if (onProgress && m.progress !== undefined) {
          onProgress(Math.round(m.progress * 100))
        }
      }
    })

    currentWorker = worker

    // 识别图片
    const result = await worker.recognize(image)

    // 终止 worker
    await worker.terminate()
    currentWorker = null
    isRecognizing = false

    return {
      success: true,
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      words: result.data.words?.length || 0,
      lines: result.data.lines?.length || 0
    }
  } catch (error) {
    isRecognizing = false
    console.error('[OCR] Recognition error:', error)
    // 根据错误类型提供更具体的错误信息
    let errorMsg = '识别失败'
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
      errorMsg = '首次使用需联网下载语言包，请检查网络后重试'
    } else if (error.message?.includes('Worker')) {
      errorMsg = '识别引擎初始化失败，请重试'
    } else if (error.message) {
      errorMsg = error.message
    }
    return {
      success: false,
      error: errorMsg
    }
  }
}

/**
 * 从剪贴板图片识别文字
 * @param {string} base64Image - Base64 图片数据
 * @param {function} onProgress - 进度回调
 * @returns {Promise<object>}
 */
export async function recognizeFromClipboard(base64Image, onProgress = null) {
  if (!base64Image) {
    return { success: false, error: '剪贴板中没有图片' }
  }

  // 如果是纯 base64，添加前缀
  if (!base64Image.startsWith('data:')) {
    base64Image = `data:image/png;base64,${base64Image}`
  }

  return recognize(base64Image, {}, onProgress)
}

/**
 * 从文件识别文字
 * @param {File} file - 图片文件
 * @param {function} onProgress - 进度回调
 * @returns {Promise<object>}
 */
export async function recognizeFromFile(file, onProgress = null) {
  if (!file || !file.type.startsWith('image/')) {
    return { success: false, error: '请选择图片文件' }
  }

  return recognize(file, {}, onProgress)
}

/**
 * 取消识别
 */
export function cancelRecognize() {
  if (currentWorker) {
    currentWorker.terminate()
    currentWorker = null
  }
  isRecognizing = false
}

/**
 * 获取识别状态
 */
export function getStatus() {
  return { isRecognizing }
}

/**
 * 支持的语言列表
 */
export const LANGUAGES = [
  { code: 'chi_sim', name: '简体中文' },
  { code: 'chi_tra', name: '繁体中文' },
  { code: 'eng', name: '英文' },
  { code: 'jpn', name: '日文' },
  { code: 'kor', name: '韩文' },
  { code: 'chi_sim+eng', name: '中英混合' }
]

/**
 * 清理识别结果文本
 * @param {string} text - 原始文本
 * @returns {string}
 */
export function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')           // 合并多个空白
    .replace(/\n{3,}/g, '\n\n')     // 合并多个换行
    .trim()
}

/**
 * 提取文本中的特定内容
 * @param {string} text - OCR 识别的文本
 * @param {string} type - 提取类型
 * @returns {string[]}
 */
export function extractFromText(text, type) {
  const patterns = {
    phone: /1[3-9]\d{9}/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    url: /https?:\/\/[^\s]+/g,
    number: /\d+\.?\d*/g,
    idCard: /[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g
  }

  const pattern = patterns[type]
  if (!pattern) return []

  return [...new Set(text.match(pattern) || [])]
}
