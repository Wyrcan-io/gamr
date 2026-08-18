import { describe, expect, it } from 'vitest';
import {
  createState,
  getPorts,
  placeRouter,
  rotateRouter,
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

  it('keeps the standard shift playable without forcing tutorial steps', () => {
    const standard = createState(1234, 1, [], 'standard');
    expect(standard.mode).toBe('standard');
    expect(standard.phase).toBe('playing');
    const position = standard.board.flatMap((row, y) => row.map((tile, x) => ({ tile, x, y }))).find(({ tile }) => tile.kind === 'empty');
    expect(position).toBeDefined();
    expect(placeRouter(standard, { x: position!.x, y: position!.y }, 'link')).toBe(true);
    expect(standard.tutorialStep).toBe(0);
    expect(standard.quota).toBe(16);
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
    expect(state.phase).toBe('won');
    expect(state.lastEvent).toBe('TUTORIAL COMPLETE');
  });

  it('progresses the opening tutorial through observable placement steps', () => {
    const state = createState(42);
    const position = state.board.flatMap((row, y) => row.map((tile, x) => ({ tile, x, y }))).find(({ tile }) => tile.kind === 'empty');
    expect(position).toBeDefined();
    expect(state.phase).toBe('tutorial');
    expect(placeRouter(state, { x: position!.x, y: position!.y }, 'link')).toBe(true);
    expect(state.tutorialStep).toBe(1);
    expect(state.phase).toBe('tutorial');
    expect(rotateRouter(state, { x: position!.x, y: position!.y })).toBe(true);
    expect(state.tutorialStep).toBe(2);
    expect(state.phase).toBe('playing');
  });
});
