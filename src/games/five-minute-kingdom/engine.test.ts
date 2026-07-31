import { describe, expect, it } from 'vitest';
import { applyCommand, createState, evaluate, legalTarget } from './engine';

describe('Five-Minute Kingdom engine', () => {
  it('generates deterministic markets for a seed', () => {
    const a = createState(12345);
    const b = createState(12345);
    expect(a.market).toEqual(b.market);
    expect(a.board).toEqual(b.board);
  });

  it('requires a compatible home for citizens', () => {
    let state = createState(7);
    state = applyCommand(state, { type: 'dismissBriefing' });
    state = applyCommand(state, { type: 'selectOffer', index: 2 });
    expect(state.selectedOffer?.kind).toBe('citizen');
    expect(legalTarget(state, state.selectedOffer, { x: 0, y: 0 }).legal).toBe(false);
  });

  it('preview and confirmation award the same placement score', () => {
    let state = createState(9);
    state = applyCommand(state, { type: 'dismissBriefing' });
    state = applyCommand(state, { type: 'selectOffer', index: 0 });
    const target = state.target;
    state = applyCommand(state, { type: 'preview' });
    expect(state.phase).toBe('preview');
    const projected = state.preview?.glory ?? 0;
    state = applyCommand(state, { type: 'confirm' });
    expect(state.glory).toBe(projected);
    expect(state.board[target.y]![target.x]!.terrain).not.toBeNull();
  });

  it('rejects occupied terrain targets without changing the board', () => {
    const state = createState(2);
    const offer = state.market[0]!;
    expect(offer.kind).toBe('terrain');
    const resolution = evaluate(state, offer, { x: 2, y: 2 });
    expect(resolution.legal).toBe(false);
    expect(resolution.reason).toContain('occupied');
  });
});
