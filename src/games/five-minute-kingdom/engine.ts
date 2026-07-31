export type Terrain = 'castle' | 'field' | 'forest' | 'hill' | 'river' | 'lake' | 'road' | 'village' | 'ruin' | 'garden';
export type Citizen = 'farmer' | 'forester' | 'miner' | 'fisher' | 'merchant' | 'ranger' | 'mason' | 'scholar' | 'shepherd' | 'steward';
export type Law = 'river-tithe' | 'common-fields' | 'forest-accord' | 'market-rights' | 'royal-survey' | 'festival-charter' | 'living-map' | 'concord-five';
export type Offer = { id: string; kind: 'terrain'; terrain: Terrain } | { id: string; kind: 'citizen'; citizen: Citizen } | { id: string; kind: 'law'; law: Law };
export type Phase = 'briefing' | 'chooseOffer' | 'chooseTarget' | 'preview' | 'result' | 'season' | 'finalChronicle' | 'ending';
export interface Cell { terrain: Terrain | null; citizen: Citizen | null; law: Law | null }
export interface Position { x: number; y: number }
export interface ScoreEvent { label: string; amount: number }
export interface Resolution { legal: boolean; reason?: string; events: ScoreEvent[]; glory: number; preview: string[] }
export interface GameState {
  seed: number; phase: Phase; turn: number; board: Cell[][]; glory: number; favour: number;
  laws: Law[]; market: Offer[]; selectedOffer: Offer | null; target: Position; preview: Resolution | null;
  lastEvents: ScoreEvent[]; seasonEvents: ScoreEvent[]; ledger: ScoreEvent[]; notice: string;
}

const TERRAIN: Terrain[] = ['field', 'forest', 'hill', 'river', 'lake', 'road', 'village', 'ruin', 'garden'];
const CITIZENS: Citizen[] = ['farmer', 'forester', 'miner', 'fisher', 'merchant', 'ranger', 'mason', 'scholar', 'shepherd', 'steward'];
const LAWS: Law[] = ['river-tithe', 'common-fields', 'forest-accord', 'market-rights', 'royal-survey', 'festival-charter', 'living-map', 'concord-five'];
const terrainNames: Record<Terrain, string> = { castle: 'Castle', field: 'Field', forest: 'Forest', hill: 'Hill', river: 'River', lake: 'Lake', road: 'Road', village: 'Village', ruin: 'Ruin', garden: 'Garden' };
const citizenNames: Record<Citizen, string> = { farmer: 'Farmer', forester: 'Forester', miner: 'Miner', fisher: 'Fisher', merchant: 'Merchant', ranger: 'Ranger', mason: 'Mason', scholar: 'Scholar', shepherd: 'Shepherd', steward: 'Steward' };
const lawNames: Record<Law, string> = { 'river-tithe': 'River Tithe', 'common-fields': 'Common Fields', 'forest-accord': 'Forest Accord', 'market-rights': 'Market Rights', 'royal-survey': 'Royal Survey', 'festival-charter': 'Festival Charter', 'living-map': 'Living Map', 'concord-five': 'Concord of Five' };
const citizenHomes: Record<Citizen, Terrain[]> = { farmer: ['field', 'village'], forester: ['forest'], miner: ['hill', 'ruin'], fisher: ['river', 'lake'], merchant: ['road', 'village', 'castle'], ranger: ['forest', 'hill'], mason: ['hill', 'village', 'ruin', 'castle'], scholar: ['ruin', 'castle', 'garden'], shepherd: ['field', 'hill'], steward: ['castle', 'village', 'garden'] };

function rng(seed: number): () => number { let x = seed >>> 0; return () => { x = (Math.imul(x ^ x >>> 16, 2246822519) + 3266489917) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; }; }
function emptyBoard(): Cell[][] { return Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => ({ terrain: x === 2 && y === 2 ? 'castle' : null, citizen: null, law: null }))); }
function neighbours(p: Position): Position[] { return [{ x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y }, { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 }].filter(q => q.x >= 0 && q.x < 5 && q.y >= 0 && q.y < 5); }
function adjacent(board: Cell[][], p: Position, terrain: Terrain): number { return neighbours(p).filter(q => board[q.y]![q.x]!.terrain === terrain).length; }
function allPositions(): Position[] { return Array.from({ length: 25 }, (_, i) => ({ x: i % 5, y: Math.floor(i / 5) })); }
function offerName(offer: Offer): string { return offer.kind === 'terrain' ? terrainNames[offer.terrain] : offer.kind === 'citizen' ? citizenNames[offer.citizen] : lawNames[offer.law]; }
export function labelFor(offer: Offer): string { return `${offer.kind === 'terrain' ? 'Terrain' : offer.kind === 'citizen' ? 'Citizen' : 'Law'}: ${offerName(offer)}`; }
export function cellName(cell: Cell): string { return `${cell.terrain ? terrainNames[cell.terrain] : 'Empty'}${cell.citizen ? ` / ${citizenNames[cell.citizen]}` : ''}`; }

function offersFor(seed: number, turn: number, board: Cell[][]): Offer[] {
  const random = rng(seed + turn * 1777); const empty = allPositions().filter(p => !board[p.y]![p.x]!.terrain);
  const terrain = TERRAIN[(turn + Math.floor(random() * TERRAIN.length)) % TERRAIN.length]!;
  const homeTerrain = empty.length ? (board[empty[0]!.y]![empty[0]!.x]!.terrain ?? 'field') : 'field';
  const validCitizens = CITIZENS.filter(c => citizenHomes[c]!.includes(homeTerrain));
  const citizen: Citizen = (validCitizens.length ? validCitizens : ['merchant' as Citizen])[Math.floor(random() * (validCitizens.length || 1))]!;
  const unused = LAWS.filter(l => !findLaw(board, l)); const law = (unused.length ? unused : LAWS)[Math.floor(random() * (unused.length || LAWS.length))]!;
  if (turn <= 2) return [{ id: `t-${turn}-a`, kind: 'terrain', terrain }, { id: `t-${turn}-b`, kind: 'terrain', terrain: TERRAIN[(turn + 2) % TERRAIN.length]! }, { id: `t-${turn}-c`, kind: 'citizen', citizen: 'farmer' }];
  if (turn <= 5) return [{ id: `t-${turn}-a`, kind: 'terrain', terrain }, { id: `t-${turn}-b`, kind: 'citizen', citizen }, { id: `t-${turn}-c`, kind: 'citizen', citizen: validCitizens[1] ?? 'merchant' as Citizen }];
  return [{ id: `t-${turn}-a`, kind: 'law', law }, { id: `t-${turn}-b`, kind: 'terrain', terrain }, { id: `t-${turn}-c`, kind: 'citizen', citizen }];
}
function findLaw(board: Cell[][], law: Law): boolean { return board.some(row => row.some(cell => cell.law === law)); }
function current(state: GameState): Offer | null { return state.selectedOffer; }
export function legalTarget(state: GameState, offer = current(state), target = state.target): { legal: boolean; reason?: string } {
  if (!offer) return { legal: false, reason: 'Choose an offer first.' };
  const cell = state.board[target.y]?.[target.x]; if (!cell) return { legal: false, reason: 'Outside the kingdom.' };
  if (offer.kind === 'terrain') return cell.terrain ? { legal: false, reason: 'That square is occupied.' } : { legal: true };
  if (offer.kind === 'citizen') return !cell.terrain ? { legal: false, reason: 'Citizens need a home.' } : cell.citizen ? { legal: false, reason: 'That home already has a citizen.' } : citizenHomes[offer.citizen]!.includes(cell.terrain) ? { legal: true } : { legal: false, reason: `${citizenNames[offer.citizen]} needs ${citizenHomes[offer.citizen]!.join(' or ')}.` };
  return { legal: true };
}
function cloneBoard(board: Cell[][]): Cell[][] { return board.map(row => row.map(cell => ({ ...cell })));
}
export function evaluate(state: GameState, offer: Offer, target: Position): Resolution {
  const legality = legalTarget(state, offer, target); if (!legality.legal) return { legal: false, reason: legality.reason, events: [], glory: 0, preview: [legality.reason ?? 'Illegal target'] };
  const events: ScoreEvent[] = []; const board = cloneBoard(state.board); const cell = board[target.y]![target.x]!;
  if (offer.kind === 'terrain') { cell.terrain = offer.terrain; const n = adjacent(board, target, offer.terrain); const amount = 1 + Math.min(3, n); events.push({ label: `${terrainNames[offer.terrain]} placement`, amount }); if (offer.terrain === 'river' && adjacent(board, target, 'field') > 0) events.push({ label: 'River feeds fields', amount: 2 }); }
  if (offer.kind === 'citizen') { cell.citizen = offer.citizen; const n = neighbours(target).filter(p => board[p.y]![p.x]!.terrain === cell.terrain).length; const amount = 2 + Math.min(3, n); events.push({ label: `${citizenNames[offer.citizen]} settles`, amount }); if (offer.citizen === 'merchant' && connectedToCastle(board, target)) events.push({ label: 'Capital road connection', amount: 3 }); }
  if (offer.kind === 'law') { if (state.laws.includes(offer.law)) return { legal: false, reason: 'That law is already active.', events: [], glory: 0, preview: ['That law is already active.'] }; cell.law = offer.law; const bonus = lawPlacementBonus(offer.law, board); events.push({ label: `${lawNames[offer.law]} enacted`, amount: bonus }); }
  if (offer.kind === 'law' && offer.law === 'living-map') events.push({ label: 'Favour for civic clarity', amount: 1 });
  const glory = events.reduce((sum, event) => sum + event.amount, 0); return { legal: true, events, glory, preview: events.map(event => `${event.label}: +${event.amount}`) };
}
function lawPlacementBonus(law: Law, board: Cell[][]): number { if (law === 'river-tithe') return board.flat().filter(c => c.terrain === 'river' || c.terrain === 'lake').length >= 3 ? 6 : 2; if (law === 'common-fields') return board.flat().filter(c => c.terrain === 'field').length >= 3 ? 7 : 2; if (law === 'forest-accord') return board.flat().filter(c => c.terrain === 'forest').length >= 2 ? 5 : 2; if (law === 'concord-five') return new Set(board.flat().map(c => c.terrain).filter(Boolean)).size >= 5 ? 10 : 2; return 3; }
function connectedToCastle(board: Cell[][], start: Position): boolean { const seen = new Set<string>(); const queue: Position[] = [{ x: 2, y: 2 }]; while (queue.length) { const p = queue.shift()!; const key = `${p.x},${p.y}`; if (seen.has(key)) continue; seen.add(key); if (p.x === start.x && p.y === start.y) return true; for (const q of neighbours(p)) if (board[q.y]![q.x]!.terrain === 'road' || (q.x === 2 && q.y === 2) || board[q.y]![q.x]!.terrain === board[p.y]![p.x]!.terrain) queue.push(q); } return false; }
function season(state: GameState): ScoreEvent[] { const events: ScoreEvent[] = []; for (const p of allPositions()) { const cell = state.board[p.y]![p.x]!; if (!cell.citizen) continue; const near = neighbours(p); if (cell.citizen === 'farmer') { const n = near.filter(q => state.board[q.y]![q.x]!.terrain === 'field' || state.board[q.y]![q.x]!.terrain === 'river').length; events.push({ label: 'Farmer harvest', amount: Math.min(5, n + 1) }); } else if (cell.citizen === 'forester') events.push({ label: 'Forester watch', amount: 2 + near.filter(q => state.board[q.y]![q.x]!.terrain !== 'forest').length }); else if (cell.citizen === 'fisher') events.push({ label: 'Fisher catch', amount: 2 + near.filter(q => state.board[q.y]![q.x]!.terrain === 'river' || state.board[q.y]![q.x]!.terrain === 'lake').length }); else if (cell.citizen === 'merchant') events.push({ label: 'Merchant trade', amount: connectedToCastle(state.board, p) ? 5 : 2 }); else events.push({ label: `${citizenNames[cell.citizen]} contribution`, amount: 2 }); }
  if (state.laws.includes('river-tithe')) events.push({ label: 'River Tithe', amount: state.board.flat().filter(c => c.terrain === 'river' || c.terrain === 'lake').length >= 4 ? 6 : 2 });
  if (state.laws.includes('forest-accord')) events.push({ label: 'Forest Accord', amount: state.board.flat().filter(c => c.terrain === 'forest').length + state.board.flat().filter(c => c.terrain === 'hill').length > 4 ? 5 : 1 });
  return events; }
function finalBonus(state: GameState): ScoreEvent[] { const types = new Set(state.board.flat().map(c => c.terrain).filter(Boolean)); const events: ScoreEvent[] = [{ label: 'Kingdom diversity', amount: types.size * 2 }, { label: 'Unused favour', amount: state.favour * 2 }]; if (state.laws.includes('living-map')) events.push({ label: 'Living Map legacy', amount: types.size * 2 }); if (state.laws.includes('concord-five') && types.size >= 5) events.push({ label: 'Concord of Five', amount: 15 }); return events; }

export function createState(seed = Date.now()): GameState { const clean = seed >>> 0; const board = emptyBoard(); return { seed: clean, phase: 'briefing', turn: 1, board, glory: 0, favour: 0, laws: [], market: offersFor(clean, 1, board), selectedOffer: null, target: { x: 0, y: 0 }, preview: null, lastEvents: [], seasonEvents: [], ledger: [], notice: 'Build a tiny kingdom. Every square changes the future.' }; }
export type Command = { type: 'dismissBriefing' } | { type: 'selectOffer'; index: number } | { type: 'moveTarget'; dx: number; dy: number } | { type: 'preview' } | { type: 'confirm' } | { type: 'dismissResult' } | { type: 'dismissSeason' } | { type: 'restart'; seed?: number };
export function applyCommand(state: GameState, command: Command): GameState {
  const next = { ...state, board: state.board.map(row => row.map(cell => ({ ...cell }))), laws: [...state.laws], market: [...state.market], ledger: [...state.ledger] };
  switch (command.type) {
    case 'dismissBriefing': if (next.phase === 'briefing') next.phase = 'chooseOffer'; break;
    case 'selectOffer': if (next.phase === 'chooseOffer' && next.market[command.index]) { next.selectedOffer = next.market[command.index]!; next.phase = 'chooseTarget'; const first = allPositions().find(p => legalTarget(next, next.selectedOffer, p).legal); next.target = first ?? { x: 2, y: 2 }; next.notice = `${labelFor(next.selectedOffer)} selected. Choose a square.`; } break;
    case 'moveTarget': if (next.phase === 'chooseTarget' || next.phase === 'preview') { next.target = { x: Math.max(0, Math.min(4, next.target.x + command.dx)), y: Math.max(0, Math.min(4, next.target.y + command.dy)) }; if (next.phase === 'preview') next.phase = 'chooseTarget'; } break;
    case 'preview': if (next.phase === 'chooseTarget' && next.selectedOffer) { next.preview = evaluate(next, next.selectedOffer, next.target); next.phase = next.preview.legal ? 'preview' : 'chooseTarget'; next.notice = next.preview.reason ?? 'Review the projection, then confirm.'; } break;
    case 'confirm': if (next.phase === 'preview' && next.preview?.legal && next.selectedOffer) { const offer = next.selectedOffer; const cell = next.board[next.target.y]![next.target.x]!; if (offer.kind === 'terrain') cell.terrain = offer.terrain; if (offer.kind === 'citizen') cell.citizen = offer.citizen; if (offer.kind === 'law') { cell.law = offer.law; next.laws.push(offer.law); if (offer.law === 'living-map') next.favour = Math.min(6, next.favour + 1); } next.glory += next.preview.glory; next.lastEvents = next.preview.events; next.ledger.push(...next.preview.events); next.notice = `Turn ${next.turn}: +${next.preview.glory} Glory`; next.phase = 'result'; } break;
    case 'dismissResult': if (next.phase === 'result') { if (next.turn === 3 || next.turn === 6) { next.seasonEvents = season(next); next.glory += next.seasonEvents.reduce((s, e) => s + e.amount, 0); next.ledger.push(...next.seasonEvents); next.phase = 'season'; } else if (next.turn >= 9) { next.seasonEvents = [...season(next), ...finalBonus(next)]; next.glory += next.seasonEvents.reduce((s, e) => s + e.amount, 0); next.ledger.push(...next.seasonEvents); next.phase = 'finalChronicle'; } else { next.turn += 1; next.market = offersFor(next.seed, next.turn, next.board); next.selectedOffer = null; next.preview = null; next.phase = 'chooseOffer'; } } break;
    case 'dismissSeason': if (next.phase === 'season') { next.turn += 1; next.market = offersFor(next.seed, next.turn, next.board); next.selectedOffer = null; next.preview = null; next.phase = 'chooseOffer'; } break;
    case 'restart': return createState(command.seed ?? state.seed);
  }
  return next;
}
export function displayName(value: Terrain | Citizen | Law): string { return value in terrainNames ? terrainNames[value as Terrain] : value in citizenNames ? citizenNames[value as Citizen] : lawNames[value as Law]; }
export function iconFor(cell: Cell): string { if (cell.citizen) return cell.citizen === 'farmer' ? 'f' : cell.citizen === 'merchant' ? 'm' : 'o'; const icons: Record<Terrain, string> = { castle: 'K', field: '.', forest: 'F', hill: '^', river: '~', lake: 'O', road: '=', village: 'V', ruin: 'R', garden: 'G' }; return cell.terrain ? icons[cell.terrain] : ' '; }
