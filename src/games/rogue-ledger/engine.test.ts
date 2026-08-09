import { describe, expect, it } from 'vitest';
import { applyCommand, createState, currentTransaction, evaluateEntry } from './engine';

describe('Rogue Ledger engine', () => {
  it('generates the same opening books for the same seed', () => {
    expect(createState(42)).toEqual(createState(42));
    expect(createState(42).deck).not.toEqual(createState(43).deck);
  });

  it('previews and commits an allowed treatment exactly once', () => {
    let state = createState(42);
    state = applyCommand(state, { type: 'dismissBriefing' });
    const transaction = currentTransaction(state)!;
    state = applyCommand(state, { type: 'selectTreatment', treatment: transaction.allowedTreatments[0]! });
    const preview = state.preview!;
    state = applyCommand(state, { type: 'confirmEntry' });
    expect(state.cash).toBe(120 + preview.finalCredits);
    expect(state.history).toHaveLength(1);
    expect(state.lastResult).toEqual(preview);
  });

  it('cancels a preview before the accounting entry is committed', () => {
    let state = createState(42);
    state = applyCommand(state, { type: 'dismissBriefing' });
    const treatment = currentTransaction(state)!.allowedTreatments[0]!;
    state = applyCommand(state, { type: 'selectTreatment', treatment });
    const cash = state.cash;
    state = applyCommand(state, { type: 'cancelPreview' });
    expect(state.phase).toBe('working');
    expect(state.cash).toBe(cash);
    expect(state.history).toHaveLength(0);
  });

  it('capitalization creates a visible future liability', () => {
    const state = createState(42);
    const expense = state.deck.find(transaction => transaction.baseCredits < 0 && transaction.allowedTreatments.includes('capitalize'))!;
    const result = evaluateEntry(state, expense, 'capitalize');
    expect(result.liabilities).toHaveLength(1);
    expect(result.trace.some(line => line.startsWith('↳ LIABILITY'))).toBe(true);
  });

  it('rejects treatments that a transaction does not offer', () => {
    const state = createState(42);
    const income = state.deck.find(transaction => transaction.baseCredits > 0)!;
    expect(() => evaluateEntry(state, income, 'capitalize')).toThrow('Treatment is not allowed');
  });

  it('lets the four-entry induction finish without imposing the standard target', () => {
    let state = createState(42, 'tutorial');
    expect(state.target).toBe(0);
    state = applyCommand(state, { type: 'dismissBriefing' });
    for (let index = 0; index < 4; index += 1) {
      state = applyCommand(state, { type: 'selectTreatment', treatment: 'decline' });
      state = applyCommand(state, { type: 'confirmEntry' });
      state = applyCommand(state, { type: 'dismissResult' });
    }
    expect(state.phase).toBe('ending');
    expect(state.notice).toContain('INDUCTION COMPLETE');
  });
});
