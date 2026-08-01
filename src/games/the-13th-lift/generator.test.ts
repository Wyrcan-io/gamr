import { describe, expect, it } from 'vitest';
import { createRide, generateValidatedRide, validateRide } from './generator';

describe('The 13th Lift generator', () => {
  it('is deterministic and produces actionable puzzles', () => {
    const first = createRide(1234, 4, 2);
    const second = createRide(1234, 4, 2);
    expect(first).toEqual(second);
    expect(validateRide(first)).toEqual([]);
    expect(first.safeRoutes.length).toBeGreaterThan(0);
  });

  it('validates representative seeds in every shift contract', () => {
    for (const seed of [1, 7, 77, 1234, 99991]) {
      for (let shift = 0; shift <= 4; shift++) {
        const ride = generateValidatedRide(seed, shift, 0);
        expect(validateRide(ride), `seed ${seed}, shift ${shift}`).toEqual([]);
      }
    }
  });
});
