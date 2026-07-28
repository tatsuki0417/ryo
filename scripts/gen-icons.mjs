// アイコン生成: 依存なしで PNG を手書きエンコード（zlib のみ利用）。
// 背景グラデ + 中央のスターエンブレムを描き、192/512/maskable/favicon を出力。
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(outDir, { recursive: true });

// --- 最小 PNG エンコーダ (RGBA, フィルタ0) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 中央スターの内外周チェック
function inStar(px, py, cx, cy, rOuter, rInner, points = 5) {
  const ang = Math.atan2(py - cy, px - cx) + Math.PI / 2;
  const dist = Math.hypot(px - cx, py - cy);
  const seg = (Math.PI * 2) / points;
  let a = ((ang % seg) + seg) % seg;
  const t = Math.abs(a - seg / 2) / (seg / 2); // 0=谷 1=山
  const edge = lerp(rInner, rOuter, t);
  return dist <= edge;
}

function drawIcon(size, { padding = 0 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = (size / 2) * (1 - padding) * 0.62;
  const rInner = rOuter * 0.44;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // 背景: 斜めグラデ (紫 -> ピンク)
      const t = (x + y) / (size * 2);
      let r = Math.round(lerp(27, 233, t));
      let g = Math.round(lerp(16, 64, t));
      let b = Math.round(lerp(48, 120, t));
      // 中央スター (黄色)
      if (inStar(x, y, cx, cy, rOuter, rInner)) {
        r = 255;
        g = 214;
        b = 61;
      }
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return encodePng(size, size, buf);
}

writeFileSync(join(outDir, "icon-192.png"), drawIcon(192));
writeFileSync(join(outDir, "icon-512.png"), drawIcon(512));
// maskable はセーフゾーン確保のため余白多め
writeFileSync(join(outDir, "icon-maskable-512.png"), drawIcon(512, { padding: 0.2 }));

// favicon.svg (手書き)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1b1030"/><stop offset="1" stop-color="#e94078"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="12" fill="url(#g)"/>
  <path fill="#ffd63d" d="M32 14l5.3 10.8 11.9 1.7-8.6 8.4 2 11.9L32 41.6 21.4 47.2l2-11.9-8.6-8.4 11.9-1.7z"/>
</svg>`;
writeFileSync(join(outDir, "favicon.svg"), svg);

console.log("icons generated in", outDir);
