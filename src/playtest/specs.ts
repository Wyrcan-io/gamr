import { allGames } from '../games';
import type { GameInfo } from '../games';
import type { PlaytestAction, PlaytestMemory, PlaytestObservation, PlaytestSpec, PlayerPolicy } from './types';

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

function fiveMinutePolicy(_observation: PlaytestObservation, memory: PlaytestMemory): PlaytestAction | undefined {
  const sequence: string[] = [];
  for (let turn = 1; turn <= 9; turn += 1) {
    sequence.push('1', 'Enter', 'Enter', 'Enter');
    if (turn === 3 || turn === 6 || turn === 9) sequence.push('Enter');
  }
  const index = Number(memory.values.get('five-minute-index') ?? 0);
  if (index >= sequence.length) return undefined;
  memory.values.set('five-minute-index', index + 1);
  return { key: sequence[index]!, waitMs: 70, label: 'draft kingdom' };
}

function scriptedPolicy(sequence: string[], memoryKey: string, label: string, waitMs = 70): PlayerPolicy {
  return (_observation, memory) => {
    const index = Number(memory.values.get(memoryKey) ?? 0);
    if (index >= sequence.length) return undefined;
    memory.values.set(memoryKey, index + 1);
    return { key: sequence[index]!, waitMs, label };
  };
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
  'five-minute-kingdom': {
    profileVersion: 1,
    coverage: 'seeded-completion',
    category: 'turn-based',
    startActions: [{ key: 'Enter', waitMs: 90, label: 'open deed market' }],
    policy: fiveMinutePolicy,
    maxActions: 45,
    maxElapsedMs: 9000,
    maxStalledFrames: 50,
    milestones: [
      { id: 'kingdom-market', description: 'The deed market is open.', required: true, detect: textIncludes('deed market', 'choose one offer') },
      { id: 'placement-preview', description: 'A legal placement projection is visible.', required: true, detect: textIncludes('projection', 'legal target', 'preview') },
      { id: 'placement-recorded', description: 'A placement is committed and score changes.', required: true, detect: textIncludes('placement recorded', 'glory') },
      { id: 'kingdom-ending', description: 'The final kingdom chronicle is reached.', required: true, detect: textIncludes('kingdom chronicle sealed', 'final glory') },
    ],
  },
  'signal-noise': {
    profileVersion: 1,
    coverage: 'seeded-completion',
    category: 'turn-based',
    startActions: [{ key: 't', waitMs: 70, label: 'start induction' }],
    policy: scriptedPolicy(['Enter', 'Enter', 'Tab', 'Tab', 'Enter', '1', 'Enter', 'Enter'], 'signal-noise-index', 'resolve induction receiver'),
    maxActions: 18,
    maxElapsedMs: 7000,
    milestones: [
      { id: 'receiver-open', description: 'The listening post opens after the induction brief.', required: true, detect: textIncludes('LISTENING POST', 'SWEEP OR TUNE') },
      { id: 'bearing-captured', description: 'The receiver exposes locks or candidate zones.', required: true, detect: textIncludes('LOCKS', 'CANDIDATES') },
      { id: 'channel-resolved', description: 'The induction channel reaches a controlled response.', required: true, detect: textIncludes('CHANNEL STABLE', 'INDUCTION COMPLETE') },
    ],
  },
  'last-train-home': {
    profileVersion: 1,
    coverage: 'seeded-completion',
    category: 'turn-based',
    startActions: [{ key: 't', waitMs: 70, label: 'start dispatch induction' }],
    policy: scriptedPolicy(['Enter', '1', 'Enter', 'Enter', 'Tab', 'Tab', '2', 'Enter', 'Enter', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', '3', 'Enter'], 'last-train-home-index', 'complete dispatch induction'),
    maxActions: 26,
    maxElapsedMs: 9000,
    milestones: [
      { id: 'dispatch-open', description: 'The induction dispatch board opens.', required: true, detect: textIncludes('DISPATCH INDUCTION', 'NEXT COMMIT') },
      { id: 'turn-projection', description: 'The first committed turn produces a visible resolution.', required: true, detect: textIncludes('TURN 1 RESOLUTION', 'NEXT COMMIT') },
      { id: 'induction-complete', description: 'The three-step railway induction reaches its ending.', required: true, detect: textIncludes('TUTORIAL COMPLETE', 'INDUCTION COMPLETE') },
    ],
  },
  'market-of-mirrors': {
    profileVersion: 1,
    coverage: 'seeded-completion',
    category: 'turn-based',
    startActions: [{ key: 't', waitMs: 70, label: 'start guided fair' }],
    policy: scriptedPolicy(['Enter', 'b', 'Enter', '2', 'b', 'Enter', 'e', 'Enter', '1', 'c', 'Enter', 'e', 'Enter', 'p', 'Enter', 'e', 'Enter'], 'market-of-mirrors-index', 'complete guided fair'),
    maxActions: 26,
    maxElapsedMs: 9000,
    milestones: [
      { id: 'auction-open', description: 'The Guided Fair auction tape opens.', required: true, detect: textIncludes('AUCTION TAPE', 'GUIDED FAIR') },
      { id: 'action-preview', description: 'An economic action exposes a before/after preview.', required: true, detect: textIncludes('ACTION PREVIEW', 'CASH') },
      { id: 'closing-bell', description: 'The guided market produces a closing-bell report.', required: true, detect: textIncludes('CLOSING BELL') },
      { id: 'guided-ending', description: 'The three-day Guided Fair reaches its ending.', required: true, detect: textIncludes('LAST REFLECTION') },
    ],
  },
  'rogue-ledger': {
    profileVersion: 1,
    coverage: 'seeded-completion',
    category: 'turn-based',
    startActions: [{ key: 't', waitMs: 70, label: 'start ledger induction' }],
    policy: scriptedPolicy(['Enter', 'x', 'Enter', 'Enter', 'x', 'Enter', 'Enter', 'x', 'Enter', 'Enter', 'x', 'Enter', 'Enter'], 'rogue-ledger-index', 'complete ledger induction'),
    maxActions: 24,
    maxElapsedMs: 9000,
    milestones: [
      { id: 'accounting-row', description: 'The induction opens an accounting row.', required: true, detect: textIncludes('ACCOUNTING ROW', 'OPEN THE FOUR-ENTRY INDUCTION') },
      { id: 'red-pencil-preview', description: 'A treatment exposes the accounting preview.', required: true, detect: textIncludes('RED-PENCIL MARGIN') },
      { id: 'induction-ending', description: 'The four-entry induction reaches its ending.', required: true, detect: textIncludes('INDUCTION COMPLETE') },
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

export function featuredCoverageGaps(games: readonly GameInfo[], registry: ReadonlyMap<string, PlaytestSpec>): string[] {
  return games
    .filter(game => (game.placement ?? (game.maturity === 'featured' ? 'featured' : 'catalog')) === 'featured')
    .filter(game => registry.get(game.id)?.coverage !== 'seeded-completion')
    .map(game => game.id);
}

export interface CoverageSummary {
  gameId: string;
  name: string;
  group: 'featured' | 'beta' | 'workshop' | 'archive';
  coverage: PlaytestSpec['coverage'];
  profileVersion: number;
}

export function coverageSummary(games: readonly GameInfo[], registry: ReadonlyMap<string, PlaytestSpec>): CoverageSummary[] {
  return games.map(game => {
    const spec = registry.get(game.id);
    const placement = game.placement ?? (game.maturity === 'featured' ? 'featured' : 'catalog');
    const readiness = game.readiness ?? (game.maturity === 'workshop' ? 'workshop' : 'preview');
    return {
      gameId: game.id,
      name: game.name,
      group: placement === 'featured' ? 'featured' : readiness === 'workshop' ? 'workshop' : game.maturity === undefined ? 'archive' : 'beta',
      coverage: spec?.coverage,
      profileVersion: spec?.profileVersion ?? 0,
    };
  });
}
