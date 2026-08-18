import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';
import { renderFrame, stripAnsi } from './render';

describe('Botany Lab renderer', () => {
  it('renders the supported start, running, and report states', () => {
    const start = createState(11, 'standard');
    const startFrame = renderFrame(start, 80, 28, '\x1b[96m', 0);
    expect(stripAnsi(startFrame)).toContain('BOTANY // LAB');
    expect(stripAnsi(startFrame)).toContain('STANDARD SHIFT');

    const running = applyCommand(applyCommand(start, { type: 'startStandard', seed: 11 }).state, { type: 'dismissBriefing' }).state;
    const runningFrame = renderFrame(running, 80, 28, '\x1b[96m', 1);
    expect(stripAnsi(runningFrame)).toContain('CYCLE 01/12');
    expect(stripAnsi(runningFrame)).toContain('CONTRACTS');
    expect(stripAnsi(runningFrame)).toContain('ENTER COMMIT');

    const report = { ...running, phase: 'report' as const, outcome: 'deferred' as const, score: 0 };
    const reportFrame = renderFrame(report, 80, 28, '\x1b[96m', 2);
    expect(stripAnsi(reportFrame)).toContain('GRANT DEFERRED');
  });

  it('shows a resize message below the minimum terminal size', () => {
    const frame = stripAnsi(renderFrame(createState(3), 79, 28, '\x1b[96m', 0));
    expect(frame).toContain('TERMINAL TOO SMALL');
    expect(frame).toContain('NEED 80x24');
  });

  it('keeps plant identity readable in ASCII mode', () => {
    const running = applyCommand(applyCommand(createState(5, 'standard'), { type: 'startStandard', seed: 5 }).state, { type: 'dismissBriefing' }).state;
    const frame = stripAnsi(renderFrame(running, 80, 28, '\x1b[96m', 0, true));
    expect(frame).toContain('HELIOX');
    expect(frame).toContain('F');
  });
});
