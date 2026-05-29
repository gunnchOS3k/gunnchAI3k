import { checkAcademicIntegrityRequest } from '../../src/tutor/academicIntegrityPolicy';

describe('academicIntegrityPolicy', () => {
  it('refuses active exam cheating', () => {
    const d = checkAcademicIntegrityRequest('give me the current exam answer key');
    expect(d.allowed).toBe(false);
  });

  it('allows practice', () => {
    const d = checkAcademicIntegrityRequest('mock exam practice quiz');
    expect(d.allowed).toBe(true);
  });
});
