import { ITEMS, PARCELS, SEAL_LABELS } from './content';
import { getUpgradeChoices, offerLabel, parcelMeterLabel, previewText, tileGlyph, visibleThreatAt } from './engine';
import type { Direction, GameState, Point, TileState } from './types';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[91m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const CYAN = '\x1b[96m';
const MAGENTA = '\x1b[95m';
const MIN_COLS = 80;
const MIN_ROWS = 28;

function plain(value: string, max = 46): string {
  return value.replace(/\x1b\[[0-9;]*m/g, '').slice(0, max).padEnd(max, ' ');
}

function centered(cols: number, value: string): string {
  const text = value.replace(/\x1b\[[0-9;]*m/g, '');
  return ' '.repeat(Math.max(0, Math.floor((cols - text.length) / 2))) + value;
}

function bar(value: number, max: number, width = 5): string {
  const filled = Math.round((Math.max(0, value) / Math.max(1, max)) * width);
  return '◆'.repeat(filled) + '◇'.repeat(Math.max(0, width - filled));
}

function tileColor(tile: TileState): string {
  if (tile.kind === 'wall') return DIM;
  if (tile.kind === 'rough' || tile.kind === 'weak') return YELLOW;
  if (tile.kind === 'wet') return CYAN;
  if (tile.kind === 'recipient' || tile.kind === 'anchor') return GREEN;
  if (tile.kind === 'niche') return MAGENTA;
  if (tile.kind === 'dynamic') return YELLOW;
  return '';
}

function pointGlyph(state: GameState, point: Point): string {
  if (!state.floor) return ' ';
  if (state.courier.pos.x === point.x && state.courier.pos.y === point.y) return '@';
  if (visibleThreatAt(state, point)) return 'P';
  return tileGlyph(state.floor.tiles[point.y][point.x], state.floor, point);
}

function renderMap(state: GameState): string[] {
  const floor = state.floor!;
  const rows: string[] = [];
  for (let y = 0; y < floor.height; y++) {
    let row = '';
    for (let x = 0; x < floor.width; x++) {
      const point = { x, y };
      const tile = floor.tiles[y][x];
      const glyph = pointGlyph(state, point);
      const selected = state.phase === 'traversal' && state.courier.pos.x === x && state.courier.pos.y === y;
      const color = glyph === '@' ? `${BOLD}${CYAN}` : glyph === 'P' ? RED : tileColor(tile);
      row += selected ? `\x1b[7m${color}${glyph}${RESET}` : `${color}${glyph}${RESET}`;
    }
    rows.push(row);
  }
  return rows;
}

function header(state: GameState, theme: string): string {
  const floor = state.floor;
  const contract = state.contract;
  if (!floor || !contract) return `${theme}${BOLD}DUNGEON COURIER${RESET}`;
  const parcel = contract.parcel;
  const meter = parcelMeterLabel(state);
  return `${theme}${BOLD}DUNGEON COURIER${RESET}   DELIVERY ${state.deliveryIndex + 1}/3   TICK ${String(floor.tick).padStart(2, '0')}/${String(contract.deadline).padStart(2, '0')}   SHIFT IN ${floor.shiftIn} ${floor.gateOpen ? '→ OPEN' : '→ CLOSED'}   ${parcel.id === 'folded-familiar' ? 'HEAVY' : 'FRAGILE'}${meter ? `   ${meter}` : ''}`;
}

function renderStart(state: GameState, cols: number, theme: string): string[] {
  void state;
  return [
    centered(cols, `${theme}${BOLD}◆ DUNGEON COURIER ◆${RESET}`),
    '',
    centered(cols, 'THE LABEL CHANGES THE WAY YOU WALK.'),
    '',
    centered(cols, 'Carry impossible parcels through a dungeon that will not hold still.'),
    centered(cols, 'Read the route. Brace at the right moment. Leave something behind if you must.'),
    '',
    centered(cols, `${YELLOW}${BOLD}P${RESET}: STANDARD RUN     ${YELLOW}${BOLD}T${RESET}: TUTORIAL     ${YELLOW}${BOLD}Q${RESET}: QUIT`),
    '',
    centered(cols, `${DIM}Every move shows its stress, noise, and timing before it happens.${RESET}`),
  ];
}

function renderContract(state: GameState, cols: number): string[] {
  const lines = [centered(cols, `${YELLOW}${BOLD}CHOOSE A CONTRACT${RESET}`), '', centered(cols, 'Three labels. Three different ways to cross the same dark.')] as string[];
  state.contractOffers.forEach((offer, index) => {
    const selected = index === state.selectedOffer;
    const prefix = selected ? `${GREEN}▶${RESET}` : ' ';
    lines.push(`${prefix} ${YELLOW}${index + 1}${RESET} ${plain(offerLabel(offer), 44)} PAY ${String(offer.pay).padStart(3)}  DEADLINE ${offer.deadline}`);
    lines.push(`    ${PARCELS[offer.parcelId].rule}  /  ${offer.knownFeature}`);
  });
  lines.push('', centered(cols, 'Press 1–3 to accept. Enter accepts the highlighted offer.')); return lines;
}

function renderBriefing(state: GameState, cols: number): string[] {
  const contract = state.contract!;
  const parcel = contract.parcel;
  const definition = PARCELS[parcel.id];
  return [
    centered(cols, `${YELLOW}${BOLD}DELIVERY BRIEFING${RESET}`), '',
    centered(cols, `${CYAN}${BOLD}${definition.label}${RESET}`),
    centered(cols, `${BOLD}${definition.rule}${RESET}`),
    '', centered(cols, definition.detail),
    centered(cols, `CONDITION ${bar(parcel.condition, parcel.maxCondition)}   TOLERANCE ${parcel.tolerance}   SIZE ${parcel.size.toUpperCase()}`),
    centered(cols, `SEAL: ${SEAL_LABELS[parcel.seal]}   PAY ${contract.pay}   DEADLINE ${contract.deadline} TICKS`),
    '', centered(cols, 'The map is visible. The shift forecast is honest. Your route is yours.'),
    '', centered(cols, `${CYAN}${BOLD}ENTER: OPEN THE DUNGEON${RESET}`),
  ];
}

function panelLines(state: GameState): string[] {
  const contract = state.contract!;
  const parcel = contract.parcel;
  const items = state.courier.inventory.map((item, index) => `${index + 1}${item ? ` ${ITEMS[item.id].short}` : ' ---'}`);
  const preview = state.phase === 'traversal' ? previewText(state, 'E') : undefined;
  return [
    `${CYAN}${BOLD}PARCEL${RESET}`,
    `${PARCELS[parcel.id].label.slice(0, 22)}`,
    `COND ${bar(parcel.condition, parcel.maxCondition)}  STR ${parcel.stress}/${parcel.tolerance}`,
    `GUARD ${parcel.guard}  ${parcelMeterLabel(state)}`,
    `${YELLOW}${PARCELS[parcel.id].rule.slice(0, 25)}${RESET}`,
    `${DIM}${SEAL_LABELS[parcel.seal].slice(0, 25)}${RESET}`,
    `${CYAN}${BOLD}SATCHEL${RESET}`,
    ...items,
    `${CYAN}${BOLD}PREVIEW EAST${RESET}`,
    preview ? `${preview.legal ? GREEN : RED}${preview.label} ${preview.legal ? preview.reason : preview.reason}${RESET}` : `${DIM}Open traversal to preview.${RESET}`,
    `${CYAN}${BOLD}ROUTE / SHIFT${RESET}`,
    state.surveyMode === 'routes' ? `${GREEN}STABLE 31  FAST 22+R${RESET}` : state.surveyMode === 'shift' ? `GATE ${state.floor!.gateOpen ? 'OPEN' : 'CLOSED'}  IN ${state.floor!.shiftIn}` : state.surveyMode === 'threats' ? 'P: LOOP ARROWS ACTIVE' : 'TAB: SURVEY OVERLAYS',
  ];
}

function renderTraversal(state: GameState, cols: number): string[] {
  void cols;
  const map = renderMap(state);
  const panel = panelLines(state);
  const rows: string[] = [header(state, CYAN), ''];
  for (let i = 0; i < map.length; i++) rows.push(`${map[i]}  │ ${plain(panel[i] ?? '', 29)}`);
  rows.push(`${DIM}──────────────────────────────────────────────  └─────────────────────────────${RESET}`);
  rows.push(`LOG: ${state.eventLog[0] ?? 'No events yet.'}`);
  rows.push(`${DIM}[Arrows/WASD] Step  [Shift+Arrow] Hurry  [B] Brace  [.] Wait  [E/Enter] Interact${RESET}`);
  rows.push(`${DIM}[1–4] Tool  [I] Satchel  [Tab] Survey  [H] Help  [Esc] Pause${RESET}`);
  return rows;
}

function renderInventory(state: GameState, cols: number): string[] {
  const rows = [centered(cols, `${CYAN}${BOLD}SATCHEL — WHAT WILL YOU LEAVE BEHIND?${RESET}`), '', centered(cols, 'Inventory is free to inspect. Dropped items stay on the floor.'), ''];
  state.courier.inventory.forEach((item, index) => {
    const selected = state.courier.selectedSlot === index;
    rows.push(centered(cols, `${selected ? `${GREEN}▶${RESET}` : ' '} ${index + 1}. ${item ? ITEMS[item.id].label : 'EMPTY'}${item ? ` ×${item.quantity}` : ''}`));
  });
  rows.push('', centered(cols, '[↑↓] Select  [X] Drop  [I/Esc] Return to route')); return rows;
}

function renderReport(state: GameState, cols: number): string[] {
  const report = state.lastReport!;
  const title = report.condition > 0 ? `${GREEN}${BOLD}SIGNED AND RECEIVED${RESET}` : `${RED}${BOLD}CLAIM FILED${RESET}`;
  return [centered(cols, title), '', centered(cols, PARCELS[report.parcelId].label), centered(cols, `CONDITION ${bar(report.condition, report.maxCondition)}   TICKS ${report.ticks}`), centered(cols, `PAY ${report.pay}   VIOLATIONS ${report.violations.length}`), '', ...report.violations.slice(0, 4).map(text => centered(cols, `${YELLOW}! ${text}${RESET}`)), '', centered(cols, `${CYAN}${BOLD}ENTER: CONTINUE${RESET}`)];
}

function renderUpgrade(state: GameState, cols: number): string[] {
  const rows = [centered(cols, `${YELLOW}${BOLD}CHOOSE ONE COURIER UPGRADE${RESET}`), '', centered(cols, 'A tool for the next label, not a replacement for reading it.'), ''];
  getUpgradeChoices(state).forEach((upgrade, index) => rows.push(centered(cols, `${YELLOW}${index + 1}${RESET} ${BOLD}${upgrade.label}${RESET} — ${upgrade.detail}`)));
  rows.push('', centered(cols, 'Press 1–3 to install.')); return rows;
}

function renderEnding(state: GameState, cols: number): string[] {
  const won = state.outcome === 'won';
  return [centered(cols, won ? `${GREEN}${BOLD}◆ RUN COMPLETE ◆${RESET}` : `${RED}${BOLD}× DELIVERY FAILED ×${RESET}`), '', centered(cols, won ? 'Every label reached the right hands.' : state.notice), centered(cols, `PAY ${state.pay}   SCORE ${state.score}   DELIVERIES ${state.reports.length}/3`), '', ...state.reports.map(report => centered(cols, `${PARCELS[report.parcelId].label}  ${bar(report.condition, report.maxCondition)}  ${report.pay}`)), '', centered(cols, `${YELLOW}R${RESET}: RESTART     ${YELLOW}Q${RESET}: QUIT`), centered(cols, `${DIM}The same seed can be run again from the contract screen.${RESET}`)];
}

function renderHelp(state: GameState, cols: number): string[] {
  void state;
  return [centered(cols, `${CYAN}${BOLD}HELP — THE PARCEL IS THE RULES${RESET}`), '', centered(cols, 'Step previews stress. Hurry is faster but louder and rougher.'), centered(cols, 'Brace clears stress and stores guard for the next jolt.'), centered(cols, 'Wait advances the dungeon. SHIFT IN is the exact next gate change.'), centered(cols, 'C caches an item. O anchors clear certain parcel memories.'), centered(cols, 'V niches accept valuables to open a shortcut.'), centered(cols, 'D is the recipient. Deliver with at least one condition pip.'), '', centered(cols, '[H] Close help')];
}

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, glitchFrame: number): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) return `${centered(cols, `${RED}${BOLD}TERMINAL TOO SMALL${RESET}`)}\n${centered(cols, `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`)}`;
  void glitchFrame;
  void theme;
  let lines: string[];
  if (state.phase === 'start') lines = renderStart(state, cols, theme);
  else if (state.phase === 'contract') lines = renderContract(state, cols);
  else if (state.phase === 'briefing') lines = renderBriefing(state, cols);
  else if (state.phase === 'traversal') lines = renderTraversal(state, cols);
  else if (state.phase === 'inventory') lines = renderInventory(state, cols);
  else if (state.phase === 'report') lines = renderReport(state, cols);
  else if (state.phase === 'upgrade') lines = renderUpgrade(state, cols);
  else lines = renderEnding(state, cols);
  if (state.helpOpen) lines = renderHelp(state, cols);
  out.push(lines.map(line => line.replace(/\s+$/, '')).join('\n'));
  out.push(`\x1b[${Math.min(rows, lines.length + 1)};1H`);
  return out.join('');
}

export function directionForKey(key: string): Direction | undefined {
  if (key === 'arrowup' || key === 'w') return 'N';
  if (key === 'arrowright' || key === 'd') return 'E';
  if (key === 'arrowdown' || key === 's') return 'S';
  if (key === 'arrowleft' || key === 'a') return 'W';
  return undefined;
}
