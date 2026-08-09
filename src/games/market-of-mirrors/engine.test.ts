import { describe, expect, it } from 'vitest';
import { applyCommand, createState, evaluateAction, RECIPES, quote } from './engine';

describe('Market of Mirrors engine', () => {
  it('creates deterministic markets and all 28 recipes', () => {
    const a = createState(1234);
    const b = createState(1234);
    expect(a.market).toEqual(b.market);
    expect(RECIPES).toHaveLength(28);
    expect(new Set(RECIPES.map(recipe => recipe.id)).size).toBe(28);
  });

  it('previews and commits a purchase exactly once', () => {
    let state = createState(7);
    state = applyCommand(state, { type: 'dismissBriefing' });
    const ask = quote(state, 'echo').ask;
    state = applyCommand(state, { type: 'previewAction', action: { type: 'buy', goodId: 'echo' } });
    expect(state.phase).toBe('preview');
    state = applyCommand(state, { type: 'confirmAction' });
    expect(state.cash).toBe(100 - ask);
    expect(state.inventory).toHaveLength(1);
    expect(state.actions).toBe(2);
  });

  it('cancels a preview without spending an action or changing cash', () => {
    let state = createState(7);
    state = applyCommand(state, { type: 'dismissBriefing' });
    state = applyCommand(state, { type: 'previewAction', action: { type: 'buy', goodId: 'echo' } });
    const cash = state.cash;
    state = applyCommand(state, { type: 'cancelPreview' });
    expect(state.phase).toBe('market');
    expect(state.cash).toBe(cash);
    expect(state.actions).toBe(3);
  });

  it('combines two owned lots into a named artifact', () => {
    let state = createState(9);
    state = applyCommand(state, { type: 'dismissBriefing' });
    for (const goodId of ['echo', 'shadow'] as const) {
      state = applyCommand(state, { type: 'previewAction', action: { type: 'buy', goodId } });
      state = applyCommand(state, { type: 'confirmAction' });
    }
    state = applyCommand(state, { type: 'previewAction', action: { type: 'combine', goodId: 'echo', secondGoodId: 'shadow' } });
    expect(state.pending?.artifact?.name).toBe('Quiet Witness');
    state = applyCommand(state, { type: 'confirmAction' });
    expect(state.inventory).toHaveLength(0);
    expect(state.artifacts[0]?.name).toBe('Quiet Witness');
  });

  it('does not move a quote until the closing bell', () => {
    let state = createState(4);
    state = applyCommand(state, { type: 'dismissBriefing' });
    const before = state.market.eclipse!.mid;
    state = applyCommand(state, { type: 'previewAction', action: { type: 'publish', goodId: 'eclipse', frame: 'coveted', intensity: 'broadside' } });
    state = applyCommand(state, { type: 'confirmAction' });
    expect(state.market.eclipse!.mid).toBe(before);
    state = applyCommand(state, { type: 'endDay' });
    expect(state.phase).toBe('bellReport');
    expect(state.lastBell).not.toBeNull();
  });

  it('rejects invalid actions without mutating the market', () => {
    const state = createState(2);
    const result = evaluateAction(state, { type: 'sell', goodId: 'map' });
    expect(result.valid).toBe(false);
    expect(state.cash).toBe(100);
  });

  it('can advance a complete seeded nine-day run', () => {
    let state = createState(88);
    state = applyCommand(state, { type: 'dismissBriefing' });
    while (state.phase !== 'ending') {
      if (state.phase === 'market') {
        if (state.actions > 0) {
          const goodId = state.market.echo!.stock > 0 && state.cash >= quote(state, 'echo').ask ? 'echo' : 'rain';
          const preview = evaluateAction(state, { type: 'buy', goodId });
          if (preview.valid) {
            state = applyCommand(state, { type: 'previewAction', action: { type: 'buy', goodId } });
            state = applyCommand(state, { type: 'confirmAction' });
          } else state = applyCommand(state, { type: 'endDay' });
        } else state = applyCommand(state, { type: 'endDay' });
      } else if (state.phase === 'bellReport') state = applyCommand(state, { type: 'dismissBellReport' });
      else if (state.phase === 'draft') state = applyCommand(state, { type: 'chooseMethod', methodId: state.offers[0]!.id });
      else throw new Error(`unexpected phase ${state.phase}`);
    }
    expect(state.day).toBe(9);
    expect(state.phase).toBe('ending');
  });
});
