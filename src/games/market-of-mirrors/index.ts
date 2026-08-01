import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, navigateMenu, renderSimpleMenu } from '../shared/menu';
import { applyCommand, currentBids, displayFaction, displayGood, GOODS, GOOD_BY_ID, FACTIONS, quote, type FactionId, type GameState, type GoodId, type MethodId, createState } from './engine';

export interface MarketOfMirrorsController { stop: () => void; isRunning: boolean; }
const MIN_COLS = 80;
const MIN_ROWS = 28;
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GOOD_IDS = GOODS.map(good => good.id);
const FRAME_IDS = ['coveted', 'vanishing', 'counterfeit', 'cursed'] as const;
const INTENSITIES = ['whisper', 'broadside', 'proclamation'] as const;

function at(lines: string[], x: number, y: number, value: string): void { lines.push(`\x1b[${y};${Math.max(1, x)}H${value}`); }
function center(cols: number, value: string): number { return Math.max(1, Math.floor((cols - value.replace(/\x1b\[[0-9;]*m/g, '').length) / 2) + 1); }
function clip(value: string, width: number): string { return value.length > width ? `${value.slice(0, Math.max(0, width - 1))}…` : value; }
function box(lines: string[], x: number, y: number, width: number, height: number, title: string, theme: string): void {
  const inner = Math.max(0, width - 2); at(lines, x, y, `${theme}+-- ${clip(title, Math.max(4, inner - 4))} ${'-'.repeat(Math.max(0, width - title.length - 6))}+${RESET}`);
  for (let row = 1; row < height - 1; row++) at(lines, x, y + row, `${theme}|${' '.repeat(inner)}|${RESET}`);
  at(lines, x, y + height - 1, `${theme}+${'-'.repeat(inner)}+${RESET}`);
}
function bar(value: number, max: number, width: number): string { const filled = Math.round(Math.max(0, Math.min(1, value / max)) * width); return '#'.repeat(filled) + '.'.repeat(width - filled); }
function money(value: number): string { return `${value >= 0 ? '+' : ''}${value}`; }
function estate(state: GameState, factionId?: FactionId): number {
  const cash = factionId ? state.factions[factionId]!.cash : state.cash;
  const lots = factionId ? Object.entries(state.factions[factionId]!.holdings).reduce((sum, [id, count]) => sum + count * state.market[id as GoodId]!.mid, 0) : state.inventory.reduce((sum, lot) => sum + Math.max(3, state.market[lot.goodId]!.mid - 1), 0);
  const artifacts = factionId ? state.factions[factionId]!.artifacts.reduce((sum, artifact) => sum + Math.floor((currentBids(state, artifact)[0]?.amount ?? 5) * 0.7), 0) : state.artifacts.reduce((sum, artifact) => sum + Math.floor((currentBids(state, artifact)[0]?.amount ?? 5) * 0.7), 0);
  const reputation = factionId ? state.factions[factionId]!.credibility * 6 : state.credibility * 6 - state.suspicion * 5;
  return cash + lots + artifacts + reputation;
}

export function runMarketOfMirrorsGame(terminal: Terminal): MarketOfMirrorsController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let title = true;
  let help = false;
  let selectedGood = 0;
  let secondGood = 1;
  let selectedArtifact = 0;
  let selectedFaction = 0;
  let frame = 0;
  let intensity = 0;
  let state: GameState = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;
  const controller: MarketOfMirrorsController = { stop: () => { running = false; }, get isRunning() { return running; } };

  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = (sameSeed = true): void => { state = createState(sameSeed ? state.seed : Date.now()); title = false; paused = false; pauseSelection = 0; selectedGood = 0; selectedArtifact = 0; };
  const run = (command: Parameters<typeof applyCommand>[1]): void => { state = applyCommand(state, command); };
  const selectedGoodId = (): GoodId => GOOD_IDS[selectedGood] ?? 'echo';
  const selectedSecondId = (): GoodId => GOOD_IDS[secondGood] ?? 'shadow';
  const selectedArtifactId = (): string | undefined => state.artifacts[selectedArtifact]?.id;

  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart(true);
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { running = false; dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { running = false; dispatchGameSwitch(terminal); }
    return true;
  }

  function actionForKey(key: string): void {
    const good = selectedGoodId();
    if (key === 'b') run({ type: 'previewAction', action: { type: 'buy', goodId: good } });
    else if (key === 's') run({ type: 'previewAction', action: { type: 'sell', goodId: good } });
    else if (key === 'c') run({ type: 'previewAction', action: { type: 'combine', goodId: good, secondGoodId: selectedSecondId() } });
    else if (key === 'o' && selectedArtifactId()) run({ type: 'previewAction', action: { type: 'offer', artifactId: selectedArtifactId(), factionId: (Object.keys(FACTIONS) as FactionId[])[selectedFaction] } });
    else if (key === 'p') run({ type: 'previewAction', action: { type: 'publish', goodId: good, frame: FRAME_IDS[frame], intensity: INTENSITIES[intensity] } });
    else if (key === 'e') run({ type: 'endDay' });
  }

  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (key === 'escape' && !title && state.phase !== 'ending' && !help) { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, event)) return;
    if (title) { if (key === 't') { state = createState(Date.now(), 'tutorial'); title = false; } else if (key === 'enter' || key === 'p') { state = createState(Date.now(), 'standard'); title = false; } else if (key === 'q') quit(); return; }
    if (key === 'q' && state.phase !== 'market' && state.phase !== 'preview') { quit(); return; }
    if (key === '?' || key === 'h') { help = !help; return; }
    if (help) { if (key === 'backspace' || key === 'enter') help = false; return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'market') {
      if (key >= '1' && key <= '8') selectedGood = Number(key) - 1;
      else if (key === 'a') secondGood = (secondGood + 1) % GOOD_IDS.length;
      else if (key === 'z') secondGood = (secondGood - 1 + GOOD_IDS.length) % GOOD_IDS.length;
      else if (key === 'j') selectedArtifact = Math.min(state.artifacts.length - 1, selectedArtifact + 1);
      else if (key === 'k') selectedArtifact = Math.max(0, selectedArtifact - 1);
      else if (key === 'f') frame = (frame + 1) % FRAME_IDS.length;
      else if (key === 'g') intensity = (intensity + 1) % INTENSITIES.length;
      else if (key === 'v') selectedFaction = (selectedFaction + 1) % 4;
      else actionForKey(key);
      return;
    }
    if (state.phase === 'preview') { if (key === 'enter' || key === ' ') run({ type: 'confirmAction' }); else if (key === 'backspace') run({ type: 'cancelPreview' }); return; }
    if (state.phase === 'bellReport') { if (key === 'enter' || key === ' ') run({ type: 'dismissBellReport' }); return; }
    if (state.phase === 'draft') { const index = Number(key) - 1; if (index >= 0 && index < state.offers.length) run({ type: 'chooseMethod', methodId: state.offers[index]!.id as MethodId }); return; }
    if (state.phase === 'ending') { if (key === 'r') restart(true); else if (key === 'n') restart(false); else if (key === 'q') quit(); }
  }

  function renderTitle(lines: string[], cols: number, theme: string): void {
    at(lines, center(cols, '◇ MARKET OF MIRRORS ◇'), 2, `${theme}\x1b[1m◇ MARKET OF MIRRORS ◇${RESET}`);
    at(lines, center(cols, 'BUY THE STRANGE. SELL THE STORY.'), 4, `${DIM}${theme}BUY THE STRANGE. SELL THE STORY.${RESET}`);
    box(lines, 13, 8, 54, 11, 'THE MIRROR FAIR', theme);
    at(lines, 18, 11, 'Buy impossible goods. Combine them into artifacts.'); at(lines, 18, 13, 'Plant a rumor; the factions decide whether it rings true.'); at(lines, 18, 15, 'Every claim waits for the closing bell.');
    at(lines, center(cols, '[ENTER] MARKET RUN    [T] GUIDED FAIR    [Q] QUIT'), 22, `${theme}[ENTER] MARKET RUN    [T] GUIDED FAIR    [Q] QUIT${RESET}`);
  }
  function renderBriefing(lines: string[], cols: number, theme: string): void {
    box(lines, 8, 7, cols - 16, 15, state.mode === 'tutorial' ? 'GUIDED FAIR' : 'MORNING LEDGER', theme);
    at(lines, 14, 10, state.mode === 'tutorial' ? 'Three small days will teach quotes, combinations, and rumors.' : 'Nine days. Three actions each day. Highest estate wins.');
    at(lines, 14, 12, 'Buy and sell at the morning quote. Combine two raw lots into one named artifact.');
    at(lines, 14, 14, 'Publish a claim; factions react at the bell, and you trade the result tomorrow.');
    at(lines, 14, 16, 'Credibility makes claims travel. Suspicion makes the inspectors curious.');
    at(lines, center(cols, 'ENTER: OPEN THE STALLS   ESC: PAUSE   Q: QUIT'), 20, `${DIM}${theme}ENTER: OPEN THE STALLS   ESC: PAUSE   Q: QUIT${RESET}`);
  }
  function renderMarket(lines: string[], _cols: number, theme: string): void {
    at(lines, 3, 3, `${theme}DAY ${state.day}/${state.maxDay}   CASH ${money(state.cash)}   CRED ${bar(state.credibility, 6, 6)}   SUSP ${bar(state.suspicion, 6, 6)}   ACTIONS ${'#'.repeat(state.actions)}${'.'.repeat(3 - state.actions)}${RESET}`);
    box(lines, 2, 5, 39, 11, 'MARKET', theme); box(lines, 42, 5, 37, 11, 'CIRCULARS', theme); box(lines, 2, 17, 39, 7, `INVENTORY ${state.inventory.length + state.artifacts.length}/8`, theme); box(lines, 42, 17, 37, 7, 'FACTIONS', theme);
    GOODS.forEach((good, i) => { const market = state.market[good.id]!; const q = quote(state, good.id); const marker = selectedGood === i ? '>' : ' '; const delta = market.mid - market.previous; at(lines, 4, 7 + i, `${marker}${i + 1} ${good.icon} ${good.short} ${String(market.mid).padStart(2)} ${delta > 0 ? '↑' : delta < 0 ? '↓' : '·'}${String(Math.abs(delta)).padStart(2)} b${q.bid} a${q.ask} x${market.stock}`); });
    const circular = state.circular; if (circular) { at(lines, 44, 7, `${FACTIONS[circular.source as FactionId]?.icon ?? '≈'} ${displayGood(circular.subject)}`); at(lines, 44, 8, `${circular.frame.toUpperCase()}  ${circular.intensity === 1 ? 'WHISPER' : circular.intensity === 2 ? 'BROAD' : 'LOUD'}`); at(lines, 44, 10, 'The claim is public before you act.'); at(lines, 44, 11, `Your record: ${state.credibility}/6 credibility`); }
    const inv = state.inventory.slice(0, 4); inv.forEach((lot, i) => at(lines, 4, 19 + i, `${i + 1} ${GOOD_BY_ID[lot.goodId].short}@${lot.cost}`)); state.artifacts.slice(0, 2).forEach((artifact, i) => at(lines, 20, 19 + i, `${i + 1}◆ ${clip(artifact.name, 17)}`));
    (Object.keys(FACTIONS) as FactionId[]).forEach((id, i) => { const f = state.factions[id]!; at(lines, 44, 19 + i, `${FACTIONS[id].icon} ${clip(displayFaction(id), 15)} ${f.credibility}/6`); });
    at(lines, 3, 25, `${DIM}${theme}B BUY  S SELL  C COMBINE  O OFFER  P PUBLISH  E BELL  ? HELP  ESC PAUSE${RESET}`);
    at(lines, 3, 26, `${DIM}${theme}1-8 GOOD  A/Z SECOND INGREDIENT  J/K ARTIFACT  F FRAME  G INTENSITY  V BUYER${RESET}`);
    at(lines, 3, 27, `${theme}COMMISSION: ${clip(state.commission.name, 24)} — ${clip(state.commission.text, 48)}${RESET}`);
  }
  function renderPreview(lines: string[], cols: number, theme: string): void {
    renderMarket(lines, cols, theme); box(lines, 10, 8, 60, 12, 'ACTION PREVIEW', theme); const result = state.pending; if (result) result.lines.slice(0, 7).forEach((line, i) => at(lines, 14, 11 + i, clip(line, 52))); at(lines, center(cols, 'ENTER CONFIRM   BACKSPACE CANCEL'), 19, `${DIM}${theme}ENTER CONFIRM   BACKSPACE CANCEL${RESET}`);
  }
  function renderBell(lines: string[], cols: number, theme: string): void {
    box(lines, 7, 5, cols - 14, 18, 'CLOSING BELL', theme); at(lines, 12, 8, state.notice); let y = 10; state.lastBell?.priceLines.slice(0, 6).forEach(line => { at(lines, 12, y++, `${theme}${clip(line, 56)}${RESET}`); }); y = 10; state.lastBell?.factionLines.slice(0, 6).forEach(line => { at(lines, 48, y++, `${DIM}${theme}${clip(line, 26)}${RESET}`); }); state.lastBell?.rumorLines.slice(0, 3).forEach((line, i) => at(lines, 12, 19 + i, `${line.includes('FULFILLED') ? '\x1b[92m✓' : line.includes('EXPOSED') ? '\x1b[91mx' : '≈'} ${clip(line, 60)}${RESET}`)); at(lines, center(cols, 'ENTER: DISMISS REPORT'), 25, `${DIM}${theme}ENTER: DISMISS REPORT${RESET}`);
  }
  function renderDraft(lines: string[], cols: number, theme: string): void { box(lines, 8, 6, cols - 16, 16, 'WORKSHOP DRAFT', theme); at(lines, 13, 9, 'Choose one method. It will shape the rest of this run.'); state.offers.forEach((method, i) => { at(lines, 14, 12 + i * 3, `${i + 1}. ${method.name}`); at(lines, 18, 13 + i * 3, `${DIM}${theme}${clip(method.text, 56)}${RESET}`); }); at(lines, center(cols, '1-3 INSTALL METHOD'), 23, `${DIM}${theme}1-3 INSTALL METHOD${RESET}`); }
  function renderEnding(lines: string[], cols: number, theme: string): void { const player = estate(state); at(lines, center(cols, '◇ THE LAST REFLECTION ◇'), 5, `${theme}\x1b[1m◇ THE LAST REFLECTION ◇${RESET}`); at(lines, center(cols, `YOUR ESTATE ${player}   CRED ${state.credibility}   SUSP ${state.suspicion}`), 8, `YOUR ESTATE ${player}   CRED ${state.credibility}   SUSP ${state.suspicion}`); const standings = [{ label: 'YOU', value: player }, ...(Object.keys(FACTIONS) as FactionId[]).map(id => ({ label: FACTIONS[id].name, value: estate(state, id) }))].sort((a, b) => b.value - a.value); box(lines, 19, 10, 42, 10, 'FINAL ESTATES', theme); standings.forEach((entry, i) => at(lines, 23, 12 + i, `${i + 1}. ${clip(entry.label, 22).padEnd(22)} ${entry.value}`)); at(lines, center(cols, state.journal[0] ?? 'The mirrors keep their own account.'), 22, `${DIM}${theme}${clip(state.journal[0] ?? 'The mirrors keep their own account.', 70)}${RESET}`); at(lines, center(cols, 'R REPLAY SEED   N NEW SEED   Q QUIT'), 25, `${DIM}${theme}R REPLAY SEED   N NEW SEED   Q QUIT${RESET}`); }
  function renderHelp(lines: string[], cols: number, theme: string): void { box(lines, 8, 5, cols - 16, 18, 'HELP // THE SMALL LEDGER', theme); const helpLines = ['Objective: finish Day 9 with the highest estate.', 'B/S: buy or sell one raw lot at the morning quote.', 'C: combine selected and second goods into an artifact.', 'O: sell selected artifact to the selected faction.', 'P: publish the selected frame about the selected good.', 'Rumors affect the closing bell; the new quote is traded tomorrow.', 'Credibility makes claims believable. Suspicion can close your press.', 'E ends the day. Every number in a report is integer and traceable.', 'ENTER confirm   BACKSPACE cancel   ESC pause']; helpLines.forEach((line, i) => at(lines, 13, 8 + i, clip(line, 54))); at(lines, center(cols, 'H/? CLOSE HELP'), 24, `${DIM}${theme}H/? CLOSE HELP${RESET}`); }
  function render(): void { const cols = terminal.cols; const rows = terminal.rows; const lines: string[] = ['\x1b[2J\x1b[H']; const theme = getCurrentThemeColor(); if (cols < MIN_COLS || rows < MIN_ROWS) { at(lines, center(cols, 'TERMINAL TOO SMALL'), Math.max(2, Math.floor(rows / 2)), '\x1b[1;91mTERMINAL TOO SMALL' + RESET); at(lines, center(cols, `Need ${MIN_COLS}x${MIN_ROWS}  Have ${cols}x${rows}`), Math.max(4, Math.floor(rows / 2) + 2), `Need ${MIN_COLS}x${MIN_ROWS}  Have ${cols}x${rows}`); terminal.write(lines.join('')); return; } frame = (frame + 1) % 60; if (title) renderTitle(lines, cols, theme); else if (state.phase === 'briefing') renderBriefing(lines, cols, theme); else if (state.phase === 'market') renderMarket(lines, cols, theme); else if (state.phase === 'preview') renderPreview(lines, cols, theme); else if (state.phase === 'bellReport') renderBell(lines, cols, theme); else if (state.phase === 'draft') renderDraft(lines, cols, theme); else renderEnding(lines, cols, theme); if (help && !title) renderHelp(lines, cols, theme); if (paused) { at(lines, center(cols, 'PAUSED'), 11, '\x1b[1;93mPAUSED' + RESET); lines.push(renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(cols / 2), startY: 13, showShortcuts: false })); } terminal.write(lines.join('')); }
  const baseStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); baseStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
