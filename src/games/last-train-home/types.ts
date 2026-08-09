export type Direction = 'N' | 'E' | 'S' | 'W';
export type TrainKind = 'passenger' | 'medical' | 'supply';
export type TileKind = 'void' | 'track' | 'station' | 'junction' | 'bridge' | 'tunnel';
export type HazardKind = 'flood' | 'fire' | 'landslide' | 'signal-failure';
export type Phase = 'start' | 'briefing' | 'planning' | 'turnReport' | 'ending' | 'gameOver';
export interface Point { x: number; y: number; }
export interface Tile {
  kind: TileKind;
  connections: Direction[];
  station?: string;
  safeTerminus?: boolean;
  switchExits?: Direction[];
  activeExit?: Direction;
  closed: boolean;
  obstruction: boolean;
  reinforced: boolean;
}
export interface Train {
  id: string;
  name: string;
  kind: TrainKind;
  position: Point;
  heading: Direction;
  people: number;
  supplies: number;
  priority: 1 | 2 | 3;
  status: 'moving' | 'held' | 'blocked' | 'stranded' | 'evacuated' | 'derailed';
  holdUntilTurn: number | null;
}
export interface HazardEvent {
  id: string;
  turn: number;
  warningTurns: number;
  kind: HazardKind;
  target: Point;
  effect: 'close-track' | 'block-junction' | 'obstruct-track';
  repairable: boolean;
  resolved?: boolean;
}
export interface Scenario {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  trains: Train[];
  hazards: HazardEvent[];
  maxTurns: number;
  targetPeople: number;
  targetSupplies: number;
  briefing: string[];
}
export interface LogEntry { turn: number; text: string; tone?: 'normal' | 'good' | 'warn' | 'bad'; }
export interface TurnResolution { events: LogEntry[]; moved: string[]; blocked: string[]; evacuated: string[]; closed: Point[]; }
export interface TurnProjection {
  trains: Array<{ id: string; from: Point; to?: Point; outcome: 'move' | 'hold' | 'block' | 'arrive' }>;
  hazards: Array<{ id: string; target: Point; outcome: 'hit' | 'reinforced' | 'resolved' }>;
  warnings: string[];
}
export type Selection = { kind: 'tile'; point: Point } | { kind: 'train'; trainId: string };
export interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign';
  phase: Phase;
  scenarioIndex: number;
  scenario: Scenario;
  turn: number;
  maxTurns: number;
  actionPoints: number;
  repairUsedThisTurn: boolean;
  trains: Record<string, Train>;
  selected: Selection;
  forecast: HazardEvent[];
  resolvedEvents: HazardEvent[];
  evacuatedPeople: number;
  evacuatedSupplies: number;
  targetPeople: number;
  targetSupplies: number;
  eventLog: LogEntry[];
  lastResolution: TurnResolution | null;
  tutorialStep: number | null;
  helpOpen: boolean;
}
export type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'dismissBriefing' }
  | { type: 'moveSelection'; dx: number; dy: number }
  | { type: 'selectNextTrain'; direction: 1 | -1 }
  | { type: 'switchJunction' }
  | { type: 'holdTrain' }
  | { type: 'repair' }
  | { type: 'clear' }
  | { type: 'commitTurn' }
  | { type: 'dismissReport' }
  | { type: 'toggleHelp' }
  | { type: 'restart'; seed?: number };
export interface CommandResult { state: GameState; events: LogEntry[]; }
