import { describe, expect, it } from 'vitest';
import { applyCommand, createBattle, createState, deriveObservation, validateOrder } from './engine';
import type { GameState } from './types';

function planning(seed = 12): GameState {
  let state = applyCommand(createState(seed), { type: 'start', mode: 'campaign' });
  state = applyCommand(state, { type: 'dismissBriefing' });
  return state;
}

describe('Tiny Fleet engine', () => {
  it('does not change enemy orders while player orders are edited', () => {
    let state = planning();
    const before = JSON.stringify(state.orders.enemy);
    state = applyCommand(state, { type: 'queueOrder', shipId: 'S1', order: { type: 'ahead' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'E1', order: { type: 'brace' } });
    expect(JSON.stringify(state.orders.enemy)).toBe(before);
  });

  it('requires one order per living ship before sealing', () => {
    let state = planning();
    state = applyCommand(state, { type: 'queueOrder', shipId: 'S1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'sealOrders' });
    expect(state.phase).toBe('planning');
    expect(state.notice).toContain('AEGIS');
  });

  it('moves the Scout two cells on an Ahead order', () => {
    let state = planning();
    state = applyCommand(state, { type: 'queueOrder', shipId: 'S1', order: { type: 'ahead' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'E1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'F1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'sealOrders' });
    expect(state.ships.find(ship => ship.id === 'S1')?.pos).toEqual({ x: 0, y: 5 });
    expect(state.phase).toBe('roundReport');
  });

  it('applies About without moving the ship', () => {
    let state = planning();
    state = applyCommand(state, { type: 'queueOrder', shipId: 'S1', order: { type: 'about' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'E1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'F1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'sealOrders' });
    const scout = state.ships.find(ship => ship.id === 'S1');
    expect(scout?.pos).toEqual({ x: 0, y: 7 });
    expect(scout?.facing).toBe('S');
  });

  it('applies weapon damage from the same snapshot', () => {
    let state = planning();
    const scout = state.ships.find(ship => ship.id === 'S1'); const pirate = state.ships.find(ship => ship.id === 'P1');
    if (!scout || !pirate) throw new Error('fixture ships missing');
    scout.pos = { x: 2, y: 2 }; pirate.pos = { x: 3, y: 2 };
    state.orders.enemy.P1 = { type: 'hold' };
    state = applyCommand(state, { type: 'queueOrder', shipId: 'S1', order: { type: 'fire', target: { x: 3, y: 2 } } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'E1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'F1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'sealOrders' });
    expect(state.ships.find(ship => ship.id === 'P1')?.hull).toBe(1);
    expect(state.log.some(line => line.includes('HIT CONFIRMED'))).toBe(true);
  });

  it('lets Brace reduce a flagship hit by one', () => {
    let state = planning();
    const flagship = state.ships.find(ship => ship.id === 'F1'); const pirate = state.ships.find(ship => ship.id === 'P3');
    if (!flagship || !pirate) throw new Error('fixture ships missing');
    flagship.pos = { x: 2, y: 2 }; pirate.pos = { x: 3, y: 2 };
    state.orders.enemy.P3 = { type: 'fire', target: { x: 2, y: 2 } };
    state = applyCommand(state, { type: 'queueOrder', shipId: 'S1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'E1', order: { type: 'hold' } });
    state = applyCommand(state, { type: 'queueOrder', shipId: 'F1', order: { type: 'brace' } });
    state = applyCommand(state, { type: 'sealOrders' });
    expect(state.ships.find(ship => ship.id === 'F1')?.hull).toBe(3);
  });

  it('keeps observations free of hidden enemy positions', () => {
    const state = createBattle(42, 2);
    const view = deriveObservation(state, 'player');
    expect(view.ownShips.every(ship => ship.side === 'player')).toBe(true);
    expect(view.visibleShips.every(ship => ship.side !== 'player')).toBe(true);
    expect(JSON.stringify(view)).not.toContain('P1');
  });

  it('rejects fire while the flagship reloads', () => {
    const state = planning();
    const flagship = state.ships.find(ship => ship.id === 'F1');
    if (!flagship) throw new Error('fixture ship missing');
    flagship.reload = 1;
    expect(validateOrder(state, 'player', 'F1', { type: 'fire', target: { x: 4, y: 4 } }).valid).toBe(false);
  });
});
