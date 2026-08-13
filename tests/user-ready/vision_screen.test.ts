import { VisionScreenRuntime } from '../../src/user-ready/vision_screen';
import { createVisionPngFixture } from '../../src/user-ready/vision_canvas';

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

  it('understands shared UI beyond IHDR: WAIKE next action, compiler, office, control-by-role', () => {
    const vs = new VisionScreenRuntime();
    vs.grant('u1', 'screen');
    vs.grant('u1', 'file');

    const waike = vs.inspect(
      'u1',
      {
        kind: 'screen',
        title: 'WAIKE',
        buffer: Buffer.from(
          JSON.stringify({
            vision_fixture: true,
            width: 320,
            height: 200,
            texts: ['WAIKE tutor', 'Next lesson'],
            objects: ['lesson_card'],
            controls: [{ role: 'button', name: 'Start', x: 200, y: 160, w: 80, h: 28 }],
          }),
        ),
        claimedAt: new Date().toISOString(),
        redactions: [{ x: 0, y: 0, w: 20, h: 10, reason: 'pii' }],
      },
      { type: 'waike_next_action' },
    );
    expect(waike.ok).toBe(true);
    expect(waike.pixelUnderstanding).toBe(true);
    expect(waike.redacted).toBe(true);
    expect(waike.description).toMatch(/Start|Click/i);

    const compiler = vs.inspect(
      'u1',
      {
        kind: 'image',
        buffer: Buffer.from(
          '<svg width="64" height="32"><text x="1" y="12">compiler error TS2345</text></svg>',
        ),
        claimedAt: new Date().toISOString(),
      },
      { type: 'compiler_error' },
    );
    expect(compiler.ok).toBe(true);
    expect(compiler.description).toMatch(/TS2345/);

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
    expect(office.ok).toBe(true);
    expect(office.pixelUnderstanding).toBe(true);
    expect(office.observations?.summary).toMatch(/Document|OFDM|Lab/i);

    const control = vs.inspect(
      'u1',
      {
        kind: 'screen',
        buffer: Buffer.from(
          JSON.stringify({
            vision_fixture: true,
            width: 100,
            height: 60,
            texts: ['Save'],
            controls: [{ role: 'button', name: 'Save', x: 10, y: 30, w: 40, h: 16 }],
          }),
        ),
        claimedAt: new Date().toISOString(),
      },
      { type: 'identify_control', role: 'button' },
    );
    expect(control.ok).toBe(true);
    expect(control.description).toMatch(/button/i);
  });

  it('rejects IHDR-only PNG as insufficient pixel understanding', () => {
    const vs = new VisionScreenRuntime();
    vs.grant('u1', 'file');
    // Minimal PNG signature + IHDR dimensions, no fixture marker.
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
    expect(out.notes).toMatch(/IHDR_ONLY/);
  });
});
