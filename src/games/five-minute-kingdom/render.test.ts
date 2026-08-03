import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import { displayWidth, stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';

const palette = getThemePalette('carbon');

function frame(state: ReturnType<typeof createState>, cols = 80, rows = 28): string {
  return stripAnsi(renderFrame(state, cols, rows, palette));
}

describe('Five-Minute Kingdom renderer', () => {
  it('teaches the draft and survey loop in stable layouts', () => {
    const briefing = frame(createState(7));
    expect(briefing).toContain('FOUNDING CHARTER');
    expect(briefing).toContain('Choose one deed');

    const market = applyCommand(createState(7), { type: 'dismissBriefing' });
    expect(frame(market)).toContain('DEED MARKET');
    expect(frame(market)).toContain('[1-3] choose deed');

    const target = applyCommand(market, { type: 'selectOffer', index: 0 });
    expect(frame(target)).toContain('CADASTRAL MAP');
    expect(frame(target)).toContain('PROJECTION');
  });

  it('separates projection from commitment and records the result', () => {
    let state = applyCommand(createState(7), { type: 'dismissBriefing' });
    state = applyCommand(state, { type: 'selectOffer', index: 0 });
    state = applyCommand(state, { type: 'preview' });
    expect(state.phase).toBe('preview');
    expect(frame(state)).toContain('NOW');
    expect(frame(state)).toContain('ENTER  confirm this projection');

    state = applyCommand(state, { type: 'confirm' });
    expect(state.phase).toBe('result');
    expect(frame(state)).toContain('PLACEMENT RECORDED');
    expect(frame(state)).toContain('[+]');
  });

  it('keeps content within the declared minimum and wide layout', () => {
    const state = applyCommand(
      applyCommand(createState(7), { type: 'dismissBriefing' }),
      { type: 'selectOffer', index: 0 },
    );
    const compact = frame(state, 80, 28);
    const wide = stripAnsi(renderFrame(state, 100, 30, getThemePalette('paper')));
    expect(compact.split('\r\n').every((line) => displayWidth(line) <= 80)).toBe(true);
    expect(wide.split('\r\n').every((line) => displayWidth(line) <= 100)).toBe(true);
    expect(stripAnsi(renderFrame(createState(7), 79, 28, palette))).toContain('Need 80x28');
  });

  it('provides ledger and help as readable overlays', () => {
    const state = applyCommand(createState(7), { type: 'dismissBriefing' });
    const ledger = stripAnsi(renderFrame(state, 80, 28, palette, { ledgerOpen: true }));
    expect(ledger).toContain('SCORE LEDGER');
    const help = stripAnsi(renderFrame(state, 80, 28, palette, { helpOpen: true }));
    expect(help).toContain('g/ FIVE-MINUTE KINGDOM / HELP');
    expect(help).toContain('Draft -> survey -> preview -> commit');
  });
});

