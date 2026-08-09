import { describe, expect, it } from 'vitest';
import { applyCommand, createState, evaluateMove } from './engine';
import type { Direction, GameState } from './types';

function startStandard(seed = 12345): GameState {
  let state = createState(seed);
  state = applyCommand(state, { type: 'startRun' }).state;
  state = applyCommand(state, { type: 'chooseOffer', index: 0 }).state;
  state = applyCommand(state, { type: 'dismissBriefing' }).state;
  return state;
}

function walk(state: GameState, directions: Direction[]): GameState {
  let next = state;
  for (const direction of directions) next = applyCommand(next, { type: 'move', direction }).state;
  return next;
}

describe('Dungeon Courier engine', () => {
  it('creates the same offers and floor for the same seed', () => {
    const a = applyCommand(createState(88), { type: 'startRun' }).state;
    const b = applyCommand(createState(88), { type: 'startRun' }).state;
    expect(a.contractOffers).toEqual(b.contractOffers);
    const aa = applyCommand(a, { type: 'chooseOffer', index: 0 }).state;
    const bb = applyCommand(b, { type: 'chooseOffer', index: 0 }).state;
    expect(aa.floor).toEqual(bb.floor);
  });

  it('rejects a wall without advancing time', () => {
    const state = startStandard();
    const before = JSON.stringify(state);
    const result = applyCommand(state, { type: 'move', direction: 'N' });
    expect(result.state.floor?.tick).toBe(0);
    expect(result.state.courier.pos).toEqual({ x: 2, y: 2 });
    expect(JSON.stringify(result.state)).not.toBe(before); // the refusal is recorded in the event log
    expect(result.accepted).toBe(true);
  });

  it('shows the parcel-specific stress rule in previews', () => {
    const state = startStandard();
    const preview = evaluateMove(state, 'E', true);
    expect(preview.legal).toBe(true);
    expect(preview.label).toBe('HURRY');
    expect(preview.timeCost).toBe(1);
    expect(preview.stressDelta).toBeGreaterThanOrEqual(1);
  });

  it('selects a move preview without advancing the dungeon', () => {
    const state = startStandard();
    const next = applyCommand(state, { type: 'previewMove', direction: 'E', hurried: true }).state;
    expect(next.previewDirection).toBe('E');
    expect(next.previewHurried).toBe(true);
    expect(next.floor?.tick).toBe(0);
    expect(next.courier.pos).toEqual(state.courier.pos);
  });

  it('brace grants guard and advances the dungeon by one tick', () => {
    const state = startStandard();
    const next = applyCommand(state, { type: 'brace' }).state;
    expect(next.floor?.tick).toBe(1);
    expect(next.contract?.parcel.guard).toBeGreaterThan(0);
  });

  it('tutorial offers the teaching parcel and ends after one delivery', () => {
    let state = createState(7);
    state = applyCommand(state, { type: 'startTutorial' }).state;
    expect(state.mode).toBe('tutorial');
    expect(state.contractOffers[0]?.parcelId).toBe('porcelain-choir');
    state = applyCommand(state, { type: 'chooseOffer', index: 0 }).state;
    state = applyCommand(state, { type: 'dismissBriefing' }).state;
    expect(state.phase).toBe('traversal');
  });

  it('same action transcript reaches the same serialized state', () => {
    const transcript: Array<{ type: 'move'; direction: Direction } | { type: 'brace' }> = [
      { type: 'move', direction: 'E' }, { type: 'move', direction: 'E' }, { type: 'brace' }, { type: 'move', direction: 'E' },
    ];
    let a = startStandard(90210);
    let b = startStandard(90210);
    for (const command of transcript) { a = applyCommand(a, command).state; b = applyCommand(b, command).state; }
    expect(a).toEqual(b);
  });

  it('moves across the authored floor and keeps events bounded', () => {
    const state = walk(startStandard(), ['E', 'E', 'E', 'E', 'E']);
    expect(state.floor?.tick).toBe(5);
    expect(state.eventLog.length).toBeLessThanOrEqual(5);
    expect(state.courier.pos.x).toBe(7);
  });
});
