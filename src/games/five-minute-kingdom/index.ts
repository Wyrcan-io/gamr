import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, navigateMenu, renderSimpleMenu } from '../shared/menu';
import { applyCommand, cellName, createState, displayName, iconFor, labelFor, legalTarget, type GameState } from './engine';

export interface FiveMinuteKingdomController { stop: () => void; isRunning: boolean }
const MIN_COLS = 80; const MIN_ROWS = 28; const RESET = '\x1b[0m'; const DIM = '\x1b[2m';
function at(lines: string[], x: number, y: number, text: string): void { lines.push(`\x1b[${y};${Math.max(1, x)}H${text}`); }
function center(cols: number, text: string): number { return Math.max(1, Math.floor((cols - text.length) / 2) + 1); }
function box(lines: string[], x: number, y: number, width: number, height: number, title: string, theme: string): void { at(lines, x, y, `${theme}+-- ${title} ${'-'.repeat(Math.max(0, width - title.length - 5))}+${RESET}`); for (let i = 1; i < height - 1; i++) at(lines, x, y + i, `${theme}|${' '.repeat(Math.max(0, width - 2))}|${RESET}`); at(lines, x, y + height - 1, `${theme}+${'-'.repeat(Math.max(0, width - 2))}+${RESET}`); }

export function runFiveMinuteKingdomGame(terminal: Terminal): FiveMinuteKingdomController {
  let running = true; let paused = false; let showLedger = false; let pauseSelection = 0; let state: GameState = createState(Date.now()); let renderInterval: ReturnType<typeof setInterval> | undefined; let keyListener: { dispose: () => void } | undefined;
  const controller: FiveMinuteKingdomController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = (): void => { state = createState(state.seed); paused = false; pauseSelection = 0; };
  function handlePause(key: string, event: KeyboardEvent): boolean { if (!paused) return false; const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection; if (!result.confirmed) return true; if (pauseSelection === 0) paused = false; else if (pauseSelection === 1) restart(); else if (pauseSelection === 2) quit(); else if (pauseSelection === 3) { running = false; dispatchGamesMenu(terminal); } else if (pauseSelection === 4) { running = false; dispatchGameSwitch(terminal); } return true; }
  function run(command: Parameters<typeof applyCommand>[1]): void { state = applyCommand(state, command); }
  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (key === 'escape' && state.phase !== 'ending') { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, event)) return;
    if (key === 'q') { quit(); return; }
    if (key === 'l') { showLedger = !showLedger; return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'chooseOffer') { if (['1', '2', '3'].includes(key)) run({ type: 'selectOffer', index: Number(key) - 1 }); return; }
    if (state.phase === 'chooseTarget' || state.phase === 'preview') { if (event.key === 'ArrowLeft' || key === 'a') run({ type: 'moveTarget', dx: -1, dy: 0 }); else if (event.key === 'ArrowRight' || key === 'd') run({ type: 'moveTarget', dx: 1, dy: 0 }); else if (event.key === 'ArrowUp' || key === 'w') run({ type: 'moveTarget', dx: 0, dy: -1 }); else if (event.key === 'ArrowDown' || key === 's') run({ type: 'moveTarget', dx: 0, dy: 1 }); else if (key === 'enter' && state.phase === 'chooseTarget') run({ type: 'preview' }); else if (key === 'enter' && state.phase === 'preview') run({ type: 'confirm' }); return; }
    if (state.phase === 'result') { if (key === 'enter' || key === ' ') run({ type: 'dismissResult' }); return; }
    if (state.phase === 'season') { if (key === 'enter' || key === ' ') run({ type: 'dismissSeason' }); return; }
    if (state.phase === 'finalChronicle') { if (key === 'enter' || key === ' ') state = { ...state, phase: 'ending' }; return; }
    if (state.phase === 'ending' && key === 'r') restart();
  }
  function render(): void {
    const cols = terminal.cols; const rows = terminal.rows; const lines: string[] = ['\x1b[2J\x1b[H']; const theme = getCurrentThemeColor();
    if (cols < MIN_COLS || rows < MIN_ROWS) { at(lines, center(cols, 'TERMINAL TOO SMALL'), Math.max(2, Math.floor(rows / 2)), '\x1b[1;91mTERMINAL TOO SMALL' + RESET); at(lines, center(cols, 'Need 80x28'), Math.max(3, Math.floor(rows / 2) + 2), `Need 80x28  Have ${cols}x${rows}`); terminal.write(lines.join('')); return; }
    at(lines, center(cols, 'FIVE-MINUTE KINGDOM  *  MAKE EVERY SQUARE COUNT'), 1, `${theme}\x1b[1mFIVE-MINUTE KINGDOM  *  MAKE EVERY SQUARE COUNT${RESET}`);
    at(lines, 3, 3, `${theme}TURN ${Math.min(state.turn, 9)}/9   GLORY * ${state.glory}   FAVOUR + ${state.favour}   LAWS ${state.laws.length}/3   SEED ${state.seed}${RESET}`);
    if (state.phase === 'briefing') renderBriefing(lines, cols, theme); else if (state.phase === 'chooseOffer') renderMarket(lines, theme); else if (state.phase === 'finalChronicle' || state.phase === 'ending') renderEnding(lines, cols, theme); else { renderBoard(lines, theme); renderSide(lines, theme); }
    if (showLedger && state.phase !== 'briefing') renderLedger(lines, theme);
    if (paused) { at(lines, center(cols, 'PAUSED'), 13, '\x1b[1;93mPAUSED' + RESET); lines.push(renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(cols / 2), startY: 15, showShortcuts: false })); }
    terminal.write(lines.join(''));
  }
  function renderBriefing(lines: string[], cols: number, theme: string): void { box(lines, 10, 7, cols - 18, 14, 'FOUNDING CHARTER', theme); at(lines, 15, 10, 'You have five minutes to make a kingdom people remember.'); at(lines, 15, 12, 'Draft terrain, citizens, and laws. Every placement changes future scoring.'); at(lines, 15, 14, 'The centre Castle is your anchor. Adjacency is orthogonal.'); at(lines, center(cols, 'ENTER: BEGIN   ESC: PAUSE   Q: QUIT'), 23, `${DIM}${theme}ENTER: BEGIN   ESC: PAUSE   Q: QUIT${RESET}`); }
  function renderMarket(lines: string[], theme: string): void { box(lines, 5, 6, 76, 16, 'DRAFT MARKET', theme); at(lines, 9, 8, 'Choose one offer. You will then place it on the kingdom.'); state.market.forEach((offer, i) => { at(lines, 11, 11 + i * 3, `${i + 1}. ${labelFor(offer)}`); at(lines, 17, 12 + i * 3, `${DIM}${theme}${offer.kind === 'terrain' ? 'Builds a district and scores from matching neighbours.' : offer.kind === 'citizen' ? 'Homes need compatible terrain and score from their surroundings.' : 'A persistent law scores now and during season checks.'}${RESET}`); }); at(lines, 9, 22, `${DIM}${theme}1-3: DRAFT   ESC: PAUSE   Q: QUIT${RESET}`); }
  function renderBoard(lines: string[], theme: string): void { box(lines, 3, 5, 40, 18, 'KINGDOM MAP', theme); for (let y = 0; y < 5; y++) { let row = ''; for (let x = 0; x < 5; x++) { const cursor = (state.phase === 'chooseTarget' || state.phase === 'preview') && state.target.x === x && state.target.y === y; const cell = state.board[y]![x]!; row += cursor ? `[${iconFor(cell)}]` : ` ${iconFor(cell)} `; } at(lines, 8, 8 + y * 2, row); } at(lines, 7, 19, 'K castle  . field  F forest  ^ hill  ~ water  = road'); at(lines, 7, 20, 'V village  R ruin  G garden  o citizen'); }
  function renderSide(lines: string[], theme: string): void { const trim = (text: string) => text.slice(0, 28); box(lines, 46, 5, 34, 18, state.phase === 'season' ? 'SEASON REPORT' : state.phase === 'result' ? 'PLACEMENT RESULT' : 'DECISION', theme); if (state.phase === 'chooseTarget' || state.phase === 'preview') { const offer = state.selectedOffer; at(lines, 48, 8, trim(offer ? labelFor(offer) : 'No offer')); at(lines, 48, 10, trim(`TARGET ${String.fromCharCode(65 + state.target.x)}${state.target.y + 1}: ${cellName(state.board[state.target.y]![state.target.x]!)}`)); const legal = legalTarget(state, offer, state.target); at(lines, 48, 12, trim(legal.legal ? 'LEGAL TARGET' : `! ${legal.reason}`)); if (state.preview) state.preview.preview.forEach((text, i) => at(lines, 48, 14 + i, trim(text))); at(lines, 48, 20, state.phase === 'preview' ? 'ENTER: CONFIRM' : 'MOVE / ENTER: PREVIEW'); } else if (state.phase === 'result') { state.lastEvents.slice(0, 5).forEach((event, i) => at(lines, 48, 8 + i * 2, trim(`+${event.amount}  ${event.label}`))); at(lines, 48, 20, 'ENTER: CONTINUE'); } else if (state.phase === 'season') { state.seasonEvents.slice(0, 5).forEach((event, i) => at(lines, 48, 8 + i * 2, trim(`+${event.amount}  ${event.label}`))); at(lines, 48, 20, 'ENTER: NEXT SEASON'); } at(lines, 3, 25, `${DIM}${theme}L: LEDGER   ESC: PAUSE   Q: QUIT${RESET}`); }
  function renderLedger(lines: string[], theme: string): void { box(lines, 10, 6, 75, 17, 'SCORE LEDGER', '\x1b[1;96m'); state.ledger.slice(-10).forEach((event, i) => at(lines, 14, 8 + i, `+${event.amount}  ${event.label}`)); at(lines, 14, 21, `${DIM}${theme}L: CLOSE LEDGER${RESET}`); }
  function renderEnding(lines: string[], cols: number, theme: string): void { const final = state.phase === 'ending'; at(lines, center(cols, final ? 'KINGDOM CHRONICLE SEALED' : 'THE LAST PLACEMENT'), 8, `\x1b[1;${final ? '92' : '93'}m${final ? 'KINGDOM CHRONICLE SEALED' : 'THE LAST PLACEMENT'}${RESET}`); at(lines, center(cols, `FINAL GLORY * ${state.glory}`), 11, `FINAL GLORY * ${state.glory}`); at(lines, center(cols, `LAWS ${state.laws.map(displayName).join(' / ') || 'none'}`), 14, `LAWS ${state.laws.map(displayName).join(' / ') || 'none'}`); state.seasonEvents.slice(-6).forEach((event, i) => at(lines, 20, 16 + i, `+${event.amount} ${event.label}`)); at(lines, center(cols, final ? 'R: REPLAY SAME SEED   Q: QUIT' : 'ENTER: SEAL CHRONICLE'), 25, `${DIM}${theme}${final ? 'R: REPLAY SAME SEED   Q: QUIT' : 'ENTER: SEAL CHRONICLE'}${RESET}`); }
  const baseStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l'); baseStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
