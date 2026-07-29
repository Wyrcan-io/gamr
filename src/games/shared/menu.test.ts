import { describe, it, expect } from 'vitest';
import {
  createMenuState,
  menuUp,
  menuDown,
  menuReset,
  navigateMenu,
  checkShortcut,
  PAUSE_MENU_ITEMS,
  MODE_SELECT_ITEMS,
  type MenuItem,
  type SimpleMenuItem,
} from './menu';

describe('createMenuState', () => {
  it('creates menu state with selection at 0', () => {
    const items: MenuItem[] = [
      { label: 'Option 1', action: () => {} },
      { label: 'Option 2', action: () => {} },
    ];
    const state = createMenuState(items);
    expect(state.selection).toBe(0);
    expect(state.items).toBe(items);
  });

  it('works with empty items array', () => {
    const state = createMenuState([]);
    expect(state.selection).toBe(0);
    expect(state.items).toHaveLength(0);
  });
});

describe('menuUp', () => {
  it('decrements selection', () => {
    const state = createMenuState([
      { label: 'A', action: () => {} },
      { label: 'B', action: () => {} },
      { label: 'C', action: () => {} },
    ]);
    state.selection = 2;
    menuUp(state);
    expect(state.selection).toBe(1);
  });

  it('wraps from first to last item', () => {
    const state = createMenuState([
      { label: 'A', action: () => {} },
      { label: 'B', action: () => {} },
      { label: 'C', action: () => {} },
    ]);
    state.selection = 0;
    menuUp(state);
    expect(state.selection).toBe(2);
  });
});

describe('menuDown', () => {
  it('increments selection', () => {
    const state = createMenuState([
      { label: 'A', action: () => {} },
      { label: 'B', action: () => {} },
      { label: 'C', action: () => {} },
    ]);
    state.selection = 0;
    menuDown(state);
    expect(state.selection).toBe(1);
  });

  it('wraps from last to first item', () => {
    const state = createMenuState([
      { label: 'A', action: () => {} },
      { label: 'B', action: () => {} },
      { label: 'C', action: () => {} },
    ]);
    state.selection = 2;
    menuDown(state);
    expect(state.selection).toBe(0);
  });
});

describe('menuReset', () => {
  it('resets selection to 0', () => {
    const state = createMenuState([
      { label: 'A', action: () => {} },
      { label: 'B', action: () => {} },
    ]);
    state.selection = 1;
    menuReset(state);
    expect(state.selection).toBe(0);
  });
});

describe('navigateMenu', () => {
  // Helper to create mock keyboard event
  function mockKeyEvent(key: string): KeyboardEvent {
    return { key } as KeyboardEvent;
  }

  describe('arrow navigation', () => {
    it('moves up with ArrowUp', () => {
      const result = navigateMenu(2, 5, '', mockKeyEvent('ArrowUp'));
      expect(result.newSelection).toBe(1);
      expect(result.confirmed).toBe(false);
    });

    it('moves down with ArrowDown', () => {
      const result = navigateMenu(2, 5, '', mockKeyEvent('ArrowDown'));
      expect(result.newSelection).toBe(3);
      expect(result.confirmed).toBe(false);
    });

    it('moves up with w key', () => {
      const result = navigateMenu(2, 5, 'w', mockKeyEvent('w'));
      expect(result.newSelection).toBe(1);
    });

    it('moves down with s key', () => {
      const result = navigateMenu(2, 5, 's', mockKeyEvent('s'));
      expect(result.newSelection).toBe(3);
    });
  });

  describe('wrapping behavior', () => {
    it('wraps up from first item to last', () => {
      const result = navigateMenu(0, 3, '', mockKeyEvent('ArrowUp'));
      expect(result.newSelection).toBe(2);
    });

    it('wraps down from last item to first', () => {
      const result = navigateMenu(2, 3, '', mockKeyEvent('ArrowDown'));
      expect(result.newSelection).toBe(0);
    });
  });

  describe('confirmation', () => {
    it('confirms with Enter', () => {
      const result = navigateMenu(1, 3, '', mockKeyEvent('Enter'));
      expect(result.confirmed).toBe(true);
      expect(result.newSelection).toBe(1); // Selection unchanged
    });

    it('confirms with Space', () => {
      const result = navigateMenu(1, 3, '', mockKeyEvent(' '));
      expect(result.confirmed).toBe(true);
    });
  });

  describe('no action keys', () => {
    it('returns same selection for unhandled keys', () => {
      const result = navigateMenu(1, 3, 'x', mockKeyEvent('x'));
      expect(result.newSelection).toBe(1);
      expect(result.confirmed).toBe(false);
    });
  });
});

describe('checkShortcut', () => {
  const items: SimpleMenuItem[] = [
    { label: 'Resume', shortcut: 'ESC' },
    { label: 'Restart', shortcut: 'R' },
    { label: 'Quit', shortcut: 'Q' },
    { label: 'No Shortcut' },
  ];

  it('returns index of matching shortcut (case insensitive)', () => {
    expect(checkShortcut(items, 'r')).toBe(1);
    expect(checkShortcut(items, 'q')).toBe(2);
  });

  it('returns -1 for no match', () => {
    expect(checkShortcut(items, 'x')).toBe(-1);
  });

  it('handles ESC shortcut', () => {
    expect(checkShortcut(items, 'esc')).toBe(0);
  });

  it('ignores items without shortcuts', () => {
    const result = checkShortcut(items, 'n');
    expect(result).toBe(-1);
  });

  it('returns first match when multiple items have same shortcut', () => {
    const dupeItems: SimpleMenuItem[] = [
      { label: 'First', shortcut: 'A' },
      { label: 'Second', shortcut: 'A' },
    ];
    expect(checkShortcut(dupeItems, 'a')).toBe(0);
  });
});

describe('predefined menu items', () => {
  describe('PAUSE_MENU_ITEMS', () => {
    it('has expected items', () => {
      const labels = PAUSE_MENU_ITEMS.map(i => i.label);
      expect(labels).toContain('RESUME');
      expect(labels).toContain('RESTART');
      expect(labels).toContain('QUIT');
      expect(labels).toContain('LIST GAMES');
      expect(labels).toContain('NEXT GAME');
    });

    it('has correct shortcuts', () => {
      const resume = PAUSE_MENU_ITEMS.find(i => i.label === 'RESUME');
      const restart = PAUSE_MENU_ITEMS.find(i => i.label === 'RESTART');
      const quit = PAUSE_MENU_ITEMS.find(i => i.label === 'QUIT');

      expect(resume?.shortcut).toBe('ESC');
      expect(restart?.shortcut).toBe('R');
      expect(quit?.shortcut).toBe('Q');
    });
  });

  describe('MODE_SELECT_ITEMS', () => {
    it('has tutorial and play options', () => {
      const labels = MODE_SELECT_ITEMS.map(i => i.label);
      expect(labels).toContain('TUTORIAL');
      expect(labels).toContain('PLAY');
    });

    it('has correct shortcuts', () => {
      const tutorial = MODE_SELECT_ITEMS.find(i => i.label === 'TUTORIAL');
      const play = MODE_SELECT_ITEMS.find(i => i.label === 'PLAY');

      expect(tutorial?.shortcut).toBe('T');
      expect(play?.shortcut).toBe('P');
    });
  });
});
