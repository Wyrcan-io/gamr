import { describe, expect, it } from 'vitest';
import { createState, upgradeChoices } from './engine';
import { renderFrame } from './render';
import { createShakeState } from '../shared/effects';
import { displayWidth, stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';

const palette = getThemePalette('carbon');

function model(state: ReturnType<typeof createState>, gameStarted = true) {
  return {
    gameStarted,
    selectedTool: 'link' as const,
    previewRotation: 0 as const,
    choices: upgradeChoices(state),
    particles: [],
    popups: [],
    shake: createShakeState(),
  };
}

describe('Packet Panic renderer', () => {
  it('uses topology and operator-panel language without color-only protocol state', () => {
    const state = createState(42);
    const start = stripAnsi(renderFrame(state, 80, 28, model(state, false), palette));
    expect(start).toContain('NETWORK OPERATOR DESK');

    const playing = stripAnsi(renderFrame(state, 80, 28, model(state), palette));
    expect(playing).toContain('TOPOLOGY');
    expect(playing).toContain('OPERATOR PANEL');
    expect(playing).toContain('>');
    expect(playing).toContain('A   B   C');
    expect(playing.split('\r\n').every((line) => displayWidth(line) <= 80)).toBe(true);
  });

  it('keeps help, wide layout, and resize states readable', () => {
    const state = createState(42);
    const help = stripAnsi(renderFrame(state, 80, 28, { ...model(state), helpOpen: true }, palette));
    const wide = stripAnsi(renderFrame(state, 100, 30, model(state), getThemePalette('paper')));
    const small = stripAnsi(renderFrame(state, 79, 28, model(state), palette));
    expect(help).toContain('g/ PACKET PANIC / HELP');
    expect(help).toContain('The letter and route shape remain visible without colour.');
    expect(wide.split('\r\n').every((line) => displayWidth(line) <= 100)).toBe(true);
    expect(small).toContain('Need 80x24');
  });

  it('shows upgrade and end states as readable reports', () => {
    const state = createState(42);
    const upgrade = stripAnsi(renderFrame({ ...state, phase: 'upgrade' }, 80, 28, model(state), palette));
    const won = stripAnsi(renderFrame({ ...state, phase: 'won', score: 1200, maxTrace: 34 }, 80, 28, model(state), palette));
    expect(upgrade).toContain('SECTOR CLEAR / UPGRADE');
    expect(won).toContain('[+] TUTORIAL COMPLETE');
    expect(won).toContain('FINAL SCORE  1200');
  });
});
