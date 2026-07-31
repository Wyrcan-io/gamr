import type { CaseDefinition, Camera, Door, Person } from './types';

const doors: Door[] = [
  { id: 'RL', a: 'R', b: 'L', tier: 1, locked: false }, { id: 'LM', a: 'L', b: 'M', tier: 1, locked: false },
  { id: 'RP', a: 'R', b: 'P', tier: 1, locked: false }, { id: 'PH', a: 'P', b: 'H', tier: 1, locked: false },
  { id: 'LH', a: 'L', b: 'H', tier: 1, locked: false }, { id: 'HM', a: 'H', b: 'M', tier: 2, locked: false },
  { id: 'HA', a: 'H', b: 'A', tier: 2, locked: false }, { id: 'HK', a: 'H', b: 'K', tier: 1, locked: false },
  { id: 'KS', a: 'K', b: 'S', tier: 2, locked: false }, { id: 'SE', a: 'S', b: 'E', tier: 3, locked: false },
];
const cams: Camera[] = [
  { id: 'C01', room: 'R', covers: ['R', 'L'], activeUntil: 0, quality: 'clear' },
  { id: 'C02', room: 'P', covers: ['P', 'H'], activeUntil: 0, quality: 'clear' },
  { id: 'C03', room: 'H', covers: ['H', 'A', 'K'], activeUntil: 0, quality: 'clear' },
  { id: 'C04', room: 'S', covers: ['S', 'E'], activeUntil: 0, quality: 'clear' },
  { id: 'C05', room: 'M', covers: ['M', 'L'], activeUntil: 0, quality: 'grainy' },
];
const person = (id: Person['id'], tier: Person['tier'], build: Person['build'], schedule: Person['schedule']): Person => ({ id, name: id, tier, build, schedule });
const people: Person[] = [
  person('NORA', 1, 'TALL', { 1: 'R', 2: 'R', 3: 'L', 4: 'L', 5: 'R', 6: 'R', 7: 'L' }),
  person('SAM', 2, 'BULKY', { 1: 'P', 2: 'P', 3: 'H', 4: 'H', 5: 'P', 6: 'P', 7: 'H' }),
  person('PRIYA', 2, 'SHORT', { 1: 'K', 2: 'K', 3: 'K', 4: 'H', 5: 'H', 6: 'K', 7: 'K' }),
  person('LEON', 3, 'SLIM', { 1: 'S', 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S' }),
  person('MICA', 1, 'SHORT', { 1: 'M', 2: 'M', 3: 'M', 4: 'L', 5: 'M', 6: 'M', 7: 'M' }),
];
const base = (id: string, title: string, briefing: string[], battery: number, deadline: number, intruder: CaseDefinition['intruder'], openingEvidence: CaseDefinition['openingEvidence'] = [], scheduled: CaseDefinition['scheduled'] = []): CaseDefinition => ({ id, title, briefing, battery, deadline, rooms: ['R', 'L', 'M', 'P', 'H', 'A', 'K', 'S', 'E'], doors: doors.map(d => ({ ...d })), cameras: cams.map(c => ({ ...c })), people: people.map(p => ({ ...p, schedule: { ...p.schedule } })), intruder, openingEvidence, scheduled });

export const CASES: CaseDefinition[] = [
  base('orientation', 'ORIENTATION: THE UNLISTED BADGE', ['One person is inside after close.', 'Wake cameras, compare the route, then detain when the proof board reaches 2/2.', 'The exit window is generous for training.'], 99, 12, { cover: 'NORA', build: 'SLIM', position: 'R', route: ['R', 'L', 'H', 'A'], contingency: ['R', 'P', 'H', 'A'], step: 0, target: 'A' }, [
    { id: 'brief-1', turn: 0, kind: 'brief', text: 'The intruder is wearing a TALL employee cover but the physical build may differ.' },
  ]),
  base('printer-wake', '01: PRINTER WAKE', ['Two sightings share one badge name.', 'A genuine badge cannot be in Reception and Hall on the same turn.', 'Find the impossible transition before the Archive window closes.'], 10, 9, { cover: 'NORA', build: 'SLIM', position: 'R', route: ['R', 'L', 'H', 'A'], contingency: ['R', 'P', 'H', 'A'], step: 0, target: 'A' }),
  base('archive-key', '02: ARCHIVE KEY', ['A tier-1 token appears at a tier-2 door.', 'Query the suspicious log event to authenticate the raw token.', 'The intruder will take the Hall → Archive route.'], 11, 10, { cover: 'MICA', build: 'SLIM', position: 'R', route: ['R', 'L', 'H', 'A'], contingency: ['R', 'P', 'H', 'A'], step: 0, target: 'A' }),
  base('quiet-floor', '03: QUIET FLOOR', ['The Hall camera enters emergency darkness on turn 3.', 'Use a motion probe to establish occupancy, then use the door timing.', 'Do not spend every battery pip on camera wake-ups.'], 12, 10, { cover: 'PRIYA', build: 'SHORT', position: 'R', route: ['R', 'P', 'H', 'K'], contingency: ['R', 'L', 'H', 'K'], step: 0, target: 'K' }, [], [{ turn: 3, type: 'dark', room: 'H', text: 'POWER EVENT: HALL CAMERA QUALITY DROPS TO DARK.' }]),
  base('fire-door', '04: FIRE DOOR', ['The intruder expects the Hall → Archive door to remain open.', 'Locking it forces a visible contingency through Kitchen.', 'The detour is evidence, not a guess.'], 11, 9, { cover: 'SAM', build: 'SLIM', position: 'R', route: ['R', 'L', 'H', 'A'], contingency: ['R', 'L', 'H', 'K', 'S'], step: 0, target: 'S' }),
  base('boardroom-ghost', '05: BOARDROOM GHOST', ['Two cover stories fit the first camera frame.', 'One schedule cannot reach the observed door event in time.', 'Corroborate the route with a second active camera.'], 13, 11, { cover: 'LEON', build: 'BULKY', position: 'R', route: ['R', 'P', 'H', 'M'], contingency: ['R', 'L', 'M'], step: 0, target: 'M' }),
  base('ghost-shift', '06: GHOST SHIFT', ['A brief outage, a cloned badge, and a familiar silhouette.', 'The Server exit is the only final intercept.', 'Collect two independent proof families before turn 10.'], 14, 12, { cover: 'NORA', build: 'BULKY', position: 'R', route: ['R', 'P', 'H', 'K', 'S', 'E'], contingency: ['R', 'L', 'H', 'K', 'S', 'E'], step: 0, target: 'E' }, [], [{ turn: 4, type: 'dark', room: 'H', text: 'BRIEF OUTAGE: HALL CAMERA QUALITY DROPS TO DARK.' }, { turn: 7, type: 'notice', text: 'SECURITY: SERVER EXIT WINDOW OPEN.' }]),
];
