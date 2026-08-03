export type Destination = 'dispatch' | 'express' | 'return' | 'seal';
export type Disposition = 'routine' | 'urgent' | 'forged' | 'cursed';
export type Phase = 'start' | 'briefing' | 'working' | 'audit' | 'perk' | 'report' | 'gameOver' | 'ending';
export type RunMode = 'campaign' | 'tutorial';
export type InspectionView = 'envelope' | 'letter' | 'insert';
export type Seal = 'copper' | 'ivory' | 'violet' | 'black' | 'broken';
export type Postage = 'standard' | 'priority' | 'black-seal';

export type RuleId = string;
export type PerkId = 'registry-tabs' | 'quiet-gloves' | 'night-overtime';
export type CaseThreadId = 'vanishing-postmaster' | 'humming-lamps' | 'ash-ward' | 'ferry-names';

export interface MessageFacts {
  senderId: string;
  senderName: string;
  senderRegistryCode: string | null;
  recipientName: string;
  recipientAddress: string;
  destinationOffice: string;
  issueDate: number;
  deliveryDeadline: number | null;
  postmarkOffice: string;
  seal: Seal;
  postage: Postage;
  bodyText: string;
  bodyClue: string | null;
  anomalies: string[];
}

export interface Message {
  id: string;
  facts: MessageFacts;
  primaryDisposition: Disposition;
  decisiveRuleIds: RuleId[];
  caseThreadId?: CaseThreadId;
}

export interface ActiveRule {
  id: RuleId;
  title: string;
  text: string;
  family: 'registry' | 'address' | 'date' | 'seal' | 'urgency' | 'curse' | 'exception' | 'precedence';
  priority: number;
}

export interface ShiftRules {
  shift: number;
  rules: ActiveRule[];
  examples: string[];
}

export interface EvidenceRef {
  field: string;
  value: string;
}

export interface Evaluation {
  expected: Destination;
  decisiveRuleId: RuleId;
  evidence: EvidenceRef[];
  explanations: string[];
}

export interface DecisionRecord {
  messageId: string;
  selected: Destination;
  expected: Destination;
  correct: boolean;
  evaluation: Evaluation;
}

export interface CaseThreadState {
  id: CaseThreadId;
  title: string;
  progress: number;
  state: 'unseen' | 'protected' | 'compromised' | 'unknown';
}

export interface Perk { id: PerkId; name: string; description: string; }

export interface GameState {
  version: 1;
  seed: number;
  mode: RunMode;
  tutorialStep: number;
  phase: Phase;
  shift: number;
  rules: ShiftRules;
  deck: Message[];
  inboxIndex: number;
  trust: number;
  maxTrust: number;
  score: number;
  standing: number;
  streak: number;
  perks: PerkId[];
  verificationMarks: number;
  inspectionView: InspectionView;
  ledgerOpen: boolean;
  helpOpen: boolean;
  pendingAudit: DecisionRecord | null;
  caseThreads: Record<CaseThreadId, CaseThreadState>;
  history: DecisionRecord[];
  lastNotice: string;
}

export const DESTINATION_LABELS: Record<Destination, string> = {
  dispatch: 'DISPATCH', express: 'EXPRESS', return: 'RETURN', seal: 'SEAL',
};

export const PERKS: Perk[] = [
  { id: 'registry-tabs', name: 'REGISTRY TABS', description: 'Sender codes gain a clear registry marker.' },
  { id: 'quiet-gloves', name: 'QUIET GLOVES', description: 'Correctly sealing a curse restores one Trust once.' },
  { id: 'night-overtime', name: 'NIGHT OVERTIME', description: '+1 Trust, but the next shift has one extra letter.' },
];
