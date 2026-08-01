export type FaceSymbol = 'fact' | 'witness' | 'law' | 'rhetoric' | 'objection' | 'gaffe';
export type Rank = 1 | 2 | 3;
export type CaseTag = 'property' | 'creature' | 'contract' | 'occult' | 'temporal' | 'municipal' | 'identity' | 'labor';
export type Phase = 'start' | 'advocateSelect' | 'docket' | 'briefing' | 'evidenceSelect' | 'hearing' | 'hearingResult' | 'caseResult' | 'precedentDraft' | 'chambers' | 'circuitReport' | 'gameOver' | 'ending';

export interface DieFace { id: string; symbol: FaceSymbol; rank: Rank | 0; }
export interface AdvocateDie { id: string; name: string; faces: [DieFace, DieFace, DieFace, DieFace, DieFace, DieFace]; }
export interface AdvocateDefinition { id: string; name: string; title: string; description: string; passive: string; dice: AdvocateDie[]; startingEvidence: string[]; standing: number; }

export interface EvidenceSlot { symbol: Exclude<FaceSymbol, 'gaffe'>; minRank: Rank; }
export type EvidenceEffect =
  | { kind: 'argument'; amount: number; text: string }
  | { kind: 'block'; amount: number; text: string }
  | { kind: 'reduceContempt'; amount: number; text: string }
  | { kind: 'lastExhibit'; amount: number; text: string };
export interface EvidenceDefinition { id: string; name: string; slots: EvidenceSlot[]; baseArgument: number; tags: CaseTag[]; effect?: EvidenceEffect; rarity: 'common' | 'uncommon' | 'rare'; text: string; }

export interface Interpretation { id: string; title: string; text: string; fee: number; }
export interface JudgeDefinition { id: string; name: string; defaultInterpretation: Interpretation; alternateInterpretation: Interpretation; }
export interface CaseDefinition { id: string; title: string; client: string; opponent: string; premise: string; tags: CaseTag[]; circuit: 1 | 2 | 3; landmark: boolean; burden: number; pressure: number[]; contemptLimit: number; judgeIds: string[]; winText: string; lossText: string; }
export interface DocketChoice { id: string; caseId: string; judgeId: string; burden: number; pressure: number[]; landmark: boolean; }

export interface RolledDie { dieId: string; faceIndex: number; rerollCount: number; marked: boolean; }
export type AssignmentTarget = { kind: 'evidence'; evidenceId: string; slotIndex: number } | { kind: 'clarify' } | { kind: 'object' };
export interface Assignment { dieId: string; target: AssignmentTarget; }
export interface HearingState { index: number; rolled: RolledDie[]; rerollsRemaining: number; assignments: Assignment[]; }
export interface ActiveCase { definitionId: string; judgeId: string; interpretationId: string; burden: number; pressure: number[]; contemptLimit: number; argument: number; contempt: number; selectedEvidenceIds: string[]; admittedEvidenceIds: string[]; hearing: HearingState; }

export interface HearingPreview { legal: boolean; error?: string; argumentDelta: number; block: number; pressure: number; gaffe: number; contemptDelta: number; finalArgument: number; finalContempt: number; outcome: 'continue' | 'win' | 'sanction' | 'timeout'; admittedEvidenceIds: string[]; trace: string[]; }
export interface CaseRecord { caseId: string; judgeId: string; won: boolean; sanctioned: boolean; argument: number; contempt: number; }
export interface RngStreams { docket: number; roll: number; reward: number; shop: number; flavor: number; }

export type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'chooseAdvocate'; advocateId: string }
  | { type: 'chooseDocket'; choiceId: string }
  | { type: 'chooseInterpretation'; interpretationId: string }
  | { type: 'toggleEvidence'; evidenceId: string }
  | { type: 'confirmCaseFile' }
  | { type: 'roll' }
  | { type: 'toggleRerollMark'; dieId: string }
  | { type: 'rerollMarked' }
  | { type: 'assignDie'; assignment: Assignment }
  | { type: 'unassignDie'; dieId: string }
  | { type: 'commitHearing' }
  | { type: 'continueAfterHearing' }
  | { type: 'continueAfterCase' }
  | { type: 'choosePrecedent'; precedentId: string }
  | { type: 'distinguishOpinions' }
  | { type: 'reorderPrecedent'; from: number; to: number }
  | { type: 'chooseChambersService'; serviceId: string }
  | { type: 'leaveChambers' }
  | { type: 'restart'; seed?: number };

export interface PrecedentDefinition { id: string; name: string; text: string; stage: 'face' | 'scoring' | 'block' | 'contempt'; }
export interface GameState {
  version: 1;
  seed: number;
  rng: RngStreams;
  phase: Phase;
  advocateId: string | null;
  circuit: 1 | 2 | 3;
  caseNumber: number;
  standing: number;
  maxStanding: number;
  fees: number;
  dice: AdvocateDie[];
  evidencePortfolio: string[];
  precedentIds: string[];
  docket: DocketChoice[];
  activeCase: ActiveCase | null;
  rewardOptions: string[];
  chambersUsed: boolean;
  pendingPreview: HearingPreview | null;
  history: CaseRecord[];
  notice: string;
}

export interface CommandResult { state: GameState; events: string[]; error?: string; }
