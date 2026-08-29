// Generates the PWA icons as PNGs with no image dependencies.
//
// The mark is three ascending bars — a shift-by-shift record adding up, which
// is what the app is for. Full-bleed on purpose: iOS and Android each apply
// their own corner masking, so baking in rounded corners double-rounds them.
//
//   node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BG = [0x0b, 0x0d, 0x12];
const FG = [0x3d, 0xd6, 0x8c];

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
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
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  // Three bars, bottom-aligned, ascending left to right.
  const barW = size * 0.145;
  const gap = size * 0.075;
  const groupW = barW * 3 + gap * 2;
  const x0 = (size - groupW) / 2;
  const baseY = size * 0.735;
  const heights = [0.20, 0.31, 0.42].map((h) => size * h);
  const radius = barW / 2;

  const raw = Buffer.alloc((size * 3 + 1) * size);
  let p = 0;

  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // no per-scanline filter
    for (let x = 0; x < size; x++) {
      let color = BG;

      for (let i = 0; i < 3; i++) {
        const bx = x0 + i * (barW + gap);
        const topY = baseY - heights[i];
        if (x < bx || x >= bx + barW || y < topY || y >= baseY) continue;

        // Round the top cap so the bars don't read as blunt blocks.
        if (y < topY + radius) {
          const dx = x - (bx + barW / 2);
          const dy = y - (topY + radius);
          if (dx * dx + dy * dy > radius * radius) continue;
        }
        color = FG;
        break;
      }

      raw[p++] = color[0];
      raw[p++] = color[1];
      raw[p++] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [180, 192, 512]) {
  const file = `public/icons/icon-${size}.png`;
  writeFileSync(file, png(size));
  console.log(`wrote ${file}`);
}
