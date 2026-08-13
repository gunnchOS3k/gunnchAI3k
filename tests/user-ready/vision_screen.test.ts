import { VisionScreenRuntime } from '../../src/user-ready/vision_screen';

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

  it('describes an explicitly shared local SVG after permission', () => {
    const vs = new VisionScreenRuntime();
    vs.grant('u1', 'screen');
    const out = vs.inspect('u1', {
      kind: 'screen',
      title: 'Shared region',
      buffer: Buffer.from(
        '<svg width="64" height="32"><text x="1" y="12">compiler error TS2345</text></svg>',
      ),
      claimedAt: new Date().toISOString(),
    });
    expect(out.ok).toBe(true);
    expect(out.permission).toBe('granted');
    expect(out.backgroundCapture).toBe(false);
    expect(out.description).toMatch(/TS2345/);
    expect(out.format).toBe('svg');
  });
});
