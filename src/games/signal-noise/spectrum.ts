import type { CaseState, LockDiagnostic, LockQuality, StationId, Transmitter } from './types';

export interface SpectrumReadout { energy: number[]; markers: string[]; }
export interface LockEvaluation { quality: LockQuality; reason: string; target: Transmitter; signal: number; noise: number; purity: number; diagnostic: LockDiagnostic | null; }

function bandChannels(transmitter: Transmitter): number[] {
  const half = Math.floor(transmitter.bandwidth / 2);
  return Array.from({ length: transmitter.bandwidth }, (_, index) => transmitter.centre - half + index).filter(channel => channel >= 0 && channel <= 23);
}

function energyAt(transmitter: Transmitter, station: StationId, channel: number): number {
  if (transmitter.notched || !bandChannels(transmitter).includes(channel)) return 0;
  const distance = Math.abs(channel - transmitter.centre);
  const base = transmitter.powerByStation[station];
  if (transmitter.profile === 'needle') return distance === 0 ? base : 0;
  if (transmitter.profile === 'twin') return distance === 1 ? base : Math.floor(base / 3);
  if (transmitter.profile === 'comb') return distance % 2 === 0 ? base : Math.floor(base / 3);
  return Math.max(1, base - distance * 2);
}

export function calculateSpectrum(state: CaseState, station: StationId): SpectrumReadout {
  const energy = Array.from({ length: 24 }, (_, channel) => Math.min(9, state.transmitters.reduce((sum, transmitter) => sum + energyAt(transmitter, station, channel), 0)));
  const markers = state.transmitters.filter(transmitter => transmitter.discovered && !transmitter.notched).map(transmitter => `${transmitter.id.toUpperCase()} @${String(transmitter.centre).padStart(2, '0')}`);
  return { energy, markers };
}

export function evaluateLock(state: CaseState, station: StationId): LockEvaluation {
  const target = state.transmitters.find(transmitter => transmitter.role === 'target');
  if (!target) throw new Error('Signal//Noise case requires a target transmitter.');
  const inBand = (transmitter: Transmitter) => bandChannels(transmitter).some(channel => Math.abs(channel - state.tuner.centre) <= Math.floor(state.tuner.bandwidth / 2));
  const signal = target.notched || !inBand(target) ? 0 : target.powerByStation[station];
  const noise = state.transmitters.filter(transmitter => transmitter.id !== target.id && !transmitter.notched && inBand(transmitter)).reduce((sum, transmitter) => sum + transmitter.powerByStation[station], 0);
  const purity = signal / Math.max(1, signal + noise);
  if (state.disabledStations.includes(station)) return { quality: 'none', reason: 'STATION OFFLINE', target, signal, noise, purity, diagnostic: { dimension: 'station', status: 'blocked', evidence: `${station.toUpperCase()} station is offline.`, nextAction: 'TAB TO ANOTHER STATION.' } };
  if (state.tuner.centre !== target.centre) return { quality: 'none', reason: 'CENTRE DOES NOT MATCH CARRIER', target, signal, noise, purity, diagnostic: { dimension: 'centre', status: state.tuner.centre < target.centre ? 'low' : 'high', evidence: `Carrier energy is ${state.tuner.centre < target.centre ? 'right' : 'left'} of the passband.`, nextAction: state.tuner.centre < target.centre ? 'TUNE RIGHT.' : 'TUNE LEFT.' } };
  if (state.tuner.bandwidth !== target.bandwidth) return { quality: 'none', reason: 'BANDWIDTH CLIPS OR ADMITS NOISE', target, signal, noise, purity, diagnostic: { dimension: 'bandwidth', status: state.tuner.bandwidth < target.bandwidth ? 'low' : 'high', evidence: state.tuner.bandwidth < target.bandwidth ? 'The carrier fills a wider window.' : 'The passband admits unnecessary noise.', nextAction: state.tuner.bandwidth < target.bandwidth ? 'INCREASE BANDWIDTH.' : 'NARROW BANDWIDTH.' } };
  if (state.tuner.modulation !== target.modulation) return { quality: 'none', reason: 'MODULATION DOES NOT RESOLVE', target, signal, noise, purity, diagnostic: { dimension: 'modulation', status: 'mismatch', evidence: `The waveform is not ${state.tuner.modulation.toUpperCase()}.`, nextAction: 'CYCLE MODULATION AND WATCH THE SCOPE.' } };
  if (state.tuner.gain < target.requiredGainByStation[station]) return { quality: 'none', reason: 'GAIN TOO LOW', target, signal, noise, purity, diagnostic: { dimension: 'gain', status: 'low', evidence: 'The carrier is present but below the receiver threshold.', nextAction: 'INCREASE GAIN.' } };
  if (state.tuner.gain > target.overloadGainByStation[station]) return { quality: 'none', reason: 'GAIN OVERLOAD', target, signal, noise, purity, diagnostic: { dimension: 'gain', status: 'high', evidence: 'The receiver is clipping the carrier.', nextAction: 'REDUCE GAIN.' } };
  const score = Math.max(0, Math.min(9, signal - Math.floor(noise / 2)));
  const quality: LockQuality = score >= 8 && purity >= 0.8 ? 'crisp' : score >= 6 && purity >= 0.62 ? 'clean' : score >= 3 ? 'rough' : 'none';
  return { quality, reason: quality === 'none' ? 'NOISE HIDES THE CARRIER' : quality.toUpperCase() + ' LOCK', target, signal, noise, purity, diagnostic: quality === 'none' ? { dimension: 'noise', status: 'mismatch', evidence: 'The carrier is inside the passband but interference dominates.', nextAction: 'SWEEP, THEN NOTCH A DISCOVERED BLOCKER.' } : null };
}

export function waveform(modulation: string): string {
  return ({ pulse: '__/^^\\__/^^\\__', drift: '~~~~~~ ~~~~~~', chirp: '..:--==##', burst: '| |  ||   |' } as Record<string, string>)[modulation] ?? '........';
}
