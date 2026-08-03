import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import { stripAnsi, displayWidth } from '../../ui/terminal';

describe('Stack Trace renderer', () => {
  it('uses the repair-bench visual language at the compact production target', () => {
    const start = stripAnsi(renderFrame(createState(), 80, 24, '\x1b[38;5;180m'));
    expect(start).toContain('g/ STACK TRACE');
    expect(start).toContain('PROGRAM REPAIR BENCH');

    const running = applyCommand(createState(), { type: 'start', mode: 'tutorial' }).state;
    const frame = stripAnsi(renderFrame(running, 80, 24, '\x1b[38;5;180m'));
    expect(frame).toContain('PROGRAM TAPE');
    expect(frame).toContain('TEST LEDGER');
    expect(frame).not.toContain('S T A C K   T R A C E');
    expect(frame.split('\r\n').every((line) => displayWidth(line) <= 80)).toBe(true);
  });

  it('gives a useful resize message below the supported minimum', () => {
    expect(stripAnsi(renderFrame(createState(), 79, 24, '\x1b[96m'))).toContain('Need 80×24');
  });
});
