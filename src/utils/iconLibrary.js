// src/utils/iconLibrary.js
// 现代化全彩 SVG 图标库

const c = {
  blue: '#3b82f6', red: '#ef4444', green: '#22c55e', yellow: '#eab308',
  purple: '#a855f7', gray: '#6b7280', dark: '#1f2937', orange: '#f97316',
  teal: '#14b8a6', pink: '#ec4899', indigo: '#6366f1', cyan: '#06b6d4',
  slate: '#64748b'
};

// [修复] 添加 xmlns 命名空间，确保在 img 标签的 data URI 中能正确显示
const commonStyle = 'xmlns="http://www.w3.org/2000/svg" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const ICON_LIBRARY = [
  // === 常用工具 (Generic) ===
  { name: '搜索', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.blue}" ${commonStyle}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` },
  { name: '主页', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.indigo}" ${commonStyle}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
  { name: '设置', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.gray}" ${commonStyle}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` },
  { name: '链接', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.teal}" ${commonStyle}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>` },
  { name: '下载', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.green}" ${commonStyle}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>` },
  { name: '上传', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.blue}" ${commonStyle}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>` },
  { name: '删除', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.red}" ${commonStyle}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>` },
  { name: '日历', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.orange}" ${commonStyle}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
  { name: '时钟', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.purple}" ${commonStyle}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
  { name: '锁定', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.yellow}" ${commonStyle}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` },
  { name: '解锁', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.green}" ${commonStyle}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>` },
  { name: '眼睛', category: 'General', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.cyan}" ${commonStyle}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` },

  // === 文件夹 & 文件 ===
  { name: '文件夹', category: 'File', svg: `<svg viewBox="0 0 24 24" fill="${c.yellow}" stroke="${c.yellow}" ${commonStyle}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>` },
  { name: '打开的文件夹', category: 'File', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.yellow}" ${commonStyle}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="2" y1="19" x2="22" y2="19"/></svg>` },
  { name: '文件', category: 'File', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.gray}" ${commonStyle}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>` },
  { name: '图片文件', category: 'File', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.purple}" ${commonStyle}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>` },
  { name: '音乐文件', category: 'File', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.pink}" ${commonStyle}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>` },
  { name: '视频文件', category: 'File', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.red}" ${commonStyle}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>` },
  { name: 'ZIP', category: 'File', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.orange}" ${commonStyle}><path d="M10 2v2"/><path d="M14 2v2"/><path d="M10 6v2"/><path d="M14 6v2"/><path d="M10 10v2"/><path d="M14 10v2"/><path d="M10 14v2"/><path d="M14 14v2"/><path d="M10 18v2"/><path d="M14 18v2"/><path d="M12 22a2 2 0 0 0 2-2v-2h-4v2a2 2 0 0 0 2 2z"/></svg>` },
  
  // === 开发与代码 ===
  { name: '终端', category: 'Dev', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.dark}" ${commonStyle}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>` },
  { name: '代码块', category: 'Dev', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.blue}" ${commonStyle}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>` },
  { name: 'Bug', category: 'Dev', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.red}" ${commonStyle}><rect x="8" y="6" width="8" height="12" rx="4"/><line x1="8" y1="10" x2="4" y2="10"/><line x1="20" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="4" y2="14"/><line x1="20" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="4" y2="18"/><line x1="20" y1="18" x2="16" y2="18"/><line x1="10" y1="6" x2="8" y2="2"/><line x1="14" y1="6" x2="16" y2="2"/></svg>` },
  { name: 'Git分支', category: 'Dev', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.orange}" ${commonStyle}><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>` },
  { name: '数据库', category: 'Dev', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.indigo}" ${commonStyle}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>` },
  { name: '服务器', category: 'Dev', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.slate}" ${commonStyle}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>` },
  { name: '云端', category: 'Dev', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.cyan}" ${commonStyle}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>` },

  // === 办公与写作 ===
  { name: '剪贴板', category: 'Office', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.teal}" ${commonStyle}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>` },
  { name: '书签', category: 'Office', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.red}" ${commonStyle}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>` },
  { name: '书本', category: 'Office', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.blue}" ${commonStyle}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>` },
  { name: '公文包', category: 'Office', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.orange}" ${commonStyle}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>` },
  { name: '统计图', category: 'Office', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.green}" ${commonStyle}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
  { name: '饼图', category: 'Office', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.indigo}" ${commonStyle}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>` },
  
  // === 硬件与设备 ===
  { name: '电脑', category: 'Hardware', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.gray}" ${commonStyle}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` },
  { name: '手机', category: 'Hardware', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.dark}" ${commonStyle}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>` },
  { name: '鼠标', category: 'Hardware', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.purple}" ${commonStyle}><rect x="6" y="2" width="12" height="20" rx="6" ry="6"/><line x1="12" y1="6" x2="12" y2="10"/></svg>` },
  { name: '键盘', category: 'Hardware', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.slate}" ${commonStyle}><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="18" y2="16"/></svg>` },
  { name: '打印机', category: 'Hardware', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.dark}" ${commonStyle}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>` },
  { name: 'Wifi', category: 'Hardware', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.blue}" ${commonStyle}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>` },

  // === 社交与沟通 ===
  { name: '聊天', category: 'Social', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.green}" ${commonStyle}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>` },
  { name: '邮件', category: 'Social', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.orange}" ${commonStyle}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` },
  { name: '分享', category: 'Social', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.blue}" ${commonStyle}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>` },
  { name: '点赞', category: 'Social', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.red}" ${commonStyle}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>` },

  // === 杂项 ===
  { name: '心形', category: 'Misc', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.pink}" ${commonStyle}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
  { name: '星形', category: 'Misc', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.yellow}" ${commonStyle}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
  { name: '闪电', category: 'Misc', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.yellow}" ${commonStyle}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
  { name: '咖啡', category: 'Misc', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.orange}" ${commonStyle}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>` },
  { name: '购物', category: 'Misc', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.teal}" ${commonStyle}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>` },
  { name: '礼物', category: 'Misc', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.red}" ${commonStyle}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>` },
  { name: '工具', category: 'Misc', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${c.gray}" ${commonStyle}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>` }
];