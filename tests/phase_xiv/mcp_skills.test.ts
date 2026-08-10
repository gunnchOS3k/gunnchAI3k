import { McpConnectorRegistry, SkillRegistry, BUILTIN_SKILLS } from '../../src/phase_xiv';

describe('phase_xiv mcp + skills', () => {
  it('discovers, authorizes, invokes, and revokes connectors', () => {
    const reg = new McpConnectorRegistry();
    const c = reg.register('local-files', [
      { name: 'list', description: 'list', input_schema: { type: 'object' } },
    ]);
    expect(reg.discover(c.id)[0].name).toBe('list');
    expect(reg.invoke('u1', c.id, 'list').ok).toBe(false);
    reg.authorize('u1', c.id, 'tok');
    expect(reg.invoke('u1', c.id, 'list', { path: '.' }).ok).toBe(true);
    reg.revoke('u1', c.id);
    expect(reg.invoke('u1', c.id, 'list').error).toBe('CONNECTOR_REVOKED');
  });

  it('registers required gunnchSkills', () => {
    const skills = new SkillRegistry();
    const names = skills.list().map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining(['Math Tutor', 'Wireless Eng', 'Cyber', 'Research', 'Device', 'Archive', 'Game Coach']),
    );
    expect(BUILTIN_SKILLS.length).toBeGreaterThanOrEqual(7);
    expect(skills.invoke('math_tutor', 'limit x->0 sinx/x').ok).toBe(true);
  });
});
