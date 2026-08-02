import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, navigateMenu, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, currentTransaction, offerLabel, tagLabel, type GameState, type Treatment } from './engine';

export interface RogueLedgerController { stop: () => void; isRunning: boolean; }
const MIN_COLS = 80;
const MIN_ROWS = 28;
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function at(lines: string[], x: number, y: number, text: string): void { lines.push(`\x1b[${y};${Math.max(1, x)}H${text}`); }
function center(cols: number, text: string): number { return Math.max(1, Math.floor((cols - text.length) / 2) + 1); }
function box(lines: string[], x: number, y: number, width: number, height: number, title: string, theme: string): void {
  at(lines, x, y, `${theme}┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐${RESET}`);
  for (let row = 1; row < height - 1; row++) at(lines, x, y + row, `${theme}│${' '.repeat(Math.max(0, width - 2))}│${RESET}`);
  at(lines, x, y + height - 1, `${theme}└${'─'.repeat(Math.max(0, width - 2))}┘${RESET}`);
}
function bar(value: number, max: number, width: number): string { const filled = Math.round(Math.max(0, Math.min(1, value / max)) * width); return '■'.repeat(filled) + '·'.repeat(width - filled); }

export function runRogueLedgerGame(terminal: Terminal): RogueLedgerController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let state = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;
  const controller: RogueLedgerController = { stop: () => { running = false; }, get isRunning() { return running; } };

  function quit(): void { controller.stop(); dispatchGameQuit(terminal); }
  function restart(): void { state = applyCommand(state, { type: 'restartRun' }); paused = false; pauseSelection = 0; }
  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    return true;
  }
  function keyForTreatment(key: string): Treatment | null { return key === 'b' ? 'book' : key === 'c' ? 'capitalize' : key === 'd' ? 'defer' : key === 'r' ? 'reserve' : key === 'x' ? 'decline' : null; }
  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (key === 'escape' && state.phase !== 'ending') { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, event)) return;
    if (state.phase === 'briefing') { if (key === 'q') quit(); else state = applyCommand(state, { type: 'dismissBriefing' }); return; }
    if (state.phase === 'working') { const treatment = keyForTreatment(key); if (treatment) state = applyCommand(state, { type: 'selectTreatment', treatment }); return; }
    if (state.phase === 'preview') { if (key === 'enter' || key === ' ') state = applyCommand(state, { type: 'confirmEntry' }); else if (key === 'escape') state = applyCommand(state, { type: 'dismissResult' }); return; }
    if (state.phase === 'result') { if (key === 'enter' || key === ' ') state = applyCommand(state, { type: 'dismissResult' }); return; }
    if (state.phase === 'draft') { const index = Number(key) - 1; if (index >= 0 && index < state.offers.length) state = applyCommand(state, { type: 'chooseOffer', offerId: state.offers[index]!.id }); return; }
    if (state.phase === 'report') { if (key === 'enter' || key === ' ') state = applyCommand(state, { type: 'continueReport' }); return; }
    if (state.phase === 'gameOver') { if (key === 'r') state = applyCommand(state, { type: 'restartQuarter' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'ending') { if (key === 'r') restart(); else if (key === 'q') quit(); }
  }

  function render(): void {
    const cols = terminal.cols; const rows = terminal.rows; const lines: string[] = ['\x1b[2J\x1b[H']; const theme = getCurrentThemeColor();
    if (cols < MIN_COLS || rows < MIN_ROWS) { at(lines, center(cols, 'TERMINAL TOO SMALL'), Math.max(2, Math.floor(rows / 2)), '\x1b[1;91mTERMINAL TOO SMALL' + RESET); at(lines, center(cols, 'Need 80x28'), Math.max(3, Math.floor(rows / 2) + 2), 'Need 80x28  Have ' + cols + 'x' + rows); terminal.write(lines.join('')); return; }
    at(lines, center(cols, '✦ ROGUE LEDGER // IMPROBABLE FINANCE ✦'), 1, `${theme}\x1b[1m✦ ROGUE LEDGER // IMPROBABLE FINANCE ✦${RESET}`);
    at(lines, 3, 3, `${theme}Q${state.quarter}/6${RESET}  CASH ${state.cash >= 0 ? '+' : ''}${state.cash}  PROFIT ${state.profit >= 0 ? '+' : ''}${state.profit}/${state.target}  ! AUDIT [${bar(state.audit, 12, 12)}] ${state.audit}/12  ★ ${state.standing}`);
    if (state.phase === 'briefing') { renderBriefing(lines, state, cols, theme); terminal.write(lines.join('')); return; }
    if (state.phase === 'draft') { renderDraft(lines, state, cols, theme); terminal.write(lines.join('')); return; }
    if (state.phase === 'report') { renderReport(lines, state, cols, theme); terminal.write(lines.join('')); return; }
    if (state.phase === 'gameOver' || state.phase === 'ending') { renderEnd(lines, state, cols, theme); terminal.write(lines.join('')); return; }
    renderWorkbench(lines, state, theme);
    if (paused) { at(lines, center(cols, 'PAUSED'), 13, '\x1b[1;93mPAUSED' + RESET); lines.push(renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(cols / 2), startY: 15, showShortcuts: false })); }
    terminal.write(lines.join(''));
  }
  function renderBriefing(lines: string[], current: GameState, cols: number, theme: string): void { box(lines, 10, 7, cols - 18, 14, `Q${current.quarter} FORECAST`, theme); at(lines, 14, 10, 'The Moon has repossessed three filing cabinets.'); at(lines, 14, 12, `TARGET: +${current.target} PROFIT   CASH FLOOR: ${current.floor}`); at(lines, 14, 14, 'Choose treatments to make the quarter solvent.'); at(lines, center(cols, 'ANY KEY: OPEN BOOKS   ESC: PAUSE   Q: QUIT'), 23, `${DIM}${theme}ANY KEY: OPEN BOOKS   ESC: PAUSE   Q: QUIT${RESET}`); }
  function renderWorkbench(lines: string[], current: GameState, theme: string): void {
    const transaction = currentTransaction(current); box(lines, 3, 5, 35, 17, 'ACTIVE BUILD', theme); box(lines, 40, 5, 41, 17, 'INCOMING TRANSACTION', theme);
    current.rules.slice(0, 5).forEach((rule, i) => at(lines, 6, 8 + i * 2, `§ ${rule.name.slice(0, 26)}`)); current.categories.slice(0, 3).forEach((category, i) => at(lines, 6, 19 + i, `◇ ${category.name.slice(0, 26)}`));
    if (transaction) { at(lines, 43, 8, `◆ ${transaction.title.slice(0, 33)}`); at(lines, 43, 10, transaction.description.slice(0, 35)); at(lines, 43, 12, `SOURCE: ${transaction.source.slice(0, 27)}`); at(lines, 14, 14, `${transaction.baseCredits >= 0 ? '+' : ''}${transaction.baseCredits}  ${transaction.tags.map(tagLabel).join(' · ')}`); transaction.visibleClauses.forEach((clause, i) => at(lines, 43, 14 + i, clause.slice(0, 35))); at(lines, 43, 18, 'B/C/D/R/X: TREAT'); }
    if (current.phase === 'preview' && current.preview) { box(lines, 7, 9, 73, 9, 'ENTRY PROJECTION — ENTER TO COMMIT', '\x1b[1;93m'); at(lines, 10, 12, current.preview.trace.slice(0, 3).join('   ').slice(0, 66)); at(lines, 10, 14, `FINAL ${current.preview.finalCredits >= 0 ? '+' : ''}${current.preview.finalCredits}   AUDIT ${current.preview.auditDelta >= 0 ? '+' : ''}${current.preview.auditDelta}   STANDING +${current.preview.standingDelta}`.slice(0, 66)); at(lines, 10, 16, current.preview.liabilities.length ? `↳ DUE Q${current.preview.liabilities[0]!.dueQuarter}: -${current.preview.liabilities[0]!.amount}` : 'NO SCHEDULED LIABILITY'); }
    if (current.phase === 'result' && current.lastResult) { at(lines, 43, 21, `${current.lastResult.finalCredits >= 0 ? '✓' : '!'} ${current.notice}`); at(lines, 3, 24, `${DIM}${theme}${current.lastResult.trace.slice(0, 3).join('  |  ')}${RESET}`); }
    at(lines, 3, 27, `${DIM}${theme}B/C/D/R/X TREAT  ENTER CONFIRM/NEXT  ESC PAUSE  Q QUIT${RESET}`);
  }
  function renderDraft(lines: string[], current: GameState, cols: number, theme: string): void { at(lines, center(cols, '✦ QUARTER CLEARED — DRAFT POLICY ✦'), 8, '\x1b[1;93m✦ QUARTER CLEARED — DRAFT POLICY ✦' + RESET); current.offers.forEach((offer, i) => { at(lines, 15, 12 + i * 3, `${i + 1}: ${offerLabel(offer)}`); at(lines, 19, 13 + i * 3, `${DIM}${theme}${(offer.rule?.text ?? offer.category?.text ?? '').slice(0, 60)}${RESET}`); }); at(lines, center(cols, '1-3: INSTALL OFFER'), 23, `${DIM}${theme}1-3: INSTALL OFFER${RESET}`); }
  function renderReport(lines: string[], current: GameState, cols: number, theme: string): void { at(lines, center(cols, `Q${current.quarter - 1} REPORT FILED`), 9, `${theme}\x1b[1mQ${current.quarter - 1} REPORT FILED${RESET}`); at(lines, center(cols, `CASH ${current.cash}  RULES ${current.rules.length}  CATEGORIES ${current.categories.length}`), 13, `CASH ${current.cash}  RULES ${current.rules.length}  CATEGORIES ${current.categories.length}`); at(lines, center(cols, 'ENTER: READ NEXT FORECAST'), 19, `${DIM}${theme}ENTER: READ NEXT FORECAST${RESET}`); }
  function renderEnd(lines: string[], current: GameState, cols: number, theme: string): void { const won = current.phase === 'ending'; at(lines, center(cols, won ? '✓ ANNUAL AUDIT COMPLETE' : '! COMPANY UNDER AUDIT'), 9, won ? '\x1b[1;92m✓ ANNUAL AUDIT COMPLETE' + RESET : '\x1b[1;91m! COMPANY UNDER AUDIT' + RESET); at(lines, center(cols, current.notice), 12, current.notice); at(lines, center(cols, `CASH ${current.cash}  STANDING ${current.standing}  AUDIT ${current.audit}`), 15, `CASH ${current.cash}  STANDING ${current.standing}  AUDIT ${current.audit}`); at(lines, center(cols, won ? 'R RESTART RUN   Q QUIT' : 'R RETRY QUARTER   Q QUIT'), 20, `${DIM}${theme}${won ? 'R RESTART RUN   Q QUIT' : 'R RETRY QUARTER   Q QUIT'}${RESET}`); }

  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(render, 50); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
