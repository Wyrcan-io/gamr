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

function stackTracePolicy(_observation: PlaytestObservation, memory: PlaytestMemory): PlaytestAction | undefined {
  const sequence = ['2', 'Enter', 'r'];
  const index = Number(memory.values.get('stack-trace-index') ?? 0);
  if (index >= sequence.length) return undefined;
  memory.values.set('stack-trace-index', index + 1);
  return { key: sequence[index]!, waitMs: 70, label: 'repair first tape' };
}

function wordlePolicy(observation: PlaytestObservation, memory: PlaytestMemory): PlaytestAction | undefined {
  const text = observation.text.toLowerCase();
  if (text.includes('cipher cracked') || text.includes('decryption failed')) return undefined;
  const guesses = ['ARISE', 'GHOST', 'LUCKY', 'LUNCH', 'MAGIC', 'MONEY'];
  const index = Number(memory.values.get('wordle-index') ?? 0);
  const guessIndex = Math.floor(index / 6);
  if (guessIndex >= guesses.length) return undefined;
  const position = index % 6;
  memory.values.set('wordle-index', index + 1);
  return position === 5
    ? { key: 'Enter', waitMs: 140, label: `submit guess ${guessIndex + 1}` }
    : { key: guesses[guessIndex]![position]!, waitMs: 8, label: `type guess ${guessIndex + 1}` };
}

function snakePolicy(observation: PlaytestObservation): PlaytestAction | undefined {
  if (observation.text.toLowerCase().includes('game over')) return undefined;
  return { key: 'ArrowRight', waitMs: 130, label: 'steer snake' };
}

function packetPanicPolicy(_observation: PlaytestObservation, memory: PlaytestMemory): PlaytestAction | undefined {
  const sequence = ['1', 'Enter', 'ArrowRight', '1', 'Enter', 'ArrowRight', '2', 'Enter', 'ArrowDown', '1', 'Enter'];
  const index = Number(memory.values.get('packet-panic-index') ?? 0);
  if (index >= sequence.length) return undefined;
  memory.values.set('packet-panic-index', index + 1);
  return { key: sequence[index]!, waitMs: 70, label: 'build route' };
}

function baseSpec(game: GameInfo): PlaytestSpec {
  const category = game.pace === 'real-time' ? 'real-time' : 'turn-based';
  return {
    gameId: game.id,
    profileVersion: 0,
    coverage: 'generic-smoke',
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
    profileVersion: 1,
    coverage: 'black-box-progress',
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
  'stack-trace': {
    profileVersion: 1,
    coverage: 'seeded-completion',
    category: 'turn-based',
    startActions: [{ key: 'Enter', waitMs: 70, label: 'start campaign' }],
    policy: stackTracePolicy,
    maxActions: 8,
    milestones: [
      { id: 'repair-bench', description: 'The repair bench opens for the first puzzle.', required: true, detect: textIncludes('repair bench', 'read the contract', 'program modified') },
      { id: 'first-clear', description: 'The first puzzle test suite passes.', required: true, detect: textIncludes('all tests pass', 'repair accepted') },
    ],
  },
  'wordle': {
    profileVersion: 1,
    coverage: 'seeded-completion',
    category: 'text-entry',
    startActions: [{ key: 'a', waitMs: 70, label: 'start cipher' }],
    policy: wordlePolicy,
    maxActions: 45,
    maxElapsedMs: 8000,
    milestones: [
      { id: 'guess-board', description: 'The cipher accepts a five-letter guess.', required: true, detect: textIncludes('attempt 2/6', 'attempt 3/6', 'cipher cracked', 'decryption failed') },
      { id: 'cipher-ending', description: 'The cipher reaches a win or loss ending.', required: true, detect: textIncludes('cipher cracked', 'decryption failed') },
    ],
  },
  'snake': {
    profileVersion: 1,
    coverage: 'black-box-progress',
    category: 'real-time',
    startActions: [{ key: 'ArrowRight', waitMs: 100, label: 'start snake' }],
    policy: snakePolicy,
    maxActions: 40,
    maxElapsedMs: 7000,
    maxStalledFrames: 80,
    milestones: [
      { id: 'snake-active', description: 'Snake gameplay is active and a score is visible.', required: true, detect: textIncludes('score:', 'high score') },
      { id: 'snake-ending', description: 'Snake reaches a controlled game-over state.', required: true, detect: textIncludes('game over', 'final score') },
    ],
  },
  'packet-panic': {
    profileVersion: 1,
    coverage: 'black-box-progress',
    category: 'real-time',
    startActions: [{ key: 'Enter', waitMs: 100, label: 'start network shift' }],
    policy: packetPanicPolicy,
    maxActions: 18,
    maxElapsedMs: 6000,
    milestones: [
      { id: 'operator-panel', description: 'The network operator panel is active.', required: true, detect: textIncludes('operator panel', 'topology') },
      {
        id: 'router-action',
        description: 'A router action is accepted or the tutorial advances.',
        required: true,
        detect: observation => observation.actionCount > 1 && (textIncludes('link placed', 'bend placed', 'split placed', 'firewall placed', 'router rotated', 'packet delivered')(observation) || /---|L[-|]/u.test(observation.text)),
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

export function incompletePlaytestSpecs(games: readonly GameInfo[], registry: ReadonlyMap<string, PlaytestSpec>): string[] {
  const incomplete: string[] = [];
  for (const game of games) {
    const spec = registry.get(game.id);
    if (!spec || spec.coverage === 'generic-smoke') incomplete.push(game.id);
  }
  return incomplete;
}
