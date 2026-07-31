import { describe, expect, it } from 'vitest';
import { puzzleById } from './content';
import { blockLabel, runProgram, runSuite } from './machine';

describe('stack trace machine', () => {
  it('runs a reference program for every boot test', () => {
    const puzzle = puzzleById('B02');
    const blocks = Object.fromEntries(puzzle.blocks.map(block => [block.id, { ...block }]));
    const tape = ['load', 'one', 'add', 'ret'];
    expect(runSuite(puzzle, tape, blocks).every(result => result.status === 'pass')).toBe(true);
  });

  it('reports operand order and a useful trace', () => {
    const puzzle = puzzleById('C01');
    const blocks = Object.fromEntries(puzzle.blocks.map(block => [block.id, { ...block }]));
    const result = runProgram(puzzle, ['x', 'y', 'sub', 'ret'], blocks, puzzle.tests[0]);
    expect(result.status).toBe('mismatch');
    expect(result.actual).toBe(-3);
    expect(result.trace[2]?.instruction).toBe('SUB');
    expect(blockLabel(blocks.x)).toBe('LOAD X');
  });

  it('faults on underflow and range overflow', () => {
    const puzzle = puzzleById('B02');
    const blocks = Object.fromEntries(puzzle.blocks.map(block => [block.id, { ...block }]));
    expect(runProgram(puzzle, ['add', 'ret'], blocks, puzzle.tests[0]).fault).toBe('UNDERFLOW');
    const overflow = puzzleById('B04');
    const overflowBlocks = Object.fromEntries(overflow.blocks.map(block => [block.id, { ...block }]));
    expect(runProgram(overflow, ['load', 'two', 'mul', 'ret'], overflowBlocks, { id: 'OV', input: { X: 60 }, expected: 0 }).fault).toBe('RANGE');
  });
});
