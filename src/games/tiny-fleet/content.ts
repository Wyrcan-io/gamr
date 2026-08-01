import type { ObjectiveState, Scenario, ShipClassId, TerrainCell } from './types';

const grid = (rows: string[]): TerrainCell[][] => rows.map(row => [...row].map(cell => cell === '#' ? 'island' : cell === '~' ? 'fog' : 'sea'));
const p = (x: number, y: number) => ({ x, y });
const ship = (id: string, classId: ShipClassId, x: number, y: number, facing: 'N' | 'E' | 'S' | 'W') => ({ id, classId, pos: p(x, y), facing });
const objective = (kind: ObjectiveState['kind'], text: string, extras: Partial<ObjectiveState> = {}): ObjectiveState => ({
  kind, text, controlPoints: [], controlNeeded: 0, holdRounds: 0, controlStreak: 0, courierProgress: 0, ...extras,
});

export const SCENARIOS: Scenario[] = [
  {
    id: 'signal-drill', title: 'BATTLE 0 · SIGNAL DRILL',
    briefing: ['Three practice hulks are waiting in the channel.', 'Assign one order to each ship, then seal the fleet.', 'Practice target cells, headings, and the Scout’s second movement impulse.'],
    terrain: grid(['.........', '...##....', '.........', '.........', '....#....', '.........', '.........', '....##...', '.........']), roundLimit: 6,
    objective: objective('eliminate', 'DESTROY ALL THREE PRACTICE HULKS.'),
    player: [ship('S1', 'scout', 0, 7, 'N'), ship('E1', 'escort', 1, 8, 'N'), ship('F1', 'flagship', 2, 8, 'N')],
    enemy: [ship('P1', 'scout', 8, 1, 'S'), ship('P2', 'escort', 7, 0, 'S'), ship('P3', 'flagship', 6, 2, 'W')],
    enemyDoctrine: 'training', signals: 'full', mastery: 'HIT ALL HULKS WITHOUT A FRIENDLY COLLISION.',
  },
  {
    id: 'grey-shoal', title: 'BATTLE 1 · GREY SHOAL RAIDERS',
    briefing: ['Two raiders are cutting across the shoals.', 'Their broad signals say whether they are maneuvering or loading guns.', 'Sink both before the eleventh round.'],
    terrain: grid(['.........', '..##.....', '.........', '.....#...', '.........', '...#.....', '.........', '.....##..', '.........']), roundLimit: 10,
    objective: objective('eliminate', 'SINK EVERY PIRATE COMBAT SHIP.'),
    player: [ship('S1', 'scout', 0, 7, 'N'), ship('E1', 'escort', 1, 8, 'N'), ship('F1', 'flagship', 2, 8, 'N')],
    enemy: [ship('P1', 'scout', 8, 1, 'S'), ship('P2', 'flagship', 7, 0, 'S')],
    enemyDoctrine: 'raider', signals: 'full', mastery: 'KEEP ALL THREE PLAYER SHIPS AFLOAT.',
  },
  {
    id: 'whitewater', title: 'BATTLE 2 · WHITEWATER FOG',
    briefing: ['The chart buoy is hidden beyond two fog banks.', 'Tracks show where a contact could be, not where it is.', 'Hold the buoy for two full round ends after taking it.'],
    terrain: grid(['....~~...', '....~~...', '.........', '..##.....', '.........', '.....##..', '.........', '...~~....', '...~~....']), roundLimit: 11,
    objective: objective('hold', 'TAKE THE CHART BUOY AT E5 AND HOLD IT FOR TWO ROUNDS.', { point: p(4, 4), controlPoints: [p(4, 4)], controlNeeded: 1, holdRounds: 2 }),
    player: [ship('S1', 'scout', 0, 8, 'N'), ship('E1', 'escort', 1, 8, 'N'), ship('F1', 'flagship', 2, 8, 'N')],
    enemy: [ship('P1', 'scout', 8, 0, 'S'), ship('P2', 'escort', 7, 1, 'S'), ship('P3', 'flagship', 8, 2, 'W')],
    enemyDoctrine: 'fogrunner', signals: 'full', mastery: 'CONFIRM EVERY HOSTILE CONTACT AT LEAST ONCE.',
  },
  {
    id: 'mail-run', title: 'BATTLE 3 · SMOKE ON THE MAIL RUN',
    briefing: ['A neutral courier must cross the channel alive.', 'Aegis smoke blocks sight and direct fire for one useful prediction window.', 'Protect the courier until it reaches the eastern marker.'],
    terrain: grid(['.........', '..##.....', '.........', '.....#...', '.........', '...#.....', '.........', '.....##..', '.........']), roundLimit: 12,
    objective: objective('escort', 'KEEP THE COURIER AFLOAT UNTIL IT REACHES I5.', { courierId: 'C1', courierRoute: [p(0, 4), p(1, 4), p(3, 4), p(5, 4), p(7, 4), p(8, 4)], courierProgress: 0 }),
    player: [ship('S1', 'scout', 0, 8, 'N'), ship('E1', 'escort', 1, 8, 'N'), ship('F1', 'flagship', 2, 8, 'N')],
    enemy: [ship('P1', 'scout', 8, 0, 'S'), ship('P2', 'escort', 7, 1, 'S'), ship('P3', 'flagship', 8, 2, 'W')],
    neutral: [ship('C1', 'escort', 0, 4, 'E')],
    enemyDoctrine: 'gunline', signals: 'full', mastery: 'THE COURIER TAKES NO DAMAGE.',
  },
  {
    id: 'three-bells', title: 'BATTLE 4 · BELLS AT THE NARROWS',
    briefing: ['Three signal buoys mark the narrow water.', 'Control any two at the end of two consecutive rounds.', 'Fogrunner captains will break contact rather than trade hull for a bad shot.'],
    terrain: grid(['.........', '...##....', '.........', '.........', '..#...#..', '.........', '.........', '....##...', '.........']), roundLimit: 12,
    objective: objective('hold', 'CONTROL ANY TWO OF THE THREE SIGNAL BUOYS.', { controlPoints: [p(2, 3), p(4, 4), p(6, 3)], controlNeeded: 2, holdRounds: 2 }),
    player: [ship('S1', 'scout', 0, 8, 'N'), ship('E1', 'escort', 1, 8, 'N'), ship('F1', 'flagship', 2, 8, 'N')],
    enemy: [ship('P1', 'scout', 8, 0, 'S'), ship('P2', 'escort', 7, 1, 'S'), ship('P3', 'flagship', 8, 2, 'W')],
    enemyDoctrine: 'fogrunner', signals: 'sparse', mastery: 'CONTROL ALL THREE BUOYS AT ONE ROUND END.',
  },
  {
    id: 'black-pennant', title: 'BATTLE 5 · THE BLACK PENNANT',
    briefing: ['The rival Flagship is trying to reach the eastern escape marker.', 'Sink Atlas before it can complete that route; your own Atlas must survive.', 'Signals are sparse. A stale track is still better than a blind guess.'],
    terrain: grid(['.........', '..##.....', '.........', '.....#...', '.........', '...#.....', '.........', '.....##..', '.........']), roundLimit: 14,
    objective: objective('eliminate', 'SINK THE BLACK PENNANT FLAGSHIP BEFORE IT REACHES I9.'),
    player: [ship('S1', 'scout', 0, 8, 'N'), ship('E1', 'escort', 1, 8, 'N'), ship('F1', 'flagship', 2, 8, 'N')],
    enemy: [ship('P1', 'scout', 8, 0, 'S'), ship('P2', 'escort', 7, 1, 'S'), ship('P3', 'flagship', 6, 0, 'S')],
    enemyDoctrine: 'black-pennant', signals: 'sparse', mastery: 'WIN WITH TWO SHIPS AND NO FRIENDLY FIRE.',
  },
];

export function cloneScenario(scenario: Scenario): Scenario {
  return JSON.parse(JSON.stringify(scenario)) as Scenario;
}
