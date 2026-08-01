import { describe, expect, it } from 'vitest';
import { createState } from './engine';
import { renderFrame } from './render';

describe('Night Frequency renderer', () => {
  it('renders the minimum terminal and resize fallback', () => {
    const state = createState(1);
    expect(renderFrame(state, 80, 28, '\x1b[96m', 0)).toContain('NIGHT FREQUENCY');
    expect(renderFrame(state, 79, 28, '\x1b[96m', 0)).toContain('TERMINAL TOO SMALL');
  });
});
