import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';
import type { GameState } from './types';

function exploring(seed = 7): GameState {
  let state = createState(seed);
  state = applyCommand(state, { type: 'start', mode: 'campaign', seed }).state;
  return applyCommand(state, { type: 'dismissBriefing' }).state;
}

function perform(state: GameState, actionId: string): GameState {
  return applyCommand(state, { type: 'perform', actionId }).state;
}

describe('Time Capsule persistence engine', () => {
  it('advances only on world actions and exposes a discovered clue at reset', () => {
    let state = exploring();
    const inspected = applyCommand(state, { type: 'openOverlay', overlay: 'journal' });
    expect(inspected.state.loop.tick).toBe(0);
    state = inspected.state;
    state = applyCommand(state, { type: 'closeOverlay' }).state;
    state = applyCommand(state, { type: 'travel', roomId: 'roof' }).state;
    state = perform(state, 'inspect-ammeter');
    expect(state.loop.tick).toBe(2);
    expect(state.loop.discoveriesThisLoop).toContain('clue-bell-phase');
    state = applyCommand(state, { type: 'endLoop' }).state;
    expect(state.phase).toBe('capsule');
    state = applyCommand(state, { type: 'stageAnchor', kind: 'clue', anchorId: 'clue-bell-phase' }).state;
    state = applyCommand(state, { type: 'commitAnchors' }).state;
    expect(state.phase).toBe('exploring');
    expect(state.progress.anchors.clue).toBe('clue-bell-phase');
    expect(state.loop.tick).toBe(0);
  });

  it('moves an anchored object through the reset without duplicating it', () => {
    let state = exploring();
    state.progress.anchors.clue = 'clue-bell-phase';
    state = applyCommand(state, { type: 'travel', roomId: 'workshop' }).state;
    state = perform(state, 'inspect-relay');
    state = perform(state, 'open-cabinet');
    expect(state.loop.inventory).toContain('ceramic-link');
    state = applyCommand(state, { type: 'endLoop' }).state;
    state = applyCommand(state, { type: 'stageAnchor', kind: 'object', anchorId: 'obj-ceramic-link' }).state;
    state = applyCommand(state, { type: 'commitAnchors' }).state;
    expect(state.progress.anchors.object).toBe('obj-ceramic-link');
    expect(state.loop.inventory.filter(item => item === 'ceramic-link')).toHaveLength(1);
    expect(state.loop.worldItems['ceramic-link']).toBeNull();
  });

  it('supports the full canonical discovery and repair route', () => {
    let state = exploring(19);
    state = applyCommand(state, { type: 'travel', roomId: 'roof' }).state;
    state = perform(state, 'inspect-ammeter');
    state = applyCommand(state, { type: 'endLoop' }).state;
    state = applyCommand(state, { type: 'stageAnchor', kind: 'clue', anchorId: 'clue-bell-phase' }).state;
    state = applyCommand(state, { type: 'commitAnchors' }).state;

    state = applyCommand(state, { type: 'travel', roomId: 'workshop' }).state;
    state = perform(state, 'inspect-relay');
    state = perform(state, 'talk-ivo');
    state = perform(state, 'open-cabinet');
    expect(state.loop.discoveriesThisLoop).toEqual(expect.arrayContaining(['mem-ivo-confession', 'obj-ceramic-link']));
    state = applyCommand(state, { type: 'endLoop' }).state;
    state = applyCommand(state, { type: 'stageAnchor', kind: 'memory', anchorId: 'mem-ivo-confession' }).state;
    state = applyCommand(state, { type: 'stageAnchor', kind: 'object', anchorId: 'obj-ceramic-link' }).state;
    state = applyCommand(state, { type: 'commitAnchors' }).state;

    state = applyCommand(state, { type: 'travel', roomId: 'workshop' }).state;
    state = perform(state, 'install-link');
    state = applyCommand(state, { type: 'travel', roomId: 'atrium' }).state;
    state = applyCommand(state, { type: 'travel', roomId: 'roof' }).state;
    state = perform(state, 'arm-cutoff');
    state = perform(state, 'pull-cutoff');
    expect(state.phase).toBe('report');
    expect(state.endingId).toBe('mend-bell');
  });

  it('rejects a historical object that is not actually being carried', () => {
    let state = exploring();
    state.phase = 'capsule';
    state.capsuleDraft = { memory: null, object: null, clue: null };
    state.loop.discoveriesThisLoop = ['obj-ceramic-link'];
    state = applyCommand(state, { type: 'stageAnchor', kind: 'object', anchorId: 'obj-ceramic-link' }).state;
    expect(state.capsuleDraft.object).toBeNull();
    expect(state.notice).toContain('OBJECT');
  });

  it('previews a costly action without advancing the loop', () => {
    let state = exploring();
    state = applyCommand(state, { type: 'travel', roomId: 'roof' }).state;
    const beforeTick = state.loop.tick;
    state = applyCommand(state, { type: 'previewAction', actionId: 'inspect-ammeter' }).state;
    expect(state.pendingAction?.beforeTick).toBe(beforeTick);
    expect(state.pendingAction?.afterTick).toBe(beforeTick + 1);
    expect(state.loop.tick).toBe(beforeTick);
    state = applyCommand(state, { type: 'confirmAction' }).state;
    expect(state.loop.tick).toBe(beforeTick + 1);
    expect(state.pendingAction).toBeNull();
  });

  it.each([
    ['mend-bell', ['mem-ivo-confession', 'obj-ceramic-link', 'clue-bell-phase']],
    ['open-record', ['mem-mara-oath', 'obj-witness-key', 'clue-senn-order']],
    ['break-capsule', ['mem-jun-promise', 'obj-chronal-shard', 'clue-vault-map']],
  ])('resolves the authored ending %s from its three-anchor loadout', (endingId, required) => {
    let state = exploring();
    state.progress.anchors = { memory: required[0]!, object: required[1]!, clue: required[2]! };
    state.loop.tick = endingId === 'mend-bell' ? 3 : 6;
    state.loop.playerRoom = endingId === 'mend-bell' ? 'roof' : endingId === 'open-record' ? 'atrium' : 'vault';
    state.loop.inventory = [required[1]!.replace(/^obj-/, '')];
    state.loop.actorRooms.ivo = 'roof';
    state.loop.actorRooms.mara = 'atrium';
    state.loop.flags = endingId === 'mend-bell' ? { relayRepaired: true, cutoffArmed: true } : { housingOpen: true };
    const actionId = endingId === 'mend-bell' ? 'pull-cutoff' : endingId === 'open-record' ? 'broadcast-order' : 'remove-shard';
    state = perform(state, actionId);
    expect(state.phase).toBe('report');
    expect(state.endingId).toBe(endingId);
  });
});
