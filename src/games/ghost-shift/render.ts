import { candidateSummary, ROOM_NAMES } from './engine';
import type { CameraId, GameState, PersonId, RoomId } from './types';
import { clipToWidth, padToWidth } from '../../ui/terminal';
import { getCurrentThemePalette, type TerminalThemePalette } from '../utils';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const MIN_COLS = 80;
const MIN_ROWS = 24;
const PEOPLE: PersonId[] = ['NORA', 'SAM', 'PRIYA', 'LEON', 'MICA'];

export interface GhostRenderModel { frame?: number; helpOpen?: boolean; }

const mark = { camera: '[C]', active: '[+]', dark: '[!]', empty: '[ ]', possible: '[?]', contradiction: '[x]', locked: '[#]' };
const line = (text: string, width: number, style = ''): string => `${style}${padToWidth(clipToWidth(text, width, ''), width)}${RESET}`;
const title = (palette: TerminalThemePalette): string => `${palette.focus}${BOLD}g/ GHOST SHIFT${RESET}`;
const box = (label: string, width: number, palette: TerminalThemePalette): string => `${palette.line}${BOLD}-- ${label} ${'-'.repeat(Math.max(0, width - label.length - 4))}${RESET}`;

function resize(cols: number, rows: number, palette: TerminalThemePalette): string {
  return ['\x1b[2J\x1b[H', '', line('GHOST SHIFT / SECURITY DESK', cols, `${palette.focus}${BOLD}`), '', line('DESK NEEDS MORE ROOM', cols, `${palette.warning}${BOLD}`), line(`NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, cols, palette.muted), '', line('Resize the terminal, then return to the desk.', cols, palette.ink)].join('\n');
}

function start(cols: number, rows: number, palette: TerminalThemePalette): string {
  const lines = ['\x1b[2J\x1b[H', '', line('g/ GHOST SHIFT', cols, `${palette.focus}${BOLD}`), line('SECURITY DESK // THE NIGHT SHIFT', cols, palette.muted), '', line('Catch the impossible route from cameras, badges, and time.', cols, palette.ink), '', line('[T] ORIENTATION     [C] CAMPAIGN     [Q] QUIT', cols, palette.focus), '', line('Every operation spends one battery and advances the clock.', cols, palette.muted)];
  while (lines.length < rows - 1) lines.push('');
  lines.push(line('Arrows move  [ ] suspect  Enter detain  ? help', cols, palette.muted));
  return lines.join('\n');
}

function cameraRow(state: GameState, cameraId: CameraId, width: number, palette: TerminalThemePalette): string {
  const camera = state.cameras[cameraId];
  const observation = state.observations.find(item => item.cameraId === cameraId);
  const status = camera.activeUntil >= state.turn ? mark.active : mark.empty;
  const quality = camera.quality === 'dark' ? mark.dark : camera.quality === 'grainy' ? '~' : mark.camera;
  return line(`${status} ${cameraId} ${quality} ${ROOM_NAMES[camera.room]}  ${observation ? `T${String(observation.turn).padStart(2, '0')} ${observation.build}` : 'NO FRAME'}`, width, observation ? palette.ink : palette.muted);
}

function tape(state: GameState, width: number, palette: TerminalThemePalette): string[] {
  const entries = state.evidence.filter(e => e.kind !== 'brief').slice(0, 5);
  if (!entries.length) return [line('[ ] No evidence yet. Wake a camera or inspect a door event.', width, palette.muted)];
  return entries.map((e, index) => line(`${index + 1}. T${String(e.turn).padStart(2, '0')} ${e.kind.toUpperCase().padEnd(6)} ${e.text}`, width, index === 0 ? palette.ink : palette.muted));
}

function contradictionRows(state: GameState, width: number, palette: TerminalThemePalette): string[] {
  const selected = state.selected.kind === 'person' ? state.selected.id : state.candidates.find(item => item.status === 'possible')?.id ?? 'NORA';
  const candidate = state.candidates.find(item => item.id === selected);
  const person = state.people[selected];
  const rows = [line(`${mark.possible} ${selected}  TIER ${person.tier}  BUILD ${person.build}`, width, palette.focus)];
  if (candidate?.supports.length) rows.push(line(`supports: ${candidate.supports.slice(0, 2).join(', ')}`, width, palette.good));
  if (candidate?.contradictions.length) rows.push(line(`contradicts: ${candidate.contradictions.slice(0, 2).join(', ')}`, width, palette.warning));
  if (!candidate?.supports.length && !candidate?.contradictions.length) rows.push(line('No direct chain yet. Select a person with [ ] and inspect the tape.', width, palette.muted));
  return rows;
}

function help(cols: number, rows: number, palette: TerminalThemePalette): string {
  const lines = ['\x1b[2J\x1b[H', '', line('g/ GHOST SHIFT / DESK NOTES', cols, `${palette.focus}${BOLD}`), '', line('Arrows move the selected room. [ and ] choose a suspect.', cols, palette.ink), line('C wakes the camera at the selected room.', cols, palette.ink), line('B authenticates the newest door event.', cols, palette.ink), line('D locks the door at the selected room.', cols, palette.ink), line('P probes the selected room; occupancy is route evidence only.', cols, palette.ink), line('Enter detains the selected suspect after the proof gate opens.', cols, palette.ink), line('Esc opens pause. ? or H closes these notes.', cols, palette.muted), '', line(`DESK ${cols}x${rows}`, cols, palette.muted)];
  return lines.join('\n');
}

export function renderFrame(state: GameState, cols: number, rows: number, palette: TerminalThemePalette = getCurrentThemePalette(), model: GhostRenderModel = {}): string {
  if (cols < MIN_COLS || rows < MIN_ROWS) return resize(cols, rows, palette);
  if (state.phase === 'start') return start(cols, rows, palette);
  if (model.helpOpen) return help(cols, rows, palette);
  const width = Math.max(74, cols - 6);
  const out: string[] = ['\x1b[2J\x1b[H', line(`${title(palette)}   ${state.caseTitle}`, width, palette.ink), line(`TURN ${String(state.turn).padStart(2, '0')}  BATTERY ${state.battery}/${state.deadline}  ${candidateSummary(state)}  ${state.notice}`, width, palette.muted), ''];
  out.push(box('CCTV CONTACT SHEET', 38, palette), box('SELECTED DESK', 38, palette));
  for (const id of ['C01', 'C02', 'C03', 'C04'] as CameraId[]) out.push(`${cameraRow(state, id, 38, palette)}  ${line(id === 'C01' ? `ROOM ${ROOM_NAMES[state.selected.kind === 'room' ? state.selected.id as RoomId : 'H']}` : '', 38, palette.muted)}`);
  out.push('', box('CHRONOLOGICAL EVIDENCE TAPE', width, palette));
  out.push(...tape(state, width, palette));
  out.push('', box('PERSONNEL FILES / CONTRADICTION CHAIN', width, palette));
  for (const person of PEOPLE) {
    const candidate = state.candidates.find(item => item.id === person)!;
    const selected = state.selected.kind === 'person' && state.selected.id === person ? '>' : ' ';
    const stateMark = candidate.status === 'contradicted' ? mark.contradiction : candidate.status === 'cleared' ? mark.locked : mark.possible;
    out.push(line(`${selected} ${stateMark} ${person}  ${state.people[person].build.padEnd(6)}  ${candidate.supports.length} proof / ${candidate.contradictions.length} contradictions`, width, selected === '>' ? palette.focus : palette.ink));
  }
  out.push(...contradictionRows(state, width, palette));
  out.push('', line('Arrows room  [ ] suspect  C camera  B badge  D door  P probe  E evidence  Tab panel  ? help  Esc pause', width, palette.muted));
  if (state.phase === 'briefing') out.push(line(`BRIEFING: ${state.caseBrief[0] ?? ''}  [Enter] begin`, width, palette.focus));
  if (state.phase === 'report' || state.phase === 'gameOver' || state.phase === 'ending') out.push(line(`${state.notice}  [Enter] continue  [R] retry`, width, state.phase === 'report' ? palette.good : palette.warning));
  while (out.length < rows - 1) out.push('');
  return out.slice(0, rows).join('\n');
}
