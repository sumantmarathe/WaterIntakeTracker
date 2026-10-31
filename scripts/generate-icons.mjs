import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function drawWaterDropIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Deep Ocean Background #050b14
  let r = 5;
  let g = 11;
  let b = 20;
  const a = 255;

  const outerRadius = w * 0.44;
  const innerRadius = w * 0.37;

  // Cyan glowing ring
  if (dist <= outerRadius && dist >= innerRadius) {
    const t = (dist - innerRadius) / (outerRadius - innerRadius);
    r = Math.round(56 * (1 - t) + 6 * t);
    g = Math.round(189 * (1 - t) + 182 * t);
    b = Math.round(248 * (1 - t) + 212 * t);
  } else if (dist < innerRadius) {
    const t = dist / innerRadius;
    r = Math.round(14 * (1 - t) + 8 * t);
    g = Math.round(30 * (1 - t) + 17 * t);
    b = Math.round(54 * (1 - t) + 32 * t);
  }

  // Water droplet shape: bottom sphere + upper cone
  const dropCenterY = cy + h * 0.06;
  const dropRadius = w * 0.16;
  const distDropBottom = Math.sqrt(dx * dx + (y - dropCenterY) * (y - dropCenterY));

  const topTipY = cy - h * 0.22;
  let inDropCone = false;
  if (y >= topTipY && y <= dropCenterY) {
    const progress = (y - topTipY) / (dropCenterY - topTipY);
    const halfWidth = progress * dropRadius;
    if (Math.abs(dx) <= halfWidth) {
      inDropCone = true;
    }
  }

  if (distDropBottom <= dropRadius || inDropCone) {
    const vGrad = Math.max(0, Math.min(1, (y - topTipY) / (dropCenterY + dropRadius - topTipY)));
    r = Math.round(56 * (1 - vGrad) + 6 * vGrad);
    g = Math.round(189 * (1 - vGrad) + 182 * vGrad);
    b = Math.round(248 * (1 - vGrad) + 212 * vGrad);
  }

  return [r, g, b, a];
}

const iconsDir = path.resolve('icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, drawWaterDropIcon));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, drawWaterDropIcon));
console.log('Generated icons/icon-192.png and icons/icon-512.png');
