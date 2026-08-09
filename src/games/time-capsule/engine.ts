import { EPISODES } from './content';
import type {
  ActionDefinition,
  AnchorKind,
  Command,
  CommandResult,
  Condition,
  Effect,
  EngineEvent,
  EpisodeDefinition,
  GameState,
  Incident,
  LoopState,
} from './types';

const clone = <T>(value: T): T => structuredClone(value);
const kinds: AnchorKind[] = ['memory', 'object', 'clue'];

function episodeFor(state: GameState): EpisodeDefinition {
  return EPISODES.find(episode => episode.id === state.episodeId) ?? EPISODES[0]!;
}

function anchorFor(state: GameState, id: string) {
  return episodeFor(state).anchors.find(anchor => anchor.id === id);
}

function objectIdForAnchor(anchorId: string): string | undefined {
  return anchorId.startsWith('obj-') ? anchorId.slice(4) : undefined;
}

function freshLoop(episode: EpisodeDefinition, number: number): LoopState {
  const actorRooms: Record<string, string> = {};
  for (const actor of episode.actors) actorRooms[actor.id] = actor.schedule[0] ?? actor.home;
  const worldItems: Record<string, string | null> = {};
  for (const item of episode.items) worldItems[item.id] = item.spawnRoom;
  return {
    number,
    tick: 0,
    playerRoom: episode.startRoom,
    inventory: [],
    actorRooms,
    worldItems,
    flags: {},
    discoveriesThisLoop: [],
    masteredThisLoop: [],
    eventLog: [],
    resolvedEventIds: [],
  };
}

function blankProgress() {
  return {
    anchors: { memory: null, object: null, clue: null },
    discovered: [],
    masteredScenes: [],
    unlockedEndings: [],
    loopsCompleted: 0,
    hintsUsed: {},
  };
}

function makeState(seed: number, mode: GameState['mode']): GameState {
  const episode = EPISODES[0]!;
  return {
    version: 1,
    seed: seed >>> 0,
    mode,
    phase: 'start',
    episodeId: episode.id,
    progress: blankProgress(),
    loop: freshLoop(episode, 1),
    capsuleDraft: null,
    pendingAction: null,
    tutorialStep: mode === 'tutorial' ? 0 : -1,
    focus: 'actions',
    selection: 0,
    overlay: 'none',
    notice: 'THE DAY IS FIVE MINUTES LONG. THREE THINGS MAY CROSS.',
    endingId: null,
  };
}

export function createState(seed = Date.now()): GameState {
  return makeState(seed, 'campaign');
}

function hasAnchor(state: GameState, anchorId: string): boolean {
  return kinds.some(kind => state.progress.anchors[kind] === anchorId);
}

function evalCondition(state: GameState, condition: Condition): boolean {
  switch (condition.op) {
    case 'all': return condition.conditions.every(item => evalCondition(state, item));
    case 'any': return condition.conditions.some(item => evalCondition(state, item));
    case 'not': return !evalCondition(state, condition.condition);
    case 'room': return state.loop.playerRoom === condition.roomId;
    case 'tick': return (condition.min === undefined || state.loop.tick >= condition.min) && (condition.max === undefined || state.loop.tick <= condition.max);
    case 'actorAt': return state.loop.actorRooms[condition.actorId] === condition.roomId;
    case 'hasAnchor': return hasAnchor(state, condition.anchorId);
    case 'hasItem': return state.loop.inventory.includes(condition.itemId);
    case 'flag': return state.loop.flags[condition.key] === condition.equals;
    case 'discoveredThisLoop': return state.loop.discoveriesThisLoop.includes(condition.anchorId);
  }
}

function incident(state: GameState, text: string, kind: Incident['kind'], events: EngineEvent[] = []): void {
  const value: Incident = { tick: state.loop.tick, text, kind };
  state.loop.eventLog = [value, ...state.loop.eventLog].slice(0, 8);
  state.notice = text;
  events.push({ type: 'notice', text });
}

function applyEffect(state: GameState, effect: Effect, events: EngineEvent[]): void {
  switch (effect.op) {
    case 'setFlag': state.loop.flags[effect.key] = effect.value; break;
    case 'moveActor': state.loop.actorRooms[effect.actorId] = effect.roomId; break;
    case 'discover': {
      if (!state.loop.discoveriesThisLoop.includes(effect.anchorId)) {
        state.loop.discoveriesThisLoop.push(effect.anchorId);
        const definition = anchorFor(state, effect.anchorId);
        const text = `DISCOVERED ${definition?.shortName ?? effect.anchorId}.`;
        incident(state, text, definition?.kind ?? 'info', events);
        events.push({ type: 'discover', text });
      }
      break;
    }
    case 'masterScene':
      if (!state.loop.masteredThisLoop.includes(effect.sceneId)) state.loop.masteredThisLoop.push(effect.sceneId);
      break;
    case 'addItem':
      if (!state.loop.inventory.includes(effect.itemId) && state.loop.inventory.length < 2) state.loop.inventory.push(effect.itemId);
      break;
    case 'removeItem':
      state.loop.inventory = state.loop.inventory.filter(itemId => itemId !== effect.itemId);
      break;
    case 'placeItem':
      state.loop.worldItems[effect.itemId] = effect.roomId || null;
      break;
    case 'log': incident(state, effect.text, effect.kind, events); break;
    case 'notice': incident(state, effect.text, 'info', events); break;
    case 'finishEpisode': finishEpisode(state, effect.endingId, events); break;
  }
}

function applyEffects(state: GameState, effects: Effect[], events: EngineEvent[]): void {
  for (const effect of effects) {
    if (state.phase === 'report' || state.phase === 'ending') break;
    applyEffect(state, effect, events);
  }
}

function applyActorSchedules(state: GameState, episode: EpisodeDefinition): void {
  for (const actor of episode.actors) {
    const room = actor.schedule[state.loop.tick];
    if (room) state.loop.actorRooms[actor.id] = room;
  }
}

function resolveScheduled(state: GameState, episode: EpisodeDefinition, events: EngineEvent[]): void {
  for (const scheduled of episode.scheduledEvents) {
    if (scheduled.tick !== state.loop.tick || state.loop.resolvedEventIds.includes(scheduled.id)) continue;
    state.loop.resolvedEventIds.push(scheduled.id);
    incident(state, scheduled.text, scheduled.kind, events);
    if (scheduled.effects) applyEffects(state, scheduled.effects, events);
  }
}

function prepareCapsule(state: GameState, reason: string, events: EngineEvent[]): void {
  if (state.phase !== 'exploring') return;
  state.phase = 'capsule';
  state.capsuleDraft = { ...state.progress.anchors };
  incident(state, reason, 'warning', events);
  events.push({ type: 'reset', text: 'The capsule is ready. Choose what crosses.' });
}

function advanceTick(state: GameState, events: EngineEvent[]): void {
  if (state.phase !== 'exploring') return;
  state.loop.tick += 1;
  events.push({ type: 'tick', text: `TIME ADVANCES TO ${formatClock(state.loop.tick)}.` });
  const episode = episodeFor(state);
  if (state.loop.tick >= episode.loopTicks) {
    prepareCapsule(state, 'NOON ARRIVES. THE BELL BECOMES A WHITE FLASH.', events);
    return;
  }
  resolveScheduled(state, episode, events);
  applyActorSchedules(state, episode);
}

function objectEligible(state: GameState, anchorId: string | null): boolean {
  if (!anchorId) return true;
  const definition = anchorFor(state, anchorId);
  if (!definition || definition.kind !== 'object') return false;
  const itemId = objectIdForAnchor(anchorId);
  return Boolean(itemId && state.loop.inventory.includes(itemId));
}

function candidateEligible(state: GameState, kind: AnchorKind, anchorId: string | null): boolean {
  if (!anchorId) return true;
  const definition = anchorFor(state, anchorId);
  if (!definition || definition.kind !== kind) return false;
  const current = state.progress.anchors[kind];
  const acquired = state.loop.discoveriesThisLoop.includes(anchorId);
  if (anchorId !== current && !acquired) return false;
  return kind !== 'object' || objectEligible(state, anchorId);
}

function objectAnchorFromProgress(progress: GameState['progress']): string | null {
  return progress.anchors.object;
}

function overlayAnchoredObject(loop: LoopState, anchorId: string | null): void {
  if (!anchorId) return;
  const itemId = objectIdForAnchor(anchorId);
  if (!itemId) return;
  loop.worldItems[itemId] = null;
  if (!loop.inventory.includes(itemId)) loop.inventory.push(itemId);
}

function mergeUnique(target: string[], values: string[]): void {
  for (const value of values) if (!target.includes(value)) target.push(value);
}

function finishEpisode(state: GameState, endingId: string, events: EngineEvent[]): void {
  const ending = episodeFor(state).endings.find(value => value.id === endingId);
  if (!ending) return;
  const required = ending.requiredAnchors.every(anchorId => hasAnchor(state, anchorId));
  const flags = (ending.requiredFlags ?? []).every(key => Boolean(state.loop.flags[key]));
  if (!required || !flags) return;
  mergeUnique(state.progress.discovered, state.loop.discoveriesThisLoop);
  mergeUnique(state.progress.masteredScenes, state.loop.masteredThisLoop);
  mergeUnique(state.progress.unlockedEndings, [endingId]);
  state.endingId = endingId;
  state.phase = 'report';
  state.notice = ending.title;
  events.push({ type: 'ending', text: ending.title });
}

function commitDraft(state: GameState, events: EngineEvent[]): void {
  if (state.phase !== 'capsule' || !state.capsuleDraft) return;
  for (const kind of kinds) {
    if (!candidateEligible(state, kind, state.capsuleDraft[kind])) {
      incident(state, `THE ${kind.toUpperCase()} SLOT CANNOT HOLD THAT YET.`, 'warning', events);
      events.push({ type: 'invalid', text: 'Invalid capsule draft.' });
      return;
    }
  }
  mergeUnique(state.progress.discovered, state.loop.discoveriesThisLoop);
  mergeUnique(state.progress.masteredScenes, state.loop.masteredThisLoop);
  state.progress.anchors = { ...state.capsuleDraft };
  state.progress.loopsCompleted += 1;
  const episode = episodeFor(state);
  state.loop = freshLoop(episode, state.loop.number + 1);
  overlayAnchoredObject(state.loop, objectAnchorFromProgress(state.progress));
  state.capsuleDraft = null;
  state.phase = 'exploring';
  state.focus = 'actions';
  state.selection = 0;
  incident(state, `LOOP ${String(state.loop.number).padStart(2, '0')} BEGINS. ${anchorSummary(state)}`, 'success', events);
  events.push({ type: 'reset', text: 'A new loop begins.' });
}

function anchorSummary(state: GameState): string {
  const values = kinds.map(kind => state.progress.anchors[kind] ? kind[0].toUpperCase() : '-');
  return `ANCHORS [${values.join('')}]`;
}

function actionVisible(state: GameState, action: ActionDefinition): boolean {
  return !action.visibleWhen || evalCondition(state, action.visibleWhen);
}

function actionAvailable(state: GameState, action: ActionDefinition): boolean {
  return actionVisible(state, action) && (!action.availableWhen || evalCondition(state, action.availableWhen));
}

export interface VisibleAction {
  action: ActionDefinition;
  available: boolean;
  reason: string;
}

export function actionsForCurrentRoom(state: GameState): VisibleAction[] {
  return episodeFor(state).actions
    .filter(action => action.roomId === state.loop.playerRoom && actionVisible(state, action))
    .map(action => ({ action, available: actionAvailable(state, action), reason: action.blockedReason ?? 'A required memory, object, clue, or timing window is missing.' }));
}

export function currentRoom(state: GameState) {
  return episodeFor(state).rooms.find(room => room.id === state.loop.playerRoom) ?? episodeFor(state).rooms[0]!;
}

export function neighbours(state: GameState): string[] {
  return currentRoom(state).neighbours;
}

export function episode(state: GameState): EpisodeDefinition {
  return episodeFor(state);
}

export function formatClock(tick: number): string {
  const seconds = Math.max(0, Math.min(10, tick)) * 30;
  const minutes = 55 + Math.floor(seconds / 60);
  const extra = seconds % 60;
  const hour = minutes >= 60 ? 12 : 11;
  const minute = minutes >= 60 ? minutes - 60 : minutes;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(extra).padStart(2, '0')}`;
}

export function applyCommand(input: GameState, command: Command): CommandResult {
  const state = clone(input);
  const events: EngineEvent[] = [];

  if (command.type === 'start' && state.phase === 'start') {
    const fresh = makeState(command.seed ?? state.seed, command.mode);
    fresh.phase = 'briefing';
    fresh.notice = command.mode === 'tutorial' ? 'TUTORIAL LOOP. WATCH THE CLOCK, THEN CHOOSE WHAT CROSSES.' : 'THE LAST BELL. READ THE BRIEF, THEN ENTER THE DAY.';
    return { state: fresh, events: [{ type: 'notice', text: fresh.notice }] };
  }
  if (command.type === 'restartEpisode') {
    const fresh = makeState(state.seed, state.mode);
    fresh.phase = 'briefing';
    return { state: fresh, events: [{ type: 'notice', text: 'THE EPISODE RESTARTS FROM THE FIRST LOOP.' }] };
  }
  if (command.type === 'nextEpisode') {
    state.phase = 'ending';
    state.notice = 'THIS EPISODE IS COMPLETE. MORE CAPSULES WILL FOLLOW.';
    return { state, events: [{ type: 'ending', text: state.notice }] };
  }
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') {
    state.phase = 'exploring';
    state.notice = '11:55:00. THE CEREMONY IS FIVE MINUTES FROM NOW.';
    return { state, events: [{ type: 'notice', text: state.notice }] };
  }
  if (command.type === 'setFocus') { state.focus = command.focus; state.selection = 0; return { state, events }; }
  if (command.type === 'moveSelection') { state.selection = Math.max(0, state.selection + command.delta); return { state, events }; }
  if (command.type === 'openOverlay') { state.overlay = command.overlay; return { state, events }; }
  if (command.type === 'closeOverlay') { state.overlay = 'none'; return { state, events }; }
  if (command.type === 'requestHint') {
    const lead = episodeFor(state).leads.find(value => value.id === command.leadId);
    if (lead) {
      const level = Math.min(2, state.progress.hintsUsed[lead.id] ?? 0);
      state.progress.hintsUsed[lead.id] = level + 1;
      incident(state, `HINT ${level + 1}/3: ${lead.levels[level]}`, 'info', events);
    }
    return { state, events };
  }
  if (state.phase === 'briefing' || state.phase === 'start' || state.phase === 'ending') return { state, events };
  if (state.overlay !== 'none' && !['closeOverlay', 'stageAnchor', 'restoreAnchor', 'commitAnchors'].includes(command.type)) return { state, events };

  if (command.type === 'endLoop') {
    prepareCapsule(state, 'YOU FOLD THE CAPSULE SHUT BEFORE NOON.', events);
    return { state, events };
  }
  if (command.type === 'stageAnchor' && state.phase === 'capsule' && state.capsuleDraft) {
    if (!candidateEligible(state, command.kind, command.anchorId)) {
      incident(state, `THAT ${command.kind.toUpperCase()} IS NOT AVAILABLE TO CARRY.`, 'warning', events);
      events.push({ type: 'invalid', text: 'Anchor is not eligible.' });
    } else state.capsuleDraft[command.kind] = command.anchorId;
    return { state, events };
  }
  if (command.type === 'restoreAnchor' && state.phase === 'capsule' && state.capsuleDraft) {
    state.capsuleDraft[command.kind] = state.progress.anchors[command.kind];
    return { state, events };
  }
  if (command.type === 'commitAnchors') { commitDraft(state, events); return { state, events }; }
  if (state.phase === 'capsule') return { state, events };
  if (state.phase !== 'exploring') return { state, events };

  if (command.type === 'previewAction') {
    const action = episodeFor(state).actions.find(value => value.id === command.actionId);
    if (!action || action.roomId !== state.loop.playerRoom || !actionVisible(state, action)) return { state, events };
    if (!actionAvailable(state, action)) { incident(state, action.blockedReason ?? 'THAT ACTION IS NOT READY.', 'warning', events); events.push({ type: 'invalid', text: action.blockedReason ?? 'Action blocked.' }); return { state, events }; }
    const effectLines = action.effects.map(effect => effect.op === 'discover' ? `DISCOVER ${anchorFor(state, effect.anchorId)?.shortName ?? effect.anchorId}` : effect.op === 'setFlag' ? `SET ${effect.key}` : effect.op === 'addItem' ? `CARRY ${effect.itemId}` : effect.op === 'finishEpisode' ? `END ${effect.endingId}` : effect.op.toUpperCase());
    state.pendingAction = { actionId: action.id, cost: action.cost, beforeTick: state.loop.tick, afterTick: Math.min(episodeFor(state).loopTicks, state.loop.tick + action.cost), summary: action.description, effects: effectLines };
    state.notice = 'PREVIEW READY. ENTER CONFIRMS; BACKSPACE CANCELS.';
    return { state, events };
  }
  if (command.type === 'cancelActionPreview') { state.pendingAction = null; state.notice = 'ACTION PREVIEW CANCELLED.'; return { state, events }; }
  if (command.type === 'confirmAction') {
    if (!state.pendingAction) return { state, events };
    const actionId = state.pendingAction.actionId;
    state.pendingAction = null;
    return applyCommand(state, { type: 'perform', actionId });
  }

  if (command.type === 'travel') {
    if (!neighbours(state).includes(command.roomId)) {
      incident(state, 'THAT ROOM IS NOT CONNECTED TO HERE.', 'warning', events);
      events.push({ type: 'invalid', text: 'Room is not adjacent.' });
      return { state, events };
    }
    state.loop.playerRoom = command.roomId;
    incident(state, `YOU MOVE TO ${currentRoom(state).label}.`, 'info', events);
    advanceTick(state, events);
    return { state, events };
  }
  if (command.type === 'wait') {
    incident(state, 'YOU WAIT AND LISTEN TO THE BUILDING.', 'info', events);
    advanceTick(state, events);
    return { state, events };
  }
  if (command.type === 'perform') {
    const action = episodeFor(state).actions.find(value => value.id === command.actionId);
    if (!action || action.roomId !== state.loop.playerRoom || !actionVisible(state, action)) return { state, events };
    if (!actionAvailable(state, action)) {
      incident(state, action.blockedReason ?? 'THAT ACTION IS NOT READY.', 'warning', events);
      events.push({ type: 'invalid', text: action.blockedReason ?? 'Action blocked.' });
      return { state, events };
    }
    state.pendingAction = null;
    const mastered = action.effects.some(effect => effect.op === 'masterScene' && state.progress.masteredScenes.includes(effect.sceneId));
    incident(state, mastered && action.echoText ? action.echoText : action.description, 'info', events);
    applyEffects(state, action.effects, events);
    for (let step = 0; step < action.cost && state.phase === 'exploring'; step += 1) advanceTick(state, events);
    if (state.mode === 'tutorial' && state.tutorialStep < 5) state.tutorialStep += 1;
    return { state, events };
  }
  return { state, events };
}

export { hasAnchor };
