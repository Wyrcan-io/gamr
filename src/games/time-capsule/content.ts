import type {
  ActionDefinition,
  ActorDefinition,
  AnchorDefinition,
  Condition,
  Effect,
  EpisodeDefinition,
  EndingDefinition,
  ItemDefinition,
  IncidentKind,
  LeadDefinition,
  RoomDefinition,
  ScheduledEvent,
} from './types';

const all = (...conditions: Condition[]): Condition => ({ op: 'all', conditions });
const any = (...conditions: Condition[]): Condition => ({ op: 'any', conditions });
const room = (roomId: string): Condition => ({ op: 'room', roomId });
const tick = (min: number, max = 9): Condition => ({ op: 'tick', min, max });
const anchor = (anchorId: string): Condition => ({ op: 'hasAnchor', anchorId });
const flag = (key: string, equals: boolean | number | string = true): Condition => ({ op: 'flag', key, equals });
const item = (itemId: string): Condition => ({ op: 'hasItem', itemId });
const actorAt = (actorId: string, roomId: string): Condition => ({ op: 'actorAt', actorId, roomId });
const log = (text: string, kind: IncidentKind): Effect => ({ op: 'log', text, kind });
const discover = (anchorId: string): Effect => ({ op: 'discover', anchorId });

const rooms: RoomDefinition[] = [
  { id: 'atrium', label: 'ATRIUM', x: 16, y: 4, neighbours: ['records', 'gallery', 'roof', 'workshop'] },
  { id: 'records', label: 'RECORDS', x: 2, y: 4, neighbours: ['atrium'] },
  { id: 'gallery', label: 'GALLERY', x: 30, y: 4, neighbours: ['atrium'] },
  { id: 'roof', label: 'ROOF / BELL', x: 16, y: 1, neighbours: ['atrium'] },
  { id: 'workshop', label: 'WORKSHOP', x: 16, y: 7, neighbours: ['atrium', 'vault'] },
  { id: 'vault', label: 'VAULT', x: 16, y: 10, neighbours: ['workshop'] },
];

const actors: ActorDefinition[] = [
  { id: 'ivo', name: 'IVO MAR', home: 'workshop', glyph: '●', schedule: { 0: 'workshop', 1: 'workshop', 2: 'workshop', 3: 'workshop', 4: 'roof', 5: 'roof', 6: 'roof', 7: 'workshop', 8: 'atrium', 9: 'atrium' } },
  { id: 'mara', name: 'MARA VALE', home: 'records', glyph: '●', schedule: { 0: 'records', 1: 'records', 2: 'atrium', 3: 'atrium', 4: 'atrium', 5: 'atrium', 6: 'vault', 7: 'atrium', 8: 'atrium', 9: 'atrium' } },
  { id: 'jun', name: 'JUN ORIS', home: 'atrium', glyph: '●', schedule: { 0: 'atrium', 1: 'gallery', 2: 'gallery', 3: 'gallery', 4: 'atrium', 5: 'atrium', 6: 'atrium', 7: 'gallery', 8: 'gallery', 9: 'atrium' } },
  { id: 'senn', name: 'DIRECTOR SENN', home: 'records', glyph: '●', schedule: { 0: 'records', 1: 'records', 2: 'atrium', 3: 'atrium', 4: 'atrium', 5: 'atrium', 6: 'atrium', 7: 'atrium', 8: 'atrium', 9: 'atrium' } },
];

const items: ItemDefinition[] = [
  { id: 'red-ledger', name: 'RED LEDGER', description: 'A signed bypass order with one page torn out.', spawnRoom: 'records' },
  { id: 'ceramic-link', name: 'CERAMIC LINK', description: 'A heatproof relay piece, still warm from the cabinet.', spawnRoom: 'workshop' },
  { id: 'witness-key', name: 'WITNESS KEY', description: 'A brass key stamped with the archive seal.', spawnRoom: 'vault' },
  { id: 'chronal-shard', name: 'CHRONAL SHARD', description: "A humming fragment of the capsule's unstable core.", spawnRoom: null },
];

const anchors: AnchorDefinition[] = [
  { id: 'mem-ivo-confession', kind: 'memory', name: "Ivo's confession", shortName: 'IVO CONFESSION', description: 'You remember where Ivo hid the manual cutoff, and why he was afraid to use it.', journal: 'Ivo admitted that the roof cutoff can stop the feedback if it is pulled on the safe chime.', lead: 'Ivo will only tell the truth after the relay diagnosis is understood.', discoveryHint: 'Diagnose the workshop relay while Ivo is still there.', sourceScene: 'ivo-relay-confession' },
  { id: 'mem-mara-oath', kind: 'memory', name: "Mara's oath", shortName: 'MARA OATH', description: 'You remember Mara choosing the archive over the director.', journal: 'Mara promised to open the chronal housing if the signed order could be proved.', lead: 'Return the red ledger to Mara before the Records shutter closes.', discoveryHint: 'Find the ledger and bring it to Mara in the Atrium.', sourceScene: 'mara-ledger-oath' },
  { id: 'mem-jun-promise', kind: 'memory', name: "Jun's promise", shortName: 'JUN PROMISE', description: 'You remember Jun promising to keep the ceremony crowd clear.', journal: 'Jun will reroute the Gallery delivery when you prevent the display from falling.', lead: 'The Gallery display is loose during the first half of the loop.', discoveryHint: 'Help Jun in the Gallery before the warning lamps activate.', sourceScene: 'jun-gallery-promise' },
  { id: 'obj-ceramic-link', kind: 'object', name: 'Ceramic link', shortName: 'CERAMIC LINK', description: 'A physical relay component carried through the reset.', journal: 'A heatproof link can replace the cracked bypass piece.', lead: 'Ivo keeps the spare in a cabinet keyed to a correct diagnosis.', discoveryHint: 'Diagnose the relay, then open Ivo’s cabinet.', sourceScene: 'ivo-cabinet' },
  { id: 'obj-witness-key', kind: 'object', name: 'Witness key', shortName: 'WITNESS KEY', description: 'The brass key that opens the sealed chronal housing.', journal: 'Mara carries the witness key into the Vault at 11:58.', lead: 'The key can be taken without breaking the housing.', discoveryHint: 'Reach the Vault while Mara is inside.', sourceScene: 'vault-handoff' },
  { id: 'obj-chronal-shard', kind: 'object', name: 'Chronal shard', shortName: 'CHRONAL SHARD', description: 'A dangerous core fragment that can sever the loop.', journal: 'The shard is only exposed after the witness housing is opened.', lead: 'Open the housing first; the shard cannot be taken from the baseline world.', discoveryHint: 'Use the witness key, then remove the exposed shard.', sourceScene: 'shard-removal' },
  { id: 'clue-bell-phase', kind: 'clue', name: 'Bell phase', shortName: 'BELL PHASE', description: 'The third chime is the only safe cutoff window.', journal: 'The roof ammeter shows the relay is safe to interrupt on the third chime.', lead: 'The rehearsal and the scorched ammeter describe the same three-beat pattern.', discoveryHint: 'Watch the rehearsal from the Roof and inspect the ammeter.', sourceScene: 'roof-ammeter' },
  { id: 'clue-senn-order', kind: 'clue', name: "Senn's order", shortName: 'SENN ORDER', description: 'A signed instruction proves the bypass was deliberate.', journal: 'Director Senn ordered Ivo to bypass the damaged relay for the ceremony.', lead: 'Mara’s argument and the red ledger complete the same missing sentence.', discoveryHint: 'Overhear Senn in the Atrium, then inspect the red ledger.', sourceScene: 'senn-order' },
  { id: 'clue-vault-map', kind: 'clue', name: 'Vault map', shortName: 'VAULT MAP', description: 'The false wall reveals the isolation channel around the capsule.', journal: 'The old floor plan shows a way to isolate the capsule without stabilizing it.', lead: 'The Records floor plan and the Vault wall must be read in one loop.', discoveryHint: 'Inspect the floor plan, then search the Vault wall.', sourceScene: 'vault-map' },
];

const actions: ActionDefinition[] = [
  { id: 'inspect-ammeter', label: 'INSPECT SCORCHED AMMETER', roomId: 'roof', cost: 1, description: 'Read the needle before the next chime.', echoText: 'The ammeter needle still points to the third-chime window.', availableWhen: all(room('roof'), tick(1, 6)), effects: [discover('clue-bell-phase'), { op: 'masterScene', sceneId: 'roof-rehearsal' }, log('The ammeter burns a three-beat pattern into your memory.', 'clue')] },
  { id: 'overhear-order', label: 'LISTEN TO THE ATRIUM ARGUMENT', roomId: 'atrium', cost: 1, description: 'Senn is arguing with Mara by the ceremony plinth.', echoText: 'Senn’s order is still audible beneath the bell rehearsal.', availableWhen: all(room('atrium'), tick(1, 4), actorAt('senn', 'atrium'), actorAt('mara', 'atrium')), effects: [discover('clue-senn-order'), { op: 'masterScene', sceneId: 'senn-argument' }, log('Senn says the bypass must remain in place until noon.', 'clue')] },
  { id: 'take-ledger', label: 'TAKE THE RED LEDGER', roomId: 'records', cost: 1, description: 'Lift the ledger before the shutter closes.', echoText: 'The red ledger is where Mara left it.', availableWhen: all(room('records'), tick(0, 4)), effects: [{ op: 'addItem', itemId: 'red-ledger' }, { op: 'placeItem', itemId: 'red-ledger', roomId: '' }, log('The ledger is heavier than it should be.', 'object')] },
  { id: 'return-ledger', label: 'RETURN LEDGER TO MARA', roomId: 'atrium', cost: 1, description: 'Give Mara the evidence she hid.', echoText: 'Mara takes the ledger without looking at the signature.', availableWhen: all(room('atrium'), item('red-ledger'), actorAt('mara', 'atrium')), effects: [{ op: 'removeItem', itemId: 'red-ledger' }, discover('mem-mara-oath'), { op: 'masterScene', sceneId: 'mara-ledger-oath' }, log('Mara stops defending the director and starts defending the archive.', 'memory')] },
  { id: 'help-jun', label: 'CATCH THE GALLERY DISPLAY', roomId: 'gallery', cost: 1, description: 'Keep the display from falling on Jun.', echoText: 'The display wobbles; your hand is already there.', availableWhen: all(room('gallery'), tick(0, 4), actorAt('jun', 'gallery')), effects: [{ op: 'setFlag', key: 'junSafe', value: true }, discover('mem-jun-promise'), { op: 'masterScene', sceneId: 'jun-gallery-promise' }, log('Jun promises to keep the crowd clear next time.', 'memory')] },
  { id: 'inspect-relay', label: 'DIAGNOSE WORKSHOP RELAY', roomId: 'workshop', cost: 1, description: 'Compare the cracked bypass with the bell phase.', echoText: 'The bypass is cracked exactly where the third chime peaks.', availableWhen: all(room('workshop'), tick(0, 4)), effects: [{ op: 'setFlag', key: 'relayDiagnosed', value: true }, log('The relay is not failing randomly; it is being overdriven.', 'info')] },
  { id: 'talk-ivo', label: 'RECALL THE CUTOFF TO IVO', roomId: 'workshop', cost: 1, description: 'Tell Ivo what you remember about the manual cutoff.', echoText: 'Ivo believes you before you finish the sentence.', availableWhen: all(room('workshop'), tick(0, 3), actorAt('ivo', 'workshop'), flag('relayDiagnosed'), anchor('clue-bell-phase')), effects: [discover('mem-ivo-confession'), { op: 'masterScene', sceneId: 'ivo-relay-confession' }, log('Ivo shows you the roof cutoff and asks you to remember it.', 'memory')] },
  { id: 'open-cabinet', label: 'OPEN IVO’S RELAY CABINET', roomId: 'workshop', cost: 1, description: 'Take the heatproof spare.', echoText: 'The cabinet opens on the diagnosis you already carry.', availableWhen: all(room('workshop'), tick(0, 4), flag('relayDiagnosed'), any(anchor('clue-bell-phase'), anchor('mem-ivo-confession')), { op: 'not', condition: item('ceramic-link') }), effects: [{ op: 'addItem', itemId: 'ceramic-link' }, { op: 'placeItem', itemId: 'ceramic-link', roomId: '' }, discover('obj-ceramic-link'), { op: 'masterScene', sceneId: 'ivo-cabinet' }, log('The ceramic link is warm, but intact.', 'object')] },
  { id: 'inspect-floorplan', label: 'INSPECT OLD FLOOR PLAN', roomId: 'records', cost: 1, description: 'Trace the original isolation channel.', echoText: 'The false wall is marked in the old floor plan.', availableWhen: all(room('records'), tick(0, 4)), effects: [{ op: 'setFlag', key: 'floorplanRead', value: true }, log('A pencil line runs behind the Vault wall.', 'clue')] },
  { id: 'search-false-wall', label: 'SEARCH VAULT FALSE WALL', roomId: 'vault', cost: 1, description: 'Follow the line from the old floor plan.', echoText: 'The false wall opens onto an isolation channel.', availableWhen: all(room('vault'), tick(1, 7), flag('floorplanRead')), effects: [discover('clue-vault-map'), { op: 'masterScene', sceneId: 'vault-map' }, log('The capsule has an isolation channel built into its foundation.', 'clue')] },
  { id: 'take-witness-key', label: 'TAKE THE WITNESS KEY', roomId: 'vault', cost: 1, description: 'Use the quiet moment while Mara checks the housing.', echoText: 'The brass key is waiting beside the housing.', availableWhen: all(room('vault'), tick(5, 8), actorAt('mara', 'vault'), { op: 'not', condition: item('witness-key') }), effects: [{ op: 'addItem', itemId: 'witness-key' }, discover('obj-witness-key'), { op: 'masterScene', sceneId: 'vault-handoff' }, log('The witness key leaves the housing without a sound.', 'object')] },
  { id: 'open-housing', label: 'OPEN CHRONAL HOUSING', roomId: 'vault', cost: 1, description: 'Unlock the sealed core with the witness key.', echoText: 'The brass key turns; the unstable shard is exposed.', availableWhen: all(room('vault'), tick(5, 9), item('witness-key')), effects: [{ op: 'removeItem', itemId: 'witness-key' }, { op: 'addItem', itemId: 'chronal-shard' }, discover('obj-chronal-shard'), { op: 'setFlag', key: 'housingOpen', value: true }, log('The housing opens around a fragment of humming time.', 'object')] },
  { id: 'install-link', label: 'INSTALL CERAMIC LINK', roomId: 'workshop', cost: 1, description: 'Replace the cracked bypass before the arc begins.', echoText: 'The ceramic link seats cleanly in the repaired relay.', availableWhen: all(room('workshop'), tick(1, 8), item('ceramic-link'), anchor('mem-ivo-confession')), effects: [{ op: 'removeItem', itemId: 'ceramic-link' }, { op: 'setFlag', key: 'relayRepaired', value: true }, log('The repaired relay hums instead of screaming.', 'success')] },
  { id: 'arm-cutoff', label: 'ARM MANUAL CUTOFF', roomId: 'roof', cost: 1, description: 'Set the cutoff for the safe third chime.', echoText: 'The cutoff waits for the third chime.', availableWhen: all(room('roof'), tick(2, 8), anchor('clue-bell-phase'), flag('relayRepaired')), effects: [{ op: 'setFlag', key: 'cutoffArmed', value: true }, log('The cutoff is armed for the safe phase.', 'success')] },
  { id: 'pull-cutoff', label: 'PULL CUTOFF ON THIRD CHIME', roomId: 'roof', cost: 1, description: 'Trust the memory and the ammeter.', echoText: 'On the third chime, the tower goes quiet.', availableWhen: all(room('roof'), tick(3, 9), anchor('mem-ivo-confession'), anchor('clue-bell-phase'), flag('cutoffArmed'), actorAt('ivo', 'roof')), effects: [{ op: 'finishEpisode', endingId: 'mend-bell' }] },
  { id: 'broadcast-order', label: 'BROADCAST THE SIGNED ORDER', roomId: 'atrium', cost: 1, description: 'Put the evidence on the ceremony feed.', echoText: 'The signed order fills the ceremony screens.', availableWhen: all(room('atrium'), tick(5, 9), anchor('mem-mara-oath'), anchor('clue-senn-order'), flag('housingOpen')), effects: [{ op: 'finishEpisode', endingId: 'open-record' }] },
  { id: 'remove-shard', label: 'REMOVE SHARD THROUGH ISOLATION CHANNEL', roomId: 'vault', cost: 1, description: 'End the loop by severing the capsule core.', echoText: 'The shard leaves the pulse path and the loop releases you.', availableWhen: all(room('vault'), tick(5, 9), anchor('mem-jun-promise'), anchor('clue-vault-map'), item('chronal-shard'), flag('housingOpen')), effects: [{ op: 'finishEpisode', endingId: 'break-capsule' }] },
];

const scheduledEvents: ScheduledEvent[] = [
  { id: 'rehearsal', tick: 3, text: 'The bell performs a three-chime rehearsal. The roof ammeter flashes.', kind: 'warning' },
  { id: 'brownout', tick: 4, text: 'Workshop power browns out. Ivo looks toward the Roof.', kind: 'warning' },
  { id: 'shutter', tick: 5, text: 'The Records shutter closes with the red ledger still inside.', kind: 'warning' },
  { id: 'vault-entry', tick: 6, text: 'Mara enters the Vault with the witness key.', kind: 'info' },
  { id: 'arc', tick: 7, text: 'The bypass relay begins to arc. Warning lamps wake.', kind: 'warning' },
  { id: 'lamps', tick: 8, text: 'The ceremony lamps activate. Unprepared staff abandon their posts.', kind: 'warning' },
];

const endings: EndingDefinition[] = [
  { id: 'mend-bell', title: 'MEND THE BELL', summary: ['The third chime arrives. Ivo pulls the cutoff.', 'The archive survives, and the tower finally goes quiet.', 'Some truths remain in the records, waiting for another episode.'], requiredAnchors: ['mem-ivo-confession', 'obj-ceramic-link', 'clue-bell-phase'] },
  { id: 'open-record', title: 'OPEN THE RECORD', summary: ['Mara opens the housing and Rowan takes the ceremony feed.', 'Senn’s signed order becomes public before the pulse can fire.', 'The archive survives with its history intact.'], requiredAnchors: ['mem-mara-oath', 'obj-witness-key', 'clue-senn-order'] },
  { id: 'break-capsule', title: 'BREAK THE CAPSULE', summary: ['Jun clears the crowd. Rowan finds the isolation channel.', 'The chronal shard leaves the pulse path and the loop releases you.', 'The archive loses its miracle, but nobody has to live it again.'], requiredAnchors: ['mem-jun-promise', 'obj-chronal-shard', 'clue-vault-map'] },
];

const leads: LeadDefinition[] = [
  { id: 'bell', title: 'THE BELL PHASE', levels: ['Watch the rehearsal from the Roof.', 'The ammeter and the third chime describe the same window.', 'Anchor BELL PHASE, then repair the relay and arm the cutoff.'] },
  { id: 'order', title: 'THE SIGNED ORDER', levels: ['Listen to the argument in the Atrium.', 'The red ledger completes what Senn says aloud.', 'Anchor SENN ORDER and use Mara’s oath to broadcast it.'] },
  { id: 'vault', title: 'THE ISOLATION CHANNEL', levels: ['Look at the old floor plan in Records.', 'The Vault wall follows the pencil line.', 'Anchor VAULT MAP, then bring the chronal shard through the channel.'] },
];

export const THE_LAST_BELL: EpisodeDefinition = {
  id: 'the-last-bell',
  title: 'THE LAST BELL',
  synopsis: ['At 11:55 the Meridian Archive prepares to open a century-old time capsule.', 'At noon the bell turns the ceremony into a destructive pulse.', 'Keep three truths. Rewrite five minutes.'],
  loopTicks: 10,
  startRoom: 'atrium',
  rooms,
  actors,
  items,
  anchors,
  actions,
  scheduledEvents,
  endings,
  leads,
};

export const EPISODES: EpisodeDefinition[] = [THE_LAST_BELL];
