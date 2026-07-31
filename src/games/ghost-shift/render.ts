import type { GameState } from './types';
import { candidateSummary, ROOM_NAMES } from './engine';

const esc = '\x1b[';
const pos = (row: number, col: number, text: string): string => `${esc}${row};${col}H${text}`;
const box = (width: number, title: string): string => `┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐`;
function statusLine(state: GameState): string { return `TURN ${String(state.turn).padStart(2, '0')}   BATTERY ${'◆'.repeat(Math.max(0, state.battery))}${'◇'.repeat(Math.max(0, 14 - state.battery))}   EXIT T${String(state.deadline).padStart(2, '0')}   ${candidateSummary(state)}`; }
function renderStart(cols: number, rows: number, theme: string): string {
  const x = Math.max(1, Math.floor((cols - 50) / 2));
  return `${esc}2J${esc}H${pos(3, x, `${theme}\x1b[1mG H O S T   S H I F T\x1b[0m`)}${pos(6, x + 2, 'After-hours security is a deduction, not a chase.')}${pos(9, x + 2, 'T  TUTORIAL     C  CAMPAIGN     A  AFTER-HOURS')}${pos(11, x + 2, 'Q  QUIT')}${pos(rows - 2, 2, 'Choose a mode. Evidence will remain visible.')}`;
}
export function renderFrame(state: GameState, cols: number, rows: number, theme: string, glitch = 0): string {
  if (cols < 80 || rows < 28) return `${esc}2J${esc}H${pos(Math.floor(rows / 2), 3, 'Terminal too small. Need 80x28.')}\x1b[0m`;
  if (state.phase === 'start') return renderStart(cols, rows, theme);
  const out: string[] = [`${esc}2J${esc}H`, pos(1, 3, `${theme}\x1b[1mG H O S T   S H I F T\x1b[0m`), pos(1, 63, `${state.caseTitle}  ${glitch % 2 ? '·' : ' '}`), pos(2, 3, statusLine(state)), pos(4, 3, box(42, 'OFFICE / CAMERAS')), pos(4, 50, box(42, state.panel.toUpperCase())), pos(5, 3, '│       [R]──[L]──[M]                              │'), pos(6, 3, '│        │    │    │                               │'), pos(7, 3, '│       [P]──[H]──[A]                              │'), pos(8, 3, '│             │    │                               │'), pos(9, 3, '│            [K]──[S]──[E]                          │'), pos(10, 3, '└──────────────────────────────────────────┘'), pos(4, 50, box(42, state.panel.toUpperCase()))];
  const selectedRoom = state.selected.kind === 'room' ? state.selected.id : state.intruder.position;
  out.push(pos(5, 52, `SELECTED: ${ROOM_NAMES[selectedRoom]}`));
  out.push(pos(6, 52, `NOTICE: ${state.notice.slice(0, 37)}`));
  if (state.panel === 'feed') {
    const obs = state.observations[0];
    out.push(pos(8, 52, obs ? `T${obs.turn} ${obs.cameraId} ${obs.room} OCCUPANT ${obs.occupant}` : 'No active camera observation.'));
    out.push(pos(9, 52, obs ? `SILHOUETTE: ${obs.build}` : 'Wake a camera with C.'));
    out.push(pos(11, 52, 'C WAKE  B BADGE  D DOOR  P PROBE'));
    out.push(pos(12, 52, 'Enter confirms selected operation.'));
  } else if (state.panel === 'evidence') {
    const rows = state.candidates.map(c => `${c.status === 'possible' ? '?' : c.status === 'contradicted' ? '!' : 'x'} ${c.id} ${c.supports.length ? `+${c.supports.length}` : ''}`).join('   ');
    out.push(pos(8, 52, 'EVIDENCE BOARD')); out.push(pos(9, 52, rows.slice(0, 37))); out.push(pos(11, 52, `PROOF SOURCES: ${new Set(state.evidence.filter(e => e.kind !== 'brief').map(e => e.kind)).size}/2`));
  } else if (state.panel === 'log') {
    state.doorLog.slice(0, 5).forEach((e, i) => out.push(pos(7 + i, 52, `T${e.turn} ${e.doorId} ${e.action} ${e.badge}`.slice(0, 37))));
  } else {
    state.caseBrief.slice(0, 5).forEach((line, i) => out.push(pos(7 + i, 52, line.slice(0, 37))));
  }
  out.push(pos(13, 3, box(89, 'DOOR LOG / INCIDENTS')));
  state.incidentLog.slice(0, 5).forEach((line, i) => out.push(pos(14 + i, 4, line.slice(0, 87))));
  out.push(pos(20, 3, box(89, 'EVIDENCE')));
  state.evidence.slice(0, 3).forEach((e, i) => out.push(pos(21 + i, 4, `${i + 1}. ${e.kind.toUpperCase()}  ${e.text}`.slice(0, 87))));
  out.push(pos(25, 3, 'Arrows select  C camera  B badge query  D door  P probe  E evidence  Tab panel  H help  Esc pause'));
  if (state.phase === 'briefing') { out.push(pos(27, 3, `BRIEFING: ${state.caseBrief[0] ?? ''}  [Enter] begin`)); }
  if (state.phase === 'report' || state.phase === 'gameOver') { out.push(pos(27, 3, `${state.notice}  [Enter] continue  [R] retry`)); }
  if (state.phase === 'ending') { out.push(pos(27, 3, `${state.notice}  CASES ${state.correctCases}/${state.casesCompleted}  [Enter] quit  [R] replay`)); }
  return out.join('');
}
