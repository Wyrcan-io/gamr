export type AnchorKind = 'memory' | 'object' | 'clue';
export type Phase = 'start' | 'briefing' | 'exploring' | 'capsule' | 'report' | 'ending';
export type Focus = 'map' | 'actions' | 'journal';
export type Overlay = 'none' | 'journal' | 'timeline' | 'help';
export type IncidentKind = 'info' | 'warning' | 'success' | 'memory' | 'object' | 'clue';

export interface RoomDefinition {
  id: string;
  label: string;
  x: number;
  y: number;
  neighbours: string[];
}

export interface ActorDefinition {
  id: string;
  name: string;
  home: string;
  schedule: Record<number, string>;
  glyph?: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  spawnRoom: string | null;
  portable?: boolean;
}

export interface AnchorDefinition {
  id: string;
  kind: AnchorKind;
  name: string;
  shortName: string;
  description: string;
  journal: string;
  lead: string;
  discoveryHint: string;
  sourceScene: string;
}

export interface Incident {
  tick: number;
  text: string;
  kind: IncidentKind;
}

export type Condition =
  | { op: 'all'; conditions: Condition[] }
  | { op: 'any'; conditions: Condition[] }
  | { op: 'not'; condition: Condition }
  | { op: 'room'; roomId: string }
  | { op: 'tick'; min?: number; max?: number }
  | { op: 'actorAt'; actorId: string; roomId: string }
  | { op: 'hasAnchor'; anchorId: string }
  | { op: 'hasItem'; itemId: string }
  | { op: 'flag'; key: string; equals: boolean | number | string }
  | { op: 'discoveredThisLoop'; anchorId: string };

export type Effect =
  | { op: 'setFlag'; key: string; value: boolean | number | string }
  | { op: 'moveActor'; actorId: string; roomId: string }
  | { op: 'discover'; anchorId: string }
  | { op: 'masterScene'; sceneId: string }
  | { op: 'addItem'; itemId: string }
  | { op: 'removeItem'; itemId: string }
  | { op: 'placeItem'; itemId: string; roomId: string }
  | { op: 'log'; text: string; kind: IncidentKind }
  | { op: 'notice'; text: string }
  | { op: 'finishEpisode'; endingId: string };

export interface ActionDefinition {
  id: string;
  label: string;
  roomId: string;
  cost: 0 | 1 | 2;
  description: string;
  echoText?: string;
  visibleWhen?: Condition;
  availableWhen?: Condition;
  blockedReason?: string;
  effects: Effect[];
}

export interface ScheduledEvent {
  id: string;
  tick: number;
  text: string;
  kind: IncidentKind;
  effects?: Effect[];
}

export interface EndingDefinition {
  id: string;
  title: string;
  summary: string[];
  requiredAnchors: [string, string, string];
  requiredFlags?: string[];
}

export interface LeadDefinition {
  id: string;
  title: string;
  levels: [string, string, string];
}

export interface EpisodeDefinition {
  id: string;
  title: string;
  synopsis: string[];
  loopTicks: number;
  startRoom: string;
  rooms: RoomDefinition[];
  actors: ActorDefinition[];
  items: ItemDefinition[];
  anchors: AnchorDefinition[];
  actions: ActionDefinition[];
  scheduledEvents: ScheduledEvent[];
  endings: EndingDefinition[];
  leads: LeadDefinition[];
}

export interface AnchorLoadout {
  memory: string | null;
  object: string | null;
  clue: string | null;
}

export interface CampaignProgress {
  anchors: AnchorLoadout;
  discovered: string[];
  masteredScenes: string[];
  unlockedEndings: string[];
  loopsCompleted: number;
  hintsUsed: Record<string, number>;
}

export interface LoopState {
  number: number;
  tick: number;
  playerRoom: string;
  inventory: string[];
  actorRooms: Record<string, string>;
  worldItems: Record<string, string | null>;
  flags: Record<string, boolean | number | string>;
  discoveriesThisLoop: string[];
  masteredThisLoop: string[];
  eventLog: Incident[];
  resolvedEventIds: string[];
}

export interface CapsuleDraft {
  memory: string | null;
  object: string | null;
  clue: string | null;
}

export interface ActionPreview {
  actionId: string;
  cost: number;
  beforeTick: number;
  afterTick: number;
  summary: string;
  effects: string[];
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign';
  phase: Phase;
  episodeId: string;
  progress: CampaignProgress;
  loop: LoopState;
  capsuleDraft: CapsuleDraft | null;
  pendingAction: ActionPreview | null;
  tutorialStep: number;
  focus: Focus;
  selection: number;
  overlay: Overlay;
  notice: string;
  endingId: string | null;
}

export type Command =
  | { type: 'start'; mode: 'tutorial' | 'campaign'; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'setFocus'; focus: Focus }
  | { type: 'moveSelection'; delta: -1 | 1 }
  | { type: 'travel'; roomId: string }
  | { type: 'perform'; actionId: string }
  | { type: 'previewAction'; actionId: string }
  | { type: 'confirmAction' }
  | { type: 'cancelActionPreview' }
  | { type: 'wait' }
  | { type: 'openOverlay'; overlay: Exclude<Overlay, 'none'> }
  | { type: 'closeOverlay' }
  | { type: 'endLoop' }
  | { type: 'stageAnchor'; kind: AnchorKind; anchorId: string | null }
  | { type: 'restoreAnchor'; kind: AnchorKind }
  | { type: 'commitAnchors' }
  | { type: 'requestHint'; leadId: string }
  | { type: 'restartEpisode' }
  | { type: 'nextEpisode' };

export interface EngineEvent {
  type: 'notice' | 'discover' | 'tick' | 'reset' | 'ending' | 'invalid';
  text: string;
}

export interface CommandResult {
  state: GameState;
  events: EngineEvent[];
}
