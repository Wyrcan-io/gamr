export type Point = { x: number; y: number };
export type Direction = 'N' | 'E' | 'S' | 'W';
export type Phase = 'start' | 'briefing' | 'planning' | 'review' | 'report' | 'ending' | 'gameOver';
export type GuardMode = 'patrol' | 'investigate' | 'pursue';
export type ObjectiveStep = 'key' | 'case' | 'exit-east' | 'exit-service';

export interface GuardIntent { guardId: string; reason: 'PATROL' | 'NOISE' | 'LAST SEEN'; from: Point; to: Point; facing: Direction; vision: Point[]; }
export interface GuardState { id: string; pos: Point; facing: Direction; mode: GuardMode; patrol: Point[]; patrolIndex: number; lastSeen?: Point; }
export interface Noise { pos: Point; turns: number; label: string; }
export interface CameraState { id: string; pos: Point; direction: Direction; jammed: number; }
export interface PendingAction { label: string; cost: number; kind: 'move' | 'decoy' | 'interact' | 'jam'; }
export interface Incident { turn: number; text: string; kind: 'info' | 'warning' | 'success'; }
export interface Job { title: string; brief: string[]; map: string[]; start: Point; key: Point; display: Point; exits: { east: Point; service: Point }; guards: GuardState[]; camera: CameraState; decoys: number; jammers: number; }

export interface GameState {
  version: 1; seed: number; mode: 'tutorial' | 'campaign'; tutorialStep: number; phase: Phase; jobIndex: number; turn: number; ap: number; alarm: 0 | 1 | 2 | 3;
  grid: string[]; player: Point; facing: Direction; guards: GuardState[]; camera: CameraState; noise: Noise[];
  keyTaken: boolean; caseOpen: boolean; asset: boolean; objective: ObjectiveStep; decoys: number; jammers: number;
  forecast: GuardIntent[]; pending: PendingAction[]; checkpoint?: GameState; incidents: Incident[]; notice: string; score: number; helpOpen: boolean;
}

export type Command =
  | { type: 'start'; mode: 'tutorial' | 'campaign' }
  | { type: 'dismissBriefing' | 'commit' | 'undo' | 'restart' | 'openReview' | 'closeReview' | 'dismissReport' | 'toggleHelp' }
  | { type: 'move'; direction: Direction }
  | { type: 'decoy' | 'interact' | 'jam' };
