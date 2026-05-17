import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const size = 32;
const pixelBytes = size * size * 4;
const maskStride = Math.ceil(size / 32) * 4;
const maskBytes = maskStride * size;
const dibBytes = 40 + pixelBytes + maskBytes;
const icoBytes = 6 + 16 + dibBytes;
const buffer = Buffer.alloc(icoBytes);

let offset = 0;
buffer.writeUInt16LE(0, offset); offset += 2;
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(1, offset); offset += 2;

buffer.writeUInt8(size, offset++);
buffer.writeUInt8(size, offset++);
buffer.writeUInt8(0, offset++);
buffer.writeUInt8(0, offset++);
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(32, offset); offset += 2;
buffer.writeUInt32LE(dibBytes, offset); offset += 4;
buffer.writeUInt32LE(22, offset); offset += 4;

buffer.writeUInt32LE(40, offset); offset += 4;
buffer.writeInt32LE(size, offset); offset += 4;
buffer.writeInt32LE(size * 2, offset); offset += 4;
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(32, offset); offset += 2;
buffer.writeUInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(pixelBytes, offset); offset += 4;
buffer.writeInt32LE(0, offset); offset += 4;
buffer.writeInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(0, offset); offset += 4;

const glyph = [
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000001111111111111100000000000',
  '00000011111111111111110000000000',
  '00000111100000000011111000000000',
  '00001111000000000001111100000000',
  '00011110000000000000111110000000',
  '00011100000000000000011110000000',
  '00111100000000000000001111000000',
  '00111000000000000000001111000000',
  '00111000000000000000001111000000',
  '00111000000000000000001111000000',
  '00111000000000111100001111000000',
  '00111000000000111100001111000000',
  '00111100000000011110001111000000',
  '00011100000000011110011110000000',
  '00011110000000001111111110000000',
  '00001111000000000111111100000000',
  '00000111100000000011111000000000',
  '00000011111111111111111100000000',
  '00000001111111111110011110000000',
  '00000000000000000000011110000000',
  '00000000000000000000001111000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
  '00000000000000000000000000000000',
];

for (let y = 0; y < size; y += 1) {
  const sourceY = size - 1 - y;
  for (let x = 0; x < size; x += 1) {
    const i = offset + (y * size + x) * 4;
    const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
    const rounded = edge < 2 && (x < 4 || x > 27) && (y < 4 || y > 27);
    const isGlyph = glyph[sourceY][x] === '1';
    const glow = Math.abs(x - 10) + Math.abs(sourceY - 10) < 16;
    const bg = glow ? [28, 54, 45] : [18, 32, 27];
    const [r, g, b] = isGlyph ? [232, 247, 239] : bg;
    buffer[i] = b;
    buffer[i + 1] = g;
    buffer[i + 2] = r;
    buffer[i + 3] = rounded ? 0 : 255;
  }
}

const iconPath = resolve('src-tauri/icons/icon.ico');
mkdirSync(dirname(iconPath), { recursive: true });
writeFileSync(iconPath, buffer);
console.log(`Created ${iconPath}`);
