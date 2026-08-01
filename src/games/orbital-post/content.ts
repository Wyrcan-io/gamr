import type { Fault, Job, JobEffect, ShiftDefinition, Upgrade, WeatherId } from './types';

export interface JobTemplate extends Omit<Job, 'id' | 'state' | 'remaining' | 'scheduledStart' | 'arrivalWindow' | 'earliestWindow' | 'deadlineWindow'> {
  templateId: string;
  earliestWindow?: number;
  deadlineWindow?: number;
}

export const WEATHER: Record<WeatherId, { label: string; glyph: string; ascii: string; description: string; battery: number }> = {
  clear: { label: 'CLEAR', glyph: '☼', ascii: 'O', description: 'All lanes safe. Solar harvest +2.', battery: 2 },
  veil: { label: 'THIN VEIL', glyph: '≈', ascii: '~', description: 'All lanes safe. Laser relay costs +1 power.', battery: 1 },
  flare: { label: 'SOLAR FLARE', glyph: '!', ascii: '!', description: 'Dock and internal work only. No solar harvest.', battery: 0 },
  storm: { label: 'PARTICLE STORM', glyph: '#', ascii: '#', description: 'Dock and internal repair only. Battery -1.', battery: -1 },
  recovery: { label: 'RECOVERY', glyph: '✦', ascii: '+', description: 'All lanes safe. External work costs +1 power.', battery: 1 },
};

const effect = (type: JobEffect['type'], values: Omit<JobEffect, 'type'> = {}): JobEffect => ({ type, ...values });

export const JOB_TEMPLATES: Record<string, JobTemplate> = {
  medical: {
    templateId: 'medical', kind: 'cargo', title: 'MEDICAL INTAKE', client: 'ILYRA CLINIC', lanes: ['dock'], duration: 1,
    allowedWeather: ['clear', 'veil', 'flare', 'storm', 'recovery'], powerCost: 1, priority: 'critical',
    description: 'Unload coolant and medicine before the freighter departs.', onComplete: [effect('standing', { amount: 3 }), effect('supply', { supply: 'coolant', amount: 1 })],
    onMiss: [effect('standing', { amount: -2 }), effect('integrity', { amount: -1 })],
  },
  spares: {
    templateId: 'spares', kind: 'cargo', title: 'SPARE MANIFOLD', client: 'KITE FREIGHT', lanes: ['dock'], duration: 2,
    allowedWeather: ['clear', 'veil', 'flare', 'storm', 'recovery'], powerCost: 1, priority: 'urgent',
    description: 'Receive the replacement manifold for the coolant loop.', onComplete: [effect('supply', { supply: 'spares', amount: 2 }), effect('standing', { amount: 1 })],
    onMiss: [effect('standing', { amount: -1 })],
  },
  shielding: {
    templateId: 'shielding', kind: 'cargo', title: 'SHIELDING CRATE', client: 'KITE FREIGHT', lanes: ['dock'], duration: 1,
    allowedWeather: ['clear', 'veil', 'flare', 'storm', 'recovery'], powerCost: 1, priority: 'urgent',
    description: 'Bring shielding plates aboard before the particle wake.', onComplete: [effect('supply', { supply: 'shielding', amount: 1 }), effect('standing', { amount: 1 })],
    onMiss: [effect('standing', { amount: -1 })],
  },
  radiator: {
    templateId: 'radiator', kind: 'repair', title: 'RADIATOR PATCH', client: 'KESTREL SYSTEMS', lanes: ['eva'], duration: 2,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 1, priority: 'critical',
    description: 'Patch the coolant leak before the next particle storm.', onComplete: [effect('resolveFault', { faultId: 'coolant-leak' }), effect('standing', { amount: 2 })],
    onMiss: [effect('integrity', { amount: -1 })],
  },
  shield: {
    templateId: 'shield', kind: 'repair', title: 'ANTENNA SHIELD', client: 'KESTREL SYSTEMS', lanes: ['eva'], duration: 1,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 2, priority: 'urgent',
    description: 'Brace the exposed antenna before the flare reaches periapsis.', onComplete: [effect('setFlag', { flag: 'arrayShielded' }), effect('resolveFault', { faultId: 'shield-fracture' }), effect('standing', { amount: 1 })],
    onMiss: [effect('setFlag', { flag: 'arrayDrift' }), effect('integrity', { amount: -1 })],
  },
  latch: {
    templateId: 'latch', kind: 'repair', title: 'MANUAL LATCH RESET', client: 'KESTREL SYSTEMS', lanes: ['eva'], duration: 1,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 1, priority: 'urgent',
    description: 'Reset the docking latch from the exterior service spine.', onComplete: [effect('resolveFault', { faultId: 'docking-latch' })],
    onMiss: [effect('standing', { amount: -1 })],
  },
  calibrate: {
    templateId: 'calibrate', kind: 'repair', title: 'CALIBRATE ARRAY', client: 'KESTREL SYSTEMS', lanes: ['eva'], duration: 2,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 1, priority: 'urgent',
    description: 'Re-seat the phase coils so high-gain transmissions can lock.', onComplete: [effect('resolveFault', { faultId: 'array-drift' })],
    onMiss: [effect('standing', { amount: -1 })],
  },
  fleet: {
    templateId: 'fleet', kind: 'comms', title: 'FLEET BURST', client: 'RELIEF FLEET', lanes: ['comms'], duration: 2,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 2, priority: 'critical',
    description: 'Relay Ilyra evacuation coordinates through the outer link.', onComplete: [effect('standing', { amount: 4 }), effect('setFlag', { flag: 'fleetRoute' })],
    onMiss: [effect('standing', { amount: -3 })],
  },
  colony: {
    templateId: 'colony', kind: 'comms', title: 'COLONY BURST', client: 'ILYRA COLONY', lanes: ['comms'], duration: 1,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 1, priority: 'urgent',
    description: 'Confirm that the clinic shipment has been received.', onComplete: [effect('standing', { amount: 3 }), effect('setFlag', { flag: 'colonyAck' })],
    onMiss: [effect('standing', { amount: -2 })],
  },
  weather: {
    templateId: 'weather', kind: 'comms', title: 'WEATHER BULLETIN', client: 'SOLAR OBSERVATORY', lanes: ['comms'], duration: 1,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 1, priority: 'routine',
    description: 'Receive a more precise particle-wake estimate.', onComplete: [effect('standing', { amount: 1 }), effect('setFlag', { flag: 'weatherRead' })],
    onMiss: [],
  },
  guided: {
    templateId: 'guided', kind: 'command', title: 'GUIDED DOCKING', client: 'KITE FREIGHT', lanes: ['dock', 'comms'], duration: 1,
    allowedWeather: ['clear', 'veil', 'flare', 'storm', 'recovery'], powerCost: 2, priority: 'critical',
    description: 'Align the freighter while the dock crew takes the berth.', onComplete: [effect('standing', { amount: 3 }), effect('supply', { supply: 'spares', amount: 1 })],
    onMiss: [effect('standing', { amount: -2 }), effect('integrity', { amount: -1 })],
  },
  bus: {
    templateId: 'bus', kind: 'repair', title: 'ISOLATE POWER BUS', client: 'KESTREL SYSTEMS', lanes: ['eva'], duration: 1,
    allowedWeather: ['clear', 'veil', 'recovery'], powerCost: 1, priority: 'critical',
    description: 'Cut the damaged bus before it drains the reserve.', onComplete: [effect('resolveFault', { faultId: 'power-bus' })],
    onMiss: [effect('integrity', { amount: -1 })],
  },
  coolant: {
    templateId: 'coolant', kind: 'cargo', title: 'COOLANT TANK', client: 'NIGHTJAR TENDER', lanes: ['dock'], duration: 1,
    allowedWeather: ['clear', 'veil', 'flare', 'storm', 'recovery'], powerCost: 1, priority: 'urgent',
    description: 'Secure reserve coolant for the leak-prone loop.', onComplete: [effect('supply', { supply: 'coolant', amount: 1 }), effect('standing', { amount: 1 })],
    onMiss: [effect('integrity', { amount: -1 })],
  },
};

export const FAULTS: Record<string, Fault> = {
  'coolant-leak': { id: 'coolant-leak', name: 'COOLANT LEAK', glyph: '⚠', description: 'Costs 1 integrity during STORM.', triggerWeather: ['storm'], integrityLoss: 1, resolvedBy: 'radiator', active: true },
  'array-drift': { id: 'array-drift', name: 'ARRAY DRIFT', glyph: '⚠', description: 'Blocks high-gain comms until calibrated.', triggerWeather: [], integrityLoss: 0, blocks: ['comms'], resolvedBy: 'calibrate', active: true },
  'docking-latch': { id: 'docking-latch', name: 'DOCKING LATCH', glyph: '⚠', description: 'Guided docking cannot begin.', triggerWeather: [], integrityLoss: 0, blocks: ['dock'], resolvedBy: 'latch', active: true },
  'shield-fracture': { id: 'shield-fracture', name: 'SHIELD FRACTURE', glyph: '⚠', description: 'Costs 1 integrity during FLARE.', triggerWeather: ['flare'], integrityLoss: 1, resolvedBy: 'shield', active: true },
  'power-bus': { id: 'power-bus', name: 'POWER BUS', glyph: '⚠', description: 'Adds 1 power to every EVA or COMMS segment.', triggerWeather: [], integrityLoss: 0, resolvedBy: 'bus', active: true },
};

export const UPGRADES: Upgrade[] = [
  { id: 'capacitors', name: 'RESERVE CAPACITORS', text: 'Battery maximum +2.' },
  { id: 'dock-automator', name: 'DOCK AUTOMATOR', text: 'First one-window cargo job each shift costs 0 power.' },
  { id: 'eva-tether', name: 'EVA TETHER KIT', text: 'First EVA job in RECOVERY ignores its +1 power cost.' },
  { id: 'priority-desk', name: 'PRIORITY DESK', text: 'Critical jobs completed on time grant +1 standing.' },
  { id: 'spare-manifold', name: 'SPARE MANIFOLD', text: 'Start each shift with 1 spares supply.' },
  { id: 'weather-optics', name: 'WEATHER OPTICS', text: 'Show an advisory fifth forecast cell.' },
  { id: 'quiet-channel', name: 'QUIET CHANNEL', text: 'One routine COMMS job per shift runs in VEIL at normal power.' },
];

export const SHIFTS: ShiftDefinition[] = [
  { id: 'checkout', title: 'SHIFT 01 · CHECKOUT', briefing: 'Reopen Kestrel. Learn the three lanes before the weather turns.', windows: 6, weather: ['clear', 'clear', 'veil', 'clear', 'veil', 'recovery'], arrivals: [{ window: 0, templateId: 'medical' }, { window: 0, templateId: 'radiator' }, { window: 1, templateId: 'colony' }], initialFaults: [], requiredTemplateIds: ['medical', 'radiator', 'colony'], optionalTemplateIds: [] },
  { id: 'first-flare', title: 'SHIFT 02 · FIRST FLARE', briefing: 'The flare is visible on the strip. Finish exterior work before it reaches the station.', windows: 8, weather: ['clear', 'veil', 'flare', 'flare', 'recovery', 'clear', 'veil', 'recovery'], arrivals: [{ window: 0, templateId: 'spares' }, { window: 0, templateId: 'radiator' }, { window: 1, templateId: 'shield' }, { window: 2, templateId: 'fleet' }], initialFaults: ['coolant-leak'], requiredTemplateIds: ['spares', 'radiator', 'shield', 'fleet'], optionalTemplateIds: ['colony'] },
  { id: 'dockside', title: 'SHIFT 03 · DOCKSIDE DELAY', briefing: 'A freighter needs the dock and the antenna at once. Dependencies are now live.', windows: 9, weather: ['clear', 'veil', 'flare', 'storm', 'storm', 'recovery', 'clear', 'veil', 'recovery'], arrivals: [{ window: 0, templateId: 'guided' }, { window: 0, templateId: 'latch' }, { window: 0, templateId: 'calibrate' }, { window: 1, templateId: 'colony' }, { window: 2, templateId: 'fleet' }], initialFaults: ['docking-latch', 'array-drift'], requiredTemplateIds: ['guided', 'latch', 'calibrate', 'fleet'], optionalTemplateIds: ['spares', 'weather'] },
  { id: 'particle-wake', title: 'SHIFT 04 · PARTICLE WAKE', briefing: 'The storm has teeth. Shield the station, repair the loop, and preserve a battery reserve.', windows: 10, weather: ['clear', 'veil', 'storm', 'storm', 'storm', 'recovery', 'flare', 'recovery', 'clear', 'veil'], arrivals: [{ window: 0, templateId: 'shielding' }, { window: 0, templateId: 'radiator' }, { window: 1, templateId: 'shield' }, { window: 2, templateId: 'fleet' }, { window: 4, templateId: 'coolant' }], initialFaults: ['coolant-leak', 'shield-fracture'], requiredTemplateIds: ['shielding', 'radiator', 'shield', 'fleet'], optionalTemplateIds: ['coolant', 'colony'] },
  { id: 'black-sun', title: 'SHIFT 05 · BLACK SUN', briefing: 'Two bad weather bands cross. Not every contract can be honoured.', windows: 10, weather: ['veil', 'flare', 'storm', 'storm', 'flare', 'recovery', 'storm', 'recovery', 'clear', 'veil'], arrivals: [{ window: 0, templateId: 'bus' }, { window: 0, templateId: 'radiator' }, { window: 1, templateId: 'fleet' }, { window: 2, templateId: 'guided' }, { window: 4, templateId: 'shielding' }], initialFaults: ['power-bus', 'coolant-leak'], requiredTemplateIds: ['bus', 'radiator', 'fleet', 'guided'], optionalTemplateIds: ['shielding', 'colony'] },
  { id: 'last-transit', title: 'SHIFT 06 · LAST TRANSIT', briefing: 'The relief fleet is moving. Build the route that gets its coordinates through.', windows: 10, weather: ['clear', 'veil', 'flare', 'storm', 'storm', 'recovery', 'flare', 'recovery', 'clear', 'recovery'], arrivals: [{ window: 0, templateId: 'shielding' }, { window: 0, templateId: 'bus' }, { window: 0, templateId: 'radiator' }, { window: 0, templateId: 'shield' }, { window: 1, templateId: 'fleet' }, { window: 2, templateId: 'guided' }, { window: 3, templateId: 'colony' }], initialFaults: ['power-bus', 'coolant-leak', 'shield-fracture'], requiredTemplateIds: ['bus', 'radiator', 'shield', 'fleet', 'guided'], optionalTemplateIds: ['shielding', 'colony', 'weather'] },
];

export function cloneTemplate(templateId: string, id: string, arrivalWindow: number, start: number, deadline: number): Job {
  const template = JOB_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown Orbital Post job template: ${templateId}`);
  return {
    id, kind: template.kind, title: template.title, client: template.client, lanes: [...template.lanes], duration: template.duration,
    allowedWeather: [...template.allowedWeather], powerCost: template.powerCost, arrivalWindow, earliestWindow: Math.max(0, start), deadlineWindow: deadline,
    onComplete: template.onComplete.map(item => ({ ...item })), onMiss: template.onMiss.map(item => ({ ...item })), state: 'queued', remaining: template.duration,
    priority: template.priority, description: template.description,
  };
}
