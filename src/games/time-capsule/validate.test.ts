import { describe, expect, it } from 'vitest';
import { THE_LAST_BELL } from './content';
import { validateEpisode } from './validate';

describe('Time Capsule content validation', () => {
  it('ships the first episode with valid references and ending triples', () => {
    expect(validateEpisode(THE_LAST_BELL)).toEqual([]);
  });

  it('reports invalid authored references', () => {
    const invalid = structuredClone(THE_LAST_BELL);
    invalid.actions[0]!.roomId = 'missing-room';
    expect(validateEpisode(invalid).some(error => error.includes('missing-room'))).toBe(true);
  });
});
