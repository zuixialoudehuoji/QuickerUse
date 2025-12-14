const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconDir = path.join(__dirname, 'resources');
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir);

/**
 * 创建带 Alpha 通道的 PNG (RGBA)
 * @param {number} size - 图标尺寸
 * @param {number[][]} shape - 形状数据 (0=透明, 1=前景色, 2=高光, 3=阴影)
 * @param {object} colors - 颜色配置 { fg, highlight, shadow }
 */
function createShapePNG(size, shape, colors) {
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size, 0);
    ihdrData.writeUInt32BE(size, 4);
    ihdrData.writeUInt8(8, 8);         // bit depth
    ihdrData.writeUInt8(6, 9);         // color type 6 = RGBA
    ihdrData.writeUInt8(0, 10);        // compression
    ihdrData.writeUInt8(0, 11);        // filter
    ihdrData.writeUInt8(0, 12);        // interlace

    const ihdrChunk = createChunk('IHDR', ihdrData);

    // 创建图像数据
    const rawData = [];
    for (let y = 0; y < size; y++) {
        rawData.push(0); // filter type: None
        for (let x = 0; x < size; x++) {
            const pixel = shape[y] ? shape[y][x] : 0;

            if (pixel === 1) {
                // 主体颜色
                rawData.push(colors.fg[0], colors.fg[1], colors.fg[2], 255);
            } else if (pixel === 2) {
                // 高光
                rawData.push(colors.highlight[0], colors.highlight[1], colors.highlight[2], 255);
            } else if (pixel === 3) {
                // 阴影
                rawData.push(colors.shadow[0], colors.shadow[1], colors.shadow[2], 255);
            } else {
                // 透明
                rawData.push(0, 0, 0, 0);
            }
        }
    }

    const compressedData = zlib.deflateSync(Buffer.from(rawData), { level: 9 });
    const idatChunk = createChunk('IDAT', compressedData);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
    let crc = 0xffffffff;
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ 0xffffffff;
}

// ========== 闪电图标设计 (16x16) ==========
// 0=透明, 1=主色, 2=高光, 3=阴影
const lightning16 = [
    [0,0,0,0,0,0,0,0,2,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,2,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,1,1,3,0,0,0,0,0,0],
    [0,0,0,0,0,2,1,1,3,0,0,0,0,0,0,0],
    [0,0,0,0,2,1,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,2,1,1,1,3,0,0,0,0,0,0,0,0],
    [0,0,2,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,3,0,0,0,0,0],
    [0,0,0,0,0,0,2,1,1,3,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,2,1,1,3,0,0,0,0,0,0,0],
    [0,0,0,0,2,1,1,3,0,0,0,0,0,0,0,0],
    [0,0,0,2,1,1,3,0,0,0,0,0,0,0,0,0],
    [0,0,2,1,1,3,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,3,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ========== 闪电图标设计 (32x32) ==========
const lightning32 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,2,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,1,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,2,1,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,2,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,3,3,3,3,3,3,3,1,1,1,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,2,1,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,2,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// 颜色配置
const enabledColors = {
    fg: [255, 193, 7],        // 金黄色 #FFC107
    highlight: [255, 235, 59], // 亮黄色 #FFEB3B
    shadow: [255, 152, 0]      // 橙色 #FF9800
};

const disabledColors = {
    fg: [158, 158, 158],       // 灰色 #9E9E9E
    highlight: [189, 189, 189], // 浅灰 #BDBDBD
    shadow: [117, 117, 117]    // 深灰 #757575
};

// 生成图标
console.log('正在生成闪电图标到:', iconDir);

// 16x16 图标
const icon16 = createShapePNG(16, lightning16, enabledColors);
fs.writeFileSync(path.join(iconDir, 'icon-16.png'), icon16);
console.log('✓ icon-16.png 已创建 (闪电，金黄色，16x16)');

const iconDisabled16 = createShapePNG(16, lightning16, disabledColors);
fs.writeFileSync(path.join(iconDir, 'icon-disabled-16.png'), iconDisabled16);
console.log('✓ icon-disabled-16.png 已创建 (闪电，灰色，16x16)');

// 32x32 图标
const icon32 = createShapePNG(32, lightning32, enabledColors);
fs.writeFileSync(path.join(iconDir, 'icon.png'), icon32);
console.log('✓ icon.png 已创建 (闪电，金黄色，32x32)');

const iconDisabled32 = createShapePNG(32, lightning32, disabledColors);
fs.writeFileSync(path.join(iconDir, 'icon-disabled.png'), iconDisabled32);
console.log('✓ icon-disabled.png 已创建 (闪电，灰色，32x32)');

// 输出 Base64 编码
console.log('\n--- Base64 编码 (16x16) ---');
console.log('启用图标 (金黄色闪电):');
console.log(icon16.toString('base64'));
console.log('\n禁用图标 (灰色闪电):');
console.log(iconDisabled16.toString('base64'));

console.log('\n闪电图标生成完成！⚡');
