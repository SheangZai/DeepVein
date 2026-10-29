// Draws the Deepvein pixel-shovel icons. Usage: node make-icons.js <outDir>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const out = process.argv[2];

// ---- tiny PNG encoder ----
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba, alpha) {
  const ch = alpha ? 4 : 3;
  const raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * ch + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (w * ch + 1) + 1 + x * ch;
      for (let i = 0; i < ch; i++) raw[d + i] = rgba[s + i];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- the shovel, as a 16x16 pixel map ----
const C = {
  o: '#120b07', // outline
  H: '#c98a4b', h: '#8e5a2e', g: '#5e3a1d', // wood: light, mid, dark
  B: '#eef1f4', b: '#b3bcc6', d: '#6f7a86', // iron: shine, mid, dark
  A: '#ffcf5a', // gold collar
};
const art = [
  '................',
  '.............oo.',
  '............oHgo',
  '...........oHgo.',
  '..........oHgo..',
  '.........oHgo...',
  '........oHgo....',
  '..oooooAAgo.....',
  '.oBBBBBAAo......',
  '.oBbbbbbbo......',
  '.oBbbbbbdo......',
  '.oBbbbbbdo......',
  '.oBbbbbddo......',
  '.obbbbddo.......',
  '.obdddo.........',
  '..ooo...........',
];

function hex(c) { return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); }

function canvas(size) { return { size, px: new Uint8Array(size * size * 4) }; }
function fillRect(cv, x0, y0, w, h, rgb, a = 255) {
  for (let y = Math.max(0, y0); y < Math.min(cv.size, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(cv.size, x0 + w); x++) {
      const i = (y * cv.size + x) * 4;
      cv.px[i] = rgb[0]; cv.px[i + 1] = rgb[1]; cv.px[i + 2] = rgb[2]; cv.px[i + 3] = a;
    }
}
function drawArt(cv, cell, ox, oy, mono) {
  art.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const rgb = mono ? [255, 255, 255] : hex(C[ch]);
    fillRect(cv, ox + x * cell, oy + y * cell, cell, cell, rgb);
  }));
}

// Seeded random so the stone pattern is the same every run.
let seed = 7;
function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

function stoneBackground(cv, cell, grid, start = 0) {
  const shades = ['#1c140e', '#21180f', '#2a1f15', '#17100b'].map(hex);
  for (let y = 0; y < grid; y++)
    for (let x = 0; x < grid; x++) {
      const r = rand();
      let rgb = r < 0.55 ? shades[0] : r < 0.8 ? shades[1] : r < 0.93 ? shades[2] : shades[3];
      if (rand() < 0.025) rgb = hex('#b8862f'); // gold ore speck
      fillRect(cv, start + x * cell, start + y * cell, cell, cell, rgb);
    }
}

function save(name, cv, alpha) {
  fs.writeFileSync(path.join(out, name), png(cv.size, cv.size, cv.px, alpha));
  console.log('wrote', name);
}

// Main icon: 1024, opaque, 16 cells of 64px with the shovel inset 2 cells.
{
  const cv = canvas(1024);
  // 48px cells, offset so the stone grid lines up with the shovel's pixels.
  stoneBackground(cv, 48, 22, -16);
  drawArt(cv, 48, 128, 128);
  save('icon.png', cv, false);
}
// Android adaptive icon: art inside the central safe zone.
{
  const fg = canvas(1024);
  drawArt(fg, 36, 224, 224);
  save('android-icon-foreground.png', fg, true);
  const mono = canvas(1024);
  drawArt(mono, 36, 224, 224, true);
  save('android-icon-monochrome.png', mono, true);
  seed = 7;
  const bg = canvas(1024);
  stoneBackground(bg, 48, 22, -16);
  save('android-icon-background.png', bg, false);
}
// Splash: transparent shovel.
{
  const cv = canvas(512);
  drawArt(cv, 32, 0, 0);
  save('splash-icon.png', cv, true);
}
// Favicon.
{
  const cv = canvas(48);
  fillRect(cv, 0, 0, 48, 48, hex('#1c140e'));
  drawArt(cv, 3, 0, 0);
  save('favicon.png', cv, false);
}
