import { CollaborationWorkspace, CrossDeviceContinuity, DEFAULT_CONTINUITY_POLICY } from '../../src/phase_xiv';

describe('phase_xiv collab + continuity', () => {
  it('blocks personal memory leak into shared assist', () => {
    const ws = new CollaborationWorkspace();
    const p = ws.create('Shared Lab', 'alice');
    ws.addMember(p.id, 'bob');
    ws.rememberPersonal('bob', 'ssn-000-00-0000');
    ws.comment(p.id, 'bob', 'note with ssn-000-00-0000 leaked');
    expect(ws.exportShared(p.id).comments[0].text).toContain('REDACTED_PERSONAL_MEMORY');
    expect(() => ws.assist(p.id, 'bob', 'use ssn-000-00-0000')).toThrow(/PERSONAL_MEMORY_LEAK/);
    expect(ws.assist(p.id, 'bob', 'summarize shared artifacts').length).toBeGreaterThan(10);
  });

  it('hands off across devices with sensitive blocked by default', () => {
    const cont = new CrossDeviceContinuity();
    const env = cont.handoff('Student', 'Handheld', {
      user_id: 'u1',
      project_id: 'p1',
      conversation_id: 'c1',
      preferences: { theme: 'dark' },
      task_ids: ['t1'],
      sensitive_blocked: false,
    });
    expect(env.policy).toEqual(DEFAULT_CONTINUITY_POLICY);
    expect(env.state.sensitive_blocked).toBe(true);
    expect(env.transport).toBe('local_handoff');
  });
});
