import type { BlockInstance, PuzzleDefinition } from './types';

const b = (id: string, kind: BlockInstance['kind'], variant: BlockInstance['variant'], variants?: BlockInstance['variant'][]): BlockInstance => ({ id, kind, variant, variants });
const ret = (id = 'ret'): BlockInstance => ({ id, kind: 'return', variant: 'RETURN', locked: true });

export const PUZZLES: PuzzleDefinition[] = [
  {
    id: 'B01', chapter: 0, title: 'BOOT SEQUENCE', contract: 'Return X unchanged.', slotCount: 3,
    blocks: [b('load', 'load', 'X', ['X', 'Y']), ret()],
    tests: [{ id: 'T01', input: { X: 0 }, expected: 0 }, { id: 'T02', input: { X: 5 }, expected: 5 }, { id: 'T03', input: { X: -2 }, expected: -2 }],
    hints: ['The input must reach RETURN.', 'Use LOAD X before RETURN.', 'Place LOAD X in the first slot.'], referenceProgram: ['load', 'ret'], targets: { maxBlocks: 1, maxTotalSteps: 6 },
  },
  {
    id: 'B02', chapter: 0, title: 'ONE MORE', contract: 'Return X + 1.', slotCount: 4,
    blocks: [b('add', 'add', 'ADD'), b('one', 'push', 1, [-1, 0, 1, 2]), b('load', 'load', 'X', ['X', 'Y']), ret()],
    tests: [{ id: 'T01', input: { X: 0 }, expected: 1 }, { id: 'T02', input: { X: 4 }, expected: 5 }, { id: 'T03', input: { X: -3 }, expected: -2 }],
    hints: ['ADD needs two values.', 'Load X and PUSH 1 before ADD.', 'Order: LOAD X → PUSH 1 → ADD.'], referenceProgram: ['load', 'one', 'add', 'ret'], targets: { maxBlocks: 3, maxTotalSteps: 12 },
  },
  {
    id: 'B03', chapter: 1, title: 'BAD CONSTANT', contract: 'Return X - 2.', slotCount: 4,
    blocks: [b('load', 'load', 'X', ['X', 'Y']), b('sub', 'sub', 'SUB'), b('two', 'push', 1, [-2, -1, 0, 1, 2]), ret()],
    tests: [{ id: 'T01', input: { X: 2 }, expected: 0 }, { id: 'T02', input: { X: 0 }, expected: -2 }, { id: 'T03', input: { X: -4 }, expected: -6 }],
    hints: ['SUB computes second-from-top minus top.', 'The literal must be 2, and it goes above X.', 'Mutate PUSH 1 to PUSH 2, then LOAD X → PUSH 2 → SUB.'], referenceProgram: ['load', 'two', 'sub', 'ret'], targets: { maxBlocks: 3, maxTotalSteps: 12 },
  },
  {
    id: 'B04', chapter: 1, title: 'AMPLIFIER', contract: 'Return 2 × X.', slotCount: 5,
    blocks: [b('mul', 'mul', 'MUL'), b('load', 'load', 'X', ['X', 'Y']), b('two', 'push', 2, [0, 1, 2, 3]), b('junk', 'neg', 'NEG'), ret()],
    tests: [{ id: 'T01', input: { X: 1 }, expected: 2 }, { id: 'T02', input: { X: 4 }, expected: 8 }, { id: 'T03', input: { X: -3 }, expected: -6 }],
    hints: ['NEG is not part of this repair.', 'Use LOAD X, PUSH 2, and MUL.', 'Return the three-block pipeline and leave NEG in the tray.'], referenceProgram: ['load', 'two', 'mul', 'ret'], targets: { maxBlocks: 3, maxTotalSteps: 12 },
  },
  {
    id: 'C01', chapter: 2, title: 'REVERSED SENSOR', contract: 'Return Y - X.', slotCount: 4,
    blocks: [b('x', 'load', 'X', ['X', 'Y']), b('y', 'load', 'Y', ['X', 'Y']), b('sub', 'sub', 'SUB'), ret()],
    tests: [{ id: 'T01', input: { X: 2, Y: 5 }, expected: 3 }, { id: 'T02', input: { X: 9, Y: 1 }, expected: -8 }, { id: 'T03', input: { X: 0, Y: 0 }, expected: 0 }],
    hints: ['SUB subtracts the top value from the value below it.', 'Load X first, then Y.', 'Sequence: LOAD X → LOAD Y → SUB.'], referenceProgram: ['x', 'y', 'sub', 'ret'], targets: { maxBlocks: 3, maxTotalSteps: 12 },
  },
  {
    id: 'C02', chapter: 2, title: 'ECHO CHAMBER', contract: 'Return X + X.', slotCount: 4,
    blocks: [b('add', 'add', 'ADD'), b('dup', 'dup', 'DUP'), b('load', 'load', 'X', ['X', 'Y']), ret()],
    tests: [{ id: 'T01', input: { X: 0 }, expected: 0 }, { id: 'T02', input: { X: 3 }, expected: 6 }, { id: 'T03', input: { X: -4 }, expected: -8 }],
    hints: ['A single LOAD gives one value.', 'DUP makes a second copy before ADD.', 'Sequence: LOAD X → DUP → ADD.'], referenceProgram: ['load', 'dup', 'add', 'ret'], targets: { maxBlocks: 3, maxTotalSteps: 12 },
  },
  {
    id: 'C03', chapter: 3, title: 'SIGNATURE', contract: 'Return the absolute value of X.', slotCount: 3,
    blocks: [b('load', 'load', 'X', ['X', 'Y']), b('op', 'abs', 'ABS', ['ABS', 'NEG']), ret()],
    tests: [{ id: 'T01', input: { X: -5 }, expected: 5 }, { id: 'T02', input: { X: 0 }, expected: 0 }, { id: 'T03', input: { X: 7 }, expected: 7 }],
    hints: ['The operation must preserve positive values.', 'Mutate the unary card to ABS.', 'Sequence: LOAD X → ABS → RETURN.'], referenceProgram: ['load', 'op', 'ret'], targets: { maxBlocks: 2, maxTotalSteps: 6 },
  },
  {
    id: 'C04', chapter: 4, title: 'SAFER READING', contract: 'Return the larger of X and Y.', slotCount: 4,
    blocks: [b('x', 'load', 'X', ['X', 'Y']), b('y', 'load', 'Y', ['X', 'Y']), b('pick', 'minmax', 'MIN', ['MIN', 'MAX']), ret()],
    tests: [{ id: 'T01', input: { X: 2, Y: 5 }, expected: 5 }, { id: 'T02', input: { X: 8, Y: -1 }, expected: 8 }, { id: 'T03', input: { X: 3, Y: 3 }, expected: 3 }],
    hints: ['Both readings must be on the stack before the choice.', 'The larger choice is MAX.', 'Load X → LOAD Y → mutate MIN to MAX.'], referenceProgram: ['x', 'y', 'pick', 'ret'], targets: { maxBlocks: 3, maxTotalSteps: 12 },
  },
  {
    id: 'D01', chapter: 5, title: 'BALANCE CHECK', contract: 'Return X + 3.', slotCount: 4,
    blocks: [b('x', 'load', 'X', ['X', 'Y']), b('k', 'push', -3, [-3, -2, -1, 0, 1, 2, 3]), b('op', 'add', 'ADD', ['ADD', 'SUB', 'MUL']), ret()],
    tests: [{ id: 'T01', input: { X: -7 }, expected: -4 }, { id: 'T02', input: { X: 0 }, expected: 3 }, { id: 'T03', input: { X: 6 }, expected: 9 }],
    hints: ['A positive correction uses ADD.', 'Mutate the constant to 3.', 'Load X → PUSH 3 → ADD.'], referenceProgram: ['x', 'k', 'op', 'ret'], targets: { maxBlocks: 3, maxTotalSteps: 12 },
  },
  {
    id: 'D02', chapter: 5, title: 'DISTANCE', contract: 'Return |X| + |Y|.', slotCount: 7,
    blocks: [b('x', 'load', 'X', ['X', 'Y']), b('y', 'load', 'Y', ['X', 'Y']), b('ax', 'abs', 'ABS'), b('ay', 'abs', 'ABS'), b('add', 'add', 'ADD'), ret()],
    tests: [{ id: 'T01', input: { X: -2, Y: 5 }, expected: 7 }, { id: 'T02', input: { X: -4, Y: -3 }, expected: 7 }, { id: 'T03', input: { X: 0, Y: -9 }, expected: 9 }],
    hints: ['Each input needs its own ABS before the sum.', 'Do not reuse one ABS card for both values.', 'Load/ABS X, then Load/ABS Y, then ADD.'], referenceProgram: ['x', 'ax', 'y', 'ay', 'add', 'ret'], targets: { maxBlocks: 5, maxTotalSteps: 18 },
  },
];

export const TUTORIAL_IDS = ['B01', 'B02', 'B03', 'C02'];
export const campaignPuzzles = (): PuzzleDefinition[] => PUZZLES;
export const puzzleById = (id: string): PuzzleDefinition => PUZZLES.find(puzzle => puzzle.id === id) ?? PUZZLES[0];
