import { caseById, evidenceById, judgeById } from './content';
import type { DieFace, FaceSymbol, GameState, HearingPreview, Rank, RolledDie } from './types';

function faceFor(state: GameState, rolled: RolledDie): DieFace | undefined {
  return state.dice.find(die => die.id === rolled.dieId)?.faces[rolled.faceIndex];
}
function hasPrecedent(state: GameState, id: string, skipFirst: boolean): boolean { return (skipFirst ? state.precedentIds.slice(1) : state.precedentIds).includes(id); }
function fail(error: string): HearingPreview { return { legal: false, error, argumentDelta: 0, block: 0, pressure: 0, gaffe: 0, contemptDelta: 0, finalArgument: 0, finalContempt: 0, outcome: 'continue', admittedEvidenceIds: [], trace: [`! ${error}`] }; }

export function previewHearing(state: GameState): HearingPreview {
  const active = state.activeCase;
  if (!active) return fail('No active case.');
  const definition = caseById(active.definitionId); const judge = judgeById(active.judgeId);
  if (!definition || !judge) return fail('The docket references missing content.');
  const hearing = active.hearing;
  if (!hearing.rolled.length) return fail('Roll the dice before filing.');
  const rolled = new Map(hearing.rolled.map(item => [item.dieId, item]));
  const assignmentsByDie = new Map<string, typeof hearing.assignments[number]>();
  const targetKeys = new Set<string>();
  for (const assignment of hearing.assignments) {
    if (assignmentsByDie.has(assignment.dieId)) return fail('A die cannot appear twice in the filing.');
    const die = rolled.get(assignment.dieId); const face = die ? faceFor(state, die) : undefined;
    if (!die || !face) return fail('Every assigned die must be on the table.');
    if (face.symbol === 'gaffe') return fail('A Gaffe cannot be assigned; reroll it or leave it blank.');
    const key = assignment.target.kind === 'evidence' ? `e:${assignment.target.evidenceId}:${assignment.target.slotIndex}` : assignment.target.kind;
    if (targetKeys.has(key)) return fail('A slot already has a die.');
    targetKeys.add(key); assignmentsByDie.set(assignment.dieId, assignment);
  }
  const selected = active.selectedEvidenceIds.filter(id => !active.admittedEvidenceIds.includes(id));
  const trace: string[] = [];
  let argumentDelta = 0; let block = 0; let contemptDelta = 0; let evenUsed = false; let oddUsed = false; let nullUsed = false; let witnessUsed = false; let exactRanksUsed = false; let firstClarify = false;
  const admittedEvidenceIds: string[] = [];
  for (const evidenceId of selected) {
    const evidence = evidenceById(evidenceId); if (!evidence) return fail(`Missing Evidence: ${evidenceId}`);
    const assignments = evidence.slots.map((_, slotIndex) => hearing.assignments.find(item => item.target.kind === 'evidence' && item.target.evidenceId === evidenceId && item.target.slotIndex === slotIndex));
    const hasAny = assignments.some(Boolean);
    if (!hasAny) continue;
    if (assignments.some(item => !item)) return fail(`${evidence.name} is incomplete.`);
    let score = evidence.baseArgument; let duplicate = false; let previousSymbols: FaceSymbol[] = []; let exact = true;
    assignments.forEach((assignment, slotIndex) => {
      if (!assignment || assignment.target.kind !== 'evidence') return;
      const die = rolled.get(assignment.dieId)!; const raw = faceFor(state, die)!; let rank = raw.rank as Rank;
      if (!nullUsed && active.interpretationId === 'null-default' && rank === 1) { nullUsed = true; rank = evidence.slots[slotIndex]!.minRank; }
      if (hasPrecedent(state, 'marmot-moon', false) && raw.symbol === 'fact' && rank === 1 && !evenUsed) rank = 2;
      if (raw.symbol !== evidence.slots[slotIndex]!.symbol || rank < evidence.slots[slotIndex]!.minRank) exact = false;
      score += Math.max(0, rank - evidence.slots[slotIndex]!.minRank); if (previousSymbols.includes(raw.symbol)) duplicate = true; previousSymbols.push(raw.symbol);
      if (rank % 2 === 0 && !evenUsed) evenUsed = true; if (rank % 2 === 1 && !oddUsed) oddUsed = true;
    });
    if (!exact) return fail(`${evidence.name} has a wrong symbol or rank.`);
    if (previousSymbols.length > 1 && previousSymbols.every(symbol => symbol === previousSymbols[0])) duplicate = true;
    if (previousSymbols.length > 1 && assignments.every((item, i) => { const die = item ? rolled.get(item.dieId) : undefined; return die ? (faceFor(state, die)?.rank ?? 0) === evidence.slots[i]!.minRank : false; })) exactRanksUsed = true;
    if (evidence.effect?.kind === 'argument' && definition.tags.includes('contract')) { score += evidence.effect.amount; trace.push(`↳ ${evidence.name}: ${evidence.effect.text}`); }
    if (evidence.effect?.kind === 'block') { block += evidence.effect.amount; trace.push(`↳ ${evidence.name}: ${evidence.effect.text}`); }
    if (evidence.effect?.kind === 'reduceContempt') { contemptDelta -= evidence.effect.amount; trace.push(`↳ ${evidence.name}: ${evidence.effect.text}`); }
    if (evidence.effect?.kind === 'lastExhibit' && evidenceId === selected[selected.length - 1]) score += evidence.effect.amount;
    if (evidence.tags.some(tag => definition.tags.includes(tag))) score += 0;
    if (hasPrecedent(state, 'teapot', false) && previousSymbols.length > 1 && previousSymbols.every((_, index, list) => index === 0 || list[index - 1] === list[index])) score += 2;
    if (hasPrecedent(state, 'echo', false) && !witnessUsed && previousSymbols.includes('witness')) { score += 2; witnessUsed = true; }
    if (hasPrecedent(state, 'perpetuities', false) && evidence.slots.length === 3) score += 3;
    if (hasPrecedent(state, 'sandwich', false) && evidence.tags.includes('contract') && evidence.slots.some(slot => slot.symbol === 'fact') && evidence.slots.some(slot => slot.symbol === 'rhetoric')) score += 2;
    if (hasPrecedent(state, 'adverse-possession', false) && evidence.tags.includes('property') && admittedEvidenceIds.length === 0) score += 2;
    if (active.interpretationId === 'goose-default' && duplicate && admittedEvidenceIds.length === 0) score += 3;
    if (active.interpretationId === 'goose-alt' && duplicate) score += 1;
    argumentDelta += score; admittedEvidenceIds.push(evidenceId); trace.push(`◇ ${evidence.name} +${score} Argument`);
  }
  const clarify = hearing.assignments.find(item => item.target.kind === 'clarify');
  if (clarify) { const rolledDie = rolled.get(clarify.dieId)!; const face = faceFor(state, rolledDie)!; argumentDelta += face.rank; firstClarify = true; if (state.advocateId === 'ada-brief') argumentDelta++; if (hasPrecedent(state, 'quiet-clerk', false)) block++; trace.push(`◆ CLARIFY +${face.rank + (state.advocateId === 'ada-brief' ? 1 : 0)} Argument`); }
  const object = hearing.assignments.find(item => item.target.kind === 'object');
  if (object) { const rolledDie = rolled.get(object.dieId)!; const face = faceFor(state, rolledDie)!; if (face.symbol !== 'objection') return fail('OBJECT requires an O die.'); block += face.rank + 1; trace.push(`⊘ OBJECT ${face.rank + 1} block`); }
  if (active.interpretationId === 'pendulum-default' && evenUsed) { argumentDelta++; trace.push('§ PENDULUM +1 Argument'); }
  if (active.interpretationId === 'pendulum-alt' && oddUsed) { block++; trace.push('§ PENDULUM +1 block'); }
  if (state.advocateId === 'automaton-12b' && exactRanksUsed) { argumentDelta += 3; trace.push('§ AUTOMATON exact-rank filing +3 Argument'); }
  if (state.advocateId === 'c-gull' && block > active.pressure[hearing.index]!) { const converted = Math.min(2, block - active.pressure[hearing.index]!); argumentDelta += converted; trace.push(`§ GULL converts ${converted} excess block`); }
  const pressure = (active.pressure[hearing.index] ?? active.pressure[active.pressure.length - 1] ?? 0) + (active.interpretationId === 'null-alt' ? 1 : 0);
  if (hasPrecedent(state, 'crown', false) && block > pressure) { const converted = Math.min(3, block - pressure); argumentDelta += converted; trace.push(`¶ CROWN converts ${converted} excess block`); }
  const finalGaffeFaces = hearing.rolled.filter(item => faceFor(state, item)?.symbol === 'gaffe' && item.rerollCount > 0);
  let gaffe = finalGaffeFaces.reduce((sum, item) => sum + (state.advocateId === 'three-ferrets' && item.rerollCount >= 3 ? item.rerollCount * 2 : item.rerollCount), 0);
  if (hasPrecedent(state, 'harmless-error', false) && gaffe > 0) { gaffe--; trace.push('¶ HARMLESS ERROR ignores 1 Gaffe'); }
  const unblocked = Math.max(0, pressure - block); gaffe += unblocked; trace.push(`▲ Pressure ${pressure} - block ${block} = +${unblocked} Contempt`);
  if (hasPrecedent(state, 'clean-hands', false) && finalGaffeFaces.length === 0) contemptDelta--; if (firstClarify && hasPrecedent(state, 'quiet-clerk', false)) trace.push('¶ QUIET CLERK adds 1 block');
  if (hasPrecedent(state, 'reasonable-goose', false) && gaffe === 0) trace.push('¶ REASONABLE GOOSE approves a clean hearing');
  const finalArgument = Math.max(0, active.argument + argumentDelta); const finalContempt = Math.max(0, active.contempt + contemptDelta + gaffe);
  const outcome = finalContempt >= active.contemptLimit ? 'sanction' : finalArgument >= active.burden ? 'win' : hearing.index >= active.pressure.length - 1 ? 'timeout' : 'continue';
  trace.push(outcome === 'win' ? `✓ VERDICT WON ${finalArgument}/${active.burden}` : outcome === 'sanction' ? `× SANCTION ${finalContempt}/${active.contemptLimit}` : outcome === 'timeout' ? `× TIMEOUT ${finalArgument}/${active.burden}` : `↳ CONTINUE ${finalArgument}/${active.burden}`);
  return { legal: true, argumentDelta, block, pressure, gaffe, contemptDelta: contemptDelta + gaffe, finalArgument, finalContempt, outcome, admittedEvidenceIds, trace };
}
