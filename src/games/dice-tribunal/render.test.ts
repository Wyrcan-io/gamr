import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../../ui/terminal';
import { getThemePalette } from '../utils';
import { createState } from './engine';
import { renderFrame } from './render';

describe('Dice Tribunal renderer', () => {
  it('renders the court masthead and resize fallback', () => {
    expect(stripAnsi(renderFrame(createState(3), 80, 28, getThemePalette('contrast')))).toContain('DICE TRIBUNAL');
    expect(stripAnsi(renderFrame(createState(3), 79, 28, getThemePalette('paper')))).toContain('NEED 80x28');
  });
});
