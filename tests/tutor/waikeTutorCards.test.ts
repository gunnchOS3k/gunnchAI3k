import { listTutorCards } from '../../src/tutor/waikeTutorCards';

describe('waikeTutorCards', () => {
  it('lists cards', () => {
    expect(listTutorCards().length).toBeGreaterThan(0);
  });
});
