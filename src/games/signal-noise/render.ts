import { displayWidth, padToWidth, clipToWidth } from '../../ui/terminal';
import { getThemePalette, type TerminalThemePalette } from '../utils';
import { calculateSpectrum, evaluateLock, waveform } from './spectrum';
import { directionGlyph } from './triangulation';
import { BROADCAST_LABELS, STATIONS, type BroadcastAction, type GameState, type Lock, type Position } from './types';
import { currentPacket, stationLabel } from './engine';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const MIN_COLS = 80;
const MIN_ROWS = 24;

function put(out: string[], x: number, y: number, value: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${value}`); }
function line(value: string, width: number, color = ''): string { return `${color}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`; }
function centred(out: string[], cols: number, y: number, value: string, color: string): void {
  const x = Math.max(1, Math.floor((cols - displayWidth(value)) / 2) + 1);
  put(out, x, y, `${color}${value}${RESET}`);
}
function bar(value: number, max: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round((value / Math.max(1, max)) * width)));
  return `[${'+'.repeat(filled)}${'.'.repeat(width - filled)}]`;
}
function marker(action: BroadcastAction, selected: BroadcastAction | null): string { return `${selected === action ? '>' : ' '}[${action === 'ack-hold' ? '1' : action === 'ack-relay' ? '2' : action === 'silence' ? '3' : '4'}] ${BROADCAST_LABELS[action]}`; }

export interface SignalRenderOptions { helpOpen?: boolean; paused?: boolean; }

export function renderFrame(state: GameState, cols: number, rows: number, palette = getThemePalette(), options: SignalRenderOptions = {}): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) {
    centred(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'RECEIVER NEEDS MORE ROOM', `${palette.danger}${BOLD}`);
    centred(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, palette.muted);
    return out.join('');
  }
  const title = `g/ SIGNAL//NOISE   CASE ${String(Math.min(6, state.caseIndex + 1)).padStart(2, '0')}/06`;
  put(out, 3, 1, `${palette.focus}${BOLD}${padToWidth(title, Math.min(58, cols - 6))}${RESET}`);
  put(out, Math.max(3, cols - 31), 1, line(`${state.correctReplies} CORRECT  ${state.failedCases} FAILED`, 28, palette.muted));
  if (options.helpOpen) { helpFrame(out, cols, palette); return out.join(''); }
  if (state.caseState.phase === 'start') return startFrame(out, cols, palette);
  if (state.caseState.phase === 'brief') return briefFrame(out, cols, state, palette);
  if (state.caseState.phase === 'ending') return endingFrame(out, cols, state, palette);
  if (state.caseState.phase === 'debrief') return debriefFrame(out, cols, state, palette);
  listeningFrame(out, cols, state, palette);
  if (options.paused) put(out, Math.floor(cols / 2) - 7, 12, `${palette.warning}${BOLD}PAUSED${RESET}`);
  return out.join('');
}

function startFrame(out: string[], cols: number, palette: TerminalThemePalette): string {
  centred(out, cols, 8, 'A FIELD RECEIVER FOR QUIET EMERGENCIES', `${palette.focus}${BOLD}`);
  centred(out, cols, 11, 'Find the carrier. Take two bearings. Answer only what the packet proves.', palette.ink);
  centred(out, cols, 15, '[P] NIGHT SHIFT    [T] INDUCTION    [Q] QUIT', palette.muted);
  centred(out, cols, 19, 'The instrument teaches one useful adjustment at a time.', palette.muted);
  return out.join('');
}

function briefFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string {
  const width = Math.min(70, cols - 10);
  put(out, 5, 6, `${palette.line}${'─'.repeat(width)}${RESET}`);
  centred(out, cols, 8, `CASE FILE // ${state.caseState.definition.title}`, `${palette.focus}${BOLD}`);
  state.caseState.definition.briefing.slice(0, 4).forEach((text, i) => centred(out, cols, 11 + i * 2, text, palette.ink));
  centred(out, cols, 21, state.mode === 'tutorial' ? inductionObjective(state.caseState.tutorialStep ?? 0) : 'ENTER  OPEN LISTENING POST', `${palette.good}${BOLD}`);
  return out.join('');
}

function inductionObjective(step: number): string {
  return ['INDUCTION 1/6  Capture the visible carrier at WEST.', 'INDUCTION 2/6  TAB to another station.', 'INDUCTION 3/6  Capture a second bearing.', 'INDUCTION 4/6  Read the intersection and packet.', 'INDUCTION 5/6  Select the response supported by the packet.', 'INDUCTION COMPLETE  ENTER  continue.'][Math.min(5, step)]!;
}

function listeningFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): void {
  const c = state.caseState;
  const left = 42;
  const right = Math.max(28, Math.min(34, cols - left - 8));
  const xRight = left + 5;
  const spectrum = calculateSpectrum(c, c.selectedStation);
  const evaluation = evaluateLock(c, c.selectedStation);
  const packet = currentPacket(state);
  const channels = spectrum.energy.slice(Math.max(0, Math.min(10, c.tuner.centre - 6)), Math.max(0, Math.min(10, c.tuner.centre - 6)) + 14);
  put(out, 3, 3, line(`OPS ${String(c.operationsUsed).padStart(2, '0')}/${String(c.definition.operationLimit).padStart(2, '0')}  FILTERS ${c.filtersRemaining}  PHASE-LOCK ${c.phaseLocksRemaining}  ${c.phase.toUpperCase()}`, cols - 6, palette.muted));
  put(out, 3, 5, `${palette.focus}${BOLD}RECEIVER SCALE // ${stationLabel(c.selectedStation)}${RESET}`);
  put(out, 3, 7, line(channels.map((_, i) => String(i).padStart(2, '0')).join(' '), left, palette.muted));
  put(out, 3, 8, line(channels.map(value => value === 0 ? ' .' : ` ${'._:-=+*#'[Math.min(7, value)]}`).join(''), left, palette.data[0]));
  put(out, 3, 10, line(`CENTRE ${String(c.tuner.centre).padStart(2, '0')}  BANDWIDTH ${c.tuner.bandwidth}  MOD ${c.tuner.modulation.toUpperCase()}  GAIN ${c.tuner.gain}`, left, palette.ink));
  put(out, 3, 12, line(`SIGNAL ${bar(evaluation.signal, 9, 8)}  NOISE ${bar(evaluation.noise, 12, 8)}  PURITY ${Math.round(evaluation.purity * 100)}%`, left, palette.ink));
  put(out, 3, 14, line(`LOCK ${evaluation.quality.toUpperCase()}  ${evaluation.reason}`, left, evaluation.quality === 'none' ? palette.warning : palette.good));
  put(out, 3, 16, line(`SCOPE ${waveform(c.tuner.modulation)}`, left, palette.data[1]));
  put(out, 3, 18, line(`LAST ${c.notice}`, left, palette.muted));
  put(out, 3, 20, line(c.lastDiagnostic ? `NEXT ${c.lastDiagnostic.nextAction}` : 'NEXT Capture two clean bearings to resolve the source.', left, palette.focus));
  stationStrip(out, xRight, 5, c, palette);
  bearingPlot(out, xRight, 10, c.candidateZones, Object.values(c.locks) as Lock[], palette);
  decoder(out, xRight, 20, packet, Object.values(c.locks) as Lock[], palette);
  const footer = c.phase === 'broadcast' ? '1-4 SELECT RESPONSE  ENTER CONFIRM  ? HELP  ESC PAUSE' : '←→ TUNE  ↑↓ BW  TAB STATION  S SWEEP  ENTER CAPTURE  ? HELP  ESC PAUSE';
  put(out, 3, 26, line(footer, cols - 6, palette.muted));
  if (state.mode === 'tutorial' && c.tutorialStep !== null) put(out, 3, 24, line(inductionObjective(c.tutorialStep), cols - 6, palette.focus));
  if (c.phase === 'broadcast') responseFrame(out, 3, 22, c.selectedBroadcast, palette, left + right + 5);
}

function stationStrip(out: string[], x: number, y: number, state: GameState['caseState'], palette: TerminalThemePalette): void {
  put(out, x, y, `${palette.focus}${BOLD}STATION STRIP${RESET}`);
  (['west', 'east', 'south'] as const).forEach((id, i) => {
    const selected = state.selectedStation === id;
    const locked = state.locks[id];
    const status = state.disabledStations.includes(id) ? 'OFFLINE' : locked ? `LOCK ${locked.quality.toUpperCase()}` : 'READY';
    put(out, x, y + 2 + i, line(`${selected ? '>' : ' '} ${id.toUpperCase().padEnd(5)} ${status}`, 30, selected ? palette.focus : locked ? palette.good : palette.ink));
  });
}

function bearingPlot(out: string[], x: number, y: number, candidates: Position[], locks: Lock[], palette: TerminalThemePalette): void {
  put(out, x, y, `${palette.focus}${BOLD}BEARING PLOT${RESET}`);
  for (let row = 0; row < 7; row++) {
    let value = '';
    for (let col = 0; col < 9; col++) {
      const station = Object.entries(STATIONS).find(([, p]) => p.x === col && p.y === row)?.[0];
      value += station ? ` ${station[0].toUpperCase()}` : candidates.some(p => p.x === col && p.y === row) ? ' X' : ' .';
    }
    put(out, x, y + 2 + row, line(value, 24, palette.ink));
  }
  const locksText = locks.length ? locks.map(lock => `${lock.stationId[0]!.toUpperCase()}:${lock.quality[0]!.toUpperCase()}${directionGlyph(lock.allowedBearings[0]!)}`).join(' ') : 'NONE';
  put(out, x, y + 10, line(`LOCKS ${locksText}`, 30, palette.data[0]));
  put(out, x, y + 11, line(`CANDIDATES ${candidates.length || 0}`, 30, palette.warning));
}

function decoder(out: string[], x: number, y: number, packet: ReturnType<typeof currentPacket>, locks: Lock[], palette: TerminalThemePalette): void {
  put(out, x, y, `${palette.focus}${BOLD}DECODER${RESET}`);
  if (!packet || !locks.length) { put(out, x, y + 2, line('Capture a bearing to expose packet text.', 30, palette.muted)); return; }
  put(out, x, y + 2, line(`CALL ${packet.callSign}`, 30, palette.good));
  packet.fragments.slice(0, Math.min(3, Math.max(...locks.map(lock => lock.fragments)))).forEach((fragment, i) => put(out, x, y + 3 + i, line(fragment, 30, palette.ink)));
}

function responseFrame(out: string[], x: number, y: number, selected: BroadcastAction | null, palette: TerminalThemePalette, width: number): void {
  put(out, x, y, `${palette.good}${BOLD}SOURCE RESOLVED  RESPONSE EVIDENCE${RESET}`);
  (['ack-hold', 'ack-relay', 'silence', 'jam-mark'] as BroadcastAction[]).forEach((action, i) => put(out, x, y + 1 + i, line(marker(action, selected), width, selected === action ? palette.focus : palette.ink)));
}

function debriefFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string {
  const result = state.caseState.lastResult;
  centred(out, cols, 8, result === 'correct' ? '[+] CHANNEL STABLE' : result === 'expired' ? '[!] SIGNAL LOST' : '[x] RESPONSE REJECTED', `${result === 'correct' ? palette.good : palette.danger}${BOLD}`);
  centred(out, cols, 11, state.caseState.notice, palette.ink);
  centred(out, cols, 14, `CASE SCORE ${state.caseState.score}  CORRECT ${state.correctReplies}  FAILED ${state.failedCases}`, palette.data[0]);
  centred(out, cols, 19, state.mode === 'tutorial' ? 'ENTER  COMPLETE INDUCTION' : 'ENTER  NEXT CASE', palette.muted);
  return out.join('');
}

function endingFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string {
  centred(out, cols, 8, state.mode === 'tutorial' ? '[+] INDUCTION COMPLETE' : '[+] NIGHT SHIFT COMPLETE', `${palette.good}${BOLD}`);
  centred(out, cols, 12, `CORRECT ${state.correctReplies}/06  SCORE ${state.totalScore}  SEED ${state.seed}`, palette.ink);
  centred(out, cols, 16, state.correctReplies >= 5 ? 'RANK  RELIABLE HAND' : 'RANK  FIELD OPERATOR', palette.data[0]);
  centred(out, cols, 21, 'R REPLAY   N NEXT GAME   Q QUIT', palette.muted);
  return out.join('');
}

function helpFrame(out: string[], cols: number, palette: TerminalThemePalette): void {
  const width = Math.min(68, cols - 10);
  const x = Math.floor((cols - width) / 2) + 1;
  put(out, x, 6, `${palette.focus}${BOLD}g/ SIGNAL//NOISE / INSTRUMENT CARD${RESET}`);
  ['Tune until the scale and waveform agree, then capture.', 'Two clean bearings intersect in the plot.', 'A failed lock names the dimension worth changing next.', 'S sweeps; N removes a discovered blocker; P uses phase-lock.', 'Response text is evidence. Choose before Enter confirms.', 'Escape closes this card or opens the shared pause menu.'].forEach((text, i) => put(out, x, 9 + i, line(text, width, palette.ink)));
  put(out, x, 17, line('Press ? to close.', width, palette.muted));
}
