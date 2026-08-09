export type Point = { x: number; y: number };
export type Direction = 'N' | 'E' | 'S' | 'W';
export type ParcelId =
  | 'porcelain-choir'
  | 'moonwater-ampoule'
  | 'sleeping-bell'
  | 'sunless-film'
  | 'folded-familiar'
  | 'memory-mirror'
  | 'hearthseed-casket'
  | 'compass-needle';
export type SealId = 'none' | 'rush' | 'top-heavy' | 'uninsured' | 'quiet-claim' | 'oversized' | 'recipient-asleep';
export type ItemId = 'padding' | 'chalk' | 'wedge' | 'rope' | 'smoke' | 'ration' | 'strap' | 'salve' | 'cloth' | 'patch' | 'clock-key' | 'insurance' | 'coin' | 'echo' | 'idol';
export type UpgradeId = 'webbing' | 'satchel' | 'sole' | 'survey' | 'grip' | 'quiet-buckle' | 'bench-token' | 'route-memory' | 'handcart' | 'claim-stamp';
export type Phase = 'start' | 'contract' | 'briefing' | 'traversal' | 'inventory' | 'report' | 'upgrade' | 'ending' | 'gameOver';
export type TileKind = 'wall' | 'floor' | 'rough' | 'wet' | 'weak' | 'narrow' | 'anchor' | 'bench' | 'cache' | 'niche' | 'recipient' | 'dynamic';
export type ThreatKind = 'porter' | 'watcher';
export type SurveyMode = 'none' | 'routes' | 'shift' | 'threats';

export interface TileState {
  kind: TileKind;
  dynamicId?: string;
  itemId?: ItemId;
  discovered: boolean;
}

export interface ItemState {
  id: ItemId;
  quantity: number;
}

export interface CourierState {
  pos: Point;
  previousPos: Point;
  inventory: Array<ItemState | null>;
  selectedSlot: number;
}

export interface ParcelState {
  id: ParcelId;
  seal: SealId;
  condition: number;
  maxCondition: number;
  stress: number;
  tolerance: number;
  guard: number;
  size: 'small' | 'medium' | 'oversized';
  meter: number;
  directionHistory: Direction[];
  visited: string[];
}

export interface ContractState {
  parcel: ParcelState;
  pay: number;
  deadline: number;
  parTicks: number;
  hardExpiry: boolean;
  violations: string[];
}

export interface ContractOffer {
  parcelId: ParcelId;
  seal: SealId;
  pay: number;
  deadline: number;
  knownFeature: string;
}

export interface ThreatState {
  id: string;
  kind: ThreatKind;
  pos: Point;
  route: Point[];
  routeIndex: number;
  disabledTicks: number;
}

export interface FloorState {
  width: number;
  height: number;
  tiles: TileState[][];
  start: Point;
  recipient: Point;
  threats: ThreatState[];
  gateOpen: boolean;
  shiftIn: number;
  shiftCount: number;
  tick: number;
  dropped: Array<{ point: Point; item: ItemState }>;
}

export interface DeliveryReport {
  parcelId: ParcelId;
  condition: number;
  maxCondition: number;
  ticks: number;
  pay: number;
  violations: string[];
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'standard';
  phase: Phase;
  deliveryIndex: number;
  contractOffers: ContractOffer[];
  selectedOffer: number;
  contract: ContractState | null;
  floor: FloorState | null;
  courier: CourierState;
  score: number;
  pay: number;
  upgrades: UpgradeId[];
  surveyMode: SurveyMode;
  helpOpen: boolean;
  notice: string;
  eventLog: string[];
  lastReport: DeliveryReport | null;
  reports: DeliveryReport[];
  outcome: 'won' | 'lost' | null;
  floorFlags: { webbingUsed: boolean; handcartUsed: boolean; benchUsed: boolean; soleReady: boolean; claimUsed: boolean };
  previewDirection: Direction;
  previewHurried: boolean;
}

export type Command =
  | { type: 'startRun'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'chooseOffer'; index: number }
  | { type: 'dismissBriefing' }
  | { type: 'move'; direction: Direction; hurried?: boolean }
  | { type: 'previewMove'; direction: Direction; hurried?: boolean }
  | { type: 'commitMove' }
  | { type: 'brace' }
  | { type: 'wait' }
  | { type: 'interact' }
  | { type: 'useItem'; slot: number }
  | { type: 'toggleInventory' }
  | { type: 'selectInventory'; delta: number }
  | { type: 'dropItem'; slot: number }
  | { type: 'cycleSurvey' }
  | { type: 'toggleHelp' }
  | { type: 'continueReport' }
  | { type: 'chooseUpgrade'; index: number }
  | { type: 'restart'; seed?: number };

export interface ActionEvaluation {
  legal: boolean;
  label: string;
  target?: Point;
  timeCost: number;
  stressDelta: number;
  meterDelta: number;
  noise: number;
  conditionRisk: number;
  reason: string;
}

export interface CommandResult {
  state: GameState;
  events: string[];
  accepted: boolean;
}
