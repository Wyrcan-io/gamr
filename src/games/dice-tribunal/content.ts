import type { AdvocateDefinition, AdvocateDie, CaseDefinition, DieFace, EvidenceDefinition, JudgeDefinition, PrecedentDefinition } from './types';

function face(id: string, symbol: DieFace['symbol'], rank: DieFace['rank']): DieFace { return { id, symbol, rank }; }
function die(id: string, name: string, symbols: [DieFace['symbol'], DieFace['symbol'], DieFace['symbol'], DieFace['symbol'], DieFace['symbol'], DieFace['symbol']], ranks: [number, number, number, number, number, number]): AdvocateDie {
  return { id, name, faces: symbols.map((symbol, i) => face(`${id}-${i}`, symbol, symbol === 'gaffe' ? 0 : ranks[i] as 1 | 2 | 3)) as AdvocateDie['faces'] };
}

const balancedDice = (): AdvocateDie[] => [
  die('casebook', 'CASEBOOK', ['fact', 'fact', 'fact', 'law', 'objection', 'gaffe'], [1, 1, 2, 1, 1, 0]),
  die('witness', 'WITNESS', ['witness', 'witness', 'witness', 'fact', 'rhetoric', 'gaffe'], [1, 1, 2, 1, 1, 0]),
  die('statute', 'STATUTE', ['law', 'law', 'law', 'objection', 'fact', 'gaffe'], [1, 1, 2, 1, 1, 0]),
  die('oratory', 'ORATORY', ['rhetoric', 'rhetoric', 'rhetoric', 'witness', 'objection', 'gaffe'], [1, 1, 2, 1, 1, 0]),
  die('clerk', 'CLERK', ['fact', 'witness', 'law', 'rhetoric', 'objection', 'gaffe'], [1, 1, 1, 1, 1, 0]),
];

export const ADVOCATES: AdvocateDefinition[] = [
  { id: 'ada-brief', name: 'ADA BRIEF', title: 'PUBLIC DEFENDER', passive: 'The first CLARIFY each hearing gains +1 Argument.', description: 'A calm generalist with no bad matchup.', dice: balancedDice(), startingEvidence: ['gooseprint', 'tide-chart', 'chronomancer', 'boulder', 'footnotes', 'sandwich', 'stenographer', 'monologue'], standing: 12 },
  { id: 'c-gull', name: 'C. GULL', title: 'SEASIDE COUNSEL', passive: 'The first excess Objection block each hearing becomes up to 2 Argument.', description: 'A maritime litigator who turns defense into momentum.', dice: balancedDice().map(item => item.id === 'statute' ? die('statute', 'STATUTE', ['law', 'law', 'law', 'objection', 'objection', 'gaffe'], [1, 1, 2, 1, 2, 0]) : item), startingEvidence: ['gooseprint', 'tide-chart', 'chronomancer', 'boulder', 'footnotes', 'sandwich', 'stenographer', 'monologue'], standing: 12 },
  { id: 'three-ferrets', name: 'THREE FERRETS', title: 'ONE BAR CARD', passive: 'Once per hearing, a third reroll is allowed; a final Gaffe from it adds double Contempt.', description: 'Three small advocates sharing one extremely large objection.', dice: balancedDice(), startingEvidence: ['gooseprint', 'tide-chart', 'chronomancer', 'boulder', 'footnotes', 'sandwich', 'stenographer', 'monologue'], standing: 12 },
  { id: 'automaton-12b', name: 'AUTOMATON 12-B', title: 'PRECEDENT ENGINE', passive: 'The first exhibit whose ranks exactly meet every slot gains +3 Argument.', description: 'A machine that has never lost an argument with a footnote.', dice: balancedDice(), startingEvidence: ['gooseprint', 'tide-chart', 'chronomancer', 'boulder', 'footnotes', 'sandwich', 'stenographer', 'monologue'], standing: 10 },
];

export const EVIDENCE: EvidenceDefinition[] = [
  { id: 'gooseprint', name: 'NOTARIZED GOOSEPRINT', slots: [{ symbol: 'fact', minRank: 1 }, { symbol: 'witness', minRank: 1 }], baseArgument: 4, tags: ['creature', 'property'], rarity: 'common', text: 'If both ranks match, +2 Argument.' },
  { id: 'tide-chart', name: 'MUNICIPAL TIDE CHART', slots: [{ symbol: 'fact', minRank: 1 }, { symbol: 'law', minRank: 1 }], baseArgument: 4, tags: ['municipal', 'property'], effect: { kind: 'block', amount: 1, text: '+1 block.' }, rarity: 'common', text: '+1 block.' },
  { id: 'chronomancer', name: 'EXPERT CHRONOMANCER', slots: [{ symbol: 'witness', minRank: 2 }, { symbol: 'law', minRank: 1 }], baseArgument: 6, tags: ['temporal', 'occult'], rarity: 'uncommon', text: 'A very punctual witness.' },
  { id: 'boulder', name: 'EMOTIONAL SUPPORT BOULDER', slots: [{ symbol: 'witness', minRank: 1 }, { symbol: 'rhetoric', minRank: 1 }], baseArgument: 4, tags: ['property', 'occult'], effect: { kind: 'reduceContempt', amount: 1, text: '-1 Contempt.' }, rarity: 'common', text: '-1 Contempt.' },
  { id: 'footnotes', name: 'NINE HUNDRED FOOTNOTES', slots: [{ symbol: 'law', minRank: 1 }, { symbol: 'law', minRank: 1 }], baseArgument: 5, tags: ['contract', 'municipal'], rarity: 'common', text: 'Longer than the hearing.' },
  { id: 'sandwich', name: 'DEMONSTRATIVE SANDWICH', slots: [{ symbol: 'fact', minRank: 1 }, { symbol: 'rhetoric', minRank: 1 }], baseArgument: 4, tags: ['contract', 'identity'], effect: { kind: 'argument', amount: 1, text: '+1 Argument in contract cases.' }, rarity: 'common', text: '+1 in contract cases.' },
  { id: 'stenographer', name: 'HOSTILE STENOGRAPHER', slots: [{ symbol: 'objection', minRank: 1 }, { symbol: 'witness', minRank: 1 }], baseArgument: 4, tags: ['labor', 'identity'], effect: { kind: 'block', amount: 2, text: '+2 block.' }, rarity: 'uncommon', text: '+2 block.' },
  { id: 'monologue', name: 'CLOSING MONOLOGUE', slots: [{ symbol: 'rhetoric', minRank: 2 }], baseArgument: 3, tags: ['identity', 'contract'], effect: { kind: 'lastExhibit', amount: 2, text: '+2 if last admitted.' }, rarity: 'common', text: '+2 if last admitted.' },
  { id: 'moon-receipt', name: 'MOON REPOSSESSION RECEIPT', slots: [{ symbol: 'fact', minRank: 2 }, { symbol: 'law', minRank: 1 }], baseArgument: 7, tags: ['property', 'occult'], rarity: 'rare', text: 'Stamped by an office that no longer exists.' },
  { id: 'ghost-petition', name: 'GHOST UNION PETITION', slots: [{ symbol: 'witness', minRank: 1 }, { symbol: 'law', minRank: 2 }], baseArgument: 6, tags: ['labor', 'occult'], effect: { kind: 'reduceContempt', amount: 1, text: '-1 Contempt.' }, rarity: 'uncommon', text: '-1 Contempt.' },
  { id: 'mirror-contract', name: 'MIRROR CONTRACT', slots: [{ symbol: 'law', minRank: 1 }, { symbol: 'rhetoric', minRank: 2 }], baseArgument: 7, tags: ['contract', 'identity'], rarity: 'rare', text: 'Both signatures are technically yours.' },
  { id: 'clock-alibi', name: 'CLOCKMAKER ALIBI', slots: [{ symbol: 'witness', minRank: 2 }, { symbol: 'fact', minRank: 1 }], baseArgument: 6, tags: ['temporal', 'identity'], effect: { kind: 'argument', amount: 1, text: '+1 Argument in temporal cases.' }, rarity: 'uncommon', text: '+1 in temporal cases.' },
  { id: 'municipal-stamp', name: 'MUNICIPAL STAMP', slots: [{ symbol: 'law', minRank: 1 }, { symbol: 'objection', minRank: 1 }], baseArgument: 5, tags: ['municipal', 'property'], effect: { kind: 'block', amount: 1, text: '+1 block.' }, rarity: 'uncommon', text: '+1 block.' },
  { id: 'ferret-charter', name: 'FERRET CHARTER', slots: [{ symbol: 'witness', minRank: 1 }, { symbol: 'rhetoric', minRank: 1 }, { symbol: 'law', minRank: 1 }], baseArgument: 8, tags: ['creature', 'contract'], rarity: 'rare', text: 'Three signatures, one pen.' },
];

export const JUDGES: JudgeDefinition[] = [
  { id: 'pendulum', name: 'HON. PENDULUM', defaultInterpretation: { id: 'pendulum-default', title: 'EVEN-HANDED', text: 'First even-rank Evidence die each hearing adds +1 Argument.', fee: 0 }, alternateInterpretation: { id: 'pendulum-alt', title: 'ODDLY SPECIFIC', text: 'First odd-rank Evidence die adds +1 block instead.', fee: 1 } },
  { id: 'goose', name: 'JUSTICE GOOSE', defaultInterpretation: { id: 'goose-default', title: 'DUPLICATE WITNESS', text: 'First duplicate-symbol exhibit gains +3 Argument.', fee: 0 }, alternateInterpretation: { id: 'goose-alt', title: 'REASONABLE GOOSE', text: 'Every duplicate-symbol exhibit gains +1 Argument.', fee: 1 } },
  { id: 'null', name: 'MAGISTRATE NULL', defaultInterpretation: { id: 'null-default', title: 'MINIMUM DUE PROCESS', text: 'First rank-1 Evidence die gives no overqualification.', fee: 0 }, alternateInterpretation: { id: 'null-alt', title: 'MAXIMUM PAPERWORK', text: 'Rank-1 dice work normally; Pressure is +1.', fee: 1 } },
  { id: 'empty-chair', name: 'THE EMPTY CHAIR', defaultInterpretation: { id: 'empty-default', title: 'ABSENT AUTHORITY', text: 'The first active Precedent does not resolve this case.', fee: 0 }, alternateInterpretation: { id: 'empty-alt', title: 'FULL BENCH', text: 'All Precedents resolve; Contempt limit is 6.', fee: 1 } },
];

export const CASES: CaseDefinition[] = [
  { id: 'moon', title: 'THE BOROUGH v. WHOEVER STOLE THE MOON', client: 'THE BOROUGH', opponent: 'WHOEVER STOLE THE MOON', premise: 'A municipal night-light was removed without a permit.', tags: ['property', 'municipal', 'occult'], circuit: 1, landmark: false, burden: 15, pressure: [2, 3, 4], contemptLimit: 7, judgeIds: ['pendulum', 'goose'], winText: 'The moon is returned on a rolling basis.', lossText: 'Night is declared a zoning violation.' },
  { id: 'umbrella', title: 'ESTATE OF UMBRELLA v. THE RAIN', client: 'THE ESTATE', opponent: 'THE RAIN', premise: 'A sentient umbrella claims weather-related damages.', tags: ['contract', 'property', 'occult'], circuit: 1, landmark: false, burden: 14, pressure: [2, 3, 3], contemptLimit: 7, judgeIds: ['goose', 'null'], winText: 'The rain signs a non-disclosure agreement.', lossText: 'The umbrella is found emotionally porous.' },
  { id: 'geese', title: 'PEOPLE v. SEVERAL GEESE IN A COAT', client: 'THE PEOPLE', opponent: 'SEVERAL GEESE', premise: 'Identity is disputed because the coat is doing most of the work.', tags: ['creature', 'identity'], circuit: 1, landmark: false, burden: 16, pressure: [2, 3, 4], contemptLimit: 7, judgeIds: ['goose', 'pendulum'], winText: 'The coat is admitted as a co-defendant.', lossText: 'The geese request a taller coat.' },
  { id: 'footnote', title: 'IN RE SENTIENT FOOTNOTE', client: 'FOOTNOTE 900', opponent: 'THE MARGIN', premise: 'A citation seeks recognition as a legal person.', tags: ['identity', 'contract', 'municipal'], circuit: 1, landmark: true, burden: 19, pressure: [2, 3, 4, 4], contemptLimit: 7, judgeIds: ['null', 'empty-chair'], winText: 'The footnote receives a tiny birth certificate.', lossText: 'The margin expands and swallows the docket.' },
  { id: 'clock', title: "THE CLOCKMAKER'S ALIBI", client: 'THE CLOCKMAKER', opponent: 'YESTERDAY', premise: 'The witness arrived tomorrow, which is either proof or a scheduling issue.', tags: ['temporal', 'identity'], circuit: 2, landmark: false, burden: 19, pressure: [3, 3, 4], contemptLimit: 7, judgeIds: ['null', 'pendulum'], winText: 'Yesterday is ordered to testify again.', lossText: 'The alibi is filed before the crime.' },
  { id: 'ghosts', title: 'UNION OF GHOSTS v. VACANT PREMISES', client: 'THE GHOST UNION', opponent: 'VACANT PREMISES', premise: 'An empty building refuses to recognize its night shift.', tags: ['labor', 'occult', 'property'], circuit: 2, landmark: false, burden: 20, pressure: [3, 4, 4], contemptLimit: 7, judgeIds: ['empty-chair', 'goose'], winText: 'The building is compelled to provide spectral benefits.', lossText: 'The ghosts haunt the payroll department.' },
  { id: 'sandwich', title: 'THE SANDWICH PERSONHOOD PETITION', client: 'THE SANDWICH', opponent: 'LUNCH', premise: 'The petitioner requests standing, a napkin, and a little respect.', tags: ['identity', 'contract'], circuit: 2, landmark: false, burden: 21, pressure: [3, 4, 5], contemptLimit: 7, judgeIds: ['pendulum', 'null'], winText: 'The sandwich is granted a seat and a side dish.', lossText: 'Lunch is postponed indefinitely.' },
  { id: 'gravity', title: 'CITY OF BELOW v. GRAVITY', client: 'CITY OF BELOW', opponent: 'GRAVITY', premise: 'The city alleges repeated unauthorized downward movement.', tags: ['municipal', 'property', 'occult'], circuit: 2, landmark: true, burden: 25, pressure: [3, 4, 5, 5], contemptLimit: 7, judgeIds: ['empty-chair', 'null'], winText: 'Gravity agrees to a more consultative descent.', lossText: 'The courtroom falls through the floor.' },
  { id: 'tuesday', title: 'DEPARTMENT OF TUESDAY v. THE WEEKEND', client: 'TUESDAY', opponent: 'THE WEEKEND', premise: 'A weekday alleges hostile takeover by leisure.', tags: ['temporal', 'labor', 'municipal'], circuit: 3, landmark: false, burden: 23, pressure: [3, 4, 5], contemptLimit: 7, judgeIds: ['pendulum', 'goose'], winText: 'Tuesday receives a ceremonial weekend.', lossText: 'The week becomes mostly Sunday.' },
  { id: 'nobody', title: "THE LAST WILL OF NOBODY", client: 'NOBODY', opponent: 'EVERYBODY', premise: 'An estate with no testator has several very confident heirs.', tags: ['identity', 'occult', 'contract'], circuit: 3, landmark: false, burden: 24, pressure: [4, 4, 5], contemptLimit: 7, judgeIds: ['goose', 'empty-chair'], winText: 'Nobody inherits a perfectly adequate nothing.', lossText: 'Everybody appeals the absence.' },
  { id: 'reflection', title: 'THE CROWN v. ITS OWN REFLECTION', client: 'THE CROWN', opponent: 'THE CROWN', premise: 'Both parties claim to be the original and neither will stop posing.', tags: ['identity', 'property'], circuit: 3, landmark: true, burden: 30, pressure: [4, 5, 5, 6], contemptLimit: 7, judgeIds: ['empty-chair', 'goose'], winText: 'The court recognizes a second, slightly shinier crown.', lossText: 'The mirror is promoted to Chief Justice.' },
];

export const PRECEDENTS: PrecedentDefinition[] = [
  { id: 'marmot-moon', name: 'MARMOT v. MOON', text: 'First F1 assigned each hearing counts as F2.', stage: 'face' },
  { id: 'echo', name: 'IN RE ECHO', text: 'First Witness exhibit each hearing gains +2 Argument.', stage: 'scoring' },
  { id: 'teapot', name: 'THE TEAPOT DOCTRINE', text: 'An exhibit with matching assigned ranks gains +2 Argument.', stage: 'scoring' },
  { id: 'crown', name: 'CROWN v. CROWN', text: 'Excess Objection block becomes Argument, maximum 3.', stage: 'block' },
  { id: 'clean-hands', name: 'CLEAN HANDS, MOSTLY', text: 'A hearing with no final Gaffe reduces Contempt by 1.', stage: 'contempt' },
  { id: 'footnote-900', name: 'FOOTNOTE 900', text: 'First L1 used in Clarify counts as L3.', stage: 'face' },
  { id: 'harmless-error', name: 'HARMLESS ERROR', text: 'Ignore one pending Gaffe Contempt each case.', stage: 'contempt' },
  { id: 'sandwich', name: 'RES IPSA SANDWICH', text: 'Fact/Rhetoric exhibits gain +2 in contract cases.', stage: 'scoring' },
  { id: 'reasonable-goose', name: 'THE REASONABLE GOOSE', text: 'A perfect hearing restores one reroll next hearing.', stage: 'contempt' },
  { id: 'perpetuities', name: 'AGAINST PERPETUITIES', text: 'Three-slot exhibits gain +3 Argument.', stage: 'scoring' },
  { id: 'quiet-clerk', name: 'QUIET CLERK', text: 'First Clarify each hearing also blocks 1.', stage: 'block' },
  { id: 'adverse-possession', name: 'ADVERSE POSSESSION', text: 'First admitted Property exhibit gains +2 Argument.', stage: 'scoring' },
];

export function advocateById(id: string): AdvocateDefinition | undefined { return ADVOCATES.find(item => item.id === id); }
export function evidenceById(id: string): EvidenceDefinition | undefined { return EVIDENCE.find(item => item.id === id); }
export function judgeById(id: string): JudgeDefinition | undefined { return JUDGES.find(item => item.id === id); }
export function caseById(id: string): CaseDefinition | undefined { return CASES.find(item => item.id === id); }
export function precedentById(id: string): PrecedentDefinition | undefined { return PRECEDENTS.find(item => item.id === id); }
