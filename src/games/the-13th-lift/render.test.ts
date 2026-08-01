import { describe, expect, it } from 'vitest';
import { createState } from './engine';
import { renderGame, stripAnsi } from './render';

const theme = { accent: '\x1b[96m', muted: '\x1b[2m', warning: '\x1b[93m', good: '\x1b[92m', danger: '\x1b[91m' };

describe('The 13th Lift renderer', () => {
  it('shows a resize hint below the supported minimum', () => {
    expect(stripAnsi(renderGame(createState(1), 79, 28, theme))).toContain('Need 80x24');
  });

  it('renders a readable start frame at the minimum layout', () => {
    const lines = stripAnsi(renderGame(createState(1), 80, 28, theme)).split('\n');
    expect(lines.some(line => line.includes('THE 13TH LIFT'))).toBe(true);
    expect(lines.some(line => line.includes('NIGHT OPERATOR CONSOLE'))).toBe(true);
    expect(lines.length).toBeLessThanOrEqual(28);
  });
});
