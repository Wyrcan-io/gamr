import { describe, expect, it } from 'vitest';
import { applyCommand, createState, planningComparison } from './engine';

function planning(seed: number) {
  let state = applyCommand(createState(seed), { type: 'start', mode: 'campaign' });
  return applyCommand(state, { type: 'dismissBriefing' });
}

describe('The Quiet Heist engine', () => {
  it('keeps guard forecasts deterministic until commit', () => {
    let state = planning(1234);
    const before = JSON.stringify(state.forecast);
    state = applyCommand(state, { type: 'decoy' });
    expect(state.pending).toHaveLength(1);
    expect(state.forecast).not.toEqual(JSON.parse(before));
    state = applyCommand(state, { type: 'openReview' });
    const resolved = applyCommand(state, { type: 'commit' });
    expect(resolved.turn).toBe(2);
    expect(resolved.incidents.some(i => i.text.includes('G1'))).toBe(true);
  });

  it('allows the quiet key objective to advance without raising alarm', () => {
    let state = planning(7);
    state = applyCommand(state, { type: 'move', direction: 'N' });
    state = applyCommand(state, { type: 'move', direction: 'E' });
    state = applyCommand(state, { type: 'openReview' });
    state = applyCommand(state, { type: 'commit' });
    state = applyCommand(state, { type: 'dismissReport' });
    state = applyCommand(state, { type: 'move', direction: 'E' });
    state = applyCommand(state, { type: 'interact' });
    expect(state.keyTaken).toBe(true);
    expect(state.objective).toBe('case');
    expect(state.alarm).toBe(0);
  });

  it('undoes only the uncommitted planning turn', () => {
    let state = planning(99);
    const start = { ...state.player };
    state = applyCommand(state, { type: 'move', direction: 'N' });
    state = applyCommand(state, { type: 'undo' });
    expect(state.player).toEqual(start);
    state = applyCommand(state, { type: 'move', direction: 'N' });
    state = applyCommand(state, { type: 'openReview' });
    state = applyCommand(state, { type: 'commit' });
    expect(state.turn).toBe(2);
    expect(applyCommand(state, { type: 'undo' })).toEqual(state);
  });

  it('keeps NOW separate from the planned state', () => {
    let state = planning(123);
    const before = JSON.stringify(state);
    state = applyCommand(state, { type: 'move', direction: 'N' });
    const comparison = planningComparison(state);
    expect(JSON.stringify(comparison.current.player)).toBe(JSON.stringify({ x: 1, y: 6 }));
    expect(comparison.planned.player).not.toEqual(comparison.current.player);
    expect(JSON.stringify(state)).not.toBe(before);
  });

  it('starts at a reachable title and supports tutorial mode', () => {
    let state = createState(5);
    expect(state.phase).toBe('start');
    state = applyCommand(state, { type: 'start', mode: 'tutorial' });
    expect(state.mode).toBe('tutorial');
    expect(state.phase).toBe('briefing');
  });
});
