/**
 * 剪贴板历史管理器
 * 自动记录剪贴板内容，支持文本和图片
 */

import { clipboard, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'

class ClipboardHistory {
  constructor(options = {}) {
    this.maxItems = options.maxItems || 50          // 最大记录数
    this.checkInterval = options.checkInterval || 500 // 检查间隔(ms)
    this.history = []                                // 历史记录
    this.lastText = ''                               // 上次文本内容
    this.lastImageHash = ''                          // 上次图片哈希
    this.timer = null                                // 定时器
    this.dataPath = options.dataPath || ''           // 数据存储路径
    this.isPaused = false                            // 是否暂停监听
    this.onUpdate = options.onUpdate || null         // 更新回调

    // 敏感内容关键词（不记录包含这些的内容）
    this.sensitivePatterns = [
      /password/i,
      /密码/,
      /secret/i,
      /token/i,
      /api[_-]?key/i
    ]
  }

  /**
   * 初始化并加载历史记录
   */
  init(dataPath) {
    this.dataPath = dataPath
    console.log('[ClipboardHistory] Initializing with dataPath:', dataPath)
    this.loadHistory()
    this.startWatching()
    console.log('[ClipboardHistory] Initialized, history count:', this.history.length)
  }

  /**
   * 加载历史记录
   */
  loadHistory() {
    try {
      const historyFile = path.join(this.dataPath, 'clipboard-history.json')
      if (fs.existsSync(historyFile)) {
        const data = fs.readFileSync(historyFile, 'utf-8')
        const parsed = JSON.parse(data)

        // 兼容处理，确保数据有效
        this.history = parsed.filter(item => {
          // 基本验证：必须有id
          if (!item || !item.id) return false

          // 设置默认类型
          if (!item.type) item.type = 'text'

          // 图片类型处理
          if (item.type === 'image') {
            // 尝试从 thumbnail 恢复 content
            if (item.thumbnail && !item.content) {
              item.content = item.thumbnail
            }
            // 只要有任何图片数据就保留
            const hasImage = (item.thumbnail && item.thumbnail.length > 10) ||
                            (item.content && item.content.length > 10)
            return hasImage
          }

          // 文本类型处理
          // 尝试互相恢复
          if (!item.content && item.preview) {
            item.content = item.preview
          }
          if (!item.preview && item.content) {
            item.preview = typeof item.content === 'string' ? item.content.substring(0, 100) : ''
          }

          // 检查是否有有效文本内容（长度大于0）
          const hasContent = item.content && typeof item.content === 'string' && item.content.length > 0
          const hasPreview = item.preview && typeof item.preview === 'string' && item.preview.length > 0
          return hasContent || hasPreview
        })

        console.log('[ClipboardHistory] Loaded', this.history.length, 'items from', historyFile)
      } else {
        console.log('[ClipboardHistory] No history file found')
      }
    } catch (err) {
      console.error('加载剪贴板历史失败:', err)
      this.history = []
    }
  }

  /**
   * 保存历史记录
   */
  saveHistory() {
    try {
      const historyFile = path.join(this.dataPath, 'clipboard-history.json')
      // 保存时保留图片的完整内容（用于后续使用）
      const dataToSave = this.history.map(item => ({
        id: item.id,
        type: item.type,
        content: item.content || '', // 保存完整内容（文本或图片base64）
        thumbnail: item.thumbnail || '',
        preview: item.preview || '',
        timestamp: item.timestamp,
        pinned: item.pinned || false
      }))
      fs.writeFileSync(historyFile, JSON.stringify(dataToSave, null, 2))
    } catch (err) {
      console.error('保存剪贴板历史失败:', err)
    }
  }

  /**
   * 开始监听剪贴板
   */
  startWatching() {
    if (this.timer) return

    // 初始化当前剪贴板内容
    this.lastText = clipboard.readText() || ''
    const img = clipboard.readImage()
    if (!img.isEmpty()) {
      this.lastImageHash = this.getImageHash(img)
    }

    this.timer = setInterval(() => {
      if (this.isPaused) return
      this.checkClipboard()
    }, this.checkInterval)
  }

  /**
   * 停止监听
   */
  stopWatching() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * 暂停监听（执行操作时避免记录）
   */
  pause() {
    this.isPaused = true
  }

  /**
   * 恢复监听
   */
  resume() {
    this.isPaused = false
    // 更新当前状态，避免重复记录
    this.lastText = clipboard.readText() || ''
    const img = clipboard.readImage()
    if (!img.isEmpty()) {
      this.lastImageHash = this.getImageHash(img)
    }
  }

  /**
   * 检查剪贴板变化
   */
  checkClipboard() {
    try {
      // 检查文本
      const currentText = clipboard.readText() || ''
      if (currentText && currentText !== this.lastText) {
        this.lastText = currentText
        if (!this.isSensitive(currentText)) {
          this.addTextItem(currentText)
        }
        return
      }

      // 检查图片
      const img = clipboard.readImage()
      if (!img.isEmpty()) {
        const hash = this.getImageHash(img)
        if (hash !== this.lastImageHash) {
          this.lastImageHash = hash
          this.addImageItem(img)
        }
      }
    } catch (err) {
      console.error('检查剪贴板失败:', err)
    }
  }

  /**
   * 检查是否包含敏感内容
   */
  isSensitive(text) {
    return this.sensitivePatterns.some(pattern => pattern.test(text))
  }

  /**
   * 获取图片哈希（用于去重）
   */
  getImageHash(img) {
    try {
      const buffer = img.toBitmap()
      // 简单哈希：取前1000字节计算
      let hash = 0
      const len = Math.min(buffer.length, 1000)
      for (let i = 0; i < len; i++) {
        hash = ((hash << 5) - hash) + buffer[i]
        hash = hash & hash
      }
      return hash.toString(16)
    } catch (err) {
      return Date.now().toString()
    }
  }

  /**
   * 添加文本记录
   */
  addTextItem(text) {
    // 检查是否已存在相同内容
    const existingIndex = this.history.findIndex(
      item => item.type === 'text' && item.content === text
    )

    if (existingIndex !== -1) {
      // 已存在，移到最前面
      const [existing] = this.history.splice(existingIndex, 1)
      existing.timestamp = Date.now()
      this.history.unshift(existing)
    } else {
      // 新记录
      const item = {
        id: this.generateId(),
        type: 'text',
        content: text,
        preview: text.substring(0, 100),
        timestamp: Date.now(),
        pinned: false
      }
      this.history.unshift(item)
    }

    this.trimHistory()
    this.saveHistory()
    this.notifyUpdate()
  }

  /**
   * 添加图片记录
   */
  addImageItem(img) {
    try {
      // 生成缩略图
      const size = img.getSize()
      const maxSize = 200
      let thumbnail = img

      if (size.width > maxSize || size.height > maxSize) {
        const scale = Math.min(maxSize / size.width, maxSize / size.height)
        thumbnail = img.resize({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale)
        })
      }

      const item = {
        id: this.generateId(),
        type: 'image',
        content: img.toDataURL(), // 完整图片
        thumbnail: thumbnail.toDataURL(), // 缩略图
        preview: `图片 ${size.width}x${size.height}`,
        timestamp: Date.now(),
        pinned: false,
        size: size
      }

      this.history.unshift(item)
      this.trimHistory()
      this.saveHistory()
      this.notifyUpdate()
    } catch (err) {
      console.error('添加图片记录失败:', err)
    }
  }

  /**
   * 裁剪历史记录（保持在最大数量内）
   */
  trimHistory() {
    // 分离置顶和普通项目
    const pinned = this.history.filter(item => item.pinned)
    const unpinned = this.history.filter(item => !item.pinned)

    // 只裁剪非置顶项目
    while (unpinned.length > this.maxItems - pinned.length) {
      unpinned.pop()
    }

    this.history = [...pinned, ...unpinned]
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  /**
   * 通知更新
   */
  notifyUpdate() {
    if (this.onUpdate) {
      this.onUpdate(this.getHistory())
    }
  }

  /**
   * 获取历史记录（置顶在前，按时间排序）
   */
  getHistory() {
    // 先按置顶状态分组，再按时间排序
    const sorted = [...this.history].sort((a, b) => {
      // 置顶的排在前面
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // 同组内按时间排序（新的在前）
      return b.timestamp - a.timestamp
    })

    return sorted.map(item => ({
      id: item.id,
      type: item.type,
      preview: item.preview,
      thumbnail: item.thumbnail,
      timestamp: item.timestamp,
      pinned: item.pinned
    }))
  }

  /**
   * 获取完整内容
   */
  getItemContent(id) {
    const item = this.history.find(i => i.id === id)
    return item ? item.content : null
  }

  /**
   * 使用历史记录（复制到剪贴板）
   */
  useItem(id) {
    const item = this.history.find(i => i.id === id)
    if (!item) return false

    this.pause() // 暂停监听避免重复记录

    try {
      if (item.type === 'text') {
        clipboard.writeText(item.content)
        this.lastText = item.content
      } else if (item.type === 'image') {
        // 优先使用content，如果没有则使用thumbnail
        const imageData = item.content || item.thumbnail
        if (!imageData) {
          console.error('图片数据为空')
          this.resume()
          return false
        }
        const img = nativeImage.createFromDataURL(imageData)
        if (img.isEmpty()) {
          console.error('无法创建图片')
          this.resume()
          return false
        }
        clipboard.writeImage(img)
        this.lastImageHash = this.getImageHash(img)
      }

      // 更新时间戳，移到最前
      item.timestamp = Date.now()
      const index = this.history.indexOf(item)
      if (index > 0) {
        this.history.splice(index, 1)
        this.history.unshift(item)
      }

      this.saveHistory()

      setTimeout(() => this.resume(), 100)
      return true
    } catch (err) {
      console.error('使用历史记录失败:', err)
      this.resume()
      return false
    }
  }

  /**
   * 删除记录
   */
  deleteItem(id) {
    const index = this.history.findIndex(i => i.id === id)
    if (index !== -1) {
      this.history.splice(index, 1)
      this.saveHistory()
      this.notifyUpdate()
      return true
    }
    return false
  }

  /**
   * 切换置顶状态
   */
  togglePin(id) {
    const item = this.history.find(i => i.id === id)
    if (item) {
      item.pinned = !item.pinned
      this.saveHistory()
      this.notifyUpdate()
      return item.pinned
    }
    return false
  }

  /**
   * 清空历史（保留置顶）
   */
  clearHistory() {
    this.history = this.history.filter(item => item.pinned)
    this.saveHistory()
    this.notifyUpdate()
  }

  /**
   * 搜索历史（置顶在前）
   */
  search(keyword) {
    if (!keyword) return this.getHistory()

    const lower = keyword.toLowerCase()
    const filtered = this.history.filter(item => {
      if (item.type === 'text') {
        return item.content.toLowerCase().includes(lower)
      }
      return item.preview.toLowerCase().includes(lower)
    })

    // 按置顶和时间排序
    const sorted = filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.timestamp - a.timestamp
    })

    return sorted.map(item => ({
      id: item.id,
      type: item.type,
      preview: item.preview,
      thumbnail: item.thumbnail,
      timestamp: item.timestamp,
      pinned: item.pinned
    }))
  }
}

export default ClipboardHistory
