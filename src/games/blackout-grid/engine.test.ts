import { describe, expect, it } from 'vitest';
import { advance, applyCommand, createState, serviceRatioForState, upgradeChoices } from './engine';
import { validateBlueprint, createBlueprint } from './scenario';
import { canCloseEdge } from './topology';
import { renderFrame } from './render';

function running(seed = 42) {
  let state = createState(seed);
  state = applyCommand(state, { type: 'startStandard' }).state;
  state = applyCommand(state, { type: 'dismissBriefing' }).state;
  return state;
}

function select(state: ReturnType<typeof running>, kind: 'node' | 'edge', id: string): void {
  state.selected = kind === 'node' ? { kind: 'node', id } : { kind: 'edge', id };
}

describe('Blackout Grid topology and restoration', () => {
  it('creates a valid deterministic authored blueprint', () => {
    expect(validateBlueprint(createBlueprint(99))).toEqual([]);
    expect(createBlueprint(99)).toEqual(createBlueprint(99));
  });

  it('repairs, closes, and energizes the hospital feeder', () => {
    let state = running();
    select(state, 'edge', 'e-north-h');
    expect(applyCommand(state, { type: 'startCrewJob' }).accepted).toBe(true);
    for (let i = 0; i < 8; i++) advance(state);
    expect(state.edges['e-north-h'].condition).toBe('intact');
    expect(state.edges['e-north-h'].breaker).toBe('open');
    expect(applyCommand(state, { type: 'toggleBreaker' }).accepted).toBe(true);
    expect(state.edges['e-north-h'].energized).toBe(true);
  });

  it('rejects a live-source tie that would parallel two sources', () => {
    const state = running();
    state.edges['e-grid-b'].breaker = 'closed';
    state.edges['e-emergency'].condition = 'intact';
    expect(canCloseEdge(state, 'e-emergency').ok).toBe(false);
    expect(canCloseEdge(state, 'e-emergency').reason).toContain('LIVE SOURCES');
  });

  it('applies pickup demand after a district is restored', () => {
    let state = running();
    select(state, 'edge', 'e-north-h'); applyCommand(state, { type: 'startCrewJob' });
    for (let i = 0; i < 8; i++) advance(state);
    applyCommand(state, { type: 'toggleBreaker' });
    select(state, 'node', 'hospital'); applyCommand(state, { type: 'toggleDistrict' });
    advance(state);
    const district = state.nodes.hospital.district!;
    expect(district.powered).toBe(true);
    expect(district.requestedMW).toBeGreaterThan(district.baseDemandMW);
    expect(district.pickupBeatsRemaining).toBeGreaterThan(0);
  });

  it('trips a closed feeder when pickup exceeds its rating', () => {
    let state = running();
    select(state, 'edge', 'e-north-h'); applyCommand(state, { type: 'startCrewJob' });
    for (let i = 0; i < 8; i++) advance(state);
    applyCommand(state, { type: 'toggleBreaker' });
    select(state, 'node', 'hospital'); applyCommand(state, { type: 'toggleDistrict' });
    select(state, 'edge', 'e-north-r'); state.edges['e-north-r'].capacityMW = 10; applyCommand(state, { type: 'toggleBreaker' });
    expect(state.edges['e-north-r'].breaker).toBe('closed');
    select(state, 'node', 'residential'); applyCommand(state, { type: 'toggleDistrict' });
    for (let i = 0; i < 12; i++) advance(state);
    expect(state.feederTrips + state.sourceTrips).toBeGreaterThan(0);
    expect(serviceRatioForState(state)).toBeGreaterThanOrEqual(0);
  });

  it('is reproducible for the same seed and command sequence', () => {
    const left = running(700);
    const right = running(700);
    for (let i = 0; i < 10; i++) { advance(left); advance(right); }
    expect(left).toEqual(right);
    expect(upgradeChoices(left)).toEqual(upgradeChoices(right));
  });

  it('renders a minimum-size frame and a live frame without throwing', () => {
    const state = running();
    expect(renderFrame(state, 79, 28, '\x1b[36m', 0)).toContain('TERMINAL TOO SMALL');
    expect(renderFrame(state, 80, 28, '\x1b[36m', 0)).toContain('BLACKOUT GRID');
  });

  it('owns focus timing in the deterministic engine', () => {
    let state = running(91);
    const activated = applyCommand(state, { type: 'activateFocus' });
    expect(activated.accepted).toBe(true);
    expect(activated.state.focusCharges).toBe(1);
    expect(activated.state.focusBeats).toBe(12);
    const tickBefore = activated.state.tick;
    advance(activated.state);
    expect(activated.state.tick).toBe(tickBefore);
    advance(activated.state);
    expect(activated.state.tick).toBe(tickBefore + 1);
  });
});
