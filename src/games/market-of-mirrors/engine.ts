export type GoodId = 'echo' | 'shadow' | 'rain' | 'pear' | 'map' | 'eclipse' | 'apology' | 'candle';
export type Trait = 'memory' | 'living' | 'clockwork' | 'celestial' | 'edible' | 'forbidden' | 'prophetic' | 'ceremonial';
export type FactionId = 'cabinet' | 'ministry' | 'choir' | 'exchange';
export type RumorFrame = 'coveted' | 'vanishing' | 'counterfeit' | 'cursed';
export type RumorIntensity = 'whisper' | 'broadside' | 'proclamation';
export type MethodId = 'resonant-shelves' | 'echo-chamber' | 'provenance-thread' | 'patient-glass' | 'contrarian-kiln' | 'public-demonstration';
export type Phase = 'briefing' | 'market' | 'preview' | 'bellReport' | 'draft' | 'ending';

export interface GoodDefinition { id: GoodId; name: string; short: string; traits: Trait[]; base: number; volatility: number; icon: string; }
export interface MarketGood { id: GoodId; mid: number; previous: number; stock: number; flow: number; artifactFlow: number; }
export interface RawLot { id: string; goodId: GoodId; cost: number; day: number; }
export interface Artifact { id: string; recipeId: string; name: string; ingredients: [GoodId, GoodId]; costs: [number, number]; traits: Trait[]; resonance: number; day: number; heldBells: number; }
export interface Recipe { id: string; ingredients: [GoodId, GoodId]; name: string; resonance: number; traits: Trait[]; fragment: string; }
export interface Rumor {
  id: string; source: 'player' | FactionId; subject: GoodId; frame: RumorFrame; direction: -1 | 1; intensity: number;
  day: number; originPrice: number; closes: number; beliefs: Partial<Record<FactionId, number>>; outcome: 'active' | 'fulfilled' | 'unresolved' | 'exposed';
}
export interface FactionState { id: FactionId; cash: number; holdings: Record<GoodId, number>; artifacts: Artifact[]; credibility: number; lastAction: string; preference: Trait[]; }
export interface Commission { name: string; text: string; traitA: Trait; traitB: Trait; reward: number; done: boolean; }
export interface Method { id: MethodId; name: string; text: string; }
export interface TraceLine { label: string; amount: number; }
export interface Action { type: 'buy' | 'sell' | 'combine' | 'offer' | 'publish'; goodId?: GoodId; secondGoodId?: GoodId; artifactId?: string; factionId?: FactionId; frame?: RumorFrame; intensity?: RumorIntensity; }
export interface ActionResolution { valid: boolean; action: Action; lines: string[]; value?: number; artifact?: Artifact; }
export interface BellResolution { priceLines: string[]; factionLines: string[]; rumorLines: string[]; priceChanges: Record<GoodId, number>; beliefTrace?: RumorBeliefTrace[]; priceTrace?: PriceTrace[]; }
export interface RumorBeliefTrace { rumorId: string; factionId: FactionId; total: number; believed: boolean; factors: string[]; }
export interface PriceTrace { goodId: GoodId; previous: number; playerFlow: number; factionFlow: number; rumorPressure: number; artifactFlow: number; meanReversion: number; cap: number; next: number; }
export interface PriceTrace { goodId: GoodId; previous: number; playerFlow: number; factionFlow: number; rumorPressure: number; artifactFlow: number; meanReversion: number; cap: number; next: number; }
export interface GameState {
  seed: number; mode: 'tutorial' | 'standard'; phase: Phase; day: number; maxDay: number; actions: number; published: boolean;
  cash: number; credibility: number; suspicion: number; publishLocked: number | null; market: Record<GoodId, MarketGood>;
  inventory: RawLot[]; artifacts: Artifact[]; factions: Record<FactionId, FactionState>; rumors: Rumor[]; queuedRumor: Rumor | null; circular: Rumor | null;
  methods: MethodId[]; offers: Method[]; commission: Commission; pending: ActionResolution | null; lastAction: ActionResolution | null; lastBell: BellResolution | null;
  tutorialStep: number | null; notice: string; journal: string[];
}

export const GOODS: GoodDefinition[] = [
  { id: 'echo', name: 'Bottled Echo', short: 'ECH', traits: ['memory', 'ceremonial'], base: 18, volatility: 1, icon: 'e' },
  { id: 'shadow', name: 'Borrowed Shadow', short: 'SHD', traits: ['living', 'forbidden'], base: 22, volatility: 2, icon: 's' },
  { id: 'rain', name: "Yesterday's Rain", short: 'RAI', traits: ['celestial', 'memory'], base: 14, volatility: 2, icon: 'r' },
  { id: 'pear', name: 'Clockwork Pear', short: 'PEA', traits: ['clockwork', 'edible'], base: 20, volatility: 1, icon: 'p' },
  { id: 'map', name: 'Unfinished Map', short: 'MAP', traits: ['prophetic', 'memory'], base: 24, volatility: 2, icon: 'm' },
  { id: 'eclipse', name: 'Pocket Eclipse', short: 'ECL', traits: ['celestial', 'forbidden'], base: 30, volatility: 3, icon: 'c' },
  { id: 'apology', name: 'Amber Apology', short: 'APO', traits: ['ceremonial', 'edible'], base: 16, volatility: 1, icon: 'a' },
  { id: 'candle', name: 'Sleepless Candle', short: 'CAN', traits: ['living', 'prophetic'], base: 26, volatility: 2, icon: 'l' },
];
export const GOOD_BY_ID = Object.fromEntries(GOODS.map(g => [g.id, g])) as Record<GoodId, GoodDefinition>;
export const FACTIONS: Record<FactionId, { name: string; icon: string; preference: Trait[] }> = {
  cabinet: { name: 'Velvet Cabinet', icon: '◇', preference: ['celestial', 'ceremonial'] },
  ministry: { name: 'Ministry of Measures', icon: '□', preference: ['clockwork', 'memory'] },
  choir: { name: 'Choir of Needles', icon: '≈', preference: ['living', 'edible'] },
  exchange: { name: 'Pale Exchange', icon: '○', preference: ['forbidden', 'prophetic'] },
};
const RECIPE_ROWS: Array<[GoodId, GoodId, string, number, Trait[], string]> = [
  ['echo', 'shadow', 'Quiet Witness', 7, ['memory', 'living', 'forbidden'], 'It remembers who was never there.'], ['echo', 'rain', 'Weather That Remembers', 8, ['memory', 'celestial'], 'The bottle sweats forecasts.'],
  ['echo', 'pear', 'Orchard Refrain', 6, ['memory', 'edible', 'clockwork'], 'Every bite repeats a childhood.'], ['echo', 'map', 'Map of What Was Said', 9, ['memory', 'prophetic'], 'The route is made of overheard words.'],
  ['echo', 'eclipse', 'Blackened Chorus', 10, ['memory', 'celestial', 'forbidden'], 'A choir sings from the dark side.'], ['echo', 'apology', 'Forgiveness Engine', 7, ['memory', 'ceremonial', 'edible'], 'It apologizes before it is wound.'],
  ['echo', 'candle', "Night's Last Testimony", 8, ['memory', 'living', 'prophetic'], 'The flame remembers your alibi.'], ['shadow', 'rain', "Storm's Alibi", 8, ['living', 'celestial', 'forbidden'], 'It was elsewhere when the weather happened.'],
  ['shadow', 'pear', 'Fruit of Another Body', 9, ['living', 'edible', 'forbidden'], 'It ripens in borrowed hands.'], ['shadow', 'map', 'Fugitive Atlas', 10, ['living', 'prophetic', 'forbidden'], 'The roads keep trying to escape.'],
  ['shadow', 'eclipse', 'Portable Midnight', 11, ['living', 'celestial', 'forbidden'], 'A darkness with a handle.'], ['shadow', 'apology', 'Guilt Without an Owner', 7, ['living', 'ceremonial', 'forbidden'], 'Everyone recognizes the feeling.'],
  ['shadow', 'candle', 'Second Darkness', 8, ['living', 'prophetic', 'forbidden'], 'The shadow casts its own shadow.'], ['rain', 'pear', 'Mechanical Monsoon', 7, ['celestial', 'clockwork', 'edible'], 'The gears turn wetter.'],
  ['rain', 'map', 'Forecast of Lost Roads', 8, ['celestial', 'memory', 'prophetic'], 'It predicts where maps disappear.'], ['rain', 'eclipse', 'Eclipse in a Teacup', 10, ['celestial', 'forbidden', 'memory'], 'Stir clockwise to remove the sun.'],
  ['rain', 'apology', 'Apology for the Weather', 6, ['celestial', 'ceremonial', 'edible'], 'The rain signs in triplicate.'], ['rain', 'candle', 'Candle That Rains Upward', 8, ['celestial', 'living', 'prophetic'], 'The flame climbs toward the clouds.'],
  ['pear', 'map', 'Orchard of Possible Roads', 8, ['clockwork', 'edible', 'prophetic'], 'Every seed is a destination.'], ['pear', 'eclipse', 'Clockwork Nightfruit', 10, ['clockwork', 'edible', 'celestial'], 'It ticks only after sunset.'],
  ['pear', 'apology', 'Courteous Hunger', 6, ['clockwork', 'edible', 'ceremonial'], 'It asks before it eats.'], ['pear', 'candle', 'Insomniac Harvest', 8, ['clockwork', 'edible', 'living'], 'The orchard refuses to sleep.'],
  ['map', 'eclipse', 'Atlas of Closed Suns', 11, ['prophetic', 'celestial', 'forbidden'], 'The legend has been blacked out.'], ['map', 'apology', 'Route to Reconciliation', 7, ['prophetic', 'memory', 'ceremonial'], 'The shortest path says sorry.'],
  ['map', 'candle', "Map of Tomorrow's Ash", 9, ['prophetic', 'living', 'memory'], 'It burns only after you arrive.'], ['eclipse', 'apology', 'Polite End of the World', 9, ['celestial', 'forbidden', 'ceremonial'], 'The apocalypse sends invitations.'],
  ['eclipse', 'candle', 'Sunless Vigil', 10, ['celestial', 'living', 'prophetic'], 'Someone keeps watch for the sun.'], ['apology', 'candle', 'Vigil of Small Regrets', 7, ['ceremonial', 'living', 'prophetic'], 'The wick forgives slowly.'],
];
export const RECIPES: Recipe[] = RECIPE_ROWS.map(([a, b, name, resonance, traits, fragment]) => ({ id: [a, b].sort().join('-'), ingredients: [a, b], name, resonance, traits, fragment }));
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r])) as Record<string, Recipe>;
export const METHODS: Method[] = [
  { id: 'resonant-shelves', name: 'Resonant Shelves', text: 'Artifacts gain half of their ingredients’ positive momentum, up to +6 crowns.' },
  { id: 'echo-chamber', name: 'Echo Chamber', text: 'Your first Memory rumor each act treats Credibility as one higher.' },
  { id: 'provenance-thread', name: 'Provenance Thread', text: 'A sale that helps fulfill a rumor grants +1 Credibility once per act.' },
  { id: 'patient-glass', name: 'Patient Glass', text: 'An artifact held through a bell gains +3 appraisal, up to +9.' },
  { id: 'contrarian-kiln', name: 'Contrarian Kiln', text: 'Combining two goods that both fell yesterday adds +7 resonance.' },
  { id: 'public-demonstration', name: 'Public Demonstration', text: 'Sold artifacts create two ingredient flow instead of one.' },
];
const FACTION_ORDER: FactionId[] = ['cabinet', 'ministry', 'choir', 'exchange'];
const GOOD_ORDER: GoodId[] = GOODS.map(g => g.id);
const FRAMES: RumorFrame[] = ['coveted', 'vanishing', 'counterfeit', 'cursed'];
const INTENSITY: Record<RumorIntensity, number> = { whisper: 1, broadside: 2, proclamation: 3 };

function hash(seed: number, salt: number): number { let x = (seed ^ salt) >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x >>> 0; }
function pick<T>(values: T[], seed: number): T { return values[hash(seed, values.length * 97) % values.length]!; }
function cloneMarket(market: Record<GoodId, MarketGood>): Record<GoodId, MarketGood> { return Object.fromEntries(GOOD_ORDER.map(id => [id, { ...market[id] }])) as Record<GoodId, MarketGood>; }
function cloneState(state: GameState): GameState { return { ...state, market: cloneMarket(state.market), inventory: [...state.inventory], artifacts: [...state.artifacts], factions: Object.fromEntries(FACTION_ORDER.map(id => [id, { ...state.factions[id], holdings: { ...state.factions[id]!.holdings }, artifacts: [...state.factions[id]!.artifacts] }])) as Record<FactionId, FactionState>, rumors: state.rumors.map(r => ({ ...r, beliefs: { ...r.beliefs } })), queuedRumor: state.queuedRumor ? { ...state.queuedRumor, beliefs: { ...state.queuedRumor.beliefs } } : null, circular: state.circular ? { ...state.circular, beliefs: { ...state.circular.beliefs } } : null, pending: state.pending ? { ...state.pending, lines: [...state.pending.lines] } : null, lastAction: state.lastAction ? { ...state.lastAction, lines: [...state.lastAction.lines] } : null, lastBell: state.lastBell ? { ...state.lastBell, priceLines: [...state.lastBell.priceLines], factionLines: [...state.lastBell.factionLines], rumorLines: [...state.lastBell.rumorLines], priceChanges: { ...state.lastBell.priceChanges } } : null, journal: [...state.journal] }; }
function emptyHoldings(): Record<GoodId, number> { return Object.fromEntries(GOOD_ORDER.map(id => [id, 0])) as Record<GoodId, number>; }
function recipeFor(a: GoodId, b: GoodId): Recipe { return RECIPE_BY_ID[[a, b].sort().join('-')]!; }
function frameDirection(frame: RumorFrame): -1 | 1 { return frame === 'coveted' || frame === 'vanishing' ? 1 : -1; }
function frameName(frame: RumorFrame): string { return frame.toUpperCase(); }
function factionName(id: FactionId): string { return FACTIONS[id].name; }
function formatMoney(n: number): string { return `${n >= 0 ? '+' : ''}${n}`; }
function price(state: GameState, id: GoodId): number { return state.market[id]!.mid; }

function commissionFor(day: number): Commission { const options: Commission[] = [
  { name: 'A Memory of Weather', text: 'Sell an artifact with Memory + Celestial.', traitA: 'memory', traitB: 'celestial', reward: 18, done: false },
  { name: 'Respectable Contraband', text: 'Sell an artifact with Forbidden + Ceremonial.', traitA: 'forbidden', traitB: 'ceremonial', reward: 24, done: false },
  { name: 'Feast for a Sleepless Court', text: 'Sell an artifact with Living + Edible.', traitA: 'living', traitB: 'edible', reward: 20, done: false },
  { name: 'Cabinet of Three Histories', text: 'Sell an artifact carrying three traits.', traitA: 'memory', traitB: 'prophetic', reward: 22, done: false },
]; return { ...options[(day - 1) % options.length]! }; }

function makeMarket(seed: number): Record<GoodId, MarketGood> { return Object.fromEntries(GOODS.map((good, index) => { const stock = 3 + (hash(seed, index + 41) % 3) - 1; const mid = good.base + (hash(seed, index + 71) % 5) - 2; return [good.id, { id: good.id, mid, previous: mid, stock, flow: 0, artifactFlow: 0 }]; })) as Record<GoodId, MarketGood>; }
function createFactions(seed: number): Record<FactionId, FactionState> { return Object.fromEntries(FACTION_ORDER.map((id, index) => { const holdings = emptyHoldings(); holdings[GOOD_ORDER[(index * 2 + 1) % GOOD_ORDER.length]!] = 1; return [id, { id, cash: 120, holdings, artifacts: [], credibility: 3, lastAction: 'watching the opening stalls', preference: FACTIONS[id].preference }]; }).map(([id, faction]) => { const f = faction as FactionState; f.cash += hash(seed, String(id).length + 9) % 18; return [id, f]; })) as Record<FactionId, FactionState>; }

function generateCircular(state: GameState): Rumor {
  const source = FACTION_ORDER[(state.day - 1 + hash(state.seed, state.day * 13) % 4) % 4]!;
  const faction = state.factions[source]!;
  const held = GOOD_ORDER.find(id => faction.holdings[id]! > 0) ?? GOOD_ORDER[hash(state.seed, state.day * 31) % GOOD_ORDER.length]!;
  const subject = state.day % 2 === 0 ? held : GOOD_ORDER[hash(state.seed, state.day * 47) % GOOD_ORDER.length]!;
  const frame = pick(FRAMES, hash(state.seed, state.day * 59 + source.length));
  const intensity = state.day <= 2 ? 1 : 1 + (hash(state.seed, state.day * 61) % 2);
  return { id: `r-${state.day}-${source}`, source, subject, frame, direction: frameDirection(frame), intensity, day: state.day, originPrice: price(state, subject), closes: 2, beliefs: {}, outcome: 'active' };
}

function beliefFor(state: GameState, faction: FactionState, rumor: Rumor): number {
  const good = GOOD_BY_ID[rumor.subject]; const preferred = good.traits.filter(t => faction.preference.includes(t)).length;
  const stock = state.market[rumor.subject]!.stock <= 2 ? 2 : 0;
  const momentum = state.market[rumor.subject]!.mid > state.market[rumor.subject]!.previous ? 1 : -1;
  const frameAffinity = faction.id === 'choir' && rumor.frame === 'coveted' ? 2 : faction.id === 'ministry' && rumor.frame === 'counterfeit' ? 2 : faction.id === 'cabinet' && rumor.frame === 'vanishing' ? 2 : faction.id === 'exchange' && rumor.frame === 'cursed' ? 2 : 0;
  const skepticism = faction.id === 'ministry' && rumor.intensity === 3 ? 2 : 0;
  const trust = rumor.source === 'player' ? faction.credibility - 2 : 1;
  return Math.max(0, Math.min(9, faction.credibility + preferred * 2 + stock + (rumor.direction === momentum ? 1 : 0) + frameAffinity + trust - skepticism - (state.rumors.filter(r => r.subject === rumor.subject).length > 2 ? 1 : 0)));
}

function createRumor(state: GameState, source: 'player' | FactionId, subject: GoodId, frame: RumorFrame, intensity: RumorIntensity): Rumor { return { id: `r-${source}-${state.day}-${subject}`, source, subject, frame, direction: frameDirection(frame), intensity: INTENSITY[intensity], day: state.day, originPrice: price(state, subject), closes: 2, beliefs: {}, outcome: 'active' }; }

export function createState(seed = Date.now(), mode: 'tutorial' | 'standard' = 'standard'): GameState {
  const clean = seed >>> 0; const maxDay = mode === 'tutorial' ? 3 : 9; const market = makeMarket(clean);
  return { seed: clean, mode, phase: 'briefing', day: 1, maxDay, actions: 3, published: false, cash: 100, credibility: 3, suspicion: 0, publishLocked: null, market, inventory: [], artifacts: [], factions: createFactions(clean), rumors: [], queuedRumor: null, circular: null, methods: [], offers: [], commission: commissionFor(1), pending: null, lastAction: null, lastBell: null, tutorialStep: mode === 'tutorial' ? 0 : null, notice: mode === 'tutorial' ? 'GUIDED FAIR: learn the market in three bells.' : 'The stalls are open. Every claim waits for the bell.', journal: [] };
}

function startDay(state: GameState): void { state.actions = 3; state.published = false; state.pending = null; state.queuedRumor = null; state.circular = generateCircular(state); if (state.day === 1 || state.day === 4 || state.day === 7) state.commission = commissionFor(state.day); for (const id of GOOD_ORDER) { const market = state.market[id]!; market.flow = 0; market.artifactFlow = 0; if (market.stock < 3) market.stock++; else if (market.stock > 3) market.stock--; } state.phase = 'market'; const source = state.circular.source === 'player' ? 'the market' : factionName(state.circular.source); state.notice = `DAY ${state.day}: ${source} circulates a ${frameName(state.circular.frame)} claim about ${GOOD_BY_ID[state.circular.subject].name}.`; }

function inventoryCount(state: GameState): number { return state.inventory.length + state.artifacts.length; }
function matchingArtifact(state: GameState, id: string): Artifact | undefined { return state.artifacts.find(a => a.id === id); }
function lotsFor(state: GameState, id: GoodId): RawLot[] { return state.inventory.filter(lot => lot.goodId === id); }
function bidFor(state: GameState, faction: FactionState, artifact: Artifact): number {
  const reference = Math.floor((price(state, artifact.ingredients[0]) + price(state, artifact.ingredients[1])) * 0.8);
  const preference = Math.min(8, artifact.traits.filter(t => faction.preference.includes(t)).length * 4);
  const active = state.rumors.filter(r => r.outcome === 'active' && (r.subject === artifact.ingredients[0] || r.subject === artifact.ingredients[1])).reduce((sum, rumor) => sum + ((rumor.beliefs[faction.id] ?? 0) >= 6 ? 3 : 0), 0);
  const saturation = Math.min(8, faction.artifacts.filter(a => a.traits.some(t => artifact.traits.includes(t))).length * 2);
  const method = state.methods.includes('resonant-shelves') ? Math.min(6, Math.max(0, price(state, artifact.ingredients[0]) - GOOD_BY_ID[artifact.ingredients[0]].base) + Math.max(0, price(state, artifact.ingredients[1]) - GOOD_BY_ID[artifact.ingredients[1]].base)) / 2 : 0;
  return Math.max(5, Math.min(90, Math.floor(reference + artifact.resonance + preference + active + method - saturation)));
}

export function artifactBids(state: GameState, artifact: Artifact): Array<{ factionId: FactionId; factionName: string; amount: number; lines: string[] }> {
  return FACTION_ORDER.map(id => { const faction = state.factions[id]!; const amount = bidFor(state, faction, artifact); return { factionId: id, factionName: factionName(id), amount, lines: [`reference ${Math.floor((price(state, artifact.ingredients[0]) + price(state, artifact.ingredients[1])) * 0.8)}`, `resonance +${artifact.resonance}`, `trait preference +${Math.min(8, artifact.traits.filter(t => faction.preference.includes(t)).length * 4)}`, `${factionName(id)} bid ${amount}`] }; }).sort((a, b) => b.amount - a.amount); }

export function evaluateAction(state: GameState, action: Action): ActionResolution {
  const lines: string[] = []; if (state.actions <= 0) return { valid: false, action, lines: ['No actions remain. End the day.'] };
  if (state.mode === 'tutorial' && state.day === 1 && action.type !== 'buy' && action.type !== 'sell') return { valid: false, action, lines: ['Guided Fair Day 1 teaches quotes first. Buy, sell, or end the day.'] };
  if (state.mode === 'tutorial' && state.day === 2 && action.type === 'publish') return { valid: false, action, lines: ['Rumors unlock on Guided Fair Day 3. Combine and offer an artifact first.'] };
  if (action.type === 'buy') { const id = action.goodId!; const market = state.market[id]!; const ask = market.mid + 1 + Math.floor(GOOD_BY_ID[id].volatility / 2); if (market.stock <= 0) return { valid: false, action, lines: ['That shelf is empty.'] }; if (state.cash < ask) return { valid: false, action, lines: [`Ask is ${ask}; you have ${state.cash}.`] }; if (inventoryCount(state) >= 8) return { valid: false, action, lines: ['Inventory is full. Combine or sell first.'] }; return { valid: true, action, value: ask, lines: [`BUY ${GOOD_BY_ID[id].name}`, `ask ${ask}`, `stock ${market.stock} → ${market.stock - 1}`, `cash ${state.cash} → ${state.cash - ask}`] }; }
  if (action.type === 'sell') { const id = action.goodId!; if (!lotsFor(state, id).length) return { valid: false, action, lines: ['You do not own that good.'] }; const bid = Math.max(3, state.market[id]!.mid - 1 - Math.floor(GOOD_BY_ID[id].volatility / 2)); return { valid: true, action, value: bid, lines: [`SELL ${GOOD_BY_ID[id].name}`, `bid ${bid}`, `cash ${state.cash} → ${state.cash + bid}`] }; }
  if (action.type === 'combine') { const a = action.goodId!; const b = action.secondGoodId!; if (a === b && lotsFor(state, a).length < 2 || !lotsFor(state, a).length || !lotsFor(state, b).length) return { valid: false, action, lines: ['You need two owned lots.'] }; const recipe = recipeFor(a, b); const resonance = recipe.resonance + (state.methods.includes('contrarian-kiln') && state.market[a]!.mid < state.market[a]!.previous && state.market[b]!.mid < state.market[b]!.previous ? 7 : 0); const artifact: Artifact = { id: `a-${state.day}-${state.inventory.length}-${state.artifacts.length}`, recipeId: recipe.id, name: recipe.name, ingredients: [a, b], costs: [lotsFor(state, a)[0]!.cost, lotsFor(state, b)[0]!.cost], traits: recipe.traits, resonance, day: state.day, heldBells: 0 }; const bids = artifactBids(state, artifact); lines.push(`COMBINE ${GOOD_BY_ID[a].short} + ${GOOD_BY_ID[b].short}`, recipe.name, `resonance ${resonance}`, `best bid ${bids[0]!.amount} from ${bids[0]!.factionName}`); return { valid: true, action, artifact, value: bids[0]!.amount, lines }; }
  if (action.type === 'offer') { const artifact = matchingArtifact(state, action.artifactId!); const faction = state.factions[action.factionId!]!; if (!artifact || !faction) return { valid: false, action, lines: ['Choose an artifact and buyer.'] }; const bid = bidFor(state, faction, artifact); return { valid: true, action, value: bid, lines: [`OFFER ${artifact.name}`, `${factionName(faction.id)} pays ${bid}`, `ingredients ${GOOD_BY_ID[artifact.ingredients[0]].short} + ${GOOD_BY_ID[artifact.ingredients[1]].short}`] }; }
  if (state.publishLocked === state.day) return { valid: false, action, lines: ['Inspection has silenced your press for today.'] }; if (state.published) return { valid: false, action, lines: ['Only one rumor per day.'] }; if (!action.goodId || !action.frame || !action.intensity) return { valid: false, action, lines: ['Choose a subject, frame, and intensity.'] }; const rumor = createRumor(state, 'player', action.goodId, action.frame, action.intensity); return { valid: true, action, value: rumor.intensity, lines: [`PUBLISH ${frameName(rumor.frame)} ABOUT ${GOOD_BY_ID[rumor.subject].short}`, `${rumor.intensity === 1 ? 'whisper' : rumor.intensity === 2 ? 'broadside' : 'proclamation'} reaches the bell`, `suspicion +${Math.max(0, rumor.intensity - 1)}`, `the quote changes tomorrow, not now`] };
}

function commitAction(state: GameState, resolution: ActionResolution): void {
  const action = resolution.action; state.actions--; state.lastAction = resolution; state.notice = resolution.lines[0]!;
  if (action.type === 'buy') { const id = action.goodId!; state.cash -= resolution.value!; state.market[id]!.stock--; state.market[id]!.flow++; state.inventory.push({ id: `l-${state.day}-${state.inventory.length}-${id}`, goodId: id, cost: resolution.value!, day: state.day }); }
  else if (action.type === 'sell') { const id = action.goodId!; const index = state.inventory.findIndex(lot => lot.goodId === id); state.inventory.splice(index, 1); state.cash += resolution.value!; state.market[id]!.stock = Math.min(6, state.market[id]!.stock + 1); state.market[id]!.flow--; }
  else if (action.type === 'combine') { const a = action.goodId!; const b = action.secondGoodId!; const first = state.inventory.findIndex(lot => lot.goodId === a); const second = state.inventory.findIndex((lot, i) => lot.goodId === b && i !== first); const artifact = resolution.artifact!; state.inventory.splice(Math.max(first, second), 1); state.inventory.splice(Math.min(first, second), 1); state.artifacts.push(artifact); }
  else if (action.type === 'offer') { const artifactIndex = state.artifacts.findIndex(a => a.id === action.artifactId); const artifact = state.artifacts[artifactIndex]!; const faction = state.factions[action.factionId!]!; state.artifacts.splice(artifactIndex, 1); faction.artifacts.push(artifact); faction.cash -= resolution.value!; state.cash += resolution.value!; for (const id of artifact.ingredients) state.market[id]!.artifactFlow += state.methods.includes('public-demonstration') ? 2 : 1; const commission = state.commission; if (!commission.done && artifact.traits.includes(commission.traitA) && artifact.traits.includes(commission.traitB)) { commission.done = true; state.cash += commission.reward; state.credibility = Math.min(6, state.credibility + 1); state.journal.push(`Commission ${commission.name} completed for +${commission.reward}.`); } state.journal.push(`${factionName(faction.id)} bought ${artifact.name} for ${resolution.value}.`); }
  else { const rumor = createRumor(state, 'player', action.goodId!, action.frame!, action.intensity!); state.queuedRumor = rumor; state.published = true; state.suspicion = Math.min(6, state.suspicion + Math.max(0, rumor.intensity - 1)); }
}

function factionOrders(state: GameState, rumors: Rumor[]): { id: FactionId; good: GoodId; amount: number; side: 'buy' | 'sell'; reason: string }[] {
  const orders: { id: FactionId; good: GoodId; amount: number; side: 'buy' | 'sell'; reason: string }[] = [];
  for (const id of FACTION_ORDER) { const faction = state.factions[id]!; let best: { score: number; good: GoodId; side: 'buy' | 'sell'; reason: string } = { score: 0, good: 'echo', side: 'buy', reason: 'watching' };
    for (const good of GOODS) { const related = rumors.filter(r => r.subject === good.id); const rumorSignal = related.reduce((sum, r) => sum + (r.beliefs[id] ?? 0) >= 6 ? r.direction * r.intensity : 0, 0); const preference = good.traits.filter(t => faction.preference.includes(t)).length; const momentum = state.market[good.id]!.mid - state.market[good.id]!.previous; const score = preference * 2 + rumorSignal * 2 + Math.sign(momentum) - (state.market[good.id]!.mid > good.base + 12 ? 2 : 0); const side = score >= 0 ? 'buy' : 'sell'; const legal = side === 'buy' ? faction.cash >= state.market[good.id]!.mid + 1 && state.market[good.id]!.stock > 0 : faction.holdings[good.id]! > 0; if (legal && Math.abs(score) > Math.abs(best.score)) best = { score, good: good.id, side, reason: score > 0 ? 'belief and preference' : 'selling into doubt' }; }
    if (best.score !== 0) orders.push({ id, good: best.good, amount: 1, side: best.side, reason: best.reason });
  }
  return orders;
}

function resolveBell(state: GameState): BellResolution {
  const allRumors = [...state.rumors, ...(state.circular ? [state.circular] : []), ...(state.queuedRumor ? [state.queuedRumor] : [])];
  const unique: Rumor[] = []; for (const rumor of allRumors) if (!unique.some(r => r.id === rumor.id)) unique.push(rumor); state.rumors = unique;
  const activeRumors = state.rumors.filter(rumor => rumor.outcome === 'active');
  for (const rumor of activeRumors) for (const id of FACTION_ORDER) rumor.beliefs[id] = beliefFor(state, state.factions[id]!, rumor);
  const orders = factionOrders(state, activeRumors); const priceChanges = {} as Record<GoodId, number>; const priceLines: string[] = []; const factionLines: string[] = [];
  for (const good of GOODS) { const market = state.market[good.id]!; const factionFlow = orders.filter(o => o.good === good.id).reduce((sum, o) => sum + (o.side === 'buy' ? o.amount : -o.amount), 0); const rumorPressure = activeRumors.filter(r => r.subject === good.id).reduce((sum, r) => sum + r.direction * r.intensity * Math.max(...FACTION_ORDER.map(id => (r.beliefs[id] ?? 0) >= 6 ? 1 : 0), 0), 0); const anchor = good.base + (3 - market.stock) * 2; const mean = Math.max(-3, Math.min(3, Math.trunc((anchor - market.mid) / 6))); const flow = Math.trunc((market.flow + factionFlow) * good.volatility / 2); const raw = mean + flow + Math.trunc(rumorPressure / 2) + market.artifactFlow; const cap = Math.max(2, Math.round(market.mid * (state.day >= 7 ? 0.25 : 0.2))); const delta = Math.max(-cap, Math.min(cap, raw)); market.previous = market.mid; market.mid = Math.max(3, Math.min(80, market.mid + delta)); priceChanges[good.id] = delta; if (delta !== 0) priceLines.push(`${GOOD_BY_ID[good.id].short} ${market.previous} → ${market.mid} (${formatMoney(delta)})`); }
  for (const order of orders) { const faction = state.factions[order.id]!; const market = state.market[order.good]!; const amount = order.side === 'buy' ? Math.min(order.amount, market.stock) : Math.min(order.amount, faction.holdings[order.good]!); const quote = order.side === 'buy' ? market.mid + 1 : Math.max(3, market.mid - 1); if (order.side === 'buy' && amount && faction.cash >= quote * amount) { faction.cash -= quote * amount; faction.holdings[order.good]! += amount; market.stock = Math.max(0, market.stock - amount); } else if (order.side === 'sell' && amount) { faction.cash += quote * amount; faction.holdings[order.good]! -= amount; market.stock = Math.min(6, market.stock + amount); } faction.lastAction = `${order.side === 'buy' ? 'bought' : 'sold'} ${GOOD_BY_ID[order.good].short} (${order.reason})`; factionLines.push(`${FACTIONS[order.id].icon} ${factionName(order.id)} ${faction.lastAction}`); }
  const rumorLines: string[] = []; for (const rumor of activeRumors) { rumor.closes--; if (rumor.closes > 0) continue; const current = state.market[rumor.subject]!.mid; const change = current - rumor.originPrice; const fulfilled = rumor.direction === 1 ? change >= Math.ceil(rumor.originPrice * 0.08) : change <= -Math.ceil(rumor.originPrice * 0.08); const exposed = rumor.direction === 1 ? change <= -Math.ceil(rumor.originPrice * 0.08) : change >= Math.ceil(rumor.originPrice * 0.08); rumor.outcome = fulfilled ? 'fulfilled' : exposed ? 'exposed' : 'unresolved'; if (rumor.source === 'player') { if (fulfilled) { state.credibility = Math.min(6, state.credibility + 1); state.suspicion = Math.max(0, state.suspicion - 1); } else if (exposed) state.credibility = Math.max(0, state.credibility - 1); rumorLines.push(`YOUR ${frameName(rumor.frame)} ${rumor.outcome.toUpperCase()} (${formatMoney(change)})`); } else rumorLines.push(`${factionName(rumor.source)} ${frameName(rumor.frame)} ${rumor.outcome}`); }
  if (state.suspicion >= 6) { state.cash = Math.max(0, state.cash - 12); state.credibility = Math.max(0, state.credibility - 1); state.publishLocked = state.day + 1; state.suspicion = 3; rumorLines.push('INSPECTION: press closed for one day, fine -12.'); }
  for (const artifact of state.artifacts) artifact.heldBells++;
  const beliefTrace = activeRumors.flatMap(rumor => FACTION_ORDER.map(factionId => { const total = rumor.beliefs[factionId] ?? 0; return { rumorId: rumor.id, factionId, total, believed: total >= 6, factors: [`cred ${state.factions[factionId]!.credibility}`, `subject ${GOOD_BY_ID[rumor.subject].short}`, `frame ${frameName(rumor.frame)}`] }; }));
  const priceTrace = GOODS.map(good => { const market = state.market[good.id]!; const delta = priceChanges[good.id] ?? 0; return { goodId: good.id, previous: market.mid - delta, playerFlow: market.flow, factionFlow: orders.filter(order => order.good === good.id).reduce((sum, order) => sum + (order.side === 'buy' ? order.amount : -order.amount), 0), rumorPressure: activeRumors.filter(rumor => rumor.subject === good.id).length, artifactFlow: market.artifactFlow, meanReversion: 0, cap: Math.max(2, Math.round(market.previous * 0.2)), next: market.mid }; });
  return { priceLines: priceLines.length ? priceLines : ['Prices held steady.'], factionLines: factionLines.length ? factionLines : ['The factions declined to move.'], rumorLines: rumorLines.length ? rumorLines : ['No rumor settled this bell.'], priceChanges, beliefTrace, priceTrace };
}

export function applyCommand(input: GameState, command: { type: 'dismissBriefing' | 'previewAction' | 'confirmAction' | 'cancelPreview' | 'endDay' | 'dismissBellReport' | 'chooseMethod' | 'restart'; action?: Action; methodId?: MethodId; sameSeed?: boolean }): GameState {
  if (command.type === 'restart') return createState(command.sameSeed ? input.seed : hash(input.seed, input.day + 901), input.mode);
  const state = cloneState(input);
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') { startDay(state); return state; }
  if (command.type === 'previewAction' && state.phase === 'market' && command.action) { const result = evaluateAction(state, command.action); state.pending = result; state.phase = result.valid ? 'preview' : 'market'; state.notice = result.lines[0]!; return state; }
  if (command.type === 'cancelPreview' && state.phase === 'preview') { state.pending = null; state.phase = 'market'; return state; }
  if (command.type === 'confirmAction' && state.phase === 'preview' && state.pending?.valid) { const committedType = state.pending.action.type; commitAction(state, state.pending); if (state.tutorialStep !== null) { if (state.day === 1 && (committedType === 'buy' || committedType === 'sell')) state.tutorialStep = Math.max(1, state.tutorialStep); if (state.day === 2 && (committedType === 'combine' || committedType === 'offer')) state.tutorialStep = Math.max(2, state.tutorialStep); if (state.day === 3 && committedType === 'publish') state.tutorialStep = 3; } state.pending = null; state.phase = 'market'; if (state.actions <= 0) state.notice = 'Three actions spent. End the day when ready.'; return state; }
  if (command.type === 'endDay' && state.phase === 'market') { state.lastBell = resolveBell(state); state.phase = 'bellReport'; state.notice = 'CLOSING BELL: the market has reflected your claims.'; return state; }
  if (command.type === 'dismissBellReport' && state.phase === 'bellReport') { if (state.day === 3 || state.day === 6) { if (state.mode === 'standard') { state.offers = METHODS.filter(m => !state.methods.includes(m.id)).slice(0, 3); state.phase = 'draft'; state.notice = 'ACT CLOSED: choose one workshop method.'; return state; } } if (state.day >= state.maxDay) { state.phase = 'ending'; state.notice = 'THE LAST REFLECTION: estates are being liquidated.'; return state; } state.day++; startDay(state); return state; }
  if (command.type === 'chooseMethod' && state.phase === 'draft' && command.methodId && state.offers.some(m => m.id === command.methodId)) { state.methods.push(command.methodId); state.offers = []; if (state.day >= state.maxDay) state.phase = 'ending'; else { state.day++; startDay(state); } return state; }
  return state;
}

export function displayGood(id: GoodId): string { return GOOD_BY_ID[id].name; }
export function displayFaction(id: FactionId): string { return factionName(id); }
export function quote(state: GameState, id: GoodId): { bid: number; ask: number } { const spread = 1 + Math.floor(GOOD_BY_ID[id].volatility / 2); return { bid: Math.max(3, state.market[id]!.mid - spread), ask: state.market[id]!.mid + spread }; }
export function currentBids(state: GameState, artifact: Artifact): Array<{ factionId: FactionId; amount: number; factionName: string }> { return artifactBids(state, artifact).map(b => ({ factionId: b.factionId, amount: b.amount, factionName: b.factionName })); }
export function methodById(id: MethodId): Method { return METHODS.find(m => m.id === id)!; }
