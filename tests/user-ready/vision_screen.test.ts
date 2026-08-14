import * as path from 'node:path';
import { VisionScreenRuntime } from '../../src/user-ready/vision_screen';
import { createVisionPngFixture } from '../../src/user-ready/vision_canvas';

const FIX = (name: string) => path.join(process.cwd(), 'fixtures', 'user-ready', name);

describe('AI-UR-011 vision/screen explicit share', () => {
  it('refuses missing share and missing permission; never background-captures', () => {
    const vs = new VisionScreenRuntime();
    expect(vs.inspect('u1', null).ok).toBe(false);
    const share = {
      kind: 'screen' as const,
      title: 'Editor',
      buffer: Buffer.from('<svg width="40" height="20"><text>error TS2345</text></svg>'),
      claimedAt: new Date().toISOString(),
    };
    expect(vs.inspect('u1', share).permission).toBe('denied');
    expect(() => vs.startBackgroundCapture()).toThrow(/BACKGROUND_SURVEILLANCE_FORBIDDEN/);
    expect(vs.hasBackgroundTimer()).toBe(false);
  });

  it('OCR+layout stack on real PNG fixtures: WAIKE, compiler, office, game, UI', () => {
    const vs = new VisionScreenRuntime();
    expect(vs.tesseractAvailable()).toBe(true);
    vs.grant('u1', 'screen');
    vs.grant('u1', 'file');

    const waike = vs.inspect(
      'u1',
      {
        kind: 'screen',
        title: 'WAIKE',
        filePath: FIX('waike_tutor.png'),
        claimedAt: new Date().toISOString(),
        redactions: [{ x: 0, y: 0, w: 20, h: 10, reason: 'pii' }],
      },
      { type: 'waike_next_action' },
    );
    expect(waike.ok).toBe(true);
    expect(waike.ocrUsed).toBe(true);
    expect(waike.beyondOcrOnly).toBe(true);
    expect(waike.stack).toBe('ocr_layout_vlm');
    expect(waike.completeness).toBe('COMPLETE');
    expect(waike.redacted).toBe(true);
    expect(waike.description).toMatch(/Start|Click/i);

    const compiler = vs.inspect(
      'u1',
      {
        kind: 'image',
        filePath: FIX('compiler_error.png'),
        claimedAt: new Date().toISOString(),
      },
      { type: 'compiler_error' },
    );
    expect(compiler.ok).toBe(true);
    expect(compiler.ocrUsed).toBe(true);
    expect(compiler.description).toMatch(/TS2345/);

    const office = vs.inspect(
      'u1',
      {
        kind: 'image',
        filePath: FIX('office_doc.png'),
        claimedAt: new Date().toISOString(),
      },
      { type: 'office_summary' },
    );
    expect(office.ok).toBe(true);
    expect(office.observations?.summary).toMatch(/Document|OFDM|Lab/i);

    const game = vs.inspect(
      'u1',
      {
        kind: 'screen',
        filePath: FIX('game_hud.png'),
        claimedAt: new Date().toISOString(),
      },
      { type: 'game_hud' },
    );
    expect(game.ok).toBe(true);
    expect(game.description).toMatch(/Fire|Score|HP/i);

    const control = vs.inspect(
      'u1',
      {
        kind: 'screen',
        filePath: FIX('ui_toolbar.png'),
        claimedAt: new Date().toISOString(),
      },
      { type: 'identify_control', role: 'button' },
    );
    expect(control.ok).toBe(true);
    expect(control.description).toMatch(/button/i);
  });

  it('fixture-only PNG without OCR path stays PARTIAL (not COMPLETE)', () => {
    const vs = new VisionScreenRuntime();
    vs.grant('u1', 'file');
    // createVisionPngFixture embeds JSON but has no real OCR glyphs — if tesseract fails to read,
    // stack is fixture_structured PARTIAL.
    const office = vs.inspect(
      'u1',
      {
        kind: 'image',
        buffer: createVisionPngFixture({
          width: 180,
          height: 100,
          texts: ['Lab report abstract', 'OFDM cyclic prefix'],
        }),
        claimedAt: new Date().toISOString(),
      },
      { type: 'office_summary' },
    );
    if (!office.ocrUsed) {
      expect(office.completeness).toBe('PARTIAL');
      expect(office.stack).toMatch(/fixture_structured|unavailable/);
    }
  });

  it('rejects IHDR-only PNG as insufficient pixel understanding', () => {
    const vs = new VisionScreenRuntime();
    vs.grant('u1', 'file');
    const ihdrOnly = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);
    const out = vs.inspect('u1', {
      kind: 'image',
      buffer: ihdrOnly,
      claimedAt: new Date().toISOString(),
    });
    expect(out.pixelUnderstanding).toBe(false);
    expect(out.notes).toMatch(/IHDR_ONLY|TESSERACT/);
  });
});
