const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, 'resources');
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir);

// 绿色圆点 (正常)
const normalIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVDhP7YxBCgAgDMX8/6d7u3QJItok5iF4zdq2/7M25mDOzLw7iJiglEDvQG+CUgK9A70JSgn0DvQmKCXQO9CboJRA70BvglICvQO9CcoaG9cKAuQYl/JmAAAAAElFTkSuQmCC';
// 灰色圆点 (禁用)
const disabledIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVDhP7YxBCgAgDMPh/0/3dokaRJSF5iF4zdq2/7M25mDOzLw7iJiglEDvQG+CUgK9A70JSgn0DvQmKCXQO9CboJRA70BvglICvQO9CcoaG9cK8+Iq+1oAAAAASUVORK5CYII=';

fs.writeFileSync(path.join(iconDir, 'icon.png'), Buffer.from(normalIconBase64, 'base64'));
fs.writeFileSync(path.join(iconDir, 'icon-disabled.png'), Buffer.from(disabledIconBase64, 'base64'));
console.log('Icons created.');