import { describe, expect, it } from 'vitest';
import { createState, applyCommand, currentEvaluation } from './engine';
import { evaluateMessage, rulesForShift } from './rules';
import { generateShiftDeck, validateDeck } from './generator';
import { PERKS } from './types';

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

  it('validates every release shift across representative seeds', () => {
    for (const seed of [1, 77, 1234, 99991]) {
      for (let shift = 1; shift <= 6; shift++) {
        const deck = generateShiftDeck(seed, shift, false);
        expect(deck).toHaveLength(6 + Math.min(2, shift - 1));
        expect(validateDeck(deck, rulesForShift(shift))).toEqual([]);
      }
    }
  });

  it('only advertises perks with an engine effect', () => {
    expect(PERKS.map(perk => perk.id)).toEqual(['registry-tabs', 'quiet-gloves', 'night-overtime']);
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
