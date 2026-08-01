import { describe, expect, it } from 'vitest';
import { contractForShift, landingsForWindow, landingMap } from './content';
import { enumerateCandidateWorlds, evaluateRoute, panelForWorld, safeRoutesAcrossWorlds } from './solver';
import type { Passenger } from './types';

describe('The 13th Lift solver', () => {
  it('represents a swapped pair separately from the panel labels', () => {
    const landings = landingsForWindow(0, 4);
    const worlds = enumerateCandidateWorlds(landings, contractForShift(1));
    const swapped = worlds.find(world => world.id === 'swap-6-7');
    expect(swapped?.buttonMap['6']).toBe('accounts');
    expect(swapped?.buttonMap['7']).toBe('mailroom');
  });

  it('rejects a phantom stop and accepts the evidence-backed route', () => {
    const landings = landingsForWindow(0, 4);
    const worlds = enumerateCandidateWorlds(landings, contractForShift(3));
    const world = worlds.find(candidate => candidate.id === 'phantom-13');
    expect(world).toBeDefined();
    const passengers: Passenger[] = [
      { id: 'a', name: 'Ada', archetype: 'COURIER', destination: 'records', constraints: [], clueIds: [] },
      { id: 'b', name: 'Vale', archetype: 'CLINICIAN', destination: 'clinic', constraints: [], clueIds: [] },
    ];
    const panel = panelForWorld(world!);
    expect(evaluateRoute(world!, passengers, ['13', '8', '9'], panel).correct).toBe(false);
    expect(evaluateRoute(world!, passengers, ['8', '9'], panel).correct).toBe(true);
  });

  it('finds routes that are safe across all surviving worlds', () => {
    const landings = landingsForWindow(0, 4);
    const worlds = enumerateCandidateWorlds(landings, contractForShift(1));
    const passengers: Passenger[] = [{ id: 'a', name: 'Ada', archetype: 'COURIER', destination: 'mailroom', constraints: [], clueIds: [] }];
    const routes = safeRoutesAcrossWorlds([worlds[0]], passengers, panelForWorld(worlds[0]));
    expect(routes.length).toBeGreaterThan(0);
    expect(landingMap(landings).mailroom.department).toBe('MAILROOM');
  });
});
