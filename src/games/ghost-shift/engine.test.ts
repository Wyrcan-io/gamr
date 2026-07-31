import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';

function monitoring(seed = 42) {
  let state = createState(seed);
  state = applyCommand(state, { type: 'start', mode: 'tutorial', seed }).state;
  state = applyCommand(state, { type: 'dismissBriefing' }).state;
  return state;
}

describe('Ghost Shift deterministic investigation engine', () => {
  it('recreates the same case from a seed', () => {
    const a = createState(99); const b = createState(99);
    expect(a.caseTitle).toBe(b.caseTitle); expect(a.intruder).toEqual(b.intruder); expect(a.doors).toEqual(b.doors);
  });

  it('does not advance time for selection or panel inspection', () => {
    const state = monitoring(); const turn = state.turn; const battery = state.battery;
    applyCommand(state, { type: 'select', selection: { kind: 'room', id: 'R' } });
    applyCommand(state, { type: 'togglePanel', panel: 'evidence' });
    expect(state.turn).toBe(turn); expect(state.battery).toBe(battery);
  });

  it('requires two proof source families before detention', () => {
    const state = monitoring();
    applyCommand(state, { type: 'select', selection: { kind: 'room', id: 'R' } });
    applyCommand(state, { type: 'wakeCamera', id: 'C01' });
    expect(state.phase).toBe('monitoring');
    applyCommand(state, { type: 'detain', suspect: 'NORA' });
    expect(state.phase).toBe('monitoring');
  });

  it('moves the intruder, logs the door, and accepts a proved detention', () => {
    const state = monitoring();
    applyCommand(state, { type: 'select', selection: { kind: 'room', id: 'R' } });
    applyCommand(state, { type: 'wakeCamera', id: 'C01' });
    const eventId = state.doorLog[0]?.id;
    expect(eventId).toBeTruthy();
    if (eventId) applyCommand(state, { type: 'queryBadge', eventId });
    applyCommand(state, { type: 'detain', suspect: 'NORA' });
    expect(state.phase).toBe('report'); expect(state.correctCases).toBe(1);
  });

  it('locks a door before movement and takes the authored contingency route', () => {
    const state = monitoring();
    applyCommand(state, { type: 'select', selection: { kind: 'room', id: 'R' } });
    applyCommand(state, { type: 'toggleDoor', id: 'RL' });
    expect(state.doors.RL.locked).toBe(true);
    expect(state.intruder.position).toBe('P'); expect(state.incidentLog.some(line => line.includes('DOOR RP OPEN'))).toBe(true);
  });
});
