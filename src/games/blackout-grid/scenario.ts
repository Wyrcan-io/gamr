import { DISTRICT_CONTENT } from './content';
import { seededValue } from './seed';
import type { DistrictKind, GridEdge, GridNode, Point, StageDefinition, StormEvent } from './types';
import { GRID_HEIGHT, GRID_WIDTH } from './types';

const p = (x: number, y: number): Point => ({ x, y });

function district(id: string, kind: DistrictKind, x: number, y: number): GridNode {
  const content = DISTRICT_CONTENT[kind];
  return {
    id, label: content.label, kind: 'district', position: p(x, y), capacityMW: 0,
    flowMW: 0, heat: 0, sourceOnline: false,
    district: {
      kind, baseDemandMW: content.baseDemandMW, requestedMW: 0,
      serviceWeight: content.serviceWeight, strainPerDarkBeat: content.strainPerDarkBeat,
      serviceBreaker: 'open', powered: false, darkBeats: 8, pickupBeatsRemaining: 0,
      pickupPhase: 0, eventMultiplier: 1,
    },
  };
}

function source(id: string, label: string, x: number, y: number, capacityMW: number): GridNode {
  return { id, label, kind: 'bulk-source', position: p(x, y), capacityMW, flowMW: 0, heat: 0, sourceOnline: true };
}

function substation(id: string, label: string, x: number, y: number, capacityMW: number): GridNode {
  return { id, label, kind: 'substation', position: p(x, y), capacityMW, flowMW: 0, heat: 0, sourceOnline: false };
}

function microgrid(id: string, label: string, x: number, y: number, capacityMW: number): GridNode {
  return {
    id, label, kind: 'microgrid', position: p(x, y), capacityMW, flowMW: 0, heat: 0, sourceOnline: false,
    generator: { capacityMW, fuel: 32, online: false },
  };
}

function edge(id: string, label: string, from: string, to: string, route: Point[], capacityMW: number, condition: GridEdge['condition'] = 'intact', breaker: GridEdge['breaker'] = 'open', kind: GridEdge['kind'] = 'feeder'): GridEdge {
  return { id, label, from, to, route, kind, condition, breaker, tripCause: condition === 'faulted' ? 'fault' : null, capacityMW, flowMW: 0, heat: 0, energized: false, faultKind: condition === 'faulted' ? 'fallen-tree' : null, repairBeats: 0, protective: true };
}

function storm(id: string, stage: number, impactTick: number, kind: StormEvent['kind'], zoneId: string, targetId: string, magnitude: number): StormEvent {
  return { id, stage, impactTick, revealTick: Math.max(0, impactTick - 8), kind, zoneId, targetId, magnitude, resolved: false };
}

export interface ScenarioBlueprint {
  nodes: Record<string, GridNode>;
  edges: Record<string, GridEdge>;
  stages: StageDefinition[];
}

function buildStages(seed: number): StageDefinition[] {
  const stage2Target = seededValue(seed, 212) > 0.5 ? 'e-north-r' : 'e-north-w';
  return [
    {
      id: 'black-start', name: 'BLACK START', activeDistrictIds: ['hospital', 'water', 'residential'], requiredDistrictIds: ['hospital', 'water'], minimumServiceRatio: 0.55, holdBeats: 12, demandMultiplier: 1,
      events: [storm('s1-lightning', 0, 28, 'lightning-transient', 'north', 'e-north-r', 1)],
      briefing: ['NORTH FEEDER IS DARK AFTER THE STORM.', 'Restore the hospital and water plant, then hold stable service.', 'Residential pickup will overload the feeder if restored together.'],
    },
    {
      id: 'north-wind', name: 'NORTH WIND', activeDistrictIds: ['hospital', 'water', 'residential', 'communications'], requiredDistrictIds: ['hospital', 'water', 'communications'], minimumServiceRatio: 0.62, holdBeats: 16, demandMultiplier: 1.08,
      events: [storm('s2-tree', 1, 24, 'fallen-tree', 'north', stage2Target, 1), storm('s2-surge', 1, 42, 'demand-surge', 'north', 'communications', 1.35)],
      briefing: ['CIVIC COMMS joins the recovery target.', 'A tree strike is forecast on the north feeder.', 'Use the east tie only after opening the old path.'],
    },
    {
      id: 'river-rise', name: 'RIVER RISE', activeDistrictIds: ['hospital', 'water', 'residential', 'communications', 'transit', 'industry'], requiredDistrictIds: ['hospital', 'water', 'communications'], minimumServiceRatio: 0.68, holdBeats: 18, demandMultiplier: 1.15,
      events: [storm('s3-flood', 2, 22, 'flood-derate', 'river', 'sub-river', 0.75), storm('s3-wind', 2, 48, 'wind-damage', 'east', 'e-east-t', 1)],
      briefing: ['RIVER WATER is at risk of a substation derate.', 'Transit and industry are now requesting service.', 'A mobile generator can hold an isolated critical island.'],
    },
    {
      id: 'broken-ring', name: 'BROKEN RING', activeDistrictIds: ['hospital', 'water', 'residential', 'communications', 'transit', 'industry'], requiredDistrictIds: ['hospital', 'water', 'communications', 'transit'], minimumServiceRatio: 0.74, holdBeats: 20, demandMultiplier: 1.24,
      events: [storm('s4-surge', 3, 20, 'demand-surge', 'east', 'industry', 1.55), storm('s4-fault', 3, 44, 'wind-damage', 'east', 'e-east-i', 1)],
      briefing: ['THE CITY IS RUNNING AT PEAK RECOVERY LOAD.', 'A demand surge and a physical fault overlap.', 'Preserve critical service; industry can wait.'],
    },
    {
      id: 'final-squall', name: 'FINAL SQUALL', activeDistrictIds: ['hospital', 'water', 'residential', 'communications', 'transit', 'industry'], requiredDistrictIds: ['hospital', 'water', 'communications', 'transit'], minimumServiceRatio: 0.82, holdBeats: 24, demandMultiplier: 1.3,
      events: [storm('s5-tree', 4, 18, 'fallen-tree', 'north', 'e-north-w', 1), storm('s5-lightning', 4, 36, 'lightning-transient', 'east', 'e-east-c', 1), storm('s5-debris', 4, 54, 'debris-delay', 'south', 'e-south-t', 4)],
      briefing: ['FINAL SQUALL. KEEP THE CRITICAL RING LIT.', 'Two fault zones and one field delay are forecast.', 'Sustain the service ratio through the storm window.'],
    },
  ];
}

export function createBlueprint(seed: number): ScenarioBlueprint {
  const nodes: Record<string, GridNode> = {
    'source-a': source('source-a', 'NORTH GRID INTAKE', 1, 4, 42),
    'sub-north': substation('sub-north', 'NORTH SUBSTATION', 4, 4, 42),
    hospital: district('hospital', 'hospital', 7, 2),
    water: district('water', 'water', 7, 6),
    residential: district('residential', 'residential', 4, 2),
    communications: district('communications', 'communications', 10, 2),
    transit: district('transit', 'transit', 10, 6),
    industry: district('industry', 'industry', 4, 7),
    'source-b': source('source-b', 'EAST GRID INTAKE', 13, 4, 38),
    'sub-river': substation('sub-river', 'RIVER SUBSTATION', 10, 4, 32),
    battery: microgrid('battery', 'MOBILE RESERVE', 13, 7, 14),
  };

  const edges: Record<string, GridEdge> = {
    'e-main': edge('e-main', 'MAIN INTAKE', 'source-a', 'sub-north', [p(1, 4), p(2, 4), p(3, 4), p(4, 4)], 42, 'intact', 'closed'),
    'e-north-h': edge('e-north-h', 'NORTH HOSPITAL FEEDER', 'sub-north', 'hospital', [p(4, 4), p(4, 3), p(5, 3), p(6, 3), p(7, 2)], 18, 'faulted', 'tripped'),
    'e-north-r': edge('e-north-r', 'NORTH HOMES FEEDER', 'sub-north', 'residential', [p(4, 4), p(4, 3), p(4, 2)], 20, 'intact', 'open'),
    'e-north-w': edge('e-north-w', 'WATER FEEDER', 'sub-north', 'water', [p(4, 4), p(5, 4), p(6, 4), p(7, 5), p(7, 6)], 20, 'intact', 'open'),
    'e-north-c': edge('e-north-c', 'COMMS FEEDER', 'sub-north', 'communications', [p(4, 4), p(5, 4), p(6, 4), p(7, 3), p(8, 3), p(9, 2), p(10, 2)], 18, 'intact', 'open'),
    'e-north-i': edge('e-north-i', 'WORKS FEEDER', 'sub-north', 'industry', [p(4, 4), p(4, 5), p(4, 6), p(4, 7)], 24, 'intact', 'open'),
    'e-river': edge('e-river', 'RIVER TIE', 'sub-north', 'sub-river', [p(4, 4), p(5, 4), p(6, 4), p(7, 4), p(8, 4), p(10, 4)], 26, 'intact', 'open', 'tie'),
    'e-grid-b': edge('e-grid-b', 'EAST INTAKE', 'source-b', 'sub-river', [p(13, 4), p(12, 4), p(11, 4), p(10, 4)], 38, 'intact', 'open'),
    'e-east-c': edge('e-east-c', 'EAST COMMS FEEDER', 'sub-river', 'communications', [p(10, 4), p(10, 3), p(10, 2)], 18, 'intact', 'open'),
    'e-east-t': edge('e-east-t', 'EAST TRANSIT FEEDER', 'sub-river', 'transit', [p(10, 4), p(10, 5), p(10, 6)], 20, 'intact', 'open'),
    'e-east-i': edge('e-east-i', 'EAST WORKS FEEDER', 'sub-river', 'industry', [p(10, 4), p(9, 5), p(8, 6), p(7, 7), p(4, 7)], 24, 'intact', 'open', 'underground'),
    'e-south-t': edge('e-south-t', 'RESERVE TRANSIT TIE', 'battery', 'transit', [p(13, 7), p(12, 7), p(11, 7), p(10, 6)], 14, 'unbuilt', 'open', 'tie'),
    'e-emergency': edge('e-emergency', 'EMERGENCY NORTH–EAST TIE', 'sub-north', 'source-b', [p(4, 4), p(5, 4), p(6, 4), p(7, 4), p(8, 4), p(9, 4), p(10, 4), p(11, 4), p(12, 4), p(13, 4)], 22, 'unbuilt', 'open', 'tie'),
  };

  return { nodes, edges, stages: buildStages(seed) };
}

export function validateBlueprint(blueprint: ScenarioBlueprint): string[] {
  const errors: string[] = [];
  for (const node of Object.values(blueprint.nodes)) {
    if (node.position.x < 0 || node.position.x >= GRID_WIDTH || node.position.y < 0 || node.position.y >= GRID_HEIGHT) errors.push(`node ${node.id} out of bounds`);
  }
  for (const item of Object.values(blueprint.edges)) {
    if (!blueprint.nodes[item.from] || !blueprint.nodes[item.to]) errors.push(`edge ${item.id} has missing endpoint`);
    for (const point of item.route) if (point.x < 0 || point.x >= GRID_WIDTH || point.y < 0 || point.y >= GRID_HEIGHT) errors.push(`edge ${item.id} route out of bounds`);
  }
  return errors;
}
