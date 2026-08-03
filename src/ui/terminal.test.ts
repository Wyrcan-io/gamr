import { describe, expect, it } from 'vitest';
import { clipToWidth, displayWidth, padToWidth, wrapText } from './terminal';

describe('terminal layout helpers', () => {
  it('measures terminal cells rather than UTF-16 code units', () => {
    expect(displayWidth('abc')).toBe(3);
    expect(displayWidth('界')).toBe(2);
    expect(displayWidth('e\u0301')).toBe(1);
    expect(displayWidth('\x1b[31mred\x1b[0m')).toBe(3);
  });

  it('clips and pads content to a cell width', () => {
    expect(clipToWidth('small machine', 8)).toBe('small m…');
    expect(padToWidth('界', 4)).toBe('界  ');
    expect(displayWidth(padToWidth('界', 4))).toBe(4);
  });

  it('wraps prose without producing an over-wide line', () => {
    const lines = wrapText('Every action leaves readable evidence.', 12);
    expect(lines).toEqual(['Every action', 'leaves', 'readable', 'evidence.']);
    expect(lines.every((line) => displayWidth(line) <= 12)).toBe(true);
  });
});
