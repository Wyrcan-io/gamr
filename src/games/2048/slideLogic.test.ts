import { describe, it, expect } from 'vitest';
import { slide, canMakeMove, hasReachedTarget } from './slideLogic';

describe('slide', () => {
  describe('basic sliding', () => {
    it('slides tiles to the left', () => {
      const { result, moved } = slide([0, 0, 2, 0]);
      expect(result).toEqual([2, 0, 0, 0]);
      expect(moved).toBe(true);
    });

    it('compacts multiple tiles', () => {
      const { result, moved } = slide([0, 2, 0, 4]);
      expect(result).toEqual([2, 4, 0, 0]);
      expect(moved).toBe(true);
    });

    it('does not move already-packed tiles', () => {
      const { result, moved } = slide([2, 4, 0, 0]);
      expect(result).toEqual([2, 4, 0, 0]);
      expect(moved).toBe(false);
    });

    it('handles all zeros', () => {
      const { result, moved } = slide([0, 0, 0, 0]);
      expect(result).toEqual([0, 0, 0, 0]);
      expect(moved).toBe(false);
    });

    it('handles full row with no merges', () => {
      const { result, moved } = slide([2, 4, 8, 16]);
      expect(result).toEqual([2, 4, 8, 16]);
      expect(moved).toBe(false);
    });
  });

  describe('merging', () => {
    it('merges two adjacent equal tiles', () => {
      const { result, merged, mergeScore } = slide([2, 2, 0, 0]);
      expect(result).toEqual([4, 0, 0, 0]);
      expect(merged[0]).toBe(true);
      expect(mergeScore).toBe(4);
    });

    it('merges tiles after compacting', () => {
      const { result, mergeScore } = slide([2, 0, 2, 0]);
      expect(result).toEqual([4, 0, 0, 0]);
      expect(mergeScore).toBe(4);
    });

    it('merges two pairs separately', () => {
      const { result, merged, mergeScore } = slide([2, 2, 4, 4]);
      expect(result).toEqual([4, 8, 0, 0]);
      expect(merged).toEqual([true, true, false, false]);
      expect(mergeScore).toBe(12); // 4 + 8
    });

    it('only merges once per tile (left wins)', () => {
      const { result, mergeScore } = slide([2, 2, 2, 0]);
      expect(result).toEqual([4, 2, 0, 0]);
      expect(mergeScore).toBe(4);
    });

    it('handles four equal tiles (two merges)', () => {
      const { result, mergeScore } = slide([2, 2, 2, 2]);
      expect(result).toEqual([4, 4, 0, 0]);
      expect(mergeScore).toBe(8);
    });

    it('merges high-value tiles correctly', () => {
      const { result, mergeScore } = slide([1024, 1024, 0, 0]);
      expect(result).toEqual([2048, 0, 0, 0]);
      expect(mergeScore).toBe(2048);
    });
  });

  describe('merged array', () => {
    it('marks merged positions correctly', () => {
      const { merged } = slide([4, 4, 2, 0]);
      expect(merged[0]).toBe(true);  // 4+4=8 at position 0
      expect(merged[1]).toBe(false); // 2 at position 1
    });

    it('does not mark non-merged tiles', () => {
      const { merged } = slide([2, 4, 8, 0]);
      expect(merged).toEqual([false, false, false, false]);
    });
  });

  describe('moved detection', () => {
    it('detects movement from compacting', () => {
      const { moved } = slide([0, 2, 0, 0]);
      expect(moved).toBe(true);
    });

    it('detects movement from merging', () => {
      const { moved } = slide([2, 2, 0, 0]);
      expect(moved).toBe(true);
    });

    it('detects no movement when nothing can move', () => {
      const { moved } = slide([2, 4, 8, 16]);
      expect(moved).toBe(false);
    });
  });

  describe('custom grid sizes', () => {
    it('works with 3x3 grid', () => {
      const { result } = slide([0, 2, 2], 3);
      expect(result).toEqual([4, 0, 0]);
    });

    it('works with 5x5 grid', () => {
      const { result } = slide([2, 0, 2, 0, 4], 5);
      expect(result).toEqual([4, 4, 0, 0, 0]);
    });
  });
});

describe('canMakeMove', () => {
  it('returns true when there are empty cells', () => {
    const grid = [
      [2, 4],
      [0, 8],
    ];
    expect(canMakeMove(grid)).toBe(true);
  });

  it('returns true when horizontal merge is possible', () => {
    const grid = [
      [2, 2],
      [4, 8],
    ];
    expect(canMakeMove(grid)).toBe(true);
  });

  it('returns true when vertical merge is possible', () => {
    const grid = [
      [2, 4],
      [2, 8],
    ];
    expect(canMakeMove(grid)).toBe(true);
  });

  it('returns false when no moves are possible', () => {
    const grid = [
      [2, 4],
      [8, 16],
    ];
    expect(canMakeMove(grid)).toBe(false);
  });

  it('returns false for alternating full grid', () => {
    const grid = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(canMakeMove(grid)).toBe(false);
  });

  it('returns true when only corner merge possible', () => {
    const grid = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2048, 4096],
      [8192, 16384, 32768, 32768], // Only last two can merge
    ];
    expect(canMakeMove(grid)).toBe(true);
  });
});

describe('hasReachedTarget', () => {
  it('returns true when 2048 exists', () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 2048, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(hasReachedTarget(grid)).toBe(true);
  });

  it('returns true when value exceeds 2048', () => {
    const grid = [
      [4096, 0],
      [0, 0],
    ];
    expect(hasReachedTarget(grid)).toBe(true);
  });

  it('returns false when 2048 not reached', () => {
    const grid = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(hasReachedTarget(grid)).toBe(false);
  });

  it('works with custom target', () => {
    const grid = [
      [128, 0],
      [0, 0],
    ];
    expect(hasReachedTarget(grid, 128)).toBe(true);
    expect(hasReachedTarget(grid, 256)).toBe(false);
  });

  it('handles empty grid', () => {
    const grid = [
      [0, 0],
      [0, 0],
    ];
    expect(hasReachedTarget(grid)).toBe(false);
  });
});
