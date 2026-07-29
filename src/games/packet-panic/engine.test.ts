import { describe, expect, it } from 'vitest';
import {
  createState,
  getPorts,
  placeRouter,
  advance,
  BOARD_WIDTH,
  type Tile,
} from './engine';

describe('Packet Panic topology', () => {
  it('rotates link ports between horizontal and vertical', () => {
    const horizontal: Tile = {
      kind: 'router',
      router: { id: 'a', kind: 'link', rotation: 0, state: 'healthy', packetId: null },
    };
    const vertical: Tile = {
      kind: 'router',
      router: { id: 'b', kind: 'link', rotation: 1, state: 'healthy', packetId: null },
    };
    expect(getPorts(horizontal)).toEqual(['E', 'W']);
    expect(getPorts(vertical)).toEqual(['N', 'S']);
  });

  it('places only routers with available inventory on empty tiles', () => {
    const state = createState(42);
    expect(placeRouter(state, { x: 3, y: 3 }, 'link', 0)).toBe(true);
    expect(placeRouter(state, { x: 3, y: 3 }, 'link', 0)).toBe(false);
    expect(placeRouter(state, { x: 3, y: 3 }, 'link', 0)).toBe(false);
  });
});

describe('Packet Panic deterministic simulation', () => {
  it('produces identical initial sectors from the same seed', () => {
    const first = createState(1234);
    const second = createState(1234);
    expect(first.board).toEqual(second.board);
    expect(first.inventory).toEqual(second.inventory);
    expect(first.quota).toBe(second.quota);
  });

  it('routes a packet through a simple L-shaped network', () => {
    const state = createState(7);
    for (let x = 1; x < BOARD_WIDTH; x++) {
      if (x === BOARD_WIDTH - 1) {
        expect(placeRouter(state, { x, y: 1 }, 'bend', 2)).toBe(true);
      } else {
        expect(placeRouter(state, { x, y: 1 }, 'link', 0)).toBe(true);
      }
    }
    for (let y = 2; y < 7; y++) {
      expect(placeRouter(state, { x: BOARD_WIDTH - 1, y }, 'link', 1)).toBe(true);
    }
    let delivered = 0;
    for (let i = 0; i < 40; i++) delivered += advance(state).delivered.length;
    expect(delivered).toBeGreaterThan(0);
    expect(state.trace).toBeLessThan(100);
  });
});
