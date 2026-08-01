import type { ItemId, ParcelId, SealId, UpgradeId } from './types';

export interface ParcelDefinition {
  id: ParcelId;
  label: string;
  rule: string;
  detail: string;
  condition: number;
  tolerance: number;
  size: 'small' | 'medium' | 'oversized';
}

export const PARCELS: Record<ParcelId, ParcelDefinition> = {
  'porcelain-choir': { id: 'porcelain-choir', label: 'PORCELAIN CHOIR', rule: 'BRACE BEFORE IMPACT', detail: 'Jolts of 2+ add one extra stress. Brace grants 2 guard.', condition: 5, tolerance: 3, size: 'medium' },
  'moonwater-ampoule': { id: 'moonwater-ampoule', label: 'MOONWATER AMPOULE', rule: 'KEEP A STEADY COURSE', detail: 'Changing direction repeatedly raises SLOSH. Three straight steps clear it.', condition: 5, tolerance: 3, size: 'medium' },
  'sleeping-bell': { id: 'sleeping-bell', label: 'SLEEPING BELL', rule: 'DO NOT WAKE', detail: 'Noise raises WAKE. At 3, the bell jolts and patrols investigate.', condition: 5, tolerance: 3, size: 'small' },
  'sunless-film': { id: 'sunless-film', label: 'SUNLESS FILM', rule: 'KEEP FROM LIGHT', detail: 'Lit floors raise EXPOSURE. Every third exposure damages it.', condition: 5, tolerance: 3, size: 'small' },
  'folded-familiar': { id: 'folded-familiar', label: 'FOLDED FAMILIAR', rule: 'TWO-PERSON LIFT', detail: 'Hurry is illegal. Weak floors collapse after you leave them.', condition: 6, tolerance: 4, size: 'oversized' },
  'memory-mirror': { id: 'memory-mirror', label: 'MEMORY MIRROR', rule: 'DO NOT RETRACE', detail: 'Re-entering your last six tiles causes a heavy jolt. Anchors clear memory.', condition: 5, tolerance: 3, size: 'medium' },
  'hearthseed-casket': { id: 'hearthseed-casket', label: 'HEARTHSEED CASKET', rule: 'KEEP MOVING — KEEP COOL', detail: 'Wait/Brace raise HEAT. Wet floors cool it.', condition: 5, tolerance: 3, size: 'medium' },
  'compass-needle': { id: 'compass-needle', label: 'COMPASS NEEDLE', rule: 'NORTH SIDE MUST LEAD', detail: 'South steps raise POLARITY. North steps clear it.', condition: 5, tolerance: 3, size: 'small' },
};

export const SEAL_LABELS: Record<SealId, string> = {
  none: 'NO SPECIAL SEAL',
  rush: 'RUSH — TIGHT DEADLINE',
  'top-heavy': 'TOP-HEAVY — TURNS MATTER',
  uninsured: 'UNINSURED — HIGH PAY',
  'quiet-claim': 'QUIET CLAIM — CONTACT HURTS',
  oversized: 'OVERSIZED — ONE FEWER SLOT',
  'recipient-asleep': 'RECIPIENT ASLEEP — QUIET ARRIVAL',
};

export const ITEMS: Record<ItemId, { label: string; short: string }> = {
  padding: { label: 'FELT PADDING', short: 'PAD' }, chalk: { label: 'SURVEY CHALK', short: 'CHK' }, wedge: { label: 'DOOR WEDGE', short: 'WED' }, rope: { label: 'COURIER ROPE', short: 'ROP' }, smoke: { label: 'SMOKE CLOTH', short: 'SMK' }, ration: { label: 'BEETLE RATION', short: 'RAT' }, strap: { label: 'COMPRESSION STRAP', short: 'STR' }, salve: { label: 'COOLING SALVE', short: 'SAL' }, cloth: { label: 'CLEANSING CLOTH', short: 'CLT' }, patch: { label: 'REPAIR PATCH', short: 'PAT' }, 'clock-key': { label: 'CLOCK KEY', short: 'KEY' }, insurance: { label: 'INSURANCE SEAL', short: 'INS' }, coin: { label: 'COIN PURSE', short: 'COIN' }, echo: { label: 'BOTTLED ECHO', short: 'ECHO' }, idol: { label: 'BRASS IDOL', short: 'IDOL' },
};

export const UPGRADES: Array<{ id: UpgradeId; label: string; detail: string }> = [
  { id: 'webbing', label: 'SHOCK WEBBING', detail: 'Cancel the first stress gained on each floor.' },
  { id: 'satchel', label: 'SLIM SATCHEL', detail: '+1 inventory slot.' },
  { id: 'sole', label: "RUNNER'S SOLE", detail: 'The first Hurry every six ticks makes no noise.' },
  { id: 'survey', label: 'SURVEY LICENSE', detail: 'Show the next two shift states.' },
  { id: 'grip', label: 'SURE GRIP', detail: 'Climb-like terrain never adds stress.' },
  { id: 'quiet-buckle', label: 'QUIET BUCKLE', detail: 'Using an item creates no noise.' },
  { id: 'bench-token', label: 'BENCH TOKEN', detail: 'The first repair does not consume a patch.' },
  { id: 'route-memory', label: 'ROUTE MEMORY', detail: 'Route hints include parcel-weighted costs.' },
  { id: 'handcart', label: 'BRASS HANDCART', detail: 'Oversized parcels ignore one rough-floor stress each floor.' },
  { id: 'claim-stamp', label: 'CLAIM STAMP', detail: 'Once per run, prevent one condition loss at a pay penalty.' },
];

