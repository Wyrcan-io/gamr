import { CALLERS, CANDIDATES, EVIDENCE, ROUND_OFFERS, TRACKS, TRACK_OFFERS } from './content';

/** Lightweight authored-content checks run by tests and useful during content edits. */
export function validateContent(): string[] {
  const errors: string[] = [];
  const candidateIds = new Set(CANDIDATES.map(candidate => candidate.id));
  const evidenceIds = new Set<string>();
  for (const item of EVIDENCE) {
    if (evidenceIds.has(item.id)) errors.push(`duplicate evidence id: ${item.id}`);
    evidenceIds.add(item.id);
    if (!candidateIds.has(item.candidateId)) errors.push(`evidence ${item.id} references missing candidate ${item.candidateId}`);
  }
  for (const [id, item] of Object.entries(CALLERS)) {
    if (item.responses.length !== 2) errors.push(`caller ${id} must have two responses`);
    for (const choice of item.responses) for (const evidenceId of choice.effects.evidence ?? []) if (!evidenceIds.has(evidenceId)) errors.push(`caller ${id} references missing evidence ${evidenceId}`);
  }
  for (const [round, pair] of ROUND_OFFERS.entries()) for (const callerId of pair) if (!CALLERS[callerId]) errors.push(`round ${round} references missing caller ${callerId}`);
  for (const [round, pair] of TRACK_OFFERS.entries()) for (const trackId of pair) if (!TRACKS[trackId]) errors.push(`round ${round} references missing track ${trackId}`);
  for (const track of Object.values(TRACKS)) if (track.workUnits < 1 || track.workUnits > 3) errors.push(`track ${track.id} has invalid work units`);
  return errors;
}

export function assertValidContent(): void {
  const errors = validateContent();
  if (errors.length) throw new Error(`Night Frequency content invalid:\n${errors.join('\n')}`);
}
