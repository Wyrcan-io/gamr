import { clipToWidth, displayWidth, padToWidth } from '../../ui/terminal';
import { getThemePalette, type TerminalThemePalette } from '../utils';
import { currentTransaction, offerLabel, tagLabel, type GameState } from './engine';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const MIN_COLS = 80;
const MIN_ROWS = 24;
export interface RogueRenderModel { selectedTreatment: number; helpOpen: boolean; paused: boolean; }

function put(out: string[], x: number, y: number, text: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${text}`); }
function line(value: string, width: number, color = ''): string { return `${color}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`; }
function centered(out: string[], cols: number, y: number, value: string, color: string): void { put(out, Math.max(1, Math.floor((cols - displayWidth(value)) / 2) + 1), y, `${color}${value}${RESET}`); }

export function renderTitle(cols: number, rows: number, palette = getThemePalette()): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) {
    centered(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'LEDGER NEEDS MORE ROOM', `${palette.danger}${BOLD}`);
    centered(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, palette.muted);
    return out.join('');
  }
  centered(out, cols, 5, 'g/ ROGUE LEDGER', `${palette.focus}${BOLD}`);
  centered(out, cols, 8, 'IMPROBABLE FINANCE', palette.ink);
  centered(out, cols, 13, 'ENTER STANDARD RUN   T INDUCTION', `${palette.good}${BOLD}`);
  centered(out, cols, 16, 'Q QUIT', palette.muted);
  return out.join('');
}

export function renderFrame(state: GameState, cols: number, rows: number, palette = getThemePalette(), model: RogueRenderModel = { selectedTreatment: 0, helpOpen: false, paused: false }): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) { centered(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'LEDGER NEEDS MORE ROOM', `${palette.danger}${BOLD}`); centered(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, palette.muted); return out.join(''); }
  put(out, 3, 1, `${palette.focus}${BOLD}g/ ROGUE LEDGER${RESET}`);
  put(out, 24, 1, line(`${state.mode === 'tutorial' ? 'INDUCTION' : 'STANDARD RUN'}  Q${state.quarter}/4`, 28, palette.muted));
  put(out, 3, 3, line(`CASH ${state.cash >= 0 ? '+' : ''}${state.cash}  PROFIT ${state.profit >= 0 ? '+' : ''}${state.profit}/${state.target}  AUDIT ${state.audit}/12  STANDING ${state.standing}`, cols - 6, palette.ink));
  if (model.helpOpen) { help(out, cols, palette); return out.join(''); }
  if (state.phase === 'briefing') return briefing(out, cols, state, palette);
  if (state.phase === 'draft') return draft(out, cols, state, palette);
  if (state.phase === 'report') return report(out, cols, state, palette);
  if (state.phase === 'ending' || state.phase === 'gameOver') return ending(out, cols, state, palette);
  workbench(out, cols, state, palette, model);
  if (model.paused) centered(out, cols, 13, 'PAUSED', `${palette.warning}${BOLD}`);
  return out.join('');
}

function briefing(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string { centered(out, cols, 8, state.mode === 'tutorial' ? 'INDUCTION // READ THE ROW' : `Q${state.quarter} FORECAST`, `${palette.focus}${BOLD}`); centered(out, cols, 12, 'Every entry has a now, a later, and a cost to trust.', palette.ink); centered(out, cols, 14, `TARGET +${state.target}  CASH FLOOR ${state.floor}`, palette.muted); centered(out, cols, 18, state.mode === 'tutorial' ? 'ENTER  OPEN THE FOUR-ENTRY INDUCTION' : 'ENTER  OPEN THE BOOKS', `${palette.good}${BOLD}`); return out.join(''); }
function draft(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string { centered(out, cols, 8, '[+] QUARTER CLEARED // DRAFT POLICY', `${palette.good}${BOLD}`); state.offers.slice(0, 3).forEach((offer, i) => { put(out, 12, 12 + i * 3, line(`${i + 1} ${offerLabel(offer)}`, cols - 24, palette.ink)); put(out, 16, 13 + i * 3, line(offer.rule?.text ?? offer.category?.text ?? '', cols - 32, palette.muted)); }); centered(out, cols, 23, '1-3  INSTALL OFFER', palette.muted); return out.join(''); }
function report(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string { centered(out, cols, 9, `Q${state.quarter - 1} REPORT FILED`, `${palette.focus}${BOLD}`); centered(out, cols, 13, `CASH ${state.cash}  RULES ${state.rules.length}  CATEGORIES ${state.categories.length}`, palette.ink); centered(out, cols, 19, 'ENTER  READ NEXT FORECAST', palette.muted); return out.join(''); }
function ending(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string { const won = state.phase === 'ending'; centered(out, cols, 8, won ? '[+] ANNUAL AUDIT COMPLETE' : '[x] COMPANY UNDER AUDIT', `${won ? palette.good : palette.danger}${BOLD}`); centered(out, cols, 12, state.notice, palette.ink); centered(out, cols, 16, `CASH ${state.cash}  STANDING ${state.standing}  AUDIT ${state.audit}`, palette.focus); centered(out, cols, 21, won ? 'R RESTART RUN   Q QUIT' : 'R RETRY QUARTER   Q QUIT', palette.muted); return out.join(''); }

function workbench(out: string[], cols: number, state: GameState, palette: TerminalThemePalette, model: RogueRenderModel): void {
  const transaction = currentTransaction(state);
  const width = 42;
  put(out, 3, 5, `${palette.focus}${BOLD}ACCOUNTING ROW${RESET}`);
  put(out, 3, 6, line('BASE        TREATMENT        NOW       LATER     AUDIT  STAND', width, palette.muted));
  if (!transaction) return;
  put(out, 3, 8, line(`${transaction.baseCredits >= 0 ? '+' : ''}${transaction.baseCredits}  ${transaction.title}`, width, palette.ink));
  put(out, 3, 10, line(`${transaction.source}  ${transaction.tags.map(tagLabel).join(' / ')}`, width, palette.muted));
  put(out, 3, 12, line(transaction.visibleClauses.join('  '), width, palette.warning));
  const legal = transaction.allowedTreatments;
  put(out, 3, 15, `${palette.focus}${BOLD}LEGAL TREATMENTS${RESET}`);
  legal.forEach((treatment, i) => { const selected = model.selectedTreatment === i; const projection = state.preview && state.preview.treatment === treatment ? state.preview : undefined; put(out, 3, 16 + i * 2, line(`${selected ? '>' : ' '} ${treatment.toUpperCase()}${projection ? `  NOW ${projection.finalCredits >= 0 ? '+' : ''}${projection.finalCredits}` : ''}`, width, selected ? palette.focus : palette.ink)); });
  const right = 49;
  put(out, right, 5, `${palette.focus}${BOLD}RED-PENCIL MARGIN${RESET}`);
  put(out, right, 7, line('Selected entry resolves in this order:', cols - right - 3, palette.muted));
  (state.preview?.trace ?? ['BASE amount', 'TREATMENT choice', 'RULES and categories', 'NOW result', 'LATER schedule']).slice(0, 7).forEach((text, i) => put(out, right, 9 + i, line(`${i + 1}. ${text}`, cols - right - 3, palette.ink)));
  put(out, right, 18, `${palette.focus}${BOLD}LIABILITY SCHEDULE${RESET}`);
  (state.liabilities.length ? state.liabilities : [{ label: 'No scheduled adjustments', amount: 0, dueQuarter: state.quarter + 1 }]).slice(0, 4).forEach((item, i) => put(out, right, 20 + i, line(`Q${item.dueQuarter} ${item.amount >= 0 ? '+' : ''}${item.amount} ${item.label}`, cols - right - 3, item.amount < 0 ? palette.warning : palette.good)));
  put(out, 3, 26, line('↑↓ SELECT LEGAL TREATMENT  ENTER PREVIEW/COMMIT  BACKSPACE CANCEL  ? HELP  ESC PAUSE', cols - 6, palette.muted));
}

function help(out: string[], cols: number, palette: TerminalThemePalette): void { const width = Math.min(68, cols - 10); const x = Math.floor((cols - width) / 2) + 1; put(out, x, 7, `${palette.focus}${BOLD}g/ ROGUE LEDGER / ACCOUNTING CARD${RESET}`); ['Book applies the full entry now.', 'Capitalize lowers the expense now and schedules payment later.', 'Defer protects this row now but creates a larger later payment.', 'Reserve moves part of income or expense into the next quarter.', 'Decline protects cash but can cost Standing or violate a clause.', 'Preview shows the arithmetic before Enter commits it.'].forEach((text, i) => put(out, x, 10 + i, line(text, width, palette.ink))); }
