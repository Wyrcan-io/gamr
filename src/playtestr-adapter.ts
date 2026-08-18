import { isAbsolute, resolve } from 'node:path';
import { allGames } from './games';
import { createPlaytestRegistry } from './playtest/specs';
import type { PlaytestAction, PlaytestObservation } from './playtest/types';

export interface PlaytestrManifestV1 {
  schemaVersion: 1;
  id: string;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  terminal: { cols: number; rows: number };
  startupTimeoutMs: number;
  stepTimeoutMs: number;
  exitGraceMs: number;
  episodeTimeoutMs: number;
  maxOutputBytes: number;
  maxArtifactBytes: number;
  allowedKeys: string[];
}

export interface PlaytestrAdapterContext {
  observation: {
    at: number;
    cols: number;
    rows: number;
    text: string;
    lines: string[];
    changed: boolean;
    alternateBuffer: boolean;
  };
  observationIndex: number;
  actions: readonly PlaytestAction[];
}

export interface PlaytestrAdapterEvidence {
  tags?: string[];
  mechanics?: string[];
  milestones?: string[];
  completion?: boolean;
  hidden?: boolean;
  failure?: boolean;
  recoverable?: boolean;
}

export interface GamrPlaytestrAdapterV1 {
  readonly version: 1;
  readonly id: string;
  readonly targetId: string;
  readonly actions: readonly string[];
  readonly bootstrapActions: readonly PlaytestAction[];
  readonly objectives: ReadonlyArray<{
    id: string;
    kind: 'milestone' | 'completion';
    description: string;
    priority: number;
  }>;
  analyze(context: PlaytestrAdapterContext): PlaytestrAdapterEvidence;
}

export interface GamrPlaytestrTargetOptions {
  cliPath: string;
  cwd?: string;
  targetId?: string;
  cols?: number;
  rows?: number;
}

const genericActions = ['?', 'h', 'Enter', ' ', 'Escape', 'Tab', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '1', '2', '3', '4', 'r', 's', 't', 'x', 'q'];
const completionPattern = /\b(?:(?:campaign|training|tutorial|mission|shift|service|run|induction)[^\n]{0,40}(?:complete|cleared|accepted)|handoff accepted|ending)\b/iu;
const hiddenPattern = /\b(?:secret|hidden|bonus|easter egg)\b/iu;
const failurePattern = /\b(?:game over|mission failed|defeat|failed|dead)\b/iu;

function playtestObservation(context: PlaytestrAdapterContext): PlaytestObservation {
  const lastAction = context.actions.at(-1);
  return {
    frame: context.observationIndex,
    at: context.observation.at,
    cols: context.observation.cols,
    rows: context.observation.rows,
    text: context.observation.text,
    lines: context.observation.lines,
    changed: context.observation.changed,
    alternateBuffer: context.observation.alternateBuffer,
    wrappedLines: 0,
    actionCount: context.actions.length,
    ...(lastAction ? { lastAction } : {}),
    elapsedMs: context.observation.at,
  };
}

export function createGamrPlaytestrAdapter(gameId: string, targetId = `gamr:${gameId}`): GamrPlaytestrAdapterV1 {
  const game = allGames.find(candidate => candidate.id === gameId);
  if (!game) throw new Error(`Unknown Gamr game: ${gameId}`);
  const spec = createPlaytestRegistry(allGames).get(gameId);
  if (!spec) throw new Error(`Gamr game has no playtest specification: ${gameId}`);
  const actions = [...new Set([...genericActions, ...(spec.startActions ?? []).map(action => action.key)])];
  return {
    version: 1,
    id: `@wyrcan/gamr:${gameId}:playtestr-v1`,
    targetId,
    actions,
    bootstrapActions: (spec.startActions ?? []).map(action => ({ ...action })),
    objectives: [
      ...spec.milestones.map((milestone, index) => ({ id: milestone.id, kind: 'milestone' as const, description: milestone.description, priority: milestone.required === false ? 40 : 90 - index })),
      { id: `${gameId}:completion`, kind: 'completion' as const, description: `Reach a complete run of ${game.name}`, priority: 100 },
    ],
    analyze(context) {
      const observation = playtestObservation(context);
      const milestones = spec.milestones.filter(milestone => {
        try { return milestone.detect(observation, [observation]); } catch { return false; }
      }).map(milestone => milestone.id);
      const text = observation.text;
      return {
        tags: [
          `gamr:${spec.category}`,
          ...(milestones.length ? ['gamr:milestone'] : []),
        ],
        mechanics: [`gamr:category:${spec.category}`],
        milestones,
        completion: completionPattern.test(text),
        hidden: hiddenPattern.test(text),
        failure: failurePattern.test(text),
        recoverable: /\b(?:press enter|return|resume|retry|back)\b/iu.test(text),
      };
    },
  };
}

export function createGamrPlaytestrTarget(gameId: string, options: GamrPlaytestrTargetOptions): { manifest: PlaytestrManifestV1; adapter: GamrPlaytestrAdapterV1 } {
  const adapter = createGamrPlaytestrAdapter(gameId, options.targetId);
  const cwd = resolve(options.cwd ?? process.cwd());
  const cliPath = isAbsolute(options.cliPath) ? options.cliPath : resolve(cwd, options.cliPath);
  return {
    manifest: {
      schemaVersion: 1,
      id: adapter.targetId,
      command: process.execPath,
      args: [cliPath, gameId, '--reduced-motion'],
      cwd,
      env: { NO_COLOR: '1' },
      terminal: { cols: options.cols ?? 100, rows: options.rows ?? 32 },
      startupTimeoutMs: 3000,
      stepTimeoutMs: 80,
      exitGraceMs: 2500,
      episodeTimeoutMs: 30_000,
      maxOutputBytes: 2_000_000,
      maxArtifactBytes: 10_000_000,
      allowedKeys: [...adapter.actions],
    },
    adapter,
  };
}
