import type {
  ContractTemplate,
  ExpressionDefinition,
  LampMode,
  MutationDefinition,
  SpeciesDefinition,
  WaterMode,
} from './types';

export const LAMP_MODES: LampMode[] = ['off', 'blue', 'red', 'uv'];
export const WATER_MODES: WaterMode[] = ['dry', 'mist', 'soak'];

export const LAMP_COST: Record<LampMode, number> = { off: 0, blue: 1, red: 1, uv: 2 };
export const WATER_COST: Record<WaterMode, number> = { dry: 0, mist: 1, soak: 2 };

export const CHAMBER_ORDER = ['a1', 'a2', 'b1', 'b2'] as const;
export const CHAMBER_NEIGHBOURS: Record<(typeof CHAMBER_ORDER)[number], string[]> = {
  a1: ['a2', 'b1'],
  a2: ['a1', 'b2'],
  b1: ['a1', 'b2'],
  b2: ['a2', 'b1'],
};

export const SPECIES: SpeciesDefinition[] = [
  {
    id: 'heliox', name: 'Heliox Fern', shortName: 'HELIOX', glyph: '♧', asciiGlyph: 'F',
    tags: ['starter', 'blue'],
    lightFit: { off: 0, blue: 2, red: 1, uv: 1 },
    waterFit: { dry: 0, mist: 2, soak: 1 }, baseRooting: 0, baseSpores: 0,
    description: 'A patient fern that turns blue light into safe bulk.',
  },
  {
    id: 'cinder', name: 'Cinder Orchid', shortName: 'CINDER', glyph: '✿', asciiGlyph: 'O',
    tags: ['xeric', 'bloom'],
    lightFit: { off: 0, blue: 1, red: 2, uv: 0 },
    waterFit: { dry: 2, mist: 1, soak: 0 }, baseRooting: 0, baseSpores: 1,
    description: 'A dry red bloomer with petals like cooling glass.',
  },
  {
    id: 'mire', name: 'Mire Bell', shortName: 'MIRE', glyph: '◒', asciiGlyph: 'M',
    tags: ['wet', 'bloom', 'spore'],
    lightFit: { off: 0, blue: 1, red: 2, uv: 1 },
    waterFit: { dry: 0, mist: 1, soak: 2 }, baseRooting: 1, baseSpores: 2,
    description: 'A wetland bell that rewards soak lines and fills filters quickly.',
  },
  {
    id: 'nocturne', name: 'Nocturne Moss', shortName: 'NOCTURNE', glyph: '❋', asciiGlyph: 'N',
    tags: ['nocturnal', 'creeping'],
    lightFit: { off: 2, blue: 1, red: 0, uv: 2 },
    waterFit: { dry: 0, mist: 2, soak: 1 }, baseRooting: 1, baseSpores: 1,
    description: 'A dark-loving moss that glows when the lamps go quiet.',
  },
  {
    id: 'prism', name: 'Prism Vine', shortName: 'PRISM', glyph: '⌁', asciiGlyph: 'V',
    tags: ['flexible', 'invasive'],
    lightFit: { off: 0, blue: 2, red: 1, uv: 2 },
    waterFit: { dry: 0, mist: 1, soak: 2 }, baseRooting: 2, baseSpores: 1,
    description: 'A flexible vine with spectacular output and unruly roots.',
  },
];

export const MUTATIONS: MutationDefinition[] = [
  { id: 'solar-sails', name: 'Solar Sails', shortName: 'SOLAR', description: '+1 Blue fit; Blue growth adds Mass. Heavy plants press roots harder.' },
  { id: 'reservoir-bladders', name: 'Reservoir Bladders', shortName: 'RESERVOIR', description: 'Dry fit becomes 1; Soak fit +1. Soak growth adds root pressure.' },
  { id: 'ember-corolla', name: 'Ember Corolla', shortName: 'EMBER', description: 'Red Bloom +1, but blooming emits one extra spore.' },
  { id: 'lumen-veins', name: 'Lumen Veins', shortName: 'LUMEN', description: 'UV Glow +1 and UV stress is ignored.' },
  { id: 'anchor-roots', name: 'Anchor Roots', shortName: 'ANCHOR', description: 'Fitting cycles recover one extra Stress; growth adds root pressure.' },
  { id: 'sterile-crown', name: 'Sterile Crown', shortName: 'STERILE', description: 'Zero spores, but Bloom is reduced by one unless sealed with Ember Corolla.' },
  { id: 'mirror-skin', name: 'Mirror Skin', shortName: 'MIRROR', description: 'UV fit +1 and reflects light to adjacent dark chambers.' },
  { id: 'mycelial-bridge', name: 'Mycelial Bridge', shortName: 'MYCELIAL', description: 'High-water plants share fit with adjacent dry-loving plants.' },
  { id: 'night-clock', name: 'Night Clock', shortName: 'NIGHT', description: 'Off fit becomes 1; Off + Mist grows Glow. Red fit -1.' },
  { id: 'runner-nodes', name: 'Runner Nodes', shortName: 'RUNNER', description: 'Soak growth adds Mass, but roots surge by two.' },
];

export const EXPRESSIONS: ExpressionDefinition[] = [
  { id: 'solar-corolla', name: 'Solar Corolla', requires: ['solar-sails', 'ember-corolla'], description: 'Red flowering also adds one Mass.' },
  { id: 'starwell', name: 'Starwell', requires: ['reservoir-bladders', 'lumen-veins'], description: 'Soak + UV creates a deep Glow burst and root surge.' },
  { id: 'sealed-bouquet', name: 'Sealed Bouquet', requires: ['ember-corolla', 'sterile-crown'], description: 'Sterility keeps all Bloom without its spores.' },
  { id: 'prism-relay', name: 'Prism Relay', requires: ['mirror-skin', 'lumen-veins'], description: 'Reflected neighbours receive an extra Glow.' },
  { id: 'shared-cistern', name: 'Shared Cistern', requires: ['mycelial-bridge', 'reservoir-bladders'], description: 'Water sharing grants a larger fit boost.' },
  { id: 'moon-lantern', name: 'Moon Lantern', requires: ['night-clock', 'lumen-veins'], description: 'Dark, hydrated cycles create a huge Glow and recover Stress.' },
  { id: 'living-trellis', name: 'Living Trellis', requires: ['anchor-roots', 'runner-nodes'], description: 'Runner roots are held to a higher pressure threshold.' },
  { id: 'heliostat-canopy', name: 'Heliostat Canopy', requires: ['solar-sails', 'mirror-skin'], description: 'Blue light can reflect into an adjacent dark chamber.' },
];

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: 'verdant', name: 'Verdant Biomass', tier: 1, requirements: [{ kind: 'statMin', stat: 'mass', value: 6 }, { kind: 'statMax', stat: 'stress', value: 3 }], baseFunding: 2, priorityOffset: 4, description: 'A sturdy mass sample with no visible distress.' },
  { id: 'ceremonial', name: 'Ceremonial Bloom', tier: 1, requirements: [{ kind: 'statMin', stat: 'bloom', value: 3 }, { kind: 'statMax', stat: 'stress', value: 3 }], baseFunding: 2, priorityOffset: 4, description: 'Three clean blooms for the orbital ceremony.' },
  { id: 'lantern', name: 'Lantern Sample', tier: 1, requirements: [{ kind: 'statMin', stat: 'glow', value: 3 }, { kind: 'statMin', stat: 'mass', value: 3 }], baseFunding: 2, priorityOffset: 5, description: 'A bright but substantial bioluminescent sample.' },
  { id: 'control', name: 'Unmodified Control', tier: 1, requirements: [{ kind: 'statMin', stat: 'mass', value: 5 }, { kind: 'mutationCount', value: 0 }], baseFunding: 2, priorityOffset: 5, description: 'A clean baseline with no inserted mutations.' },
  { id: 'dryland', name: 'Dryland Orchid', tier: 1, requirements: [{ kind: 'species', speciesId: 'cinder' }, { kind: 'statMin', stat: 'bloom', value: 2 }], baseFunding: 2, priorityOffset: 4, description: 'A red Cinder Orchid grown on a dry line.' },
  { id: 'sterile', name: 'Sterile Bouquet', tier: 2, requirements: [{ kind: 'statMin', stat: 'bloom', value: 4 }, { kind: 'sterile' }], baseFunding: 3, priorityOffset: 5, description: 'A high-flower specimen that cannot seed the lab.' },
  { id: 'safe-giant', name: 'Safe Giant', tier: 2, requirements: [{ kind: 'statMin', stat: 'mass', value: 9 }, { kind: 'statMax', stat: 'rootPressure', value: 5 }], baseFunding: 3, priorityOffset: 5, description: 'Large growth without dangerous roots.' },
  { id: 'prism-culture', name: 'Prism Culture', tier: 2, requirements: [{ kind: 'statMin', stat: 'glow', value: 5 }, { kind: 'expression', expressionId: 'prism-relay' }], baseFunding: 3, priorityOffset: 6, description: 'A relay culture that illuminates its neighbour.' },
  { id: 'dual-use', name: 'Dual-Use Specimen', tier: 2, requirements: [{ kind: 'statMin', stat: 'mass', value: 6 }, { kind: 'statMin', stat: 'bloom', value: 3 }, { kind: 'statMin', stat: 'glow', value: 2 }], baseFunding: 3, priorityOffset: 6, description: 'Mass, flower, and light in one culture.' },
  { id: 'rooted-survivor', name: 'Rooted Survivor', tier: 2, requirements: [{ kind: 'mutation', mutationId: 'anchor-roots' }, { kind: 'statMax', stat: 'stress', value: 1 }, { kind: 'statMin', stat: 'mass', value: 7 }], baseFunding: 3, priorityOffset: 6, description: 'A calm specimen that recovers from harsh handling.' },
  { id: 'deep-space', name: 'Deep-Space Beacon', tier: 3, requirements: [{ kind: 'statMin', stat: 'glow', value: 7 }, { kind: 'expression', expressionId: 'starwell' }], baseFunding: 4, priorityOffset: 12, description: 'A Starwell beacon for the dark-side survey.' },
  { id: 'biosecure-floral', name: 'Biosecure Floral Array', tier: 3, requirements: [{ kind: 'statMin', stat: 'bloom', value: 6 }, { kind: 'expression', expressionId: 'sealed-bouquet' }, { kind: 'statMax', stat: 'stress', value: 2 }], baseFunding: 4, priorityOffset: 12, description: 'The flowers are vivid; the filter stays empty.' },
  { id: 'living-trellis', name: 'Living Trellis Sample', tier: 3, requirements: [{ kind: 'statMin', stat: 'mass', value: 11 }, { kind: 'expression', expressionId: 'living-trellis' }, { kind: 'statMax', stat: 'rootPressure', value: 7 }], baseFunding: 4, priorityOffset: 12, description: 'A giant held inside its own root lattice.' },
  { id: 'heliostat', name: 'Heliostat Demonstrator', tier: 3, requirements: [{ kind: 'expression', expressionId: 'heliostat-canopy' }, { kind: 'statMin', stat: 'glow', value: 4 }, { kind: 'statMin', stat: 'mass', value: 8 }], baseFunding: 4, priorityOffset: 12, description: 'A blue canopy that lights a dark neighbour.' },
  { id: 'impossible-colors', name: 'Impossible Colors Grant', tier: 3, requirements: [{ kind: 'mutationCount', value: 2 }, { kind: 'statMin', stat: 'bloom', value: 4 }, { kind: 'statMin', stat: 'glow', value: 5 }], baseFunding: 4, priorityOffset: 12, description: 'Two edits, four petals, and impossible light.' },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(item => [item.id, item])) as Record<SpeciesDefinition['id'], SpeciesDefinition>;
export const MUTATION_BY_ID = Object.fromEntries(MUTATIONS.map(item => [item.id, item])) as Record<MutationDefinition['id'], MutationDefinition>;
export const EXPRESSION_BY_ID = Object.fromEntries(EXPRESSIONS.map(item => [item.id, item])) as Record<ExpressionDefinition['id'], ExpressionDefinition>;
export const CONTRACT_BY_ID = Object.fromEntries(CONTRACT_TEMPLATES.map(item => [item.id, item])) as Record<string, ContractTemplate>;

export const SPECIMEN_NAMES = ['IVY-4', 'MOTH-9', 'ORBIT-2', 'KITE-7', 'LATCH-3', 'VESSEL-8', 'NOVA-6', 'SABLE-1'];
