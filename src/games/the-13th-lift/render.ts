import type { GameState, Passenger, PanelButton } from './types';
import { clipToWidth, displayWidth, padToWidth } from '../../ui/terminal';

export interface RenderTheme {
  accent: string;
  muted: string;
  warning: string;
  good: string;
  danger: string;
  reset?: string;
}

const RESET = '\x1b[0m';

export function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, '');
}

export function visibleWidth(value: string): number {
  return displayWidth(value);
}

function color(theme: RenderTheme, code: string, value: string): string {
  return `${code}${value}${theme.reset ?? RESET}`;
}

function fit(value: string, width: number): string {
  return padToWidth(clipToWidth(value, width, ''), width);
}

function center(value: string, width: number): string {
  const left = Math.max(0, Math.floor((width - displayWidth(value)) / 2));
  return `${' '.repeat(left)}${value}`;
}

function box(title: string, body: string[], width: number, theme: RenderTheme, titleColor = theme.accent): string[] {
  const inner = Math.max(10, width - 2);
  const lines = [`┌─ ${color(theme, titleColor, title)} ${'─'.repeat(Math.max(0, inner - displayWidth(title) - 3))}┐`];
  for (const line of body) lines.push(`│${fit(line, inner)}│`);
  lines.push(`└${'─'.repeat(inner)}┘`);
  return lines;
}

function landingName(state: GameState, id: string | null): string {
  if (!id) return 'NO AUTHENTIC LANDING';
  return state.puzzle?.visibleLandings.find(landing => landing.id === id)?.department ?? id.toUpperCase();
}

function passengerLine(state: GameState, passenger: Passenger, index: number): string {
  const destination = landingName(state, passenger.destination);
  const priority = passenger.constraints.some(constraint => constraint.kind === 'by-stop') ? ' ! FIRST' : '';
  const marker = index === state.selectedPassengerIndex ? '›' : '·';
  return `${marker} ${passenger.name.padEnd(18)} ${destination.padEnd(18)}${priority}`;
}

function renderPlanning(state: GameState, width: number, theme: RenderTheme): string[] {
  const puzzle = state.puzzle;
  if (!puzzle) return ['NO MANIFEST.'];
  const lines: string[] = [];
  lines.push(...box('RIDERS / REQUESTS', puzzle.passengers.map((passenger, index) => passengerLine(state, passenger, index)), width, theme));
  const panelLines = puzzle.panel.map((button: PanelButton, index) => {
    const selected = index === state.selectedButtonIndex ? '›' : ' ';
    const suspicious = button.suspicious ? '◇' : '○';
    return `${selected} [${suspicious}] ${button.label.padEnd(3)} ${state.plannedRoute.includes(button.id) ? color(theme, theme.good, 'QUEUED') : '       '}`;
  });
  panelLines.push(`ROUTE: ${state.plannedRoute.length ? state.plannedRoute.join(' → ') : '—'}`);
  lines.push(...box('PANEL / STOPS', panelLines, width, theme));
  lines.push(...box('SERVICE MEMO', [puzzle.contract.memo], width, theme, theme.warning));
  const clues = puzzle.clues.map((clue, index) => `${index + 1}. [${clue.sourceTime === 'current' ? 'NOW' : 'PREV'} / ${clue.speakerId}] ${clue.renderedText}`);
  lines.push(...box('EVIDENCE / RIDER TESTIMONY', clues, width, theme, theme.muted));
  return lines;
}

function renderRouteReview(state: GameState, width: number, theme: RenderTheme): string[] {
  const puzzle = state.puzzle;
  if (!puzzle) return box('ROUTE REVIEW', ['No manifest.'], width, theme);
  const route = state.plannedRoute.length ? state.plannedRoute : ['—'];
  const coverage = puzzle.passengers.map(passenger => `${passenger.name}: ${passenger.destination ?? 'NO DESTINATION'} ${passenger.constraints.length ? passenger.constraints.map(item => item.kind).join(', ') : 'no extra constraint'}`);
  return [
    ...box('ROUTE TAPE / REVIEW', [`${route.map((stop, index) => `${String(index + 1).padStart(2, '0')} ${stop}`).join('  →  ')}`, '', 'This is a review, not departure.', 'ENTER  CONFIRM DEPARTURE', 'BACKSPACE / ESC  RETURN TO PANEL'], width, theme, theme.warning),
    ...box('RIDER COVERAGE', coverage, width, theme, theme.muted),
    ...box('SERVICE MEMO', [puzzle.contract.memo], width, theme, theme.warning),
  ];
}

function renderAudit(state: GameState, width: number, theme: RenderTheme): string[] {
  const evaluation = state.lastEvaluation;
  if (!evaluation) return box('AUDIT', ['No route record.'], width, theme);
  const body: string[] = [];
  for (const stop of evaluation.stops) {
    const delivered = stop.deliveredPassengerIds.length ? ` +${stop.deliveredPassengerIds.length} DELIVERED` : '';
    body.push(`${stop.button} → ${stop.landingLabel}${stop.authentic ? delivered : ' × PHANTOM'}`);
  }
  body.push('');
  body.push(evaluation.correct ? '✓ SERVICE ACCEPTED — ALL CONDITIONS MET.' : '× SERVICE REJECTED — READ THE DECISIVE EVIDENCE.');
  for (const evidence of evaluation.decisiveEvidence) body.push(`${evidence.label}: ${evidence.text}`);
  return box(evaluation.correct ? 'ARRIVAL AUDIT' : 'INCIDENT AUDIT', body, width, theme, evaluation.correct ? theme.good : theme.danger);
}

function renderOverlay(state: GameState, width: number, theme: RenderTheme): string[] {
  if (state.activeOverlay === 'none') return [];
  if (state.activeOverlay === 'hint-confirm') return box('INTERCOM', ['Spend one charge for a safe-route stop?', `[Y] confirm   [N / ESC] cancel`, `${state.intercomCharges} charge(s) remain.`], width, theme, theme.warning);
  if (state.activeOverlay === 'help') return box('CONTROLS', ['ARROWS / A,F  move panel cursor', 'SPACE        queue or remove stop', 'BACKSPACE    undo last stop', 'TAB          inspect next rider', 'D / R / L    directory / rules / log', 'I            request intercom hint', 'ENTER        review / depart / advance', 'ESC          close top layer / pause'], width, theme);
  if (state.activeOverlay === 'directory') {
    const lines = state.puzzle?.visibleLandings.map(landing => `${landing.canonicalLabel.padStart(2)}  ${landing.department}`) ?? ['The directory is blank.'];
    return box('DIRECTORY / CANONICAL LANDINGS', lines, width, theme);
  }
  if (state.activeOverlay === 'rules') return box('ACTIVE SERVICE RULE', [state.puzzle?.contract.memo ?? 'No memo loaded.', 'Statements are typed facts. Prose is only their voice.'], width, theme);
  return box('RECENT LOG', state.eventLog.map(entry => `${entry.tone === 'bad' ? '×' : entry.tone === 'good' ? '✓' : '·'} ${entry.text}`), width, theme);
}

function renderStateBody(state: GameState, width: number, theme: RenderTheme): string[] {
  if (state.phase === 'start') return box('NIGHT OPERATOR CONSOLE', ['The directory says twelve floors.', 'The button panel says thirteen.', '', '[ENTER] STORY CAMPAIGN', '[T] TUTORIAL   [A] AFTER HOURS', '[Q] QUIT'], width, theme);
  if (state.phase === 'briefing') return box(`SHIFT ${state.shiftIndex + 1} / BRIEFING`, [...state.storyLines, '', state.puzzle?.contract.memo ?? '', '', 'Press ENTER to open the doors.'], width, theme);
  if (state.phase === 'planning') return renderPlanning(state, width, theme);
  if (state.phase === 'routeReview') return renderRouteReview(state, width, theme);
  if (state.phase === 'transit') return box('IN TRANSIT', [`ROUTE: ${state.plannedRoute.join(' → ')}`, 'The shaft climbs through a floor that is not on the directory.', 'The arrival chime is listening.', '', 'Traveling…'], width, theme, theme.warning);
  if (state.phase === 'audit') return renderAudit(state, width, theme);
  if (state.phase === 'interlude') return box(`SHIFT ${state.shiftIndex + 1} INTERLUDE`, [...state.storyLines, '', 'Press ENTER to accept the next manifest.'], width, theme, theme.warning);
  if (state.phase === 'finale') return box('THE 13TH LIFT', ['Three service courses remain:', '', '[1] SEAL THE LINE — preserve the official history.', '[2] OPEN THE LANDING — recognize the erased residents.', '[3] TAKE THE OPERATOR KEY — available when both major threads are protected.'], width, theme, theme.warning);
  if (state.phase === 'gameOver') return box('CONTINUITY COLLAPSE', [...state.storyLines, '', 'The lift adds your name to the roster.', '', '[R] restart   [Q] quit'], width, theme, theme.danger);
  return box(state.endingId === 'service-report' ? 'AFTER HOURS REPORT' : 'ENDING', [...state.storyLines, '', `[R] restart   [Q] quit`], width, theme, state.endingId === 'new-operator' ? theme.danger : theme.good);
}

export function renderGame(state: GameState, cols: number, rows: number, theme: RenderTheme): string {
  let output = '\x1b[2J\x1b[H';
  if (cols < 80 || rows < 24) {
    const message = `Need 80x24. Have ${cols}x${rows}. Make the terminal wider and taller.`;
    output += `${color(theme, theme.warning, message)}\n`;
    return output;
  }
  const width = Math.min(cols - 2, 96);
  const title = state.campaignRideIndex % 5 === 4 ? 'THE 13TH LIFT // 13?' : 'THE 13TH LIFT';
  const status = state.phase === 'start'
    ? 'NIGHT OPERATOR CONSOLE'
    : `${state.mode.toUpperCase()}  SHIFT ${state.shiftIndex + 1}  RIDE ${Math.min(state.campaignRideIndex + 1, 15)}  CONTINUITY ${'◆'.repeat(state.continuity)}${'◇'.repeat(Math.max(0, 5 - state.continuity))}  SCORE ${state.score}`;
  const lines: string[] = [center(color(theme, theme.accent, title), width), center(color(theme, theme.muted, status), width), center(color(theme, theme.warning, state.notice), width), ''];
  lines.push(...renderStateBody(state, width, theme));
  const overlay = renderOverlay(state, width, theme);
  if (overlay.length) {
    lines.push('');
    lines.push(...overlay);
  }
  lines.push('');
  lines.push(center(color(theme, theme.muted, 'ARROWS / A,F move   SPACE queue   TAB rider   ENTER go   ? help   ESC pause'), width));
  const visible = lines.length <= rows ? lines : [...lines.slice(0, Math.max(1, rows - 1)), center(color(theme, theme.muted, '… MORE — RESIZE OR OPEN LOG'), width)];
  return output + visible.join('\n');
}
