import { CASE_THREADS } from './content';
import { generateShiftDeck } from './generator';
import { evaluateMessage, rulesForShift } from './rules';
import type { CaseThreadId, Destination, GameState, PerkId, ShiftRules } from './types';
import { PERKS } from './types';

export type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'dismissBriefing' }
  | { type: 'chooseDestination'; destination: Destination }
  | { type: 'dismissAudit' }
  | { type: 'toggleLedger' }
  | { type: 'toggleHelp' }
  | { type: 'cycleInspectionView' }
  | { type: 'useVerification' }
  | { type: 'choosePerk'; perkId: PerkId }
  | { type: 'continueReport' }
  | { type: 'restart'; seed?: number };

export interface CommandResult { events: string[]; state: GameState; }

function threadStates(): GameState['caseThreads'] {
  return (Object.keys(CASE_THREADS) as CaseThreadId[]).reduce((all, id) => {
    all[id] = { id, title: CASE_THREADS[id].title, progress: 0, state: 'unseen' };
    return all;
  }, {} as GameState['caseThreads']);
}

export function createState(seed: number = Date.now(), shift = 1, perks: PerkId[] = []): GameState {
  const maxTrust = 4 + (perks.includes('night-overtime') ? 1 : 0);
  return {
    version: 1,
    seed: seed >>> 0,
    mode: 'campaign',
    tutorialStep: 0,
    phase: 'start',
    shift,
    rules: rulesForShift(shift),
    deck: generateShiftDeck(seed >>> 0, shift, perks.includes('night-overtime')),
    inboxIndex: 0,
    trust: maxTrust,
    maxTrust,
    score: 0,
    standing: 50,
    streak: 0,
    perks: [...perks],
    verificationMarks: 2,
    inspectionView: 'envelope',
    ledgerOpen: false,
    helpOpen: false,
    pendingAudit: null,
    caseThreads: threadStates(),
    history: [],
    lastNotice: 'READ THE BULLETIN. EVERY LETTER NEEDS A DESTINATION.',
  };
}

export function currentMessage(state: GameState) {
  return state.deck[state.inboxIndex];
}

export function currentEvaluation(state: GameState) {
  const message = currentMessage(state);
  return message ? evaluateMessage(message.facts, state.rules) : null;
}

function destinationForDisposition(disposition: GameState['deck'][number]['primaryDisposition']): Destination {
  return disposition === 'routine' ? 'dispatch' : disposition === 'urgent' ? 'express' : disposition === 'forged' ? 'return' : 'seal';
}

function advanceToNextShift(state: GameState, perk: PerkId | undefined): void {
  const nextPerks = perk && !state.perks.includes(perk) ? [...state.perks, perk] : [...state.perks];
  const nextShift = state.shift + 1;
  state.shift = nextShift;
  state.perks = nextPerks;
  state.rules = rulesForShift(nextShift);
  state.deck = generateShiftDeck(state.seed + (nextShift - 1) * 7919, nextShift, nextPerks.includes('night-overtime'));
  state.inboxIndex = 0;
  state.trust = 4 + (nextPerks.includes('night-overtime') ? 1 : 0);
  state.maxTrust = state.trust;
  state.verificationMarks = 2;
  state.pendingAudit = null;
  state.phase = 'briefing';
  state.lastNotice = `SHIFT ${String(nextShift).padStart(2, '0')} BRIEFING READY.`;
}

function updateThread(state: GameState, threadId: CaseThreadId | undefined, correct: boolean): void {
  if (!threadId) return;
  const thread = state.caseThreads[threadId];
  if (!thread) return;
  thread.progress++;
  thread.state = correct ? 'protected' : 'compromised';
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  const events: string[] = [];
  switch (command.type) {
    case 'startCampaign': {
      const fresh = createState(command.seed ?? state.seed);
      fresh.mode = 'campaign';
      fresh.tutorialStep = 0;
      fresh.phase = 'briefing';
      fresh.lastNotice = 'SHIFT 01: LEARN THE DESTINATIONS.';
      return { state: fresh, events: ['start'] };
    }
    case 'startTutorial': {
      const fresh = createState(state.seed, 1, []);
      fresh.mode = 'tutorial';
      fresh.tutorialStep = 0;
      fresh.phase = 'briefing';
      fresh.lastNotice = 'INDUCTION: THE FOUR DESKS ARE WAITING.';
      return { state: fresh, events: ['tutorial'] };
    }
    case 'restart': {
      const fresh = createState(command.seed ?? state.seed);
      fresh.mode = state.mode;
      fresh.tutorialStep = 0;
      fresh.phase = 'briefing';
      return { state: fresh, events: ['restart'] };
    }
    case 'dismissBriefing':
      if (state.phase === 'briefing') { state.phase = 'working'; state.lastNotice = 'INBOX OPEN. INSPECT THE NEXT LETTER.'; events.push('work'); }
      break;
    case 'toggleLedger':
      if (state.phase === 'working' || state.phase === 'audit') state.ledgerOpen = !state.ledgerOpen;
      break;
    case 'toggleHelp': state.helpOpen = !state.helpOpen; break;
    case 'cycleInspectionView':
      state.inspectionView = state.inspectionView === 'envelope' ? 'letter' : state.inspectionView === 'letter' ? 'insert' : 'envelope';
      break;
    case 'useVerification': {
      if (state.phase !== 'working' || state.verificationMarks <= 0) break;
      const evaluation = currentEvaluation(state);
      if (!evaluation) break;
      state.verificationMarks--;
      state.lastNotice = `VERIFICATION: ${evaluation.expected.toUpperCase()} — ${evaluation.explanations[0]}`;
      events.push('verify');
      break;
    }
    case 'chooseDestination': {
      if (state.phase !== 'working') break;
      const message = currentMessage(state);
      if (!message) break;
      const evaluation = evaluateMessage(message.facts, state.rules);
      const correct = evaluation.expected === command.destination;
      const record = { messageId: message.id, selected: command.destination, expected: evaluation.expected, correct, evaluation };
      state.pendingAudit = record;
      state.history.push(record);
      if (correct) {
        state.score += 100 + state.streak * 10;
        state.streak++;
        state.standing = Math.min(100, state.standing + 1);
        state.lastNotice = `ACCEPTED: ${command.destination.toUpperCase()}.`;
        events.push('correct');
        updateThread(state, message.caseThreadId, true);
        if (command.destination === 'seal' && state.perks.includes('quiet-gloves') && state.trust < state.maxTrust && !state.history.slice(0, -1).some(item => item.correct && item.selected === 'seal')) state.trust++;
      } else {
        state.trust--;
        state.streak = 0;
        state.standing = Math.max(0, state.standing - 4);
        state.lastNotice = `AUDIT FLAG: ${evaluation.explanations[0]}`;
        events.push('wrong');
        updateThread(state, message.caseThreadId, false);
      }
      state.phase = 'audit';
      break;
    }
    case 'dismissAudit':
      if (state.phase !== 'audit') break;
      if (state.mode === 'tutorial') {
        state.tutorialStep = Math.min(6, state.tutorialStep + 1);
      }
      state.pendingAudit = null;
      state.inboxIndex++;
      if (state.trust <= 0) { state.phase = 'gameOver'; state.lastNotice = 'TRUST EXHAUSTED — THE DESK IS UNDER AUDIT.'; events.push('lost'); }
      else if (state.inboxIndex >= state.deck.length) { state.phase = 'report'; state.lastNotice = `SHIFT ${String(state.shift).padStart(2, '0')} COMPLETE.`; events.push('report'); }
      else { state.phase = 'working'; }
      break;
    case 'continueReport':
      if (state.phase !== 'report') break;
      if (state.mode === 'tutorial') { state.phase = 'ending'; state.lastNotice = 'INDUCTION COMPLETE. THE DESK IS YOURS.'; events.push('tutorialComplete'); }
      else if (state.shift >= 6) { state.phase = 'ending'; events.push('ending'); }
      else { state.phase = 'perk'; state.lastNotice = 'CHOOSE ONE OFFICE PERK FOR THE NEXT SHIFT.'; events.push('perk'); }
      break;
    case 'choosePerk':
      if (state.phase === 'perk' && PERKS.some(perk => perk.id === command.perkId)) {
        advanceToNextShift(state, command.perkId);
        events.push('next-shift');
      }
      break;
    default:
      break;
  }
  return { state, events };
}

export function availablePerks(state: GameState): typeof PERKS {
  const start = (state.seed + state.shift * 17) % PERKS.length;
  return [0, 1, 2].map(offset => PERKS[(start + offset) % PERKS.length]);
}

export function destinationForCurrent(state: GameState): Destination | null {
  const message = currentMessage(state);
  return message ? destinationForDisposition(message.primaryDisposition) : null;
}

export function rulesText(rules: ShiftRules): string[] {
  return rules.rules.filter(rule => rule.family !== 'precedence').map(rule => `${rule.title}: ${rule.text}`);
}
