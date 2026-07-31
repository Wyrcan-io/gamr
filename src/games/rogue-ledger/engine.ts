export type Tag = 'routine' | 'emergency' | 'research' | 'infrastructure' | 'occult' | 'personnel' | 'luxury' | 'interplanetary' | 'recurring' | 'regulated' | 'volatile';
export type Treatment = 'book' | 'capitalize' | 'defer' | 'reserve' | 'decline';
export type Phase = 'briefing' | 'working' | 'preview' | 'result' | 'quarterClose' | 'draft' | 'report' | 'gameOver' | 'ending';
export type RuleId = string;
export type CategoryId = string;

export interface Transaction {
  id: string; title: string; description: string; baseCredits: number; tags: Tag[];
  allowedTreatments: Treatment[]; source: string; visibleClauses: string[];
}
export interface Rule { id: RuleId; name: string; text: string; tag: Tag; bonus: number; audit: number; priority: number; }
export interface Category { id: CategoryId; name: string; text: string; tag: Tag; percent: number; }
export interface Liability { id: string; amount: number; dueQuarter: number; label: string; }
export interface Trigger { id: string; text: string; }
export interface EntryResolution { transactionId: string; treatment: Treatment; baseCredits: number; treatmentCredits: number; categoryCredits: number; ruleCredits: number; multiplier: number; finalCredits: number; auditDelta: number; standingDelta: number; liabilities: Liability[]; trace: string[]; triggered: Trigger[]; }
export interface LedgerEntry extends EntryResolution { quarter: number; }
export interface Offer { id: string; kind: 'rule' | 'category'; rule?: Rule; category?: Category; }
export interface GameState {
  seed: number; phase: Phase; quarter: number; cash: number; profit: number; target: number; floor: number;
  audit: number; standing: number; rules: Rule[]; categories: Category[]; liabilities: Liability[];
  deck: Transaction[]; index: number; selectedTreatment: Treatment | null; preview: EntryResolution | null;
  lastResult: EntryResolution | null; history: LedgerEntry[]; offers: Offer[]; notice: string;
}

const TAGS: Tag[] = ['routine', 'emergency', 'research', 'infrastructure', 'occult', 'personnel', 'luxury', 'interplanetary', 'recurring', 'regulated', 'volatile'];
const RULES: Rule[] = [
  { id: 'emergency-procurement', name: 'Emergency Procurement', text: 'Emergency costs gain +24 credits once each quarter.', tag: 'emergency', bonus: 24, audit: 0, priority: 10 },
  { id: 'moonlight-depreciation', name: 'Moonlight Depreciation', text: 'Capitalized occult entries gain +18 credits, but +1 audit.', tag: 'occult', bonus: 18, audit: 1, priority: 20 },
  { id: 'crew-retention', name: 'Crew Retention', text: 'Personnel costs restore 1 Standing per 20 credits spent.', tag: 'personnel', bonus: 0, audit: 0, priority: 30 },
  { id: 'compliance-theatre', name: 'Compliance Theatre', text: 'Regulated entries reduce Audit by 1.', tag: 'regulated', bonus: 0, audit: -1, priority: 40 },
  { id: 'predictable-catastrophe', name: 'Predictable Catastrophe', text: 'Forecast volatility pays +30 credits.', tag: 'volatile', bonus: 30, audit: 0, priority: 50 },
  { id: 'interstellar-withholding', name: 'Interstellar Withholding', text: 'Interplanetary income gains +16 credits.', tag: 'interplanetary', bonus: 16, audit: 1, priority: 60 },
];
const CATEGORIES: Category[] = [
  { id: 'long-term-weirdness', name: 'Long-Term Weirdness', text: 'Occult costs are 20% cheaper.', tag: 'occult', percent: 20 },
  { id: 'union-welfare', name: 'Union Welfare', text: 'Personnel costs are 15% cheaper.', tag: 'personnel', percent: 15 },
  { id: 'infrastructure-office', name: 'Infrastructure Office', text: 'Infrastructure costs are 12% cheaper.', tag: 'infrastructure', percent: 12 },
  { id: 'research-grant', name: 'Research Grant', text: 'Research entries gain +12 credits.', tag: 'research', percent: 0 },
];
const TITLES = ['Moonlight repossession fee', 'Dragon-safe canteen retainer', 'Unlicensed telescope grant', 'Emergency bridge invoice', 'Interplanetary courier dividend', 'The glass tax adjustment', 'Routine stationery order', 'Sentient invoice settlement'];
const DESCRIPTIONS = ['The paperwork hums when folded.', 'A committee has approved this expense in three dimensions.', 'Payment is requested before the moon notices.', 'The supplier promises not to become recursive.'];
const SOURCES = ['Lunar Municipal Authority', 'Local 900 (Fireproof)', 'Office of Impossible Research', 'Outer Orbit Clearinghouse', 'Department of Bridges'];
const TAG_POOL: Tag[][] = [['occult', 'infrastructure', 'recurring'], ['personnel', 'emergency'], ['research', 'regulated'], ['infrastructure', 'volatile'], ['interplanetary', 'recurring'], ['luxury', 'regulated'], ['routine'], ['occult', 'volatile']];

function rng(seed: number): () => number { let x = seed >>> 0; return () => { x = (Math.imul(x ^ (x >>> 16), 2246822519) + 3266489917) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; }; }
function pick<T>(random: () => number, values: T[]): T { return values[Math.floor(random() * values.length)]!; }
function targetFor(quarter: number): number { return 45 + quarter * 18; }
function deckFor(seed: number, quarter: number): Transaction[] {
  const random = rng(seed + quarter * 7919);
  return Array.from({ length: 8 }, (_, i) => {
    const tags = [...pick(random, TAG_POOL)];
    const income = i === 4 || i === 7;
    const magnitude = 18 + Math.floor(random() * 42) + quarter * 3;
    const baseCredits = income ? magnitude : -magnitude;
    const allowedTreatments: Treatment[] = income ? ['book', 'reserve', 'decline'] : i % 3 === 0 ? ['book', 'capitalize', 'defer', 'decline'] : ['book', 'reserve', 'decline'];
    return { id: `q${quarter}-tx${i}`, title: TITLES[(i + quarter) % TITLES.length]!, description: DESCRIPTIONS[Math.floor(random() * DESCRIPTIONS.length)]!, baseCredits, tags, allowedTreatments, source: SOURCES[Math.floor(random() * SOURCES.length)]!, visibleClauses: [`${income ? 'INCOME' : 'EXPENSE'} ${baseCredits > 0 ? '+' : ''}${baseCredits}`, tags.map(tag => tag.toUpperCase()).join(' · ')] };
  });
}

export function createState(seed = Date.now()): GameState {
  const clean = seed >>> 0;
  return { seed: clean, phase: 'briefing', quarter: 1, cash: 120, profit: 0, target: targetFor(1), floor: 55, audit: 0, standing: 60, rules: [], categories: [], liabilities: [], deck: deckFor(clean, 1), index: 0, selectedTreatment: null, preview: null, lastResult: null, history: [], offers: [], notice: 'READ THE FORECAST. EVERY CREDIT HAS A STORY.' };
}

export function currentTransaction(state: GameState): Transaction | undefined { return state.deck[state.index]; }
function hasQuarterRule(state: GameState, id: string): boolean { return state.history.some(entry => entry.quarter === state.quarter && entry.triggered.some(trigger => trigger.id === id)); }
export function evaluateEntry(state: GameState, transaction: Transaction, treatment: Treatment): EntryResolution {
  if (!transaction.allowedTreatments.includes(treatment)) throw new Error('Treatment is not allowed');
  let treatmentCredits = treatment === 'book' || treatment === 'reserve' ? transaction.baseCredits : treatment === 'capitalize' ? Math.round(transaction.baseCredits * 0.35) : 0;
  if (treatment === 'defer') treatmentCredits = 0;
  const trace: string[] = [`BASE ${transaction.baseCredits >= 0 ? '+' : ''}${transaction.baseCredits}`, `TREATMENT ${treatment.toUpperCase()} ${treatmentCredits >= 0 ? '+' : ''}${treatmentCredits}`];
  let categoryCredits = 0;
  for (const category of state.categories) {
    if (!transaction.tags.includes(category.tag)) continue;
    if (category.percent > 0 && treatmentCredits < 0) { const reduction = Math.round(Math.abs(treatmentCredits) * category.percent / 100); categoryCredits += reduction; trace.push(`◇ ${category.name} +${reduction}`); }
    if (category.id === 'research-grant' && transaction.tags.includes('research')) { categoryCredits += 12; trace.push(`◇ ${category.name} +12`); }
  }
  let ruleCredits = 0; let auditDelta = 0; let standingDelta = 0; const triggered: Trigger[] = [];
  for (const rule of [...state.rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))) {
    if (!transaction.tags.includes(rule.tag)) continue;
    if (rule.id === 'emergency-procurement' && hasQuarterRule(state, rule.id)) continue;
    if (rule.id === 'moonlight-depreciation' && treatment !== 'capitalize') continue;
    const amount = rule.id === 'crew-retention' ? Math.floor(Math.abs(transaction.baseCredits) / 20) : rule.bonus;
    ruleCredits += amount; auditDelta += rule.audit; triggered.push({ id: rule.id, text: rule.name });
    if (rule.id === 'crew-retention') standingDelta += amount;
    trace.push(`§ ${rule.name} ${amount ? `+${amount}` : `+${standingDelta} standing`}${rule.audit ? ` audit ${rule.audit > 0 ? '+' : ''}${rule.audit}` : ''}`);
  }
  if (treatment === 'capitalize') { const liability = Math.round(Math.abs(transaction.baseCredits) * 0.7); trace.push(`↳ LIABILITY ${liability} DUE Q${state.quarter + 1}`); }
  const liabilities = treatment === 'capitalize' ? [{ id: `${transaction.id}-liability`, amount: Math.round(Math.abs(transaction.baseCredits) * 0.7), dueQuarter: state.quarter + 1, label: transaction.title }] : [];
  return { transactionId: transaction.id, treatment, baseCredits: transaction.baseCredits, treatmentCredits, categoryCredits, ruleCredits, multiplier: 1, finalCredits: treatmentCredits + categoryCredits + ruleCredits, auditDelta, standingDelta, liabilities, trace, triggered };
}

export type Command = { type: 'dismissBriefing' } | { type: 'selectTreatment'; treatment: Treatment } | { type: 'confirmEntry' } | { type: 'dismissResult' } | { type: 'chooseOffer'; offerId: string } | { type: 'continueReport' } | { type: 'restartQuarter' } | { type: 'restartRun'; seed?: number };
function offersFor(state: GameState): Offer[] { const random = rng(state.seed + state.quarter * 31337); const availableRules = RULES.filter(rule => !state.rules.some(installed => installed.id === rule.id)); const availableCategories = CATEGORIES.filter(category => !state.categories.some(installed => installed.id === category.id)); const first = pick(random, availableRules); const second = pick(random, availableCategories); return [{ id: first.id, kind: 'rule', rule: first }, { id: second.id, kind: 'category', category: second }, { id: state.quarter % 2 ? 'repair-' + state.quarter : 'rule-' + state.quarter, kind: 'rule', rule: state.quarter % 2 ? { id: 'repair-' + state.quarter, name: 'Audit Repair', text: 'Reduce Audit by 2 at draft.', tag: 'regulated', bonus: 0, audit: -2, priority: 5 } : pick(random, availableRules) }]; }
function closeQuarter(state: GameState): void {
  const due = state.liabilities.filter(liability => liability.dueQuarter === state.quarter);
  for (const liability of due) { state.cash -= liability.amount; state.profit -= liability.amount; state.notice = `LIABILITY PAID: ${liability.label} -${liability.amount}`; }
  state.liabilities = state.liabilities.filter(liability => liability.dueQuarter !== state.quarter);
  if (state.cash < state.floor || state.profit < state.target || state.audit >= 12 || state.standing <= 0) { state.phase = 'gameOver'; state.notice = state.cash < state.floor ? 'INSOLVENCY: CASH BELOW EMERGENCY FLOOR.' : state.profit < state.target ? 'QUARTER MISSED: PROFIT TARGET NOT MET.' : state.audit >= 12 ? 'AUDIT SEIZURE: EXPOSURE REACHED 12.' : 'STANDING COLLAPSED: NO ONE WILL EXTEND CREDIT.'; return; }
  if (state.quarter >= 6) { state.phase = 'ending'; state.notice = 'ANNUAL AUDIT COMPLETE. THE BOOKS SURVIVED.'; return; }
  state.offers = offersFor(state); state.phase = 'draft'; state.notice = 'QUARTER CLEARED. DRAFT ONE POLICY OR CATEGORY.';
}
export function applyCommand(state: GameState, command: Command): GameState {
  switch (command.type) {
    case 'dismissBriefing': if (state.phase === 'briefing') state.phase = 'working'; break;
    case 'selectTreatment': if (state.phase === 'working' && currentTransaction(state)?.allowedTreatments.includes(command.treatment)) { state.selectedTreatment = command.treatment; state.preview = evaluateEntry(state, currentTransaction(state)!, command.treatment); state.phase = 'preview'; } break;
    case 'confirmEntry': if (state.phase === 'preview' && state.preview) { const result = state.preview; state.cash += result.finalCredits; state.profit += result.finalCredits; state.audit = Math.max(0, Math.min(12, state.audit + result.auditDelta)); state.standing = Math.max(0, Math.min(100, state.standing + result.standingDelta)); state.liabilities.push(...result.liabilities); state.history.push({ ...result, quarter: state.quarter }); state.lastResult = result; state.notice = result.finalCredits >= 0 ? `BOOKED ${result.finalCredits >= 0 ? '+' : ''}${result.finalCredits} CREDITS.` : `BOOKED ${result.finalCredits} CREDITS.`; state.phase = 'result'; } break;
    case 'dismissResult': if (state.phase === 'result') { state.index++; state.preview = null; state.selectedTreatment = null; if (state.index >= state.deck.length) { state.phase = 'quarterClose'; closeQuarter(state); } else state.phase = 'working'; } break;
    case 'chooseOffer': if (state.phase === 'draft') { const offer = state.offers.find(item => item.id === command.offerId); if (offer?.rule) state.rules = [...state.rules, offer.rule].slice(-6); if (offer?.category) state.categories = [...state.categories, offer.category].slice(-5); state.quarter++; state.target = targetFor(state.quarter); state.floor += 10; state.profit = 0; state.index = 0; state.deck = deckFor(state.seed, state.quarter); state.phase = 'report'; state.notice = `Q${state.quarter - 1} FILED. NEXT FORECAST READY.`; } break;
    case 'continueReport': if (state.phase === 'report') { state.phase = 'briefing'; } break;
    case 'restartQuarter': if (state.phase === 'gameOver') { const fresh = createState(state.seed); fresh.quarter = state.quarter; fresh.target = targetFor(state.quarter); fresh.floor = 55 + (state.quarter - 1) * 10; fresh.rules = [...state.rules]; fresh.categories = [...state.categories]; fresh.cash = Math.max(120, state.cash + 40); fresh.audit = Math.max(0, state.audit - 2); fresh.deck = deckFor(state.seed, state.quarter); return fresh; } break;
    case 'restartRun': return createState(command.seed ?? state.seed);
  }
  return state;
}

export function offerLabel(offer: Offer): string { return offer.kind === 'rule' ? `§ ${offer.rule!.name}` : `◇ ${offer.category!.name}`; }
export function tagLabel(tag: Tag): string { return tag.toUpperCase(); }
export { TAGS };
