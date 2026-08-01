export const GRID_WIDTH = 15;
export const GRID_HEIGHT = 9;

export interface Point { x: number; y: number; }

export type NodeKind = 'bulk-source' | 'substation' | 'district' | 'microgrid' | 'switch';
export type DistrictKind = 'hospital' | 'water' | 'communications' | 'transit' | 'residential' | 'industry';
export type EdgeKind = 'feeder' | 'tie' | 'underground';
export type EdgeCondition = 'intact' | 'faulted' | 'repairing' | 'unbuilt';
export type BreakerState = 'open' | 'closed' | 'tripped';
export type TripCause = 'overload' | 'transient' | 'fault' | null;
export type StormKind = 'lightning-transient' | 'fallen-tree' | 'wind-damage' | 'flood-derate' | 'demand-surge' | 'debris-delay';
export type Phase = 'start' | 'briefing' | 'running' | 'upgrade' | 'won' | 'gameOver';

export interface GeneratorState {
  capacityMW: number;
  fuel: number;
  online: boolean;
}

export interface DistrictState {
  kind: DistrictKind;
  baseDemandMW: number;
  requestedMW: number;
  serviceWeight: number;
  strainPerDarkBeat: number;
  serviceBreaker: 'open' | 'closed';
  powered: boolean;
  darkBeats: number;
  pickupBeatsRemaining: number;
  pickupPhase: 0 | 1 | 2;
  eventMultiplier: number;
}

export interface GridNode {
  id: string;
  label: string;
  kind: NodeKind;
  position: Point;
  capacityMW: number;
  flowMW: number;
  heat: number;
  sourceOnline: boolean;
  district?: DistrictState;
  generator?: GeneratorState;
}

export interface GridEdge {
  id: string;
  label: string;
  from: string;
  to: string;
  route: Point[];
  kind: EdgeKind;
  condition: EdgeCondition;
  breaker: BreakerState;
  tripCause: TripCause;
  capacityMW: number;
  flowMW: number;
  heat: number;
  energized: boolean;
  faultKind: StormKind | null;
  repairBeats: number;
  protective: boolean;
}

export interface Assignment {
  nodeId: string;
  sourceId: string;
  parentNodeId: string | null;
  parentEdgeId: string | null;
  depth: number;
}

export interface CrewJob {
  id: string;
  edgeId: string;
  kind: 'repair' | 'build';
  remainingBeats: number;
  totalBeats: number;
}

export interface StormEvent {
  id: string;
  stage: number;
  impactTick: number;
  revealTick: number;
  kind: StormKind;
  zoneId: string;
  targetId: string;
  magnitude: number;
  resolved: boolean;
}

export interface StageDefinition {
  id: string;
  name: string;
  activeDistrictIds: string[];
  requiredDistrictIds: string[];
  minimumServiceRatio: number;
  holdBeats: number;
  demandMultiplier: number;
  events: StormEvent[];
  briefing: string[];
}

export interface LogEntry {
  tick: number;
  text: string;
  tone: 'normal' | 'good' | 'warn' | 'bad';
  entityId?: string;
}

export interface EngineEvent {
  kind: 'info' | 'good' | 'warning' | 'bad' | 'energize' | 'trip' | 'fault' | 'complete' | 'upgrade';
  text: string;
  entityId?: string;
  value?: number;
}

export interface TickResult {
  events: EngineEvent[];
  energizedEdges: string[];
  deenergizedEdges: string[];
  trips: string[];
  faults: string[];
  districtsRestored: string[];
  jobsCompleted: string[];
  stageCleared: boolean;
}

export type Selection = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | { kind: 'cell'; point: Point };

export interface Upgrade {
  id: string;
  name: string;
  description: string;
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'standard' | 'tutorial';
  phase: Phase;
  tick: number;
  stageIndex: number;
  stages: StageDefinition[];
  nodes: Record<string, GridNode>;
  edges: Record<string, GridEdge>;
  assignments: Record<string, Assignment>;
  jobs: CrewJob[];
  crewSlots: number;
  lineKits: number;
  generatorFuel: number;
  focusCharges: number;
  upgrades: string[];
  civicStrain: number;
  maximumStrain: number;
  stabilityBeats: number;
  score: number;
  feederTrips: number;
  sourceTrips: number;
  maxHeat: number;
  selected: Selection;
  forecast: StormEvent[];
  eventLog: LogEntry[];
  lastEvents: EngineEvent[];
  tutorialStep: number | null;
  stageScoreStart: number;
}

export type Command =
  | { type: 'startStandard'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'dismissBriefing' }
  | { type: 'moveSelection'; dx: number; dy: number }
  | { type: 'cycleSelection'; direction: 1 | -1 }
  | { type: 'toggleBreaker' }
  | { type: 'startCrewJob' }
  | { type: 'toggleDistrict' }
  | { type: 'toggleGenerator' }
  | { type: 'chooseUpgrade'; upgradeId: string }
  | { type: 'toggleHelp' }
  | { type: 'restartSameSeed' };

export interface CommandResult {
  state: GameState;
  accepted: boolean;
  events: EngineEvent[];
  reason?: string;
}
