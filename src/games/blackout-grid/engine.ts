import { DISTRICT_CONTENT, UPGRADES } from './content';
import { createBlueprint } from './scenario';
import { mixSeed, seededValue } from './seed';
import { buildAssignments, canCloseEdge, downstreamDemand, edgeAt, nodeAt, sourceForNode, updateEnergization } from './topology';
import type { Command, CommandResult, DistrictKind, EngineEvent, GameState, GridEdge, GridNode, LogEntry, TickResult, Upgrade } from './types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const logTone = (kind: EngineEvent['kind']): LogEntry['tone'] => kind === 'good' || kind === 'energize' || kind === 'complete' || kind === 'upgrade' ? 'good' : kind === 'warning' ? 'warn' : kind === 'bad' || kind === 'trip' || kind === 'fault' ? 'bad' : 'normal';
const activeDistricts = (state: GameState): Set<string> => new Set(state.stages[state.stageIndex]?.activeDistrictIds ?? []);

function cloneStatePart<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function currentStage(state: GameState) { return state.stages[state.stageIndex]; }

function event(state: GameState, kind: EngineEvent['kind'], text: string, entityId?: string, value?: number): EngineEvent {
  void state;
  return { kind, text, entityId, value };
}

function addLog(state: GameState, item: EngineEvent): void {
  const entry: LogEntry = { tick: state.tick, text: item.text, tone: logTone(item.kind), entityId: item.entityId };
  state.eventLog = [entry, ...state.eventLog].slice(0, 8);
}

function setEvents(state: GameState, events: EngineEvent[]): void {
  state.lastEvents = events;
  for (const item of events) addLog(state, item);
}

function effectiveCapacity(state: GameState, edge: GridEdge): number {
  return edge.capacityMW * (state.upgrades.includes('thermal') ? 1.15 : 1);
}

function resetDistrictsForStage(state: GameState): void {
  const active = activeDistricts(state);
  for (const node of Object.values(state.nodes)) {
    const district = node.district;
    if (!district) continue;
    if (!active.has(node.id)) { district.powered = false; district.requestedMW = 0; continue; }
    district.eventMultiplier = 1;
    if (district.serviceBreaker === 'closed' && state.assignments[node.id]) district.pickupBeatsRemaining = Math.max(district.pickupBeatsRemaining, 4);
  }
}

function updateForecast(state: GameState): void {
  state.forecast = currentStage(state).events.filter(item => !item.resolved && item.impactTick >= state.tick).sort((a, b) => a.impactTick - b.impactTick || a.id.localeCompare(b.id));
}

export function createState(seed = Date.now(), mode: GameState['mode'] = 'standard'): GameState {
  const safeSeed = seed >>> 0;
  const blueprint = createBlueprint(safeSeed);
  const state: GameState = {
    version: 1, seed: safeSeed, mode, phase: 'start', tick: 0, stageIndex: 0,
    stages: cloneStatePart(blueprint.stages), nodes: cloneStatePart(blueprint.nodes), edges: cloneStatePart(blueprint.edges),
    assignments: {}, jobs: [], crewSlots: 1, lineKits: 2, generatorFuel: 32, focusCharges: 2, upgrades: [],
    civicStrain: 0, maximumStrain: 0, stabilityBeats: 0, score: 0, feederTrips: 0, sourceTrips: 0, maxHeat: 0,
    selected: { kind: 'edge', id: 'e-north-h' }, forecast: [], eventLog: [], lastEvents: [], tutorialStep: mode === 'tutorial' ? 0 : null, stageScoreStart: 0,
  };
  resetDistrictsForStage(state);
  state.assignments = buildAssignments(state);
  updateEnergization(state);
  updateForecast(state);
  return state;
}

function activeNode(state: GameState): GridNode | undefined {
  const selection = state.selected;
  if (selection.kind === 'node') return state.nodes[selection.id];
  if (selection.kind === 'edge') {
    const edge = state.edges[selection.id];
    return edge ? state.nodes[edge.from] : undefined;
  }
  return nodeAt(state, selection.point);
}

function activeEdge(state: GameState): GridEdge | undefined {
  const selection = state.selected;
  if (selection.kind === 'edge') return state.edges[selection.id];
  if (selection.kind === 'node') return undefined;
  return edgeAt(state, selection.point);
}

export function selectedAsset(state: GameState): { node?: GridNode; edge?: GridEdge } {
  return { node: activeNode(state), edge: activeEdge(state) };
}

function moveSelection(state: GameState, dx: number, dy: number): void {
  const selection = state.selected;
  const current = selection.kind === 'cell' ? selection.point : selection.kind === 'node' ? state.nodes[selection.id]?.position : state.edges[selection.id]?.route[Math.floor(state.edges[selection.id].route.length / 2)];
  const point = current ?? { x: 0, y: 0 };
  state.selected = { kind: 'cell', point: { x: clamp(point.x + dx, 0, 14), y: clamp(point.y + dy, 0, 8) } };
}

function selectableIds(state: GameState): Array<{ kind: 'node' | 'edge'; id: string }> {
  return [...Object.values(state.nodes).map(node => ({ kind: 'node' as const, id: node.id })), ...Object.values(state.edges).map(edge => ({ kind: 'edge' as const, id: edge.id }))].sort((a, b) => a.id.localeCompare(b.id));
}

function cycleSelection(state: GameState, direction: 1 | -1): void {
  const items = selectableIds(state);
  if (!items.length) return;
  const index = state.selected.kind === 'cell' ? -1 : items.findIndex(item => item.kind === state.selected.kind && item.id === state.selected.id);
  const next = items[(index + direction + items.length) % items.length];
  state.selected = next;
}

function stageActive(state: GameState, nodeId: string): boolean { return activeDistricts(state).has(nodeId); }

function canRepair(state: GameState, edge: GridEdge): string | undefined {
  if (edge.condition !== 'faulted' && edge.condition !== 'unbuilt') return 'EDGE DOES NOT NEED REPAIR';
  if (edge.condition === 'faulted' && edge.breaker !== 'tripped') return 'FAULT NOT ISOLATED';
  if (state.jobs.some(job => job.edgeId === edge.id)) return 'CREW ALREADY ON THIS EDGE';
  if (state.jobs.length >= state.crewSlots) return 'NO CREW AVAILABLE';
  if (edge.condition === 'unbuilt' && state.lineKits <= 0) return 'NO LINE KITS';
  return undefined;
}

function toggleBreaker(state: GameState): CommandResult {
  const edge = activeEdge(state);
  if (!edge) return { state, accepted: false, events: [], reason: 'SELECT A FEEDER OR TIE' };
  if (edge.breaker === 'closed') {
    edge.breaker = 'open';
    const item = event(state, 'info', `${edge.label} OPEN`, edge.id);
    setEvents(state, [item]);
    updateEnergization(state);
    return { state, accepted: true, events: [item] };
  }
  const check = canCloseEdge(state, edge.id);
  if (!check.ok) return { state, accepted: false, events: [], reason: `CLOSE BLOCKED — ${check.reason}` };
  edge.breaker = 'closed'; edge.tripCause = null;
  const changes = updateEnergization(state);
  const item = event(state, 'energize', `${edge.label} CLOSED — ${changes.energized.length} SPAN(S) LIVE`, edge.id);
  setEvents(state, [item]);
  return { state, accepted: true, events: [item] };
}

function startCrewJob(state: GameState): CommandResult {
  const edge = activeEdge(state);
  if (!edge) return { state, accepted: false, events: [], reason: 'SELECT A FEEDER OR TIE' };
  const reason = canRepair(state, edge);
  if (reason) return { state, accepted: false, events: [], reason: `CREW BLOCKED — ${reason}` };
  const kind: 'repair' | 'build' = edge.condition === 'unbuilt' ? 'build' : 'repair';
  if (kind === 'build') state.lineKits--;
  const total = kind === 'build' ? (state.upgrades.includes('kits') ? 8 : 10) : edge.kind === 'underground' ? 12 : 8;
  edge.condition = 'repairing'; edge.repairBeats = total;
  const job = { id: `job-${state.tick}-${edge.id}`, edgeId: edge.id, kind, remainingBeats: total, totalBeats: total };
  state.jobs.push(job);
  const item = event(state, 'info', `${kind === 'build' ? 'BUILD' : 'REPAIR'} CREW SENT TO ${edge.label}`, edge.id);
  setEvents(state, [item]);
  return { state, accepted: true, events: [item] };
}

function toggleDistrict(state: GameState): CommandResult {
  const node = activeNode(state);
  if (!node?.district) return { state, accepted: false, events: [], reason: 'SELECT A DISTRICT LOAD' };
  if (!stageActive(state, node.id)) return { state, accepted: false, events: [], reason: 'DISTRICT NOT ACTIVE THIS STAGE' };
  const district = node.district;
  if (district.serviceBreaker === 'closed') {
    district.serviceBreaker = 'open'; district.powered = false;
    const item = event(state, 'warning', `${node.label} SHED — CIVIC STRAIN RISING`, node.id);
    setEvents(state, [item]);
    return { state, accepted: true, events: [item] };
  }
  if (!state.assignments[node.id]) return { state, accepted: false, events: [], reason: 'LOAD HAS NO LIVE SOURCE PATH' };
  district.serviceBreaker = 'closed';
  const item = event(state, 'info', `${node.label} RESTORE REQUEST — PICKUP INCOMING`, node.id);
  setEvents(state, [item]);
  return { state, accepted: true, events: [item] };
}

function connectedToBulk(state: GameState, start: string): boolean {
  const seen = new Set<string>([start]); const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    if (state.nodes[current]?.kind === 'bulk-source') return true;
    for (const edge of Object.values(state.edges)) {
      if (edge.condition !== 'intact' || edge.breaker !== 'closed') continue;
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return false;
}

function toggleGenerator(state: GameState): CommandResult {
  const node = activeNode(state);
  if (!node?.generator) return { state, accepted: false, events: [], reason: 'SELECT THE MOBILE RESERVE' };
  const generator = node.generator;
  if (generator.online) {
    generator.online = false; node.sourceOnline = false;
    const item = event(state, 'info', 'MOBILE RESERVE OFFLINE', node.id);
    setEvents(state, [item]);
    updateEnergization(state);
    return { state, accepted: true, events: [item] };
  }
  if (generator.fuel <= 0 || state.generatorFuel <= 0) return { state, accepted: false, events: [], reason: 'GENERATOR FUEL EMPTY' };
  if (connectedToBulk(state, node.id)) return { state, accepted: false, events: [], reason: 'ISLAND MUST BE SEPARATE FROM BULK SOURCE' };
  generator.online = true; node.sourceOnline = true;
  const item = event(state, 'energize', 'MOBILE RESERVE ONLINE — ISLAND POWER AVAILABLE', node.id);
  setEvents(state, [item]);
  updateEnergization(state);
  return { state, accepted: true, events: [item] };
}

function progressJobs(state: GameState, events: EngineEvent[], completed: string[]): void {
  for (const job of state.jobs) {
    job.remainingBeats--;
    const edge = state.edges[job.edgeId];
    if (!edge) continue;
    edge.repairBeats = Math.max(0, job.remainingBeats);
    if (job.remainingBeats <= 0) {
      edge.condition = 'intact'; edge.breaker = 'open'; edge.tripCause = null; edge.faultKind = null; edge.repairBeats = 0;
      completed.push(edge.id);
      events.push(event(state, 'complete', `${edge.label} WORK COMPLETE — READY TO CLOSE`, edge.id));
    }
  }
  state.jobs = state.jobs.filter(job => job.remainingBeats > 0);
}

function resolveStormEvents(state: GameState, events: EngineEvent[], faults: string[]): void {
  const stage = currentStage(state);
  for (const storm of stage.events.slice().sort((a, b) => a.impactTick - b.impactTick || a.id.localeCompare(b.id))) {
    if (storm.resolved) continue;
    if (storm.revealTick === state.tick) events.push(event(state, 'warning', `FORECAST — ${storm.kind.toUpperCase()} / ${storm.zoneId.toUpperCase()} AT T+${storm.impactTick}`, storm.targetId));
    if (storm.impactTick !== state.tick) continue;
    storm.resolved = true;
    if (storm.kind === 'demand-surge') {
      const node = state.nodes[storm.targetId];
      if (node?.district) node.district.eventMultiplier = storm.magnitude;
      events.push(event(state, 'warning', `DEMAND SURGE — ${node?.label ?? storm.targetId} ${storm.magnitude.toFixed(2)}×`, storm.targetId));
    } else if (storm.kind === 'flood-derate') {
      const node = state.nodes[storm.targetId];
      if (node) { node.capacityMW = Math.max(8, node.capacityMW * storm.magnitude); events.push(event(state, 'bad', `FLOOD DERATE — ${node.label} CAPACITY CUT`, node.id)); }
    } else if (storm.kind === 'debris-delay') {
      for (const job of state.jobs) if (job.edgeId === storm.targetId) job.remainingBeats += storm.magnitude;
      events.push(event(state, 'warning', `DEBRIS DELAY — FIELD WORK +${storm.magnitude} BEATS`, storm.targetId));
    } else {
      const edge = state.edges[storm.targetId];
      if (!edge) continue;
      edge.breaker = 'tripped'; edge.tripCause = storm.kind === 'lightning-transient' ? 'transient' : 'fault';
      if (storm.kind !== 'lightning-transient') { edge.condition = 'faulted'; edge.faultKind = storm.kind; faults.push(edge.id); }
      events.push(event(state, storm.kind === 'lightning-transient' ? 'trip' : 'fault', `${storm.kind.toUpperCase()} — ${edge.label} PROTECTION TRIPPED`, edge.id));
    }
  }
}

function updateDistrictDemand(state: GameState, events: EngineEvent[]): void {
  const active = activeDistricts(state); const multiplier = currentStage(state).demandMultiplier;
  for (const node of Object.values(state.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    const district = node.district;
    if (!district || !active.has(node.id)) continue;
    const assigned = Boolean(state.assignments[node.id]);
    const powered = assigned && district.serviceBreaker === 'closed';
    if (powered && !district.powered) {
      district.pickupBeatsRemaining = district.darkBeats >= 6 ? 10 : Math.max(1, district.pickupBeatsRemaining);
      district.pickupPhase = district.pickupBeatsRemaining > 6 ? 1 : 2;
      events.push(event(state, 'energize', `${node.label} ENERGIZED — COLD PICKUP`, node.id));
    }
    district.powered = powered;
    if (!powered) district.darkBeats++;
    else district.darkBeats = 0;
    let pickup = 1;
    if (district.pickupBeatsRemaining > 6) pickup = state.upgrades.includes('demand') && district.kind === 'residential' ? 1.35 : 1.6;
    else if (district.pickupBeatsRemaining > 0) pickup = state.upgrades.includes('demand') && district.kind === 'residential' ? 1.15 : 1.3;
    district.requestedMW = district.baseDemandMW * multiplier * district.eventMultiplier * (powered ? pickup : 0);
    if (district.pickupBeatsRemaining > 0 && powered) district.pickupBeatsRemaining--;
    if (district.pickupBeatsRemaining <= 0) district.pickupPhase = 0;
  }
}

function updateHeat(state: GameState, events: EngineEvent[], trips: string[]): void {
  for (const edge of Object.values(state.edges).sort((a, b) => a.id.localeCompare(b.id))) {
    if (!edge.energized) { edge.heat = Math.max(0, edge.heat - 7); continue; }
    const utilization = edge.flowMW / Math.max(1, effectiveCapacity(state, edge));
    if (utilization > 1) edge.heat += 8 + (utilization - 1) * 32;
    else if (utilization < 0.85) edge.heat -= 7;
    else edge.heat -= 3;
    edge.heat = clamp(edge.heat, 0, 100);
    state.maxHeat = Math.max(state.maxHeat, edge.heat);
    if (edge.heat >= 100 && edge.breaker === 'closed') {
      edge.breaker = 'tripped'; edge.tripCause = 'overload'; trips.push(edge.id); state.feederTrips++;
      events.push(event(state, 'trip', `OVERLOAD — ${edge.label} TRIPPED ${Math.round(edge.flowMW)}/${Math.round(effectiveCapacity(state, edge))} MW`, edge.id));
    }
  }
  for (const node of Object.values(state.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    if (node.kind !== 'bulk-source' && node.kind !== 'substation') continue;
    if (!node.flowMW) { node.heat = Math.max(0, node.heat - 7); continue; }
    const utilization = node.flowMW / Math.max(1, node.capacityMW);
    node.heat = clamp(node.heat + (utilization > 1 ? 8 + (utilization - 1) * 24 : utilization < 0.85 ? -7 : -3), 0, 100);
    state.maxHeat = Math.max(state.maxHeat, node.heat);
    if (node.kind === 'bulk-source' && node.heat >= 100 && node.sourceOnline) {
      node.sourceOnline = false; state.sourceTrips++; events.push(event(state, 'bad', `${node.label} SOURCE TRIPPED — CAPACITY LOST`, node.id));
    }
  }
}

function consumeGenerator(state: GameState, events: EngineEvent[]): void {
  for (const node of Object.values(state.nodes)) {
    const generator = node.generator;
    if (!generator?.online) continue;
    generator.fuel = Math.max(0, generator.fuel - 0.4);
    state.generatorFuel = Math.max(0, state.generatorFuel - 0.4);
    if (generator.fuel <= 0 || state.generatorFuel <= 0) { generator.online = false; node.sourceOnline = false; events.push(event(state, 'warning', 'MOBILE RESERVE EMPTY — ISLAND DARK', node.id)); }
  }
}

function updateStrain(state: GameState): void {
  const active = activeDistricts(state); let delta = 0; let criticalServed = true;
  for (const nodeId of active) {
    const district = state.nodes[nodeId]?.district;
    if (!district) continue;
    if (!district.powered) { delta += district.strainPerDarkBeat; if (currentStage(state).requiredDistrictIds.includes(nodeId)) criticalServed = false; }
  }
  if (criticalServed) delta -= 0.35;
  state.civicStrain = clamp(state.civicStrain + delta, 0, 100);
  state.maximumStrain = Math.max(state.maximumStrain, state.civicStrain);
}

function serviceRatio(state: GameState): number {
  const active = activeDistricts(state); let total = 0; let served = 0;
  for (const nodeId of active) {
    const district = state.nodes[nodeId]?.district;
    if (!district) continue;
    total += district.baseDemandMW * district.serviceWeight;
    if (district.powered) served += district.baseDemandMW * district.serviceWeight;
  }
  return total > 0 ? served / total : 0;
}

function updateStability(state: GameState, events: EngineEvent[]): boolean {
  const stage = currentStage(state); const required = stage.requiredDistrictIds.every(id => state.nodes[id]?.district?.powered);
  if (required && serviceRatio(state) >= stage.minimumServiceRatio) state.stabilityBeats++;
  else state.stabilityBeats = 0;
  if (state.stabilityBeats === stage.holdBeats) events.push(event(state, 'complete', `${stage.name} STABILITY WINDOW COMPLETE`));
  state.score += Math.round(serviceRatio(state) * 10);
  return state.stabilityBeats >= stage.holdBeats;
}

function evaluateOutcome(state: GameState, stageCleared: boolean, events: EngineEvent[]): void {
  if (state.civicStrain >= 100) { state.phase = 'gameOver'; events.push(event(state, 'bad', 'CIVIC STRAIN 100 — CITY RESTORATION LOST')); return; }
  if (!stageCleared) return;
  if (state.mode === 'tutorial' || state.stageIndex >= state.stages.length - 1) {
    state.phase = 'won'; events.push(event(state, 'complete', state.mode === 'tutorial' ? 'TRAINING RESTORATION COMPLETE' : 'SHIFT COMPLETE — CITY STABLE'));
  } else {
    state.phase = 'upgrade'; events.push(event(state, 'upgrade', 'STAGE CLEAR — CHOOSE ONE UPGRADE'));
  }
}

export function advance(state: GameState): TickResult {
  const result: TickResult = { events: [], energizedEdges: [], deenergizedEdges: [], trips: [], faults: [], districtsRestored: [], jobsCompleted: [], stageCleared: false };
  if (state.phase !== 'running') return result;
  state.tick++;
  progressJobs(state, result.events, result.jobsCompleted);
  resolveStormEvents(state, result.events, result.faults);
  const changes = updateEnergization(state); result.energizedEdges.push(...changes.energized); result.deenergizedEdges.push(...changes.deenergized);
  updateDistrictDemand(state, result.events);
  const previousPowered = new Set(Object.values(state.nodes).filter(node => node.district?.powered).map(node => node.id));
  downstreamDemand(state, activeDistricts(state));
  updateHeat(state, result.events, result.trips);
  const afterTrips = updateEnergization(state); result.energizedEdges.push(...afterTrips.energized); result.deenergizedEdges.push(...afterTrips.deenergized);
  updateDistrictDemand(state, result.events);
  downstreamDemand(state, activeDistricts(state));
  for (const node of Object.values(state.nodes)) if (node.district?.powered && !previousPowered.has(node.id)) result.districtsRestored.push(node.id);
  consumeGenerator(state, result.events);
  updateStrain(state);
  result.stageCleared = updateStability(state, result.events);
  updateForecast(state);
  evaluateOutcome(state, result.stageCleared, result.events);
  setEvents(state, result.events);
  return result;
}

export function upgradeChoices(state: GameState): Upgrade[] {
  const start = mixSeed(state.seed, state.stageIndex * 97 + 11) % UPGRADES.length;
  const choices: Upgrade[] = [];
  for (let i = 0; i < UPGRADES.length && choices.length < 3; i++) {
    const choice = UPGRADES[(start + i) % UPGRADES.length];
    if (!state.upgrades.includes(choice.id)) choices.push(choice);
  }
  return choices;
}

function applyUpgrade(state: GameState, upgrade: Upgrade): void {
  state.upgrades.push(upgrade.id);
  if (upgrade.id === 'crew') state.crewSlots++;
  if (upgrade.id === 'kits') state.lineKits += 2;
  if (upgrade.id === 'reserve') { state.generatorFuel += 18; for (const node of Object.values(state.nodes)) if (node.generator) node.generator.capacityMW += 4; }
  if (upgrade.id === 'focus') state.focusCharges++;
}

function advanceStage(state: GameState, upgrade: Upgrade): void {
  applyUpgrade(state, upgrade);
  state.stageIndex++;
  state.tick = 0;
  state.stabilityBeats = 0;
  state.stageScoreStart = state.score;
  for (const storm of currentStage(state).events) storm.resolved = false;
  resetDistrictsForStage(state);
  updateEnergization(state);
  updateForecast(state);
  state.phase = 'briefing';
  const item = event(state, 'upgrade', `${upgrade.name} INSTALLED — ${upgrade.description}`);
  setEvents(state, [item]);
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  if (command.type === 'startStandard') { const next = createState(command.seed ?? state.seed, 'standard'); next.phase = 'briefing'; return { state: next, accepted: true, events: [] }; }
  if (command.type === 'startTutorial') { const next = createState(state.seed, 'tutorial'); next.phase = 'briefing'; return { state: next, accepted: true, events: [] }; }
  if (command.type === 'restartSameSeed') { const next = createState(state.seed, state.mode); next.phase = 'briefing'; return { state: next, accepted: true, events: [] }; }
  if (command.type === 'toggleHelp') return { state, accepted: true, events: [] };
  if (state.phase === 'briefing' && command.type === 'dismissBriefing') { state.phase = 'running'; return { state, accepted: true, events: [] }; }
  if (state.phase === 'running') {
    if (command.type === 'moveSelection') { moveSelection(state, command.dx, command.dy); return { state, accepted: true, events: [] }; }
    if (command.type === 'cycleSelection') { cycleSelection(state, command.direction); return { state, accepted: true, events: [] }; }
    if (command.type === 'toggleBreaker') return toggleBreaker(state);
    if (command.type === 'startCrewJob') return startCrewJob(state);
    if (command.type === 'toggleDistrict') return toggleDistrict(state);
    if (command.type === 'toggleGenerator') return toggleGenerator(state);
  }
  if (state.phase === 'upgrade' && command.type === 'chooseUpgrade') {
    const upgrade = upgradeChoices(state).find(choice => choice.id === command.upgradeId);
    if (!upgrade) return { state, accepted: false, events: [], reason: 'UPGRADE NOT OFFERED' };
    advanceStage(state, upgrade);
    return { state, accepted: true, events: state.lastEvents };
  }
  return { state, accepted: false, events: [], reason: 'ACTION UNAVAILABLE IN THIS PHASE' };
}

export function closePreview(state: GameState, edgeId: string): { ok: boolean; reason?: string; districts: string[]; worstUtilization: number } {
  const edge = state.edges[edgeId]; const districts: string[] = [];
  if (!edge) return { ok: false, reason: 'NO SUCH EDGE', districts, worstUtilization: 0 };
  const check = canCloseEdge(state, edgeId);
  if (!check.ok) return { ok: false, reason: check.reason, districts, worstUtilization: 0 };
  const snapshot = cloneStatePart({ assignments: state.assignments, nodes: state.nodes, edges: state.edges });
  edge.breaker = 'closed';
  updateEnergization(state);
  const active = activeDistricts(state);
  for (const id of active) if (state.assignments[id] && !snapshot.nodes[id].district?.powered) districts.push(state.nodes[id].label);
  for (const node of Object.values(state.nodes)) if (node.district && districts.includes(node.label)) node.district.powered = true;
  updateDistrictDemand(state, []);
  downstreamDemand(state, active);
  const worst = Math.max(0, ...Object.values(state.edges).filter(item => item.energized).map(item => item.flowMW / Math.max(1, effectiveCapacity(state, item))));
  state.assignments = snapshot.assignments; Object.assign(state.nodes, snapshot.nodes); Object.assign(state.edges, snapshot.edges);
  return { ok: true, districts, worstUtilization: worst };
}

export function districtContent(kind: DistrictKind) { return DISTRICT_CONTENT[kind]; }
export function serviceRatioForState(state: GameState): number { return serviceRatio(state); }
export function selectedSource(state: GameState): string | null { const item = selectedAsset(state); return item.node ? sourceForNode(state, item.node.id) : item.edge ? sourceForNode(state, item.edge.to) : null; }
export function projectedScore(state: GameState): number { return state.score + Math.round(serviceRatio(state) * 10); }
export function stableSeedForPreview(state: GameState): number { return seededValue(state.seed, state.tick + state.stageIndex); }
