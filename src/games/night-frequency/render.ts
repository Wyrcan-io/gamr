import { CANDIDATES, FACTION_COPY, TRACKS } from './content';
import { candidateStats, confidenceFor, currentCaller, currentOffer, currentTrack, currentTracks } from './engine';
import { FACTION_LABELS, FACTIONS, SLOT_LABELS, type ClaimSlot, type GameState } from './types';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[96m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const RED = '\x1b[91m';
const MAGENTA = '\x1b[95m';
const MIN_COLS = 80;
const MIN_ROWS = 28;

function put(out: string[], x: number, y: number, text: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${text}`); }
function center(out: string[], cols: number, y: number, text: string, color: string): void { put(out, Math.max(1, Math.floor((cols - text.length) / 2) + 1), y, `${color}${text}${RESET}`); }
function meter(value: number, width = 10): string { const filled = Math.round(value / 100 * width); return '#'.repeat(Math.max(0, Math.min(width, filled))) + '-'.repeat(Math.max(0, width - filled)); }
function truncate(text: string, width: number): string { return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`; }
function border(out: string[], x: number, y: number, width: number, height: number, title: string, color: string): void {
  put(out, x, y, `${color}┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 5))}┐${RESET}`);
  for (let row = 1; row < height - 1; row++) put(out, x, y + row, `${color}│${' '.repeat(Math.max(0, width - 2))}│${RESET}`);
  put(out, x, y + height - 1, `${color}└${'─'.repeat(Math.max(0, width - 2))}┘${RESET}`);
}
function writeLines(out: string[], x: number, y: number, lines: string[], color: string, max = 20): void { lines.slice(0, max).forEach((line, index) => put(out, x, y + index, `${color}${truncate(line, 36)}${RESET}`)); }

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, frame: number): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) {
    center(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'TERMINAL TOO SMALL', RED + '\x1b[1m');
    center(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, DIM + theme);
    return out.join('');
  }
  const title = frame % 60 >= 56 ? 'NIGHT FREQUENCY // 91.7' : 'NIGHT FREQUENCY 91.7';
  center(out, cols, 1, title, theme + '\x1b[1m');
  if (state.phase === 'start') return renderStart(out, cols, theme, state);
  if (state.phase === 'brief') return renderBrief(out, cols, theme, state);
  if (state.phase === 'report' || state.phase === 'ending') return renderReport(out, cols, theme, state);
  renderHeader(out, theme, state);
  renderMain(out, theme, state);
  if (state.overlay !== 'none') renderOverlay(out, cols, theme, state);
  return out.join('');
}

function renderStart(out: string[], cols: number, theme: string, state: GameState): string {
  center(out, cols, 7, '●  THE CITY IS QUIET. THE SWITCHBOARD IS NOT.', CYAN + '\x1b[1m');
  center(out, cols, 10, 'Host a pirate radio show. Choose the voices. Prove the pattern.', theme);
  center(out, cols, 13, 'A false emergency alert is scheduled for 03:17.', YELLOW);
  center(out, cols, 17, 'P  PLAY CAMPAIGN     T  TUTORIAL     Q  QUIT', DIM + theme);
  center(out, cols, 21, `SEED ${state.seed}`, DIM + theme);
  return out.join('');
}

function renderBrief(out: string[], cols: number, theme: string, state: GameState): string {
  center(out, cols, 6, state.mode === 'tutorial' ? 'INDUCTION // FIRST NIGHT' : 'SHOW BRIEF // PROJECT NIGHTGLASS', YELLOW + '\x1b[1m');
  BRIEF_LINES.forEach((line, index) => center(out, cols, 10 + index * 2, line, theme));
  center(out, cols, 19, state.mode === 'tutorial' ? 'THE FIRST THREE ROUNDS CANNOT END THE SHOW.' : 'THE CARRIER HOLDS. THE CITY DOES NOT.', CYAN);
  center(out, cols, 23, 'ENTER  OPEN SWITCHBOARD', DIM + theme);
  return out.join('');
}

const BRIEF_LINES = [
  'At 03:17, Bellwether may receive a forged chlorine alert.',
  'Take calls, protect sources, and keep the evidence independent.',
  'What you air decides who can hear the truth — and who can help.',
];

function renderHeader(out: string[], theme: string, state: GameState): void {
  const traceColor = state.trace >= 80 ? RED : state.trace >= 60 ? YELLOW : theme;
  const signalColor = state.signal < 25 ? RED : state.signal >= 70 ? CYAN : theme;
  put(out, 2, 3, `${signalColor}≈ SIGNAL [${meter(state.signal)}] ${String(state.signal).padStart(3, ' ')}${RESET}`);
  put(out, 27, 3, `${traceColor}▲ TRACE [${meter(state.trace)}] ${String(state.trace).padStart(3, ' ')}${RESET}`);
  put(out, 52, 3, `${MAGENTA}◆ CRED [${meter(state.credibility)}] ${String(state.credibility).padStart(3, ' ')}${RESET}`);
  put(out, 2, 4, `${theme}◉ LIVE  ${state.clockLabel}  ROUND ${state.round + 1}/${state.mode === 'tutorial' ? 3 : 9}  PREP ${state.countercastPreparation}/2${RESET}`);
  put(out, 50, 4, `${DIM}${theme}${state.notice.slice(0, 28)}${RESET}`);
}

function renderMain(out: string[], theme: string, state: GameState): void {
  renderFactions(out, theme, state);
  renderDossier(out, theme, state);
  if (state.phase === 'caller') renderCaller(out, theme, state);
  else if (state.phase === 'response') renderResponse(out, theme, state);
  else if (state.phase === 'music') renderMusic(out, theme, state);
  else if (state.phase === 'workbench') renderWorkbench(out, theme, state);
  else renderFinale(out, theme, state);
  put(out, 2, 26, `${DIM}${theme}[1/2] CHOOSE  [ENTER] CONFIRM  [I] DOSSIER  [L] LOG  [H] HELP  [ESC] PAUSE  [Q] QUIT${RESET}`);
}

function renderFactions(out: string[], theme: string, state: GameState): void {
  put(out, 2, 6, `${theme}AUDIENCE NETWORK${RESET}`);
  FACTIONS.forEach((faction, index) => {
    const item = state.factions[faction]; const perk = item.perkActive ? ' +PERK' : item.complicationActive ? ' !LOW' : '';
    put(out, 2, 7 + index, `${theme}${faction[0].toUpperCase()} ${FACTION_LABELS[faction].padEnd(11)} ${String(item.trust).padStart(3)} ${item.trust >= 65 ? '##' : item.trust <= 20 ? 'xx' : '--'}${perk}${RESET}`);
  });
  put(out, 2, 12, `${DIM}${theme}N routes  R relay  B safety  D proof${RESET}`);
}

function renderDossier(out: string[], theme: string, state: GameState): void {
  border(out, 2, 14, 37, 10, 'DOSSIER', CYAN);
  const slots: ClaimSlot[] = ['operator', 'method', 'origin', 'objective'];
  slots.forEach((slot, index) => {
    const pinned = state.dossier.pinned[slot]; const candidate = CANDIDATES.find(item => item.id === pinned); const confidence = confidenceFor(state, slot);
    const icon = confidence === 'proven' ? '✓' : confidence === 'supported' ? '◆' : confidence === 'contested' ? '×' : pinned ? '◇' : '○';
    put(out, 4, 16 + index * 2, `${confidence === 'proven' ? GREEN : confidence === 'contested' ? RED : theme}${icon} ${SLOT_LABELS[slot].padEnd(9)} ${(candidate?.label ?? 'UNPINNED').slice(0, 19).padEnd(19)}${RESET}`);
  });
  put(out, 4, 24, `${DIM}${theme}P cycles a claim in dossier mode${RESET}`);
}

function renderCaller(out: string[], theme: string, state: GameState): void {
  border(out, 41, 6, 37, 19, 'SWITCHBOARD // CHOOSE A CALL', MAGENTA);
  const offers = currentOffer(state);
  offers.forEach((caller, index) => {
    const y = 8 + index * 8;
    const color = index === 0 ? CYAN : YELLOW;
    put(out, 43, y, `${color}[${index === 0 ? '1/A' : '2/D'}] ${caller.alias} // ${caller.district}${RESET}`);
    put(out, 43, y + 1, `${theme}${caller.faction[0].toUpperCase()}  ${caller.urgency}  ${caller.source}${RESET}`);
    put(out, 43, y + 2, `${theme}${truncate(caller.topic, 31)}${RESET}`);
    put(out, 43, y + 3, `${DIM}${theme}${truncate(caller.intro, 31)}${RESET}`);
  });
  put(out, 43, 24, `${DIM}${theme}A caller passed may return if protected.${RESET}`);
}

function renderResponse(out: string[], theme: string, state: GameState): void {
  const caller = currentCaller(state); if (!caller) return;
  border(out, 41, 6, 37, 19, `ON AIR // ${caller.alias}`, MAGENTA);
  put(out, 43, 8, `${theme}${truncate(caller.intro, 31)}${RESET}`);
  caller.responses.forEach((choice, index) => {
    const y = 12 + index * 5; const color = index === 0 ? CYAN : YELLOW;
    put(out, 43, y, `${color}[${index === 0 ? '1/A' : '2/D'}] ${truncate(choice.label, 28)}${RESET}`);
    put(out, 43, y + 1, `${theme}${truncate(choice.line, 31)}${RESET}`);
    put(out, 43, y + 2, `${DIM}${theme}${effectSummary(choice.effects)}${choice.risk ? `  ! ${choice.risk}` : ''}${RESET}`);
  });
}

function renderMusic(out: string[], theme: string, state: GameState): void {
  border(out, 41, 6, 37, 19, 'MUSIC // PICK A RECORD', MAGENTA);
  currentTracks(state).forEach((track, index) => {
    const y = 9 + index * 7; const color = index === 0 ? CYAN : YELLOW;
    put(out, 43, y, `${color}[${index === 0 ? '1/A' : '2/D'}] ♫ ${track.title}${RESET}`);
    put(out, 43, y + 1, `${theme}${track.artist} // ${track.tags.join('/')} ${RESET}`);
    put(out, 43, y + 2, `${DIM}${theme}WORK ${track.workUnits}  MASK ${track.masking}  ${effectSummary(track.effects)}${RESET}`);
  });
}

function renderWorkbench(out: string[], theme: string, state: GameState): void {
  const track = currentTrack(state); border(out, 41, 6, 37, 19, 'WORKBENCH // DURING THE SONG', MAGENTA);
  put(out, 43, 8, `${CYAN}♫ ${track?.title ?? 'NO RECORD'}${RESET}`);
  put(out, 43, 9, `${theme}WORK UNITS: ${state.workUnits}${RESET}`);
  const actions = [
    '[1] PATCH TRANSMITTER     cost 1', '[2] SCRUB THE CARRIER       cost 2', '[3] VERIFY EVIDENCE         cost 2',
    '[4] PREPARE DECOY/CAST     cost 2', '[5] SKIP WORK               cost 0',
  ];
  actions.forEach((action, index) => put(out, 43, 12 + index * 2, `${index === 4 ? YELLOW : theme}${action}${RESET}`));
  put(out, 43, 23, `${DIM}${theme}Passive trace after this round is shown in the log.${RESET}`);
}

function renderFinale(out: string[], theme: string, state: GameState): void {
  border(out, 41, 6, 37, 19, `03:17 // ${state.phase === 'finaleClaim' ? 'CLAIM' : state.phase === 'finaleResponse' ? 'RESPONSE' : 'RISK'}`, MAGENTA);
  if (state.phase === 'finaleClaim') {
    put(out, 43, 8, `${theme}PINNED THEORY${RESET}`); put(out, 43, 9, `${DIM}${theme}Use I / dossier, then P to cycle a slot.${RESET}`);
    put(out, 43, 12, `${CYAN}[1] AIR FULL PINNED CASE${RESET}`); put(out, 43, 15, `${YELLOW}[2] AIR PROVEN CLAIMS ONLY${RESET}`); put(out, 43, 18, `${theme}[3] SAY THE EVIDENCE IS INCOMPLETE${RESET}`);
  } else if (state.phase === 'finaleResponse') {
    put(out, 43, 9, `${CYAN}[1] EXPOSE AND CORRECT${RESET}`); put(out, 43, 12, `${YELLOW}[2] JAM THE FALSE CARRIER${RESET}`); put(out, 43, 15, `${theme}[3] MOBILIZE HARBOR WARD${RESET}`); put(out, 43, 18, `${MAGENTA}[4] PROTECT SOURCES / GO DARK${RESET}`);
  } else {
    put(out, 43, 10, `${CYAN}[1] STAY LIVE IN THE VAN${RESET}`); put(out, 43, 14, `${YELLOW}[2] BURST MESSAGE, THEN MOVE${RESET}`); put(out, 43, 18, `${theme}[3] HAND OFF TO FACTION RELAYS${RESET}`);
  }
  put(out, 43, 23, `${DIM}${theme}Requirements are evaluated after this choice.${RESET}`);
}

function effectSummary(effects: { signal?: number; trace?: number; credibility?: number; trust?: Partial<Record<string, number>> }): string {
  const parts: string[] = [];
  if (effects.signal) parts.push(`SIG ${effects.signal > 0 ? '+' : ''}${effects.signal}`);
  if (effects.trace) parts.push(`TRACE ${effects.trace > 0 ? '+' : ''}${effects.trace}`);
  if (effects.credibility) parts.push(`CRED ${effects.credibility > 0 ? '+' : ''}${effects.credibility}`);
  for (const [faction, rawValue] of Object.entries(effects.trust ?? {})) { const value = rawValue ?? 0; parts.push(`${faction[0].toUpperCase()} ${value > 0 ? '+' : ''}${value}`); }
  return parts.join('  ') || 'NO METER CHANGE';
}

function renderOverlay(out: string[], cols: number, theme: string, state: GameState): void {
  const width = Math.min(72, cols - 8); const x = Math.floor((cols - width) / 2) + 1;
  border(out, x, 6, width, 18, state.overlay.toUpperCase(), CYAN);
  if (state.overlay === 'help') {
    writeLines(out, x + 3, 8, ['A/D or 1/2 selects the visible choice.', 'Caller → response → record → workbench is one round.', 'Signal is reach. Trace finds the van. Credibility makes proof travel.', 'I opens this dossier. L opens the broadcast log.', 'P cycles a pinned claim while the dossier is open.', '✓ PROVEN needs two source groups and a verified strong item.', 'Esc closes this panel or opens the shared pause menu.'], theme);
  } else if (state.overlay === 'log') {
    writeLines(out, x + 3, 8, state.log.slice(-10), theme, 12);
  } else {
    let row = 8;
    for (const slot of ['operator', 'method', 'origin', 'objective'] as ClaimSlot[]) {
      put(out, x + 3, row++, `${YELLOW}${SLOT_LABELS[slot]}  pinned: ${state.dossier.pinned[slot] ?? 'none'}  confidence: ${confidenceFor(state, slot)}${RESET}`);
      for (const candidate of CANDIDATES.filter(item => item.slot === slot)) {
        const stats = candidateStats(state, candidate);
        if (stats.support || stats.rival || state.dossier.pinned[slot] === candidate.id) put(out, x + 5, row++, `${theme}${candidate.id === state.dossier.pinned[slot] ? '●' : '○'} ${candidate.label}  ${stats.support}w/${stats.sources}s  ${stats.confidence}${RESET}`);
      }
      row++;
    }
    put(out, x + 3, 22, `${DIM}${theme}Press P to cycle the selected slot: ${state.dossier.selectedSlot}.${RESET}`);
  }
}

function renderReport(out: string[], cols: number, theme: string, state: GameState): string {
  const good = state.outcome?.startsWith('THE CITY') || state.outcome?.startsWith('HARBOR');
  center(out, cols, 6, state.phase === 'ending' ? 'NIGHT FREQUENCY // REPORT' : 'TRANSMISSION REPORT', (good ? GREEN : state.outcome?.startsWith('DEAD') ? RED : YELLOW) + '\x1b[1m');
  center(out, cols, 9, state.outcome ?? 'SHOW COMPLETE', theme);
  center(out, cols, 12, `TRUTH ITEMS ${state.dossier.evidence.length}  SIGNAL ${state.signal}  TRACE ${state.trace}  CRED ${state.credibility}`, CYAN);
  center(out, cols, 15, `PLAYLIST ${state.playlist.length} RECORDS  SCORE ${state.score}`, YELLOW);
  const lines = state.roundReports.slice(-4).map(report => `R${report.round} ${report.caller} / ${report.action || '—'} / ${report.changes.join(' ')}`);
  lines.forEach((line, index) => center(out, cols, 18 + index, truncate(line, 70), DIM + theme));
  center(out, cols, 24, state.phase === 'report' ? 'ENTER  READ FINAL REPORT' : 'R  REPLAY    N  NEXT GAME    Q  QUIT', DIM + theme);
  return out.join('');
}

export { FACTION_COPY, TRACKS };
