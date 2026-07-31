import { ANOMALIES, ROOMS, SHIFTS, UPGRADES } from './content';
import type { AnomalyState, AudioMode, DoorMode, GameMode, GameState, LampMode, PendingConfiguration, RoomId, RoomState, StationNodeId } from './types';
import type { CycleResult, Incident } from './types';

export type Command =
  | { type: 'startRun'; mode: GameMode; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'selectRoom'; roomId: RoomId }
  | { type: 'setLamp'; roomId: RoomId; lamp: LampMode }
  | { type: 'setAudio'; roomId: RoomId; audio: AudioMode }
  | { type: 'setDoor'; roomId: RoomId; door: DoorMode }
  | { type: 'moveTechnician'; to: StationNodeId }
  | { type: 'commitCycle' }
  | { type: 'useProbe'; roomId: RoomId }
  | { type: 'showHelp' }
  | { type: 'showRules' }
  | { type: 'showLog' }
  | { type: 'dismissCycleReport' }
  | { type: 'chooseUpgrade'; upgradeId: string }
  | { type: 'restartShift' }
  | { type: 'restartRun'; seed?: number };

const NEIGHBOURS: Record<StationNodeId, StationNodeId[]> = { G: ['H'], H: ['G', 'A', 'C'], A: ['H', 'B'], B: ['A', 'C'], C: ['H', 'B', 'D'], D: ['C'] };
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));
const copyRooms = (rooms: Record<RoomId, RoomState>): Record<RoomId, RoomState> => Object.fromEntries(ROOMS.map(id => [id, { ...rooms[id] }])) as Record<RoomId, RoomState>;
const pendingFromRooms = (rooms: Record<RoomId, RoomState>): PendingConfiguration => ({ rooms: Object.fromEntries(ROOMS.map(id => [id, { lamp: rooms[id].lamp, audio: rooms[id].audio, door: rooms[id].door }])) as PendingConfiguration['rooms'] });

function rng(seed: number): () => number { let x = seed >>> 0; return () => { x = (Math.imul(x ^ (x >>> 16), 2246822519) + 3266489917) >>> 0; return (x ^ (x >>> 13)) / 4294967296; }; }

function blankState(seed: number, mode: GameMode): GameState {
  const rooms = Object.fromEntries(ROOMS.map(id => [id, { id, anomalyId: null, lamp: 'dim', audio: 'silent', door: 'open', circuitState: 'powered', breached: false }])) as Record<RoomId, RoomState>;
  return { version: 1, seed: seed >>> 0, mode, phase: 'start', shiftIndex: 0, cycle: 0, cyclesRemaining: 0, integrity: 6, powerCapacity: 10, battery: 6, technicianRoom: 'H', selectedRoom: 'A', rooms, anomalies: {}, pending: pendingFromRooms(rooms), activeFaults: [], observations: [], incidents: [], lastCycle: null, upgrades: [], upgradeOffers: [], shiftStartSnapshot: null, score: 0, notice: 'SELECT A WATCH.' };
}

function setupShift(state: GameState, index: number): GameState {
  const defs = state.mode === 'nightWatch' ? SHIFTS.campaign[2]! : SHIFTS[state.mode][index]!;
  const rooms = copyRooms(state.rooms);
  for (const room of ROOMS) { rooms[room].anomalyId = null; rooms[room].breached = false; rooms[room].circuitState = 'powered'; rooms[room].door = 'open'; }
  const anomalies: Record<string, AnomalyState> = {};
  for (const id of defs.anomalies) { const def = ANOMALIES[id]!; rooms[def.room].anomalyId = id; anomalies[id] = { id, roomId: def.room, pressure: id === 'glass' ? 2 : 1, knownEvidence: [], confirmed: false }; }
  const next = { ...state, phase: 'briefing' as const, shiftIndex: index, cycle: 0, cyclesRemaining: defs.cycles, powerCapacity: defs.capacity, technicianRoom: 'H' as StationNodeId, rooms, anomalies, pending: pendingFromRooms(rooms), activeFaults: [...defs.faults], observations: [], incidents: [], lastCycle: null, notice: `${defs.title}: ${defs.brief}` };
  next.shiftStartSnapshot = JSON.parse(JSON.stringify({ ...next, shiftStartSnapshot: null }));
  return next;
}

export function createState(seed = Date.now(), mode: GameMode = 'campaign'): GameState { return blankState(seed, mode); }
export function currentShift(state: GameState) { return state.mode === 'nightWatch' ? SHIFTS.campaign[2]! : SHIFTS[state.mode][state.shiftIndex]!; }
export function distance(from: StationNodeId, to: StationNodeId): number { if (from === to) return 0; const queue: Array<[StationNodeId, number]> = [[from, 0]]; const seen = new Set<StationNodeId>([from]); while (queue.length) { const [node, d] = queue.shift()!; for (const next of NEIGHBOURS[node]) { if (next === to) return d + 1; if (!seen.has(next)) { seen.add(next); queue.push([next, d + 1]); } } } return 99; }
export function proximity(state: GameState, room: RoomId): 'inside' | 'adjacent' | 'remote' { const d = distance(state.technicianRoom, room); return d === 0 ? 'inside' : d === 1 ? 'adjacent' : 'remote'; }

function effectiveLamp(room: RoomState): LampMode { return room.circuitState === 'shed' ? 'dark' : room.lamp; }
function effectiveAudio(room: RoomState): AudioMode { return room.circuitState === 'shed' ? 'silent' : room.audio; }
function reaction(state: GameState, anomaly: AnomalyState): { delta: number; text: string; evidence: string } {
  const room = state.rooms[anomaly.roomId]; const lamp = effectiveLamp(room); const audio = effectiveAudio(room); const prox = proximity(state, anomaly.roomId);
  switch (anomaly.id) {
    case 'glass': return lamp === 'bright' ? { delta: -2, text: '☼ BRIGHT LIGHT', evidence: 'bright -2' } : lamp === 'dark' ? { delta: 2, text: '· DARKNESS', evidence: 'dark +2' } : { delta: 1, text: '◐ DIM LIGHT', evidence: 'dim +1' };
    case 'choir': return audio === 'hush' ? { delta: -1, text: '≈ HUSH', evidence: 'hush -1' } : audio === 'white' || audio === 'tone' ? { delta: 2, text: '♫ SOUND', evidence: 'white/tone +2' } : { delta: 0, text: '· SILENT', evidence: 'silent 0' };
    case 'guest': return prox === 'inside' ? { delta: 2, text: '@ TECH INSIDE', evidence: 'tech inside +2' } : prox === 'remote' ? { delta: -1, text: '↘ TECH REMOTE', evidence: 'remote -1' } : { delta: 1, text: '→ TECH ADJACENT', evidence: 'tech adjacent +1' };
    case 'moth': return lamp === 'bright' ? { delta: 2, text: '☼ BRIGHT LAMP', evidence: 'bright +2' } : lamp === 'dim' ? { delta: -1, text: '◐ DIM LAMP', evidence: 'dim -1' } : { delta: 0, text: '· DARK LAMP', evidence: 'dark 0' };
    case 'wire': return audio === 'tone' ? { delta: 2, text: '♫ TONE', evidence: 'tone +2' } : audio === 'white' ? { delta: -2, text: '≈ WHITE MASK', evidence: 'white -2' } : { delta: 0, text: '· NO CIRCUIT', evidence: 'silent 0' };
    case 'mirror': return prox === 'adjacent' ? { delta: -2, text: '→ TECH ADJACENT', evidence: 'adjacent -2' } : prox === 'inside' ? { delta: 2, text: '@ TECH INSIDE', evidence: 'inside +2' } : { delta: 1, text: '↘ TECH REMOTE', evidence: 'remote +1' };
    case 'keeper': return room.door === 'sealed' ? { delta: -2, text: '▣ SEALED DOOR', evidence: 'sealed -2' } : { delta: 2, text: '□ OPEN DOOR', evidence: 'open +2' };
    case 'static': return lamp === 'bright' && audio === 'tone' ? { delta: 2, text: '☼+♫ COUPLED', evidence: 'bright + tone +2' } : lamp === 'dim' && audio === 'white' ? { delta: -2, text: '◐+≈ COUNTERPHASE', evidence: 'dim + white -2' } : { delta: 0, text: '· NO COUPLING', evidence: 'neutral 0' };
    case 'witness': { const neighbours = ROOMS.filter(roomId => roomId !== anomaly.roomId && state.rooms[roomId].anomalyId); const source = neighbours[0] ? state.anomalies[state.rooms[neighbours[0]]!.anomalyId!] : undefined; const sourceDelta = source ? reaction({ ...state, selectedRoom: source.roomId }, source).delta : 0; return { delta: clamp(sourceDelta, -2, 2) as -2 | -1 | 0 | 1 | 2, text: `? COPIES ${source?.id ?? 'SILENCE'}`, evidence: 'copies neighbour reaction' }; }
    default: return { delta: 0, text: '· NO RESPONSE', evidence: 'neutral 0' };
  }
}

function applyPower(state: GameState): { demand: number; shed: string[] } {
  let demand = 0; const shed: string[] = []; for (const room of Object.values(state.pending.rooms)) demand += room.lamp === 'bright' ? 2 : room.lamp === 'dim' ? 1 : 0; for (const room of Object.values(state.pending.rooms)) demand += room.audio === 'tone' ? 2 : room.audio === 'white' || room.audio === 'hush' ? 1 : 0; for (const room of Object.values(state.pending.rooms)) demand += room.door === 'sealed' ? 1 : 0;
  for (const room of ROOMS) { state.rooms[room].lamp = state.pending.rooms[room].lamp; state.rooms[room].audio = state.pending.rooms[room].audio; state.rooms[room].door = state.pending.rooms[room].door; state.rooms[room].circuitState = 'powered'; }
  let remaining = demand; const shedKinds: Array<[string, (r: RoomState) => boolean]> = [['tone', r => r.audio === 'tone'], ['white', r => r.audio === 'white'], ['bright', r => r.lamp === 'bright'], ['dim', r => r.lamp === 'dim']];
  for (const [kind, test] of shedKinds) for (const room of [...ROOMS].reverse()) if (remaining > state.powerCapacity && test(state.rooms[room])) { state.rooms[room].circuitState = 'shed'; remaining -= kind === 'bright' ? 2 : 1; shed.push(`${room}:${kind}`); }
  return { demand, shed };
}

function resolveCycle(state: GameState, extra: string[] = []): GameState {
  let seals = ROOMS.filter(id => state.pending.rooms[id].door === 'sealed').length;
  for (const room of [...ROOMS].reverse()) {
    if (seals <= state.battery) break;
    if (state.pending.rooms[room].door === 'sealed') { state.pending.rooms[room].door = 'open'; seals -= 1; extra.push(`BATTERY EMPTY: ${room} DOOR OPENED`); }
  }
  const power = applyPower(state); state.battery = clamp(state.battery - ROOMS.filter(id => state.rooms[id].door === 'sealed').length, 0, 6); const notices = [...extra]; const deltas: Record<string, number> = {}; const breached: string[] = [];
  for (const anomaly of Object.values(state.anomalies)) { if (state.rooms[anomaly.roomId].breached) continue; const result = reaction(state, anomaly); deltas[anomaly.id] = result.delta; anomaly.pressure = clamp(anomaly.pressure + result.delta, 0, 6); anomaly.knownEvidence = [...new Set([...anomaly.knownEvidence, result.evidence])]; if (anomaly.knownEvidence.length >= 2) anomaly.confirmed = true; notices.push(`${anomaly.id.toUpperCase()} ${result.text} ${result.delta >= 0 ? '+' : ''}${result.delta}`); if (anomaly.pressure >= 6 && state.rooms[anomaly.roomId].door !== 'sealed') { state.rooms[anomaly.roomId].breached = true; breached.push(anomaly.id); state.integrity = clamp(state.integrity - 1, 0, 6); notices.push(`${anomaly.id.toUpperCase()} BREACH — INTEGRITY -1`); } }
  for (const item of power.shed) notices.push(`POWER SHED ${item}`); state.cycle += 1; state.cyclesRemaining -= 1; const kind: Incident['kind'] = breached.length ? 'breach' : notices.some(n => n.includes('+2')) ? 'warning' : 'info'; state.incidents = [...state.incidents, ...notices.map(text => ({ cycle: state.cycle, text, kind }))].slice(-40); const result: CycleResult = { cycle: state.cycle, notices, deltas, demand: power.demand, capacity: state.powerCapacity, shed: power.shed, breached }; state.lastCycle = result; state.score += breached.length ? -400 : 40;
  if (state.integrity <= 0) { state.phase = 'gameOver'; state.notice = 'INTEGRITY ZERO. THE ANNEX IS NO LONGER A CONTAINMENT FACILITY.'; } else if (state.cyclesRemaining <= 0) { state.phase = state.shiftIndex >= SHIFTS[state.mode].length - 1 || state.mode === 'tutorial' ? 'ending' : 'shiftReport'; state.notice = state.phase === 'ending' ? 'SHIFT COMPLETE. HANDOFF ACCEPTED.' : 'SHIFT COMPLETE. REVIEW THE INCIDENT LOG.'; } else state.phase = 'cycleReport'; return state;
}

export function applyCommand(input: GameState, command: Command): GameState {
  const state = { ...input, rooms: copyRooms(input.rooms), anomalies: Object.fromEntries(Object.entries(input.anomalies).map(([id, a]) => [id, { ...a }])) } as GameState;
  switch (command.type) {
    case 'startRun': return setupShift({ ...blankState(command.seed ?? state.seed, command.mode), upgrades: [], integrity: 6 }, 0);
    case 'dismissBriefing': if (state.phase === 'briefing') state.phase = 'working'; break;
    case 'selectRoom': state.selectedRoom = command.roomId; break;
    case 'setLamp': if (state.phase === 'working') state.pending.rooms[command.roomId].lamp = command.lamp; break;
    case 'setAudio': if (state.phase === 'working') state.pending.rooms[command.roomId].audio = command.audio; break;
    case 'setDoor': if (state.phase === 'working') state.pending.rooms[command.roomId].door = command.door; break;
    case 'moveTechnician': if (state.phase === 'working' && NEIGHBOURS[state.technicianRoom].includes(command.to)) { state.technicianRoom = command.to; return resolveCycle(state, [`TECHNICIAN MOVED TO ${command.to}`]); } break;
    case 'commitCycle': if (state.phase === 'working') return resolveCycle(state); break;
    case 'useProbe': if (state.phase === 'working' && state.battery > 0) { state.battery -= 1; return resolveCycle(state, [`DIAGNOSTIC PROBE: ${command.roomId}`]); } break;
    case 'showHelp': state.notice = 'CONFIGURE FREELY. ENTER ADVANCES ONE CYCLE. EVERY REACTION IS LOGGED.'; break;
    case 'showRules': { const anomaly = state.anomalies[state.rooms[state.selectedRoom].anomalyId ?? '']; state.notice = anomaly ? `${anomalyName(anomaly.id)}: ${ANOMALIES[anomaly.id]!.clue}` : 'NO ANOMALY IN THIS CHAMBER.'; break; }
    case 'showLog': state.notice = state.incidents.length ? state.incidents[state.incidents.length - 1]!.text : 'INCIDENT LOG EMPTY.'; break;
    case 'dismissCycleReport': if (state.phase === 'cycleReport') state.phase = 'working'; break;
    case 'chooseUpgrade': if (state.phase === 'shiftReport') { const offer = state.upgradeOffers.find(u => u.id === command.upgradeId); if (offer) { state.upgrades = [...state.upgrades, offer.id]; const next = setupShift(state, state.shiftIndex + 1); next.phase = 'briefing'; next.battery = clamp(next.battery + (offer.id === 'reserve' ? 1 : 0), 0, offer.id === 'reserve' ? 8 : 6); next.notice = `INSTALLED ${offer.name}. ${currentShift(next).brief}`; return next; } } break;
    case 'restartShift': if (state.shiftStartSnapshot) return JSON.parse(JSON.stringify(state.shiftStartSnapshot)) as GameState; break;
    case 'restartRun': return blankState(command.seed ?? state.seed, state.mode);
  }
  if (state.phase === 'ending') state.notice = 'CAMPAIGN COMPLETE. THE LOG IS YOURS.';
  if (state.phase === 'shiftReport' && state.upgradeOffers.length === 0) { const random = rng(state.seed + state.shiftIndex * 937); state.upgradeOffers = [...UPGRADES].sort(() => random() - 0.5).slice(0, 3); }
  return state;
}

export function anomalyName(id: string): string { return ANOMALIES[id]?.name ?? id.toUpperCase(); }
export function anomalyGlyph(id: string): string { return ANOMALIES[id]?.glyph ?? '?'; }
export function lampLabel(lamp: LampMode): string { return lamp === 'bright' ? 'BRIGHT' : lamp === 'dim' ? 'DIM' : 'DARK'; }
export function audioLabel(audio: AudioMode): string { return audio.toUpperCase(); }
export function roomIds(): RoomId[] { return ROOMS; }
