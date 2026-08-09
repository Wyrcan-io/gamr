import { CHAMBER_ORDER, EXPRESSION_BY_ID, MUTATION_BY_ID, SPECIES_BY_ID } from './content';
import { contractRequirementText, currentUsage, expressionsForPlant, matchingContracts, mutationCandidates, projectCycle } from './engine';
import type { ChamberId, GameState, PlantState } from './types';
import { getCurrentThemePalette } from '../utils';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[92m';
const CYAN = '\x1b[96m';
const RED = '\x1b[91m';
const YELLOW = '\x1b[93m';
const MAGENTA = '\x1b[95m';

const MIN_COLS = 80;
const MIN_ROWS = 28;
const CARD_WIDTH = 23;

function stripAnsi(value: string): string { return value.replace(/\x1b\[[0-9;]*m/g, ''); }
function fit(value: string, width: number): string { return value.length > width ? `${value.slice(0, Math.max(0, width - 1))}…` : value.padEnd(width, ' '); }
function put(out: string[], x: number, y: number, value: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${value}`); }
function center(out: string[], cols: number, y: number, value: string, colour: string): void { put(out, Math.max(1, Math.floor((cols - stripAnsi(value).length) / 2) + 1), y, `${colour}${value}${RESET}`); }
function meter(value: number, max: number, full = '◆', empty = '◇'): string { return full.repeat(Math.max(0, Math.min(max, value))) + empty.repeat(Math.max(0, max - value)); }
function lampGlyph(mode: GameState['chambers']['a1']['lamp']): string { return mode === 'blue' ? '☼' : mode === 'red' ? '◉' : mode === 'uv' ? '✦' : '·'; }
function waterGlyph(mode: GameState['chambers']['a1']['water']): string { return mode === 'soak' ? '≈' : mode === 'mist' ? '~' : '·'; }

function plantArt(plant: PlantState | null, chamberId: ChamberId, ascii = false): string[] {
  if (!plant) return ['       ◇       ', '     EMPTY      ', '   SEED READY   '];
  const definition = SPECIES_BY_ID[plant.speciesId];
  const stem = ascii ? definition.asciiGlyph : definition.glyph;
  const stage = Math.min(4, Math.floor(plant.mass / 3));
  const left = stage >= 1 ? `${stem}─` : ' │ ';
  const right = stage >= 2 ? `─${stem}` : ' │ ';
  const bloom = plant.bloom >= 2 ? '✿' : plant.bloom > 0 ? '*' : ' ';
  const glow = plant.glow >= 2 ? '✦' : plant.glow > 0 ? '+' : ' ';
  const warning = plant.stress >= 4 ? '!' : chamberId === 'a1' && plant.stress === 0 ? ' ' : '·';
  return [
    `     ${glow}${bloom}${glow}     `,
    `    ${left}${stem}${right}    `,
    `     ${warning}│${warning}     `,
  ];
}

function renderChamber(out: string[], state: GameState, chamberId: ChamberId, x: number, y: number, ascii = false): void {
  const chamber = state.chambers[chamberId];
  const selected = state.selectedChamberId === chamberId;
  const plant = chamber.plant;
  const definition = plant ? SPECIES_BY_ID[plant.speciesId] : undefined;
  const border = selected ? `${CYAN}${BOLD}` : `${DIM}${state.helpOpen ? '' : ''}`;
  const art = plantArt(plant, chamberId, ascii);
  const name = plant ? `${definition!.shortName} ${plant.name}` : 'EMPTY CHAMBER';
  const stats = plant ? `M${plant.mass} B${plant.bloom} G${plant.glow} S${plant.stress}` : 'NO SPECIMEN';
  const rootLimit = plant && expressionsForPlant(plant).includes('living-trellis') ? 10 : 8;
  const lines = [
    `┌${'─'.repeat(CARD_WIDTH - 2)}┐`,
    `│${fit(`${chamberId.toUpperCase()} ${name}`, CARD_WIDTH - 2)}│`,
    `│${fit(art[0]!, CARD_WIDTH - 2)}│`,
    `│${fit(art[1]!, CARD_WIDTH - 2)}│`,
    `│${fit(art[2]!, CARD_WIDTH - 2)}│`,
    `│${fit(stats, CARD_WIDTH - 2)}│`,
    `│${fit(`${lampGlyph(chamber.lamp)} ${chamber.lamp.toUpperCase()} ${waterGlyph(chamber.water)} ${chamber.water.toUpperCase()}`, CARD_WIDTH - 2)}│`,
    `│${fit(`⌁ ${chamber.rootPressure}/${rootLimit}  ${plant ? (plant.mutationIds.length ? '⚗' + plant.mutationIds.length : '·') : '·'}`, CARD_WIDTH - 2)}│`,
    `└${'─'.repeat(CARD_WIDTH - 2)}┘`,
  ];
  lines.forEach((line, index) => put(out, x, y + index, `${border}${line}${RESET}`));
}

function renderContracts(out: string[], state: GameState): void {
  put(out, 51, 4, `${MAGENTA}${BOLD}┌─ CONTRACTS ─────────────┐${RESET}`);
  state.activeContracts.forEach((contract, index) => {
    const y = 5 + index * 3;
    if (!contract) {
      put(out, 51, y, `${DIM}│ ${fit('QUEUE EMPTY', 25)}│${RESET}`);
      put(out, 51, y + 1, `${DIM}│${' '.repeat(25)}│${RESET}`);
      return;
    }
    put(out, 51, y, `${contractMatchesAny(state, contract.id) ? GREEN : YELLOW}│ ${fit(`${contractMatchesAny(state, contract.id) ? '✓' : '○'} ${contract.name}`, 25)}│${RESET}`);
    const requirements = contract.requirements.map(contractRequirementText).join(' ');
    put(out, 51, y + 1, `${DIM}│ ${fit(`${requirements} +${contract.baseFunding}`, 25)}│${RESET}`);
  });
  put(out, 51, 14, `${MAGENTA}${BOLD}├─ SELECTED ──────────────┤${RESET}`);
  const chamber = state.chambers[state.selectedChamberId];
  const plant = chamber.plant;
  if (!plant) {
    put(out, 51, 15, `${DIM}│ EMPTY — SPACE TO SEED   │${RESET}`);
    put(out, 51, 16, `${DIM}│ ${fit('Choose a vial from rack.', 25)}│${RESET}`);
    put(out, 51, 17, `${DIM}│${' '.repeat(25)}│${RESET}`);
    put(out, 51, 18, `${DIM}│${' '.repeat(25)}│${RESET}`);
    put(out, 51, 19, `${DIM}│${' '.repeat(25)}│${RESET}`);
    put(out, 51, 20, `${DIM}└${'─'.repeat(25)}┘${RESET}`);
    return;
  }
  put(out, 51, 15, `${CYAN}│ ${fit(`${plant.name} ${SPECIES_BY_ID[plant.speciesId].shortName}`, 25)}│${RESET}`);
  const mutationText = plant.mutationIds.length ? plant.mutationIds.map(id => MUTATION_BY_ID[id].shortName).join(',') : 'NONE';
  put(out, 51, 16, `${DIM}│ ${fit(`MUT ${mutationText}`, 25)}│${RESET}`);
  const expr = expressionsForPlant(plant).map(id => EXPRESSION_BY_ID[id].name).join(',') || 'NONE';
  put(out, 51, 17, `${DIM}│ ${fit(`EXP ${expr}`, 25)}│${RESET}`);
  put(out, 51, 18, `${DIM}│ ${fit(`OFFERS ${mutationCandidates(state).map(id => MUTATION_BY_ID[id].shortName).join('/') || '—'}`, 25)}│${RESET}`);
  put(out, 51, 19, `${DIM}│ ${fit(`MATCH ${matchingContracts(state, state.selectedChamberId).map(item => item.name).join(', ') || 'NONE'}`, 25)}│${RESET}`);
  put(out, 51, 20, `${DIM}└${'─'.repeat(25)}┘${RESET}`);
}

function contractMatchesAny(state: GameState, contractId: string): boolean {
  return CHAMBER_ORDER.some(chamberId => state.chambers[chamberId].plant && state.activeContracts.some(contract => contract?.id === contractId && contractMatchesSafe(contract, state.chambers[chamberId].plant!, state.chambers[chamberId].rootPressure)));
}

function contractMatchesSafe(contract: GameState['activeContracts'][number] & object, plant: PlantState, rootPressure: number): boolean {
  return contract.requirements.every(requirement => {
    if (requirement.kind === 'statMin') return plant[requirement.stat] >= requirement.value;
    if (requirement.kind === 'statMax') return (requirement.stat === 'rootPressure' ? rootPressure : plant.stress) <= requirement.value;
    if (requirement.kind === 'species') return plant.speciesId === requirement.speciesId;
    if (requirement.kind === 'mutation') return plant.mutationIds.includes(requirement.mutationId);
    if (requirement.kind === 'expression') return expressionsForPlant(plant).includes(requirement.expressionId);
    if (requirement.kind === 'sterile') return plant.mutationIds.includes('sterile-crown') || expressionsForPlant(plant).includes('sealed-bouquet');
    return plant.mutationIds.length === requirement.value;
  });
}

function renderForecast(out: string[], state: GameState): void {
  put(out, 51, 22, `${YELLOW}${BOLD}├─ FORECAST ──────────────┤${RESET}`);
  const projection = projectCycle(state);
  const lines = projection.accepted
    ? projection.events.filter(event => ['growth', 'breach', 'filter', 'delivery', 'complete'].includes(event.kind)).slice(-4).map(event => event.text)
    : [`BLOCKED — ${projection.reason ?? 'CHECK CONFIGURATION'}`];
  lines.slice(0, 4).forEach((line, index) => put(out, 51, 23 + index, `${projection.accepted && !line.includes('BREACH') ? DIM : RED}│ ${fit(line, 25)}│${RESET}`));
  for (let index = lines.length; index < 4; index += 1) put(out, 51, 23 + index, `${DIM}│${' '.repeat(25)}│${RESET}`);
  put(out, 51, 27, `${DIM}└${'─'.repeat(25)}┘${RESET}`);
}

function renderHelp(out: string[], cols: number, rows: number, theme: string): void {
  put(out, Math.max(3, Math.floor((cols - 64) / 2)), 5, `${MAGENTA}${BOLD}┌─ BOTANY LAB HELP ─────────────────────────────────────────┐${RESET}`);
  const lines = [
    'Select a chamber with arrows. L cycles lamp; W cycles water.',
    'SPACE opens one-operation menu. ENTER commits the forecast cycle.',
    'Blue grows Mass, Red grows Bloom, UV grows Glow, Off can feed night plants.',
    'Shared Light 5/5 and Water 5/5 budgets are shown in the header.',
    'Root pressure is local. Filter load is shared. Both warn before a breach.',
    'Deliver a matching plant for Funding. Prune, Service, or Cull to contain.',
    'Mutations are deterministic offers; pairs can express named combinations.',
    'ESC opens the shared pause menu. H closes this help card.',
  ];
  lines.forEach((line, index) => put(out, Math.max(3, Math.floor((cols - 64) / 2)), 7 + index, `${theme}│ ${fit(line, 60)} │${RESET}`));
  put(out, Math.max(3, Math.floor((cols - 64) / 2)), 16, `${MAGENTA}└────────────────────────────────────────────────────────────┘${RESET}`);
  center(out, cols, Math.min(rows - 3, 20), 'H / ESC  CLOSE HELP', `${DIM}${theme}`);
}

function renderReport(out: string[], state: GameState, cols: number): void {
  const title = state.phase === 'won' ? '✓ SHIFT COMPLETE' : state.phase === 'gameOver' ? '× FACILITY SHUTDOWN' : 'GRANT DEFERRED';
  center(out, cols, 6, title, state.phase === 'won' ? `${GREEN}${BOLD}` : `${RED}${BOLD}`);
  center(out, cols, 8, `FUNDING ${state.facility.funding}/${state.facility.fundingTarget}   SEALS ${meter(state.facility.biosecuritySeals, 3)}   SCORE ${state.score}`, `${CYAN}${BOLD}`);
  put(out, 12, 11, `${CYAN}COMPLETED CONTRACTS${RESET}`);
  state.completedContracts.slice(0, 6).forEach((contract, index) => put(out, 14, 13 + index, `${GREEN}✓${RESET} ${contract.name}  +${contract.funding}${contract.early ? ' EARLY' : ''}`));
  put(out, 48, 11, `${YELLOW}INCIDENTS / DISCOVERIES${RESET}`);
  state.incidents.slice(0, 4).forEach((incident, index) => put(out, 48, 13 + index, `${RED}×${RESET} ${fit(incident.text, 30)}`));
  state.discoveries.slice(0, 4).forEach((expression, index) => put(out, 48, 18 + index, `${MAGENTA}✦${RESET} ${EXPRESSION_BY_ID[expression].name}`));
  center(out, cols, 25, 'R REPLAY   N NEXT GAME   Q QUIT', `${DIM}${CYAN}`);
}

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, glitchFrame = 0, ascii = false): string {
  void glitchFrame;
  const palette = getCurrentThemePalette();
  theme = palette.ink;
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) {
    center(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'TERMINAL TOO SMALL', `${RED}${BOLD}`);
    center(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, `${DIM}${theme}`);
    return out.join('');
  }
  const offset = 0;
  const title = '◈ BOTANY // LAB ◈';
  put(out, Math.max(1, Math.floor((cols - title.length) / 2) + 1 + offset), 1, `${theme}${BOLD}${title}${RESET}`);

  if (state.phase === 'start') {
    center(out, cols, 8, 'GROW STRANGE. SHIP CLEAN. HOLD THE GLASS.', `${CYAN}${BOLD}`);
    center(out, cols, 11, 'P STANDARD SHIFT    T TRAINING PROTOCOL    Q QUIT', `${DIM}${theme}`);
    center(out, cols, 14, 'Light and water are shared. Every cycle is forecast before it grows.', `${DIM}${theme}`);
    center(out, cols, 17, 'Press P or ENTER to begin a standard shift.', `${YELLOW}`);
    return out.join('');
  }
  if (state.phase === 'briefing') {
    center(out, cols, 6, state.mode === 'training' ? 'TRAINING PROTOCOL' : 'STANDARD SHIFT', `${YELLOW}${BOLD}`);
    put(out, 10, 9, `${theme}${BOLD}LAB RULES${RESET}`);
    ['Configure lamps and water without cost.', 'Queue one operation, then read the exact forecast.', 'Enter commits one cycle. Root or filter breach costs a seal.', 'Deliver specimens to earn Funding before Cycle 12.'].forEach((line, index) => put(out, 12, 11 + index, `${YELLOW}${index + 1}.${RESET} ${line}`));
    center(out, cols, 20, 'ENTER  OPEN THE LAB', `${CYAN}${BOLD}`);
    return out.join('');
  }
  if (state.phase === 'won' || state.phase === 'report' || state.phase === 'gameOver') {
    renderReport(out, state, cols);
    return out.join('');
  }

  const usage = currentUsage(state);
  put(out, 3, 2, `${theme}CYCLE ${String(Math.min(state.cycle, state.maxCycles)).padStart(2, '0')}/${String(state.maxCycles).padStart(2, '0')}  FUND ${state.facility.funding}/${state.facility.fundingTarget}  SEALS ${meter(state.facility.biosecuritySeals, 3)}  ⚗ ${state.facility.mutationReagent}${RESET}`);
  put(out, 3, 3, `${DIM}${theme}LIGHT ${usage.light}/${state.facility.lightBudget}  WATER ${usage.water}/${state.facility.waterBudget}  ◉ FILTER ${state.facility.filterLoad}/${state.facility.filterCapacity}${RESET}`);
  renderChamber(out, state, 'a1', 3, 4, ascii);
  renderChamber(out, state, 'a2', 27, 4, ascii);
  renderChamber(out, state, 'b1', 3, 14, ascii);
  renderChamber(out, state, 'b2', 27, 14, ascii);
  renderContracts(out, state);
  renderForecast(out, state);
  const last = state.lastEvents[0]?.text ?? 'CONFIGURE THE LAB.';
  put(out, 3, 24, `${DIM}${theme}EVENT  ${fit(last, 45)}${RESET}`);
  const pending = state.pendingOperation ? `PENDING ${state.pendingOperation.type.toUpperCase()}` : 'PENDING — NONE';
  put(out, 3, 25, `${state.pendingOperation ? YELLOW : DIM}${pending}${RESET}`);
  put(out, 3, 26, `${DIM}${theme}SPACE ACTION  ${state.facility.funding >= state.facility.fundingTarget ? 'C CLOSE SHIFT  ' : ''}H HELP${RESET}`);
  put(out, 3, 28, `${DIM}${theme}↑↓←→ SELECT  L LAMP  W WATER  ENTER COMMIT  ESC PAUSE${RESET}`);
  if (state.helpOpen) renderHelp(out, cols, rows, theme);
  return out.join('');
}

export { stripAnsi };
