export type Phase = 'start' | 'briefing' | 'running' | 'won' | 'report' | 'gameOver';
export type Mode = 'training' | 'standard';
export type LampMode = 'off' | 'blue' | 'red' | 'uv';
export type WaterMode = 'dry' | 'mist' | 'soak';
export type ChamberId = 'a1' | 'a2' | 'b1' | 'b2';

export type SpeciesId = 'heliox' | 'cinder' | 'mire' | 'nocturne' | 'prism';
export type MutationId =
  | 'solar-sails'
  | 'reservoir-bladders'
  | 'ember-corolla'
  | 'lumen-veins'
  | 'anchor-roots'
  | 'sterile-crown'
  | 'mirror-skin'
  | 'mycelial-bridge'
  | 'night-clock'
  | 'runner-nodes';
export type ExpressionId =
  | 'solar-corolla'
  | 'starwell'
  | 'sealed-bouquet'
  | 'prism-relay'
  | 'shared-cistern'
  | 'moon-lantern'
  | 'living-trellis'
  | 'heliostat-canopy';

export type PlantStat = 'mass' | 'bloom' | 'glow';

export interface SpeciesDefinition {
  id: SpeciesId;
  name: string;
  shortName: string;
  glyph: string;
  asciiGlyph: string;
  tags: string[];
  lightFit: Record<LampMode, number>;
  waterFit: Record<WaterMode, number>;
  baseRooting: number;
  baseSpores: number;
  description: string;
}

export interface MutationDefinition {
  id: MutationId;
  name: string;
  shortName: string;
  description: string;
}

export interface ExpressionDefinition {
  id: ExpressionId;
  name: string;
  requires: [MutationId, MutationId];
  description: string;
}

export type ContractRequirement =
  | { kind: 'statMin'; stat: PlantStat; value: number }
  | { kind: 'statMax'; stat: 'stress' | 'rootPressure'; value: number }
  | { kind: 'species'; speciesId: SpeciesId }
  | { kind: 'mutation'; mutationId: MutationId }
  | { kind: 'expression'; expressionId: ExpressionId }
  | { kind: 'sterile' }
  | { kind: 'mutationCount'; value: 0 | 1 | 2 };

export interface ContractTemplate {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  requirements: ContractRequirement[];
  baseFunding: number;
  priorityOffset: number;
  description: string;
}

export interface SeedVial {
  id: string;
  speciesId: SpeciesId;
}

export interface PlantState {
  id: string;
  name: string;
  speciesId: SpeciesId;
  age: number;
  mass: number;
  bloom: number;
  glow: number;
  stress: number;
  mutationIds: MutationId[];
  mutationOffers: MutationId[];
  discoveredExpressionIds: ExpressionId[];
  visualSeed: number;
}

export interface ChamberState {
  id: ChamberId;
  plant: PlantState | null;
  lamp: LampMode;
  water: WaterMode;
  rootPressure: number;
  lastRootDelta: number;
}

export interface ContractState {
  id: string;
  templateId: string;
  name: string;
  requirements: ContractRequirement[];
  baseFunding: number;
  priorityCycle: number;
  description: string;
}

export type PendingOperation =
  | { type: 'seed'; chamberId: ChamberId; vialId: string }
  | { type: 'splice'; chamberId: ChamberId; mutationId: MutationId }
  | { type: 'prune'; chamberId: ChamberId }
  | { type: 'serviceFilter' }
  | { type: 'deliver'; chamberId: ChamberId; contractId: string }
  | { type: 'cull'; chamberId: ChamberId }
  | null;

export interface FacilityState {
  lightBudget: number;
  waterBudget: number;
  filterLoad: number;
  filterCapacity: number;
  biosecuritySeals: number;
  mutationReagent: number;
  funding: number;
  fundingTarget: number;
}

export interface CompletedContract {
  contractId: string;
  name: string;
  funding: number;
  early: boolean;
  cycle: number;
}

export interface ContainmentIncident {
  cycle: number;
  kind: 'root' | 'filter';
  chamberId?: ChamberId;
  text: string;
}

export interface LogEntry {
  cycle: number;
  text: string;
  tone: 'normal' | 'good' | 'warn' | 'bad';
}

export type EngineEventKind =
  | 'info'
  | 'growth'
  | 'mutation'
  | 'expression'
  | 'contractReady'
  | 'delivery'
  | 'warning'
  | 'breach'
  | 'filter'
  | 'complete';

export interface EngineEvent {
  kind: EngineEventKind;
  text: string;
  chamberId?: ChamberId;
  value?: number;
}

export interface GameState {
  version: 1;
  seed: number;
  mode: Mode;
  phase: Phase;
  outcome: 'none' | 'won' | 'deferred' | 'shutdown';
  cycle: number;
  maxCycles: number;
  chambers: Record<ChamberId, ChamberState>;
  facility: FacilityState;
  activeContracts: Array<ContractState | null>;
  contractQueue: ContractState[];
  completedContracts: CompletedContract[];
  vialRack: Array<SeedVial | null>;
  vialQueue: SeedVial[];
  selectedChamberId: ChamberId;
  pendingOperation: PendingOperation;
  discoveries: ExpressionId[];
  incidents: ContainmentIncident[];
  eventLog: LogEntry[];
  lastEvents: EngineEvent[];
  tutorialStep: number | null;
  helpOpen: boolean;
  score: number;
}

export type Command =
  | { type: 'startStandard'; seed?: number }
  | { type: 'startTraining' }
  | { type: 'dismissBriefing' }
  | { type: 'moveSelection'; dx: number; dy: number }
  | { type: 'cycleLamp' }
  | { type: 'cycleWater' }
  | { type: 'queueOperation'; operation: Exclude<PendingOperation, null> }
  | { type: 'cancelOperation' }
  | { type: 'commitCycle' }
  | { type: 'closeShiftEarly' }
  | { type: 'toggleHelp' }
  | { type: 'restartSameSeed' };

export interface CommandResult {
  state: GameState;
  accepted: boolean;
  events: EngineEvent[];
  reason?: string;
}

export interface CycleProjection {
  state: GameState;
  accepted: boolean;
  events: EngineEvent[];
  reason?: string;
}
