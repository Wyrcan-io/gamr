import type { CaseDefinition, StationId } from './types';

const gains = (west: 1 | 2 | 3 | 4 | 5, east: 1 | 2 | 3 | 4 | 5, south: 1 | 2 | 3 | 4 | 5): Record<StationId, 1 | 2 | 3 | 4 | 5> => ({ west, east, south });
const power = (west: number, east: number, south: number): Record<StationId, number> => ({ west, east, south });

export const CASES: CaseDefinition[] = [
  {
    id: 'mercy', title: 'MERCY-2', operationLimit: 12, filters: 1, phaseLocks: 0,
    briefing: ['A narrow distress carrier is reported around channels 08–12.', 'Find MERCY-2, take two clean fixes, then keep the caller on station.'],
    target: { id: 'mercy-2', role: 'target', position: { x: 4, y: 3 }, centre: 10, bandwidth: 1, modulation: 'pulse', profile: 'needle', powerByStation: power(8, 7, 8), requiredGainByStation: gains(2, 2, 2), overloadGainByStation: gains(4, 4, 4), packet: { callSign: 'MERCY-2', packetClass: 'distress', correctBroadcast: 'ack-hold', fragments: ['...MERCY-2 calling...', 'injured but stable. Do not move us.', 'RESCUE TOKEN: LANTERN'], crispToken: 'LANTERN' }, },
    interference: [{ id: 'weather', role: 'interference', position: { x: 0, y: 3 }, centre: 9, bandwidth: 3, modulation: 'drift', profile: 'mesa', powerByStation: power(2, 4, 1), requiredGainByStation: gains(1, 1, 1), overloadGainByStation: gains(5, 5, 5) }], events: [],
  },
  {
    id: 'relay', title: 'GLASS RELAY', operationLimit: 12, filters: 1, phaseLocks: 0,
    briefing: ['A store-and-forward relay has gone quiet near channel 15.', 'A harmonic repeater overlaps it. Identify the blocker and preserve the message.'],
    target: { id: 'glass-relay', role: 'target', position: { x: 5, y: 4 }, centre: 15, bandwidth: 3, modulation: 'chirp', profile: 'mesa', powerByStation: power(8, 8, 7), requiredGainByStation: gains(2, 2, 2), overloadGainByStation: gains(4, 4, 4), packet: { callSign: 'GLASS-4', packetClass: 'relay', correctBroadcast: 'ack-relay', fragments: ['GLASS-4 / STORE-AND-FORWARD', 'payload addressed to NORTH QUAY.', 'ROUTE TOKEN: BLUE HOUR'], crispToken: 'BLUE HOUR' }, },
    interference: [{ id: 'harmonic-repeater', role: 'interference', position: { x: 1, y: 5 }, centre: 15, bandwidth: 3, modulation: 'burst', profile: 'twin', powerByStation: power(4, 4, 4), requiredGainByStation: gains(1, 1, 1), overloadGainByStation: gains(5, 5, 5) }], events: [],
  },
  {
    id: 'echo', title: 'FALSE ANGLE', operationLimit: 13, filters: 1, phaseLocks: 0,
    briefing: ['A challenge carrier repeats a familiar call sign.', 'One signal is an echo. Trust the map intersection, not the first clean waveform.'],
    target: { id: 'orion', role: 'target', position: { x: 4, y: 3 }, centre: 6, bandwidth: 1, modulation: 'burst', profile: 'needle', powerByStation: power(8, 7, 8), requiredGainByStation: gains(2, 2, 2), overloadGainByStation: gains(4, 4, 4), packet: { callSign: 'ORION-9', packetClass: 'challenge', correctBroadcast: 'ack-hold', fragments: ['ORION-9 requests handshake.', 'Challenge: WHAT KEEPS THE LIGHT?', 'COUNTERSIGN: THE WATCHER'], crispToken: 'THE WATCHER' }, },
    interference: [{ id: 'mirror-echo', role: 'echo', position: { x: 1, y: 3 }, centre: 6, bandwidth: 1, modulation: 'burst', profile: 'needle', powerByStation: power(5, 5, 5), requiredGainByStation: gains(2, 2, 2), overloadGainByStation: gains(4, 4, 4) }], events: [],
  },
  {
    id: 'choir', title: 'THE CHOIR', operationLimit: 14, filters: 1, phaseLocks: 1,
    briefing: ['A moving comb signal will cross the target on Operations Tick 04.', 'Capture a crisp fix before the crossing, or spend the supplied phase-lock.'],
    target: { id: 'north-star', role: 'target', position: { x: 6, y: 3 }, centre: 18, bandwidth: 1, modulation: 'drift', profile: 'needle', powerByStation: power(7, 8, 7), requiredGainByStation: gains(2, 2, 2), overloadGainByStation: gains(4, 4, 4), packet: { callSign: 'NORTH-STAR', packetClass: 'quarantine', correctBroadcast: 'silence', fragments: ['NORTH-STAR / QUARANTINE', 'Do not acknowledge this channel.', 'CONTAINMENT TOKEN: BLACK GLASS'], crispToken: 'BLACK GLASS' }, },
    interference: [{ id: 'choir', role: 'interference', position: { x: 2, y: 4 }, centre: 14, bandwidth: 3, modulation: 'chirp', profile: 'comb', powerByStation: power(4, 4, 4), requiredGainByStation: gains(1, 1, 1), overloadGainByStation: gains(5, 5, 5) }], events: [{ id: 'choir-crosses', atTick: 4, type: 'move', transmitterId: 'choir', notice: 'THE CHOIR SHIFTS: CHANNEL 18' }],
  },
  {
    id: 'mimic', title: 'THE OPEN MOUTH', operationLimit: 14, filters: 2, phaseLocks: 0,
    briefing: ['A hostile mimic carries a rescue-shaped waveform.', 'Check the packet provenance. Do not answer a signal that wants proof we are here.'],
    target: { id: 'open-mouth', role: 'target', position: { x: 3, y: 4 }, centre: 12, bandwidth: 5, modulation: 'pulse', profile: 'comb', powerByStation: power(8, 7, 7), requiredGainByStation: gains(3, 3, 3), overloadGainByStation: gains(5, 5, 5), packet: { callSign: 'OPEN-MOUTH', packetClass: 'mimic', correctBroadcast: 'jam-mark', fragments: ['PROVENANCE: ECHO / UNVERIFIED', 'It repeats our old rescue format.', 'MARK TOKEN: NO RETURN'], crispToken: 'NO RETURN' }, },
    interference: [{ id: 'rain', role: 'interference', position: { x: 8, y: 3 }, centre: 11, bandwidth: 3, modulation: 'drift', profile: 'mesa', powerByStation: power(3, 3, 2), requiredGainByStation: gains(1, 1, 1), overloadGainByStation: gains(5, 5, 5) }], events: [],
  },
  {
    id: 'orchestra', title: 'ORPHEUS', operationLimit: 15, filters: 2, phaseLocks: 1,
    briefing: ['ORPHEUS returns beneath two known noise sources.', 'The request is voluntary. Locate it, read its packet, and send only its requested relay.'],
    target: { id: 'orpheus', role: 'target', position: { x: 5, y: 2 }, centre: 20, bandwidth: 3, modulation: 'chirp', profile: 'twin', powerByStation: power(8, 8, 6), requiredGainByStation: gains(2, 2, 2), overloadGainByStation: gains(4, 4, 4), packet: { callSign: 'ORPHEUS', packetClass: 'relay', correctBroadcast: 'ack-relay', fragments: ['ORPHEUS / CONSENT RELAY', 'Send our chosen coordinates to NORTH QUAY.', 'ROUTE TOKEN: OPEN SKY'], crispToken: 'OPEN SKY' }, },
    interference: [
      { id: 'weather-wall', role: 'interference', position: { x: 0, y: 2 }, centre: 19, bandwidth: 3, modulation: 'drift', profile: 'mesa', powerByStation: power(3, 3, 2), requiredGainByStation: gains(1, 1, 1), overloadGainByStation: gains(5, 5, 5) },
      { id: 'old-repeater', role: 'interference', position: { x: 8, y: 5 }, centre: 20, bandwidth: 3, modulation: 'burst', profile: 'twin', powerByStation: power(3, 3, 3), requiredGainByStation: gains(1, 1, 1), overloadGainByStation: gains(5, 5, 5) },
    ], events: [],
  },
];
