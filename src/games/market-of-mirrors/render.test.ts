import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';
import { applyCommand, createState } from './engine';
import { renderFrame, renderTitle } from './render';

const model = { selectedGood: 0, secondGood: 1, selectedArtifact: 0, selectedFaction: 0, frame: 0, intensity: 0, focus: 'tape' as const, helpOpen: false, paused: false };

describe('Market of Mirrors renderer', () => {
  it('renders the guided briefing and auction tape', () => {
    const briefing = stripAnsi(renderFrame(createState(7, 'tutorial'), 80, 28, getThemePalette('paper'), model));
    let state = applyCommand(createState(7), { type: 'dismissBriefing' });
    const tape = stripAnsi(renderFrame(state, 80, 28, getThemePalette('carbon'), model));
    expect(briefing).toContain('GUIDED FAIR');
    expect(tape).toContain('AUCTION TAPE');
  });

  it('keeps help, preview, and resize frames bounded', () => {
    let state = applyCommand(createState(7), { type: 'dismissBriefing' });
    state = applyCommand(state, { type: 'previewAction', action: { type: 'buy', goodId: 'echo' } });
    const preview = stripAnsi(renderFrame(state, 100, 30, getThemePalette('contrast'), model));
    const help = stripAnsi(renderFrame(state, 80, 28, getThemePalette('paper'), { ...model, helpOpen: true }));
    expect(preview).toContain('ACTION PREVIEW');
    expect(help).toContain('LEDGER CARD');
    expect(stripAnsi(renderFrame(state, 79, 28, getThemePalette('paper'), model))).toContain('NEED 80x28');
  });

  it('renders a themed title with truthful start controls', () => {
    const title = stripAnsi(renderTitle(80, 28, getThemePalette('paper')));
    expect(title).toContain('MARKET OF MIRRORS');
    expect(title).toContain('ENTER STANDARD MARKET');
    expect(title).not.toContain('? HELP');
  });
});
