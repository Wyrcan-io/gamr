import { clipToWidth, displayWidth, padToWidth } from '../../ui/terminal';
import { getThemePalette, type TerminalThemePalette } from '../utils';
import { displayFaction, GOODS, type GameState } from './engine';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const MIN_COLS = 80;
const MIN_ROWS = 24;
const FRAMES = ['COVETED', 'VANISHING', 'COUNTERFEIT', 'CURSED'];
const INTENSITIES = ['WHISPER', 'BROADSIDE', 'PROCLAMATION'];
export type MarketFocus = 'tape' | 'shelf' | 'broadsheet';
export interface MarketRenderModel { selectedGood: number; secondGood: number; selectedArtifact: number; selectedFaction: number; frame: number; intensity: number; focus: MarketFocus; helpOpen: boolean; paused: boolean; }

function put(out: string[], x: number, y: number, text: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${text}`); }
function line(value: string, width: number, color = ''): string { return `${color}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`; }
function centered(out: string[], cols: number, y: number, value: string, color: string): void { put(out, Math.max(1, Math.floor((cols - displayWidth(value)) / 2) + 1), y, `${color}${value}${RESET}`); }
function money(value: number): string { return `${value >= 0 ? '+' : ''}${value}`; }
function meter(value: number, max: number, width: number): string { const filled = Math.round(Math.max(0, Math.min(1, value / Math.max(1, max))) * width); return `[${'+'.repeat(filled)}${'.'.repeat(width - filled)}]`; }

export function renderTitle(cols: number, rows: number, palette = getThemePalette()): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) {
    centered(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'MARKET NEEDS MORE ROOM', `${palette.danger}${BOLD}`);
    centered(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, palette.muted);
    return out.join('');
  }
  centered(out, cols, 5, 'g/ MARKET OF MIRRORS', `${palette.focus}${BOLD}`);
  centered(out, cols, 8, 'BUY THE STRANGE. SELL THE STORY.', palette.ink);
  centered(out, cols, 13, 'ENTER STANDARD MARKET   T GUIDED FAIR', `${palette.good}${BOLD}`);
  centered(out, cols, 16, 'Q QUIT', palette.muted);
  return out.join('');
}

export function renderFrame(state: GameState, cols: number, rows: number, palette = getThemePalette(), model: MarketRenderModel = { selectedGood: 0, secondGood: 1, selectedArtifact: 0, selectedFaction: 0, frame: 0, intensity: 0, focus: 'tape', helpOpen: false, paused: false }): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) { centered(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'MARKET NEEDS MORE ROOM', `${palette.danger}${BOLD}`); centered(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, palette.muted); return out.join(''); }
  put(out, 3, 1, `${palette.focus}${BOLD}g/ MARKET OF MIRRORS${RESET}`);
  put(out, 31, 1, line(`${state.mode === 'tutorial' ? 'GUIDED FAIR' : 'NINE-DAY MARKET'}  DAY ${state.day}/${state.maxDay}`, 30, palette.muted));
  if (model.helpOpen) {
    help(out, cols, palette);
    return out.join('');
  }
  if (state.phase === 'briefing') return briefing(out, cols, state, palette);
  if (state.phase === 'ending') return ending(out, cols, state, palette);
  if (state.phase === 'draft') return draft(out, cols, state, palette);
  if (state.phase === 'bellReport') bell(out, cols, state, palette);
  else market(out, cols, state, palette, model);
  if (model.paused) centered(out, cols, 12, 'PAUSED', `${palette.warning}${BOLD}`);
  return out.join('');
}

function briefing(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string { centered(out, cols, 8, state.mode === 'tutorial' ? 'GUIDED FAIR // THREE SMALL DAYS' : 'MORNING LEDGER // THE STALLS ARE OPEN', `${palette.focus}${BOLD}`); ['Read the quote before you buy.', 'Turn two raw lots into one named artifact.', 'A published claim waits for the closing bell.'].forEach((text, i) => centered(out, cols, 12 + i * 2, text, palette.ink)); centered(out, cols, 21, 'ENTER  OPEN THE AUCTION TAPE', `${palette.good}${BOLD}`); return out.join(''); }
function ending(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string { centered(out, cols, 7, '[+] THE LAST REFLECTION', `${palette.good}${BOLD}`); centered(out, cols, 10, `ESTATE ${state.cash}  CRED ${state.credibility}/6  SUSP ${state.suspicion}/6`, palette.ink); centered(out, cols, 14, state.journal[0] ?? 'The mirrors keep their own account.', palette.focus); centered(out, cols, 21, 'R REPLAY SEED   N NEW SEED   Q QUIT', palette.muted); return out.join(''); }
function draft(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string { centered(out, cols, 8, 'ACT CLOSED // DRAFT ONE METHOD', `${palette.focus}${BOLD}`); state.offers.slice(0, 3).forEach((offer, i) => { put(out, 12, 12 + i * 3, line(`${i + 1}. ${offer.name}`, cols - 24, palette.ink)); put(out, 15, 13 + i * 3, line(offer.text, cols - 30, palette.muted)); }); centered(out, cols, 23, '1-3  INSTALL METHOD', palette.muted); return out.join(''); }

function market(out: string[], cols: number, state: GameState, palette: TerminalThemePalette, model: MarketRenderModel): void {
  const left = 48; const right = cols - left - 7;
  put(out, 3, 3, line(`CASH ${money(state.cash)}  CRED ${meter(state.credibility, 6, 6)}  SUSP ${meter(state.suspicion, 6, 6)}  ACTIONS ${state.actions}/3`, cols - 6, palette.ink));
  put(out, 3, 5, `${palette.focus}${BOLD}AUCTION TAPE${RESET}`);
  put(out, 3, 6, line(`${model.focus === 'tape' ? '>' : ' '} GOOD       MID  Δ  BID ASK STOCK`, left, palette.muted));
  GOODS.forEach((good, i) => { const market = state.market[good.id]!; const delta = market.mid - market.previous; put(out, 3, 7 + i, line(`${model.selectedGood === i ? '>' : ' '} ${good.icon} ${good.short.padEnd(4)} ${String(market.mid).padStart(3)} ${delta >= 0 ? '+' : ''}${String(delta).padStart(2)} ${String(market.mid - 1).padStart(3)} ${String(market.mid + 1).padStart(3)} ${market.stock}`, left, model.selectedGood === i ? palette.focus : palette.ink)); });
  put(out, 3, 17, `${palette.focus}${BOLD}INVENTORY SHELF${RESET}`);
  const inventory = [...state.inventory.map(lot => `${lot.goodId.toUpperCase()} @${lot.cost}`), ...state.artifacts.map(artifact => `* ${artifact.name}`)];
  (inventory.length ? inventory : ['EMPTY — buy a raw lot']).slice(0, 4).forEach((item, i) => put(out, 3, 19 + i, line(`${model.focus === 'shelf' && model.selectedArtifact === i ? '>' : ' '} ${item}`, left, model.focus === 'shelf' ? palette.focus : palette.ink)));
  const x = left + 6;
  put(out, x, 5, `${palette.focus}${BOLD}RUMOR BROADSHEET${RESET}`);
  const circular = state.circular;
  if (circular) { put(out, x, 7, line(`${circular.source === 'player' ? 'YOU' : displayFaction(circular.source)}  ${circular.subject.toUpperCase()}`, right, palette.ink)); put(out, x, 8, line(`${circular.frame.toUpperCase()}  INTENSITY ${circular.intensity}  CLOSES ${circular.closes} BELL(S)`, right, palette.warning)); put(out, x, 10, line(`CREDIBILITY ${state.credibility}/6`, right, palette.muted)); } else put(out, x, 7, line('No circular has reached the desk.', right, palette.muted));
  put(out, x, 13, `${palette.focus}${BOLD}CLOSING NOTE${RESET}`); put(out, x, 15, line(state.notice, right, palette.ink)); put(out, x, 17, line(`COMMISSION: ${state.commission.name}`, right, palette.muted)); put(out, x, 19, line(state.commission.text, right, palette.muted));
  const good = GOODS[model.selectedGood]!; put(out, x, 22, line(`FOCUS ${good.name}  FRAME ${FRAMES[model.frame]}`, right, palette.focus)); put(out, x, 23, line(`SECOND ${GOODS[model.secondGood]!.short}  INTENSITY ${INTENSITIES[model.intensity]}`, right, palette.muted));
  put(out, 3, 26, line('TAB FOCUS  ↑↓ SELECT  ENTER ACTIONS  B/S BUY/SELL  C COMBINE  P PUBLISH  E BELL  ? HELP  ESC PAUSE', cols - 6, palette.muted));
  if (state.phase === 'preview' && state.pending) preview(out, cols, state, palette);
}

function preview(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): void { const result = state.pending!; const width = Math.min(64, cols - 12); const x = Math.floor((cols - width) / 2) + 1; put(out, x, 8, `${palette.focus}${BOLD}ACTION PREVIEW${RESET}`); result.lines.slice(0, 7).forEach((text, i) => put(out, x, 11 + i, line(text, width, palette.ink))); centered(out, cols, 20, 'ENTER CONFIRM   BACKSPACE CANCEL', `${palette.good}${BOLD}`); }
function bell(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): void { centered(out, cols, 7, 'CLOSING BELL // WHAT MOVED', `${palette.focus}${BOLD}`); const bell = state.lastBell; if (!bell) return; bell.priceLines.slice(0, 5).forEach((text, i) => put(out, 8, 10 + i, line(`[PRICE] ${text}`, 34, palette.ink))); bell.factionLines.slice(0, 5).forEach((text, i) => put(out, 45, 10 + i, line(`[ORDER] ${text}`, cols - 48, palette.muted))); bell.rumorLines.slice(0, 3).forEach((text, i) => put(out, 8, 18 + i, line(`[CLAIM] ${text}`, cols - 16, palette.warning))); centered(out, cols, 25, 'ENTER  DISMISS BELL', palette.muted); }
function help(out: string[], cols: number, palette: TerminalThemePalette): void { const width = Math.min(66, cols - 10); const x = Math.floor((cols - width) / 2) + 1; put(out, x, 7, `${palette.focus}${BOLD}g/ MARKET OF MIRRORS / LEDGER CARD${RESET}`); ['Focus a good, shelf, or broadsheet; actions follow the focus.', 'Every action previews cash, stock, inventory, or suspicion first.', 'Buy and sell use the morning quote. The bell moves tomorrow’s quote.', 'Combine two raw lots into an artifact, then inspect faction bids.', 'Publish one claim per day. Belief and flow explain the closing quote.', '? closes help. Escape closes help or opens the shared pause menu.'].forEach((text, i) => put(out, x, 10 + i, line(text, width, palette.ink))); }
