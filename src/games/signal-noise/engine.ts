import { CASES } from './content';
import { evaluateLock } from './spectrum';
import { bearingSet, candidatesFor, exactRay } from './triangulation';
import { BANDWIDTHS, MODULATIONS, STATION_ORDER, type CaseDefinition, type CaseState, type Command, type GameState, type Lock, type StationId } from './types';

export interface CommandResult { state: GameState; events: string[]; }

function cloneDefinition(definition: CaseDefinition): CaseDefinition { return JSON.parse(JSON.stringify(definition)) as CaseDefinition; }

function newCase(definition: CaseDefinition): CaseState {
  const copy = cloneDefinition(definition);
  return {
    definition: copy, phase: 'start', operationsUsed: 0, filtersRemaining: copy.filters, phaseLocksRemaining: copy.phaseLocks,
    selectedStation: 'west', disabledStations: [], tuner: { centre: 10, bandwidth: 1, modulation: 'pulse', gain: 2 },
    transmitters: [{ ...copy.target, discovered: false, notched: false }, ...copy.interference.map(transmitter => ({ ...transmitter, discovered: false, notched: false }))],
    locks: {}, candidateZones: [], selectedBroadcast: null, lastResult: null, score: 0, notice: 'READ THE TASKING. INSTRUMENTS STANDBY.', appliedEvents: [],
  };
}

export function createState(seed = Date.now()): GameState {
  return { version: 1, seed: seed >>> 0, mode: 'campaign', caseIndex: 0, casesCompleted: 0, correctReplies: 0, failedCases: 0, totalScore: 0, log: [], caseState: newCase(CASES[0]) };
}

function activeCase(state: GameState): CaseState { return state.caseState; }
function cycle<T>(items: T[], current: T, delta: 1 | -1): T { return items[(items.indexOf(current) + delta + items.length) % items.length]; }

function applyEvents(caseState: CaseState): void {
  for (const event of caseState.definition.events) {
    if (event.atTick !== caseState.operationsUsed || caseState.appliedEvents.includes(event.id)) continue;
    caseState.appliedEvents.push(event.id);
    if (event.type === 'move' && event.transmitterId) {
      const transmitter = caseState.transmitters.find(item => item.id === event.transmitterId);
      if (transmitter) transmitter.centre = 18;
    }
    if (event.type === 'disable' && event.stationId && !caseState.disabledStations.includes(event.stationId)) caseState.disabledStations.push(event.stationId);
    caseState.notice = event.notice;
  }
}

function spendTick(caseState: CaseState): boolean {
  if (caseState.operationsUsed >= caseState.definition.operationLimit) return false;
  caseState.operationsUsed++;
  applyEvents(caseState);
  return true;
}

function updateCandidates(caseState: CaseState): void {
  const locks = Object.values(caseState.locks) as Lock[];
  caseState.candidateZones = locks.length ? candidatesFor(locks) : [];
  if (caseState.candidateZones.length === 1) caseState.phase = 'broadcast';
}

function maybeExpire(caseState: CaseState): void {
  if (caseState.operationsUsed >= caseState.definition.operationLimit && caseState.phase !== 'broadcast') {
    caseState.phase = 'debrief'; caseState.lastResult = 'expired'; caseState.notice = 'TARGET LOST IN THE NOISE.';
  }
}

function capture(caseState: CaseState): string {
  if (!spendTick(caseState)) { maybeExpire(caseState); return 'expired'; }
  const evaluation = evaluateLock(caseState, caseState.selectedStation);
  for (const transmitter of caseState.transmitters) {
    const overlap = Math.abs(transmitter.centre - caseState.tuner.centre) <= Math.floor((transmitter.bandwidth + caseState.tuner.bandwidth) / 2);
    if (overlap) transmitter.discovered = true;
  }
  if (evaluation.quality === 'none') { caseState.notice = 'NO LOCK: ' + evaluation.reason; maybeExpire(caseState); return 'no-lock'; }
  const rough = evaluation.quality === 'rough';
  const fragments = evaluation.quality === 'rough' ? 1 : evaluation.quality === 'clean' ? 2 : 3;
  caseState.locks[caseState.selectedStation] = { stationId: caseState.selectedStation, quality: evaluation.quality, allowedBearings: bearingSet(caseState.selectedStation, evaluation.target.position, rough), ray: rough ? undefined : exactRay(caseState.selectedStation, evaluation.target.position), fragments, capturedAtTick: caseState.operationsUsed };
  evaluation.target.discovered = true;
  caseState.notice = `${evaluation.quality.toUpperCase()} LOCK ${caseState.selectedStation.toUpperCase()}: ${evaluation.reason}`;
  updateCandidates(caseState);
  maybeExpire(caseState);
  return evaluation.quality + '-lock';
}

function installNotch(caseState: CaseState): string {
  if (caseState.filtersRemaining <= 0) { caseState.notice = 'NO NOTCH FILTERS REMAIN.'; return 'invalid'; }
  const blocker = caseState.transmitters.find(transmitter => transmitter.role !== 'target' && transmitter.discovered && !transmitter.notched && Math.abs(transmitter.centre - caseState.tuner.centre) <= Math.floor((transmitter.bandwidth + caseState.tuner.bandwidth) / 2));
  if (!blocker) { caseState.notice = 'NO DISCOVERED BLOCKER IN TUNED BAND.'; return 'invalid'; }
  if (!spendTick(caseState)) { maybeExpire(caseState); return 'expired'; }
  blocker.notched = true; caseState.filtersRemaining--; caseState.notice = `NOTCH INSTALLED: ${blocker.id.toUpperCase()}.`; maybeExpire(caseState);
  return 'notch';
}

function phaseLock(caseState: CaseState): string {
  if (caseState.phaseLocksRemaining <= 0) { caseState.notice = 'NO PHASE-LOCKS REMAIN.'; return 'invalid'; }
  if (!spendTick(caseState)) { maybeExpire(caseState); return 'expired'; }
  caseState.phaseLocksRemaining--;
  const result = evaluateLock(caseState, caseState.selectedStation);
  if (result.quality === 'none') { caseState.notice = 'PHASE-LOCK FOUND NO CARRIER: ' + result.reason; maybeExpire(caseState); return 'no-lock'; }
  caseState.locks[caseState.selectedStation] = { stationId: caseState.selectedStation, quality: 'crisp', allowedBearings: bearingSet(caseState.selectedStation, result.target.position, false), ray: exactRay(caseState.selectedStation, result.target.position), fragments: 3, capturedAtTick: caseState.operationsUsed };
  result.target.discovered = true; caseState.notice = 'PHASE-LOCK: CRISP FIX ACQUIRED.'; updateCandidates(caseState); maybeExpire(caseState);
  return 'phase-lock';
}

function debrief(state: GameState, correct: boolean, expired = false): void {
  const caseState = activeCase(state);
  caseState.lastResult = expired ? 'expired' : correct ? 'correct' : 'wrong';
  caseState.phase = 'debrief';
  const target = caseState.transmitters.find(transmitter => transmitter.role === 'target');
  if (correct) {
    caseState.score = 1000 + caseState.filtersRemaining * 100 - caseState.operationsUsed * 50;
    state.correctReplies++; state.totalScore += caseState.score;
    state.log.push(`${target?.packet?.callSign ?? 'UNKNOWN'}: safe response sent.`);
    caseState.notice = 'RESPONSE ACCEPTED. CHANNEL STABLE.';
  } else {
    state.failedCases++;
    state.log.push(`${target?.packet?.callSign ?? 'UNKNOWN'}: channel closed without safe resolution.`);
    caseState.notice = expired ? 'TARGET DISAPPEARED BEFORE CONTACT.' : 'WRONG RESPONSE. THE CHANNEL GOES DARK.';
  }
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  const events: string[] = [];
  let caseState = activeCase(state);
  if (command.type === 'start') {
    const fresh = createState(state.seed);
    fresh.mode = command.mode;
    fresh.caseIndex = 0;
    fresh.caseState = newCase(CASES[0]);
    fresh.caseState.phase = 'brief';
    fresh.caseState.notice = command.mode === 'tutorial' ? 'INDUCTION: FIND MERCY-2 AND KEEP THEM ON CHANNEL.' : 'CASE 01: READ THE TASKING.';
    return { state: fresh, events: ['start'] };
  }
  if (command.type === 'restart') {
    state.caseState = newCase(CASES[state.caseIndex]); state.caseState.phase = 'brief'; return { state, events: ['restart'] };
  }
  if (command.type === 'continueBrief' && caseState.phase === 'brief') { caseState.phase = 'listening'; caseState.notice = 'SWEEP OR TUNE THE SELECTED STATION.'; return { state, events: ['listen'] }; }
  if (command.type === 'continueDebrief' && caseState.phase === 'debrief') {
    state.casesCompleted++;
    if (state.mode === 'tutorial' || state.caseIndex >= CASES.length - 1) { caseState.phase = 'ending'; return { state, events: ['ending'] }; }
    state.caseIndex++; state.caseState = newCase(CASES[state.caseIndex]); state.caseState.phase = 'brief'; return { state, events: ['next-case'] };
  }
  if (caseState.phase !== 'listening' && caseState.phase !== 'broadcast') return { state, events };
  switch (command.type) {
    case 'changeStation':
      caseState.selectedStation = cycle(STATION_ORDER, caseState.selectedStation, command.delta); caseState.notice = `${caseState.selectedStation.toUpperCase()} STATION SELECTED.`; break;
    case 'changeCentre': caseState.tuner.centre = Math.max(0, Math.min(23, caseState.tuner.centre + command.delta)); break;
    case 'changeBandwidth': caseState.tuner.bandwidth = cycle(BANDWIDTHS, caseState.tuner.bandwidth, command.delta); break;
    case 'cycleModulation': caseState.tuner.modulation = cycle(MODULATIONS, caseState.tuner.modulation, 1); break;
    case 'changeGain': caseState.tuner.gain = Math.max(1, Math.min(5, caseState.tuner.gain + command.delta)) as 1 | 2 | 3 | 4 | 5; break;
    case 'sweep':
      if (spendTick(caseState)) { caseState.transmitters.filter(transmitter => Math.abs(transmitter.centre - caseState.tuner.centre) <= 2).forEach(transmitter => { transmitter.discovered = true; }); caseState.notice = 'SWEEP COMPLETE. MARKERS UPDATED.'; maybeExpire(caseState); events.push('sweep'); }
      else maybeExpire(caseState);
      break;
    case 'capture': events.push(capture(caseState)); break;
    case 'notch': events.push(installNotch(caseState)); break;
    case 'phaseLock': events.push(phaseLock(caseState)); break;
    case 'selectBroadcast':
      if (caseState.phase === 'broadcast') { caseState.selectedBroadcast = command.action; caseState.notice = `RESPONSE ARMED: ${command.action.toUpperCase()}. PRESS ENTER.`; }
      break;
    case 'confirmBroadcast': {
      if (caseState.phase !== 'broadcast' || !caseState.selectedBroadcast) { caseState.notice = 'LOCATE THE SOURCE AND ARM A RESPONSE FIRST.'; break; }
      const target = caseState.transmitters.find(transmitter => transmitter.role === 'target');
      const correct = target?.packet?.correctBroadcast === caseState.selectedBroadcast;
      debrief(state, correct === true); events.push(correct ? 'correct' : 'wrong');
      break;
    }
    default: break;
  }
  return { state, events };
}

export function currentPacket(state: GameState) { return state.caseState.transmitters.find(transmitter => transmitter.role === 'target')?.packet; }

export function stationLabel(station: StationId): string { return station.toUpperCase() + ' STATION'; }
