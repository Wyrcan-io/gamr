import { cellName, displayName, iconFor, labelFor, legalTarget, type GameState, type Offer, type ScoreEvent } from './engine';
import { centerText, clipToWidth, displayWidth, padToWidth } from '../../ui/terminal';
import { getCurrentThemePalette, type TerminalThemePalette } from '../utils';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;

export interface FiveMinuteRenderOptions {
  ledgerOpen?: boolean;
  helpOpen?: boolean;
}

function line(value: string, width: number, style = ''): string {
  return `${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`;
}

function center(value: string, width: number): string {
  return centerText(value, width);
}

function title(value: string, width: number, palette: TerminalThemePalette): string {
  return line(value, width, `${palette.focus}${BOLD}`);
}

function resizeFrame(cols: number, rows: number, palette: TerminalThemePalette): string {
  const content = [
    `${palette.focus}${BOLD}${center('g/ FIVE-MINUTE KINGDOM', cols)}${RESET}`,
    '',
    center('The survey needs a larger page.', cols),
    center(`Need 80x24  Have ${cols}x${rows}`, cols),
    center('Resize the terminal before drafting the next square.', cols),
  ];
  return `${ESC}2J${ESC}H${content.join('\r\n')}`;
}

function offerDescription(offer: Offer): string {
  if (offer.kind === 'terrain') return 'Builds a district and scores from matching neighbours.';
  if (offer.kind === 'citizen') return 'Homes need compatible terrain and score from their surroundings.';
  return 'A persistent law scores now and during season checks.';
}

function mapIcon(state: GameState, x: number, y: number): string {
  const icon = iconFor(state.board[y]![x]!);
  return icon.trim() ? icon : '.';
}

function mapFrame(state: GameState, palette: TerminalThemePalette): string[] {
  const lines: string[] = [];
  lines.push(`${palette.line}      A   B   C   D   E${RESET}`);
  for (let y = 0; y < 5; y += 1) {
    const cells = Array.from({ length: 5 }, (_, x) => {
      const selected = (state.phase === 'chooseTarget' || state.phase === 'preview') && state.target.x === x && state.target.y === y;
      const icon = mapIcon(state, x, y);
      return selected ? `${palette.focus}${BOLD}[${icon}]${RESET}` : ` ${icon} `;
    }).join(' ');
    lines.push(`${palette.line}${y + 1} ${RESET}${cells}`);
  }
  lines.push('');
  lines.push(`${palette.muted}K castle  . empty  F forest  ^ hill  ~ water${RESET}`);
  lines.push(`${palette.muted}V village  R ruin  G garden  o citizen${RESET}`);
  return lines;
}

function eventLines(events: ScoreEvent[], width: number, palette: TerminalThemePalette): string[] {
  if (!events.length) return [line('No score event yet.', width, palette.muted)];
  return events.slice(0, 5).map((event) => line(`[+] +${event.amount}  ${event.label}`, width, palette.good));
}

function previewLines(state: GameState, width: number, palette: TerminalThemePalette): string[] {
  const offer = state.selectedOffer;
  if (!offer) return [line('Choose a deed from the market.', width, palette.muted)];
  const target = `${String.fromCharCode(65 + state.target.x)}${state.target.y + 1}`;
  const legal = legalTarget(state, offer, state.target);
  const lines = [
    line(`OFFER  ${labelFor(offer)}`, width, palette.ink),
    line(`PLOT   ${target}  ${cellName(state.board[state.target.y]![state.target.x]!)}`, width, palette.ink),
    line(legal.legal ? '[+] LEGAL TARGET' : `[x] ${legal.reason ?? 'Choose another plot.'}`, width, legal.legal ? palette.good : palette.danger),
  ];
  if (state.phase === 'preview' && state.preview) {
    lines.push(line('NOW', width, `${palette.focus}${BOLD}`));
    lines.push(...state.preview.preview.map((text) => line(text, width, palette.good)));
    lines.push(line('NEXT SEASON  Read the season report after this placement.', width, palette.muted));
    lines.push(line('END           Final diversity and unused Favour are counted later.', width, palette.muted));
    lines.push(line('ENTER  confirm this projection', width, palette.focus));
  } else {
    lines.push(line('PROJECTION  Move to a plot, then press Enter to inspect.', width, palette.muted));
    lines.push(line('NOW / NEXT / END  appear before commitment.', width, palette.muted));
  }
  return lines;
}

function header(state: GameState, cols: number, palette: TerminalThemePalette): string[] {
  return [
    title('g/ FIVE-MINUTE KINGDOM', cols, palette),
    line('A cadastral drafting desk for small kingdoms.', cols, palette.muted),
    line(`TURN ${Math.min(state.turn, 9)}/9  |  GLORY ${state.glory}  |  FAVOUR ${state.favour}  |  LAWS ${state.laws.length}/3  |  SEED ${state.seed}`, cols, palette.ink),
    line('-'.repeat(cols), cols, palette.line),
  ];
}

function briefingFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const lines = [
    ...header(state, cols, palette),
    title('FOUNDING CHARTER', cols, palette),
    '',
    line('A five-minute kingdom is built one deliberate square at a time.', cols, palette.ink),
    line('1. Choose one deed from the market.', cols, palette.ink),
    line('2. Survey an open square or a compatible home.', cols, palette.ink),
    line('3. Read the projection before you commit.', cols, palette.ink),
    line('4. Follow the score trail through the season ledger.', cols, palette.ink),
    '',
    line('The Castle is at C3. Adjacency is north, east, south, and west.', cols, palette.muted),
    line('The first turn teaches the loop; later turns add citizens and laws.', cols, palette.muted),
    '',
    line('[Enter] open the deed market   [?] help   [Esc] pause   [Q] quit', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function marketFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const lines = [
    ...header(state, cols, palette),
    title('DEED MARKET', cols, palette),
    line('Choose one offer. The survey appears after selection.', cols, palette.muted),
    '',
  ];
  state.market.forEach((offer, index) => {
    lines.push(line(`${index + 1}  [${offer.kind.toUpperCase()}]  ${labelFor(offer)}`, cols, palette.focus));
    lines.push(line(`   ${offerDescription(offer)}`, cols, palette.ink));
    lines.push('');
  });
  lines.push(line('[1-3] choose deed   [?] help   [Esc] pause   [Q] quit', cols, palette.focus));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function ledgerFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const lines = [
    ...header(state, cols, palette),
    title('SCORE LEDGER', cols, palette),
    line('Every row names the decision that produced its Glory.', cols, palette.muted),
    '',
    ...state.ledger.slice(-14).map((event) => line(`[+] +${event.amount}  ${event.label}`, cols, palette.good)),
    '',
    line('[L] close ledger   [?] help   [Esc] pause', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function helpFrame(cols: number, palette: TerminalThemePalette): string {
  const lines = [
    title('g/ FIVE-MINUTE KINGDOM / HELP', cols, palette),
    '',
    line('Draft -> survey -> preview -> commit -> read the ledger.', cols, palette.ink),
    line('Arrows or W/A/S/D move the survey cursor.', cols, palette.ink),
    line('Enter opens the next step; a second Enter commits a legal preview.', cols, palette.ink),
    line('L opens the score ledger after the briefing.', cols, palette.ink),
    line('Escape opens pause; Q quits from any screen that offers it.', cols, palette.ink),
    '',
    line('The map uses one mark per terrain and a coordinate for every plot.', cols, palette.muted),
    line('Colour reinforces legality; [+], [x], and the written reason carry meaning.', cols, palette.muted),
    '',
    line('[?] or [Esc] close help', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function endingFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const final = state.phase === 'ending';
  const lines = [
    ...header(state, cols, palette),
    title(final ? 'KINGDOM CHRONICLE SEALED' : 'THE LAST PLACEMENT', cols, palette),
    line(`FINAL GLORY  ${state.glory}`, cols, `${palette.good}${BOLD}`),
    line(`LAWS  ${state.laws.map(displayName).join(' / ') || 'none'}`, cols, palette.ink),
    '',
    line('FINAL SOURCES', cols, `${palette.focus}${BOLD}`),
    ...eventLines(state.seasonEvents, cols, palette),
    '',
    line(final ? '[R] replay same seed   [Q] quit' : '[Enter] seal chronicle   [Esc] pause   [Q] quit', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

export function renderFrame(
  state: GameState,
  cols: number,
  rows: number,
  palette: TerminalThemePalette = getCurrentThemePalette(),
  options: FiveMinuteRenderOptions = {},
): string {
  if (cols < 80 || rows < 24) return resizeFrame(cols, rows, palette);
  if (options.helpOpen) return helpFrame(cols, palette);
  if (options.ledgerOpen && state.phase !== 'briefing') return ledgerFrame(state, cols, palette);
  if (state.phase === 'briefing') return briefingFrame(state, cols, palette);
  if (state.phase === 'chooseOffer') return marketFrame(state, cols, palette);
  if (state.phase === 'finalChronicle' || state.phase === 'ending') return endingFrame(state, cols, palette);

  const leftWidth = 35;
  const rightWidth = cols - leftWidth - 3;
  const lines = header(state, cols, palette);
  lines.push(`${palette.focus}${BOLD}${line('CADASTRAL MAP', leftWidth)}${RESET}   ${palette.focus}${BOLD}${line(state.phase === 'season' ? 'SEASON MARGIN' : state.phase === 'result' ? 'PLACEMENT RECORD' : 'SURVEY / PREVIEW', rightWidth)}${RESET}`);
  const map = mapFrame(state, palette);
  const right = state.phase === 'chooseTarget' || state.phase === 'preview'
    ? previewLines(state, rightWidth, palette)
    : state.phase === 'result'
      ? [line('PLACEMENT RECORDED', rightWidth, `${palette.good}${BOLD}`), ...eventLines(state.lastEvents, rightWidth, palette), line('ENTER  continue to the next turn', rightWidth, palette.focus)]
      : [line('SEASON RESOLVED', rightWidth, `${palette.good}${BOLD}`), ...eventLines(state.seasonEvents, rightWidth, palette), line('ENTER  open the next deed market', rightWidth, palette.focus)];
  const contentRows = Math.max(map.length, right.length);
  for (let i = 0; i < contentRows; i += 1) {
    const mapLine = map[i] ?? '';
    const rightLine = right[i] ?? '';
    lines.push(`${padToWidth(mapLine, leftWidth)}   ${padToWidth(rightLine, rightWidth)}`);
  }
  lines.push('');
  lines.push(line(`NOTICE  ${state.notice}`, cols, palette.warning));
  lines.push(line('L ledger  |  ? help  |  Esc pause  |  Q quit', cols, palette.muted));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

export function renderWidth(value: string): number {
  return displayWidth(value);
}
