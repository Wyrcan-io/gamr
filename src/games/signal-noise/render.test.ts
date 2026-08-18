import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';

describe('Signal//Noise renderer', () => {
  it('renders the receiver start and resize states', () => {
    const start = stripAnsi(renderFrame(createState(7), 80, 28, getThemePalette('carbon')));
    expect(start).toContain('SIGNAL//NOISE');
    expect(stripAnsi(renderFrame(createState(7), 79, 28, getThemePalette('paper')))).toContain('NEED 80x24');
  });

  it('keeps listening, help, and response frames within width', () => {
    let state = createState(7);
    state = applyCommand(state, { type: 'start', mode: 'campaign' }).state;
    state = applyCommand(state, { type: 'continueBrief' }).state;
    const frame = stripAnsi(renderFrame(state, 80, 28, getThemePalette('contrast')));
    const help = stripAnsi(renderFrame(state, 100, 30, getThemePalette('paper'), { helpOpen: true }));
    expect(frame).toContain('RECEIVER SCALE');
    expect(help).toContain('INSTRUMENT CARD');
  });
});
