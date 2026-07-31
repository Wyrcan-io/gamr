import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';

function start() { return applyCommand(createState(), { type: 'start', mode: 'campaign' }).state; }

describe('stack trace repair reducer', () => {
  it('places, mutates, runs, and completes a repair', () => {
    let state = start();
    state = applyCommand(state, { type: 'focus', focus: 'tray' }).state;
    state = applyCommand(state, { type: 'insert', blockId: 'load', at: 0 }).state;
    state = applyCommand(state, { type: 'run' }).state;
    expect(state.phase).toBe('complete');
    expect(state.results.every(result => result.status === 'pass')).toBe(true);
  });

  it('supports moving, mutation, and undo', () => {
    let state = start();
    state = applyCommand(state, { type: 'mutate', blockId: 'load', direction: 1 }).state;
    expect(state.blocks.load.variant).toBe('Y');
    state = applyCommand(state, { type: 'undo' }).state;
    expect(state.blocks.load.variant).toBe('X');
    state = applyCommand(state, { type: 'redo' }).state;
    expect(state.blocks.load.variant).toBe('Y');
  });

  it('clears stale results after an edit', () => {
    let state = start();
    state = applyCommand(state, { type: 'focus', focus: 'tray' }).state;
    state = applyCommand(state, { type: 'insert', blockId: 'load', at: 0 }).state;
    state = applyCommand(state, { type: 'run' }).state;
    expect(state.phase).toBe('complete');
    state = applyCommand(state, { type: 'restart' }).state;
    expect(state.results.every(result => result.status === 'unrun')).toBe(true);
  });
});
