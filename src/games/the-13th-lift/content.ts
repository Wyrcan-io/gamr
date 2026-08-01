import type { CluePredicate, Landing, ShiftContract, StoryBeat, StoryThreadId } from './types';

export interface LandingBlueprint {
  id: string;
  canonicalLabel: string;
  department: string;
}

export interface PassengerArchetype {
  name: string;
  archetype: string;
  recurringId?: string;
}

export const LANDING_BLUEPRINTS: LandingBlueprint[] = [
  { id: 'mailroom', canonicalLabel: '6', department: 'MAILROOM' },
  { id: 'accounts', canonicalLabel: '7', department: 'ACCOUNTS' },
  { id: 'records', canonicalLabel: '8', department: 'RECORDS' },
  { id: 'clinic', canonicalLabel: '9', department: 'CLINIC' },
  { id: 'security', canonicalLabel: '10', department: 'SECURITY' },
  { id: 'census', canonicalLabel: '11', department: 'TENANT CENSUS' },
  { id: 'nursery', canonicalLabel: '12', department: 'NIGHT NURSERY' },
  { id: 'machinery', canonicalLabel: '14', department: 'QUIET MACHINERY' },
];

export const PASSENGER_ARCHETYPES: PassengerArchetype[] = [
  { name: 'Ada Rook', archetype: 'COURIER', recurringId: 'mara' },
  { name: 'Dr. Vale', archetype: 'CLINICIAN', recurringId: 'vale' },
  { name: 'Nell Bell', archetype: 'NIGHT PORTER', recurringId: 'census' },
  { name: 'Ivo March', archetype: 'MAINTENANCE', recurringId: 'operator' },
  { name: 'Mina Saye', archetype: 'TENANT CLERK' },
  { name: 'Juniper Gray', archetype: 'CHILD PASSENGER', recurringId: 'voice' },
  { name: 'Mr. Orra', archetype: 'ACCOUNTANT' },
  { name: 'The Woman in Blue', archetype: 'TENANT' },
  { name: 'Elias Ward', archetype: 'FORMER OPERATOR', recurringId: 'operator' },
  { name: 'Cora Finch', archetype: 'CENSUS CLERK', recurringId: 'census' },
];

const CONTRACTS: ShiftContract[] = [
  { shift: 0, title: 'HONEST MACHINERY', memo: 'All call lines match the directory. Read the requests and queue the shortest route.', allowedAnomalies: ['stable'], panelHasThirteen: false, passengerCount: 2 },
  { shift: 1, title: 'TRADED NAMES', memo: 'ONE ADJACENT PAIR from the active bank has traded call lines.', allowedAnomalies: ['adjacent-swap'], panelHasThirteen: false, passengerCount: 2 },
  { shift: 2, title: 'FLOORS IN MOTION', memo: 'THREE CONSECUTIVE call lines may cycle. Relative evidence remains true.', allowedAnomalies: ['three-cycle', 'adjacent-swap'], panelHasThirteen: false, passengerCount: 3 },
  { shift: 3, title: 'THE BUTTON BETWEEN BUTTONS', memo: 'One extra lit button has no authentic landing. The counterweight must answer every real stop.', allowedAnomalies: ['phantom-button'], panelHasThirteen: true, passengerCount: 3 },
  { shift: 4, title: 'SERVICE FOR THE ABSENT', memo: 'One relabel anomaly and one echo or phantom button may be present. Follow the evidence before the memo.', allowedAnomalies: ['compound'], panelHasThirteen: true, passengerCount: 3 },
];

export function contractForShift(shift: number): ShiftContract {
  return CONTRACTS[Math.max(0, Math.min(CONTRACTS.length - 1, shift))];
}

export function landingsForWindow(start: number, count = 5): Landing[] {
  return LANDING_BLUEPRINTS.slice(start, Math.min(LANDING_BLUEPRINTS.length, start + count)).map((blueprint, index) => ({
    id: blueprint.id,
    canonicalLabel: blueprint.canonicalLabel,
    department: blueprint.department,
    shaftIndex: start + index,
    authentic: true,
  }));
}

export function landingMap(landings: Landing[]): Record<string, Landing> {
  return Object.fromEntries(landings.map(landing => [landing.id, landing]));
}

export function passengerArchetype(index: number): PassengerArchetype {
  return PASSENGER_ARCHETYPES[index % PASSENGER_ARCHETYPES.length];
}

export function renderCluePredicate(predicate: CluePredicate, landings: Record<string, Landing>, sourceTime: 'current' | 'previous'): string {
  const timeWord = sourceTime === 'previous' ? 'before the midnight bell' : 'tonight';
  switch (predicate.kind) {
    case 'button-opens': {
      const department = landings[predicate.landing]?.department ?? predicate.landing.toUpperCase();
      return `I watched button ${predicate.button} open ${department} ${timeWord}.`;
    }
    case 'button-is-phantom':
      return `The ${predicate.button} lamp is lit, but its counterweight never answers.`;
    case 'button-is-authentic':
      return `The arrival chime answered honestly at button ${predicate.button}.`;
    case 'landing-above': {
      const upper = landings[predicate.upper]?.department ?? predicate.upper.toUpperCase();
      const lower = landings[predicate.lower]?.department ?? predicate.lower.toUpperCase();
      return `${upper} is above ${lower} ${timeWord}.`;
    }
    case 'button-order':
      return `The call light for ${predicate.lower} is below the call light for ${predicate.upper}.`;
  }
}

export function storyBeat(shift: number, thread: StoryThreadId): StoryBeat | undefined {
  const beats: StoryBeat[] = [
    { id: 'operator-notice', shift: 1, thread: 'missing-operator', text: ['MAINTENANCE NOTICE: ELIAS WARD HAS NOT CLOCKED OUT.', 'The lift accepts the notice as a passenger request.'], flag: 'operator-seen' },
    { id: 'census-ledger', shift: 2, thread: 'deleted-census', text: ['TENANT CENSUS: one floor removed from the night count.', 'The erased line is numbered 13.'], flag: 'census-seen' },
    { id: 'voice-intercom', shift: 2, thread: 'building-voice', text: ['INTERCOM: “You keep asking which floors are real.”', 'The voice sounds like the lift doors opening.'], flag: 'voice-seen' },
    { id: 'operator-return', shift: 3, thread: 'missing-operator', text: ['A passenger signs the manifest ELIAS WARD.', 'The signature is dated tomorrow.'], flag: 'operator-returned' },
    { id: 'census-proof', shift: 4, thread: 'deleted-census', text: ['The census clerk carries a page with thirteen names.', 'One name has been crossed out by the building itself.'], flag: 'census-proof' },
    { id: 'voice-choice', shift: 4, thread: 'building-voice', text: ['INTERCOM: “A building is a promise made of doors.”', 'The next stop will decide who is allowed to remember it.'], flag: 'voice-choice' },
  ];
  return beats.find(beat => beat.shift === shift && beat.thread === thread);
}

export const START_STORY = [
  'NIGHT OPERATOR LOG // 00:47',
  'The directory says twelve floors. The button panel says thirteen.',
  'Passengers are already waiting.',
];
