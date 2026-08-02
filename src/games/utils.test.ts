import { describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import {
  enterAlternateBuffer,
  exitAlternateBuffer,
  forceExitAlternateBuffer,
  isInAlternateBuffer,
} from './utils';

function fakeTerminal() {
  return { element: {}, write: vi.fn() } as unknown as Terminal;
}

describe('alternate buffer lifecycle', () => {
  it('is idempotent and leaves no tracked state after exit', () => {
    const terminal = fakeTerminal();

    expect(enterAlternateBuffer(terminal, 'test')).toBe(true);
    expect(enterAlternateBuffer(terminal, 'duplicate')).toBe(false);
    expect(isInAlternateBuffer(terminal)).toBe(true);
    expect(exitAlternateBuffer(terminal, 'test')).toBe(true);
    expect(exitAlternateBuffer(terminal, 'duplicate')).toBe(false);
    expect(isInAlternateBuffer(terminal)).toBe(false);
  });

  it('force-exits tracked state during error recovery', () => {
    const terminal = fakeTerminal();
    enterAlternateBuffer(terminal, 'test');
    forceExitAlternateBuffer(terminal, 'error');
    expect(isInAlternateBuffer(terminal)).toBe(false);
  });
});
