import { contractForShift, START_STORY, storyBeat } from './content';
import { generateValidatedRide } from './generator';
import { mixSeed } from './seed';
import { evaluateRoute } from './solver';
import type { Command, CommandResult, DomainEvent, GameMode, GameState, LogEntry, RidePuzzle, StoryThreadId } from './types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emptyThreads(): GameState['threads'] {
  return {
    'missing-operator': { state: 'unseen', progress: 0, flags: [] },
    'deleted-census': { state: 'unseen', progress: 0, flags: [] },
    'building-voice': { state: 'unseen', progress: 0, flags: [] },
  };
}

function log(state: GameState, text: string, tone: LogEntry['tone'] = 'normal'): void {
  state.eventLog = [{ text, tone }, ...state.eventLog].slice(0, 8);
}

function emit(events: DomainEvent[], kind: DomainEvent['kind'], text: string): void {
  events.push({ kind, text });
}

export function createState(seed = Date.now()): GameState {
  return {
    version: 1,
    seed: seed >>> 0,
    mode: 'story',
    phase: 'start',
    shiftIndex: 0,
    rideIndex: 0,
    campaignRideIndex: 0,
    puzzle: null,
    selectedButtonIndex: 0,
    selectedPassengerIndex: 0,
    plannedRoute: [],
    continuity: 5,
    intercomCharges: 3,
    score: 0,
    hintsUsedThisRide: 0,
    lastEvaluation: null,
    notice: 'THE DIRECTORY SAYS TWELVE FLOORS. THE PANEL SAYS THIRTEEN.',
    storyLines: [...START_STORY],
    threads: emptyThreads(),
    seenBeatIds: [],
    activeOverlay: 'none',
    eventLog: [],
    endingId: null,
    transitResolved: false,
  };
}

function totalRides(mode: GameMode): number {
  return mode === 'tutorial' ? 1 : mode === 'after-hours' ? 6 : 15;
}

function puzzleFor(state: GameState, shift: number, rideIndex: number): RidePuzzle {
  return generateValidatedRide(mixSeed(state.seed, shift + 1, rideIndex + 1), shift, rideIndex, state.mode);
}

function startedState(seed: number, mode: GameMode): GameState {
  const state = createState(seed);
  state.mode = mode;
  state.puzzle = puzzleFor(state, mode === 'after-hours' ? 1 : 0, 0);
  state.shiftIndex = mode === 'after-hours' ? 1 : 0;
  state.phase = 'briefing';
  state.notice = mode === 'tutorial'
    ? 'INDUCTION RIDE: READ THE RIDERS, THEN PROGRAM TWO STOPS.'
    : mode === 'after-hours'
      ? 'AFTER HOURS: LATER RULES, SHORTER SERVICE.'
      : 'SHIFT 1: HONEST MACHINERY. THE DIRECTORY IS SUPPOSED TO BE TRUE.';
  return state;
}

function selectedButton(state: GameState): string | undefined {
  return state.puzzle?.panel[state.selectedButtonIndex]?.id;
}

function currentBeat(state: GameState): void {
  const order: StoryThreadId[] = ['missing-operator', 'deleted-census', 'building-voice'];
  for (const thread of order) {
    const beat = storyBeat(state.shiftIndex, thread);
    if (!beat || state.seenBeatIds.includes(beat.id)) continue;
    state.seenBeatIds.push(beat.id);
    state.storyLines = beat.text;
    state.threads[thread].state = state.threads[thread].state === 'unseen' ? 'active' : state.threads[thread].state;
    state.threads[thread].progress += 1;
    state.threads[thread].flags.push(beat.flag);
    return;
  }
  state.storyLines = [`SHIFT ${state.shiftIndex + 1} COMPLETE.`, 'The lift waits with its doors open.'];
}

function applyStoryOutcome(state: GameState, evaluation: GameState['lastEvaluation'], events: DomainEvent[]): void {
  const puzzle = state.puzzle;
  if (!puzzle || !evaluation) return;
  const stranded = new Set(evaluation.strandedPassengerIds);
  for (const passenger of puzzle.passengers) {
    if (!passenger.recurringId) continue;
    const thread = passenger.recurringId === 'mara' || passenger.recurringId === 'operator'
      ? 'missing-operator'
      : passenger.recurringId === 'census'
        ? 'deleted-census'
        : 'building-voice';
    const threadState = state.threads[thread];
    if (stranded.has(passenger.id)) {
      threadState.state = 'compromised';
      threadState.progress = Math.max(0, threadState.progress - 1);
      emit(events, 'warning', `${passenger.name.toUpperCase()} MISSED THE LANDING. THE BUILDING REMEMBERS.`);
    } else if (evaluation.deliveredPassengerIds.includes(passenger.id)) {
      threadState.state = threadState.state === 'compromised' ? 'compromised' : 'protected';
      threadState.progress += 1;
    }
  }
}

function applyTransitResolution(state: GameState, events: DomainEvent[]): void {
  if (state.phase !== 'transit' || state.transitResolved || !state.puzzle || !state.lastEvaluation) return;
  state.transitResolved = true;
  const evaluation = state.lastEvaluation;
  if (evaluation.correct) {
    const perfect = state.plannedRoute.length === state.puzzle.shortestSafeRouteLength;
    state.score += 100 * evaluation.deliveredPassengerIds.length + (state.hintsUsedThisRide === 0 ? 150 : 0) + (perfect ? 50 : 0);
    log(state, `ROUTE ACCEPTED // ${evaluation.deliveredPassengerIds.length} PASSENGERS DELIVERED`, 'good');
    emit(events, 'arrival', 'ALL REQUESTED LANDINGS AUTHENTIC. SERVICE HOLDS.');
  } else {
    const phantom = evaluation.violations.some(violation => violation.kind === 'phantom-stop');
    const damage = phantom ? 2 : 1;
    state.continuity = Math.max(0, state.continuity - damage);
    log(state, `ROUTE REJECTED // CONTINUITY -${damage}`, 'bad');
    emit(events, 'warning', evaluation.violations[0]?.text ?? 'THE ROUTE DID NOT COMPLETE.');
  }
  applyStoryOutcome(state, evaluation, events);
  if (state.continuity === 0) {
    state.phase = 'gameOver';
    state.endingId = 'new-operator';
    state.notice = 'CONTINUITY COLLAPSED. THE LIFT ADDS YOUR NAME TO THE ROSTER.';
    emit(events, 'ending', state.notice);
  } else state.phase = 'audit';
}

function prepareNextRide(state: GameState, events: DomainEvent[]): void {
  state.campaignRideIndex += 1;
  state.rideIndex = state.campaignRideIndex;
  if (state.mode === 'story') state.shiftIndex = Math.floor(state.campaignRideIndex / 3);
  else if (state.mode === 'after-hours') state.shiftIndex = 1 + (state.campaignRideIndex % 4);
  if (state.campaignRideIndex >= totalRides(state.mode)) {
    state.puzzle = null;
    state.plannedRoute = [];
    state.phase = state.mode === 'story' ? 'finale' : 'ending';
    state.notice = state.mode === 'story' ? 'THE THIRTEENTH BUTTON IS WAITING FOR A DECISION.' : 'AFTER HOURS REPORT READY.';
    if (state.mode !== 'story') state.endingId = 'service-report';
    emit(events, state.mode === 'story' ? 'story' : 'ending', state.notice);
    return;
  }
  state.puzzle = puzzleFor(state, state.shiftIndex, state.rideIndex);
  state.plannedRoute = [];
  state.selectedButtonIndex = 0;
  state.selectedPassengerIndex = 0;
  state.hintsUsedThisRide = 0;
  state.lastEvaluation = null;
  state.transitResolved = false;
  if (state.mode === 'story' && state.campaignRideIndex > 0 && state.campaignRideIndex % 3 === 0) {
    state.phase = 'interlude';
    currentBeat(state);
    emit(events, 'story', state.storyLines.join(' '));
  } else {
    state.phase = 'planning';
    state.notice = `${contractForShift(state.shiftIndex).title}: THE DOORS ARE OPEN.`;
  }
}

function reject(state: GameState, message: string): CommandResult {
  state.notice = message;
  return { state, events: [], rejection: message };
}

export function currentEvaluation(state: GameState): GameState['lastEvaluation'] {
  return state.lastEvaluation;
}

export function applyCommand(input: GameState, command: Command): CommandResult {
  const state = clone(input);
  const events: DomainEvent[] = [];
  if (command.type === 'startCampaign') return { state: startedState(command.seed ?? state.seed, 'story'), events: [{ kind: 'notice', text: 'LIFT SYSTEM ARMED.' }] };
  if (command.type === 'startTutorial') return { state: startedState(state.seed, 'tutorial'), events: [{ kind: 'notice', text: 'INDUCTION SYSTEM ARMED.' }] };
  if (command.type === 'startAfterHours') return { state: startedState(command.seed ?? state.seed, 'after-hours'), events: [{ kind: 'notice', text: 'AFTER HOURS SYSTEM ARMED.' }] };
  if (command.type === 'restart') return { state: startedState(command.seed ?? state.seed, state.mode), events: [] };
  if (command.type === 'toggleOverlay') {
    state.activeOverlay = command.overlay;
    return { state, events };
  }
  if (state.activeOverlay !== 'none' && command.type !== 'confirmHint') return { state, events };
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') {
    state.phase = 'planning';
    state.notice = `${state.puzzle?.contract.title ?? 'SERVICE'}: SELECT YOUR FIRST STOP.`;
    return { state, events };
  }
  if (command.type === 'moveButtonCursor' && state.phase === 'planning' && state.puzzle) {
    const count = state.puzzle.panel.length;
    state.selectedButtonIndex = (state.selectedButtonIndex + command.delta + count) % count;
    return { state, events };
  }
  if (command.type === 'cyclePassenger' && state.puzzle) {
    const count = state.puzzle.passengers.length;
    state.selectedPassengerIndex = (state.selectedPassengerIndex + command.delta + count) % count;
    return { state, events };
  }
  if (command.type === 'toggleStop' && state.phase === 'planning' && state.puzzle) {
    const button = selectedButton(state);
    if (!button) return reject(state, 'NO BUTTON SELECTED.');
    if (state.plannedRoute.includes(button)) state.plannedRoute = state.plannedRoute.filter(item => item !== button);
    else if (state.plannedRoute.length >= 3) return reject(state, 'THE ROUTE STRIP ACCEPTS THREE STOPS.');
    else state.plannedRoute.push(button);
    state.notice = state.plannedRoute.length ? `ROUTE QUEUED: ${state.plannedRoute.join(' → ')}` : 'ROUTE CLEARED.';
    return { state, events };
  }
  if (command.type === 'openRouteReview' && state.phase === 'planning' && state.puzzle) {
    if (state.plannedRoute.length === 0) return reject(state, 'PROGRAM AT LEAST ONE STOP BEFORE REVIEW.');
    state.phase = 'routeReview'; state.notice = 'ROUTE TAPE OPEN. ENTER AGAIN TO DEPART.';
    return { state, events };
  }
  if (command.type === 'confirmRoute' && state.phase === 'routeReview' && state.puzzle) {
    state.lastEvaluation = evaluateRoute(state.puzzle.trueWorld, state.puzzle.passengers, state.plannedRoute, state.puzzle.panel);
    state.phase = 'transit'; state.transitResolved = false; state.notice = 'DOORS CLOSED. THE SHAFT IS MOVING.';
    emit(events, 'notice', state.notice);
    return { state, events };
  }
  if (command.type === 'toggleStop' && state.phase === 'routeReview') { state.phase = 'planning'; state.notice = 'ROUTE REVIEW CLOSED. EDITING RESUMED.'; return { state, events }; }
  if (command.type === 'undoStop' && state.phase === 'planning') {
    state.plannedRoute = state.plannedRoute.slice(0, -1);
    return { state, events };
  }
  if (command.type === 'requestHint' && state.phase === 'planning') {
    if (state.intercomCharges <= 0) return reject(state, 'THE INTERCOM IS SILENT. NO CHARGES LEFT.');
    state.activeOverlay = 'hint-confirm';
    state.notice = `SPEND ONE INTERCOM CHARGE? ${state.intercomCharges} REMAIN.`;
    return { state, events };
  }
  if (command.type === 'confirmHint' && state.activeOverlay === 'hint-confirm' && state.phase === 'planning' && state.puzzle) {
    state.activeOverlay = 'none';
    state.intercomCharges -= 1;
    state.hintsUsedThisRide += 1;
    state.score = Math.max(0, state.score - 75);
    const route = state.puzzle.safeRoutes[0] ?? [];
    const next = route.find(button => !state.plannedRoute.includes(button)) ?? route[0] ?? '13';
    state.notice = `INTERCOM: PRESS ${next}. IT IS PART OF A SAFE ROUTE.`;
    return { state, events: [{ kind: 'notice', text: state.notice }] };
  }
  if (command.type === 'commitRoute' && state.phase === 'planning' && state.puzzle) {
    if (state.plannedRoute.length === 0) return reject(state, 'PROGRAM AT LEAST ONE STOP BEFORE DEPARTURE.');
    state.lastEvaluation = evaluateRoute(state.puzzle.trueWorld, state.puzzle.passengers, state.plannedRoute, state.puzzle.panel);
    state.phase = 'transit';
    state.transitResolved = false;
    state.notice = 'DOORS CLOSED. THE SHAFT IS MOVING.';
    emit(events, 'notice', state.notice);
    return { state, events };
  }
  if (command.type === 'finishTransit') {
    applyTransitResolution(state, events);
    return { state, events };
  }
  if (command.type === 'dismissAudit' && state.phase === 'audit') {
    prepareNextRide(state, events);
    return { state, events };
  }
  if (command.type === 'dismissInterlude' && state.phase === 'interlude') {
    state.phase = 'planning';
    state.notice = `${contractForShift(state.shiftIndex).title}: THE NEXT MANIFEST IS READY.`;
    return { state, events };
  }
  if (command.type === 'chooseFinale' && state.phase === 'finale') {
    if (command.choiceId === 'operator' && (state.threads['missing-operator'].state !== 'protected' || state.threads['deleted-census'].state !== 'protected')) return reject(state, 'THE OPERATOR KEY REQUIRES BOTH PROTECTED THREADS.');
    state.endingId = command.choiceId;
    state.phase = 'ending';
    state.score += command.choiceId === 'operator' ? 500 : 250;
    state.notice = command.choiceId === 'seal'
      ? 'THE LINE IS SEALED. THE DIRECTORY BECOMES LEGIBLE AGAIN.'
      : command.choiceId === 'open'
        ? 'THE THIRTEENTH LANDING OPENS. THIRTEEN NAMES ANSWER.'
        : 'YOU TAKE THE OPERATOR KEY. THE LIFT WILL NOT CHOOSE AGAIN.';
    state.storyLines = [state.notice, `FINAL SCORE: ${state.score}`, `CONTINUITY: ${state.continuity}/5`];
    emit(events, 'ending', state.notice);
    return { state, events };
  }
  return { state, events };
}
