import type { CaseThreadId, MessageFacts, Seal } from './types';

export interface Sender {
  id: string;
  name: string;
  code: string;
  office: string;
}

export const SENDERS: Sender[] = [
  { id: 'hollow-ferry', name: 'HOLLOW FERRY CO.', code: 'HFC-77', office: 'FERRY OFFICE' },
  { id: 'kestrel', name: 'KESTREL & SONS', code: 'KES-41', office: 'GUILD REGISTRY' },
  { id: 'ash-hospital', name: 'ASH WARD HOSPITAL', code: 'AWH-12', office: 'ASH WARD' },
  { id: 'night-court', name: 'NIGHT COURT CLERKS', code: 'NCC-08', office: 'NIGHT COURT' },
  { id: 'glass-observatory', name: 'GLASS OBSERVATORY', code: 'GLO-55', office: 'OBSERVATORY' },
  { id: 'morrow-archive', name: 'MORROW ARCHIVE', code: 'MAR-19', office: 'ARCHIVE' },
];

export const RECIPIENTS = [
  ['MIRA SOL', '8 HUSH QUAY // FOG-2', 'FOG OFFICE'],
  ['DR. IONE VELL', '12 LANTERN ST // ASH-9', 'ASH WARD'],
  ['P. RUSK', '1 CLOCK GATE // NIGHT-1', 'NIGHT COURT'],
  ['ORRIN VALE', '4 GLASS ROW // OBS-4', 'OBSERVATORY'],
  ['T. KESTREL', '21 RIVER END // FERRY-3', 'FERRY OFFICE'],
] as const;

export const POSTMARKS = ['FOG OFFICE', 'MOONWAX DEPOT', 'ASH WARD', 'NIGHT COURT', 'ARCHIVE'];
export const SEALS: Seal[] = ['copper', 'ivory', 'violet', 'black', 'broken'];
export const BODY_TEMPLATES = [
  'The replacement lamps are ready. Please return the old glass by first collection.',
  'The attached figures agree with our ledger. A reply may wait until the next bell.',
  'The ferry has returned without a crew. Their names are still taking seats.',
  'Please deliver the enclosed key before the stated deadline. Do not copy this notice.',
  'The fog has lifted from the eastern quay. Accounts may proceed as ordinary.',
  'If this reaches you, the postmaster was not the first person to sign it.',
  'The court requests the witness register. It is important that nobody opens the fold.',
  'A quiet correction: the previous address was written by someone using my hand.',
];

export const CASE_THREADS: Record<CaseThreadId, { title: string; clue: string }> = {
  'vanishing-postmaster': { title: 'THE VANISHING POSTMASTER', clue: 'The postmaster’s signature is being copied one stroke at a time.' },
  'humming-lamps': { title: 'THE HUMMING LAMPS', clue: 'Ash Ward lamps have begun answering invoices.' },
  'ash-ward': { title: 'ASH WARD / NIGHT TRANSFER', clue: 'A valid medical route keeps moving after its recipient dies.' },
  'ferry-names': { title: 'THE FERRY NAMES', clue: 'The Hollow Ferry manifest lists passengers who have no shadows.' },
};

export function cloneFacts(facts: MessageFacts): MessageFacts {
  return { ...facts, anomalies: [...facts.anomalies] };
}
