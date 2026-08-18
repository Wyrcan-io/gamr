import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';

describe('Ghost Shift renderer', () => {
  it('keeps the desk identifiable at the supported size and in Paper', () => {
    let state = createState(7);
    state = applyCommand(state, { type: 'start', mode: 'tutorial', seed: 7 }).state;
    state = applyCommand(state, { type: 'dismissBriefing' }).state;
    const frame = stripAnsi(renderFrame(state, 80, 28, getThemePalette('paper')));
    expect(frame).toContain('GHOST SHIFT');
    expect(frame).toContain('CCTV CONTACT SHEET');
  });

  it('shows an honest resize frame', () => {
    expect(stripAnsi(renderFrame(createState(1), 79, 28, getThemePalette('carbon')))).toContain('NEED 80x24');
  });
});
