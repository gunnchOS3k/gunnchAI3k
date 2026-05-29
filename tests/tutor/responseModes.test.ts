import { parseResponseMode } from '../../src/tutor/responseModes';

describe('responseModes', () => {
  it('parses beginner', () => {
    expect(parseResponseMode('beginner')).toBe('beginner');
  });
});
