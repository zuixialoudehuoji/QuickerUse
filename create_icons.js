const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, 'resources');
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir);

// 32x32 纯红色方块 (Base64)
const normalIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABISURBVFhH7coxDQAACAOg9A/iFuuCB0zC2ZqZt9/Z+wUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFwFyGngX1090KyAAAAABJRU5ErkJggg==';

// 32x32 纯灰色方块 (Base64)
const disabledIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABISURBVFhH7coxDQAACAOh9A/iFuuCB0zC2ZqZt9/Z+wUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFwFyGngX1090KyAAAAABJRU5ErkJggg==';

console.log('Generating 32x32 icons to:', iconDir);

try {
    fs.writeFileSync(path.join(iconDir, 'icon.png'), Buffer.from(normalIconBase64, 'base64'));
    console.log('Success: icon.png created');
} catch (e) {
    console.error('Error writing icon.png:', e);
}

try {
    fs.writeFileSync(path.join(iconDir, 'icon-disabled.png'), Buffer.from(disabledIconBase64, 'base64'));
    console.log('Success: icon-disabled.png created');
} catch (e) {
    console.error('Error writing icon-disabled.png:', e);
}
