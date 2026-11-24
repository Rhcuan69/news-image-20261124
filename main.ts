// news-image-20261124 — "The World Today, Tuesday 24 November 2026"
// A front page drawn from scratch for this bounty only, with a pixel
// font stored as strings and a hand-built PNG encoder.
// Node 24, PURE stdlib (fs + zlib only). No network at runtime.
// Deterministic: fixed date string, fixed palette, fixed geometry.
// Writes a 1024x1024 PNG to /output/entry.png.
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
// Raw RGB framebuffer, three bytes per pixel, row-major.
const buf = new Uint8Array(W * H * 3);
function dot(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function box(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) { buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; i += 3; }
  }
}
function disc(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) dot(cx + x, cy + y, c);
  }
}
function halo(cx: number, cy: number, r: number, t: number, c: number[]): void {
  for (let y = -r - t; y <= r + t; y++) for (let x = -r - t; x <= r + t; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d >= r - t && d <= r + t) dot(cx + x, cy + y, c);
  }
}
function seg(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) dot(Math.round(x0 + dx * i / n), Math.round(y0 + dy * i / n), c);
}
function wedge(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
    const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
    const cc = 1 - a - b;
    if (a >= 0 && b >= 0 && cc >= 0) dot(x, y, c);
  }
}
function fade(x: number, y: number, w: number, h: number, top: number[], bot: number[]): void {
  for (let yy = 0; yy < h; yy++) {
    const t = yy / Math.max(1, h - 1);
    const c = [0, 1, 2].map((k) => Math.round(top[k] + (bot[k] - top[k]) * t));
    box(x, y + yy, w, 1, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 strings of 5 characters; "1" is ink, "0" is blank.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
  "%": ["11001", "11001", "00010", "00100", "01000", "10011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
};
function measure(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}
function write(x: number, y: number, s: string, sc: number, c: number[]): number {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = GLYPHS[ch] || GLYPHS["?"];
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") box(cx + col * sc, y + r * sc, sc, sc, c);
    }
    cx += 6 * sc;
  }
  return cx;
}
function center(cx: number, y: number, s: string, sc: number, c: number[]): void {
  write(cx - Math.floor(measure(s, sc) / 2), y, s, sc, c);
}
// Word-wrap paragraph; returns y after last line.
function block(x: number, y: number, maxW: number, s: string, sc: number, lh: number, c: number[]): number {
  const words = s.split(" ");
  let line = "";
  let cy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (measure(test, sc) > maxW && line) {
      write(x, cy, line, sc, c);
      cy += lh;
      line = w;
    } else line = test;
  }
  if (line) { write(x, cy, line, sc, c); cy += lh; }
  return cy;
}
function tag(x: number, y: number, s: string, c: number[]): void {
  write(x, y, s, 2, c);
}

// ---------------------------------------------------------------- PNG encoder
// Build the PNG by hand: signature, IHDR, one IDAT with zlib-deflated
// raw scanlines (filter byte 0 per row), IEND. CRC32 is computed over
// the chunk type plus its data, with the standard reversed polynomial.
function be32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}
function crcOf(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let k = 0; k < 8; k++) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  return Buffer.concat([be32(data.length), body, be32(crcOf(body))]);
}
function save(): void {
  const raw = Buffer.alloc(H * (1 + W * 3));
  const frame = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    frame.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0)),
  ]);
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync(OUT, png);
}

// ---------------------------------------------------------------- compose
function card(x: number, y: number, w: number, h: number, bg: number[]): void {
  box(x, y, w, h, bg);
  box(x, y, w, 3, GOLD);
  box(x, y, 3, h, INK);
  box(x + w - 3, y, 3, h, INK);
  box(x, y + h - 3, w, 3, INK);
}

function main(): void {
  box(0, 0, W, H, PAPER);

  // ---- masthead
  box(0, 0, W, 112, FOREST);
  box(0, 112, W, 6, GOLD);
  center(512, 16, "THE WORLD TODAY", 6, WHITE);
  center(512, 64, "TUESDAY 24 NOVEMBER 2026  *  ONE IMAGE  *  SEVEN STORIES", 2, GOLD);
  write(28, 90, "MARKETS  *  CLIMATE  *  WAR  *  SPORT  *  CHESS", 2, [178, 205, 190]);
  write(1024 - 28 - measure("NEWS-IMAGE-20261124", 2), 90, "NEWS-IMAGE-20261124", 2, [178, 205, 190]);

  // ---- HERO: Huang returns to Nvidia
  card(24, 130, 976, 292, WHITE);
  fade(620, 146, 364, 260, [16, 60, 46], [34, 120, 60]);
  // chip
  box(668, 196, 268, 150, [20, 32, 28]);
  box(684, 212, 236, 118, FOREST2);
  for (let i = 0; i < 5; i++) {
    box(668, 216 + i * 28, 16, 10, GOLD);
    box(920, 216 + i * 28, 16, 10, GOLD);
  }
  write(700, 236, "NVDA", 5, WHITE);
  write(700, 282, "HUANG", 4, GOLD);
  write(700, 312, "IS BACK", 4, GOLD);
  // rising chart arrow, below the chip
  seg(640, 398, 700, 382, GOLD); seg(700, 382, 760, 388, GOLD);
  seg(760, 388, 830, 370, GOLD); seg(830, 370, 900, 376, GOLD);
  seg(900, 376, 960, 352, GOLD);
  wedge(960, 352, 936, 354, 956, 378, GOLD);
  disc(700, 382, 5, GOLD); disc(830, 370, 5, GOLD);
  // +31% stamp
  box(648, 146, 188, 40, RED);
  write(660, 154, "+31% IN A DAY", 2, WHITE);
  // hero text
  tag(44, 150, "1  MARKETS  -  SANTA CLARA", GREEN);
  write(44, 178, "HUANG", 7, INK);
  write(44, 234, "IS BACK", 7, INK);
  block(44, 296, 556, "Nvidia reinstates Jensen Huang as CEO just 11 days after he resigned. Shares soar 31%, their best day since 2003, adding about $950bn in value.", 2, 20, INK);
  write(44, 392, "NASDAQ +6.5%  *  S+P +4.7%  *  DOW +1,448", 2, TEAL);

  // ---- ROW 2: two panels
  // COP31 suspended
  card(24, 434, 480, 214, WHITE);
  box(40, 450, 448, 62, FOREST);
  // globe with a crack, half in shadow
  disc(88, 486, 20, SKY); disc(80, 480, 7, GREEN); disc(96, 494, 6, GREEN);
  seg(72, 470, 88, 486, INK); seg(88, 486, 82, 502, INK);
  write(130, 466, "NO DEAL", 4, WHITE);
  write(130, 498, "TALKS SUSPENDED", 2, GOLD);
  tag(40, 528, "2  CLIMATE  -  ANTALYA", RED);
  write(40, 554, "COP31 ENDS", 3, INK);
  write(40, 578, "WITHOUT A DEAL", 3, INK);
  block(40, 610, 448, "Nearly 200 nations leave Antalya with no deal. Talks resume next year.", 2, 18, GREY);

  // Sparta II ablaze in the Gulf of Finland
  card(520, 434, 480, 214, WHITE);
  box(536, 450, 448, 62, [24, 44, 60]);
  // sea + burning ship
  box(536, 492, 448, 20, [52, 110, 168]);
  box(640, 472, 180, 20, [90, 96, 104]);
  wedge(640, 472, 700, 472, 670, 444, [120, 130, 140]);
  wedge(700, 444, 730, 460, 700, 478, ORANGE);
  wedge(740, 440, 770, 462, 740, 480, RED);
  wedge(770, 446, 800, 464, 772, 482, ORANGE);
  disc(880, 466, 6, RED);
  write(548, 466, "ABLaze AT SEA", 3, WHITE);
  tag(536, 528, "3  WAR AT SEA  -  GULF OF FINLAND", TEAL);
  write(536, 554, "SPARTA II", 3, INK);
  write(536, 578, "CATCHES FIRE", 3, INK);
  block(536, 610, 448, "A Russian cargo ship burns after a drone strike off Finland.", 2, 18, GREY);

  // ---- ROW 3: three panels
  // Alcaraz wins the ATP Finals
  card(24, 660, 316, 204, WHITE);
  box(24, 660, 316, 10, GREEN);
  // tennis ball + trophy cup
  disc(72, 716, 22, [190, 220, 60]);
  seg(56, 700, 88, 730, WHITE); seg(88, 700, 56, 730, WHITE);
  box(120, 700, 60, 30, GOLD); box(132, 730, 36, 8, GOLD);
  tag(40, 756, "4  SPORT  -  TURIN", GREEN);
  write(40, 782, "ALCARAZ", 3, INK);
  write(40, 806, "WINS ATP FINALS", 2, INK);
  write(40, 836, "6-2, 7-6 VS ZVEREV", 2, GREY);

  // World Chess Championship begins in Geneva
  card(354, 660, 316, 204, WHITE);
  box(354, 660, 316, 10, BLUE);
  // mini chessboard 4x4
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if ((r + c) % 2 === 0) box(370 + c * 22, 676 + r * 22, 22, 22, INK);
    else box(370 + c * 22, 676 + r * 22, 22, 22, CREAM);
  }
  disc(381, 687, 7, WHITE); disc(425, 731, 7, RED);
  tag(466, 700, "5  CHESS", BLUE);
  write(466, 726, "GENEVA", 2, INK);
  block(370, 768, 284, "Gukesh defends his world title against Sindarov as the championship opens in Geneva.", 2, 18, GREY);

  // India-Nepal deals
  card(684, 660, 316, 204, WHITE);
  box(684, 660, 316, 10, ORANGE);
  // two flags side by side
  box(700, 676, 60, 40, ORANGE); disc(730, 696, 10, BLUE);
  box(780, 676, 60, 40, RED); wedge(780, 676, 840, 696, 780, 716, RED);
  tag(700, 730, "6  DIPLOMACY  -  DELHI", ORANGE);
  write(700, 756, "INDIA-NEPAL", 2, INK);
  write(700, 780, "8 DEALS SIGNED", 2, INK);
  block(700, 802, 284, "Modi announces a Rs 15,000-crore package for energy and trade.", 2, 18, GREY);

  // ---- bottom ticker
  box(24, 876, 976, 88, FOREST);
  box(24, 876, 976, 4, GOLD);
  write(40, 892, "ALSO TODAY", 3, GOLD);
  write(40, 920, "O'HARE GROUND STOP IN THANKSGIVING RUSH  *  SENSEX -1,484", 2, WHITE);
  write(40, 942, "TRUMP BLAMES DEMOCRATS FOR $1TN SELLOFF AFTER MIDTERMS", 2, WHITE);
  center(512, 978, "SOURCES: REUTERS  *  AP  *  CNN  *  BBC  *  24 NOVEMBER 2026", 2, GREY);

  save();
}

main();
