import { describe, expect, it } from 'vitest';
import { assertValidContent, validateContent } from './validate';

describe('Night Frequency authored content', () => {
  it('has no broken references or malformed offers', () => {
    expect(validateContent()).toEqual([]);
    expect(() => assertValidContent()).not.toThrow();
  });
});
