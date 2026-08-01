import { CASES, EVIDENCE, PRECEDENTS, advocateById, caseById, evidenceById, judgeById, precedentById } from './content';
import { previewHearing } from './evaluator';
import type { ActiveCase, Command, CommandResult, DocketChoice, GameState, HearingState, Rank } from './types';

function hashSeed(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}
function nextRandom(streams: GameState['rng'], stream: keyof GameState['rng']): number {
  let value = (streams[stream] + 0x6d2b79f5) >>> 0;
  let t = value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  streams[stream] = value;
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}
function pick<T>(items: readonly T[], random: number): T | undefined { return items[Math.floor(random * items.length)]; }
function initialHearing(state: GameState): HearingState { return { index: 0, rolled: [], rerollsRemaining: maxRerolls(state), assignments: [] }; }
function maxRerolls(state: GameState): number { return state.advocateId === 'three-ferrets' ? 3 : 2; }
function cleanSeed(seed: number): number { return (seed >>> 0) || 1; }

export function createState(seed = Date.now()): GameState {
  const clean = cleanSeed(seed);
  return {
    version: 1, seed: clean, rng: { docket: hashSeed(clean, 11), roll: hashSeed(clean, 29), reward: hashSeed(clean, 47), shop: hashSeed(clean, 71), flavor: hashSeed(clean, 101) },
    phase: 'start', advocateId: null, circuit: 1, caseNumber: 0, standing: 12, maxStanding: 12, fees: 2,
    dice: [], evidencePortfolio: [], precedentIds: [], docket: [], activeCase: null, rewardOptions: [], chambersUsed: false, pendingPreview: null, history: [],
    notice: 'THE COURT IS IN SESSION. SOMEONE HAS FILED A MOTION AGAINST GRAVITY.',
  };
}

function ordinaryChoices(state: GameState, landmark: boolean): DocketChoice[] {
  const seen = new Set(state.history.map(item => item.caseId));
  const pool = CASES.filter(item => item.circuit === state.circuit && item.landmark === landmark && !seen.has(item.id));
  const choices: DocketChoice[] = [];
  const mutable = [...pool];
  while (mutable.length && choices.length < (landmark ? 1 : 2)) {
    const item = mutable.splice(Math.floor(nextRandom(state.rng, 'docket') * mutable.length), 1)[0];
    const judgeId = pick(item.judgeIds, nextRandom(state.rng, 'docket')) ?? item.judgeIds[0]!;
    choices.push({ id: `${item.id}-${judgeId}`, caseId: item.id, judgeId, burden: item.burden, pressure: [...item.pressure], landmark: item.landmark });
  }
  return choices;
}
function beginDocket(state: GameState, landmark: boolean): void {
  state.docket = ordinaryChoices(state, landmark);
  state.phase = 'docket';
  state.notice = landmark ? 'LANDMARK DOCKET: THE COURT HAS STOPPED PRETENDING TO BE NORMAL.' : 'SELECT A DOCKET. THE BENCH RULE IS DISCLOSED BEFORE YOU FILE.';
}
function createActiveCase(state: GameState, choice: DocketChoice): ActiveCase | null {
  const definition = caseById(choice.caseId);
  if (!definition) return null;
  return { definitionId: choice.caseId, judgeId: choice.judgeId, interpretationId: judgeById(choice.judgeId)?.defaultInterpretation.id ?? '', burden: choice.burden, pressure: [...choice.pressure], contemptLimit: definition.contemptLimit, argument: 0, contempt: 0, selectedEvidenceIds: [], admittedEvidenceIds: [], hearing: initialHearing(state) };
}
function advanceToNextNode(state: GameState): void {
  if (state.history.length >= 9) { state.phase = 'ending'; state.notice = 'THE FINAL OPINION IS ENTERED. THE COURT SURVIVES ITS OWN REFLECTION.'; return; }
  const completedInCircuit = state.history.length % 3;
  if (completedInCircuit === 0) { state.circuit = Math.min(3, state.circuit + 1) as 1 | 2 | 3; state.phase = 'circuitReport'; state.notice = `CIRCUIT ${state.circuit - 1} CLOSED. THE NEXT BENCH IS ALREADY OBJECTING.`; return; }
  beginDocket(state, completedInCircuit === 2);
}
function resetHearing(state: GameState): void {
  if (!state.activeCase) return;
  state.activeCase.hearing = initialHearing(state);
  state.pendingPreview = null;
  state.phase = 'hearing';
  state.notice = `HEARING ${state.activeCase.hearing.index + 1}: ROLL THE RECORD.`;
}
function addRewardOptions(state: GameState): void {
  const available = PRECEDENTS.filter(item => !state.precedentIds.includes(item.id));
  const options: string[] = [];
  const pool = [...available];
  while (pool.length && options.length < 3) options.push(pool.splice(Math.floor(nextRandom(state.rng, 'reward') * pool.length), 1)[0]!.id);
  state.rewardOptions = options;
}

function error(state: GameState, message: string): CommandResult { return { state, events: [], error: message }; }

export function applyCommand(state: GameState, command: Command): CommandResult {
  const events: string[] = [];
  switch (command.type) {
    case 'startCampaign': {
      const fresh = createState(command.seed ?? state.seed); fresh.phase = 'advocateSelect'; fresh.notice = 'CHOOSE YOUR ADVOCATE. THE COURT WILL REMEMBER YOUR STYLE.'; return { state: fresh, events: ['start'] };
    }
    case 'startTutorial': {
      const fresh = createState(state.seed); fresh.advocateId = 'ada-brief'; const advocate = advocateById('ada-brief')!; fresh.dice = advocate.dice.map(item => ({ ...item, faces: item.faces.map(face => ({ ...face })) as typeof item.faces })); fresh.evidencePortfolio = [...advocate.startingEvidence]; fresh.maxStanding = advocate.standing; fresh.standing = advocate.standing; fresh.phase = 'docket'; fresh.notice = 'TUTORIAL: CHOOSE THE MOON DOCKET. THE FIRST THREE HEARINGS ARE SCRIPTED BY THE CLERK.'; fresh.docket = [{ id: 'moon-pendulum', caseId: 'moon', judgeId: 'pendulum', burden: 12, pressure: [1, 1, 2], landmark: false }]; return { state: fresh, events: ['tutorial'] };
    }
    case 'restart': return { state: createState(command.seed ?? state.seed), events: ['restart'] };
    case 'chooseAdvocate': {
      if (state.phase !== 'advocateSelect') return error(state, 'Advocate selection is closed.');
      const advocate = advocateById(command.advocateId); if (!advocate) return error(state, 'Unknown advocate.');
      state.advocateId = advocate.id; state.dice = advocate.dice.map(item => ({ ...item, faces: item.faces.map(face => ({ ...face })) as typeof item.faces })); state.evidencePortfolio = [...advocate.startingEvidence]; state.maxStanding = advocate.standing; state.standing = advocate.standing; beginDocket(state, false); events.push('advocate'); break;
    }
    case 'chooseDocket': {
      if (state.phase !== 'docket') return error(state, 'No docket is open.');
      const choice = state.docket.find(item => item.id === command.choiceId); if (!choice) return error(state, 'That docket is not available.');
      state.activeCase = createActiveCase(state, choice); if (!state.activeCase) return error(state, 'Docket data is invalid.'); state.pendingPreview = null; state.rewardOptions = []; state.caseNumber = state.history.length + 1; state.phase = 'briefing'; state.notice = 'READ THE PREMISE. FILE A MOTION OR ACCEPT THE DEFAULT INTERPRETATION.'; events.push('docket'); break;
    }
    case 'chooseInterpretation': {
      if (state.phase !== 'briefing' || !state.activeCase) return error(state, 'No bench interpretation is awaiting a choice.');
      const judge = judgeById(state.activeCase.judgeId); if (!judge) return error(state, 'Judge data is invalid.');
      const interpretation = [judge.defaultInterpretation, judge.alternateInterpretation].find(item => item.id === command.interpretationId); if (!interpretation) return error(state, 'Interpretation is not offered.');
      if (interpretation.fee > 0) { if (state.fees < interpretation.fee) return error(state, 'Not enough Fees to file that motion.'); state.fees -= interpretation.fee; }
      state.activeCase.interpretationId = interpretation.id; state.phase = 'evidenceSelect'; state.notice = 'SELECT FOUR EXHIBITS. THE BENCH HAS SEEN YOUR MOTION.'; events.push('motion'); break;
    }
    case 'toggleEvidence': {
      if (state.phase !== 'evidenceSelect' || !state.activeCase || !state.evidencePortfolio.includes(command.evidenceId)) return error(state, 'That exhibit is not in the portfolio.');
      const selected = state.activeCase.selectedEvidenceIds; const index = selected.indexOf(command.evidenceId); if (index >= 0) selected.splice(index, 1); else if (selected.length < 4) selected.push(command.evidenceId); else return error(state, 'The case file has four exhibit slots.'); break;
    }
    case 'confirmCaseFile': {
      if (state.phase !== 'evidenceSelect' || !state.activeCase) return error(state, 'Select a case file first.');
      if (state.activeCase.selectedEvidenceIds.length !== 4) return error(state, 'Exactly four exhibits must be selected.');
      state.phase = 'hearing'; state.activeCase.hearing = initialHearing(state); state.notice = 'ROLL FIVE DICE. LOCK GOOD RESULTS. RISK THE REST.'; events.push('case-file'); break;
    }
    case 'roll': {
      if (state.phase !== 'hearing' || !state.activeCase || state.activeCase.hearing.rolled.length) return error(state, 'The dice are already on the table.');
      state.activeCase.hearing.rolled = state.dice.map(die => ({ dieId: die.id, faceIndex: Math.floor(nextRandom(state.rng, 'roll') * die.faces.length), rerollCount: 0, marked: false })); events.push('roll'); break;
    }
    case 'toggleRerollMark': {
      if (state.phase !== 'hearing' || !state.activeCase) return error(state, 'No hearing is active.');
      const rolled = state.activeCase.hearing.rolled.find(item => item.dieId === command.dieId); if (!rolled) return error(state, 'That die has not been rolled.'); rolled.marked = !rolled.marked; break;
    }
    case 'rerollMarked': {
      if (state.phase !== 'hearing' || !state.activeCase) return error(state, 'No hearing is active.');
      const hearing = state.activeCase.hearing; if (!hearing.rolled.length || !hearing.rolled.some(item => item.marked)) return error(state, 'Mark at least one die first.'); if (hearing.rerollsRemaining <= 0) return error(state, 'No rerolls remain.');
      const dieMap = new Map(state.dice.map(die => [die.id, die])); for (const rolled of hearing.rolled) if (rolled.marked) { const die = dieMap.get(rolled.dieId); if (die) { rolled.faceIndex = Math.floor(nextRandom(state.rng, 'roll') * die.faces.length); rolled.rerollCount++; rolled.marked = false; } } hearing.rerollsRemaining--; events.push('reroll'); break;
    }
    case 'assignDie': {
      if (state.phase !== 'hearing' || !state.activeCase) return error(state, 'No hearing is active.');
      const hearing = state.activeCase.hearing; if (!hearing.rolled.some(item => item.dieId === command.assignment.dieId)) return error(state, 'That die is not rolled.'); if (hearing.assignments.some(item => item.dieId === command.assignment.dieId)) return error(state, 'That die is already assigned.'); if (hearing.assignments.some(item => JSON.stringify(item.target) === JSON.stringify(command.assignment.target))) return error(state, 'That slot is already occupied.'); hearing.assignments.push(command.assignment); break;
    }
    case 'unassignDie': {
      if (!state.activeCase || state.phase !== 'hearing') return error(state, 'No hearing is active.'); state.activeCase.hearing.assignments = state.activeCase.hearing.assignments.filter(item => item.dieId !== command.dieId); break;
    }
    case 'commitHearing': {
      if (state.phase !== 'hearing' || !state.activeCase) return error(state, 'No hearing is ready to commit.'); const preview = previewHearing(state); if (!preview.legal) return error(state, preview.error ?? 'The filing is incomplete.');
      state.pendingPreview = preview; state.activeCase.argument = preview.finalArgument; state.activeCase.contempt = preview.finalContempt; state.activeCase.admittedEvidenceIds.push(...preview.admittedEvidenceIds); state.notice = preview.trace[preview.trace.length - 1] ?? 'THE CLERK RECORDS THE HEARING.';
      if (preview.outcome === 'continue') { state.phase = 'hearingResult'; events.push('hearing'); }
      else { const won = preview.outcome === 'win'; state.history.push({ caseId: state.activeCase.definitionId, judgeId: state.activeCase.judgeId, won, sanctioned: preview.outcome === 'sanction', argument: preview.finalArgument, contempt: preview.finalContempt }); if (won) { state.fees += 2 + state.circuit; if (preview.finalContempt === 0 && state.activeCase.hearing.index < state.activeCase.pressure.length - 1) state.fees++; state.notice = 'VERDICT: THE COURT ACCEPTS YOUR ABSURDITY.'; } else { const damage = preview.outcome === 'sanction' ? 4 : Math.min(5, 2 + Math.ceil(Math.max(0, state.activeCase.burden - preview.finalArgument) / 5)); state.standing = Math.max(0, state.standing - damage); state.notice = state.standing > 0 ? `CASE LOST. STANDING -${damage}.` : 'STANDING EXHAUSTED. THE CLERK HAS RUN OUT OF SYMPATHY.'; } state.phase = state.standing <= 0 ? 'gameOver' : 'caseResult'; events.push(won ? 'win' : 'loss'); }
      break;
    }
    case 'continueAfterHearing': if (state.phase !== 'hearingResult') return error(state, 'No hearing result is waiting.'); resetHearing(state); break;
    case 'continueAfterCase': {
      if (state.phase !== 'caseResult' && state.phase !== 'circuitReport') return error(state, 'No case report is waiting.');
      if (state.phase === 'circuitReport') { beginDocket(state, false); break; }
      const result = state.pendingPreview; if (result?.outcome === 'win') { addRewardOptions(state); state.phase = 'precedentDraft'; state.notice = 'THE WINNING OPINION IS YOURS TO ADOPT, DISTINGUISH, OR OVERRULE.'; } else { state.chambersUsed = false; state.phase = 'chambers'; state.notice = 'CHAMBERS: BUY ONE SERVICE OR LEAVE THE BUILDING ALONE.'; } break;
    }
    case 'choosePrecedent': {
      if (state.phase !== 'precedentDraft' || !state.rewardOptions.includes(command.precedentId)) return error(state, 'That Opinion is not on the table.');
      if (state.precedentIds.length >= 4) state.precedentIds.shift(); state.precedentIds.push(command.precedentId); state.chambersUsed = false; state.phase = 'chambers'; state.notice = `ADOPTED: ${precedentById(command.precedentId)?.name ?? command.precedentId}.`; events.push('precedent'); break;
    }
    case 'distinguishOpinions': if (state.phase !== 'precedentDraft') return error(state, 'No Opinions are waiting.'); state.fees += 2; state.chambersUsed = false; state.phase = 'chambers'; state.notice = 'DISTINGUISHED. THE COURT WILL PAY YOU TO PRETEND THIS WAS DELIBERATE.'; break;
    case 'reorderPrecedent': {
      if (state.phase !== 'chambers' || command.from < 0 || command.from >= state.precedentIds.length || command.to < 0 || command.to >= state.precedentIds.length) return error(state, 'Invalid precedent position.'); const [id] = state.precedentIds.splice(command.from, 1); state.precedentIds.splice(command.to, 0, id!); break;
    }
    case 'chooseChambersService': {
      if (state.phase !== 'chambers' || state.chambersUsed) return error(state, 'Chambers has already handled your request.');
      const service = command.serviceId;
      if (service === 'heal' && state.fees >= 3) { state.fees -= 3; state.standing = Math.min(state.maxStanding, state.standing + 2); }
      else if (service === 'polish' && state.fees >= 2) { const die = state.dice.find(item => item.faces.some(face => face.symbol !== 'gaffe' && face.rank < 3)); const target = die?.faces.find(face => face.symbol !== 'gaffe' && face.rank < 3); if (!die || !target) return error(state, 'No face can be polished.'); state.fees -= 2; target.rank = Math.min(3, target.rank + 1) as Rank; }
      else if (service === 'expunge' && state.fees >= 4) { const die = state.dice.find(item => item.faces.some(face => face.symbol === 'gaffe')); const target = die?.faces.find(face => face.symbol === 'gaffe'); if (!die || !target) return error(state, 'No Gaffe face remains.'); state.fees -= 4; target.symbol = 'fact'; target.rank = 1; }
      else if (service === 'evidence' && state.fees >= 2) { const candidate = EVIDENCE.find(item => !state.evidencePortfolio.includes(item.id)); if (!candidate) return error(state, 'No new Evidence is available.'); state.fees -= 2; state.evidencePortfolio[state.evidencePortfolio.length - 1] = candidate.id; }
      else return error(state, 'Not enough Fees or an unknown service.');
      state.chambersUsed = true; state.notice = `CHAMBERS FILED: ${service.toUpperCase()}.`; events.push('chambers'); break;
    }
    case 'leaveChambers': if (state.phase !== 'chambers') return error(state, 'Chambers is not open.'); advanceToNextNode(state); break;
    default: break;
  }
  return { state, events };
}

export function currentDocketCase(state: GameState) { return state.activeCase ? caseById(state.activeCase.definitionId) : undefined; }
export function currentJudge(state: GameState) { return state.activeCase ? judgeById(state.activeCase.judgeId) : undefined; }
export function currentEvidence(state: GameState) { return state.activeCase?.selectedEvidenceIds.map(id => evidenceById(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? []; }
