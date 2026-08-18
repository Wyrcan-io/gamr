import { describe, expect, it } from 'vitest';
import { applyCommand, createState, getQueueJobs, getPlacementValidation } from './engine';
import type { GameState } from './types';

function working(seed = 1234): GameState {
  let state = applyCommand(createState(seed), { type: 'startRun', mode: 'campaign', seed }).state;
  state = applyCommand(state, { type: 'dismissBriefing' }).state;
  return state;
}

function commandSequence(seed: number): GameState {
  let state = working(seed);
  const first = getQueueJobs(state)[0]!;
  state = applyCommand(state, { type: 'selectJob', jobId: first.id }).state;
  state = applyCommand(state, { type: 'scheduleJob' }).state;
  state = applyCommand(state, { type: 'armAdvance' }).state;
  return applyCommand(state, { type: 'advanceWindow' }).state;
}

describe('Orbital Post engine', () => {
  it('creates a deterministic briefing with a four-window forecast', () => {
    const a = applyCommand(createState(77), { type: 'startRun', mode: 'campaign', seed: 77 }).state;
    const b = applyCommand(createState(77), { type: 'startRun', mode: 'campaign', seed: 77 }).state;
    expect(a.phase).toBe('briefing');
    expect(a.weather.slice(0, 4)).toHaveLength(4);
    expect(a.weather).toEqual(b.weather);
    expect(a.jobs).toEqual(b.jobs);
  });

  it('rejects a placement that overlaps a reserved lane', () => {
    let state = working();
    const jobs = getQueueJobs(state);
    const medical = jobs.find(job => job.title === 'MEDICAL INTAKE') ?? jobs[0]!;
    state = applyCommand(state, { type: 'selectJob', jobId: medical.id }).state;
    state = applyCommand(state, { type: 'scheduleJob' }).state;
    const secondCargo = getQueueJobs(state).find(job => job.id !== medical.id && job.lanes.includes('dock'))!;
    if (secondCargo) {
      state = applyCommand(state, { type: 'selectJob', jobId: secondCargo.id }).state;
      expect(getPlacementValidation(state).valid).toBe(false);
      expect(getPlacementValidation(state).reason).toContain('LANE');
    }
  });

  it('resolves a scheduled job only after explicit arm and advance commands', () => {
    let state = working();
    const job = getQueueJobs(state)[0]!;
    state = applyCommand(state, { type: 'selectJob', jobId: job.id }).state;
    state = applyCommand(state, { type: 'scheduleJob' }).state;
    expect(state.phase).toBe('working');
    state = applyCommand(state, { type: 'advanceWindow' }).state;
    expect(state.phase).toBe('working');
    state = applyCommand(state, { type: 'armAdvance' }).state;
    state = applyCommand(state, { type: 'advanceWindow' }).state;
    expect(state.phase).toBe('windowReport');
    expect(state.reports[0]?.progressed).toContain(job.id);
  });

  it('keeps blocked work visible when there is not enough battery', () => {
    let state = working();
    state.battery = 0;
    const job = getQueueJobs(state)[0]!;
    state = applyCommand(state, { type: 'selectJob', jobId: job.id }).state;
    state = applyCommand(state, { type: 'scheduleJob' }).state;
    state = applyCommand(state, { type: 'armAdvance' }).state;
    state = applyCommand(state, { type: 'advanceWindow' }).state;
    expect(state.reports[0]?.blocked.map(item => item.jobId)).toContain(job.id);
    expect(state.jobs[job.id]?.state).toBe('blocked');
  });

  it('produces identical reports for identical command sequences', () => {
    expect(commandSequence(90210)).toEqual(commandSequence(90210));
  });

  it('adds future arrivals when the horizon advances', () => {
    let state = working();
    expect(getQueueJobs(state).some(job => job.title === 'COLONY BURST')).toBe(false);
    const job = getQueueJobs(state)[0]!;
    state = applyCommand(state, { type: 'selectJob', jobId: job.id }).state;
    state = applyCommand(state, { type: 'scheduleJob' }).state;
    state = applyCommand(state, { type: 'armAdvance' }).state;
    state = applyCommand(state, { type: 'advanceWindow' }).state;
    state = applyCommand(state, { type: 'dismissWindowReport' }).state;
    expect(getQueueJobs(state).some(job => job.title === 'COLONY BURST')).toBe(true);
  });

  it('keeps the forecast command separate from the incident log', () => {
    const state = working(17);
    const opened = applyCommand(state, { type: 'toggleLog' }).state;
    expect(opened.logOpen).toBe(true);
    expect(opened.helpOpen).toBe(false);
  });
});
