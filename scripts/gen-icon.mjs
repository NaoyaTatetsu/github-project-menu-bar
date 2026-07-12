// Generates a simple 1024x1024 kanban-board source icon (app-icon.png).
// Run: node scripts/gen-icon.mjs  ->  then: pnpm tauri icon app-icon.png
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const S = 1024;
const buf = Buffer.alloc(S * S * 4);

function px(x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

function rect(x0, y0, w, h, color, radius = 0) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (radius > 0) {
        const dx = Math.max(x0 + radius - x, x - (x0 + w - 1 - radius), 0);
        const dy = Math.max(y0 + radius - y, y - (y0 + h - 1 - radius), 0);
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      px(x, y, color);
    }
  }
}

// dark rounded background
rect(0, 0, S, S, [0, 0, 0, 0]);
rect(48, 48, S - 96, S - 96, [22, 27, 34, 255], 180);

// three kanban columns with cards
const cols = [
  [[88, 260]],
  [[400, 320], [400, 560]],
  [[712, 260], [712, 500], [712, 740]],
];
const colX = [128, 440, 752];
const colColors = [
  [56, 139, 253],
  [63, 185, 80],
  [163, 113, 247],
];

for (let c = 0; c < 3; c++) {
  // column background
  rect(colX[c], 200, 220, 624, [33, 38, 45, 255], 24);
  // header bar
  rect(colX[c], 200, 220, 44, colColors[c].concat(255), 24);
}

// cards
const cardY = [
  [260, 360, 460],
  [260, 360],
  [260, 360, 460, 560],
];
for (let c = 0; c < 3; c++) {
  for (const y of cardY[c]) {
    rect(colX[c] + 20, y, 180, 72, [201, 209, 217, 255], 14);
  }
}

// --- encode PNG ---
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// filter byte 0 per row
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}
const idat = deflateSync(raw);
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(new URL("../app-icon.png", import.meta.url), png);
console.log("wrote app-icon.png", png.length, "bytes");
