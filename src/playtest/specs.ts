import { allGames } from '../games';
import type { GameInfo } from '../games';
import type { PlaytestAction, PlaytestMemory, PlaytestObservation, PlaytestSpec } from './types';

function textIncludes(...needles: string[]) {
  return (observation: PlaytestObservation): boolean => {
    const text = observation.text.toLowerCase();
    return needles.some(needle => text.includes(needle.toLowerCase()));
  };
}

function genericPolicy(_observation: PlaytestObservation, memory: PlaytestMemory): PlaytestAction {
  const keys = ['?', 'h', 'ArrowRight', 'ArrowDown', 'Enter', ' ', 'ArrowLeft', 'ArrowUp', 'r'];
  const index = Number(memory.values.get('generic-index') ?? 0);
  memory.values.set('generic-index', index + 1);
  return { key: keys[index % keys.length]!, waitMs: 35, label: 'generic exploration' };
}

function deadLetterPolicy(_observation: PlaytestObservation, memory: PlaytestMemory): PlaytestAction {
  const keys = ['Enter', 'Enter', '1', 'Enter', '2', 'Enter', '3', 'Enter', '4', 'Enter'];
  const index = Number(memory.values.get('dead-letter-index') ?? 0);
  memory.values.set('dead-letter-index', index + 1);
  return { key: keys[index % keys.length]!, waitMs: 70, label: 'desk progression' };
}

function baseSpec(game: GameInfo): PlaytestSpec {
  const category = game.pace === 'real-time' ? 'real-time' : 'turn-based';
  return {
    gameId: game.id,
    category,
    description: `Generic player profile for ${game.name}`,
    startActions: [{ key: 'Enter', waitMs: 60, label: 'start game' }],
    milestones: [
      {
        id: 'rendered',
        description: 'The game renders a visible terminal frame.',
        required: true,
        detect: observation => observation.text.trim().length > 0,
      },
      {
        id: 'responded',
        description: 'At least one input changes the visible frame.',
        required: true,
        detect: (observation, history) => observation.actionCount > 0 && (observation.changed || history.some(item => item.changed && item.actionCount > 0)),
      },
    ],
    policy: genericPolicy,
  };
}

const overrides: Record<string, Partial<PlaytestSpec>> = {
  'dead-letter-department': {
    startActions: [{ key: 'Enter', waitMs: 70 }, { key: 'Enter', waitMs: 30 }],
    policy: deadLetterPolicy,
    milestones: [
      {
        id: 'desk-open',
        description: 'The inbox reaches the working desk.',
        required: true,
        detect: textIncludes('inbox open', 'inspect the next letter', 'choose a destination', 'active regulations'),
      },
      {
        id: 'audit-reached',
        description: 'A letter is evaluated and an audit result is shown.',
        required: true,
        detect: textIncludes('audit', 'accepted', 'audit flag'),
      },
    ],
  },
};

export function createPlaytestRegistry(games: readonly GameInfo[] = allGames): Map<string, PlaytestSpec> {
  return new Map(games.map(game => {
    const spec = baseSpec(game);
    const override = overrides[game.id];
    return [game.id, { ...spec, ...override, milestones: override?.milestones ?? spec.milestones }];
  }));
}

export function missingPlaytestSpecs(games: readonly GameInfo[], registry: ReadonlyMap<string, PlaytestSpec>): string[] {
  return games.map(game => game.id).filter(id => !registry.has(id));
}
