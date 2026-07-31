import { describe, expect, it } from 'vitest';
import { createState, applyCommand, currentEvaluation } from './engine';
import { evaluateMessage, rulesForShift } from './rules';
import { generateShiftDeck, validateDeck } from './generator';

describe('Dead Letter Department rules', () => {
  it('uses curse precedence over urgency', () => {
    const rules = rulesForShift(5);
    const message = generateShiftDeck(77, 5, false).find(item => item.primaryDisposition === 'cursed');
    expect(message).toBeDefined();
    const evaluation = evaluateMessage(message!.facts, rules);
    expect(evaluation.expected).toBe('seal');
    expect(evaluation.evidence.length).toBeGreaterThan(0);
  });

  it('generates deterministic, valid decks', () => {
    const first = generateShiftDeck(1234, 4, false);
    const second = generateShiftDeck(1234, 4, false);
    expect(first).toEqual(second);
    expect(validateDeck(first, rulesForShift(4))).toEqual([]);
  });
});

describe('Dead Letter Department flow', () => {
  it('advances a decision to an audit and then the next letter', () => {
    let state = createState(42);
    state = applyCommand(state, { type: 'startCampaign', seed: 42 }).state;
    state = applyCommand(state, { type: 'dismissBriefing' }).state;
    const evaluation = currentEvaluation(state)!;
    state = applyCommand(state, { type: 'chooseDestination', destination: evaluation.expected }).state;
    expect(state.phase).toBe('audit');
    state = applyCommand(state, { type: 'dismissAudit' }).state;
    expect(state.inboxIndex).toBe(1);
    expect(state.history[0].correct).toBe(true);
  });
});
