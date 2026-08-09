import { describe, expect, it } from 'vitest';
import { applyCommand, candidateStats, confidenceFor, createState } from './engine';
import type { GameState } from './types';

function command(state: GameState, input: Parameters<typeof applyCommand>[1]): GameState { return applyCommand(state, input).state; }

describe('Night Frequency engine', () => {
  it('opens the deterministic caller → response → music → work loop', () => {
    let state = createState(7);
    state = command(state, { type: 'start', mode: 'campaign' });
    expect(state.phase).toBe('brief');
    state = command(state, { type: 'continueBrief' });
    expect(state.phase).toBe('caller');
    state = command(state, { type: 'chooseCaller', index: 0 });
    expect(state.phase).toBe('response');
    state = command(state, { type: 'chooseResponse', index: 0 });
    expect(state.phase).toBe('music');
    expect(state.dossier.evidence.map(item => item.id)).toContain('clock-bus');
    state = command(state, { type: 'chooseTrack', index: 0 });
    expect(state.phase).toBe('workbench');
    state = command(state, { type: 'work', action: 'verify' });
    expect(state.phase).toBe('caller');
    expect(state.dossier.evidence[0].status).toBe('verified');
    expect(state.round).toBe(1);
  });

  it('rejects work that costs more than the chosen song provides without advancing time', () => {
    let state = createState(8);
    state = command(state, { type: 'start', mode: 'campaign' });
    state = command(state, { type: 'continueBrief' });
    state = command(state, { type: 'chooseCaller', index: 0 });
    state = command(state, { type: 'chooseResponse', index: 0 });
    state = command(state, { type: 'chooseTrack', index: 1 }); // one-unit antenna record
    expect(state.workUnits).toBe(1);
    const result = applyCommand(state, { type: 'work', action: 'verify' });
    expect(result.rejection).toContain('ONLY LEAVES 1');
    expect(result.state.round).toBe(state.round);
    expect(result.state.phase).toBe('workbench');
  });

  it('verifies the evidence item explicitly targeted on the workbench', () => {
    let state = createState(13);
    state = command(state, { type: 'start', mode: 'campaign' });
    state = command(state, { type: 'continueBrief' });
    state = command(state, { type: 'chooseCaller', index: 0 });
    state = command(state, { type: 'chooseResponse', index: 0 });
    state = command(state, { type: 'chooseTrack', index: 0 });
    const item = state.dossier.evidence.find(value => value.status === 'unverified');
    expect(item).toBeDefined();
    state = command(state, { type: 'selectEvidence', evidenceId: item!.id });
    state = command(state, { type: 'work', action: 'verify' });
    expect(state.dossier.evidence.find(value => value.id === item!.id)?.status).toBe('verified');
  });

  it('counts only the strongest item from a source group', () => {
    const state = createState(9);
    state.dossier.evidence = [
      { id: 'a', title: 'A', summary: '', slot: 'operator', candidateId: 'halcyon', sourceGroup: 'same', reliability: 3, status: 'verified', acquiredRound: 0 },
      { id: 'b', title: 'B', summary: '', slot: 'operator', candidateId: 'halcyon', sourceGroup: 'same', reliability: 2, status: 'verified', acquiredRound: 0 },
      { id: 'c', title: 'C', summary: '', slot: 'operator', candidateId: 'halcyon', sourceGroup: 'other', reliability: 2, status: 'verified', acquiredRound: 0 },
    ];
    const stats = candidateStats(state, { id: 'halcyon', slot: 'operator', label: 'HALCYON' });
    expect(stats.support).toBe(5);
    expect(stats.sources).toBe(2);
    expect(confidenceFor({ ...state, dossier: { ...state.dossier, pinned: { operator: 'halcyon' } } }, 'operator')).toBe('proven');
  });

  it('reaches the finale after the authored campaign rounds', () => {
    let state = createState(42);
    state = command(state, { type: 'start', mode: 'campaign' });
    state = command(state, { type: 'continueBrief' });
    for (let round = 0; round < 9; round++) {
      state = command(state, { type: 'chooseCaller', index: 0 });
      state = command(state, { type: 'chooseResponse', index: 0 });
      state = command(state, { type: 'chooseTrack', index: 0 });
      state = command(state, { type: 'work', action: round === 7 ? 'patch' : 'verify' });
    }
    expect(state.phase).toBe('finaleClaim');
    for (const slot of ['operator', 'method', 'origin', 'objective'] as const) state = command(state, { type: 'cyclePin', slot });
    state = command(state, { type: 'chooseFinaleClaim', choice: 'provenOnly' });
    state = command(state, { type: 'chooseFinaleResponse', choice: 'protect' });
    state = command(state, { type: 'chooseFinaleRisk', choice: 'burst' });
    expect(state.phase).toBe('report');
    expect(state.outcome).toContain('SAVE THE VOICES');
  });
});
