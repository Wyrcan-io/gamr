import { BRIEF, CALLERS, CANDIDATES, EVIDENCE, ROUND_OFFERS, TRACKS, TRACK_OFFERS, candidatesFor } from './content';
import { CLOCKS, FACTIONS, type Candidate, type CallerDefinition, type ClaimSlot, type Command, type CommandResult, type ConfidenceLevel, type EffectBundle, type GameEvent, type GameState, type Phase, type WorkAction } from './types';

const TRUE_CLAIMS: Record<ClaimSlot, string> = { operator: 'halcyon', method: 'forged-alert', origin: 'old-crown', objective: 'harbor-clearance' };

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function clamp(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }
function pushEvent(events: GameEvent[], kind: GameEvent['kind'], text: string): void { events.push({ kind, text }); }
function emptyFactions(): GameState['factions'] { return { nightShift: { trust: 45, perkActive: false, complicationActive: false }, rooftops: { trust: 45, perkActive: false, complicationActive: false }, blockwatch: { trust: 45, perkActive: false, complicationActive: false }, deepDial: { trust: 45, perkActive: false, complicationActive: false } }; }

export function createState(seed = Date.now()): GameState {
  const callers: GameState['callers'] = {};
  Object.keys(CALLERS).forEach(id => { callers[id] = { status: 'queued', safety: 'unknown', callback: false }; });
  return {
    version: 1, seed: seed >>> 0, mode: 'campaign', phase: 'start', round: 0, clockLabel: '00:47', signal: 58, trace: 12, credibility: 50,
    factions: emptyFactions(), callers, currentOffer: null, currentCaller: null, currentResponse: 0, trackOffer: null, currentTrack: null,
    workUnits: 0, playlist: [], dossier: { evidence: [], pinned: {}, selectedSlot: 'operator' }, flags: {}, roundReports: [], log: [...BRIEF], eventLog: [],
    countercastPreparation: 0, decoyPrepared: false, finaleClaim: null, finaleResponse: null, finaleRisk: null, outcome: null, score: 0,
    overlay: 'none', selectedIndex: 0, selectedEvidenceId: null, notice: 'THE VAN IS MOVING. THE CARRIER IS CLEAN. FOR NOW.',
  };
}

export function candidateStats(state: GameState, candidate: Candidate): { support: number; sources: number; rival: number; confidence: ConfidenceLevel } {
  const relevant = state.dossier.evidence.filter(item => item.slot === candidate.slot);
  const bySource = new Map<string, number>();
  for (const item of relevant) {
    const value = item.status === 'compromised' ? 0 : item.status === 'verified' ? item.reliability : 1;
    if (item.candidateId === candidate.id) bySource.set(item.sourceGroup, Math.max(bySource.get(item.sourceGroup) ?? 0, value));
  }
  const support = [...bySource.values()].reduce((sum, value) => sum + value, 0);
  const sources = bySource.size;
  const rivals = candidatesFor(candidate.slot).filter(other => other.id !== candidate.id);
  const rival = Math.max(0, ...rivals.map(other => candidateSupport(state, other)));
  const verifiedStrong = relevant.some(item => item.candidateId === candidate.id && item.status === 'verified' && item.reliability >= 2);
  const supported = support >= 4 && sources >= 2 && verifiedStrong;
  let confidence: ConfidenceLevel = 'open';
  if (support >= 2) confidence = 'plausible';
  if (supported) confidence = 'supported';
  if (supported && support - rival >= 2) confidence = 'proven';
  if (supported && support - rival < 2) confidence = 'contested';
  return { support, sources, rival, confidence };
}

function candidateSupport(state: GameState, candidate: Candidate): number {
  const groups = new Map<string, number>();
  state.dossier.evidence.filter(item => item.slot === candidate.slot && item.candidateId === candidate.id).forEach(item => {
    const value = item.status === 'compromised' ? 0 : item.status === 'verified' ? item.reliability : 1;
    groups.set(item.sourceGroup, Math.max(groups.get(item.sourceGroup) ?? 0, value));
  });
  return [...groups.values()].reduce((sum, value) => sum + value, 0);
}

export function confidenceFor(state: GameState, slot: ClaimSlot): ConfidenceLevel {
  const candidateId = state.dossier.pinned[slot];
  if (!candidateId) return 'open';
  const candidate = CANDIDATES.find(item => item.id === candidateId);
  return candidate ? candidateStats(state, candidate).confidence : 'open';
}

function applyBundle(state: GameState, bundle: EffectBundle, events: GameEvent[]): void {
  if (bundle.signal) state.signal = clamp(state.signal + bundle.signal);
  if (bundle.trace) state.trace = clamp(state.trace + bundle.trace);
  if (bundle.credibility) state.credibility = clamp(state.credibility + bundle.credibility);
  for (const faction of FACTIONS) {
    const delta = bundle.trust?.[faction] ?? 0;
    if (delta) {
      const before = state.factions[faction].trust;
      state.factions[faction].trust = clamp(before + delta);
      state.factions[faction].perkActive = state.factions[faction].trust >= 65;
      state.factions[faction].complicationActive = state.factions[faction].trust <= 20;
      if (before < 65 && state.factions[faction].perkActive) pushEvent(events, 'notice', `${faction.toUpperCase()} NETWORK ONLINE.`);
      if (before > 20 && state.factions[faction].complicationActive) pushEvent(events, 'notice', `${faction.toUpperCase()} TRUST COLLAPSES: THEIR HELP IS WITHHELD.`);
    }
  }
  for (const evidenceId of bundle.evidence ?? []) addEvidence(state, evidenceId, events);
  for (const flag of bundle.flags ?? []) state.flags[flag] = true;
  if (bundle.callback && state.currentCaller) state.callers[state.currentCaller].callback = true;
}

function addEvidence(state: GameState, evidenceId: string, events: GameEvent[]): void {
  if (state.dossier.evidence.some(item => item.id === evidenceId)) return;
  const definition = EVIDENCE.find(item => item.id === evidenceId);
  if (!definition) return;
  state.dossier.evidence.push({ ...clone(definition), acquiredRound: state.round });
  pushEvent(events, 'proof', `EVIDENCE: ${definition.title}.`);
}

function setOffer(state: GameState): void {
  const pair = ROUND_OFFERS[Math.min(state.round, ROUND_OFFERS.length - 1)];
  state.currentOffer = [pair[0], pair[1]];
  pair.forEach(id => { state.callers[id].status = 'offered'; });
  state.phase = 'caller';
  state.notice = 'SWITCHBOARD OPEN. CHOOSE WHO GETS THE MIC.';
}

function setTrackOffer(state: GameState): void {
  const pair = TRACK_OFFERS[Math.min(state.round, TRACK_OFFERS.length - 1)];
  state.trackOffer = [pair[0], pair[1]];
  state.phase = 'music';
  state.notice = 'THE CALL IS OVER. CHOOSE WHAT HIDES THE WORK.';
}

function applyTrack(state: GameState, trackId: string, events: GameEvent[]): void {
  const track = TRACKS[trackId];
  state.currentTrack = trackId;
  state.playlist.push(trackId);
  state.workUnits = track.workUnits;
  applyBundle(state, track.effects, events);
  state.phase = 'workbench';
  state.notice = `${track.title.toUpperCase()} ON AIR. ${track.workUnits} WORK UNIT${track.workUnits === 1 ? '' : 'S'} AVAILABLE.`;
}

function changeText(before: GameState, after: GameState): string[] {
  const changes: string[] = [];
  if (before.signal !== after.signal) changes.push(`SIG ${after.signal - before.signal >= 0 ? '+' : ''}${after.signal - before.signal}`);
  if (before.trace !== after.trace) changes.push(`TRACE ${after.trace - before.trace >= 0 ? '+' : ''}${after.trace - before.trace}`);
  if (before.credibility !== after.credibility) changes.push(`CRED ${after.credibility - before.credibility >= 0 ? '+' : ''}${after.credibility - before.credibility}`);
  return changes;
}

function endRound(state: GameState, action: WorkAction, events: GameEvent[]): void {
  const track = state.currentTrack ? TRACKS[state.currentTrack] : undefined;
  const masking = track?.masking ?? 0;
  const passive = Math.max(0, 1 + (state.signal >= 60 ? 1 : 0) + (state.signal >= 80 ? 1 : 0) + (state.signal >= 95 ? 1 : 0) - masking);
  state.trace = clamp(state.trace + passive);
  state.signal = clamp(state.signal - 2);
  state.log.push(`ROUND ${state.round + 1}: ${action.toUpperCase()} / PASSIVE TRACE +${passive}.`);
  if (state.trace >= 35 && !state.flags.trace35) { state.flags.trace35 = true; pushEvent(events, 'incident', 'DIRECTION FINDER ACTIVE: THE SEARCH TURNS TOWARD THE VAN.'); }
  if (state.trace >= 60 && !state.flags.trace60) { state.flags.trace60 = true; state.signal = clamp(state.signal - 12); pushEvent(events, 'incident', 'NARROWBAND JAMMER: SIGNAL -12.'); }
  if (state.trace >= 80 && !state.flags.trace80) { state.flags.trace80 = true; pushEvent(events, 'incident', 'VANS CLOSING: RELOCATION WOULD COST SIGNAL.'); }
  if (state.trace >= 100) {
    if (state.decoyPrepared) { state.decoyPrepared = false; state.trace = 74; pushEvent(events, 'incident', 'DECOY FIRES. THE RAID MISSES THE VAN.'); }
    else { finish(state, 'DEAD AIR — THE RAID FINDS THE VAN.', events); return; }
  }
  if (state.signal <= 0) { finish(state, 'DEAD AIR — THE CARRIER COLLAPSES.', events); return; }
  if (state.round >= (state.mode === 'tutorial' ? 2 : 8)) { state.phase = 'finaleClaim'; state.notice = '03:17 IS HERE. PIN THE CLAIM YOU CAN PROVE.'; return; }
  state.round++;
  state.clockLabel = CLOCKS[state.round];
  state.currentCaller = null; state.currentResponse = 0; state.currentTrack = null; state.trackOffer = null; state.workUnits = 0;
  setOffer(state);
}

function finish(state: GameState, outcome: string, events: GameEvent[]): void {
  state.outcome = outcome;
  state.phase = 'report';
  state.notice = outcome;
  pushEvent(events, 'ending', outcome);
}

function networkStrength(state: GameState): number {
  const average = Math.round(FACTIONS.reduce((sum, faction) => sum + state.factions[faction].trust, 0) / FACTIONS.length);
  return average + 8 * FACTIONS.filter(faction => state.factions[faction].trust >= 65).length - 8 * FACTIONS.filter(faction => state.factions[faction].trust <= 20).length;
}

function resolveFinale(state: GameState, events: GameEvent[]): void {
  const proven = (Object.keys(TRUE_CLAIMS) as ClaimSlot[]).filter(slot => state.dossier.pinned[slot] === TRUE_CLAIMS[slot] && confidenceFor(state, slot) === 'proven').length;
  const correct = (Object.keys(TRUE_CLAIMS) as ClaimSlot[]).filter(slot => state.dossier.pinned[slot] === TRUE_CLAIMS[slot]).length;
  const net = networkStrength(state);
  const claim = state.finaleClaim;
  const response = state.finaleResponse;
  let outcome = 'TRUTH IN THE STATIC — THE CITY HEARS PART OF THE PATTERN.';
  if (response === 'protect') outcome = 'SAVE THE VOICES — THE SHOW GOES DARK, BUT THE SOURCES LIVE.';
  else if (response === 'expose' && claim === 'full' && correct === 4 && proven >= 3 && state.credibility >= 50 && net >= 55 && state.signal >= 35) outcome = 'THE CITY ANSWERS BACK — NIGHTGLASS BREAKS OPEN.';
  else if (response === 'jam' && correct >= 2 && state.signal >= 65 && state.countercastPreparation >= 1 && (state.factions.deepDial.trust >= 65 || state.factions.nightShift.trust >= 65)) outcome = 'HARBOR HOLDS — THE FALSE CARRIER NEVER GETS THE LAST WORD.';
  else if (response === 'mobilize' && state.dossier.pinned.objective === TRUE_CLAIMS.objective && confidenceFor(state, 'objective') === 'proven' && state.factions.blockwatch.trust >= 55 && state.factions.nightShift.trust >= 55) outcome = 'HARBOR HOLDS — NEIGHBORS KEEP THE WARD TOGETHER.';
  else if (claim === 'full' && correct < 3) outcome = 'PANIC FREQUENCY — AN UNSUPPORTED CLAIM BURNS THE SHOW.';
  state.score = Math.max(0, 1000 + correct * 200 + proven * 150 + networkStrength(state) * 5 - state.trace * 5 + state.countercastPreparation * 20);
  finish(state, outcome, events);
}

function reject(state: GameState, message: string): CommandResult { state.notice = message; return { state, events: [], rejection: message }; }

export function applyCommand(input: GameState, command: Command): CommandResult {
  const state = clone(input);
  const events: GameEvent[] = [];
  if (command.type === 'start') {
    const fresh = createState(state.seed); fresh.mode = command.mode; fresh.phase = 'brief'; fresh.notice = command.mode === 'tutorial' ? 'INDUCTION: FOLLOW MOTH’S PROMPTS. THE FIRST THREE ROUNDS ARE SAFE.' : 'CAMPAIGN: THE CITY HAS ONE NIGHT TO HEAR YOU.'; return { state: fresh, events: [{ kind: 'notice', text: 'TRANSMITTER ARMED.' }] };
  }
  if (command.type === 'restart') { const fresh = createState(state.seed); fresh.mode = state.mode; fresh.phase = 'brief'; return { state: fresh, events: [] }; }
  if (command.type === 'toggleOverlay') { state.overlay = command.overlay; return { state, events }; }
  if (state.overlay !== 'none') return { state, events };
  if (command.type === 'continueBrief' && state.phase === 'brief') { setOffer(state); return { state, events }; }
  if (command.type === 'chooseCaller' && state.phase === 'caller' && state.currentOffer) {
    const id = state.currentOffer[command.index];
    const other = state.currentOffer[command.index === 0 ? 1 : 0];
    state.currentCaller = id; state.callers[id].status = 'aired'; state.callers[other].status = 'passed';
    state.phase = 'response'; state.notice = CALLERS[id].intro; state.selectedIndex = 0; pushEvent(events, 'choice', `ON AIR: ${CALLERS[id].alias}.`); return { state, events };
  }
  if (command.type === 'chooseResponse' && state.phase === 'response' && state.currentCaller) {
    const def = CALLERS[state.currentCaller]; const before = clone(state); const selected = def.responses[command.index]; state.currentResponse = command.index; applyBundle(state, selected.effects, events);
    state.callers[state.currentCaller].status = 'resolved'; state.callers[state.currentCaller].safety = selected.risk?.includes('exposed') ? 'exposed' : selected.effects.callback ? 'protected' : 'unknown';
    setTrackOffer(state); state.notice = selected.line; state.roundReports.push({ round: state.round + 1, caller: def.alias, response: selected.label, track: '', action: '', changes: changeText(before, state) }); return { state, events };
  }
  if (command.type === 'chooseTrack' && state.phase === 'music' && state.trackOffer) { const id = state.trackOffer[command.index]; applyTrack(state, id, events); return { state, events }; }
  if (command.type === 'selectEvidence' && state.phase === 'workbench') {
    const item = state.dossier.evidence.find(value => value.id === command.evidenceId && value.status === 'unverified');
    if (!item) return reject(state, 'THAT EVIDENCE IS NOT WAITING FOR VERIFICATION.');
    state.selectedEvidenceId = item.id; state.notice = `TARGETED: ${item.title.toUpperCase()}.`; return { state, events };
  }
  if (command.type === 'work' && state.phase === 'workbench') {
    const action = command.action; const cost: Record<WorkAction, number> = { patch: 1, scrub: 2, verify: 2, prepare: 2, skip: 0 }; const needed = cost[action];
    if (needed > state.workUnits) return reject(state, `THE TRACK ONLY LEAVES ${state.workUnits} WORK UNIT${state.workUnits === 1 ? '' : 'S'}.`);
    if (action === 'scrub' && state.factions.deepDial.trust < 45 && !state.flags.technicalLead) return reject(state, 'SCRUB NEEDS A TECHNICAL LEAD OR DEEP DIAL TRUST 45+.');
    if (action === 'verify') {
      const item = state.dossier.evidence.find(evidence => evidence.id === state.selectedEvidenceId && evidence.status === 'unverified') ?? state.dossier.evidence.find(evidence => evidence.status === 'unverified');
      if (!item) return reject(state, 'NO UNVERIFIED EVIDENCE IS WAITING ON THE BENCH.');
      item.status = 'verified'; state.selectedEvidenceId = null; state.notice = `VERIFIED: ${item.title.toUpperCase()}.`; pushEvent(events, 'proof', state.notice);
    }
    if (action === 'patch') state.signal = clamp(state.signal + 10);
    if (action === 'scrub') state.trace = clamp(state.trace - 10);
    if (action === 'prepare') { state.countercastPreparation = Math.min(2, state.countercastPreparation + 1); state.decoyPrepared = true; state.notice = 'DECOY AND COUNTERCAST PREPARED.'; }
    state.workUnits -= needed;
    const report = state.roundReports[state.roundReports.length - 1]; if (report) { report.track = state.currentTrack ? TRACKS[state.currentTrack].title : ''; report.action = action; report.changes.push(`WORK ${action.toUpperCase()}`); }
    endRound(state, action, events); return { state, events };
  }
  if (command.type === 'cyclePin') {
    const candidates = candidatesFor(command.slot); const current = state.dossier.pinned[command.slot]; const index = current ? candidates.findIndex(candidate => candidate.id === current) : -1; const next = candidates[(index + 1) % candidates.length];
    state.dossier.pinned[command.slot] = next.id; state.dossier.selectedSlot = command.slot; state.notice = `${command.slot.toUpperCase()} THEORY: ${next.label}.`; return { state, events };
  }
  if (command.type === 'chooseFinaleClaim' && state.phase === 'finaleClaim') { state.finaleClaim = command.choice; state.phase = 'finaleResponse'; state.notice = 'THE CLAIM IS SET. WHAT DOES THE SHOW DO WITH IT?'; return { state, events }; }
  if (command.type === 'chooseFinaleResponse' && state.phase === 'finaleResponse') { state.finaleResponse = command.choice; state.phase = 'finaleRisk'; state.notice = 'THE CITY IS LISTENING. CHOOSE HOW LONG TO STAY VISIBLE.'; return { state, events }; }
  if (command.type === 'chooseFinaleRisk' && state.phase === 'finaleRisk') { state.finaleRisk = command.choice; resolveFinale(state, events); return { state, events }; }
  if (command.type === 'continue' && state.phase === 'report') { state.phase = 'ending'; return { state, events }; }
  return { state, events };
}

export function currentCaller(state: GameState): CallerDefinition | undefined { return state.currentCaller ? CALLERS[state.currentCaller] : undefined; }
export function currentTrack(state: GameState): typeof TRACKS[string] | undefined { return state.currentTrack ? TRACKS[state.currentTrack] : undefined; }
export function currentOffer(state: GameState): CallerDefinition[] { return state.currentOffer ? state.currentOffer.map(id => CALLERS[id]) : []; }
export function currentTracks(state: GameState): typeof TRACKS[string][] { return state.trackOffer ? state.trackOffer.map(id => TRACKS[id]) : []; }
export function phaseIsPlaying(phase: Phase): boolean { return !['start', 'brief', 'report', 'ending'].includes(phase); }
