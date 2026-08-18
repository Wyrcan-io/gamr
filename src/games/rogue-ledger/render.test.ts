import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';
import { applyCommand, createState, currentTransaction } from './engine';
import { renderFrame, renderTitle } from './render';

describe('Rogue Ledger renderer', () => {
  it('renders standard briefing and accounting rows', () => {
    const briefing = stripAnsi(renderFrame(createState(7), 80, 28, getThemePalette('carbon')));
    let state = applyCommand(createState(7), { type: 'dismissBriefing' });
    const row = stripAnsi(renderFrame(state, 100, 30, getThemePalette('paper')));
    expect(currentTransaction(state)).toBeDefined();
    expect(briefing).toContain('ROGUE LEDGER');
    expect(row).toContain('ACCOUNTING ROW');
  });

  it('shows the treatment card, help, and resize guidance', () => {
    let state = applyCommand(createState(7), { type: 'dismissBriefing' });
    const treatment = currentTransaction(state)!.allowedTreatments[0]!;
    state = applyCommand(state, { type: 'selectTreatment', treatment });
    const preview = stripAnsi(renderFrame(state, 80, 28, getThemePalette('contrast')));
    const help = stripAnsi(renderFrame(state, 100, 30, getThemePalette('paper'), { selectedTreatment: 0, helpOpen: true, paused: false }));
    expect(preview).toContain('RED-PENCIL MARGIN');
    expect(help).toContain('ACCOUNTING CARD');
    expect(stripAnsi(renderFrame(state, 79, 28, getThemePalette('paper')))).toContain('NEED 80x24');
  });

  it('renders a themed title with only reachable start controls', () => {
    const title = stripAnsi(renderTitle(80, 28, getThemePalette('paper')));
    expect(title).toContain('ROGUE LEDGER');
    expect(title).toContain('ENTER STANDARD RUN');
    expect(title).not.toContain('? HELP');
  });
});
