export type Phase =
  | 'start'
  | 'briefing'
  | 'planning'
  | 'transit'
  | 'audit'
  | 'interlude'
  | 'finale'
  | 'ending'
  | 'gameOver';

export type GameMode = 'story' | 'tutorial' | 'after-hours';
export type ButtonId = string;
export type LandingId = string;
export type PassengerId = string;
export type StoryThreadId = 'missing-operator' | 'deleted-census' | 'building-voice';
export type AnomalyKind = 'stable' | 'adjacent-swap' | 'three-cycle' | 'phantom-button' | 'echo-button' | 'compound';

export interface Landing {
  id: LandingId;
  canonicalLabel: string;
  department: string;
  shaftIndex: number;
  authentic: boolean;
}

export interface PanelButton {
  id: ButtonId;
  label: string;
  enabled: boolean;
  suspicious: boolean;
}

export interface World {
  id: string;
  anomalyIds: string[];
  landings: Record<LandingId, Landing>;
  buttonMap: Record<ButtonId, LandingId | null>;
}

export type CluePredicate =
  | { kind: 'button-opens'; button: ButtonId; landing: LandingId }
  | { kind: 'button-is-phantom'; button: ButtonId }
  | { kind: 'button-is-authentic'; button: ButtonId }
  | { kind: 'landing-above'; upper: LandingId; lower: LandingId }
  | { kind: 'button-order'; lower: ButtonId; upper: ButtonId };

export interface Clue {
  id: string;
  speakerId: PassengerId;
  predicate: CluePredicate;
  renderedText: string;
  sourceTime: 'current' | 'previous';
}

export type ServiceConstraint =
  | { kind: 'before-passenger'; otherPassengerId: PassengerId }
  | { kind: 'by-stop'; maxStopIndex: 1 | 2 | 3 }
  | { kind: 'last-off' }
  | { kind: 'share-stop'; otherPassengerId: PassengerId };

export interface Passenger {
  id: PassengerId;
  name: string;
  archetype: string;
  destination: LandingId | null;
  constraints: ServiceConstraint[];
  clueIds: string[];
  recurringId?: string;
}

export interface ShiftContract {
  shift: number;
  title: string;
  memo: string;
  allowedAnomalies: AnomalyKind[];
  panelHasThirteen: boolean;
  passengerCount: 2 | 3;
}

export interface StopOutcome {
  button: ButtonId;
  buttonLabel: string;
  landing: LandingId | null;
  landingLabel: string;
  deliveredPassengerIds: PassengerId[];
  authentic: boolean;
}

export type RouteViolationKind = 'empty-route' | 'unknown-button' | 'phantom-stop' | 'missing-destination' | 'ordering' | 'deadline';

export interface RouteViolation {
  kind: RouteViolationKind;
  text: string;
  passengerId?: PassengerId;
  button?: ButtonId;
}

export interface EvidenceLine {
  label: string;
  text: string;
}

export interface RouteEvaluation {
  correct: boolean;
  stops: StopOutcome[];
  deliveredPassengerIds: PassengerId[];
  strandedPassengerIds: PassengerId[];
  violations: RouteViolation[];
  decisiveEvidence: EvidenceLine[];
  optimalStopCount: number;
}

export interface RidePuzzle {
  id: string;
  seed: number;
  shift: number;
  rideIndex: number;
  contract: ShiftContract;
  panel: PanelButton[];
  visibleLandings: Landing[];
  passengers: Passenger[];
  clues: Clue[];
  trueWorld: World;
  candidateWorlds: World[];
  safeRoutes: ButtonId[][];
  shortestSafeRouteLength: number;
}

export interface ThreadState {
  state: 'unseen' | 'active' | 'protected' | 'compromised' | 'resolved';
  progress: number;
  flags: string[];
}

export interface LogEntry {
  text: string;
  tone: 'normal' | 'good' | 'warn' | 'bad';
}

export interface StoryBeat {
  id: string;
  shift: number;
  thread: StoryThreadId;
  text: string[];
  flag: string;
}

export interface GameState {
  version: 1;
  seed: number;
  mode: GameMode;
  phase: Phase;
  shiftIndex: number;
  rideIndex: number;
  campaignRideIndex: number;
  puzzle: RidePuzzle | null;
  selectedButtonIndex: number;
  selectedPassengerIndex: number;
  plannedRoute: ButtonId[];
  continuity: number;
  intercomCharges: number;
  score: number;
  hintsUsedThisRide: number;
  lastEvaluation: RouteEvaluation | null;
  notice: string;
  storyLines: string[];
  threads: Record<StoryThreadId, ThreadState>;
  seenBeatIds: string[];
  activeOverlay: 'none' | 'directory' | 'rules' | 'log' | 'help' | 'hint-confirm';
  eventLog: LogEntry[];
  endingId: string | null;
  transitResolved: boolean;
}

export type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'startAfterHours'; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'moveButtonCursor'; delta: -1 | 1 }
  | { type: 'cyclePassenger'; delta: -1 | 1 }
  | { type: 'toggleStop' }
  | { type: 'undoStop' }
  | { type: 'toggleOverlay'; overlay: GameState['activeOverlay'] }
  | { type: 'requestHint' }
  | { type: 'confirmHint' }
  | { type: 'commitRoute' }
  | { type: 'finishTransit' }
  | { type: 'dismissAudit' }
  | { type: 'dismissInterlude' }
  | { type: 'chooseFinale'; choiceId: 'seal' | 'open' | 'operator' }
  | { type: 'restart'; seed?: number };

export interface DomainEvent {
  kind: 'notice' | 'arrival' | 'warning' | 'story' | 'ending';
  text: string;
}

export interface CommandResult {
  state: GameState;
  events: DomainEvent[];
  rejection?: string;
}

export const THREAD_LABELS: Record<StoryThreadId, string> = {
  'missing-operator': 'MISSING OPERATOR',
  'deleted-census': 'DELETED CENSUS',
  'building-voice': 'BUILDING VOICE',
};
