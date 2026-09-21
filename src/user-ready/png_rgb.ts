/**
 * Minimal RGB8 PNG encoder/decoder for real raster fixtures (no silent screenshots).
 * Filter 0 only. Used by vision VLM tests so pixels — not fixture JSON — carry meaning.
 */

import { createHash } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';

export interface RgbImage {
  width: number;
  height: number;
  rgb: Buffer;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

export function encodePngRgb(img: RgbImage): Buffer {
  const { width, height, rgb } = img;
  if (rgb.length !== width * height * 3) {
    throw new Error(`PNG_RGB_SIZE:${rgb.length}!=${width * height * 3}`);
  }
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export function decodePngRgb(buf: Buffer): RgbImage {
  if (buf.length < 24 || buf[0] !== 0x89 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('NOT_PNG');
  }
  let width = 0;
  let height = 0;
  const idats: Buffer[] = [];
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idats.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (!width || !height || idats.length === 0) throw new Error('PNG_PARSE');
  const raw = inflateSync(Buffer.concat(idats));
  const stride = width * 3 + 1;
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    if (filter !== 0) throw new Error(`PNG_FILTER_${filter}`);
    raw.copy(rgb, y * width * 3, y * stride + 1, y * stride + 1 + width * 3);
  }
  return { width, height, rgb };
}

export function pixel(img: RgbImage, x: number, y: number): [number, number, number] {
  const i = (y * img.width + x) * 3;
  return [img.rgb[i]!, img.rgb[i + 1]!, img.rgb[i + 2]!];
}

export function fillRect(
  img: RgbImage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
): void {
  for (let yy = y; yy < y + h && yy < img.height; yy++) {
    for (let xx = x; xx < x + w && xx < img.width; xx++) {
      if (xx < 0 || yy < 0) continue;
      const i = (yy * img.width + xx) * 3;
      img.rgb[i] = r;
      img.rgb[i + 1] = g;
      img.rgb[i + 2] = b;
    }
  }
}

export function blankRgb(width: number, height: number, r = 255, g = 255, b = 255): RgbImage {
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = r;
    rgb[i + 1] = g;
    rgb[i + 2] = b;
  }
  return { width, height, rgb };
}

export function sha256Png(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}
