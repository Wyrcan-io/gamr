import { describe, expect, it } from 'vitest';
import { applyCommand, createState, projectTurn } from './engine';

function planning(seed = 7) { let state = createState(seed); state = applyCommand(state, { type: 'startCampaign', seed }).state; state = applyCommand(state, { type: 'dismissBriefing' }).state; return state; }

describe('Last Train Home deterministic railway engine', () => {
  it('creates identical seeded scenarios', () => {
    const a = createState(42); const b = createState(42);
    expect(a.scenario.tiles).toEqual(b.scenario.tiles); expect(a.trains).toEqual(b.trains); expect(a.forecast).toEqual(b.forecast);
  });

  it('moves trains exactly one segment per committed turn', () => {
    const state = planning(); const before = { ...state.trains.A.position };
    const result = applyCommand(state, { type: 'commitTurn' });
    expect(result.state.trains.A.position.x - before.x).toBe(1); expect(result.state.turn).toBe(2);
  });

  it('spends AP for a hold and restores AP after commit', () => {
    const state = planning(); state.selected = { kind: 'train', trainId: 'A' };
    applyCommand(state, { type: 'holdTrain' }); expect(state.actionPoints).toBe(1); expect(state.trains.A.position.x).toBe(1);
    applyCommand(state, { type: 'commitTurn' }); expect(state.trains.A.position.x).toBe(1); expect(state.actionPoints).toBe(2);
  });

  it('does not spend AP on an invalid repair', () => {
    const state = planning(); state.selected = { kind: 'tile', point: { x: 1, y: 5 } };
    applyCommand(state, { type: 'repair' }); expect(state.actionPoints).toBe(2);
  });

  it('resolves a scheduled closure after movement', () => {
    const state = planning(); state.turn = 3; state.selected = { kind: 'tile', point: { x: 11, y: 5 } };
    applyCommand(state, { type: 'repair' }); expect(state.scenario.tiles[5][11].reinforced).toBe(true);
    state.turn = 4; applyCommand(state, { type: 'commitTurn' }); expect(state.scenario.tiles[5][11].closed).toBe(false);
  });

  it('keeps the pre-commit train projection aligned with the committed turn', () => {
    const projectedState = planning(31);
    const projection = projectTurn(projectedState);
    const committed = planning(31);
    applyCommand(committed, { type: 'commitTurn' });
    for (const train of projection.trains) {
      const actual = committed.trains[train.id]!;
      if (train.outcome === 'move' || train.outcome === 'arrive') expect(actual.position).toEqual(train.to);
      if (train.outcome === 'block') expect(actual.status).toBe('blocked');
    }
  });
});
