/**
 * Minimal PNG fixture builder for vision tests (no native canvas dependency).
 * Embeds a JSON vision fixture after a marker so pixel shares carry structure.
 */

export function createVisionPngFixture(fixture: {
  width: number;
  height: number;
  texts: string[];
  objects?: string[];
  controls?: Array<{ role: string; name: string; x: number; y: number; w: number; h: number }>;
  scene?: string;
}): Buffer {
  const payload = {
    format: 'png',
    width: fixture.width,
    height: fixture.height,
    texts: fixture.texts,
    objects: fixture.objects ?? ['ui'],
    controls: fixture.controls ?? [],
    scene: fixture.scene ?? fixture.texts.join(' '),
  };
  const marker = Buffer.from(`GUNNCHAI_VISION_FIXTURE:${JSON.stringify(payload)}\0`);
  // Minimal valid 1x1 PNG IHDR-sized to declared width/height (header only + marker).
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(fixture.width, 0);
  ihdrData.writeUInt32BE(fixture.height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB
  const ihdr = pngChunk('IHDR', ihdrData);
  const idat = pngChunk('IDAT', Buffer.from([0x78, 0x01, 0x01, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x01]));
  const iend = pngChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend, marker]);
}

/** Back-compat alias used by vision_screen exports. */
export function createCanvas(): never {
  throw new Error('Use createVisionPngFixture — no browser canvas in this runtime');
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}
