/**
 * Pure slide/merge logic for 2048 game
 * Extracted for testability
 */

export interface SlideResult {
  result: number[];
  merged: boolean[];
  moved: boolean;
  mergeScore: number;
}

/**
 * Slide and merge a row of tiles toward index 0
 * This is the core 2048 mechanic
 *
 * @param row - Array of tile values (0 = empty)
 * @param gridSize - Size of the grid (default 4)
 * @returns SlideResult with new row, merge info, and score
 */
export function slide(row: number[], gridSize: number = 4): SlideResult {
  // Filter out empty cells
  const filtered = row.filter(x => x !== 0);
  const merged: boolean[] = [];
  const result: number[] = [];

  // Check if tiles will move just by compacting
  let moved = row.some((v, i) => v !== 0 && i >= filtered.length);
  let mergeScore = 0;

  // Process tiles, merging adjacent equal values
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      // Merge two equal tiles
      const newVal = filtered[i] * 2;
      result.push(newVal);
      merged.push(true);
      mergeScore += newVal;
      moved = true;
      i += 2;
    } else {
      // Keep single tile
      result.push(filtered[i]);
      merged.push(false);
      i++;
    }
  }

  // Pad with zeros
  while (result.length < gridSize) {
    result.push(0);
    merged.push(false);
  }

  // Final check if anything actually moved
  if (!moved) {
    moved = row.some((v, idx) => v !== result[idx]);
  }

  return { result, merged, moved, mergeScore };
}

/**
 * Check if any moves are possible on the grid
 *
 * @param grid - 2D array of tile values
 * @returns true if at least one move is possible
 */
export function canMakeMove(grid: number[][]): boolean {
  const size = grid.length;

  // Check for empty cells
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === 0) return true;
    }
  }

  // Check for adjacent equal values
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const val = grid[y][x];
      // Check right neighbor
      if (x < size - 1 && grid[y][x + 1] === val) return true;
      // Check bottom neighbor
      if (y < size - 1 && grid[y + 1][x] === val) return true;
    }
  }

  return false;
}

/**
 * Check if the grid contains a 2048 (or higher) tile
 *
 * @param grid - 2D array of tile values
 * @param target - Target value (default 2048)
 * @returns true if target value exists
 */
export function hasReachedTarget(grid: number[][], target: number = 2048): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell >= target) return true;
    }
  }
  return false;
}
