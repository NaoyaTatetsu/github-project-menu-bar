// Generates a macOS menu-bar template icon: a kanban glyph drawn as BLACK
// shapes on a TRANSPARENT background (the only two "colors" a template image
// may use). macOS recolors it to match the menu bar (white in dark mode).
// Run: node scripts/gen-tray.mjs  ->  src-tauri/icons/tray.png
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const S = 128;
const buf = Buffer.alloc(S * S * 4); // all transparent by default

const BLACK = [0, 0, 0, 255];

function rect(x0, y0, w, h, radius = 0) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || y < 0 || x >= S || y >= S) continue;
      if (radius > 0) {
        const dx = Math.max(x0 + radius - x, x - (x0 + w - 1 - radius), 0);
        const dy = Math.max(y0 + radius - y, y - (y0 + h - 1 - radius), 0);
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      const i = (y * S + x) * 4;
      buf[i] = BLACK[0];
      buf[i + 1] = BLACK[1];
      buf[i + 2] = BLACK[2];
      buf[i + 3] = BLACK[3];
    }
  }
}

// 3 columns, each a filled black rounded rect with transparent "card gaps".
const colX = [16, 52, 88];
const colW = 24;
const colTop = 20;
const colH = 88;
for (const x of colX) {
  rect(x, colTop, colW, colH, 6); // column body (black)
}
// carve transparent gaps to suggest stacked cards (alpha back to 0)
function clearRect(x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || y < 0 || x >= S || y >= S) continue;
      buf[(y * S + x) * 4 + 3] = 0;
    }
  }
}
// header separator + 2 card separators per column
for (const x of colX) {
  clearRect(x + 4, colTop + 16, colW - 8, 6); // under header
  clearRect(x + 4, colTop + 40, colW - 8, 6);
  clearRect(x + 4, colTop + 64, colW - 8, 6);
}

// --- PNG encode ---
function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
mkdirSync(new URL("../src-tauri/icons/", import.meta.url), { recursive: true });
writeFileSync(new URL("../src-tauri/icons/tray.png", import.meta.url), png);
console.log("wrote src-tauri/icons/tray.png", png.length, "bytes");
