export type BlockKind = 'load' | 'push' | 'neg' | 'abs' | 'dup' | 'swap' | 'add' | 'sub' | 'mul' | 'minmax' | 'predicate' | 'select' | 'return';
export type BlockVariant = string | number;
export type FaultCode = 'UNDERFLOW' | 'RANGE' | 'RETURN_ARITY';
export type PuzzleMode = 'tutorial' | 'campaign' | 'daily';

export interface BlockInstance {
  id: string;
  kind: BlockKind;
  variant: BlockVariant;
  variants?: BlockVariant[];
  locked?: boolean;
}

export interface TestCase {
  id: string;
  input: Partial<Record<'X' | 'Y', number>>;
  expected: number;
}

export interface PuzzleDefinition {
  id: string;
  chapter: number;
  title: string;
  contract: string;
  slotCount: number;
  blocks: BlockInstance[];
  tests: TestCase[];
  hints: [string, string, string];
  referenceProgram: string[];
  targets?: { maxBlocks?: number; maxTotalSteps?: number };
}

export interface TraceFrame {
  line: number;
  blockId: string;
  instruction: string;
  stackBefore: number[];
  stackAfter: number[];
  output?: number;
  fault?: FaultCode;
}

export interface TestResult {
  testId: string;
  status: 'pass' | 'mismatch' | 'fault' | 'unrun';
  actual?: number;
  trace: TraceFrame[];
  fault?: FaultCode;
}

export interface RepairSnapshot {
  tape: Array<string | null>;
  variants: Record<string, BlockVariant>;
}

export interface ClearRecord {
  patched: boolean;
  lean: boolean;
  clean: boolean;
  runs: number;
  edits: number;
}

export type Focus = 'tape' | 'tray' | 'tests';
export type Phase = 'start' | 'brief' | 'editing' | 'complete' | 'ending';

export interface StackTraceState {
  version: 1;
  phase: Phase;
  mode: PuzzleMode;
  puzzleId: string;
  tape: Array<string | null>;
  tray: string[];
  blocks: Record<string, BlockInstance>;
  selectedTapeSlot: number;
  selectedTrayIndex: number;
  selectedTestIndex: number;
  traceFrameIndex: number;
  focus: Focus;
  liftedBlockId: string | null;
  results: TestResult[];
  undo: RepairSnapshot[];
  redo: RepairSnapshot[];
  clears: Record<string, ClearRecord>;
  edits: number;
  runs: number;
  hintsUsed: number;
  notice: string;
}

export type Command =
  | { type: 'start'; mode: PuzzleMode }
  | { type: 'focus'; focus: Focus }
  | { type: 'move'; delta: -1 | 1 }
  | { type: 'insert'; blockId: string; at: number }
  | { type: 'lift'; at: number }
  | { type: 'drop'; at: number }
  | { type: 'return'; at: number }
  | { type: 'mutate'; blockId: string; direction: -1 | 1 }
  | { type: 'undo' } | { type: 'redo' }
  | { type: 'run' }
  | { type: 'selectTest'; delta: -1 | 1 }
  | { type: 'trace'; delta: -1 | 1 }
  | { type: 'hint'; tier: 1 | 2 | 3 }
  | { type: 'next' } | { type: 'restart' };

export interface CommandResult { state: StackTraceState; events: string[]; }

export const RANGE_MIN = -99;
export const RANGE_MAX = 99;
