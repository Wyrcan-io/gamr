export type RoomId = 'A' | 'B' | 'C' | 'D';
export type StationNodeId = RoomId | 'H' | 'G';
export type LampMode = 'dark' | 'dim' | 'bright';
export type AudioMode = 'silent' | 'hush' | 'white' | 'tone';
export type DoorMode = 'open' | 'sealed';
export type Phase = 'start' | 'modeSelect' | 'briefing' | 'working' | 'cycleReport' | 'shiftReport' | 'upgrade' | 'gameOver' | 'ending';
export type GameMode = 'tutorial' | 'campaign' | 'nightWatch';

export interface RoomState {
  id: RoomId;
  anomalyId: string | null;
  lamp: LampMode;
  audio: AudioMode;
  door: DoorMode;
  circuitState: 'powered' | 'shed';
  breached: boolean;
}

export interface AnomalyState {
  id: string;
  roomId: RoomId;
  pressure: number;
  knownEvidence: string[];
  confirmed: boolean;
}

export interface Incident { cycle: number; text: string; kind: 'info' | 'warning' | 'success' | 'breach'; }
export interface PendingConfiguration { rooms: Record<RoomId, Pick<RoomState, 'lamp' | 'audio' | 'door'>>; }
export interface CycleResult { cycle: number; notices: string[]; deltas: Record<string, number>; demand: number; capacity: number; shed: string[]; breached: string[]; }
export interface Upgrade { id: string; name: string; text: string; }
export interface GameState {
  version: 1;
  seed: number;
  mode: GameMode;
  phase: Phase;
  shiftIndex: number;
  cycle: number;
  cyclesRemaining: number;
  integrity: number;
  powerCapacity: number;
  battery: number;
  technicianRoom: StationNodeId;
  selectedRoom: RoomId;
  rooms: Record<RoomId, RoomState>;
  anomalies: Record<string, AnomalyState>;
  pending: PendingConfiguration;
  activeFaults: string[];
  observations: string[];
  incidents: Incident[];
  lastCycle: CycleResult | null;
  upgrades: string[];
  upgradeOffers: Upgrade[];
  shiftStartSnapshot: GameState | null;
  score: number;
  notice: string;
}

