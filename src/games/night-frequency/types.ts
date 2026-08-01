export type Phase =
  | 'start'
  | 'brief'
  | 'caller'
  | 'response'
  | 'music'
  | 'workbench'
  | 'finaleClaim'
  | 'finaleResponse'
  | 'finaleRisk'
  | 'report'
  | 'ending';

export type FactionId = 'nightShift' | 'rooftops' | 'blockwatch' | 'deepDial';
export type ClaimSlot = 'operator' | 'method' | 'origin' | 'objective';
export type MeterId = 'signal' | 'trace' | 'credibility';
export type EvidenceStatus = 'unverified' | 'verified' | 'compromised';
export type ConfidenceLevel = 'open' | 'plausible' | 'supported' | 'proven' | 'contested';
export type WorkAction = 'patch' | 'scrub' | 'verify' | 'prepare' | 'skip';
export type FinaleClaim = 'full' | 'provenOnly' | 'uncertain';
export type FinaleResponse = 'expose' | 'jam' | 'mobilize' | 'protect';
export type FinaleRisk = 'live' | 'burst' | 'relays';

export interface MeterDelta { signal?: number; trace?: number; credibility?: number; }
export interface EffectBundle extends MeterDelta { trust?: Partial<Record<FactionId, number>>; evidence?: string[]; flags?: string[]; callback?: boolean; }

export interface ResponseChoice {
  label: string;
  line: string;
  effects: EffectBundle;
  risk?: string;
}

export interface CallerDefinition {
  id: string;
  alias: string;
  district: string;
  faction: FactionId;
  topic: string;
  urgency: 'ROUTINE' | 'TIME-SENSITIVE' | 'IN DANGER';
  source: 'FIRSTHAND' | 'HEARD SECONDHAND' | 'HAS RECORDING' | 'OFFICIAL' | 'UNKNOWN';
  intro: string;
  responses: [ResponseChoice, ResponseChoice];
}

export interface TrackDefinition {
  id: string;
  title: string;
  artist: string;
  tags: string[];
  workUnits: 1 | 2 | 3;
  masking: number;
  effects: EffectBundle;
  cooldown: number;
}

export interface EvidenceItem {
  id: string;
  title: string;
  summary: string;
  slot: ClaimSlot;
  candidateId: string;
  sourceGroup: string;
  reliability: 1 | 2 | 3;
  status: EvidenceStatus;
  acquiredRound: number;
}

export interface Candidate {
  id: string;
  slot: ClaimSlot;
  label: string;
}

export interface FactionState {
  trust: number;
  perkActive: boolean;
  complicationActive: boolean;
}

export interface CallerState {
  status: 'queued' | 'offered' | 'aired' | 'passed' | 'resolved';
  safety: 'unknown' | 'protected' | 'exposed' | 'detained';
  callback: boolean;
}

export interface DossierState {
  evidence: EvidenceItem[];
  pinned: Partial<Record<ClaimSlot, string>>;
  selectedSlot: ClaimSlot;
}

export interface RoundReport {
  round: number;
  caller: string;
  response: string;
  track: string;
  action: string;
  changes: string[];
}

export interface GameEvent {
  kind: 'choice' | 'incident' | 'proof' | 'ending' | 'notice';
  text: string;
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign';
  phase: Phase;
  round: number;
  clockLabel: string;
  signal: number;
  trace: number;
  credibility: number;
  factions: Record<FactionId, FactionState>;
  callers: Record<string, CallerState>;
  currentOffer: [string, string] | null;
  currentCaller: string | null;
  currentResponse: number;
  trackOffer: [string, string] | null;
  currentTrack: string | null;
  workUnits: number;
  playlist: string[];
  dossier: DossierState;
  flags: Record<string, boolean>;
  roundReports: RoundReport[];
  log: string[];
  eventLog: GameEvent[];
  countercastPreparation: number;
  decoyPrepared: boolean;
  finaleClaim: FinaleClaim | null;
  finaleResponse: FinaleResponse | null;
  finaleRisk: FinaleRisk | null;
  outcome: string | null;
  score: number;
  overlay: 'none' | 'help' | 'log' | 'dossier';
  selectedIndex: number;
  notice: string;
}

export type Command =
  | { type: 'start'; mode: 'tutorial' | 'campaign' }
  | { type: 'continueBrief' }
  | { type: 'chooseCaller'; index: 0 | 1 }
  | { type: 'chooseResponse'; index: 0 | 1 }
  | { type: 'chooseTrack'; index: 0 | 1 }
  | { type: 'work'; action: WorkAction }
  | { type: 'cyclePin'; slot: ClaimSlot }
  | { type: 'toggleOverlay'; overlay: 'help' | 'log' | 'dossier' | 'none' }
  | { type: 'chooseFinaleClaim'; choice: FinaleClaim }
  | { type: 'chooseFinaleResponse'; choice: FinaleResponse }
  | { type: 'chooseFinaleRisk'; choice: FinaleRisk }
  | { type: 'continue' }
  | { type: 'restart' };

export interface CommandResult { state: GameState; events: GameEvent[]; rejection?: string; }

export const FACTIONS: FactionId[] = ['nightShift', 'rooftops', 'blockwatch', 'deepDial'];
export const CLAIM_SLOTS: ClaimSlot[] = ['operator', 'method', 'origin', 'objective'];
export const CLOCKS = ['00:47', '01:03', '01:21', '01:42', '02:01', '02:19', '02:38', '02:54', '03:08'];
export const FACTION_LABELS: Record<FactionId, string> = {
  nightShift: 'NIGHT SHIFT', rooftops: 'ROOFTOPS', blockwatch: 'BLOCKWATCH', deepDial: 'DEEP DIAL',
};
export const SLOT_LABELS: Record<ClaimSlot, string> = {
  operator: 'OPERATOR', method: 'METHOD', origin: 'ORIGIN', objective: 'OBJECTIVE',
};
