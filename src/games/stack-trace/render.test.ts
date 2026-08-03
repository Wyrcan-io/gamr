import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import { stripAnsi, displayWidth } from '../../ui/terminal';
import { getThemePalette } from '../utils';

const palette = getThemePalette('carbon');

describe('Stack Trace renderer', () => {
  it('uses the repair-bench visual language at the compact production target', () => {
    const start = stripAnsi(renderFrame(createState(), 80, 24, palette));
    expect(start).toContain('g/ STACK TRACE');
    expect(start).toContain('PROGRAM REPAIR BENCH');

    const running = applyCommand(createState(), { type: 'start', mode: 'tutorial' }).state;
    const frame = stripAnsi(renderFrame(running, 80, 24, palette));
    expect(frame).toContain('PROGRAM TAPE');
    expect(frame).toContain('TEST LEDGER');
    expect(frame).toContain('[ ]');
    expect(frame).toContain('? help');
    expect(frame.split('\r\n').every((line) => displayWidth(line) <= 80)).toBe(true);
  });

  it('gives a useful resize message below the supported minimum', () => {
    expect(stripAnsi(renderFrame(createState(), 79, 24, palette))).toContain('Need 80x24');
  });

  it('uses phase-correct completion and help frames', () => {
    let completed = applyCommand(createState(), { type: 'start', mode: 'campaign' }).state;
    completed = applyCommand(completed, { type: 'focus', focus: 'tray' }).state;
    completed = applyCommand(completed, { type: 'insert', blockId: 'load', at: 0 }).state;
    completed = applyCommand(completed, { type: 'run' }).state;

    const report = stripAnsi(renderFrame(completed, 80, 24, palette));
    expect(report).toContain('RESULT [+]');
    expect(report).toContain('[Enter/N] next case');
    expect(report).not.toContain('R run');

    const help = stripAnsi(renderFrame(completed, 80, 24, palette, { helpOpen: true }));
    expect(help).toContain('g/ STACK TRACE / HELP');
    expect(help).toContain('Escape closes help or opens pause');
    expect(help.split('\r\n').every((line) => displayWidth(line) <= 80)).toBe(true);
  });

  it('keeps all visible lines within the supported width in a wide terminal', () => {
    const state = applyCommand(createState(), { type: 'start', mode: 'daily' }).state;
    const frame = stripAnsi(renderFrame(state, 100, 30, getThemePalette('paper')));
    expect(frame.split('\r\n').every((line) => displayWidth(line) <= 100)).toBe(true);
    expect(frame).toContain('PROGRAM TAPE');
  });
});
