export type StationId = 'west' | 'east' | 'south';
export type Modulation = 'pulse' | 'drift' | 'chirp' | 'burst';
export type Profile = 'needle' | 'mesa' | 'twin' | 'comb';
export type LockQuality = 'none' | 'rough' | 'clean' | 'crisp';
export type PacketClass = 'distress' | 'relay' | 'quarantine' | 'challenge' | 'mimic';
export type BroadcastAction = 'ack-hold' | 'ack-relay' | 'silence' | 'jam-mark';
export type Phase = 'start' | 'brief' | 'listening' | 'broadcast' | 'debrief' | 'gameOver' | 'ending';
export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type DiagnosticDimension = 'station' | 'centre' | 'bandwidth' | 'modulation' | 'gain' | 'noise';

export interface LockDiagnostic {
  dimension: DiagnosticDimension;
  status: 'blocked' | 'low' | 'high' | 'mismatch';
  evidence: string;
  nextAction: string;
}

export interface Position { x: number; y: number; }
export interface Tuner { centre: number; bandwidth: 1 | 3 | 5; modulation: Modulation; gain: 1 | 2 | 3 | 4 | 5; }

export interface Packet {
  callSign: string;
  packetClass: PacketClass;
  correctBroadcast: BroadcastAction;
  fragments: [string, string, string];
  crispToken: string;
  locationClue?: string;
}

export interface Transmitter {
  id: string;
  role: 'target' | 'interference' | 'echo';
  position: Position;
  centre: number;
  bandwidth: 1 | 3 | 5;
  modulation: Modulation;
  profile: Profile;
  powerByStation: Record<StationId, number>;
  requiredGainByStation: Record<StationId, 1 | 2 | 3 | 4 | 5>;
  overloadGainByStation: Record<StationId, 1 | 2 | 3 | 4 | 5>;
  packet?: Packet;
  discovered: boolean;
  notched: boolean;
}

export interface Lock {
  stationId: StationId;
  quality: LockQuality;
  allowedBearings: Direction[];
  ray?: Position[];
  fragments: number;
  capturedAtTick: number;
}

export interface ScheduledEvent {
  id: string;
  atTick: number;
  type: 'move' | 'disable' | 'notice';
  transmitterId?: string;
  stationId?: StationId;
  notice: string;
}

export interface CaseDefinition {
  id: string;
  title: string;
  briefing: string[];
  operationLimit: number;
  filters: number;
  phaseLocks: number;
  target: Omit<Transmitter, 'discovered' | 'notched'>;
  interference: Array<Omit<Transmitter, 'discovered' | 'notched'>>;
  events: ScheduledEvent[];
}

export interface CaseState {
  definition: CaseDefinition;
  phase: Phase;
  operationsUsed: number;
  filtersRemaining: number;
  phaseLocksRemaining: number;
  selectedStation: StationId;
  disabledStations: StationId[];
  tuner: Tuner;
  transmitters: Transmitter[];
  locks: Partial<Record<StationId, Lock>>;
  candidateZones: Position[];
  selectedBroadcast: BroadcastAction | null;
  lastResult: 'correct' | 'wrong' | 'expired' | null;
  lastDiagnostic: LockDiagnostic | null;
  tutorialStep: number | null;
  score: number;
  notice: string;
  appliedEvents: string[];
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign';
  caseIndex: number;
  casesCompleted: number;
  correctReplies: number;
  failedCases: number;
  totalScore: number;
  log: string[];
  caseState: CaseState;
}

export type Command =
  | { type: 'start'; mode: 'tutorial' | 'campaign' }
  | { type: 'continueBrief' }
  | { type: 'changeStation'; delta: 1 | -1 }
  | { type: 'changeCentre'; delta: 1 | -1 }
  | { type: 'changeBandwidth'; delta: 1 | -1 }
  | { type: 'cycleModulation' }
  | { type: 'changeGain'; delta: 1 | -1 }
  | { type: 'sweep' }
  | { type: 'capture' }
  | { type: 'notch' }
  | { type: 'phaseLock' }
  | { type: 'selectBroadcast'; action: BroadcastAction }
  | { type: 'confirmBroadcast' }
  | { type: 'continueDebrief' }
  | { type: 'restart' };

export const STATIONS: Record<StationId, Position> = {
  west: { x: 2, y: 0 }, east: { x: 7, y: 0 }, south: { x: 4, y: 6 },
};
export const STATION_ORDER: StationId[] = ['west', 'east', 'south'];
export const MODULATIONS: Modulation[] = ['pulse', 'drift', 'chirp', 'burst'];
export const BANDWIDTHS: Array<1 | 3 | 5> = [1, 3, 5];
export const BROADCAST_LABELS: Record<BroadcastAction, string> = {
  'ack-hold': 'ACK / HOLD', 'ack-relay': 'ACK / RELAY', silence: 'SILENCE', 'jam-mark': 'JAM / MARK',
};
