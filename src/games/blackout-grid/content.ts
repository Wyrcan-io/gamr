import type { DistrictKind, Upgrade } from './types';

export interface DistrictContent {
  kind: DistrictKind;
  label: string;
  short: string;
  baseDemandMW: number;
  serviceWeight: number;
  strainPerDarkBeat: number;
}

export const DISTRICT_CONTENT: Record<DistrictKind, DistrictContent> = {
  hospital: { kind: 'hospital', label: 'ST ANNE HOSPITAL', short: 'H', baseDemandMW: 8, serviceWeight: 2.4, strainPerDarkBeat: 1.2 },
  water: { kind: 'water', label: 'RIVER WATER', short: 'W', baseDemandMW: 10, serviceWeight: 2.1, strainPerDarkBeat: 0.9 },
  communications: { kind: 'communications', label: 'CIVIC COMMS', short: 'C', baseDemandMW: 6, serviceWeight: 1.5, strainPerDarkBeat: 0.65 },
  transit: { kind: 'transit', label: 'CENTRAL TRANSIT', short: 'T', baseDemandMW: 9, serviceWeight: 1.2, strainPerDarkBeat: 0.55 },
  residential: { kind: 'residential', label: 'NORTH HOMES', short: 'R', baseDemandMW: 14, serviceWeight: 0.8, strainPerDarkBeat: 0.18 },
  industry: { kind: 'industry', label: 'EAST WORKS', short: 'I', baseDemandMW: 18, serviceWeight: 0.7, strainPerDarkBeat: 0.1 },
};

export const UPGRADES: Upgrade[] = [
  { id: 'crew', name: 'SECOND CREW', description: '+1 concurrent repair or build job.' },
  { id: 'kits', name: 'SPARE CONDUCTOR', description: '+2 line kits; ties build 2 beats faster.' },
  { id: 'demand', name: 'DEMAND RESPONSE', description: 'Residential pickup becomes 1.35× then 1.15×.' },
  { id: 'recloser', name: 'SMART RECLOSER', description: 'Clear one transient trip per stage after 2 beats.' },
  { id: 'reserve', name: 'MOBILE RESERVE', description: '+18 generator fuel and +4 MW generator capacity.' },
  { id: 'thermal', name: 'THERMAL MARGIN', description: 'All feeder capacities increase by 15%.' },
  { id: 'intel', name: 'FIELD INTEL', description: 'Storm targets reveal 4 beats earlier.' },
  { id: 'focus', name: 'OPERATOR FOCUS', description: '+1 Focus charge at every remaining stage.' },
];

export const TUTORIAL_COPY = [
  'RESTORE A DARK CITY IN SECTIONS. START WITH THE HOSPITAL.',
  'SELECT THE BROKEN NORTH FEEDER. PRESS 2 TO SEND THE CREW.',
  'CLOSE THE REPAIRED EDGE WITH 1. WATCH PICKUP LOAD FLASH.',
  'SHED NORTH HOMES WITH 3 WHILE THE FEEDER COOLS.',
  'FAULTS TRIP PROTECTION. REPAIR, THEN CLOSE ONLY WHEN SAFE.',
  'HOLD CRITICAL SERVICE TO CLEAR THE TRAINING STORM.',
];

