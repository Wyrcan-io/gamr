export type Point = { x: number; y: number };
export type Direction = 'N' | 'E' | 'S' | 'W';
export type SideId = 'player' | 'enemy';
export type FactionId = SideId | 'neutral';
export type ShipClassId = 'scout' | 'escort' | 'flagship';
export type TerrainCell = 'sea' | 'island' | 'fog';
export type Phase = 'start' | 'briefing' | 'planning' | 'orderReview' | 'roundReport' | 'replay' | 'battleReport' | 'ending';
export type BattleMode = 'campaign' | 'skirmish';
export type ObjectiveKind = 'eliminate' | 'hold' | 'escort';

export interface ShipState {
  id: string;
  side: FactionId;
  classId: ShipClassId;
  pos: Point;
  facing: Direction;
  hull: number;
  reload: 0 | 1;
  afloat: boolean;
}

export type ShipOrder =
  | { type: 'ahead' | 'port' | 'starboard' | 'about' | 'brace' | 'hold' }
  | { type: 'fire'; target: Point }
  | { type: 'sweep' }
  | { type: 'smoke'; target: Point };

export interface ContactTrack {
  contactId: string;
  classId?: ShipClassId;
  lastExact: Point;
  lastFacing: Direction | null;
  lastHull?: number;
  lastSeenRound: number;
  age: number;
  possible: Point[];
  exact: boolean;
  source: 'visual' | 'sweep' | 'gunFlash' | 'impact';
}

export interface IntelligenceState {
  tracks: Record<string, ContactTrack>;
}

export interface SmokeState { pos: Point; remaining: number; owner: SideId; }

export interface ObjectiveState {
  kind: ObjectiveKind;
  point?: Point;
  controlPoints: Point[];
  controlNeeded: number;
  holdRounds: number;
  controlStreak: number;
  courierId?: string;
  courierRoute?: Point[];
  courierProgress: number;
  text: string;
}

export interface Scenario {
  id: string;
  title: string;
  briefing: string[];
  terrain: TerrainCell[][];
  roundLimit: number;
  objective: ObjectiveState;
  player: Array<Pick<ShipState, 'id' | 'classId' | 'pos' | 'facing'>>;
  enemy: Array<Pick<ShipState, 'id' | 'classId' | 'pos' | 'facing'>>;
  neutral?: Array<Pick<ShipState, 'id' | 'classId' | 'pos' | 'facing'>>;
  enemyDoctrine: 'training' | 'raider' | 'gunline' | 'fogrunner' | 'black-pennant';
  signals: 'full' | 'sparse' | 'none';
  mastery: string;
}

export interface ObservedShip extends ShipState { side: FactionId; }

export interface ObservationState {
  viewer: SideId;
  round: number;
  terrain: TerrainCell[][];
  ownShips: ShipState[];
  visibleShips: ShipState[];
  tracks: ContactTrack[];
  smoke: SmokeState[];
  objective: ObjectiveState;
  scenarioTitle: string;
}

export interface ResolutionEvent {
  text: string;
  side?: FactionId;
  shipId?: string;
  publicTo: SideId[];
  kind: 'info' | 'warning' | 'success' | 'damage';
}

export interface GameState {
  version: 1;
  seed: number;
  mode: BattleMode;
  scenarioIndex: number;
  phase: Phase;
  round: number;
  roundLimit: number;
  scenario: Scenario;
  ships: ShipState[];
  wrecks: Point[];
  smoke: SmokeState[];
  orders: Record<SideId, Record<string, ShipOrder>>;
  intelligence: Record<SideId, IntelligenceState>;
  sweepReveals: Record<SideId, string[]>;
  flashReveals: Record<SideId, string[]>;
  objective: ObjectiveState;
  reports: ResolutionEvent[];
  log: string[];
  notice: string;
  outcome: 'victory' | 'defeat' | 'draw' | null;
  flags: number;
  campaignFlags: number[];
  campaignComplete: boolean;
  selectedShipId: string;
  cursor: Point;
  panel: 'contacts' | 'log' | 'mission';
  replayIndex: number;
  helpOpen: boolean;
}

export type Command =
  | { type: 'start'; mode: BattleMode }
  | { type: 'dismissBriefing' }
  | { type: 'selectShip'; shipId: string }
  | { type: 'moveCursor'; delta: Point }
  | { type: 'queueOrder'; shipId: string; order: ShipOrder }
  | { type: 'clearOrder'; shipId: string }
  | { type: 'cyclePanel' }
  | { type: 'openOrderReview' }
  | { type: 'closeOrderReview' }
  | { type: 'sealOrders' }
  | { type: 'openReplay' | 'advanceReplay' | 'toggleHelp' }
  | { type: 'dismissReport' }
  | { type: 'restart' }
  | { type: 'nextBattle' };
