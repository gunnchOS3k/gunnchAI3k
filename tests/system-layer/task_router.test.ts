import { TaskRouter, routeTask } from '../../src/system-layer/task_router';

describe('Wave C task_router', () => {
  const router = new TaskRouter();

  it('routes all six capabilities locally by default', () => {
    const caps = [
      'tutoring',
      'code',
      'device_help',
      'game_coach',
      'network',
      'rag',
    ] as const;
    for (const capability of caps) {
      const decision = router.route({
        capability,
        query: `probe ${capability}`,
        deviceProfileId: capability === 'code' ? 'ds_xl_coder' : 'student_14_5',
      });
      expect(decision.destination).toBe('local');
      expect(decision.disclosure.cloudPermitted).toBe(false);
      expect(decision.modelIds.length).toBeGreaterThan(0);
    }
  });

  it('rejects code on handheld profile', () => {
    const decision = routeTask({
      capability: 'code',
      query: 'write function',
      deviceProfileId: 'handheld_hybrid',
    });
    expect(decision.destination).toBe('reject');
  });

  it('allows cloud only with consent + cloud-allowed + eligible capability', () => {
    const denied = routeTask({
      capability: 'tutoring',
      query: 'explain mimo',
      processingMode: 'cloud-allowed',
      userCloudConsent: false,
    });
    expect(denied.destination).toBe('local');

    const allowed = routeTask({
      capability: 'tutoring',
      query: 'explain mimo',
      processingMode: 'cloud-allowed',
      userCloudConsent: true,
    });
    expect(allowed.destination).toBe('cloud');
    expect(allowed.preferredBackend).toBe('cloud-policy-stub');
  });

  it('forces local for sensitive data even with cloud consent', () => {
    const decision = routeTask({
      capability: 'rag',
      query: 'my student notes',
      processingMode: 'cloud-allowed',
      userCloudConsent: true,
      containsSensitiveLocalData: true,
    });
    expect(decision.destination).toBe('local');
    expect(decision.disclosure.cloudPermitted).toBe(false);
  });

  it('keeps device_help/network/game_coach local-only by policy', () => {
    for (const capability of ['device_help', 'network', 'game_coach'] as const) {
      const decision = routeTask({
        capability,
        query: 'probe',
        processingMode: 'cloud-allowed',
        userCloudConsent: true,
      });
      expect(decision.destination).toBe('local');
      expect(decision.disclosure.cloudPermitted).toBe(false);
    }
  });
});
