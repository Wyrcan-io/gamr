import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';
import { applyCommand, createState, projectTurn } from './engine';
import { renderFrame } from './render';

describe('Last Train Home renderer', () => {
  it('renders briefing and honest resize guidance', () => {
    const frame = stripAnsi(renderFrame(createState(7), 80, 28, getThemePalette('carbon')));
    expect(frame).toContain('LAST TRAIN HOME');
    expect(stripAnsi(renderFrame(createState(7), 79, 28, getThemePalette('paper')))).toContain('NEED 80x28');
  });

  it('shows a pre-commit projection and help overlay', () => {
    let state = createState(7);
    state = applyCommand(state, { type: 'startCampaign', seed: 7 }).state;
    state = applyCommand(state, { type: 'dismissBriefing' }).state;
    const projection = projectTurn(state);
    const frame = stripAnsi(renderFrame(state, 100, 30, getThemePalette('contrast')));
    const help = stripAnsi(renderFrame({ ...state, helpOpen: true }, 80, 28, getThemePalette('paper')));
    expect(projection.trains.length).toBeGreaterThan(0);
    expect(frame).toContain('NEXT COMMIT');
    expect(help).toContain('DISPATCH CARD');
  });
});
