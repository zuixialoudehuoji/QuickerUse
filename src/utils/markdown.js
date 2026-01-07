/**
 * Markdown 处理工具
 * 支持 GFM 语法和代码高亮
 */

import { marked } from 'marked'
import hljs from 'highlight.js'

// Markdown 语法帮助（小白友好）
export const MD_SYNTAX_HELP = [
  { name: '标题', syntax: '# 一级标题\n## 二级标题\n### 三级标题', desc: '用 # 号表示标题级别，# 越多级别越小' },
  { name: '粗体', syntax: '**粗体文字**', desc: '用两个星号包围文字' },
  { name: '斜体', syntax: '*斜体文字*', desc: '用一个星号包围文字' },
  { name: '删除线', syntax: '~~删除的文字~~', desc: '用两个波浪线包围文字' },
  { name: '链接', syntax: '[显示文字](https://网址)', desc: '方括号写显示文字，圆括号写链接地址' },
  { name: '图片', syntax: '![图片说明](图片地址)', desc: '感叹号+方括号写说明+圆括号写图片地址' },
  { name: '无序列表', syntax: '- 列表项1\n- 列表项2\n- 列表项3', desc: '用 - 或 * 开头，空格后写内容' },
  { name: '有序列表', syntax: '1. 第一项\n2. 第二项\n3. 第三项', desc: '用数字+点号开头' },
  { name: '引用', syntax: '> 这是引用的内容', desc: '用 > 开头表示引用' },
  { name: '行内代码', syntax: '`代码内容`', desc: '用反引号包围代码' },
  { name: '代码块', syntax: '```javascript\n代码内容\n```', desc: '用三个反引号包围，可指定语言' },
  { name: '表格', syntax: '| 列1 | 列2 |\n|-----|-----|\n| 内容 | 内容 |', desc: '用竖线分隔列，第二行是分隔线' },
  { name: '分隔线', syntax: '---', desc: '三个或更多短横线' },
  { name: '任务列表', syntax: '- [ ] 未完成\n- [x] 已完成', desc: '用 [ ] 或 [x] 表示任务状态' },
]

// 快速插入模板
export const MD_TEMPLATES = {
  heading: { label: '标题', insert: '# ', cursor: 2 },
  bold: { label: '粗体', insert: '****', cursor: 2 },
  italic: { label: '斜体', insert: '**', cursor: 1 },
  link: { label: '链接', insert: '[](url)', cursor: 1 },
  image: { label: '图片', insert: '![](url)', cursor: 2 },
  code: { label: '代码', insert: '``', cursor: 1 },
  codeblock: { label: '代码块', insert: '```\n\n```', cursor: 4 },
  list: { label: '列表', insert: '- ', cursor: 2 },
  quote: { label: '引用', insert: '> ', cursor: 2 },
  table: { label: '表格', insert: '| 列1 | 列2 |\n|-----|-----|\n| 内容 | 内容 |', cursor: 2 },
  task: { label: '任务', insert: '- [ ] ', cursor: 6 },
  hr: { label: '分隔线', insert: '\n---\n', cursor: 5 },
}

// 配置 marked 选项
marked.setOptions({
  gfm: true,          // GitHub Flavored Markdown
  breaks: true,       // 换行符转为 <br>
  headerIds: true,
  mangle: false,
  highlight: function(code, lang) {
    // 代码高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      } catch (e) {
        console.warn('代码高亮失败:', e)
      }
    }
    // 自动检测语言
    try {
      return hljs.highlightAuto(code).value
    } catch (e) {
      return code
    }
  }
})

/**
 * 检测文本是否可能是 Markdown
 * @param {string} text
 * @returns {boolean}
 */
export function isMarkdown(text) {
  if (!text || typeof text !== 'string') return false

  const mdPatterns = [
    /^#{1,6}\s+/m,           // 标题 # ## ###
    /\*\*[^*]+\*\*/,         // 粗体 **text**
    /\*[^*]+\*/,             // 斜体 *text*
    /`[^`]+`/,               // 行内代码 `code`
    /```[\s\S]*?```/,        // 代码块 ```code```
    /^\s*[-*+]\s+/m,         // 无序列表
    /^\s*\d+\.\s+/m,         // 有序列表
    /\[.+?\]\(.+?\)/,        // 链接 [text](url)
    /!\[.*?\]\(.+?\)/,       // 图片 ![alt](url)
    /^\s*>/m,                // 引用 > text
    /\|.+\|/,                // 表格
    /^---+$/m,               // 分隔线
    /^===+$/m,               // 分隔线
  ]

  // 匹配 2 个或以上模式认为是 Markdown
  let matchCount = 0
  for (const pattern of mdPatterns) {
    if (pattern.test(text)) {
      matchCount++
      if (matchCount >= 2) return true
    }
  }

  return false
}

/**
 * 渲染 Markdown 为 HTML
 * @param {string} markdown
 * @returns {string}
 */
export function render(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return ''
  }

  try {
    return marked.parse(markdown)
  } catch (e) {
    console.error('Markdown 渲染失败:', e)
    return `<pre>${escapeHtml(markdown)}</pre>`
  }
}

/**
 * 渲染 Markdown 并包装为完整 HTML 文档
 * @param {string} markdown
 * @param {object} options
 * @returns {string}
 */
export function renderToHtml(markdown, options = {}) {
  const { title = 'Markdown Preview', theme = 'github' } = options
  const content = render(markdown)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    ${getMarkdownStyles(theme)}
  </style>
</head>
<body>
  <div class="markdown-body">
    ${content}
  </div>
</body>
</html>`
}

/**
 * 提取 Markdown 大纲
 * @param {string} markdown
 * @returns {Array<{level: number, text: string, id: string}>}
 */
export function extractToc(markdown) {
  const toc = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = text.toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '')

    toc.push({ level, text, id })
  }

  return toc
}

/**
 * 统计 Markdown 字数
 * @param {string} markdown
 * @returns {object}
 */
export function countWords(markdown) {
  if (!markdown) return { chars: 0, words: 0, lines: 0 }

  // 移除代码块
  const textOnly = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')

  const chars = textOnly.length
  const lines = markdown.split('\n').length

  // 中文按字数，英文按词数
  const chinese = (textOnly.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (textOnly.match(/[a-zA-Z]+/g) || []).length

  return {
    chars,
    words: chinese + english,
    lines
  }
}

/**
 * 获取 Markdown 样式
 * @param {string} theme
 * @returns {string}
 */
function getMarkdownStyles(theme = 'github') {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.6;
      color: #24292e;
      background: #fff;
    }

    .markdown-body {
      font-size: 14px;
    }

    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }

    .markdown-body h1 { font-size: 2em; }
    .markdown-body h2 { font-size: 1.5em; }
    .markdown-body h3 { font-size: 1.25em; border: none; }
    .markdown-body h4 { font-size: 1em; border: none; }

    .markdown-body p {
      margin-top: 0;
      margin-bottom: 16px;
    }

    .markdown-body code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background: rgba(27,31,35,0.05);
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    .markdown-body pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background: #f6f8fa;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .markdown-body pre code {
      padding: 0;
      margin: 0;
      font-size: 100%;
      background: transparent;
      border: 0;
    }

    .markdown-body blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0 0 16px 0;
    }

    .markdown-body ul, .markdown-body ol {
      padding-left: 2em;
      margin-top: 0;
      margin-bottom: 16px;
    }

    .markdown-body li {
      margin: 4px 0;
    }

    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }

    .markdown-body table th, .markdown-body table td {
      padding: 6px 13px;
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
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background: #e1e4e8;
      border: 0;
    }

    /* 代码高亮 - One Dark 主题 */
    .hljs {
      background: #282c34;
      color: #abb2bf;
    }
    .hljs-keyword { color: #c678dd; }
    .hljs-string { color: #98c379; }
    .hljs-number { color: #d19a66; }
    .hljs-function { color: #61afef; }
    .hljs-title { color: #61afef; }
    .hljs-comment { color: #5c6370; font-style: italic; }
    .hljs-params { color: #abb2bf; }
    .hljs-attr { color: #d19a66; }
    .hljs-built_in { color: #e6c07b; }
    .hljs-literal { color: #56b6c2; }
    .hljs-type { color: #e6c07b; }
    .hljs-meta { color: #61afef; }
  `
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * 导出纯文本（移除 Markdown 标记）
 * @param {string} markdown
 * @returns {string}
 */
export function toPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')    // 移除代码块
    .replace(/`([^`]+)`/g, '$1')       // 移除行内代码标记
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体
    .replace(/\*([^*]+)\*/g, '$1')     // 移除斜体
    .replace(/~~([^~]+)~~/g, '$1')     // 移除删除线
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接
    .replace(/!\[.*?\]\([^)]+\)/g, '') // 移除图片
    .replace(/^#+\s+/gm, '')           // 移除标题标记
    .replace(/^\s*[-*+]\s+/gm, '')     // 移除列表标记
    .replace(/^\s*\d+\.\s+/gm, '')     // 移除有序列表
    .replace(/^\s*>/gm, '')            // 移除引用
    .replace(/^---+$/gm, '')           // 移除分隔线
    .replace(/\n{3,}/g, '\n\n')        // 合并多个空行
    .trim()
}
