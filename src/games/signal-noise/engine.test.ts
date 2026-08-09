import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';

function startCase() {
  let state = createState(1234);
  state = applyCommand(state, { type: 'start', mode: 'campaign' }).state;
  return applyCommand(state, { type: 'continueBrief' }).state;
}

describe('Signal//Noise engine', () => {
  it('triangulates the first target from two clean locks and resolves the right reply', () => {
    let state = startCase();
    state = applyCommand(state, { type: 'capture' }).state;
    state = applyCommand(state, { type: 'changeStation', delta: 1 }).state;
    state = applyCommand(state, { type: 'changeStation', delta: 1 }).state;
    state = applyCommand(state, { type: 'capture' }).state;
    expect(state.caseState.candidateZones).toEqual([{ x: 4, y: 3 }]);
    expect(state.caseState.phase).toBe('broadcast');
    state = applyCommand(state, { type: 'selectBroadcast', action: 'ack-hold' }).state;
    state = applyCommand(state, { type: 'confirmBroadcast' }).state;
    expect(state.caseState.lastResult).toBe('correct');
    expect(state.correctReplies).toBe(1);
  });

  it('does not spend operations on tuner settings and surfaces a failed lock', () => {
    let state = startCase();
    state = applyCommand(state, { type: 'changeCentre', delta: 1 }).state;
    expect(state.caseState.operationsUsed).toBe(0);
    state = applyCommand(state, { type: 'capture' }).state;
    expect(state.caseState.operationsUsed).toBe(1);
    expect(state.caseState.notice).toContain('NO LOCK');
  });

  it('restarts the same seeded case without changing the selected mode', () => {
    let state = createState(99);
    state = applyCommand(state, { type: 'start', mode: 'tutorial' }).state;
    state = applyCommand(state, { type: 'continueBrief' }).state;
    state = applyCommand(state, { type: 'changeCentre', delta: 1 }).state;
    const replay = applyCommand(state, { type: 'restart' }).state;
    expect(replay.seed).toBe(99);
    expect(replay.mode).toBe('tutorial');
    expect(replay.caseIndex).toBe(0);
    expect(replay.caseState.phase).toBe('brief');
  });
});
