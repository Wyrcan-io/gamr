import { describe, expect, it } from 'vitest';
import { chartName, distance, fromChart, supercoverLine } from './grid';

describe('Tiny Fleet grid geometry', () => {
  it('round-trips chart coordinates', () => {
    expect(fromChart('D6')).toEqual({ x: 3, y: 5 });
    expect(chartName({ x: 3, y: 5 })).toBe('D6');
  });

  it('uses Chebyshev range for square weapon reach', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(3);
    expect(distance({ x: 0, y: 0 }, { x: 4, y: 2 })).toBe(4);
  });

  it('includes corner-touching cells in a supercover line', () => {
    expect(supercoverLine({ x: 0, y: 0 }, { x: 2, y: 2 })).toEqual([
      { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ]);
  });
});
