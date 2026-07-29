/**
 * Puzzle Fighter Characters — Drop patterns, damage modifiers, portraits
 *
 * Each character has a unique 4x6 color grid (dropPattern) that determines
 * where and what color garbage lands on the opponent's board. This is the
 * single biggest strategic differentiator between characters.
 */

import type { GemColor } from './engine';
import type { Pose } from './effects';

// ============================================================================
// Types
// ============================================================================

export interface Character {
  id: string;
  name: string;
  description: string;
  dropPattern: GemColor[][]; // 4 rows x 6 cols
  damageModifier: number;
  portraits: Record<Pose, string[]>; // 3 lines per pose
}

// ============================================================================
// Shorthand
// ============================================================================

const R: GemColor = 'red';
const G: GemColor = 'green';
const B: GemColor = 'blue';
const Y: GemColor = 'yellow';

// ============================================================================
// Characters
// ============================================================================

const ryu: Character = {
  id: 'ryu',
  name: 'Ryu',
  description: 'Vertical columns',
  damageModifier: 1.0,
  dropPattern: [
    [R, G, B, Y, R, G],
    [R, G, B, Y, R, G],
    [R, G, B, Y, R, G],
    [R, G, B, Y, R, G],
  ],
  portraits: {
    idle:   ['  __  ', ' (-_-)', '  /|  '],
    attack: [' _\\__ ', ' (>o<)', ' =|/  '],
    hit:    ['  __  ', ' (x_x)', '  /|  '],
    win:    [' \\__/ ', ' (^o^)', '  /\\  '],
    lose:   ['  __  ', ' (;_;)', '   |  '],
  },
};

const ken: Character = {
  id: 'ken',
  name: 'Ken',
  description: 'Horizontal rows',
  damageModifier: 1.0,
  dropPattern: [
    [Y, Y, Y, Y, Y, Y],
    [G, G, G, G, G, G],
    [B, B, B, B, B, B],
    [R, R, R, R, R, R],
  ],
  portraits: {
    idle:   [' ^^^  ', ' [>_>]', '  /|  '],
    attack: [' ^^^/ ', ' [>o<]', ' /=|  '],
    hit:    [' ^^^  ', ' [x_x]', '  /|  '],
    win:    [' \\^^/ ', ' [^o^]', '  /\\  '],
    lose:   [' ^^^  ', ' [;_;]', '   |  '],
  },
};

const chunLi: Character = {
  id: 'chunli',
  name: 'Chun-Li',
  description: '2x2 color blocks',
  damageModifier: 1.2,
  dropPattern: [
    [R, R, G, G, B, B],
    [R, R, G, G, B, B],
    [Y, Y, R, R, G, G],
    [Y, Y, R, R, G, G],
  ],
  portraits: {
    idle:   [' @  @ ', ' {^.^}', '  /|  '],
    attack: [' @  @\\', ' {>.<}', '  /|= '],
    hit:    [' @  @ ', ' {x.x}', '  /|  '],
    win:    ['\\@  @/', ' {^o^}', '  /\\  '],
    lose:   [' @  @ ', ' {;.;}', '   |  '],
  },
};

const sakura: Character = {
  id: 'sakura',
  name: 'Sakura',
  description: 'Fixed edges, alt middle',
  damageModifier: 1.0,
  dropPattern: [
    [G, R, B, R, B, Y],
    [G, B, R, B, R, Y],
    [G, R, B, R, B, Y],
    [G, B, R, B, R, Y],
  ],
  portraits: {
    idle:   ['  >>  ', ' <*_*>', '  /|  '],
    attack: ['  >>/ ', ' <*o*>', '  /|= '],
    hit:    ['  >>  ', ' <x_x>', '  /|  '],
    win:    [' \\>>/ ', ' <^o^>', '  /\\  '],
    lose:   ['  >>  ', ' <;_;>', '   |  '],
  },
};

const morrigan: Character = {
  id: 'morrigan',
  name: 'Morrigan',
  description: 'Symmetric mirrored',
  damageModifier: 1.0,
  dropPattern: [
    [B, G, R, R, G, B],
    [G, B, R, R, B, G],
    [R, G, B, B, G, R],
    [G, R, B, B, R, G],
  ],
  portraits: {
    idle:   [' ~  ~ ', ' ~^_^~', '  /|  '],
    attack: [' ~/~\\ ', ' ~>_<~', '  /|  '],
    hit:    [' ~  ~ ', ' ~x_x~', '  /|  '],
    win:    ['\\~  ~/','  ~^o~ ', '  /\\  '],
    lose:   [' ~  ~ ', ' ~;_;~', '   |  '],
  },
};

const hsienKo: Character = {
  id: 'hsienKo',
  name: 'Hsien-Ko',
  description: 'Diagonal staircase',
  damageModifier: 1.0,
  dropPattern: [
    [R, G, B, Y, R, G],
    [G, B, Y, R, G, B],
    [B, Y, R, G, B, Y],
    [Y, R, G, B, Y, R],
  ],
  portraits: {
    idle:   ['  ==  ', ' |o_o|', '  /|  '],
    attack: ['  ==\\ ', ' |o_o|', '  /|= '],
    hit:    ['  ==  ', ' |x_x|', '  /|  '],
    win:    [' \\==/ ', ' |^o^|', '  /\\  '],
    lose:   ['  ==  ', ' |;_;|', '   |  '],
  },
};

const felicia: Character = {
  id: 'felicia',
  name: 'Felicia',
  description: 'Fixed edges, swap mid',
  damageModifier: 1.0,
  dropPattern: [
    [G, R, B, R, B, Y],
    [G, B, R, B, R, Y],
    [Y, R, B, R, B, G],
    [Y, B, R, B, R, G],
  ],
  portraits: {
    idle:   [' /\\/\\ ', ' =^w^=', '  /|  '],
    attack: [' /\\/\\\\', ' =^o^=', '  /|= '],
    hit:    [' /\\/\\ ', ' =x_x=', '  /|  '],
    win:    ['\\/\\/\\/', ' =^w^=', '  /\\  '],
    lose:   [' /\\/\\ ', ' =;w;=', '   |  '],
  },
};

const donovan: Character = {
  id: 'donovan',
  name: 'Donovan',
  description: '3-col halves + alt base',
  damageModifier: 1.0,
  dropPattern: [
    [R, R, R, G, G, G],
    [R, R, R, G, G, G],
    [B, B, B, Y, Y, Y],
    [R, G, B, R, G, B],
  ],
  portraits: {
    idle:   ['  ||  ', ' #-_-#', '  /|  '],
    attack: ['  ||/ ', ' #>_<#', '  /|= '],
    hit:    ['  ||  ', ' #x_x#', '  /|  '],
    win:    [' \\||/ ', ' #^o^#', '  /\\  '],
    lose:   ['  ||  ', ' #;_;#', '   |  '],
  },
};

const dan: Character = {
  id: 'dan',
  name: 'Dan',
  description: 'ALL RED (joke char)',
  damageModifier: 1.0,
  dropPattern: [
    [R, R, R, R, R, R],
    [R, R, R, R, R, R],
    [R, R, R, R, R, R],
    [R, R, R, R, R, R],
  ],
  portraits: {
    idle:   ['  ^^  ', ' (?_?)', '  /|  '],
    attack: ['  ^^! ', ' (!o!)', '  /|~ '],
    hit:    ['  ^^  ', ' (x_x)', '  /|  '],
    win:    [' \\^^/ ', ' (^o^)', '  /\\  '],
    lose:   ['  ^^  ', ' (T_T)', '   |  '],
  },
};

const akuma: Character = {
  id: 'akuma',
  name: 'Akuma',
  description: 'Diagonal rainbow cycle',
  damageModifier: 0.7,
  dropPattern: [
    [R, Y, B, G, R, Y],
    [Y, B, G, R, Y, B],
    [B, G, R, Y, B, G],
    [G, R, Y, B, G, R],
  ],
  portraits: {
    idle:   [' /MM\\ ', ' !>_<!', '  /|  '],
    attack: [' /MM\\|', ' !>o<!', ' =/|  '],
    hit:    [' /MM\\ ', ' !x_x!', '  /|  '],
    win:    ['\\/MM\\/', ' !^_^!', '  /\\  '],
    lose:   [' /MM\\ ', ' !;_;!', '   |  '],
  },
};

const devilotte: Character = {
  id: 'devilotte',
  name: 'Devilotte',
  description: 'Reverse diagonal rainbow',
  damageModifier: 0.7,
  dropPattern: [
    [G, B, Y, R, G, B],
    [B, Y, R, G, B, Y],
    [Y, R, G, B, Y, R],
    [R, G, B, Y, R, G],
  ],
  portraits: {
    idle:   ['  vVv ', ' $v_v$', '  /|  '],
    attack: ['  vVv\\', ' $>_<$', '  /|= '],
    hit:    ['  vVv ', ' $x_x$', '  /|  '],
    win:    [' \\vVv/', ' $^_^$', '  /\\  '],
    lose:   ['  vVv ', ' $;_;$', '   |  '],
  },
};

// ============================================================================
// Exports
// ============================================================================

export const CHARACTERS: Character[] = [
  ryu, ken, chunLi, sakura,
  morrigan, hsienKo, felicia, donovan,
  dan, akuma, devilotte,
];

/** Character select grid layout: 4-4-3 arrangement */
export const CHAR_GRID = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10],
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export function getRandomCharacter(): Character {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}
