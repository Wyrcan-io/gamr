import { describe, expect, it } from 'vitest';
import { applyCommand, createState } from './engine';
import { evidenceById, judgeById } from './content';
import { previewHearing } from './evaluator';

function result(state: ReturnType<typeof createState>, command: Parameters<typeof applyCommand>[1]): ReturnType<typeof createState> {
  const next = applyCommand(state, command);
  expect(next.error).toBeUndefined();
  return next.state;
}

describe('Dice Tribunal deterministic engine', () => {
  it('creates identical seeded starting states', () => {
    expect(createState(42)).toEqual(createState(42));
    expect(createState(42)).not.toEqual(createState(43));
  });

  it('opens an advocate, docket, motion, and four-exhibit case file', () => {
    let state = result(createState(42), { type: 'startCampaign', seed: 42 });
    state = result(state, { type: 'chooseAdvocate', advocateId: 'ada-brief' });
    state = result(state, { type: 'chooseDocket', choiceId: state.docket[0]!.id });
    const judge = judgeById(state.activeCase!.judgeId)!;
    state = result(state, { type: 'chooseInterpretation', interpretationId: judge.defaultInterpretation.id });
    for (const id of state.evidencePortfolio.slice(0, 4)) state = result(state, { type: 'toggleEvidence', evidenceId: id });
    state = result(state, { type: 'confirmCaseFile' });
    expect(state.phase).toBe('hearing');
    expect(state.activeCase?.selectedEvidenceIds).toHaveLength(4);
  });

  it('rolls deterministically and never mutates preview totals on a second preview', () => {
    let first = result(createState(77), { type: 'startCampaign', seed: 77 });
    first = result(first, { type: 'chooseAdvocate', advocateId: 'ada-brief' });
    first = result(first, { type: 'chooseDocket', choiceId: first.docket[0]!.id });
    const judge = judgeById(first.activeCase!.judgeId)!;
    first = result(first, { type: 'chooseInterpretation', interpretationId: judge.defaultInterpretation.id });
    for (const id of first.evidencePortfolio.slice(0, 4)) first = result(first, { type: 'toggleEvidence', evidenceId: id });
    first = result(first, { type: 'confirmCaseFile' });
    first = result(first, { type: 'roll' });
    const before = JSON.stringify(first);
    const previewA = previewHearing(first);
    const previewB = previewHearing(first);
    expect(previewA).toEqual(previewB);
    expect(JSON.stringify(first)).toBe(before);
  });

  it('rejects partial evidence assignments before commit', () => {
    let state = result(createState(9), { type: 'startCampaign', seed: 9 });
    state = result(state, { type: 'chooseAdvocate', advocateId: 'ada-brief' });
    state = result(state, { type: 'chooseDocket', choiceId: state.docket[0]!.id });
    const judge = judgeById(state.activeCase!.judgeId)!;
    state = result(state, { type: 'chooseInterpretation', interpretationId: judge.defaultInterpretation.id });
    for (const id of state.evidencePortfolio.slice(0, 4)) state = result(state, { type: 'toggleEvidence', evidenceId: id });
    state = result(state, { type: 'confirmCaseFile' });
    state = result(state, { type: 'roll' });
    let found: { dieId: string; evidenceId: string; slotIndex: number } | undefined;
    for (const die of state.activeCase!.hearing.rolled) {
      const face = state.dice.find(item => item.id === die.dieId)!.faces[die.faceIndex];
      for (const evidenceId of state.activeCase!.selectedEvidenceIds) {
        const slotIndex = evidenceById(evidenceId)!.slots.findIndex(item => item.symbol === face.symbol && item.minRank <= face.rank);
        if (slotIndex >= 0 && evidenceById(evidenceId)!.slots.length > 1) { found = { dieId: die.dieId, evidenceId, slotIndex }; break; }
      }
      if (found) break;
    }
    expect(found).toBeDefined();
    state = result(state, { type: 'assignDie', assignment: { dieId: found!.dieId, target: { kind: 'evidence', evidenceId: found!.evidenceId, slotIndex: found!.slotIndex } } });
    expect(previewHearing(state).legal).toBe(false);
  });

  it('keeps a hearing unchanged until preview confirmation', () => {
    let state = result(createState(12), { type: 'startTutorial' });
    state = result(state, { type: 'chooseDocket', choiceId: state.docket[0]!.id });
    const judge = judgeById(state.activeCase!.judgeId)!;
    state = result(state, { type: 'chooseInterpretation', interpretationId: judge.defaultInterpretation.id });
    for (const id of state.evidencePortfolio.slice(0, 4)) state = result(state, { type: 'toggleEvidence', evidenceId: id });
    state = result(state, { type: 'confirmCaseFile' });
    state = result(state, { type: 'roll' });
    const before = { argument: state.activeCase!.argument, contempt: state.activeCase!.contempt, history: state.history.length };
    state = result(state, { type: 'previewHearing' });
    expect(state.pendingPreview).not.toBeNull();
    expect({ argument: state.activeCase!.argument, contempt: state.activeCase!.contempt, history: state.history.length }).toEqual(before);
    state = result(state, { type: 'cancelPreview' });
    expect(state.pendingPreview).toBeNull();
  });
});
