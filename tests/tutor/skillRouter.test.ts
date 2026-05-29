import { routeSkillQuery } from '../../src/tutor/skillRouter';

describe('skillRouter', () => {
  it('routes wireless queries', () => {
    const r = routeSkillQuery('explain 6g beam selection');
    expect(r.domainId).toBe('wireless_6g');
  });

  it('defaults to digital confidence', () => {
    const r = routeSkillQuery('hello');
    expect(r.domainId).toBe('digital_confidence');
  });
});
