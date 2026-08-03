import { describe, expect, it } from 'vitest';
import {
  getUiTheme,
  getUiThemeModes,
  isValidThemeMode,
} from './index';

describe('Small Machines themes', () => {
  it('exposes five deliberate appearance editions', () => {
    expect(getUiThemeModes()).toEqual(['carbon', 'paper', 'indigo', 'lichen', 'contrast']);
  });

  it('keeps old theme IDs valid while mapping them to semantic editions', () => {
    expect(isValidThemeMode('cyan')).toBe(true);
    expect(isValidThemeMode('carbon')).toBe(true);
    expect(isValidThemeMode('not-a-theme')).toBe(false);
    expect(getUiTheme('cyanLight').id).toBe('paper');
    expect(getUiTheme('highcontrast').id).toBe('contrast');
  });
});
