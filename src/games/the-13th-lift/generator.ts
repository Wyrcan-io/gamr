import { contractForShift, landingMap, landingsForWindow, passengerArchetype, renderCluePredicate } from './content';
import { createRng, mixSeed } from './seed';
import { enumerateCandidateWorlds, filterWorlds, panelForWorld, predicateForButton, safeRoutesAcrossWorlds } from './solver';
import type { Clue, GameMode, Landing, Passenger, RidePuzzle, ServiceConstraint, World } from './types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function chooseLandings(landings: Landing[], count: number, rng: ReturnType<typeof createRng>): string[] {
  const shuffled = rng.shuffle(landings);
  return shuffled.slice(0, count).map(landing => landing.id);
}

function buildPassengers(landings: Landing[], count: number, shift: number, rideIndex: number, rng: ReturnType<typeof createRng>): Passenger[] {
  const destinations = chooseLandings(landings, count, rng);
  const passengers: Passenger[] = [];
  for (let i = 0; i < count; i++) {
    const archetype = passengerArchetype(shift * 3 + rideIndex + i + rng.int(4));
    const constraints: ServiceConstraint[] = [];
    if (i === 0 && shift >= 1) constraints.push({ kind: 'by-stop', maxStopIndex: 1 });
    if (i === 0 && count > 1 && shift >= 1) constraints.push({ kind: 'before-passenger', otherPassengerId: `passenger-${i + 1}` });
    if (i === count - 1 && count === 3 && shift >= 2) constraints.push({ kind: 'last-off' });
    passengers.push({ id: `passenger-${i}`, name: archetype.name, archetype: archetype.archetype, destination: destinations[i], constraints, clueIds: [], recurringId: archetype.recurringId });
  }
  return passengers;
}

function allTruePredicates(world: World, panelLabels: string[]): ReturnType<typeof predicateForButton>[] {
  return panelLabels.map(label => predicateForButton(world, label));
}

function clueFor(predicate: ReturnType<typeof predicateForButton>, index: number, passengers: Passenger[], landings: Record<string, Landing>): Clue {
  const speaker = passengers[index % passengers.length];
  return { id: `clue-${index}`, speakerId: speaker.id, predicate, renderedText: renderCluePredicate(predicate, landings, 'current'), sourceTime: 'current' };
}

function shortestRouteLength(routes: string[][]): number {
  return routes.length === 0 ? 0 : Math.min(...routes.map(route => route.length));
}

export function createRide(seed: number, shift: number, rideIndex: number, mode: GameMode = 'story'): RidePuzzle {
  const rideSeed = mixSeed(seed, shift + 1, rideIndex + 17, mode === 'after-hours' ? 0xa77e : 0x71f7);
  const rng = createRng(rideSeed);
  const contract = contractForShift(shift);
  const start = Math.min(3, Math.max(0, (shift * 2 + rideIndex) % 4));
  const landings = landingsForWindow(start, 5);
  const worlds = enumerateCandidateWorlds(landings, contract);
  const trueWorld = clone(rng.pick(worlds));
  const panel = panelForWorld(trueWorld);
  const passengers = buildPassengers(landings, contract.passengerCount, shift, rideIndex, rng);
  const map = landingMap(landings);
  const predicates = rng.shuffle(allTruePredicates(trueWorld, panel.map(button => button.id)));
  const clues: Clue[] = [];
  let survivors = worlds;
  let safeRoutes = safeRoutesAcrossWorlds(survivors, passengers, panel);
  const minimumClues = contract.shift === 0 ? 2 : 2 + Math.min(2, contract.shift);
  let cursor = 0;
  while ((safeRoutes.length === 0 || clues.length < minimumClues) && cursor < predicates.length) {
    const next = clueFor(predicates[cursor], clues.length, passengers, map);
    clues.push(next);
    for (const passenger of passengers) if (passenger.id === next.speakerId) passenger.clueIds.push(next.id);
    survivors = filterWorlds(worlds, clues);
    safeRoutes = safeRoutesAcrossWorlds(survivors, passengers, panel);
    cursor++;
  }

  if (safeRoutes.length === 0 || survivors.length === 0) {
    const requiredPredicates = passengers.map(passenger => predicateForButton(trueWorld, Object.keys(trueWorld.buttonMap).find(button => trueWorld.buttonMap[button] === passenger.destination) ?? '13'));
    for (const predicate of requiredPredicates) {
      if (!clues.some(clue => JSON.stringify(clue.predicate) === JSON.stringify(predicate))) clues.push(clueFor(predicate, clues.length, passengers, map));
    }
    survivors = filterWorlds(worlds, clues);
    safeRoutes = safeRoutesAcrossWorlds(survivors, passengers, panel);
  }
  if (safeRoutes.length === 0) {
    survivors = [trueWorld];
    safeRoutes = safeRoutesAcrossWorlds(survivors, passengers, panel);
  }

  return {
    id: `lift-${shift + 1}-${rideIndex + 1}-${rideSeed.toString(16)}`,
    seed: rideSeed,
    shift,
    rideIndex,
    contract,
    panel,
    visibleLandings: landings,
    passengers,
    clues,
    trueWorld,
    candidateWorlds: survivors,
    safeRoutes,
    shortestSafeRouteLength: shortestRouteLength(safeRoutes),
  };
}

export function createTutorialRide(seed: number): RidePuzzle {
  return createRide(seed, 0, 0, 'tutorial');
}

export function validateRide(puzzle: RidePuzzle): string[] {
  const errors: string[] = [];
  if (puzzle.panel.length < 2 || puzzle.panel.length > 9) errors.push('panel size outside supported range');
  if (puzzle.passengers.length !== puzzle.contract.passengerCount) errors.push('passenger count does not match contract');
  if (puzzle.clues.length < 2) errors.push('ride needs at least two clues');
  if (puzzle.candidateWorlds.length === 0) errors.push('clue set eliminates every candidate world');
  if (puzzle.safeRoutes.length === 0) errors.push('ride has no universally safe route');
  for (const route of puzzle.safeRoutes) if (route.length !== puzzle.shortestSafeRouteLength && route.length < puzzle.shortestSafeRouteLength) errors.push('shortest route length is inconsistent');
  if (!puzzle.candidateWorlds.some(world => world.id === puzzle.trueWorld.id)) errors.push('true world is not in the surviving candidate set');
  return errors;
}

export function generateValidatedRide(seed: number, shift: number, rideIndex: number, mode: GameMode = 'story'): RidePuzzle {
  for (let attempt = 0; attempt < 40; attempt++) {
    const puzzle = createRide(mixSeed(seed, attempt), shift, rideIndex, mode);
    if (validateRide(puzzle).length === 0) return puzzle;
  }
  return createRide(seed, shift, rideIndex, mode);
}
