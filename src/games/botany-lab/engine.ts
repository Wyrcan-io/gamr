import {
  CHAMBER_NEIGHBOURS,
  CHAMBER_ORDER,
  CONTRACT_BY_ID,
  CONTRACT_TEMPLATES,
  EXPRESSION_BY_ID,
  EXPRESSIONS,
  LAMP_COST,
  LAMP_MODES,
  MUTATIONS,
  MUTATION_BY_ID,
  SPECIES,
  SPECIES_BY_ID,
  SPECIMEN_NAMES,
  WATER_COST,
  WATER_MODES,
} from './content';
import type {
  ChamberId,
  ChamberState,
  Command,
  CommandResult,
  ContractRequirement,
  ContractState,
  CycleProjection,
  EngineEvent,
  ExpressionId,
  GameState,
  LogEntry,
  MutationId,
  PendingOperation,
  PlantState,
  SpeciesId,
} from './types';

const clone = <T>(value: T): T => structuredClone(value);
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const safeSeed = (seed: number): number => (seed >>> 0) || 0x1a2b3c4d;

function rng(seed: number): () => number {
  let value = safeSeed(seed);
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash >>> 0;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

function species(speciesId: SpeciesId) {
  return SPECIES_BY_ID[speciesId];
}

function hasMutation(plant: PlantState, mutationId: MutationId): boolean {
  return plant.mutationIds.includes(mutationId);
}

export function expressionsForPlant(plant: PlantState): ExpressionId[] {
  return EXPRESSIONS.filter(item => item.requires.every(mutation => hasMutation(plant, mutation))).map(item => item.id);
}

function hasExpression(plant: PlantState, expressionId: ExpressionId): boolean {
  return expressionsForPlant(plant).includes(expressionId);
}

function isSterile(plant: PlantState): boolean {
  return hasMutation(plant, 'sterile-crown') || hasExpression(plant, 'sealed-bouquet');
}

function makePlant(speciesId: SpeciesId, id: string, seed: number, index: number): PlantState {
  const random = rng(seed ^ hashText(id));
  const offers = shuffled(MUTATIONS.map(item => item.id).filter(item => item !== 'sterile-crown' || speciesId !== 'cinder'), random);
  return {
    id,
    name: SPECIMEN_NAMES[index % SPECIMEN_NAMES.length]!,
    speciesId,
    age: 0,
    mass: 1,
    bloom: 0,
    glow: 0,
    stress: 0,
    mutationIds: [],
    mutationOffers: offers,
    discoveredExpressionIds: [],
    visualSeed: (seed ^ hashText(id)) >>> 0,
  };
}

function makeChamber(id: ChamberId, plant: PlantState | null = null): ChamberState {
  return { id, plant, lamp: 'blue', water: 'mist', rootPressure: 0, lastRootDelta: 0 };
}

function makeContract(templateId: string, cycle: number): ContractState {
  const template = CONTRACT_BY_ID[templateId] ?? CONTRACT_TEMPLATES[0]!;
  return {
    id: `${template.id}-${cycle}-${template.tier}`,
    templateId: template.id,
    name: template.name,
    requirements: clone(template.requirements),
    baseFunding: template.baseFunding,
    priorityCycle: cycle + template.priorityOffset,
    description: template.description,
  };
}

function fillContracts(state: GameState): void {
  for (let index = 0; index < state.activeContracts.length; index += 1) {
    if (state.activeContracts[index]) continue;
    const next = state.contractQueue.shift();
    if (next) state.activeContracts[index] = next;
  }
}

function initialVials(seed: number, starterSpecies: SpeciesId): { rack: GameState['vialRack']; queue: GameState['vialQueue'] } {
  const random = rng(seed ^ 0x91e10da5);
  const speciesIds = shuffled(SPECIES.map(item => item.id).filter(item => item !== starterSpecies), random);
  while (speciesIds.length < 5) speciesIds.push(SPECIES[Math.floor(random() * SPECIES.length)]!.id);
  const vials = speciesIds.slice(0, 5).map((speciesId, index) => ({ id: `vial-${index + 1}`, speciesId }));
  return { rack: [vials[0] ?? null, vials[1] ?? null, vials[2] ?? null], queue: vials.slice(3) };
}

function initialContracts(seed: number, mode: GameState['mode'], cycle: number): { active: Array<ContractState | null>; queue: ContractState[] } {
  const random = rng(seed ^ 0x4c3a2b1d);
  const opening = shuffled(['verdant', 'lantern', 'ceremonial'], random);
  const advancedPool = mode === 'training'
    ? ['sterile', 'safe-giant', 'dual-use']
    : ['sterile', 'safe-giant', 'prism-culture', 'rooted-survivor', 'deep-space', 'biosecure-floral', 'living-trellis', 'heliostat', 'impossible-colors'];
  const queueIds: string[] = [];
  let expressionContractChosen = false;
  for (const id of shuffled(advancedPool, random)) {
    const template = CONTRACT_BY_ID[id];
    const isExpressionContract = Boolean(template?.requirements.some(requirement => requirement.kind === 'expression'));
    if (isExpressionContract && expressionContractChosen) continue;
    queueIds.push(id);
    if (isExpressionContract) expressionContractChosen = true;
    if (queueIds.length >= 3) break;
  }
  return {
    active: opening.map(id => makeContract(id, cycle)),
    queue: queueIds.map(id => makeContract(id, cycle)),
  };
}

function makeState(seed: number, mode: GameState['mode']): GameState {
  const safe = safeSeed(seed);
  const random = rng(safe ^ 0x7f4a7c15);
  const starterSpecies: SpeciesId = mode === 'training' ? 'heliox' : SPECIES[Math.floor(random() * SPECIES.length)]!.id;
  const vials = initialVials(safe, starterSpecies);
  const contracts = initialContracts(safe, mode, 1);
  const chambers: Record<ChamberId, ChamberState> = {
    a1: makeChamber('a1', makePlant('heliox', 'plant-a1', safe, 0)),
    a2: makeChamber('a2'),
    b1: makeChamber('b1'),
    b2: makeChamber('b2', mode === 'training' ? null : makePlant(starterSpecies, 'plant-b2', safe ^ 0x31337, 1)),
  };
  const state: GameState = {
    version: 1,
    seed: safe,
    mode,
    phase: 'start',
    outcome: 'none',
    cycle: 1,
    maxCycles: mode === 'training' ? 6 : 12,
    chambers,
    facility: {
      lightBudget: mode === 'training' ? 3 : 5,
      waterBudget: mode === 'training' ? 3 : 5,
      filterLoad: 0,
      filterCapacity: 9,
      biosecuritySeals: 3,
      mutationReagent: mode === 'training' ? 2 : 4,
      funding: 0,
      fundingTarget: mode === 'training' ? 4 : 12,
    },
    activeContracts: contracts.active,
    contractQueue: contracts.queue,
    completedContracts: [],
    vialRack: mode === 'training' ? [{ id: 'training-vial', speciesId: 'cinder' }, null, null] : vials.rack,
    vialQueue: mode === 'training' ? [] : vials.queue,
    selectedChamberId: 'a1',
    pendingOperation: null,
    discoveries: [],
    incidents: [],
    eventLog: [],
    lastEvents: [],
    tutorialStep: mode === 'training' ? 0 : null,
    helpOpen: false,
    score: 0,
  };
  for (const chamberId of CHAMBER_ORDER) prioritizeOffers(state, state.chambers[chamberId].plant);
  return state;
}

export function createState(seed = Date.now(), mode: GameState['mode'] = 'standard'): GameState {
  return makeState(seed, mode);
}

function addEvent(state: GameState, events: EngineEvent[], kind: EngineEvent['kind'], text: string, chamberId?: ChamberId, value?: number): void {
  const event = { kind, text, chamberId, value };
  events.push(event);
  const tone: LogEntry['tone'] = kind === 'breach' ? 'bad' : kind === 'warning' || kind === 'filter' ? 'warn' : kind === 'growth' || kind === 'mutation' || kind === 'expression' || kind === 'delivery' || kind === 'complete' ? 'good' : 'normal';
  state.eventLog = [{ cycle: state.cycle, text, tone }, ...state.eventLog].slice(0, 6);
}

function requiredMutationIds(state: GameState): MutationId[] {
  const required: MutationId[] = [];
  const allContracts = [...state.activeContracts.filter((item): item is ContractState => Boolean(item)), ...state.contractQueue];
  for (const contract of allContracts) {
    for (const requirement of contract.requirements) {
      if (requirement.kind === 'mutation' && !required.includes(requirement.mutationId)) required.push(requirement.mutationId);
      if (requirement.kind === 'expression') {
        for (const mutationId of EXPRESSION_BY_ID[requirement.expressionId].requires) if (!required.includes(mutationId)) required.push(mutationId);
      }
    }
  }
  return required;
}

function prioritizeOffers(state: GameState, plant: PlantState | null): void {
  if (!plant) return;
  const required = requiredMutationIds(state).filter(id => !plant.mutationIds.includes(id));
  const front = required.filter(id => plant.mutationOffers.includes(id));
  const rest = plant.mutationOffers.filter(id => !front.includes(id));
  plant.mutationOffers = [...front, ...rest];
}

function budgetUsage(state: GameState): { light: number; water: number } {
  return CHAMBER_ORDER.reduce((result, id) => {
    result.light += LAMP_COST[state.chambers[id].lamp];
    result.water += WATER_COST[state.chambers[id].water];
    return result;
  }, { light: 0, water: 0 });
}

export function contractMatches(contract: ContractState, plant: PlantState, rootPressure: number): boolean {
  return contract.requirements.every(requirement => {
    switch (requirement.kind) {
      case 'statMin': return plant[requirement.stat] >= requirement.value;
      case 'statMax': return (requirement.stat === 'rootPressure' ? rootPressure : plant.stress) <= requirement.value;
      case 'species': return plant.speciesId === requirement.speciesId;
      case 'mutation': return hasMutation(plant, requirement.mutationId);
      case 'expression': return hasExpression(plant, requirement.expressionId);
      case 'sterile': return isSterile(plant);
      case 'mutationCount': return plant.mutationIds.length === requirement.value;
    }
  });
}

export function matchingContracts(state: GameState, chamberId: ChamberId): ContractState[] {
  const chamber = state.chambers[chamberId];
  if (!chamber.plant) return [];
  return state.activeContracts.filter((contract): contract is ContractState => Boolean(contract && contractMatches(contract, chamber.plant!, chamber.rootPressure)));
}

function operationReason(state: GameState, operation: Exclude<PendingOperation, null>): string | undefined {
  if (operation.type === 'serviceFilter') return undefined;
  const chamber = state.chambers[operation.chamberId];
  if (!chamber) return 'UNKNOWN CHAMBER';
  if (operation.type === 'seed') {
    if (chamber.plant) return 'CHAMBER ALREADY OCCUPIED';
    if (!state.vialRack.some(vial => vial?.id === operation.vialId)) return 'VIAL IS NOT IN THE RACK';
  }
  if (operation.type === 'splice') {
    if (!chamber.plant) return 'SELECT A PLANT';
    if (state.facility.mutationReagent <= 0) return 'NO MUTATION REAGENT';
    if (chamber.plant.mutationIds.length >= 2) return 'MUTATION SLOTS FULL';
    if (!chamber.plant.mutationOffers.slice(0, 2).includes(operation.mutationId)) return 'MUTATION IS NOT OFFERED';
  }
  if (operation.type === 'prune' || operation.type === 'cull') {
    if (!chamber.plant) return 'SELECT A PLANT';
  }
  if (operation.type === 'deliver') {
    if (!chamber.plant) return 'SELECT A PLANT';
    const contract = state.activeContracts.find(item => item?.id === operation.contractId);
    if (!contract) return 'CONTRACT IS NOT ACTIVE';
    if (!contractMatches(contract, chamber.plant, chamber.rootPressure)) return 'SPECIMEN DOES NOT MATCH';
  }
  return undefined;
}

function removeVial(state: GameState, vialId: string): { speciesId: SpeciesId } | undefined {
  const index = state.vialRack.findIndex(vial => vial?.id === vialId);
  if (index < 0) return undefined;
  const vial = state.vialRack[index];
  state.vialRack[index] = state.vialQueue.shift() ?? null;
  return vial ? { speciesId: vial.speciesId } : undefined;
}

function applyOperation(state: GameState, operation: Exclude<PendingOperation, null>, events: EngineEvent[]): void {
  if (operation.type === 'serviceFilter') {
    const old = state.facility.filterLoad;
    state.facility.filterLoad = Math.max(0, old - 6);
    addEvent(state, events, 'filter', `FILTER SERVICED — LOAD ${old} → ${state.facility.filterLoad}`);
    return;
  }
  const chamber = state.chambers[operation.chamberId];
  if (!chamber) return;
  if (operation.type === 'seed') {
    const vial = removeVial(state, operation.vialId);
    if (!vial) return;
    chamber.plant = makePlant(vial.speciesId, `plant-${operation.chamberId}-${state.cycle}`, state.seed ^ hashText(operation.vialId), state.cycle);
    prioritizeOffers(state, chamber.plant);
    chamber.rootPressure = 0;
    addEvent(state, events, 'info', `${species(vial.speciesId).name.toUpperCase()} SEEDED IN ${operation.chamberId.toUpperCase()}`, operation.chamberId);
  } else if (operation.type === 'splice') {
    if (!chamber.plant) return;
    chamber.plant.mutationIds.push(operation.mutationId);
    chamber.plant.mutationOffers = chamber.plant.mutationOffers.filter(id => id !== operation.mutationId);
    prioritizeOffers(state, chamber.plant);
    state.facility.mutationReagent -= 1;
    addEvent(state, events, 'mutation', `${MUTATION_BY_ID[operation.mutationId].name.toUpperCase()} INSTALLED`, operation.chamberId);
  } else if (operation.type === 'prune') {
    if (!chamber.plant) return;
    chamber.plant.mass = Math.max(1, chamber.plant.mass - 2);
    chamber.plant.bloom = Math.max(0, chamber.plant.bloom - 1);
    chamber.rootPressure = Math.max(0, chamber.rootPressure - 3);
    addEvent(state, events, 'info', `PRUNED ${chamber.plant.name} — ROOT PRESSURE -3`, operation.chamberId);
  } else if (operation.type === 'cull') {
    addEvent(state, events, 'warning', `${chamber.plant?.name ?? 'SPECIMEN'} CULLED — CHAMBER SAFE`, operation.chamberId);
    chamber.plant = null;
    chamber.rootPressure = 0;
  } else if (operation.type === 'deliver') {
    const contractIndex = state.activeContracts.findIndex(item => item?.id === operation.contractId);
    const contract = contractIndex >= 0 ? state.activeContracts[contractIndex] : null;
    if (!contract || !chamber.plant) return;
    const early = state.cycle <= contract.priorityCycle;
    const funding = contract.baseFunding + (early ? 1 : 0);
    state.facility.funding += funding;
    state.completedContracts.push({ contractId: contract.id, name: contract.name, funding, early, cycle: state.cycle });
    state.activeContracts[contractIndex] = null;
    addEvent(state, events, 'delivery', `DELIVERED ${chamber.plant.name} — ${contract.name.toUpperCase()} +${funding} FUNDING`, operation.chamberId, funding);
    chamber.plant = null;
    chamber.rootPressure = 0;
  }
}

interface PlantDelta {
  massGain: number;
  bloomGain: number;
  glowGain: number;
  stressDelta: number;
  rootDelta: number;
  sporeOutput: number;
  lightFit: number;
  waterFit: number;
}

function calculateDelta(state: GameState, chamberId: ChamberId, lightBoost: number, waterBoost: number, reflectedGlow: number): PlantDelta | undefined {
  const chamber = state.chambers[chamberId];
  const plant = chamber.plant;
  if (!plant) return undefined;
  const definition = species(plant.speciesId);
  const solar = hasMutation(plant, 'solar-sails');
  const reservoir = hasMutation(plant, 'reservoir-bladders');
  const ember = hasMutation(plant, 'ember-corolla');
  const lumen = hasMutation(plant, 'lumen-veins');
  const anchor = hasMutation(plant, 'anchor-roots');
  const mirror = hasMutation(plant, 'mirror-skin');
  const night = hasMutation(plant, 'night-clock');
  const runner = hasMutation(plant, 'runner-nodes');
  const sealed = hasExpression(plant, 'sealed-bouquet');
  const starwell = hasExpression(plant, 'starwell');
  const moonLantern = hasExpression(plant, 'moon-lantern');
  const solarCorolla = hasExpression(plant, 'solar-corolla');

  let lightFit = definition.lightFit[chamber.lamp];
  let waterFit = definition.waterFit[chamber.water];
  if (reservoir) {
    if (chamber.water === 'dry') waterFit = Math.max(waterFit, 1);
    if (chamber.water === 'soak') waterFit += 1;
  }
  if (night) {
    if (chamber.lamp === 'off') lightFit = Math.max(lightFit, 1);
    if (chamber.lamp === 'red') lightFit -= 1;
  }
  if (mirror && chamber.lamp === 'uv') lightFit += 1;
  lightFit = clamp(lightFit + lightBoost, 0, 3);
  waterFit = clamp(waterFit + waterBoost, 0, 3);

  const baseGrowth = Math.min(lightFit, waterFit);
  const stressPenalty = plant.stress >= 4 ? 1 : 0;
  const growth = plant.stress >= 6 ? 0 : clamp(baseGrowth - stressPenalty, 0, 3);
  let massGain = growth;
  if (solar && chamber.lamp === 'blue' && growth > 0) massGain += 1;
  if (runner && chamber.water === 'soak' && growth > 0) massGain += 1;
  if (solarCorolla && chamber.lamp === 'red' && growth > 0) massGain += 1;
  massGain = clamp(massGain, 0, 4);

  let bloomGain = chamber.lamp === 'red' && waterFit >= 1 && plant.mass + massGain >= 2 ? 1 : 0;
  if (ember && bloomGain > 0) bloomGain += 1;
  if (hasMutation(plant, 'sterile-crown') && !sealed) bloomGain -= 1;
  bloomGain = clamp(bloomGain, 0, 3);

  let glowGain = chamber.lamp === 'uv' && waterFit >= 1 ? 1 : 0;
  if (lumen && glowGain > 0) glowGain += 1;
  if (starwell && chamber.lamp === 'uv' && chamber.water === 'soak') glowGain += 2;
  if (night && chamber.lamp === 'off' && waterFit >= 1) glowGain += 1;
  if (moonLantern && chamber.lamp === 'off' && waterFit >= 1) glowGain += 2;
  glowGain = clamp(glowGain + reflectedGlow, 0, 4);

  let stressDelta = 0;
  if (lightFit === 0) stressDelta += 1;
  if (waterFit === 0) stressDelta += 1;
  if (lightFit >= 1 && waterFit >= 1) stressDelta -= 1;
  if (chamber.lamp === 'uv' && !lumen) stressDelta += 1;
  if (anchor && lightFit >= 1 && waterFit >= 1) stressDelta -= 1;
  if (moonLantern && chamber.lamp === 'off' && waterFit >= 1) stressDelta -= 1;

  let rootDelta = 0;
  if (growth > 0) {
    rootDelta += definition.baseRooting;
    rootDelta += Math.floor(Math.max(0, massGain - 1) / 2);
    if (anchor) rootDelta += 1;
    if (reservoir && chamber.water === 'soak') rootDelta += 1;
    if (runner && chamber.water === 'soak') rootDelta += 2;
    if (starwell) rootDelta += 1;
  }

  let sporeOutput = plant.bloom + bloomGain > 0 ? definition.baseSpores + bloomGain : 0;
  if (ember) sporeOutput += 1;
  if (isSterile(plant)) sporeOutput = 0;
  return { massGain, bloomGain, glowGain, stressDelta, rootDelta, sporeOutput: clamp(sporeOutput, 0, 5), lightFit, waterFit };
}

function applyGrowth(state: GameState, events: EngineEvent[]): Map<ChamberId, PlantDelta> {
  const deltas = new Map<ChamberId, PlantDelta>();
  const lightBoost: Partial<Record<ChamberId, number>> = {};
  const waterBoost: Partial<Record<ChamberId, number>> = {};
  const reflectedGlow: Partial<Record<ChamberId, number>> = {};

  for (const sourceId of CHAMBER_ORDER) {
    const source = state.chambers[sourceId];
    const plant = source.plant;
    if (!plant) continue;
    const neighbours = CHAMBER_NEIGHBOURS[sourceId] as ChamberId[];
    if (hasMutation(plant, 'mycelial-bridge') && source.water !== 'dry') {
      const sourceFit = species(plant.speciesId).waterFit[source.water];
      if (sourceFit >= 2) {
        const amount = hasExpression(plant, 'shared-cistern') ? 2 : 1;
        for (const targetId of neighbours) {
          const target = state.chambers[targetId];
          if (target.plant && species(target.plant.speciesId).waterFit[target.water] === 0) waterBoost[targetId] = (waterBoost[targetId] ?? 0) + amount;
        }
      }
    }
    const canReflect = hasMutation(plant, 'mirror-skin') && (source.lamp === 'uv' || (source.lamp === 'blue' && hasExpression(plant, 'heliostat-canopy')));
    if (canReflect) {
      for (const targetId of neighbours) {
        const target = state.chambers[targetId];
        if (target.plant && target.lamp === 'off') {
          lightBoost[targetId] = (lightBoost[targetId] ?? 0) + 1;
          if (hasExpression(plant, 'prism-relay')) reflectedGlow[targetId] = (reflectedGlow[targetId] ?? 0) + 1;
        }
      }
    }
  }

  for (const chamberId of CHAMBER_ORDER) {
    const delta = calculateDelta(state, chamberId, lightBoost[chamberId] ?? 0, waterBoost[chamberId] ?? 0, reflectedGlow[chamberId] ?? 0);
    if (!delta) continue;
    deltas.set(chamberId, delta);
  }

  for (const chamberId of CHAMBER_ORDER) {
    const chamber = state.chambers[chamberId];
    const plant = chamber.plant;
    const delta = deltas.get(chamberId);
    if (!plant || !delta) continue;
    const adjacentBloom = (CHAMBER_NEIGHBOURS[chamberId] as ChamberId[]).some(id => Boolean(state.chambers[id].plant && state.chambers[id].plant!.bloom > 0));
    if (adjacentBloom && plant.bloom + delta.bloomGain > 0 && !isSterile(plant)) delta.sporeOutput = clamp(delta.sporeOutput + 1, 0, 5);
    plant.mass = clamp(plant.mass + delta.massGain, 0, 12);
    plant.bloom = clamp(plant.bloom + delta.bloomGain, 0, 8);
    plant.glow = clamp(plant.glow + delta.glowGain, 0, 8);
    plant.stress = clamp(plant.stress + delta.stressDelta, 0, 6);
    plant.age += 1;
    chamber.rootPressure = clamp(chamber.rootPressure + delta.rootDelta, 0, 12);
    chamber.lastRootDelta = delta.rootDelta;
    addEvent(state, events, 'growth', `${chamberId.toUpperCase()} ${plant.name}: M +${delta.massGain} B +${delta.bloomGain} G +${delta.glowGain} S ${delta.stressDelta >= 0 ? '+' : ''}${delta.stressDelta}`, chamberId);
    const expressions = expressionsForPlant(plant);
    for (const expressionId of expressions) {
      if (!plant.discoveredExpressionIds.includes(expressionId)) {
        plant.discoveredExpressionIds.push(expressionId);
        if (!state.discoveries.includes(expressionId)) state.discoveries.push(expressionId);
        addEvent(state, events, 'expression', `${EXPRESSION_BY_ID[expressionId].name.toUpperCase()} EXPRESSED IN ${chamberId.toUpperCase()}`, chamberId);
      }
    }
  }
  return deltas;
}

function resolveContainment(state: GameState, deltas: Map<ChamberId, PlantDelta>, events: EngineEvent[]): void {
  const rootBreaches = CHAMBER_ORDER
    .filter(id => state.chambers[id].plant && state.chambers[id].rootPressure >= (hasExpression(state.chambers[id].plant!, 'living-trellis') ? 10 : 8))
    .sort((left, right) => state.chambers[right].rootPressure - state.chambers[left].rootPressure || left.localeCompare(right));
  for (const chamberId of rootBreaches) {
    if (!state.chambers[chamberId].plant || state.facility.biosecuritySeals <= 0) break;
    const chamber = state.chambers[chamberId];
    const plant = chamber.plant!;
    state.facility.biosecuritySeals -= 1;
    const threshold = hasExpression(plant, 'living-trellis') ? 10 : 8;
    const text = `${chamberId.toUpperCase()} BREACH — ${plant.name} ROOTS ${chamber.rootPressure}/${threshold}; SPECIMEN CULLED`;
    state.incidents.push({ cycle: state.cycle, kind: 'root', chamberId, text });
    addEvent(state, events, 'breach', text, chamberId);
    chamber.plant = null;
    chamber.rootPressure = 0;
  }

  const totalSpores = [...deltas.values()].reduce((total, delta) => total + delta.sporeOutput, 0);
  state.facility.filterLoad += totalSpores;
  if (totalSpores > 0) addEvent(state, events, 'filter', `FILTER +${totalSpores} SPORES → ${state.facility.filterLoad}/${state.facility.filterCapacity}`);
  if (state.facility.filterLoad > state.facility.filterCapacity && state.facility.biosecuritySeals > 0) {
    state.facility.biosecuritySeals -= 1;
    const emitter = CHAMBER_ORDER
      .filter(id => state.chambers[id].plant)
      .sort((left, right) => (deltas.get(right)?.sporeOutput ?? 0) - (deltas.get(left)?.sporeOutput ?? 0) || left.localeCompare(right))[0];
    const chamber = emitter ? state.chambers[emitter] : undefined;
    const text = chamber?.plant ? `FILTER BREACH — ${chamber.plant.name} WAS THE TOP EMITTER; SPECIMEN CULLED` : 'FILTER BREACH — AIRBORNE PROPAGULES ESCAPED';
    state.incidents.push({ cycle: state.cycle, kind: 'filter', chamberId: emitter, text });
    addEvent(state, events, 'breach', text, emitter);
    if (chamber) { chamber.plant = null; chamber.rootPressure = 0; }
    state.facility.filterLoad = 4;
  }
}

function score(state: GameState): number {
  return state.facility.funding * 100
    + state.facility.biosecuritySeals * 150
    + state.completedContracts.length * 25
    + state.discoveries.length * 20
    + state.facility.mutationReagent * 10
    - state.incidents.length * 50;
}

function finishIfNeeded(state: GameState, events: EngineEvent[]): void {
  if (state.facility.biosecuritySeals <= 0) {
    state.phase = 'gameOver';
    state.outcome = 'shutdown';
    state.score = score(state);
    addEvent(state, events, 'breach', 'FACILITY SHUTDOWN — BIOSECURITY SEALS EXHAUSTED');
    return;
  }
  if (state.cycle <= state.maxCycles) return;
  state.score = score(state);
  if (state.facility.funding >= state.facility.fundingTarget) {
    state.phase = 'won';
    state.outcome = 'won';
    addEvent(state, events, 'complete', `SHIFT COMPLETE — ${state.facility.funding} FUNDING SECURED`);
  } else {
    state.phase = 'report';
    state.outcome = 'deferred';
    addEvent(state, events, `info`, `GRANT DEFERRED — ${state.facility.funding}/${state.facility.fundingTarget} FUNDING`);
  }
}

export function projectCycle(input: GameState): CycleProjection {
  const state = clone(input);
  const events: EngineEvent[] = [];
  if (state.phase !== 'running') return { state, accepted: false, events, reason: 'LAB IS NOT RUNNING' };
  const usage = budgetUsage(state);
  if (usage.light > state.facility.lightBudget) return { state, accepted: false, events, reason: `LIGHT OVER BUDGET ${usage.light}/${state.facility.lightBudget}` };
  if (usage.water > state.facility.waterBudget) return { state, accepted: false, events, reason: `WATER OVER BUDGET ${usage.water}/${state.facility.waterBudget}` };
  if (state.pendingOperation) {
    const reason = operationReason(state, state.pendingOperation);
    if (reason) return { state, accepted: false, events, reason };
    applyOperation(state, state.pendingOperation, events);
  }
  const deltas = applyGrowth(state, events);
  resolveContainment(state, deltas, events);
  for (const contract of state.activeContracts) {
    if (!contract) continue;
    for (const chamberId of CHAMBER_ORDER) {
      if (state.chambers[chamberId].plant && contractMatches(contract, state.chambers[chamberId].plant!, state.chambers[chamberId].rootPressure)) {
        addEvent(state, events, 'contractReady', `✓ ${contract.name.toUpperCase()} READY IN ${chamberId.toUpperCase()}`, chamberId);
        break;
      }
    }
  }
  fillContracts(state);
  state.cycle += 1;
  state.pendingOperation = null;
  if (state.tutorialStep !== null) state.tutorialStep = Math.min(6, state.tutorialStep + 1);
  finishIfNeeded(state, events);
  state.lastEvents = events;
  return { state, accepted: true, events };
}

export function applyCommand(input: GameState, command: Command): CommandResult {
  const state = clone(input);
  const events: EngineEvent[] = [];
  if (command.type === 'startStandard' && state.phase === 'start') {
    const fresh = makeState(command.seed ?? state.seed, 'standard');
    fresh.phase = 'briefing';
    return { state: fresh, accepted: true, events: [{ kind: 'info', text: 'STANDARD SHIFT BRIEFING' }] };
  }
  if (command.type === 'startTraining' && state.phase === 'start') {
    const fresh = makeState(state.seed, 'training');
    fresh.phase = 'briefing';
    return { state: fresh, accepted: true, events: [{ kind: 'info', text: 'TRAINING PROTOCOL BRIEFING' }] };
  }
  if (command.type === 'restartSameSeed') {
    const fresh = makeState(state.seed, state.mode);
    fresh.phase = 'briefing';
    return { state: fresh, accepted: true, events: [{ kind: 'info', text: 'SAME-SEED SHIFT RESTARTED' }] };
  }
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') {
    state.phase = 'running';
    state.lastEvents = [{ kind: 'info', text: 'CONFIGURE A CHAMBER, THEN COMMIT THE CYCLE.' }];
    return { state, accepted: true, events: state.lastEvents };
  }
  if (command.type === 'toggleHelp') {
    state.helpOpen = !state.helpOpen;
    return { state, accepted: true, events };
  }
  if (state.phase !== 'running') return { state, accepted: false, events, reason: 'SHIFT IS NOT RUNNING' };
  if (command.type === 'moveSelection') {
    const current = CHAMBER_ORDER.indexOf(state.selectedChamberId);
    const x = current % 2;
    const y = Math.floor(current / 2);
    const nextX = clamp(x + command.dx, 0, 1);
    const nextY = clamp(y + command.dy, 0, 1);
    state.selectedChamberId = CHAMBER_ORDER[nextY * 2 + nextX]!;
    return { state, accepted: true, events };
  }
  if (command.type === 'cycleLamp') {
    const chamber = state.chambers[state.selectedChamberId];
    chamber.lamp = LAMP_MODES[(LAMP_MODES.indexOf(chamber.lamp) + 1) % LAMP_MODES.length]!;
    return { state, accepted: true, events };
  }
  if (command.type === 'cycleWater') {
    const chamber = state.chambers[state.selectedChamberId];
    chamber.water = WATER_MODES[(WATER_MODES.indexOf(chamber.water) + 1) % WATER_MODES.length]!;
    return { state, accepted: true, events };
  }
  if (command.type === 'queueOperation') {
    const reason = operationReason(state, command.operation);
    if (reason) return { state, accepted: false, events, reason };
    state.pendingOperation = clone(command.operation);
    return { state, accepted: true, events: [{ kind: 'info', text: `PENDING ${command.operation.type.toUpperCase()}` }] };
  }
  if (command.type === 'cancelOperation') {
    state.pendingOperation = null;
    return { state, accepted: true, events };
  }
  if (command.type === 'commitCycle') {
    const projection = projectCycle(state);
    if (!projection.accepted) return { state, accepted: false, events, reason: projection.reason };
    return { state: projection.state, accepted: true, events: projection.events };
  }
  if (command.type === 'closeShiftEarly') {
    if (state.facility.funding < state.facility.fundingTarget) return { state, accepted: false, events, reason: 'FUNDING TARGET NOT MET' };
    state.phase = 'won';
    state.outcome = 'won';
    state.score = score(state);
    addEvent(state, events, 'complete', 'SHIFT CLOSED EARLY — CONTRACT TARGET MET');
    state.lastEvents = events;
    return { state, accepted: true, events };
  }
  return { state, accepted: false, events, reason: 'UNKNOWN COMMAND' };
}

export function currentUsage(state: GameState): { light: number; water: number } {
  return budgetUsage(state);
}

export function mutationCandidates(state: GameState, chamberId = state.selectedChamberId): MutationId[] {
  const plant = state.chambers[chamberId].plant;
  return plant ? plant.mutationOffers.slice(0, 2) : [];
}

export function operationOptions(state: GameState): Array<{ type: string; label: string; operation?: Exclude<PendingOperation, null> }> {
  const chamberId = state.selectedChamberId;
  const chamber = state.chambers[chamberId];
  const options: Array<{ type: string; label: string; operation?: Exclude<PendingOperation, null> }> = [
    { type: 'serviceFilter', label: 'SERVICE FILTER', operation: { type: 'serviceFilter' } },
  ];
  if (chamber.plant) {
    if (state.facility.mutationReagent > 0 && chamber.plant.mutationIds.length < 2 && mutationCandidates(state).length) options.push({ type: 'splice', label: 'SPLICE MUTATION' });
    options.push({ type: 'prune', label: 'PRUNE SPECIMEN', operation: { type: 'prune', chamberId } });
    const matching = matchingContracts(state, chamberId);
    if (matching.length) options.push({ type: 'deliver', label: 'DELIVER SPECIMEN' });
    options.push({ type: 'cull', label: 'CULL SPECIMEN', operation: { type: 'cull', chamberId } });
  } else {
    for (const vial of state.vialRack) if (vial) options.push({ type: 'seed', label: `SEED ${species(vial.speciesId).shortName}`, operation: { type: 'seed', chamberId, vialId: vial.id } });
  }
  return options;
}

export function contractRequirementText(requirement: ContractRequirement): string {
  switch (requirement.kind) {
    case 'statMin': return `${requirement.stat.toUpperCase()} ≥ ${requirement.value}`;
    case 'statMax': return `${requirement.stat === 'rootPressure' ? 'ROOT' : requirement.stat.toUpperCase()} ≤ ${requirement.value}`;
    case 'species': return species(requirement.speciesId).shortName;
    case 'mutation': return MUTATION_BY_ID[requirement.mutationId].shortName;
    case 'expression': return EXPRESSION_BY_ID[requirement.expressionId].name.toUpperCase();
    case 'sterile': return 'STERILE';
    case 'mutationCount': return `${requirement.value} MUTATIONS`;
  }
}

export { LAMP_COST, WATER_COST };
