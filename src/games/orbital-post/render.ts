import { currentShift, getPlacementValidation, getQueueJobs, jobIcon, laneLabel, weatherLabel } from './engine';
import { WEATHER } from './content';
import type { GameState, Job, LaneId } from './types';

const RESET = '\x1b[0m';
const esc = '\x1b[';
const ICONS: Record<string, string> = { dock: '▣', eva: '◇', comms: '◉', clear: '☼', veil: '≈', flare: '!', storm: '#', recovery: '✦', complete: '✓', blocked: '⚠' };
const ASCII: Record<string, string> = { dock: 'D', eva: 'E', comms: 'C', clear: 'O', veil: '~', flare: '!', storm: '#', recovery: '+', complete: '+', blocked: '!' };
const strip = (value: string): string => value.replace(/\x1b\[[0-9;]*m/g, '');
const fit = (value: string, width: number): string => { const clean = strip(value); return clean.length > width ? `${clean.slice(0, Math.max(0, width - 1))}…` : clean.padEnd(width, ' '); };
const box = (title: string, width = 76): string => `┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐`;
const bar = (value: number, max: number, width: number, glyph = '▰'): string => { const filled = Math.min(width, Math.max(0, Math.round((value / Math.max(1, max)) * width))); return `${glyph.repeat(filled)}${'·'.repeat(Math.max(0, width - filled))}`; };
const icon = (name: string, ascii = false): string => (ascii ? ASCII[name] ?? '*' : ICONS[name] ?? '*');
const jobStateGlyph = (job: Job, ascii = false): string => job.state === 'complete' ? icon('complete', ascii) : job.state === 'blocked' ? icon('blocked', ascii) : job.state === 'missed' ? 'x' : '·';

function titleBlock(cols: number, theme: string): string[] {
  const title = 'O R B I T A L   P O S T';
  return [`${theme}\x1b[1m${title.padStart(Math.max(title.length, Math.floor((cols + title.length) / 2)))}${RESET}`, 'REMOTE RELAY // KESTREL STATION'];
}

function startScreen(cols: number, rows: number, theme: string): string {
  const lines = [' ', ...titleBlock(cols, theme), ' ', 'A calm schedule is about to meet the Sun.', '', 'C  CAMPAIGN     O  OPEN ORBIT (SEEDED)     Q  QUIT', '', 'Schedule cargo. Repair the relay. Keep the signal alive.', '', 'Forecasts are exact. Consequences are not hidden.', '', 'Press a mode key to begin.'];
  return `${esc}2J${esc}H${lines.slice(0, rows).join('\n')}`;
}

function briefing(state: GameState, cols: number, rows: number, theme: string): string {
  const shift = currentShift(state);
  const lines = [' ', ...titleBlock(cols, theme), '', `${shift.title}   SEED ${state.seed}`, '', box('BRIEFING'), `│ ${fit(shift.briefing, 72)} │`, '│', `│ FORECAST: ${state.weather.map((weather, i) => `W${String(i + 1).padStart(2, '0')} ${icon(weather)} ${weatherLabel(weather)}`).slice(0, 6).join('   ')}`, '│', `│ FAULTS: ${Object.values(state.faults).filter(fault => fault.active).map(fault => `${fault.glyph} ${fault.name}`).join('  ') || 'NONE'}`, '│', '│ Every job shows its lane, duration, power, weather, and deadline.', `└${'─'.repeat(74)}┘`, '', 'Read the station brief, then press ENTER to open the workbench.', '', 'H  HELP   ESC  PAUSE'];
  return `${esc}2J${esc}H${lines.slice(0, rows).join('\n')}`;
}

function forecast(state: GameState, ascii: boolean): string {
  return state.weather.slice(state.currentWindow, state.currentWindow + 4).map((weather, offset) => { const w = WEATHER[weather]; return `W${String(state.currentWindow + offset + 1).padStart(2, '0')} ${icon(weather, ascii)} ${w.label}`; }).join('   ');
}

function laneRow(state: GameState, lane: LaneId, ascii: boolean): string {
  const cells: string[] = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const window = state.currentWindow + offset;
    const job = Object.values(state.jobs).find(candidate => candidate.scheduledStart !== undefined && candidate.scheduledStart <= window && window < candidate.scheduledStart + candidate.duration && candidate.lanes.includes(lane) && !['complete', 'cancelled', 'missed'].includes(candidate.state));
    cells.push(job ? fit(`${jobStateGlyph(job, ascii)} ${job.title.slice(0, 11)}`, 15) : fit('·', 15));
  }
  return `${laneLabel(lane).padEnd(5)} ${cells.join('|')}`;
}

function selectedCard(state: GameState, ascii: boolean): string[] {
  const job = state.selectedJobId ? state.jobs[state.selectedJobId] : undefined;
  if (!job) return [box('SELECTED ORDER'), '│ No order selected.', `└${'─'.repeat(74)}┘`];
  const validation = getPlacementValidation(state);
  const weatherText = job.allowedWeather.map(weather => WEATHER[weather].label).join('/');
  return [box(`SELECTED ORDER · ${jobStateGlyph(job, ascii)} ${job.title}`), `│ ${fit(`${jobIcon(job.kind)} ${job.client} · ${job.description}`, 72)} │`, `│ ${fit(`${job.lanes.map(laneLabel).join('+')} · ${job.duration} WINDOW${job.duration > 1 ? 'S' : ''} · ${job.powerCost}P/SEG · SAFE: ${weatherText}`, 72)} │`, `│ ${fit(`DEADLINE W${String(job.deadlineWindow + 1).padStart(2, '0')} · START W${String(state.selectedStartWindow + 1).padStart(2, '0')} · ${validation.reason}`, 72)} │`, `└${'─'.repeat(74)}┘`];
}

function workingScreen(state: GameState, cols: number, rows: number, theme: string, ascii = false): string {
  void cols;
  const jobs = getQueueJobs(state); const latest = state.log[0]; const faults = Object.values(state.faults).filter(fault => fault.active); const lines: string[] = [];
  lines.push(`${theme}\x1b[1mO R B I T A L   P O S T${RESET}    ${currentShift(state).title}   SEED ${state.seed}`);
  lines.push(`WINDOW ${String(state.currentWindow + 1).padStart(2, '0')} / ${state.totalWindows}   POWER [${bar(state.battery, state.batteryMax, 8)}] ${state.battery}/${state.batteryMax}   INTEGRITY [${bar(state.integrity, state.integrityMax, 6, '◆')}] ${state.integrity}/${state.integrityMax}   STANDING ${String(state.standing).padStart(2, '0')}`);
  lines.push('');
  lines.push(`FORECAST  ${forecast(state, ascii)}`);
  lines.push('');
  lines.push(box('SCHEDULE · CURRENT HORIZON'));
  lines.push(`LANE   ${['W' + String(state.currentWindow + 1).padStart(2, '0'), 'W' + String(state.currentWindow + 2).padStart(2, '0'), 'W' + String(state.currentWindow + 3).padStart(2, '0'), 'W' + String(state.currentWindow + 4).padStart(2, '0')].map(label => fit(label, 15)).join('|')}`);
  lines.push(laneRow(state, 'dock', ascii)); lines.push(laneRow(state, 'eva', ascii)); lines.push(laneRow(state, 'comms', ascii));
  lines.push(`└${'─'.repeat(74)}┘`);
  lines.push(...selectedCard(state, ascii));
  lines.push(`FAULTS  ${faults.length ? faults.map(fault => `${fault.glyph} ${fault.name}: ${fault.description}`).join('  ') : 'NONE'}`.slice(0, 78));
  lines.push(`QUEUE   ${jobs.length ? jobs.map((job, index) => `${index + 1}.${jobStateGlyph(job, ascii)} ${job.title}`).join('  ') : 'NO OUTSTANDING ORDERS'}`.slice(0, 78));
  lines.push(`LOG     ${latest ? `W${String(latest.window + 1).padStart(2, '0')} ${latest.text}` : 'No incidents yet.'}`.slice(0, 78));
  if (state.phase === 'cancelConfirm') lines.push(`CANCEL ${state.pendingCancelJobId ? state.jobs[state.pendingCancelJobId]?.title : 'ORDER'}?  Y confirm   N abort`);
  lines.push('');
  lines.push(state.armedAdvance ? 'ADVANCE ARMED — ENTER RESOLVE   SPACE cancel arm' : 'SPACE arm advance   ENTER resolve   ↑/↓ jobs   ←/→ start window');
  lines.push('S schedule   X remove   C cancel   R forecast   L log   H help   ESC pause');
  if (state.helpOpen) { lines.push(''); lines.push(box('HELP')); lines.push('│ Schedule an order, then arm and resolve one window at a time.            │'); lines.push('│ Blocked jobs stay in place; move them after the report if their deadline │'); lines.push('│ permits. Weather restrictions are exact and shown in the forecast.       │'); lines.push(`└${'─'.repeat(74)}┘`); }
  if (state.logOpen) { lines.push(''); lines.push(box('INCIDENT LOG')); state.log.slice(0, 5).forEach(item => lines.push(`│ W${String(item.window + 1).padStart(2, '0')} ${fit(item.text, 68)} │`)); lines.push(`└${'─'.repeat(74)}┘`); }
  while (lines.length < rows) lines.push('');
  return `${esc}2J${esc}H${lines.slice(0, rows).join('\n')}`;
}

function reportScreen(state: GameState, cols: number, rows: number, theme: string): string {
  void cols;
  const report = state.reports[0]; const lines: string[] = [' ', ...titleBlock(cols, theme), '', box(`WINDOW ${String((report?.window ?? state.currentWindow) + 1).padStart(2, '0')} REPORT`), `│ WEATHER: ${report ? WEATHER[report.weather].label : 'UNKNOWN'} · POWER ${report?.batteryBefore ?? state.battery} → ${report?.batteryAfter ?? state.battery} · INTEGRITY ${report?.integrityBefore ?? state.integrity} → ${report?.integrityAfter ?? state.integrity}`.slice(0, 74) + ' │', '│', `│ ${report?.notices.slice(0, 7).join('\n│ ') ?? state.notice}`.slice(0, 74), `└${'─'.repeat(74)}┘`, '', 'Press ENTER to return to the schedule.'];
  return `${esc}2J${esc}H${lines.slice(0, rows).join('\n')}`;
}

function shiftReport(state: GameState, cols: number, rows: number, theme: string): string {
  const lines = [' ', ...titleBlock(cols, theme), '', box(currentShift(state).title), `│ INTEGRITY ${state.integrity}/${state.integrityMax} · STANDING ${state.standing} · SCORE ${state.score}`, '│', `│ ${state.notice}`, '│', `│ COMPLETE ${Object.values(state.jobs).filter(job => job.state === 'complete').length}   MISSED ${Object.values(state.jobs).filter(job => job.state === 'missed').length}   BLOCKED ${Object.values(state.jobs).filter(job => job.state === 'blocked').length}`, `└${'─'.repeat(74)}┘`, '', 'Press ENTER to file the shift report.'];
  return `${esc}2J${esc}H${lines.slice(0, rows).join('\n')}`;
}

function upgradeScreen(state: GameState, cols: number, rows: number, theme: string): string {
  const lines = [' ', ...titleBlock(cols, theme), '', box('FLIGHT-DECK UPGRADE'), `│ ${state.notice}`, `└${'─'.repeat(74)}┘`, ''];
  state.upgradeOffers.forEach((offer, index) => { lines.push(`${index + 1}. ${offer.name}`); lines.push(`   ${offer.text}`); lines.push(''); });
  lines.push('Choose 1, 2, or 3. The next shift begins after installation.');
  return `${esc}2J${esc}H${lines.slice(0, rows).join('\n')}`;
}

function terminalEnd(state: GameState, cols: number, rows: number, theme: string): string {
  const lines = [' ', ...titleBlock(cols, theme), '', box(state.phase === 'ending' ? 'RELAY REPORT · CAMPAIGN COMPLETE' : 'RELAY REPORT · SHIFT FAILED'), `│ ${state.notice}`, `│ STANDING ${state.standing} · SCORE ${state.score} · SEED ${state.seed}`, `└${'─'.repeat(74)}┘`, '', state.phase === 'ending' ? 'The fleet has the route. Kestrel remains on the line.' : 'The station can be restarted from the beginning of this shift.', '', 'R restart shift   Q quit'];
  return `${esc}2J${esc}H${lines.slice(0, rows).join('\n')}`;
}

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, ascii = false): string {
  if (cols < 80 || rows < 28) return `${esc}2J${esc}H\n\n  Terminal too small for Kestrel Station.\n\n  Need: 80x28   Have: ${cols}x${rows}\n\n  Make the pane larger, then return.`;
  if (state.phase === 'start') return startScreen(cols, rows, theme);
  if (state.phase === 'briefing') return briefing(state, cols, rows, theme);
  if (state.phase === 'working' || state.phase === 'cancelConfirm') return workingScreen(state, cols, rows, theme, ascii);
  if (state.phase === 'windowReport') return reportScreen(state, cols, rows, theme);
  if (state.phase === 'shiftReport') return shiftReport(state, cols, rows, theme);
  if (state.phase === 'upgrade') return upgradeScreen(state, cols, rows, theme);
  return terminalEnd(state, cols, rows, theme);
}
