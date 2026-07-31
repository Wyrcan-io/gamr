import { briefing, jobTitle, objectiveLabel, visible } from './engine';
import type { GameState, Point } from './types';

const RESET = '\x1b[0m'; const DIM = '\x1b[2m';
const at = (lines: string[], x: number, y: number, value: string): void => { lines.push(`\x1b[${y};${Math.max(1, x)}H${value}`); };
const box = (lines: string[], x: number, y: number, width: number, height: number, title: string, color: string): void => { at(lines, x, y, `${color}┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐${RESET}`); for (let i = 1; i < height - 1; i++) at(lines, x, y + i, `${color}│${' '.repeat(Math.max(0, width - 2))}│${RESET}`); at(lines, x, y + height - 1, `${color}└${'─'.repeat(Math.max(0, width - 2))}┘${RESET}`); };
const key = (p: Point): string => `${p.x},${p.y}`;
const cellAt = (state: GameState, p: Point): string => state.grid[p.y]?.[p.x] ?? '#';
function mapFrame(state: GameState, lines: string[], color: string): void {
  const seen = visible(state); const forecast = new Set(state.forecast.flatMap(i => i.vision).map(key));
  const x0 = 3; const y0 = 6;
  for (let y = 0; y < 8; y++) {
    let row = '';
    for (let x = 0; x < 12; x++) {
      const p = { x, y }; const k = key(p); let glyph = cellAt(state, p); let style = color;
      if (glyph === '#') { glyph = '█'; style = `${color}\x1b[2m`; }
      else if (glyph === 'E' || glyph === 'S') { glyph = glyph === 'E' ? '⇱' : '⇲'; style = '\x1b[1;92m'; }
      else { glyph = seen.has(k) ? '·' : forecast.has(k) ? '░' : '·'; style = seen.has(k) ? '\x1b[1;91m' : forecast.has(k) ? '\x1b[1;93m' : color; }
      if (x === 1 && y === 5) { glyph = 'H'; style = '\x1b[1;96m'; }
      if (x === 3 && y === 5 && !state.keyTaken) { glyph = '◇'; style = '\x1b[1;93m'; }
      if (x === 9 && y === 2 && !state.asset) { glyph = '◎'; style = '\x1b[1;95m'; }
      for (const noise of state.noise) if (samePoint(noise.pos, p)) { glyph = '♪'; style = '\x1b[1;96m'; }
      if (samePoint(state.camera.pos, p)) { glyph = state.camera.jammed > 0 ? '⊘' : '◉'; style = state.camera.jammed > 0 ? '\x1b[1;90m' : '\x1b[1;95m'; }
      for (const guard of state.guards) if (samePoint(guard.pos, p)) { glyph = guard.id.slice(1); style = '\x1b[1;91m'; }
      if (samePoint(state.player, p)) { glyph = '@'; style = '\x1b[1;97m'; }
      row += `${style}${glyph}${RESET} `;
    }
    at(lines, x0, y0 + y, row);
  }
}
function samePoint(a: Point, b: Point): boolean { return a.x === b.x && a.y === b.y; }
function drawPanel(lines: string[], state: GameState, color: string): void {
  box(lines, 35, 5, 43, 10, 'SECURITY FORECAST', color);
  state.forecast.forEach((intent, i) => { const guard = state.guards.find(g => g.id === intent.guardId); const from = guard ? `(${guard.pos.x + 1},${guard.pos.y + 1})` : ''; const to = `(${intent.to.x + 1},${intent.to.y + 1})`; at(lines, 38, 7 + i * 2, `G${intent.guardId.slice(1)} ${intent.reason.padEnd(8)} ${from} → ${to}`); at(lines, 38, 8 + i * 2, `${DIM}${color}VISION: ${intent.vision.slice(0, 5).map(p => `(${p.x + 1},${p.y + 1})`).join(' ')}${RESET}`); });
  at(lines, 38, 12, `CAM ${state.camera.jammed > 0 ? '⊘ JAMMED' : '◉ ACTIVE'}  FACE ${state.camera.direction}`);
  box(lines, 35, 16, 43, 9, 'CONTRACT / INCIDENTS', color); at(lines, 38, 18, `NOW: ${objectiveLabel(state).slice(0, 36)}`); state.incidents.slice(0, 5).forEach((incident, i) => at(lines, 38, 19 + i, `${incident.kind === 'warning' ? '!' : incident.kind === 'success' ? '✓' : '·'} ${incident.text.slice(0, 38)}`));
}
export function renderFrame(state: GameState, cols: number, rows: number, color: string, glitchFrame: number): string {
  const lines: string[] = ['\x1b[2J\x1b[H']; if (cols < 80 || rows < 28) { at(lines, Math.max(1, Math.floor(cols / 2) - 10), Math.max(2, Math.floor(rows / 2)), '\x1b[1;91mTERMINAL TOO SMALL' + RESET); at(lines, Math.max(1, Math.floor(cols / 2) - 14), Math.max(3, Math.floor(rows / 2) + 2), `Need 80x28  Have ${cols}x${rows}`); return lines.join(''); }
  const title = '✦ THE QUIET HEIST ✦'; const offset = glitchFrame % 60 >= 56 ? (glitchFrame % 3) - 1 : 0; at(lines, Math.floor((cols - title.length) / 2) + offset, 1, `${color}\x1b[1m${title}${RESET}`);
  if (state.phase === 'start') { at(lines, 29, 8, `${color}\x1b[1mA SMALL MUSEUM. A BIG SILENCE.${RESET}`); at(lines, 27, 11, 'T  TUTORIAL     C  CAMPAIGN'); at(lines, 27, 13, 'Predict patrols. Make noise on purpose.'); at(lines, 27, 15, 'Every guard turn resolves on ENTER.'); at(lines, 27, 20, `${DIM}${color}Q  QUIT${RESET}`); return lines.join(''); }
  if (state.phase === 'briefing') { box(lines, 15, 7, 66, 13, jobTitle(state), color); briefing(state).forEach((line, i) => at(lines, 19, 10 + i * 2, line.slice(0, 58))); at(lines, 19, 18, `${color}ENTER  BEGIN JOB     ESC  PAUSE     Q  QUIT${RESET}`); return lines.join(''); }
  at(lines, 3, 3, `${color}TURN ${String(state.turn).padStart(2, '0')}   AP ${'●'.repeat(state.ap)}${'○'.repeat(2 - state.ap)}   ALARM ${'◆'.repeat(state.alarm)}${'◇'.repeat(3 - state.alarm)} ${state.alarm === 0 ? 'QUIET' : state.alarm === 1 ? 'ALERT' : state.alarm === 2 ? 'LOCKDOWN' : 'CAUGHT'}   DECOYS ${state.decoys}   JAMMER ${state.jammers}${RESET}`);
  at(lines, 3, 4, `${color}${jobTitle(state)}   OBJ: ${objectiveLabel(state)}${RESET}`); box(lines, 2, 5, 29, 11, 'MUSEUM FLOOR', color); mapFrame(state, lines, color); drawPanel(lines, state, color);
  box(lines, 2, 17, 29, 8, 'ACTION PREVIEW', color); const pending = state.pending.length ? state.pending.map(a => a.label).join(' | ') : 'No actions queued.'; at(lines, 4, 19, `AP ${state.ap}/2   ${pending.slice(0, 23)}`); at(lines, 4, 21, state.notice.slice(0, 25)); at(lines, 4, 23, 'ARROWS MOVE  I INTERACT');
  at(lines, 35, 26, `${DIM}${color}X decoy  J jam camera  U undo  ENTER commit  ? help  ESC pause${RESET}`); if (state.phase === 'report') { at(lines, 33, 13, '\x1b[1;93mTURN RESOLVED — ENTER TO PLAN\x1b[0m'); } if (state.phase === 'ending' || state.phase === 'gameOver') { const won = state.phase === 'ending'; box(lines, 20, 9, 42, 10, won ? 'HEIST COMPLETE' : 'SECURITY REPORT', won ? '\x1b[1;92m' : '\x1b[1;91m'); at(lines, 24, 12, won ? '✓ ASSET SECURED. EXIT CLEAN.' : '✕ YOU WERE IDENTIFIED.'); at(lines, 24, 14, `SCORE ${state.score}  TURN ${state.turn}`); at(lines, 24, 16, 'R RESTART   N NEXT JOB   Q QUIT'); }
  return lines.join('');
}
