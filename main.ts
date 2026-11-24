// news-image-20261124 — "The World Today, Tuesday 24 November 2026"
// Fresh renderer written from scratch for this bounty only.
// Node 24, PURE stdlib (fs + zlib only). No network at runtime.
// Deterministic: fixed date string, fixed palette, fixed geometry.
// Writes a 1024x1024 PNG to /output/entry.png (PNG built by hand:
// raw RGB scanlines -> zlib deflate -> IHDR/IDAT/IEND chunks with CRC32).
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const OUT = "/output/entry.png";

// ---------------------------------------------------------------- palette
const PAPER = [246, 241, 230];
const INK = [20, 32, 28];
const FOREST = [13, 59, 46];
const FOREST2 = [18, 84, 64];
const GOLD = [201, 162, 39];
const RED = [176, 48, 36];
const ORANGE = [217, 108, 44];
const BLUE = [29, 78, 137];
const TEAL = [15, 118, 110];
const GREEN = [34, 120, 60];
const WHITE = [255, 255, 255];
const CREAM = [232, 224, 200];
const GREY = [98, 104, 100];
const SKY = [168, 200, 224];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
function setPix(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; i += 3; }
  }
}
function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
  }
}
function ring(cx: number, cy: number, r: number, t: number, c: number[]): void {
  for (let y = -r - t; y <= r + t; y++) for (let x = -r - t; x <= r + t; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d >= r - t && d <= r + t) setPix(cx + x, cy + y, c);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) setPix(Math.round(x0 + dx * i / n), Math.round(y0 + dy * i / n), c);
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
    const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
    const cc = 1 - a - b;
    if (a >= 0 && b >= 0 && cc >= 0) setPix(x, y, c);
  }
}
function vgrad(x: number, y: number, w: number, h: number, top: number[], bot: number[]): void {
  for (let yy = 0; yy < h; yy++) {
    const t = yy / Math.max(1, h - 1);
    const c = [0, 1, 2].map((k) => Math.round(top[k] + (bot[k] - top[k]) * t));
    rect(x, y + yy, w, 1, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, 5 bits (bit 4 = leftmost column).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11], B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e], D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f], F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f], H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11], N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d], R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e], T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11], X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04], Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e], "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f], "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0], ".": [0, 0, 0, 0, 0, 0x0c, 0x0c], ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0], "'": [0x04, 0x04, 0x08, 0, 0, 0, 0], "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08], "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13], "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0], "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04], "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "$": [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
};
function textWidth(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}
function drawText(x: number, y: number, s: string, sc: number, c: number[]): number {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
      if ((g[r] >> (4 - col)) & 1) rect(cx + col * sc, y + r * sc, sc, sc, c);
    }
    cx += 6 * sc;
  }
  return cx;
}
function textCenter(cx: number, y: number, s: string, sc: number, c: number[]): void {
  drawText(cx - Math.floor(textWidth(s, sc) / 2), y, s, sc, c);
}
// Word-wrap paragraph; returns y after last line.
function para(x: number, y: number, maxW: number, s: string, sc: number, lh: number, c: number[]): number {
  const words = s.split(" ");
  let line = "";
  let cy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (textWidth(test, sc) > maxW && line) {
      drawText(x, cy, line, sc, c);
      cy += lh;
      line = w;
    } else line = test;
  }
  if (line) { drawText(x, cy, line, sc, c); cy += lh; }
  return cy;
}
function kicker(x: number, y: number, s: string, c: number[]): void {
  drawText(x, y, s, 2, c);
}

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function writePng(): void {
  const raw = Buffer.alloc(H * (1 + W * 3));
  const pxBuf = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    pxBuf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync(OUT, png);
}

// ---------------------------------------------------------------- compose
function panel(x: number, y: number, w: number, h: number, bg: number[]): void {
  rect(x, y, w, h, bg);
  rect(x, y, w, 3, GOLD);
  rect(x, y, 3, h, INK);
  rect(x + w - 3, y, 3, h, INK);
  rect(x, y + h - 3, w, 3, INK);
}

function main(): void {
  rect(0, 0, W, H, PAPER);

  // ---- masthead
  rect(0, 0, W, 112, FOREST);
  rect(0, 112, W, 6, GOLD);
  textCenter(512, 16, "THE WORLD TODAY", 6, WHITE);
  textCenter(512, 64, "TUESDAY 24 NOVEMBER 2026  *  ONE IMAGE  *  SEVEN STORIES", 2, GOLD);
  drawText(28, 90, "MARKETS  *  CLIMATE  *  WAR  *  SPORT  *  CHESS", 2, [178, 205, 190]);
  drawText(1024 - 28 - textWidth("NEWS-IMAGE-20261124", 2), 90, "NEWS-IMAGE-20261124", 2, [178, 205, 190]);

  // ---- HERO: Huang returns to Nvidia
  panel(24, 130, 976, 292, WHITE);
  vgrad(620, 146, 364, 260, [16, 60, 46], [34, 120, 60]);
  // chip
  rect(668, 196, 268, 150, [20, 32, 28]);
  rect(684, 212, 236, 118, FOREST2);
  for (let i = 0; i < 5; i++) {
    rect(668, 216 + i * 28, 16, 10, GOLD);
    rect(920, 216 + i * 28, 16, 10, GOLD);
  }
  drawText(700, 236, "NVDA", 5, WHITE);
  drawText(700, 282, "HUANG", 4, GOLD);
  drawText(700, 312, "IS BACK", 4, GOLD);
  // rising chart arrow, below the chip
  line(640, 398, 700, 382, GOLD); line(700, 382, 760, 388, GOLD);
  line(760, 388, 830, 370, GOLD); line(830, 370, 900, 376, GOLD);
  line(900, 376, 960, 352, GOLD);
  tri(960, 352, 936, 354, 956, 378, GOLD);
  circle(700, 382, 5, GOLD); circle(830, 370, 5, GOLD);
  // +31% stamp
  rect(648, 146, 188, 40, RED);
  drawText(660, 154, "+31% IN A DAY", 2, WHITE);
  // hero text
  kicker(44, 150, "1  MARKETS  -  SANTA CLARA", GREEN);
  drawText(44, 178, "HUANG", 7, INK);
  drawText(44, 234, "IS BACK", 7, INK);
  para(44, 296, 556, "Nvidia reinstates Jensen Huang as CEO just 11 days after he resigned. Shares soar 31%, their best day since 2003, adding about $950bn in value.", 2, 20, INK);
  drawText(44, 392, "NASDAQ +6.5%  *  S+P +4.7%  *  DOW +1,448", 2, TEAL);

  // ---- ROW 2: two panels
  // COP31 suspended
  panel(24, 434, 480, 214, WHITE);
  rect(40, 450, 448, 62, FOREST);
  // globe with a crack, half in shadow
  circle(88, 486, 20, SKY); circle(80, 480, 7, GREEN); circle(96, 494, 6, GREEN);
  line(72, 470, 88, 486, INK); line(88, 486, 82, 502, INK);
  drawText(130, 466, "NO DEAL", 4, WHITE);
  drawText(130, 498, "TALKS SUSPENDED", 2, GOLD);
  kicker(40, 528, "2  CLIMATE  -  ANTALYA", RED);
  drawText(40, 554, "COP31 ENDS", 3, INK);
  drawText(40, 578, "WITHOUT A DEAL", 3, INK);
  para(40, 610, 448, "Nearly 200 nations leave Antalya with no deal. Talks resume next year.", 2, 18, GREY);

  // Sparta II ablaze in the Gulf of Finland
  panel(520, 434, 480, 214, WHITE);
  rect(536, 450, 448, 62, [24, 44, 60]);
  // sea + burning ship
  rect(536, 492, 448, 20, [52, 110, 168]);
  rect(640, 472, 180, 20, [90, 96, 104]);
  tri(640, 472, 700, 472, 670, 444, [120, 130, 140]);
  tri(700, 444, 730, 460, 700, 478, ORANGE);
  tri(740, 440, 770, 462, 740, 480, RED);
  tri(770, 446, 800, 464, 772, 482, ORANGE);
  circle(880, 466, 6, RED);
  drawText(548, 466, "ABLaze AT SEA", 3, WHITE);
  kicker(536, 528, "3  WAR AT SEA  -  GULF OF FINLAND", TEAL);
  drawText(536, 554, "SPARTA II", 3, INK);
  drawText(536, 578, "CATCHES FIRE", 3, INK);
  para(536, 610, 448, "A Russian cargo ship burns after a drone strike off Finland.", 2, 18, GREY);

  // ---- ROW 3: three panels
  // Alcaraz wins the ATP Finals
  panel(24, 660, 316, 204, WHITE);
  rect(24, 660, 316, 10, GREEN);
  // tennis ball + trophy cup
  circle(72, 716, 22, [190, 220, 60]);
  line(56, 700, 88, 730, WHITE); line(88, 700, 56, 730, WHITE);
  rect(120, 700, 60, 30, GOLD); rect(132, 730, 36, 8, GOLD);
  kicker(40, 756, "4  SPORT  -  TURIN", GREEN);
  drawText(40, 782, "ALCARAZ", 3, INK);
  drawText(40, 806, "WINS ATP FINALS", 2, INK);
  drawText(40, 836, "6-2, 7-6 VS ZVEREV", 2, GREY);

  // World Chess Championship begins in Geneva
  panel(354, 660, 316, 204, WHITE);
  rect(354, 660, 316, 10, BLUE);
  // mini chessboard 4x4
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if ((r + c) % 2 === 0) rect(370 + c * 22, 676 + r * 22, 22, 22, INK);
    else rect(370 + c * 22, 676 + r * 22, 22, 22, CREAM);
  }
  circle(381, 687, 7, WHITE); circle(425, 731, 7, RED);
  kicker(466, 700, "5  CHESS", BLUE);
  drawText(466, 726, "GENEVA", 2, INK);
  para(370, 768, 284, "Gukesh defends his world title against Sindarov as the championship opens in Geneva.", 2, 18, GREY);

  // India-Nepal deals
  panel(684, 660, 316, 204, WHITE);
  rect(684, 660, 316, 10, ORANGE);
  // two flags side by side
  rect(700, 676, 60, 40, ORANGE); circle(730, 696, 10, BLUE);
  rect(780, 676, 60, 40, RED); tri(780, 676, 840, 696, 780, 716, RED);
  kicker(700, 730, "6  DIPLOMACY  -  DELHI", ORANGE);
  drawText(700, 756, "INDIA-NEPAL", 2, INK);
  drawText(700, 780, "8 DEALS SIGNED", 2, INK);
  para(700, 802, 284, "Modi announces a Rs 15,000-crore package for energy and trade.", 2, 18, GREY);

  // ---- bottom ticker
  rect(24, 876, 976, 88, FOREST);
  rect(24, 876, 976, 4, GOLD);
  drawText(40, 892, "ALSO TODAY", 3, GOLD);
  drawText(40, 920, "O'HARE GROUND STOP IN THANKSGIVING RUSH  *  SENSEX -1,484", 2, WHITE);
  drawText(40, 942, "TRUMP BLAMES DEMOCRATS FOR $1TN SELLOFF AFTER MIDTERMS", 2, WHITE);
  textCenter(512, 978, "SOURCES: REUTERS  *  AP  *  CNN  *  BBC  *  24 NOVEMBER 2026", 2, GREY);

  writePng();
}

main();
