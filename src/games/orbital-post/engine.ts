import { cloneTemplate, FAULTS, JOB_TEMPLATES, SHIFTS, UPGRADES, WEATHER } from './content';
import type { Command, CommandResult, Fault, GameMode, GameState, Incident, Job, JobEffect, LaneId, PlacementResult, Reservation, SupplyId, Upgrade, WeatherId, WindowReport } from './types';

const PRIORITY: Record<Job['priority'], number> = { critical: 0, urgent: 1, routine: 2 };
const clone = <T>(value: T): T => structuredClone(value);
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function hash32(text: string): number { let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number): () => number { let value = seed >>> 0; return () => { value = (value + 0x6D2B79F5) | 0; let t = Math.imul(value ^ value >>> 15, 1 | value); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function stream(seed: number, label: string, shift: number): () => number { return rng(hash32(`${seed}:${label}:${shift}`)); }
function addIncident(state: GameState, text: string, kind: Incident['kind'] = 'info', window = state.currentWindow): void { state.log = [{ window, text, kind }, ...state.log].slice(0, 12); }
function allReservations(job: Job, start: number): Reservation[] { return job.lanes.flatMap(lane => Array.from({ length: job.duration }, (_, offset) => ({ jobId: job.id, lane, window: start + offset }))); }
function activeFaults(state: GameState): Fault[] { return Object.values(state.faults).filter(fault => fault.active); }
function hasUpgrade(state: GameState, id: string): boolean { return state.upgrades.includes(id); }

function freshState(seed: number, mode: GameMode): GameState {
  return { version: 1, seed: seed >>> 0, mode, phase: 'start', shiftIndex: 0, currentWindow: 0, totalWindows: 0, weather: [], battery: 0, batteryMax: 8, integrity: 6, integrityMax: 6, standing: 0, score: 0, supplies: { spares: 0, shielding: 0, coolant: 0 }, faults: {}, jobs: {}, queueIds: [], reservations: [], selectedJobId: null, selectedStartWindow: 0, armedAdvance: false, pendingCancelJobId: null, upgrades: [], upgradeOffers: [], flags: {}, reports: [], log: [], notice: 'SELECT A FLIGHT PLAN.', helpOpen: false, logOpen: false, shiftStartSnapshot: null };
}

function pickOffers(seed: number, shiftIndex: number, owned: string[]): Upgrade[] {
  const random = stream(seed, 'offers', shiftIndex);
  return [...UPGRADES].filter(upgrade => !owned.includes(upgrade.id)).sort(() => random() - 0.5).slice(0, 3);
}

function setupShift(base: GameState, shiftIndex: number): GameState {
  const definition = base.mode === 'openOrbit' ? SHIFTS[4]! : SHIFTS[shiftIndex]!;
  const random = stream(base.seed, 'scenario', shiftIndex);
  const weather = definition.weather.map((item, index) => index === definition.weather.length - 1 && base.mode === 'openOrbit' && random() > 0.5 ? 'clear' : item);
  const jobs: Record<string, Job> = {};
  const plannedArrivals = [...definition.arrivals];
  for (const templateId of definition.optionalTemplateIds) {
    if (random() < 0.55) plannedArrivals.push({ window: Math.min(definition.windows - 2, 1 + Math.floor(random() * 3)), templateId });
  }
  const arrivals = plannedArrivals.map((arrival, index) => ({ ...arrival, index }));
  for (const arrival of arrivals) {
    const id = `${definition.id}-${arrival.templateId}-${arrival.index}`;
    const duration = JOB_TEMPLATES[arrival.templateId]?.duration ?? 1;
    const start = arrival.window;
    const deadline = Math.min(definition.windows - 1, start + (duration === 1 ? 2 : duration + 2));
    const job = cloneTemplate(arrival.templateId, id, arrival.window, start, deadline);
    jobs[id] = job;
  }
  const byTemplate = (templateId: string): Job | undefined => Object.values(jobs).find(job => job.id.includes(`-${templateId}-`));
  const guided = byTemplate('guided'); const latch = byTemplate('latch'); if (guided && latch) guided.dependencyId = latch.id;
  const fleet = byTemplate('fleet'); const calibrate = byTemplate('calibrate'); if (fleet && calibrate) fleet.dependencyId = calibrate.id;
  const faults: Record<string, Fault> = {};
  for (const faultId of definition.initialFaults) { const fault = FAULTS[faultId]; if (fault) faults[faultId] = { ...clone(fault), active: true }; }
  if (Object.keys(faults).includes('array-drift') && !byTemplate('calibrate')) {
    const index = arrivals.length + 1; const id = `${definition.id}-calibrate-${index}`; jobs[id] = cloneTemplate('calibrate', id, 0, 0, Math.min(definition.windows - 1, 4));
  }
  const queueIds = Object.values(jobs).filter(job => job.arrivalWindow <= 0).map(job => job.id);
  const next: GameState = { ...clone(base), phase: 'briefing', shiftIndex, currentWindow: 0, totalWindows: definition.windows, weather, battery: hasUpgrade(base, 'capacitors') ? 8 : 6, batteryMax: hasUpgrade(base, 'capacitors') ? 10 : 8, integrity: 6, integrityMax: 6, faults, jobs, queueIds, reservations: [], selectedJobId: queueIds[0] ?? null, selectedStartWindow: 0, armedAdvance: false, pendingCancelJobId: null, upgradeOffers: [], reports: [], log: [], flags: {}, notice: `${definition.title} // ${definition.briefing}`, helpOpen: false, logOpen: false };
  if (hasUpgrade(base, 'spare-manifold')) next.supplies.spares += 1;
  next.shiftStartSnapshot = clone({ ...next, shiftStartSnapshot: null });
  return next;
}

export function createState(seed = Date.now()): GameState { return freshState(seed >>> 0, 'campaign'); }
export function currentShift(state: GameState) { return state.mode === 'openOrbit' ? SHIFTS[4]! : SHIFTS[state.shiftIndex]!; }
export function weatherLabel(weather: WeatherId): string { return WEATHER[weather].label; }
export function laneLabel(lane: LaneId): string { return lane === 'dock' ? 'DOCK' : lane === 'eva' ? 'EVA' : 'COMMS'; }
export function jobIcon(kind: Job['kind']): string { return kind === 'cargo' ? '▣' : kind === 'repair' ? '◇' : kind === 'comms' ? '◉' : '◆'; }

function laneBlocked(state: GameState, lane: LaneId): Fault | undefined { return activeFaults(state).find(fault => fault.blocks?.includes(lane)); }
function placement(state: GameState, job: Job, start: number): PlacementResult {
  if (state.phase !== 'working') return { valid: false, reason: 'SCHEDULE ONLY WHILE WORKING.', reservations: [] };
  if (job.state === 'complete' || job.state === 'missed' || job.state === 'cancelled') return { valid: false, reason: 'JOB IS NO LONGER AVAILABLE.', reservations: [] };
  if (start < Math.max(state.currentWindow, job.earliestWindow)) return { valid: false, reason: 'START WINDOW IS TOO EARLY.', reservations: [] };
  if (start + job.duration - 1 > Math.min(state.currentWindow + 3, state.totalWindows - 1)) return { valid: false, reason: 'PLANNING HORIZON ENDS AT W+3.', reservations: [] };
  if (start + job.duration - 1 > job.deadlineWindow) return { valid: false, reason: `DEADLINE IS W${String(job.deadlineWindow + 1).padStart(2, '0')}.`, reservations: [] };
  if (job.dependencyId && state.jobs[job.dependencyId]?.state !== 'complete') return { valid: false, reason: 'DEPENDENCY NOT COMPLETE.', reservations: [] };
  for (const lane of job.lanes) { const fault = laneBlocked(state, lane); if (fault && job.kind !== 'repair') return { valid: false, reason: `${fault.name} BLOCKS ${laneLabel(lane)}.`, reservations: [] }; }
  const candidate = allReservations(job, start);
  const occupied = state.reservations.filter(reservation => reservation.jobId !== job.id);
  if (candidate.some(item => occupied.some(other => item.window === other.window && item.lane === other.lane))) return { valid: false, reason: 'A LANE IS ALREADY RESERVED.', reservations: candidate };
  return { valid: true, reason: 'SCHEDULE ACCEPTED.', reservations: candidate };
}

export function getPlacementValidation(state: GameState): PlacementResult {
  const job = state.selectedJobId ? state.jobs[state.selectedJobId] : undefined;
  return job ? placement(state, job, state.selectedStartWindow) : { valid: false, reason: 'SELECT A JOB.', reservations: [] };
}

function addArrivals(state: GameState, window: number, notices: string[]): void {
  for (const job of Object.values(state.jobs)) {
    if (job.arrivalWindow !== window || state.queueIds.includes(job.id)) continue;
    state.queueIds.push(job.id); notices.push(`NEW ORDER: ${job.title}.`); addIncident(state, `ARRIVAL · ${job.title} / ${job.client}`, 'info', window);
  }
}

function powerCost(state: GameState, job: Job, weather: WeatherId): number {
  let cost = job.powerCost;
  if (hasUpgrade(state, 'dock-automator') && job.kind === 'cargo' && job.duration === 1 && !state.flags.dockAutomatorUsed) cost = 0;
  if (weather === 'recovery' && job.lanes.some(lane => lane === 'eva' || lane === 'comms') && !(hasUpgrade(state, 'eva-tether') && job.lanes.includes('eva') && !state.flags.evaTetherUsed)) cost += 1;
  if (weather === 'veil' && job.lanes.includes('comms') && job.kind === 'comms' && !(hasUpgrade(state, 'quiet-channel') && job.priority === 'routine' && !state.flags.quietChannelUsed)) cost += 1;
  if (state.faults['power-bus']?.active && job.lanes.some(lane => lane === 'eva' || lane === 'comms')) cost += 1;
  return cost;
}

function weatherAllowed(state: GameState, job: Job, weather: WeatherId): string | undefined {
  if (!job.allowedWeather.includes(weather)) return `${job.kind === 'repair' ? 'EVA' : job.kind === 'comms' ? 'EXTERNAL COMMS' : 'JOB'} UNSAFE IN ${WEATHER[weather].label}.`;
  const fault = job.lanes.map(lane => laneBlocked(state, lane)).find(Boolean);
  if (fault && job.kind !== 'repair') return `${fault!.name} BLOCKS ${job.lanes.map(laneLabel).join('+')}.`;
  if (weather === 'storm' && job.kind === 'repair') return 'EXTERIOR WORK IS UNSAFE IN PARTICLE STORM.';
  return undefined;
}

function applyEffect(state: GameState, item: JobEffect, notices: string[]): void {
  if (item.type === 'battery') state.battery = clamp(state.battery + (item.amount ?? 0), 0, state.batteryMax);
  if (item.type === 'integrity') state.integrity = clamp(state.integrity + (item.amount ?? 0), 0, state.integrityMax);
  if (item.type === 'standing') state.standing = clamp(state.standing + (item.amount ?? 0), 0, 99);
  if (item.type === 'supply' && item.supply) state.supplies[item.supply] = clamp(state.supplies[item.supply] + (item.amount ?? 0), 0, 9);
  if (item.type === 'resolveFault' && item.faultId && state.faults[item.faultId]) { state.faults[item.faultId].active = false; notices.push(`FAULT RESOLVED: ${state.faults[item.faultId].name}.`); }
  if (item.type === 'setFlag' && item.flag) state.flags[item.flag] = true;
  if (item.type === 'unlockJob' && item.jobId && state.jobs[item.jobId]) state.jobs[item.jobId].state = 'queued';
  if (item.type === 'log' && item.text) notices.push(item.text);
}

function removeReservations(state: GameState, jobId: string): void { state.reservations = state.reservations.filter(reservation => reservation.jobId !== jobId); }
function missJob(state: GameState, job: Job, notices: string[], window: number): void { if (job.state === 'missed' || job.state === 'complete' || job.state === 'cancelled') return; job.state = 'missed'; removeReservations(state, job.id); job.onMiss.forEach(effectItem => applyEffect(state, effectItem, notices)); notices.push(`MISSED: ${job.title} — deadline W${String(job.deadlineWindow + 1).padStart(2, '0')}.`); addIncident(state, `MISSED · ${job.title}`, 'danger', window); }

function resolveWindow(input: GameState): GameState {
  const state = input;
  const window = state.currentWindow; const weather = state.weather[window]!; const notices: string[] = []; const completed: string[] = []; const progressed: string[] = []; const blocked: Array<{ jobId: string; reason: string }> = []; const missed: string[] = []; const faultTicks: string[] = [];
  addArrivals(state, window, notices);
  const beforeBattery = state.battery; const beforeIntegrity = state.integrity;
  const due = Object.values(state.jobs).filter(job => job.scheduledStart !== undefined && job.scheduledStart <= window && window < job.scheduledStart + job.duration && job.remaining > 0 && !['complete', 'missed', 'cancelled'].includes(job.state)).sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.deadlineWindow - b.deadlineWindow || a.id.localeCompare(b.id));
  for (const job of due) {
    const reason = weatherAllowed(state, job, weather);
    if (reason) { job.state = 'blocked'; blocked.push({ jobId: job.id, reason }); notices.push(`BLOCKED: ${job.title} — ${reason}`); continue; }
    const cost = powerCost(state, job, weather);
    if (cost > state.battery) { job.state = 'blocked'; blocked.push({ jobId: job.id, reason: `POWER RESERVE ${state.battery}/${cost}.` }); notices.push(`BLOCKED: ${job.title} — POWER RESERVE ${state.battery}/${cost}.`); continue; }
    state.battery -= cost; job.state = 'active'; job.remaining -= 1; progressed.push(job.id); notices.push(`${job.title} PROGRESS ${job.duration - job.remaining}/${job.duration}.`);
    if (hasUpgrade(state, 'dock-automator') && job.kind === 'cargo' && job.duration === 1 && cost === 0) state.flags.dockAutomatorUsed = true;
    if (hasUpgrade(state, 'eva-tether') && job.lanes.includes('eva') && weather === 'recovery' && cost === job.powerCost && cost > 0) state.flags.evaTetherUsed = true;
    if (hasUpgrade(state, 'quiet-channel') && job.priority === 'routine' && weather === 'veil' && cost === job.powerCost) state.flags.quietChannelUsed = true;
    if (job.remaining <= 0) { job.state = 'complete'; completed.push(job.id); job.onComplete.forEach(effectItem => applyEffect(state, effectItem, notices)); if (hasUpgrade(state, 'priority-desk') && job.priority === 'critical' && job.deadlineWindow >= window) state.standing += 1; notices.push(`COMPLETE: ${job.title}.`); addIncident(state, `COMPLETE · ${job.title}`, 'success', window); }
  }
  for (const fault of activeFaults(state)) {
    if (!fault.triggerWeather.includes(weather)) continue;
    state.integrity = clamp(state.integrity - fault.integrityLoss, 0, state.integrityMax); faultTicks.push(`${fault.name} -${fault.integrityLoss} INTEGRITY`); notices.push(`${fault.name}: INTEGRITY -${fault.integrityLoss}.`); addIncident(state, `${fault.name} TICK · INTEGRITY -${fault.integrityLoss}`, 'danger', window);
  }
  const weatherDelta = WEATHER[weather].battery;
  state.battery = clamp(state.battery + weatherDelta, 0, state.batteryMax); notices.push(`${WEATHER[weather].label}: POWER ${weatherDelta >= 0 ? '+' : ''}${weatherDelta}.`);
  for (const job of Object.values(state.jobs)) {
    if (job.remaining > 0 && job.deadlineWindow <= window && job.arrivalWindow <= window && !['complete', 'missed', 'cancelled'].includes(job.state)) { missJob(state, job, notices, window); missed.push(job.id); }
  }
  const report: WindowReport = { window, weather, completed, progressed, blocked, missed, faultTicks, notices, batteryBefore: beforeBattery, batteryAfter: state.battery, integrityBefore: beforeIntegrity, integrityAfter: state.integrity };
  state.reports = [report, ...state.reports].slice(0, 6); state.score += completed.length * 100 - missed.length * 75 - blocked.length * 10; state.armedAdvance = false; state.phase = state.integrity <= 0 ? 'gameOver' : window >= state.totalWindows - 1 ? 'shiftReport' : 'windowReport'; state.notice = state.integrity <= 0 ? 'INTEGRITY ZERO. KESTREL IS SILENT.' : state.phase === 'shiftReport' ? 'WINDOW 10 COMPLETE. REVIEW THE SHIFT.' : `WINDOW ${String(window + 1).padStart(2, '0')} RESOLVED.`; return state;
}

function beginNextShift(state: GameState): GameState {
  const next = setupShift(state, state.shiftIndex + 1); next.phase = 'briefing'; next.upgradeOffers = []; return next;
}

export function applyCommand(input: GameState, command: Command): CommandResult {
  let state = clone(input); const events: string[] = [];
  if (command.type === 'startRun') { state = setupShift({ ...freshState(command.seed ?? input.seed, command.mode), upgrades: [] }, 0); state.mode = command.mode; state.notice = command.mode === 'openOrbit' ? 'OPEN ORBIT // A SEEDED FLIGHT PLAN.' : state.notice; return { state, events: ['start'] }; }
  if (command.type === 'restartRun') { state = setupShift({ ...freshState(command.seed ?? input.seed, input.mode), upgrades: input.upgrades }, 0); return { state, events: ['restart-run'] }; }
  if (command.type === 'restartShift') { if (input.shiftStartSnapshot) return { state: clone(input.shiftStartSnapshot), events: ['restart-shift'] }; return { state, events: [] }; }
  if (command.type === 'dismissBriefing' && state.phase === 'briefing') { state.phase = 'working'; state.notice = 'PLAN THE CURRENT HORIZON. PRESS SPACE TO ARM ADVANCE.'; return { state, events: [] }; }
  if (command.type === 'dismissWindowReport' && state.phase === 'windowReport') { state.currentWindow += 1; const arrivals: string[] = []; addArrivals(state, state.currentWindow, arrivals); state.phase = 'working'; state.notice = arrivals[0] ?? `WINDOW ${String(state.currentWindow + 1).padStart(2, '0')} READY. PLAN AHEAD.`; return { state, events: arrivals }; }
  if (command.type === 'dismissWindowReport' && state.phase === 'shiftReport') return { state: finishShift(state), events: ['shift-report'] };
  if (command.type === 'chooseUpgrade' && state.phase === 'upgrade') { const offer = state.upgradeOffers.find(item => item.id === command.upgradeId); if (offer) { state.upgrades.push(offer.id); return { state: beginNextShift(state), events: [`upgrade:${offer.id}`] }; } return { state, events: [] }; }
  if (command.type === 'toggleHelp') { state.helpOpen = !state.helpOpen; return { state, events: [] }; }
  if (command.type === 'toggleLog') { state.logOpen = !state.logOpen; return { state, events: [] }; }
  if (state.phase === 'gameOver' || state.phase === 'ending') return { state, events: [] };
  if (command.type === 'selectJob') { if (state.jobs[command.jobId]) { state.selectedJobId = command.jobId; const job = state.jobs[command.jobId]; state.selectedStartWindow = Math.max(state.currentWindow, job.scheduledStart ?? job.earliestWindow); state.notice = job.description; } return { state, events: [] }; }
  if (command.type === 'selectStart') { const job = state.selectedJobId ? state.jobs[state.selectedJobId] : undefined; const max = state.currentWindow + 3; state.selectedStartWindow = clamp(state.selectedStartWindow + command.delta, state.currentWindow, max); if (job) state.notice = placement(state, job, state.selectedStartWindow).reason; return { state, events: [] }; }
  if (command.type === 'scheduleJob') { const job = state.selectedJobId ? state.jobs[state.selectedJobId] : undefined; if (!job) return { state, events: [] }; const result = placement(state, job, state.selectedStartWindow); state.notice = result.reason; if (result.valid) { removeReservations(state, job.id); state.reservations.push(...result.reservations); job.scheduledStart = state.selectedStartWindow; job.state = 'scheduled'; state.notice = `${job.title} SCHEDULED W${String(state.selectedStartWindow + 1).padStart(2, '0')}.`; events.push(`schedule:${job.id}`); } return { state, events }; }
  if (command.type === 'unscheduleJob') { const job = state.selectedJobId ? state.jobs[state.selectedJobId] : undefined; if (job && job.remaining === job.duration && job.state === 'scheduled') { job.scheduledStart = undefined; job.state = 'queued'; removeReservations(state, job.id); state.notice = `${job.title} REMOVED FROM SCHEDULE.`; } else state.notice = 'ONLY UNSTARTED WORK CAN BE MOVED.'; return { state, events: [] }; }
  if (command.type === 'requestCancel') { const job = state.selectedJobId ? state.jobs[state.selectedJobId] : undefined; if (job && ['active', 'blocked', 'scheduled'].includes(job.state)) { state.pendingCancelJobId = job.id; state.phase = 'cancelConfirm'; } return { state, events: [] }; }
  if (command.type === 'confirmCancel') { const job = state.pendingCancelJobId ? state.jobs[state.pendingCancelJobId] : undefined; if (job && command.accepted) { job.state = 'cancelled'; removeReservations(state, job.id); state.notice = `${job.title} CANCELLED. ITS MISS CONSEQUENCE STILL APPLIES.`; job.onMiss.forEach(effectItem => applyEffect(state, effectItem, [])); } else state.notice = 'CANCELLATION ABORTED.'; state.pendingCancelJobId = null; state.phase = 'working'; return { state, events: [] }; }
  if (command.type === 'armAdvance' && state.phase === 'working') { state.armedAdvance = !state.armedAdvance; state.notice = state.armedAdvance ? 'ADVANCE ARMED. PRESS ENTER TO RESOLVE.' : 'ADVANCE DISARMED.'; return { state, events: [] }; }
  if (command.type === 'advanceWindow' && state.phase === 'working' && state.armedAdvance) return { state: resolveWindow(state), events: ['advance'] };
  if (command.type === 'dismissWindowReport') return { state, events: [] };
  if (state.phase === 'shiftReport' && command.type === 'dismissBriefing') return { state, events: [] };
  return { state, events };
}

export function finishShift(state: GameState): GameState {
  const next = clone(state);
  if (next.phase !== 'shiftReport') return next;
  const required = currentShift(next).requiredTemplateIds;
  const completedTemplates = required.filter(template => Object.values(next.jobs).some(job => job.id.includes(`-${template}-`) && job.state === 'complete'));
  const passed = next.integrity > 0 && completedTemplates.length === required.length;
  next.notice = passed ? 'SHIFT CLEARED. SELECT ONE FLIGHT-DECK UPGRADE.' : 'SHIFT FAILED. RESTART THE SHIFT OR ACCEPT THE AUDIT.';
  next.phase = passed ? (next.mode === 'openOrbit' || next.shiftIndex >= SHIFTS.length - 1 ? 'ending' : 'upgrade') : 'gameOver';
  if (next.phase === 'upgrade') next.upgradeOffers = pickOffers(next.seed, next.shiftIndex, next.upgrades);
  if (next.phase === 'ending') next.notice = `CAMPAIGN COMPLETE. STANDING ${next.standing}. THE RELAY ANSWERS.`;
  return next;
}

export function getQueueJobs(state: GameState): Job[] { return state.queueIds.map(id => state.jobs[id]).filter(Boolean).filter(job => !['complete', 'missed', 'cancelled'].includes(job.state)); }
export function getHorizonReservations(state: GameState): Reservation[] { return state.reservations.filter(reservation => reservation.window >= state.currentWindow && reservation.window <= state.currentWindow + 3); }
export function getJobStatus(job: Job): string { return job.state === 'complete' ? 'DONE' : job.state === 'missed' ? 'MISSED' : job.state === 'cancelled' ? 'CANCEL' : job.state.toUpperCase(); }
export function availableSupplies(state: GameState, supply: SupplyId): number { return state.supplies[supply]; }
