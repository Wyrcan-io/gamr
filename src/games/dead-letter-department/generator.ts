import { BODY_TEMPLATES, CASE_THREADS, RECIPIENTS, SENDERS, POSTMARKS, SEALS } from './content';
import { evaluateMessage, rulesForShift } from './rules';
import { makeRng, pick, seededValue } from './seed';
import type { Disposition, GameState, Message, MessageFacts, ShiftRules } from './types';

const dispositions: Disposition[] = ['routine', 'urgent', 'forged', 'cursed'];
function countForShift(shift: number, extra: boolean): number {
  return 9 + Math.min(5, shift) + (extra ? 1 : 0);
}

function makeFacts(shift: number, disposition: Disposition, index: number, rng: () => number): MessageFacts {
  const sender = pick(SENDERS, rng);
  const recipient = pick(RECIPIENTS, rng);
  const template = pick(BODY_TEMPLATES, rng);
  const issueDate = shift;
  const facts: MessageFacts = {
    senderId: sender.id,
    senderName: sender.name,
    senderRegistryCode: sender.code,
    recipientName: recipient[0],
    recipientAddress: recipient[1],
    destinationOffice: recipient[2],
    issueDate,
    deliveryDeadline: disposition === 'urgent' ? 1 + (index % 2) : null,
    postmarkOffice: pick(POSTMARKS, rng),
    seal: recipient[2] === 'ASH WARD' ? 'ivory' : pick(SEALS.slice(0, 3), rng),
    postage: disposition === 'urgent' ? 'priority' : 'standard',
    bodyText: template,
    bodyClue: null,
    anomalies: [],
  };
  if (disposition === 'forged') {
    switch (index % 3) {
      case 0: facts.senderRegistryCode = sender.code.slice(0, -1) + 'X'; break;
      case 1: facts.recipientAddress = facts.recipientAddress.replace(/\w+-\d+$/, 'WRONG-0'); break;
      default: facts.issueDate = shift - 8; break;
    }
    facts.bodyClue = 'The lower stamp has been scraped and pressed again.';
  } else if (disposition === 'cursed') {
    const curse = shift >= 5 ? index % 4 : index % 3;
    if (curse === 0 || shift < 4) facts.seal = 'black';
    else if (curse === 1) { facts.bodyText += ' OPEN ME LAST'; facts.bodyClue = 'The final line repeats when folded.'; }
    else if (curse === 2) facts.recipientName = 'THE READER';
    else { facts.anomalies.push('missing-shadow'); facts.bodyClue = 'The envelope casts no shadow under the desk lamp.'; }
    if (shift >= 5 && index % 2 === 0) facts.deliveryDeadline = 1;
  }
  return facts;
}

export function validateDeck(deck: Message[], rules: ShiftRules): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const message of deck) {
    if (ids.has(message.id)) issues.push('duplicate message id ' + message.id);
    ids.add(message.id);
    const evaluation = evaluateMessage(message.facts, rules);
    const expected = message.primaryDisposition === 'routine' ? 'dispatch' : message.primaryDisposition === 'urgent' ? 'express' : message.primaryDisposition === 'forged' ? 'return' : 'seal';
    if (evaluation.expected !== expected) issues.push(message.id + ' expected ' + expected + ' got ' + evaluation.expected);
    if (!evaluation.evidence.length) issues.push(message.id + ' has no visible evidence');
  }
  return issues;
}

export function generateShiftDeck(seed: number, shift: number, extra: boolean): Message[] {
  const rules = rulesForShift(shift);
  const rng = makeRng(seed ^ Math.imul(shift, 0x1f123bb5));
  const total = countForShift(shift, extra);
  const deck: Message[] = [];
  let attempts = 0;
  while (deck.length < total && attempts++ < total * 30) {
    const index = deck.length;
    const available = shift === 1 ? dispositions.slice(0, 3) : dispositions;
    let disposition = available[index % available.length];
    if (shift === 1 && index < 2) disposition = index === 0 ? 'routine' : 'urgent';
    const facts = makeFacts(shift, disposition, index, rng);
    const message: Message = {
      id: `shift-${String(shift).padStart(2, '0')}-mail-${String(index + 1).padStart(2, '0')}`,
      facts,
      primaryDisposition: disposition,
      decisiveRuleIds: [],
      caseThreadId: index % 5 === 0 ? (Object.keys(CASE_THREADS)[Math.floor(seededValue(seed, shift * 100 + index) * 4)] as Message['caseThreadId']) : undefined,
    };
    const evaluation = evaluateMessage(facts, rules);
    const expected = disposition === 'routine' ? 'dispatch' : disposition === 'urgent' ? 'express' : disposition === 'forged' ? 'return' : 'seal';
    if (evaluation.expected !== expected) continue;
    message.decisiveRuleIds = [evaluation.decisiveRuleId];
    deck.push(message);
  }
  if (deck.length < total) throw new Error(`Unable to generate fair mail deck for seed ${seed}, shift ${shift}`);
  const issues = validateDeck(deck, rules);
  if (issues.length) throw new Error('Invalid generated deck: ' + issues.join('; '));
  return deck;
}

export function createInitialDeck(seed: number): Message[] {
  return generateShiftDeck(seed, 1, false);
}

export function nextShiftDeck(state: Pick<GameState, 'seed' | 'shift' | 'perks'>): Message[] {
  return generateShiftDeck(state.seed + state.shift * 7919, state.shift, state.perks.includes('night-overtime'));
}
