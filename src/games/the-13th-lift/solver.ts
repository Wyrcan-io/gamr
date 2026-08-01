import type { Clue, CluePredicate, Landing, PanelButton, Passenger, RouteEvaluation, RouteViolation, ServiceConstraint, StopOutcome, World } from './types';
import type { ShiftContract } from './types';

function cloneLandings(landings: Landing[]): Record<string, Landing> {
  return Object.fromEntries(landings.map(landing => [landing.id, { ...landing }]));
}

function canonicalMap(landings: Landing[], includeThirteen: boolean): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const landing of landings) map[landing.canonicalLabel] = landing.id;
  if (includeThirteen) map['13'] = null;
  return map;
}

function world(id: string, landings: Landing[], buttonMap: Record<string, string | null>, anomalyIds: string[]): World {
  return { id, anomalyIds, landings: cloneLandings(landings), buttonMap: { ...buttonMap } };
}

function sortedLabels(map: Record<string, string | null>): string[] {
  return Object.keys(map).sort((a, b) => Number(a) - Number(b));
}

export function panelForWorld(worldValue: World): PanelButton[] {
  return sortedLabels(worldValue.buttonMap).map(label => ({
    id: label,
    label,
    enabled: true,
    suspicious: worldValue.buttonMap[label] === null || label === '13',
  }));
}

export function enumerateCandidateWorlds(landings: Landing[], contract: ShiftContract): World[] {
  const base = canonicalMap(landings, contract.panelHasThirteen);
  const labels = landings.map(landing => landing.canonicalLabel);
  const worlds: World[] = [];
  const add = (id: string, map: Record<string, string | null>, anomalies: string[]) => worlds.push(world(id, landings, map, anomalies));

  if (contract.allowedAnomalies.includes('stable')) add('stable', base, ['stable']);
  if (contract.allowedAnomalies.includes('adjacent-swap')) {
    for (let i = 0; i < labels.length - 1; i++) {
      const map = { ...base };
      const a = labels[i];
      const b = labels[i + 1];
      [map[a], map[b]] = [map[b], map[a]];
      add(`swap-${a}-${b}`, map, [`adjacent-swap:${a}:${b}`]);
    }
  }
  if (contract.allowedAnomalies.includes('three-cycle')) {
    for (let i = 0; i < labels.length - 2; i++) {
      const map = { ...base };
      const a = labels[i];
      const b = labels[i + 1];
      const c = labels[i + 2];
      [map[a], map[b], map[c]] = [map[c], map[a], map[b]];
      add(`cycle-${a}-${b}-${c}`, map, [`three-cycle:${a}:${b}:${c}`]);
    }
  }
  if (contract.allowedAnomalies.includes('phantom-button')) {
    const map = { ...base, '13': null };
    add('phantom-13', map, ['phantom-button:13']);
  }
  if (contract.allowedAnomalies.includes('echo-button')) {
    for (const landing of landings) add(`echo-13-${landing.id}`, { ...base, '13': landing.id }, [`echo-button:13:${landing.id}`]);
  }
  if (contract.allowedAnomalies.includes('compound')) {
    for (let i = 0; i < labels.length - 1; i++) {
      const swapped = { ...base };
      const a = labels[i];
      const b = labels[i + 1];
      [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
      add(`compound-phantom-${a}-${b}`, { ...swapped, '13': null }, [`adjacent-swap:${a}:${b}`, 'phantom-button:13']);
      for (const landing of landings) add(`compound-echo-${a}-${b}-${landing.id}`, { ...swapped, '13': landing.id }, [`adjacent-swap:${a}:${b}`, `echo-button:13:${landing.id}`]);
    }
  }
  return worlds;
}

function landingById(worldValue: World, id: string): Landing | undefined {
  return worldValue.landings[id];
}

export function isClueTrue(worldValue: World, predicate: CluePredicate): boolean {
  switch (predicate.kind) {
    case 'button-opens':
      return worldValue.buttonMap[predicate.button] === predicate.landing;
    case 'button-is-phantom':
      return worldValue.buttonMap[predicate.button] === null;
    case 'button-is-authentic':
      return worldValue.buttonMap[predicate.button] !== undefined && worldValue.buttonMap[predicate.button] !== null;
    case 'landing-above': {
      const upper = landingById(worldValue, predicate.upper);
      const lower = landingById(worldValue, predicate.lower);
      return Boolean(upper && lower && upper.shaftIndex > lower.shaftIndex);
    }
    case 'button-order':
      return Number(predicate.lower) < Number(predicate.upper);
  }
}

export function filterWorlds(worlds: World[], clues: Clue[]): World[] {
  return worlds.filter(candidate => clues.every(clue => isClueTrue(candidate, clue.predicate)));
}

export function routeKey(route: string[]): string {
  return route.join('>');
}

export function enumerateRoutes(buttons: PanelButton[], maxStops = 3): string[][] {
  const result: string[][] = [];
  const available = buttons.filter(button => button.enabled).map(button => button.id);
  const visit = (route: string[]) => {
    if (route.length > 0) result.push([...route]);
    if (route.length >= maxStops) return;
    for (const button of available) {
      if (!route.includes(button)) visit([...route, button]);
    }
  };
  visit([]);
  return result;
}

function passengerStopIndexes(evaluation: StopOutcome[], passengers: Passenger[]): Map<string, number> {
  const result = new Map<string, number>();
  for (let index = 0; index < evaluation.length; index++) {
    for (const passengerId of evaluation[index].deliveredPassengerIds) result.set(passengerId, index + 1);
  }
  for (const passenger of passengers) if (!result.has(passenger.id) && passenger.destination === null) result.set(passenger.id, 0);
  return result;
}

function findConstraintViolation(constraint: ServiceConstraint, indexes: Map<string, number>, passenger: Passenger): RouteViolation | undefined {
  const current = indexes.get(passenger.id) ?? 0;
  if (constraint.kind === 'before-passenger') {
    const other = indexes.get(constraint.otherPassengerId) ?? 0;
    if (current === 0 || other === 0 || current >= other) return { kind: 'ordering', passengerId: passenger.id, text: `${passenger.name} must leave before ${constraint.otherPassengerId.toUpperCase()}.` };
  }
  if (constraint.kind === 'by-stop' && (current === 0 || current > constraint.maxStopIndex)) return { kind: 'deadline', passengerId: passenger.id, text: `${passenger.name} had to leave by stop ${constraint.maxStopIndex}.` };
  if (constraint.kind === 'last-off') {
    const latest = Math.max(...indexes.values());
    if (current === 0 || current !== latest) return { kind: 'ordering', passengerId: passenger.id, text: `${passenger.name} must be the last passenger off.` };
  }
  if (constraint.kind === 'share-stop') {
    const other = indexes.get(constraint.otherPassengerId) ?? 0;
    if (current === 0 || current !== other) return { kind: 'ordering', passengerId: passenger.id, text: `${passenger.name} must leave with ${constraint.otherPassengerId.toUpperCase()}.` };
  }
  return undefined;
}

export function evaluateRoute(worldValue: World, passengers: Passenger[], route: string[], panelButtons?: PanelButton[]): RouteEvaluation {
  const violations: RouteViolation[] = [];
  const stops: StopOutcome[] = [];
  const seen = new Set<string>();
  const allowed = new Set((panelButtons ?? panelForWorld(worldValue)).map(button => button.id));
  if (route.length === 0) violations.push({ kind: 'empty-route', text: 'No route is programmed.' });
  if (route.length > 3) violations.push({ kind: 'ordering', text: 'The lift accepts no more than three stops.' });

  for (const button of route) {
    if (seen.has(button)) violations.push({ kind: 'ordering', button, text: `Button ${button} is repeated in the route.` });
    seen.add(button);
    if (!allowed.has(button) || worldValue.buttonMap[button] === undefined) {
      violations.push({ kind: 'unknown-button', button, text: `Button ${button} is not enabled on this panel.` });
      continue;
    }
    const landingId = worldValue.buttonMap[button];
    if (landingId === null) {
      violations.push({ kind: 'phantom-stop', button, text: `Button ${button} has no authentic landing.` });
      stops.push({ button, buttonLabel: button, landing: null, landingLabel: 'NO AUTHENTIC LANDING', deliveredPassengerIds: [], authentic: false });
      continue;
    }
    const landing = worldValue.landings[landingId];
    const delivered = passengers.filter(passenger => passenger.destination === landingId).map(passenger => passenger.id);
    stops.push({ button, buttonLabel: button, landing: landingId, landingLabel: landing?.department ?? landingId.toUpperCase(), deliveredPassengerIds: delivered, authentic: Boolean(landing?.authentic) });
  }

  const deliveredPassengerIds = [...new Set(stops.flatMap(stop => stop.deliveredPassengerIds))];
  const strandedPassengerIds = passengers.filter(passenger => passenger.destination !== null && !deliveredPassengerIds.includes(passenger.id)).map(passenger => passenger.id);
  for (const passengerId of strandedPassengerIds) {
    const passenger = passengers.find(item => item.id === passengerId);
    if (passenger) violations.push({ kind: 'missing-destination', passengerId, text: `${passenger.name} was never delivered to ${worldValue.landings[passenger.destination ?? '']?.department ?? 'their requested landing'}.` });
  }
  const indexes = passengerStopIndexes(stops, passengers);
  for (const passenger of passengers) for (const constraint of passenger.constraints) {
    const violation = findConstraintViolation(constraint, indexes, passenger);
    if (violation) violations.push(violation);
  }
  const decisive = violations.slice(0, 3).map(violation => ({ label: violation.kind.toUpperCase(), text: violation.text }));
  if (violations.length === 0) decisive.push({ label: 'SERVICE', text: 'Every requested landing and ordering condition is satisfied.' });
  const optimalStopCount = new Set(passengers.filter(passenger => passenger.destination !== null).map(passenger => passenger.destination)).size;
  return { correct: violations.length === 0, stops, deliveredPassengerIds, strandedPassengerIds, violations, decisiveEvidence: decisive, optimalStopCount };
}

export function routesForWorld(worldValue: World, passengers: Passenger[], panelButtons: PanelButton[]): string[][] {
  return enumerateRoutes(panelButtons).filter(route => evaluateRoute(worldValue, passengers, route, panelButtons).correct);
}

export function safeRoutesAcrossWorlds(worlds: World[], passengers: Passenger[], panelButtons: PanelButton[]): string[][] {
  if (worlds.length === 0) return [];
  const routeSets = worlds.map(worldValue => new Set(routesForWorld(worldValue, passengers, panelButtons).map(routeKey)));
  const first = [...routeSets[0]];
  return first.filter(key => routeSets.every(set => set.has(key))).map(key => key.split('>'));
}

export function predicateForButton(worldValue: World, button: string): CluePredicate {
  const landing = worldValue.buttonMap[button];
  return landing === null ? { kind: 'button-is-phantom', button } : { kind: 'button-opens', button, landing: landing ?? '' };
}
