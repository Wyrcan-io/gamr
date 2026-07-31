import { calculateSpectrum, evaluateLock, waveform } from './spectrum';
import { directionGlyph } from './triangulation';
import { STATIONS, type GameState, type Lock, type Position } from './types';
import { currentPacket, stationLabel } from './engine';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[96m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const RED = '\x1b[91m';
const MAGENTA = '\x1b[95m';

function put(out: string[], x: number, y: number, value: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${value}`); }
function center(out: string[], cols: number, y: number, text: string, color: string): void { put(out, Math.max(1, Math.floor((cols - text.length) / 2) + 1), y, color + text + RESET); }
function bar(value: number, max: number, width: number): string { const filled = Math.min(width, Math.max(0, Math.round(value / Math.max(1, max) * width))); return '█'.repeat(filled) + '░'.repeat(width - filled); }
export function renderFrame(state: GameState, cols: number, rows: number, theme: string, frame: number): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < 80 || rows < 28) { center(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'TERMINAL TOO SMALL', RED + '\x1b[1m'); center(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED 80x28  HAVE ${cols}x${rows}`, DIM + theme); return out.join(''); }
  const caseState = state.caseState;
  const title = 'SIGNAL//NOISE';
  const offset = frame % 60 >= 57 ? frame % 3 - 1 : 0;
  put(out, Math.max(1, Math.floor((cols - title.length) / 2) + 1 + offset), 1, theme + '\x1b[1m' + title + RESET);
  put(out, 3, 3, `${theme}CASE ${String(Math.min(state.caseIndex + 1, 6)).padStart(2, '0')}/06  OPS ${String(caseState.operationsUsed).padStart(2, '0')}/${String(caseState.definition.operationLimit).padStart(2, '0')}  FILTERS ${'◈'.repeat(caseState.filtersRemaining) || '—'}  SCORE ${String(state.totalScore).padStart(5, '0')}${RESET}`);
  if (caseState.phase === 'start') return renderStart(out, cols, theme);
  if (caseState.phase === 'brief') return renderBrief(out, cols, caseState.definition.title, caseState.definition.briefing, theme);
  if (caseState.phase === 'ending') return renderEnding(out, cols, state, theme);
  if (caseState.phase === 'debrief') return renderDebrief(out, cols, state, theme);
  renderAnalyzer(out, cols, state, theme);
  return out.join('');
}

function renderStart(out: string[], cols: number, theme: string): string {
  center(out, cols, 9, '◌ ISOLATE TRANSMISSIONS. FIND THE SOURCE. ◌', CYAN + '\x1b[1m');
  center(out, cols, 12, 'P: NIGHT SHIFT    T: INDUCTION    Q: QUIT', DIM + theme);
  center(out, cols, 15, 'Tune carefully. Every answer is in the instrument panel.', DIM + theme);
  return out.join('');
}

function renderBrief(out: string[], cols: number, title: string, briefing: string[], theme: string): string {
  center(out, cols, 8, `CASE FILE // ${title}`, YELLOW + '\x1b[1m');
  briefing.forEach((line, index) => center(out, cols, 11 + index * 2, line, theme));
  center(out, cols, 19, 'INSTRUMENT RULE: TWO CLEAN BEARINGS IDENTIFY A SOURCE.', CYAN);
  center(out, cols, 23, 'ENTER: OPEN LISTENING POST', DIM + theme);
  return out.join('');
}

function renderAnalyzer(out: string[], cols: number, state: GameState, theme: string): void {
  const caseState = state.caseState;
  const station = caseState.selectedStation;
  const spectrum = calculateSpectrum(caseState, station);
  const quality = evaluateLock(caseState, station);
  const packet = currentPacket(state);
  put(out, 3, 5, `${theme}\x1b[1mSPECTRUM // ${stationLabel(station)}${RESET}`);
  const start = Math.max(0, Math.min(10, caseState.tuner.centre - 6));
  const channels = spectrum.energy.slice(start, start + 14);
  put(out, 3, 7, `${DIM}${theme}${channels.map((_, index) => String(start + index).padStart(2, '0')).join(' ')}${RESET}`);
  put(out, 3, 8, channels.map(energy => energy === 0 ? ' .' : ' ' + '▁▂▃▄▅▆▇█'[Math.min(7, energy)]).join(''));
  put(out, 3, 10, `${CYAN}TUNE ${String(caseState.tuner.centre).padStart(2, '0')} / BW ${caseState.tuner.bandwidth} / ${caseState.tuner.modulation.toUpperCase()} / GAIN ${caseState.tuner.gain}${RESET}`);
  put(out, 3, 12, `${theme}SIGNAL ${bar(quality.signal, 9, 10)}  NOISE ${bar(quality.noise, 12, 10)}  PURITY ${Math.round(quality.purity * 100)}%${RESET}`);
  put(out, 3, 14, `${quality.quality === 'none' ? RED : quality.quality === 'rough' ? YELLOW : GREEN}\x1b[1mLOCK: ${quality.quality.toUpperCase()}${RESET} ${DIM}${quality.reason}${RESET}`);
  put(out, 3, 16, `${MAGENTA}SCOPE ${waveform(caseState.tuner.modulation)}${RESET}`);
  if (spectrum.markers.length) put(out, 3, 18, `${YELLOW}MARKERS: ${spectrum.markers.join('  ')}${RESET}`);
  renderMap(out, cols >= 94 ? 55 : 47, 5, caseState.candidateZones, Object.values(caseState.locks) as Lock[], theme);
  renderDecoder(out, cols >= 94 ? 55 : 47, 16, packet, Object.values(caseState.locks) as Lock[], theme);
  put(out, 3, 23, `${YELLOW}${caseState.notice.slice(0, cols - 6)}${RESET}`);
  put(out, 3, 26, `${DIM}${theme}←→ TUNE  ↑↓ BW  M MOD  G GAIN  TAB STATION  S SWEEP  ENTER CAPTURE  N NOTCH  P PHASE  1-4 REPLY  ESC PAUSE${RESET}`);
  if (caseState.phase === 'broadcast') {
    put(out, 3, 21, `${GREEN}\x1b[1mSOURCE RESOLVED. SELECT RESPONSE: [1] ACK/HOLD [2] ACK/RELAY [3] SILENCE [4] JAM/MARK${RESET}`);
  }
}

function renderMap(out: string[], x: number, y: number, candidates: Position[], locks: Lock[], theme: string): void {
  put(out, x, y, `${theme}\x1b[1mREGIONAL FIX${RESET}`);
  for (let row = 0; row < 7; row++) {
    let line = '';
    for (let col = 0; col < 9; col++) {
      const station = Object.entries(STATIONS).find(([, position]) => position.x === col && position.y === row)?.[0];
      const candidate = candidates.some(position => position.x === col && position.y === row);
      line += station ? station === 'west' ? ' W' : station === 'east' ? ' E' : ' S' : candidate ? ' X' : ' .';
    }
    put(out, x, y + 2 + row, theme + line + RESET);
  }
  const lockText = locks.length ? locks.map(lock => `${lock.stationId[0].toUpperCase()}:${lock.quality[0].toUpperCase()}${directionGlyph(lock.allowedBearings[lock.allowedBearings.length === 1 ? 0 : 1])}`).join(' ') : 'NONE';
  put(out, x, y + 10, `${CYAN}LOCKS ${lockText}${RESET}`);
  put(out, x, y + 11, `${YELLOW}CANDIDATES: ${candidates.length || '—'}${RESET}`);
}

function renderDecoder(out: string[], x: number, y: number, packet: ReturnType<typeof currentPacket>, locks: Lock[], theme: string): void {
  put(out, x, y, `${theme}\x1b[1mDECODER${RESET}`);
  if (!packet || !locks.length) { put(out, x, y + 2, DIM + 'Capture a transmission to decode.' + RESET); return; }
  const fragments = Math.max(...locks.map(lock => lock.fragments));
  put(out, x, y + 2, `${CYAN}CALL: ${packet.callSign}${RESET}`);
  put(out, x, y + 3, `${theme}${packet.fragments[0]}${RESET}`);
  if (fragments >= 2) put(out, x, y + 4, `${theme}${packet.fragments[1]}${RESET}`);
  if (fragments >= 3) put(out, x, y + 5, `${GREEN}${packet.fragments[2]}${RESET}`);
}

function renderDebrief(out: string[], cols: number, state: GameState, theme: string): string {
  const result = state.caseState.lastResult;
  const good = result === 'correct';
  center(out, cols, 8, good ? '✓ CHANNEL STABLE' : result === 'expired' ? '⚠ SIGNAL LOST' : '⚠ RESPONSE REJECTED', (good ? GREEN : RED) + '\x1b[1m');
  center(out, cols, 12, state.caseState.notice, theme);
  center(out, cols, 15, `CASE SCORE ${state.caseState.score}   CORRECT ${state.correctReplies}   FAILED ${state.failedCases}`, YELLOW);
  center(out, cols, 20, state.mode === 'tutorial' ? 'ENTER: COMPLETE INDUCTION' : 'ENTER: NEXT CASE', DIM + theme);
  return out.join('');
}

function renderEnding(out: string[], cols: number, state: GameState, theme: string): string {
  const title = state.mode === 'tutorial' ? '✓ INDUCTION COMPLETE' : '✓ NIGHT SHIFT COMPLETE';
  center(out, cols, 8, title, GREEN + '\x1b[1m');
  center(out, cols, 12, `CORRECT REPLIES ${state.correctReplies}/6    SCORE ${state.totalScore}    SEED ${state.seed}`, theme);
  center(out, cols, 15, state.correctReplies >= 5 ? 'RANK: RELIABLE HAND' : 'RANK: FIELD OPERATOR', YELLOW);
  center(out, cols, 21, 'R: REPLAY   N: NEXT GAME   Q: QUIT', DIM + theme);
  return out.join('');
}
