import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';
import type { GameState } from './types';

function command(state: GameState, input: Parameters<typeof applyCommand>[1]): GameState {
  return applyCommand(state, input).state;
}

describe('The 13th Lift engine', () => {
  it('opens a ride, evaluates a safe route, and advances', () => {
    let state = createState(42);
    state = command(state, { type: 'startCampaign', seed: 42 });
    expect(state.phase).toBe('briefing');
    state = command(state, { type: 'dismissBriefing' });
    expect(state.phase).toBe('planning');
    for (const button of state.puzzle!.safeRoutes[0]) {
      state.selectedButtonIndex = state.puzzle!.panel.findIndex(item => item.id === button);
      state = command(state, { type: 'toggleStop' });
    }
    state = command(state, { type: 'commitRoute' });
    expect(state.phase).toBe('transit');
    state = command(state, { type: 'finishTransit' });
    expect(state.phase).toBe('audit');
    expect(state.lastEvaluation?.correct).toBe(true);
    state = command(state, { type: 'dismissAudit' });
    expect(['planning', 'interlude']).toContain(state.phase);
  });

  it('charges and reveals an intercom hint', () => {
    let state = command(createState(8), { type: 'startCampaign', seed: 8 });
    state = command(state, { type: 'dismissBriefing' });
    const charges = state.intercomCharges;
    state = command(state, { type: 'requestHint' });
    expect(state.activeOverlay).toBe('hint-confirm');
    state = command(state, { type: 'confirmHint' });
    expect(state.intercomCharges).toBe(charges - 1);
    expect(state.notice).toContain('INTERCOM');
  });

  it('requires protected threads for the operator ending', () => {
    let state = command(createState(9), { type: 'startCampaign', seed: 9 });
    state.phase = 'finale';
    const rejected = applyCommand(state, { type: 'chooseFinale', choiceId: 'operator' });
    expect(rejected.rejection).toContain('OPERATOR KEY');
    state.threads['missing-operator'].state = 'protected';
    state.threads['deleted-census'].state = 'protected';
    state = command(state, { type: 'chooseFinale', choiceId: 'operator' });
    expect(state.phase).toBe('ending');
    expect(state.endingId).toBe('operator');
  });
});
