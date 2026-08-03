export type PlaytestKey = string;

export type PlaytestCoverage = 'generic-smoke' | 'black-box-progress' | 'seeded-completion';

export interface PlaytestAction {
  key: PlaytestKey;
  /** Milliseconds to keep a key held for real-time games. */
  holdMs?: number;
  /** Milliseconds to wait after the action before observing again. */
  waitMs?: number;
  label?: string;
}

export interface TerminalSnapshot {
  frame: number;
  at: number;
  cols: number;
  rows: number;
  text: string;
  lines: string[];
  changed: boolean;
  alternateBuffer: boolean;
}

export interface PlaytestObservation extends TerminalSnapshot {
  actionCount: number;
  lastAction?: PlaytestAction;
  elapsedMs: number;
}

export interface PlaytestMemory {
  readonly values: Map<string, unknown>;
}

export type PlayerPolicy = (
  observation: PlaytestObservation,
  memory: PlaytestMemory,
) => PlaytestAction | undefined;

export interface PlaytestMilestone {
  id: string;
  description: string;
  required?: boolean;
  detect: (observation: PlaytestObservation, history: readonly PlaytestObservation[]) => boolean;
}

export interface PlaytestSpec {
  gameId: string;
  profileVersion?: number;
  coverage?: PlaytestCoverage;
  category: 'turn-based' | 'real-time' | 'text-entry' | 'unknown';
  description?: string;
  seeds?: number[];
  startActions?: PlaytestAction[];
  milestones: PlaytestMilestone[];
  policy?: PlayerPolicy;
  maxActions?: number;
  maxElapsedMs?: number;
  maxStalledFrames?: number;
}

export interface PlaytestRunOptions {
  seed?: number;
  maxActions?: number;
  maxElapsedMs?: number;
  maxStalledFrames?: number;
  viewport?: { cols: number; rows: number };
  onObservation?: (observation: PlaytestObservation) => void;
}

export type PlaytestRunStatus =
  | 'passed'
  | 'failed'
  | 'stalled'
  | 'timed-out'
  | 'crashed'
  | 'missing-game'
  | 'missing-spec';

export interface PlaytestFailure {
  kind: 'missing-milestone' | 'stalled' | 'timeout' | 'crash' | 'cleanup' | 'no-progress';
  message: string;
  atAction: number;
}

export interface PlaytestRunReport {
  gameId: string;
  coverage?: PlaytestCoverage;
  status: PlaytestRunStatus;
  seed?: number;
  actionCount: number;
  elapsedMs: number;
  milestones: Record<string, boolean>;
  failures: PlaytestFailure[];
  actions: PlaytestAction[];
  observations: PlaytestObservation[];
  terminalText: string;
  replay: string;
}
