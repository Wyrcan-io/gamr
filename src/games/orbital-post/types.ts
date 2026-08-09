export type LaneId = 'dock' | 'eva' | 'comms';
export type WeatherId = 'clear' | 'veil' | 'flare' | 'storm' | 'recovery';
export type JobKind = 'cargo' | 'repair' | 'comms' | 'safety' | 'command';
export type JobPriority = 'routine' | 'urgent' | 'critical';
export type JobState = 'queued' | 'scheduled' | 'active' | 'complete' | 'blocked' | 'missed' | 'cancelled';
export type Phase = 'start' | 'briefing' | 'working' | 'cancelConfirm' | 'windowReport' | 'shiftReport' | 'upgrade' | 'gameOver' | 'ending';
export type GameMode = 'campaign' | 'openOrbit';
export type SupplyId = 'spares' | 'shielding' | 'coolant';

export interface JobEffect {
  type: 'battery' | 'integrity' | 'standing' | 'supply' | 'resolveFault' | 'setFlag' | 'unlockJob' | 'log';
  amount?: number;
  supply?: SupplyId;
  faultId?: string;
  flag?: string;
  jobId?: string;
  text?: string;
}

export interface Job {
  id: string;
  kind: JobKind;
  title: string;
  client: string;
  lanes: LaneId[];
  duration: 1 | 2 | 3;
  allowedWeather: WeatherId[];
  powerCost: number;
  arrivalWindow: number;
  earliestWindow: number;
  deadlineWindow: number;
  dependencyId?: string;
  onComplete: JobEffect[];
  onMiss: JobEffect[];
  state: JobState;
  scheduledStart?: number;
  remaining: number;
  priority: JobPriority;
  description: string;
}

export interface Fault {
  id: string;
  name: string;
  glyph: string;
  description: string;
  triggerWeather: WeatherId[];
  integrityLoss: number;
  blocks?: LaneId[];
  resolvedBy: string;
  active: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  text: string;
}

export interface ShiftDefinition {
  id: string;
  title: string;
  briefing: string;
  windows: number;
  weather: WeatherId[];
  arrivals: Array<{ window: number; templateId: string }>;
  initialFaults: string[];
  requiredTemplateIds: string[];
  optionalTemplateIds: string[];
}

export interface Incident {
  window: number;
  text: string;
  kind: 'info' | 'success' | 'warning' | 'danger';
}

export interface Reservation {
  jobId: string;
  lane: LaneId;
  window: number;
}

export interface WindowReport {
  window: number;
  weather: WeatherId;
  completed: string[];
  progressed: string[];
  blocked: Array<{ jobId: string; reason: string }>;
  missed: string[];
  faultTicks: string[];
  notices: string[];
  batteryBefore: number;
  batteryAfter: number;
  integrityBefore: number;
  integrityAfter: number;
}

export interface GameState {
  version: 1;
  seed: number;
  mode: GameMode;
  phase: Phase;
  shiftIndex: number;
  currentWindow: number;
  totalWindows: number;
  weather: WeatherId[];
  battery: number;
  batteryMax: number;
  integrity: number;
  integrityMax: number;
  standing: number;
  score: number;
  supplies: Record<SupplyId, number>;
  faults: Record<string, Fault>;
  jobs: Record<string, Job>;
  queueIds: string[];
  reservations: Reservation[];
  selectedJobId: string | null;
  selectedStartWindow: number;
  armedAdvance: boolean;
  pendingCancelJobId: string | null;
  upgrades: string[];
  upgradeOffers: Upgrade[];
  flags: Record<string, boolean>;
  reports: WindowReport[];
  log: Incident[];
  notice: string;
  helpOpen: boolean;
  logOpen: boolean;
  shiftStartSnapshot: GameState | null;
}

export type Command =
  | { type: 'startRun'; mode: GameMode; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'selectJob'; jobId: string }
  | { type: 'selectStart'; delta: number }
  | { type: 'scheduleJob' }
  | { type: 'unscheduleJob' }
  | { type: 'requestCancel' }
  | { type: 'confirmCancel'; accepted: boolean }
  | { type: 'armAdvance' }
  | { type: 'advanceWindow' }
  | { type: 'dismissWindowReport' }
  | { type: 'chooseUpgrade'; upgradeId: string }
  | { type: 'restartShift' }
  | { type: 'restartRun'; seed?: number }
  | { type: 'toggleHelp' }
  | { type: 'toggleLog' }
  ;

export interface PlacementResult { valid: boolean; reason: string; reservations: Reservation[]; }
export interface CommandResult { state: GameState; events: string[]; }
