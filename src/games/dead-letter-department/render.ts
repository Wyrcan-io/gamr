import { availablePerks, currentMessage, rulesText } from './engine';
import { DESTINATION_LABELS, type GameState, type MessageFacts } from './types';
import { centerText, clipToWidth, padToWidth, wrapText } from '../../ui/terminal';
import { getCurrentThemePalette, type TerminalThemePalette } from '../utils';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;

function line(value: string, width: number, style = ''): string {
  return `${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`;
}

function center(value: string, width: number): string {
  return centerText(value, width);
}

function resizeFrame(cols: number, rows: number, palette: TerminalThemePalette): string {
  const lines = [
    `${palette.focus}${BOLD}${center('g/ DEAD LETTER DEPARTMENT', cols)}${RESET}`,
    '',
    center('The sorting desk needs a larger page.', cols),
    center(`Need 80x24  Have ${cols}x${rows}`, cols),
    center('Resize the terminal before opening the next letter.', cols),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function trustBar(value: number, max: number): string {
  return `[${'#'.repeat(Math.max(0, value))}${'-'.repeat(Math.max(0, max - value))}] ${value}/${max}`;
}

function header(state: GameState, cols: number, palette: TerminalThemePalette): string[] {
  const mode = state.mode === 'tutorial' ? `INDUCTION ${Math.min(6, state.tutorialStep + 1)}/6` : `SHIFT ${String(state.shift).padStart(2, '0')}/06`;
  return [
    line('g/ DEAD LETTER DEPARTMENT', cols, `${palette.focus}${BOLD}`),
    line('A sorting desk for mail that should not answer back.', cols, palette.muted),
    line(`${mode}  |  INBOX ${String(Math.min(state.inboxIndex + 1, state.deck.length)).padStart(2, '0')}/${String(state.deck.length).padStart(2, '0')}  |  TRUST ${trustBar(state.trust, state.maxTrust)}  |  STANDING ${String(state.standing).padStart(3, '0')}`, cols, palette.ink),
    line('-'.repeat(cols), cols, palette.line),
  ];
}

function startFrame(cols: number, palette: TerminalThemePalette): string {
  const lines = [
    line('g/ DEAD LETTER DEPARTMENT', cols, `${palette.focus}${BOLD}`),
    line('Inspect the mail. Seal what answers back.', cols, palette.muted),
    '',
    line('Every letter goes to one desk. The bulletin explains why.', cols, palette.ink),
    '',
    line('[P] First Week   [T] Induction   [?] Help   [Q] Quit', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function briefingFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const limit = state.mode === 'tutorial' ? Math.min(4, state.tutorialStep + 2) : 8;
  const lines = [
    ...header(state, cols, palette),
    line(state.mode === 'tutorial' ? 'INDUCTION BULLETIN' : `SHIFT ${String(state.shift).padStart(2, '0')} BULLETIN`, cols, `${palette.focus}${BOLD}`),
    line(state.mode === 'tutorial' ? 'Learn one visible rule, route one letter, then read the audit.' : 'Read the active regulations before opening the inbox.', cols, palette.muted),
    '',
  ];
  rulesText(state.rules).slice(0, limit).forEach((text, index) => {
    const chunks = wrapText(text, Math.max(20, cols - 8));
    lines.push(line(`${index + 1}. ${chunks[0]}`, cols, palette.ink));
  });
  lines.push('');
  lines.push(line(`Examples: ${state.rules.examples.join('  ')}`, cols, palette.muted));
  lines.push('');
  lines.push(line('[Enter] open inbox   [?] help   [Esc] pause   [Q] quit', cols, palette.focus));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function documentLines(facts: MessageFacts, state: GameState, width: number, palette: TerminalThemePalette): string[] {
  const registry = facts.senderRegistryCode ?? '[MISSING]';
  const fields = [
    `FROM      ${facts.senderName}`,
    `REGISTRY  ${state.perks.includes('registry-tabs') ? '[REG] ' : ''}${registry}`,
    `TO        ${facts.recipientName}`,
    `ADDRESS   ${facts.recipientAddress}`,
    `OFFICE    ${facts.destinationOffice}`,
    `POSTMARK  ${facts.postmarkOffice} / NIGHT ${facts.issueDate}`,
    `SEAL      ${facts.seal.toUpperCase()}  POSTAGE ${facts.postage.toUpperCase()}`,
    `DEADLINE  ${facts.deliveryDeadline === null ? 'NONE' : `NIGHT ${facts.deliveryDeadline}`}`,
  ];
  const lines = fields.map((field) => line(field, width, palette.ink));
  lines.push('');
  if (state.inspectionView === 'envelope') {
    lines.push(line('TAB  open letter or insert', width, palette.muted));
  } else {
    lines.push(line(state.inspectionView === 'letter' ? 'LETTER' : 'INSERT', width, `${palette.focus}${BOLD}`));
    const body = state.inspectionView === 'letter' ? facts.bodyText : facts.bodyClue ?? 'No insert is attached.';
    wrapText(body, Math.max(20, width - 2)).slice(0, 5).forEach((chunk) => lines.push(line(chunk, width, palette.ink)));
  }
  if (facts.anomalies.length) lines.push(line(`[!] ANOMALY  ${facts.anomalies.join(', ').toUpperCase()}`, width, palette.danger));
  return lines;
}

function destinationLines(width: number, palette: TerminalThemePalette): string[] {
  return [
    line('[1] DISPATCH  routine mail', width, palette.ink),
    line('[2] EXPRESS   urgent mail', width, palette.ink),
    line('[3] RETURN    invalid mail', width, palette.ink),
    line('[4] SEAL      curse signal', width, palette.ink),
  ];
}

function workbenchFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const leftWidth = 32;
  const rightWidth = cols - leftWidth - 3;
  const message = currentMessage(state);
  const rules = rulesText(state.rules).slice(0, state.mode === 'tutorial' ? Math.min(4, state.tutorialStep + 2) : 6);
  const left: string[] = [
    line('ACTIVE REGULATIONS', leftWidth, `${palette.focus}${BOLD}`),
    ...rules.flatMap((text, index) => wrapText(`${index + 1}. ${text}`, leftWidth - 2).slice(0, 2).map((chunk) => line(chunk, leftWidth, palette.ink))),
    '',
    ...destinationLines(leftWidth, palette),
    '',
    line(`Verification marks  ${state.verificationMarks}`, leftWidth, palette.muted),
    line('Ledger shows the full bulletin.', leftWidth, palette.muted),
  ];
  const right = message ? [
    line('INCOMING MESSAGE', rightWidth, `${palette.focus}${BOLD}`),
    ...documentLines(message.facts, state, rightWidth, palette),
  ] : [line('INBOX EMPTY', rightWidth, palette.muted)];
  const lines = [
    ...header(state, cols, palette),
    ...Array.from({ length: Math.max(left.length, right.length) }, (_, index) => `${padToWidth(left[index] ?? '', leftWidth)}   ${padToWidth(right[index] ?? '', rightWidth)}`),
    '',
    line(state.lastNotice, cols, palette.warning),
    line('1D 2E 3R 4S  | Tab view | L rules | V verify | ? help | Esc pause', cols, palette.muted),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function auditFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const audit = state.pendingAudit;
  if (!audit) return workbenchFrame(state, cols, palette);
  const marker = audit.correct ? '[+]' : '[!]';
  const style = audit.correct ? palette.good : palette.danger;
  const lines = [
    ...header(state, cols, palette),
    line(`${marker} ${audit.correct ? 'AUDIT ACCEPTED' : 'AUDIT FLAGGED'}`, cols, `${style}${BOLD}`),
    '',
    line(`CHOSE     ${DESTINATION_LABELS[audit.selected]}`, cols, palette.ink),
    line(`EXPECTED  ${DESTINATION_LABELS[audit.expected]}`, cols, palette.ink),
    line(`RULE      ${audit.evaluation.decisiveRuleId}`, cols, palette.focus),
    '',
    line('VISIBLE EVIDENCE', cols, `${palette.focus}${BOLD}`),
    ...audit.evaluation.evidence.map((item) => line(`${item.field}: ${item.value}`, cols, palette.ink)),
    '',
    ...wrapText(audit.evaluation.explanations[0] ?? 'The bulletin explains this route.', Math.max(20, cols - 4)).map((text) => line(text, cols, palette.ink)),
    '',
    line('[Enter] next letter   [L] bulletin   [?] help   [Esc] pause', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function perkFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const lines = [
    ...header(state, cols, palette),
    line('SHIFT CLEAR / OFFICE PERK', cols, `${palette.focus}${BOLD}`),
    line('Choose one concrete advantage for the next shift.', cols, palette.muted),
    '',
  ];
  availablePerks(state).forEach((perk, index) => {
    lines.push(line(`[${index + 1}] ${perk.name}`, cols, palette.focus));
    lines.push(...wrapText(perk.description, Math.max(20, cols - 6)).slice(0, 2).map((text) => line(`    ${text}`, cols, palette.ink)));
    lines.push('');
  });
  lines.push(line('[1-3] install perk   [?] help   [Esc] pause', cols, palette.focus));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function reportFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const correct = state.history.filter((record) => record.correct).length;
  const heading = state.phase === 'ending' ? 'FIRST WEEK COMPLETE' : state.phase === 'gameOver' ? 'DESK UNDER AUDIT' : 'SHIFT REPORT';
  const style = state.phase === 'gameOver' ? palette.danger : palette.good;
  const lines = [
    ...header(state, cols, palette),
    line(`${state.phase === 'gameOver' ? '[!]' : '[+]'} ${heading}`, cols, `${style}${BOLD}`),
    line(`SCORE ${state.score}  |  ACCURACY ${correct}/${state.history.length}  |  STANDING ${state.standing}`, cols, palette.ink),
    line(`TRUST ${state.trust}/${state.maxTrust}  |  STREAK ${state.streak}  |  SEED ${state.seed}`, cols, palette.ink),
    '',
    line('CASE THREADS', cols, `${palette.focus}${BOLD}`),
    ...Object.values(state.caseThreads).map((thread) => line(`${thread.state === 'protected' ? '[+]' : thread.state === 'compromised' ? '[!]' : '[ ]'} ${thread.title}`, cols, thread.state === 'compromised' ? palette.danger : palette.ink)),
    '',
    line(state.phase === 'ending' ? '[R] replay   [N] next game   [Q] quit' : state.phase === 'gameOver' ? '[R] retry   [Q] quit' : '[Enter] continue', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function helpFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const lines = [
    ...header(state, cols, palette),
    line('g/ DESK HELP', cols, `${palette.focus}${BOLD}`),
    '',
    line('1 Dispatch genuine routine mail', cols, palette.ink),
    line('2 Express genuine urgent mail', cols, palette.ink),
    line('3 Return invalid or forged mail', cols, palette.ink),
    line('4 Seal any curse signal', cols, palette.ink),
    line('Tab changes envelope, letter, and insert views', cols, palette.ink),
    line('L shows the full regulation bulletin', cols, palette.ink),
    line('V spends one Verification Mark', cols, palette.ink),
    line('A decision opens an audit card before the next letter', cols, palette.muted),
    '',
    line('[?] or [H] close help   [Esc] pause', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function ledgerFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const lines = [
    ...header(state, cols, palette),
    line('REGULATION LEDGER', cols, `${palette.focus}${BOLD}`),
    line('The full bulletin is available without leaving the desk.', cols, palette.muted),
    '',
  ];
  rulesText(state.rules).forEach((text, index) => {
    lines.push(...wrapText(`${index + 1}. ${text}`, Math.max(20, cols - 4)).slice(0, 2).map((chunk) => line(chunk, cols, palette.ink)));
  });
  lines.push('');
  lines.push(line('[L] close ledger   [?] help   [Esc] pause', cols, palette.focus));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

export function renderFrame(
  state: GameState,
  cols: number,
  rows: number,
  palette: TerminalThemePalette = getCurrentThemePalette(),
): string {
  if (cols < 80 || rows < 24) return resizeFrame(cols, rows, palette);
  if (state.helpOpen) return helpFrame(state, cols, palette);
  if (state.phase === 'start') return startFrame(cols, palette);
  if (state.phase === 'briefing') return briefingFrame(state, cols, palette);
  if (state.phase === 'perk') return perkFrame(state, cols, palette);
  if (state.phase === 'report' || state.phase === 'ending' || state.phase === 'gameOver') return reportFrame(state, cols, palette);
  if (state.phase === 'audit') return auditFrame(state, cols, palette);
  if (state.ledgerOpen) return ledgerFrame(state, cols, palette);
  return workbenchFrame(state, cols, palette);
}
