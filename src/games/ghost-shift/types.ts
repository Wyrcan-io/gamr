export type RoomId = 'R' | 'L' | 'M' | 'P' | 'H' | 'A' | 'K' | 'S' | 'E';
export type DoorId = 'RL' | 'LM' | 'RP' | 'PH' | 'LH' | 'HM' | 'HA' | 'HK' | 'KS' | 'SE';
export type PersonId = 'NORA' | 'SAM' | 'PRIYA' | 'LEON' | 'MICA';
export type CameraId = 'C01' | 'C02' | 'C03' | 'C04' | 'C05';
export type Phase = 'start' | 'briefing' | 'monitoring' | 'report' | 'ending' | 'gameOver';
export type Selection = { kind: 'room'; id: RoomId } | { kind: 'door'; id: DoorId } | { kind: 'camera'; id: CameraId } | { kind: 'person'; id: PersonId };
export type PanelId = 'feed' | 'evidence' | 'log' | 'files';

export interface Person { id: PersonId; name: string; tier: 1 | 2 | 3; build: 'TALL' | 'SHORT' | 'BULKY' | 'SLIM'; schedule: Partial<Record<number, RoomId>>; }
export interface Door { id: DoorId; a: RoomId; b: RoomId; tier: 1 | 2 | 3; locked: boolean; }
export interface Camera { id: CameraId; room: RoomId; covers: RoomId[]; activeUntil: number; quality: 'clear' | 'grainy' | 'dark'; }
export interface DoorEvent { id: string; turn: number; doorId: DoorId; action: 'OPEN' | 'DENIED' | 'FORCED' | 'LOCKED'; badge: PersonId | 'UNKNOWN'; authenticated: boolean; }
export interface Observation { id: string; turn: number; cameraId: CameraId; room: RoomId; occupant: PersonId | 'UNKNOWN' | 'EMPTY'; build: Person['build'] | 'UNKNOWN'; direction?: string; }
export interface Evidence { id: string; turn: number; kind: 'camera' | 'door' | 'badge' | 'probe' | 'brief'; text: string; supports?: PersonId[]; contradicts?: PersonId[]; }
export interface Candidate { id: PersonId; status: 'possible' | 'cleared' | 'contradicted'; supports: string[]; contradictions: string[]; }
export interface Intruder { cover: PersonId; build: Person['build']; position: RoomId; route: RoomId[]; contingency: RoomId[]; step: number; target: RoomId; escaped: boolean; }
export interface CaseDefinition { id: string; title: string; briefing: string[]; battery: number; deadline: number; rooms: RoomId[]; doors: Door[]; cameras: Camera[]; people: Person[]; intruder: Omit<Intruder, 'escaped'>; openingEvidence: Evidence[]; scheduled: Array<{ turn: number; text: string; room?: RoomId; type: 'dark' | 'unlock' | 'notice' }>; }
export interface TurnResolution { operation: string; events: string[]; movedTo?: RoomId; evidenceAdded: Evidence[]; }
export interface GameState { version: 1; seed: number; mode: 'tutorial' | 'campaign' | 'afterHours'; phase: Phase; caseIndex: number; casesCompleted: number; correctCases: number; failedCases: number; totalScore: number; turn: number; battery: number; deadline: number; rooms: RoomId[]; doors: Record<DoorId, Door>; cameras: Record<CameraId, Camera>; people: Record<PersonId, Person>; intruder: Intruder; evidence: Evidence[]; candidates: Candidate[]; doorLog: DoorEvent[]; observations: Observation[]; operations: string[]; incidentLog: string[]; selected: Selection; panel: PanelId; lastResolution: TurnResolution | null; notice: string; caseTitle: string; caseBrief: string[]; }
export type CostlyCommand = { type: 'wakeCamera'; id: CameraId } | { type: 'queryBadge'; eventId: string } | { type: 'toggleDoor'; id: DoorId } | { type: 'probe'; room: RoomId } | { type: 'detain'; suspect: PersonId };
export type Command = CostlyCommand | { type: 'start'; mode: 'tutorial' | 'campaign' | 'afterHours'; seed?: number } | { type: 'dismissBriefing' } | { type: 'select'; selection: Selection } | { type: 'togglePanel'; panel: PanelId } | { type: 'restart' } | { type: 'nextCase' };
export interface CommandResult { state: GameState; events: string[]; }
export const ROOMS: RoomId[] = ['R', 'L', 'M', 'P', 'H', 'A', 'K', 'S', 'E'];
export const ROOM_NAMES: Record<RoomId, string> = { R: 'RECEPTION', L: 'LOBBY', M: 'MEETING', P: 'PRINT BAY', H: 'HALL', A: 'ARCHIVE', K: 'KITCHEN', S: 'SERVER', E: 'EXIT' };
