import { describe, expect, it } from 'vitest';
import { applyCommand, createState, matchingContracts, projectCycle } from './engine';

function running(seed = 42) {
  let state = createState(seed, 'standard');
  state = applyCommand(state, { type: 'startStandard', seed }).state;
  state = applyCommand(state, { type: 'dismissBriefing' }).state;
  return state;
}

describe('Botany Lab engine', () => {
  it('creates a deterministic standard shift', () => {
    const first = running(1234);
    const second = running(1234);
    expect(first).toEqual(second);
    expect(first.maxCycles).toBe(12);
    expect(first.facility.biosecuritySeals).toBe(3);
  });

  it('rejects a cycle that exceeds a shared budget', () => {
    const state = running();
    for (const chamber of Object.values(state.chambers)) {
      chamber.lamp = 'uv';
      chamber.water = 'soak';
    }
    const result = applyCommand(state, { type: 'commitCycle' });
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/OVER BUDGET/);
  });

  it('uses the same deterministic resolver for preview and commit', () => {
    const state = running(99);
    const preview = projectCycle(state);
    expect(preview.accepted).toBe(true);
    const committed = applyCommand(state, { type: 'commitCycle' });
    expect(committed.accepted).toBe(true);
    expect(committed.state).toEqual(preview.state);
  });

  it('supports a delivery operation once a contract is ready', () => {
    let state = running(7);
    state.chambers.a1.plant!.mass = 6;
    const contracts = matchingContracts(state, 'a1');
    expect(contracts.length).toBeGreaterThan(0);
    const before = state.facility.funding;
    state = applyCommand(state, { type: 'queueOperation', operation: { type: 'deliver', chamberId: 'a1', contractId: contracts[0]!.id } }).state;
    const result = applyCommand(state, { type: 'commitCycle' });
    expect(result.accepted).toBe(true);
    expect(result.state.facility.funding).toBeGreaterThan(before);
    expect(result.state.chambers.a1.plant).toBeNull();
  });

  it('keeps the first cycle recoverable after a high-pressure preview', () => {
    const state = running(77);
    state.chambers.a1.plant!.mass = 12;
    state.chambers.a1.rootPressure = 8;
    const projection = projectCycle(state);
    expect(projection.accepted).toBe(true);
    expect(projection.state.facility.biosecuritySeals).toBeLessThanOrEqual(3);
    expect(projection.events.some(event => event.kind === 'breach' || event.kind === 'warning')).toBe(true);
  });
});
