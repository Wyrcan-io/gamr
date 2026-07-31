import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';

describe('containment protocol engine', () => {
  it('keeps configuration free until a cycle is committed', () => {
    let state = applyCommand(createState(7), { type: 'startRun', mode: 'tutorial', seed: 7 });
    state = applyCommand(state, { type: 'dismissBriefing' });
    state = applyCommand(state, { type: 'setLamp', roomId: 'A', lamp: 'bright' });
    expect(state.cycle).toBe(0);
    expect(state.anomalies.glass?.pressure).toBe(2);
    state = applyCommand(state, { type: 'commitCycle' });
    expect(state.cycle).toBe(1);
    expect(state.anomalies.glass?.pressure).toBe(0);
    expect(state.lastCycle?.deltas.glass).toBe(-2);
  });

  it('sheds configured circuits deterministically when demand exceeds capacity', () => {
    let state = applyCommand(createState(8), { type: 'startRun', mode: 'campaign', seed: 8 });
    state = applyCommand(state, { type: 'dismissBriefing' });
    for (const roomId of ['A', 'B', 'C', 'D'] as const) {
      state = applyCommand(state, { type: 'setLamp', roomId, lamp: 'bright' });
      state = applyCommand(state, { type: 'setAudio', roomId, audio: 'tone' });
    }
    state = applyCommand(state, { type: 'commitCycle' });
    expect(state.lastCycle?.demand).toBeGreaterThan(state.lastCycle?.capacity ?? 0);
    expect(state.lastCycle?.shed.length).toBeGreaterThan(0);
  });

  it('replays the same command sequence from a seed', () => {
    const commands = [
      { type: 'startRun', mode: 'campaign' as const, seed: 99 },
      { type: 'dismissBriefing' as const },
      { type: 'setLamp', roomId: 'A' as const, lamp: 'bright' as const },
      { type: 'commitCycle' as const },
    ];
    const run = () => commands.reduce((state, command) => applyCommand(state, command), createState(99));
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});

