import { describe, expect, it } from 'vitest';
import { applyCommand, createState, currentEvaluation } from './engine';
import { renderFrame } from './render';
import { displayWidth, stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';

const palette = getThemePalette('carbon');

function textFrame(state: ReturnType<typeof createState>, cols = 80, rows = 28): string {
  return stripAnsi(renderFrame(state, cols, rows, palette));
}

describe('Dead Letter Department renderer', () => {
  it('presents the induction as a bulletin and a sorting desk', () => {
    const start = textFrame(createState(42));
    expect(start).toContain('Inspect the mail. Seal what answers back.');

    const briefing = applyCommand(createState(42), { type: 'startTutorial' }).state;
    expect(textFrame(briefing)).toContain('INDUCTION BULLETIN');
    expect(textFrame(briefing)).toContain('Learn one visible rule');

    const working = applyCommand(briefing, { type: 'dismissBriefing' }).state;
    expect(textFrame(working)).toContain('ACTIVE REGULATIONS');
    expect(textFrame(working)).toContain('INCOMING MESSAGE');
    expect(textFrame(working)).toContain('[1] DISPATCH');
  });

  it('makes an audit explain the selected route and visible evidence', () => {
    let state = applyCommand(createState(42), { type: 'startCampaign', seed: 42 }).state;
    state = applyCommand(state, { type: 'dismissBriefing' }).state;
    const evaluation = currentEvaluation(state)!;
    state = applyCommand(state, { type: 'chooseDestination', destination: evaluation.expected }).state;
    const audit = textFrame(state);
    expect(audit).toContain('AUDIT ACCEPTED');
    expect(audit).toContain('EXPECTED');
    expect(audit).toContain('VISIBLE EVIDENCE');
  });

  it('keeps overlays and required states within terminal cells', () => {
    let state = applyCommand(createState(42), { type: 'startCampaign', seed: 42 }).state;
    state = applyCommand(state, { type: 'dismissBriefing' }).state;
    const ledger = textFrame({ ...state, ledgerOpen: true });
    const help = textFrame({ ...state, helpOpen: true });
    const wide = stripAnsi(renderFrame(state, 100, 30, getThemePalette('paper')));
    expect(ledger).toContain('REGULATION LEDGER');
    expect(help).toContain('g/ DESK HELP');
    expect(ledger.split('\r\n').every((line) => displayWidth(line) <= 80)).toBe(true);
    expect(help.split('\r\n').every((line) => displayWidth(line) <= 80)).toBe(true);
    expect(wide.split('\r\n').every((line) => displayWidth(line) <= 100)).toBe(true);
    expect(stripAnsi(renderFrame(createState(42), 79, 28, palette))).toContain('Need 80x28');
  });
});

