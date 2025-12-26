const { app, Tray, Menu, nativeImage } = require('electron')

// 尝试禁用硬件加速，解决可能的渲染白屏/透明问题
app.disableHardwareAcceleration()

let tray = null

app.whenReady().then(() => {
  // 32x32 红色方块 Base64
  const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA/SURBVFhH7c4xDQAgAMMw8K+ZMQY4QAXBltz13XW/5/43B8AcAHMAzAEwB8AcAHMAzAEwB8AcAHMAzIG57wB1f+o5b/b+tQAAAABJRU5ErkJggg==';
  
  const icon = nativeImage.createFromDataURL(iconBase64)
  
  console.log('Icon Empty:', icon.isEmpty())
  console.log('Icon Size:', icon.getSize())
  
  try {
    tray = new Tray(icon)
    tray.setToolTip('Test Tray No GPU')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Exit', click: () => app.quit() }
    ]))
    console.log('Tray created successfully.')
  } catch (e) {
    console.error('Tray creation failed:', e)
  }
})