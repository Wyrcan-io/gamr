import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';
import { createState } from './engine';
import { renderFrame } from './render';

describe('Time Capsule renderer', () => {
  it('renders the start frame and resize fallback', () => {
    expect(stripAnsi(renderFrame(createState(4), 80, 28, getThemePalette('paper').focus))).toContain('T I M E   C A P S U L E');
    expect(stripAnsi(renderFrame(createState(4), 79, 28, getThemePalette('carbon').focus))).toContain('Need 80x24');
  });
});
