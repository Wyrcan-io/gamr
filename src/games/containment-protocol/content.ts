import type { AudioMode, GameMode, LampMode, RoomId, Upgrade } from './types';

export interface AnomalyDef { id: string; name: string; glyph: string; clue: string; room: RoomId; evidence: string[]; }
export interface ShiftDef { title: string; brief: string; cycles: number; capacity: number; anomalies: string[]; faults: string[]; }

export const ROOMS: RoomId[] = ['A', 'B', 'C', 'D'];
export const ROOM_NAMES: Record<RoomId, string> = { A: 'ATRIUM', B: 'BELL', C: 'COLD', D: 'DEEP' };
export const ANOMALIES: Record<string, AnomalyDef> = {
  glass: { id: 'glass', name: 'GLASS NICHE', glyph: '◇', clue: 'It is never where the light finds it.', room: 'A', evidence: ['dark +2', 'bright -2'] },
  choir: { id: 'choir', name: 'THE CHOIR', glyph: '≋', clue: 'Do not let it hear itself.', room: 'B', evidence: ['white/tone +2', 'hush -1'] },
  guest: { id: 'guest', name: 'THE GUEST', glyph: '◉', clue: 'It becomes attentive when attended.', room: 'C', evidence: ['tech inside +2', 'remote -1'] },
  moth: { id: 'moth', name: 'ASH MOTH', glyph: '✦', clue: 'The bright chamber attracts it to the door.', room: 'C', evidence: ['bright +2', 'dim -1'] },
  wire: { id: 'wire', name: 'HOLLOW WIRE', glyph: '⌁', clue: 'A tone completes its circuit.', room: 'D', evidence: ['tone +2', 'white -2'] },
  mirror: { id: 'mirror', name: 'MIRROR FOLD', glyph: '◫', clue: 'It wants someone close, but not inside.', room: 'D', evidence: ['adjacent -2', 'inside +2'] },
  keeper: { id: 'keeper', name: 'THE KEEPER', glyph: '▣', clue: 'It sleeps only behind a closed door.', room: 'B', evidence: ['open +2', 'sealed -2'] },
  static: { id: 'static', name: 'VIOLET STATIC', glyph: '≈', clue: 'The lamps hear it before the speakers do.', room: 'A', evidence: ['bright + tone +2', 'dim + white -2'] },
  witness: { id: 'witness', name: 'THE WITNESS', glyph: '?', clue: 'It reacts to the conditions used to hide another.', room: 'A', evidence: ['copies neighbour reaction'] },
};

export const SHIFTS: Record<GameMode, ShiftDef[]> = {
  tutorial: [{ title: 'ORIENTATION', brief: 'Learn the lamp. Watch the pressure track.', cycles: 4, capacity: 10, anomalies: ['glass'], faults: [] }],
  campaign: [
    { title: 'ORIENTATION', brief: 'A clear room. A single rule. Make it legible.', cycles: 4, capacity: 10, anomalies: ['glass'], faults: [] },
    { title: 'ACOUSTIC LEAK', brief: 'The speaker circuit is live. Sound is a second axis.', cycles: 6, capacity: 10, anomalies: ['glass', 'choir'], faults: [] },
    { title: 'VISITOR POLICY', brief: 'A field repair requires the technician to enter the wing.', cycles: 7, capacity: 9, anomalies: ['glass', 'choir', 'guest'], faults: ['transit'] },
    { title: 'BROWNOUT', brief: 'Two chambers want opposite conditions. Capacity is reduced.', cycles: 8, capacity: 7, anomalies: ['moth', 'wire', 'choir'], faults: ['brownout'] },
    { title: 'SEALED WING', brief: 'Doors buy time, but battery is finite.', cycles: 9, capacity: 8, anomalies: ['mirror', 'keeper', 'guest'], faults: ['blocked-c'] },
    { title: 'EXIT AUDIT', brief: 'Four rooms, two faults, one safe handoff.', cycles: 10, capacity: 7, anomalies: ['static', 'witness', 'mirror', 'keeper'], faults: ['brownout', 'transit'] },
  ],
  nightWatch: [],
};

export const UPGRADES: Upgrade[] = [
  { id: 'reserve', name: 'RESERVE CELL', text: '+2 maximum battery; start future shifts with +1.' },
  { id: 'quiet', name: 'QUIET RELAY', text: 'HUSH costs no power in one chosen chamber.' },
  { id: 'lamps', name: 'FLOOD LAMPS', text: 'One chamber treats DIM as BRIGHT for 1 power.' },
  { id: 'badge', name: 'TRANSIT BADGE', text: 'The first technician move each shift is free.' },
  { id: 'recorder', name: 'DIAGNOSTIC RECORDER', text: 'Rule confirmation needs one fewer observation.' },
  { id: 'bypass', name: 'MANUAL BYPASS', text: 'Once per shift, preserve one circuit from shedding.' },
];

export function defaultLamp(): LampMode { return 'dim'; }
export function defaultAudio(): AudioMode { return 'silent'; }
