import { getGame } from '../games';
import { installDeterminism } from './determinism';
import { resetPlaytestWindowListeners, VirtualTerminal } from './terminal';
import { createPlaytestRegistry } from './specs';
import type {
  PlaytestAction,
  PlaytestFailure,
  PlaytestMemory,
  PlaytestObservation,
  PlaytestRunOptions,
  PlaytestRunReport,
  PlaytestSpec,
} from './types';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function observation(terminal: VirtualTerminal, actionCount: number, startedAt: number, lastAction?: PlaytestAction): PlaytestObservation {
  const snapshot = terminal.screen.snapshot();
  return { ...snapshot, actionCount, elapsedMs: Date.now() - startedAt, lastAction };
}

function replayFor(gameId: string, seed: number | undefined, actions: readonly PlaytestAction[]): string {
  return JSON.stringify({ version: 1, gameId, seed, actions }, null, 2);
}

function initialMilestones(spec: PlaytestSpec): Record<string, boolean> {
  return Object.fromEntries(spec.milestones.map(milestone => [milestone.id, false]));
}

export interface PlaytestRunnerOptions {
  registry?: ReadonlyMap<string, PlaytestSpec>;
  defaultWaitMs?: number;
}

export class PlaytestRunner {
  private readonly registry: ReadonlyMap<string, PlaytestSpec>;
  private readonly defaultWaitMs: number;

  constructor(options: PlaytestRunnerOptions = {}) {
    this.registry = options.registry ?? createPlaytestRegistry();
    this.defaultWaitMs = options.defaultWaitMs ?? 35;
  }

  async run(gameId: string, options: PlaytestRunOptions = {}): Promise<PlaytestRunReport> {
    const game = getGame(gameId);
    const spec = this.registry.get(gameId);
    if (!game) return this.missingReport(gameId, 'missing-game');
    if (!spec) return this.missingReport(gameId, 'missing-spec');

    resetPlaytestWindowListeners();
    const determinism = installDeterminism(options.seed);
    const startedAt = Date.now();
    const terminal = new VirtualTerminal(options.viewport);
    const actions: PlaytestAction[] = [];
    const observations: PlaytestObservation[] = [];
    const milestones = initialMilestones(spec);
    const failures: PlaytestFailure[] = [];
    const memory: PlaytestMemory = { values: new Map() };
    const maxActions = options.maxActions ?? spec.maxActions ?? 80;
    const maxElapsedMs = options.maxElapsedMs ?? spec.maxElapsedMs ?? 5000;
    const maxStalledFrames = options.maxStalledFrames ?? spec.maxStalledFrames ?? 24;
    let controller: { stop: () => void; isRunning: boolean } | undefined;
    let lastAction: PlaytestAction | undefined;
    let stalledFrames = 0;
    let status: PlaytestRunReport['status'] = 'passed';
    let elapsedMs = 0;

    const requiredMilestonesComplete = (): boolean => spec.milestones
      .filter(milestone => milestone.required !== false)
      .every(milestone => milestones[milestone.id]);

    const record = (): PlaytestObservation => {
      const current = observation(terminal, actions.length, startedAt, lastAction);
      observations.push(current);
      options.onObservation?.(current);
      for (const milestone of spec.milestones) {
        if (!milestones[milestone.id] && milestone.detect(current, observations)) milestones[milestone.id] = true;
      }
      stalledFrames = current.changed ? 0 : stalledFrames + 1;
      return current;
    };

    try {
      controller = game.run(terminal as never) as { stop: () => void; isRunning: boolean };
      await sleep(70);
      record();
      for (const action of spec.startActions ?? []) {
        if (actions.length >= maxActions) break;
        await this.perform(terminal, action, actions);
        lastAction = action;
        record();
      }

      while (actions.length < maxActions) {
        const current = observations[observations.length - 1] ?? record();
        if (requiredMilestonesComplete()) break;
        if (Date.now() - startedAt >= maxElapsedMs) { status = 'timed-out'; break; }
        if (stalledFrames >= maxStalledFrames) { status = 'stalled'; break; }
        const action = spec.policy?.(current, memory);
        if (!action) break;
        await this.perform(terminal, action, actions);
        lastAction = action;
        record();
      }
    } catch (error) {
      status = 'crashed';
      failures.push({ kind: 'crash', message: error instanceof Error ? error.message : String(error), atAction: actions.length });
    } finally {
      elapsedMs = Date.now() - startedAt;
      try { controller?.stop(); } catch (error) {
        failures.push({ kind: 'cleanup', message: error instanceof Error ? error.message : String(error), atAction: actions.length });
        status = 'crashed';
      }
      terminal.dispose();
      resetPlaytestWindowListeners();
      determinism.restore();
    }

    for (const milestone of spec.milestones) {
      if (milestone.required !== false && !milestones[milestone.id]) {
        failures.push({ kind: 'missing-milestone', message: `${milestone.id}: ${milestone.description}`, atAction: actions.length });
      }
    }
    if (status === 'passed' && failures.length > 0) status = 'failed';
    return {
      gameId,
      status,
      seed: options.seed,
      actionCount: actions.length,
      elapsedMs,
      milestones,
      failures,
      actions,
      observations,
      terminalText: observations[observations.length - 1]?.text ?? terminal.screen.snapshot().text,
      replay: replayFor(gameId, options.seed, actions),
    };
  }

  private async perform(terminal: VirtualTerminal, action: PlaytestAction, actions: PlaytestAction[]): Promise<void> {
    actions.push(action);
    await terminal.press(action.key, action.holdMs ?? 0);
    await sleep(action.waitMs ?? this.defaultWaitMs);
  }

  private missingReport(gameId: string, status: 'missing-game' | 'missing-spec'): PlaytestRunReport {
    return {
      gameId,
      status,
      actionCount: 0,
      elapsedMs: 0,
      milestones: {},
      failures: [],
      actions: [],
      observations: [],
      terminalText: '',
      replay: replayFor(gameId, undefined, []),
    };
  }
}

export async function runPlaytest(gameId: string, options?: PlaytestRunOptions): Promise<PlaytestRunReport> {
  return new PlaytestRunner().run(gameId, options);
}
