import { getCurrentThemePalette } from '../utils';
import { anomalyGlyph, anomalyName, currentShift, projectCycle } from './engine';
import { ROOM_NAMES, ROOMS } from './content';
import type { GameState, RoomId } from './types';

const RESET = '\x1b[0m';
const MIN_COLS = 80;
const MIN_ROWS = 28;

function clean(value: string): string { return value.replace(/\x1b\[[0-9;]*m/g, ''); }
function fit(value: string, width: number): string {
  const text = clean(value);
  return text.length > width ? `${text.slice(0, Math.max(0, width - 1))}…` : text.padEnd(width, ' ');
}
function bar(value: number, max: number, width = 8): string {
  const filled = Math.round(Math.max(0, Math.min(1, value / Math.max(1, max))) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}
function line(text: string, palette: ReturnType<typeof getCurrentThemePalette>, role: keyof ReturnType<typeof getCurrentThemePalette> = 'ink'): string {
  return `${palette[role]}${text}${RESET}`;
}
function roomRow(state: GameState, projected: GameState, roomId: RoomId, selected: boolean): string {
  const room = state.rooms[roomId];
  const next = projected.rooms[roomId];
  const anomaly = room.anomalyId ? state.anomalies[room.anomalyId] : undefined;
  const nextAnomaly = room.anomalyId ? projected.anomalies[room.anomalyId] : undefined;
  const marker = room.breached ? '[X]' : anomaly && anomaly.pressure >= 4 ? '[!]' : '[ ]';
  const focus = selected ? '>' : ' ';
  const pressure = anomaly ? `${anomaly.pressure}->${nextAnomaly?.pressure ?? anomaly.pressure}` : '--';
  const delta = anomaly && nextAnomaly ? nextAnomaly.pressure - anomaly.pressure : 0;
  return `${focus} ${roomId} ${marker} ${fit(ROOM_NAMES[roomId], 7)} ${anomaly ? fit(`${anomalyGlyph(anomaly.id)} ${anomalyName(anomaly.id)}`, 18) : fit('EMPTY', 18)} P${pressure} ${delta >= 0 ? '+' : ''}${delta}  L:${room.lamp[0].toUpperCase()}→${next.lamp[0].toUpperCase()} A:${room.audio[0].toUpperCase()}→${next.audio[0].toUpperCase()} D:${room.door === 'sealed' ? '#' : '.'}→${next.door === 'sealed' ? '#' : '.'}`;
}

export function renderFrame(state: GameState, cols: number, rows: number, _themeColor = '', _glitchFrame = 0): string {
  const palette = getCurrentThemePalette();
  if (cols < MIN_COLS || rows < MIN_ROWS) {
    return `\x1b[2J\x1b[H\n\n${line('TERMINAL TOO SMALL', palette, 'danger')}\n\nNeed ${MIN_COLS}x${MIN_ROWS}  Have ${cols}x${rows}\n`;
  }
  const out: string[] = ['\x1b[2J\x1b[H'];
  out.push(line('g/ CONTAINMENT PROTOCOL', palette, 'focus'));
  if (state.phase === 'start') {
    out.push('', line('HALCYON ANNEX // FOUR ROOMS, ONE RULE AT A TIME', palette, 'ink'), '', 'T  TUTORIAL     C  CAMPAIGN     N  NIGHT WATCH     Q  QUIT', '', line('Tune the room. Read the projection. Commit one cycle.', palette, 'muted'));
    return out.join('\n');
  }
  if (state.phase === 'briefing') {
    const shift = currentShift(state);
    out.push('', line(`SHIFT ${state.shiftIndex + 1}: ${shift.title}`, palette, 'focus'), '', fit(shift.brief, cols - 4), '', 'ACTIVE ANOMALIES');
    Object.values(state.anomalies).forEach(anomaly => out.push(`  ${anomalyGlyph(anomaly.id)} ${anomalyName(anomaly.id)}  ROOM ${anomaly.roomId}`));
    out.push('', line('ENTER  open the containment bench    R  dossier', palette, 'muted'));
    return out.join('\n');
  }
  if (state.phase === 'gameOver' || state.phase === 'ending') {
    out.push('', line(state.phase === 'ending' ? 'HANDOFF ACCEPTED' : 'CONTAINMENT FAILED', palette, state.phase === 'ending' ? 'good' : 'danger'), '', `INTEGRITY ${state.integrity}/6  SCORE ${state.score}`, '', fit(state.notice, cols - 4), '', 'R restart shift   N next game   Q quit');
    return out.join('\n');
  }
  const projection = state.phase === 'working' ? projectCycle(state) : { state, accepted: true };
  const projected = projection.state;
  out.push('', `SHIFT ${state.shiftIndex + 1}  CYCLE ${String(state.cycle).padStart(2, '0')}  LEFT ${String(state.cyclesRemaining).padStart(2, '0')}  INTEGRITY [${bar(state.integrity, 6)}] ${state.integrity}/6  BATTERY [${bar(state.battery, 6)}] ${state.battery}/6`);
  out.push(line(`NOTICE  ${fit(state.notice, cols - 11)}`, palette, 'warning'), '', line('ROOM CROSS-SECTION // CURRENT → PENDING → PROJECTED', palette, 'focus'));
  ROOMS.forEach(roomId => out.push(roomRow(state, projected, roomId, state.selectedRoom === roomId)));
  const last = state.lastCycle;
  const next = projected.lastCycle;
  out.push('', line('CONTAINMENT LEDGER', palette, 'focus'));
  out.push(`DEMAND ${next?.demand ?? '—'}/${next?.capacity ?? state.powerCapacity}   SHED ${next?.shed.length ? next.shed.join(',') : 'NONE'}   DOORS ${state.pending.rooms.A.door === 'sealed' ? 'A ' : ''}${state.pending.rooms.B.door === 'sealed' ? 'B ' : ''}${state.pending.rooms.C.door === 'sealed' ? 'C ' : ''}${state.pending.rooms.D.door === 'sealed' ? 'D' : 'NONE'}`);
  out.push(`TECHNICIAN ${state.technicianRoom}   FIELD ${state.pending.fieldAction ? state.pending.fieldAction.kind.toUpperCase() : 'NONE'}   LAST ${last?.notices[0] ? fit(last.notices[0], 45) : 'NO CYCLE YET'}`);
  const room = state.rooms[state.selectedRoom];
  const anomaly = room.anomalyId ? state.anomalies[room.anomalyId] : undefined;
  out.push('', line(`SELECTED ${state.selectedRoom} / ${ROOM_NAMES[state.selectedRoom]}  ${anomaly ? `${anomalyName(anomaly.id)}  EVIDENCE ${anomaly.knownEvidence.length}/2` : 'EMPTY'}`, palette, 'focus'));
  out.push('', line('[←→] room  [1-3] lamp  [S/H/W/T] audio  [D] door  [M] queue move  [P] queue probe', palette, 'muted'));
  out.push(line('[Enter] commit  [R] rules  [L] log  [H] help  [Esc] pause  [Q] quit', palette, 'muted'));
  if (state.phase === 'cycleReport') out.push('', line('CYCLE RESOLVED — ENTER to continue', palette, 'good'));
  if (state.phase === 'shiftReport') out.push('', line('SHIFT COMPLETE — ENTER to continue', palette, 'good'));
  return out.join('\n');
}
