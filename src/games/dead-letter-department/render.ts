import { currentMessage, rulesText, availablePerks } from './engine';
import { DESTINATION_LABELS, type GameState } from './types';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[96m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const RED = '\x1b[91m';
const MAGENTA = '\x1b[95m';

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, glitchFrame: number): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  const put = (x: number, y: number, value: string) => out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${value}`);
  const center = (y: number, value: string, color = theme) => put(Math.max(1, Math.floor((cols - stripAnsi(value).length) / 2) + 1), y, color + value + RESET);
  if (cols < 80 || rows < 28) {
    center(Math.max(2, Math.floor(rows / 2) - 1), 'TERMINAL TOO SMALL', RED + '\x1b[1m');
    center(Math.max(3, Math.floor(rows / 2) + 1), `NEED 80x28  HAVE ${cols}x${rows}`, DIM + theme);
    return out.join('');
  }

  const title = 'DEAD LETTER DEPARTMENT';
  const offset = glitchFrame % 60 >= 56 ? (glitchFrame % 3) - 1 : 0;
  const decoratedTitle = '✉ ' + title;
  put(Math.max(1, Math.floor((cols - decoratedTitle.length) / 2) + 1 + offset), 1, theme + '\x1b[1m' + decoratedTitle + RESET);
  put(3, 3, `${theme}✦ SHIFT ${String(state.shift).padStart(2, '0')}/06   ✉ INBOX ${String(Math.min(state.inboxIndex + 1, state.deck.length)).padStart(2, '0')}/${String(state.deck.length).padStart(2, '0')}   ⚖ TRUST ${trustBar(state.trust, state.maxTrust)}   ◆ STANDING ${String(state.standing).padStart(3, '0')}${RESET}`);

  if (state.phase === 'start') {
    center(9, '✉ INSPECT THE MAIL. SEAL WHAT ANSWERS BACK. ✉', CYAN + '\x1b[1m');
    center(12, '▶ P: FIRST WEEK    T: INDUCTION    Q: QUIT', DIM + theme);
    center(15, 'Every letter must go to exactly one desk. ◆', DIM + theme);
    return out.join('');
  }
  if (state.phase === 'briefing') {
    center(7, `✦ SHIFT ${String(state.shift).padStart(2, '0')} // BULLETIN`, YELLOW + '\x1b[1m');
    put(7, 10, theme + '⚖ ACTIVE REGULATIONS' + RESET);
    rulesText(state.rules).slice(0, 8).forEach((text, index) => put(7, 12 + index, `${YELLOW}${index + 1}.${RESET} ${wrap(text, 76)[0]}`));
    put(7, 22, DIM + theme + '↳ Examples: ' + state.rules.examples.join('  ') + RESET);
    center(25, '⏎ OPEN INBOX', CYAN + '\x1b[1m');
    return out.join('');
  }
  if (state.phase === 'perk') {
    center(7, '✦ SHIFT CLEAR // OFFICE PERK', YELLOW + '\x1b[1m');
    availablePerks(state).forEach((perk, index) => {
      put(8, 11 + index * 4, `${YELLOW}◆ ${index + 1}: ${perk.name}${RESET}`);
      put(12, 12 + index * 4, DIM + theme + wrap(perk.description, cols - 16)[0] + RESET);
    });
    center(25, '1-3: INSTALL PERK ◆', DIM + theme);
    return out.join('');
  }
  if (state.phase === 'report' || state.phase === 'ending' || state.phase === 'gameOver') {
    const heading = state.phase === 'ending' ? '✓ FIRST WEEK COMPLETE' : state.phase === 'gameOver' ? '⚠ DESK UNDER AUDIT' : '▣ SHIFT REPORT';
    center(7, heading, state.phase === 'gameOver' ? RED + '\x1b[1m' : GREEN + '\x1b[1m');
    const correct = state.history.filter(record => record.correct).length;
    put(10, 11, `${theme}SCORE ${state.score}   ACCURACY ${correct}/${state.history.length}   STANDING ${state.standing}${RESET}`);
    put(10, 13, `${theme}TRUST ${state.trust}/${state.maxTrust}   STREAK ${state.streak}   SEED ${state.seed}${RESET}`);
    put(10, 16, 'CASE FILES');
    Object.values(state.caseThreads).forEach((thread, index) => put(12, 18 + index, `${thread.state === 'protected' ? GREEN + '✓ SAFE' : thread.state === 'compromised' ? RED + '⚠ OPEN' : DIM + '· QUIET'}${RESET} ${thread.title}`));
    center(25, state.phase === 'ending' ? 'R: REPLAY   N: NEXT GAME   Q: QUIT' : state.phase === 'gameOver' ? 'R: RETRY   Q: QUIT' : 'ENTER: CONTINUE', DIM + theme);
    return out.join('');
  }

  const message = currentMessage(state);
  put(3, 5, `${theme}\x1b[1m⚖ ACTIVE REGULATIONS${RESET}`);
  if (state.ledgerOpen) {
    rulesText(state.rules).slice(0, 10).forEach((text, index) => put(3, 7 + index, `${YELLOW}${index + 1}.${RESET} ${wrap(text, 34)[0]}`));
  } else {
    put(3, 7, `${YELLOW}1.${RESET} Seal cursed mail first.`);
    put(3, 8, `${YELLOW}2.${RESET} Invalid facts → RETURN.`);
    put(3, 9, `${YELLOW}3.${RESET} Valid deadline → EXPRESS.`);
    put(3, 10, `${YELLOW}4.${RESET} Valid remainder → DISPATCH.`);
    put(3, 12, `${DIM}✦ ${state.verificationMarks} VERIFICATION MARKS${RESET}`);
    put(3, 14, `${DIM}L: full ledger${RESET}`);
  }
  if (message) renderMessage(out, put, message, state, cols, theme);
  if (state.lastNotice) put(3, 24, `${YELLOW}${wrap(state.lastNotice, cols - 6)[0]}${RESET}`);
  put(3, 26, `${DIM}${theme}TAB: VIEW  L: LEDGER  V: VERIFY  1 DISPATCH  2 EXPRESS  3 RETURN  4 SEAL  H HELP  ESC PAUSE${RESET}`);
  if (state.phase === 'audit' && state.pendingAudit) renderAudit(out, put, state, theme, cols);
  if (state.helpOpen) renderHelp(put, theme, cols);
  return out.join('');
}

function renderMessage(out: string[], put: (x: number, y: number, value: string) => void, message: NonNullable<ReturnType<typeof currentMessage>>, state: GameState, cols: number, theme: string): void {
  const left = cols >= 94 ? 43 : 39;
  put(left, 5, `${theme}\x1b[1m✉ INCOMING MESSAGE${RESET}`);
  const facts = message.facts;
  const fields = [
    `FROM: ${facts.senderName}`,
    `REG:  ${facts.senderRegistryCode ?? '∅ MISSING'}`,
    `TO:   ${facts.recipientName}`,
    `ADDR: ${facts.recipientAddress}`,
    `OFFICE: ${facts.destinationOffice}`,
    `POST: ${facts.postmarkOffice} / NIGHT ${facts.issueDate}`,
    `SEAL: ${facts.seal.toUpperCase()}   POSTAGE: ${facts.postage.toUpperCase()}`,
    `DEADLINE: ${facts.deliveryDeadline === null ? '—' : 'NIGHT ' + facts.deliveryDeadline}`,
  ];
  fields.forEach((field, index) => put(left, 7 + index, `${index === 1 && state.perks.includes('registry-tabs') ? CYAN : theme}${field}${RESET}`));
  if (state.inspectionView === 'envelope') {
    put(left, 17, `${DIM}${theme}TAB: READ LETTER${RESET}`);
  } else {
    put(left, 17, `${theme}${state.inspectionView === 'letter' ? 'LETTER' : 'INSERT'}${RESET}`);
    const text = state.inspectionView === 'letter' ? facts.bodyText : facts.bodyClue ?? 'No insert is attached.';
    wrap(text, cols - left - 4).slice(0, 4).forEach((line, index) => put(left, 19 + index, `${theme}${line}${RESET}`));
  }
  if (facts.anomalies.length) put(left, 23, `${RED}⚠ ANOMALY: ${facts.anomalies.join(', ').toUpperCase()}${RESET}`);
  void out;
}

function renderAudit(out: string[], put: (x: number, y: number, value: string) => void, state: GameState, theme: string, cols: number): void {
  const audit = state.pendingAudit;
  if (!audit) return;
  const colour = audit.correct ? GREEN : RED;
  put(Math.max(5, Math.floor(cols / 2) - 20), 18, `${colour}\x1b[1m${audit.correct ? '✓ AUDIT ACCEPTED' : '⚠ AUDIT FLAGGED'}${RESET}`);
  put(Math.max(5, Math.floor(cols / 2) - 20), 19, `${colour}EXPECTED: ${DESTINATION_LABELS[audit.expected]}  CHOSE: ${DESTINATION_LABELS[audit.selected]}${RESET}`);
  put(Math.max(5, Math.floor(cols / 2) - 20), 20, `${theme}${audit.evaluation.explanations[0]}${RESET}`);
  put(Math.max(5, Math.floor(cols / 2) - 20), 21, `${DIM}${theme}ENTER: NEXT LETTER${RESET}`);
  void out;
}

function renderHelp(put: (x: number, y: number, value: string) => void, theme: string, cols: number): void {
  const x = Math.max(4, Math.floor((cols - 56) / 2));
  put(x, 8, `${MAGENTA}\x1b[1m? DESK HELP${RESET}`);
  ['1 Dispatch genuine routine mail', '2 Express genuine urgent mail', '3 Return forged or invalid mail', '4 Seal any cursed mail', 'TAB changes the document view', 'L shows every regulation', 'V spends one verification mark', 'H closes this card'].forEach((line, index) => put(x, 10 + index, `${theme}${line}${RESET}`));
}

function trustBar(value: number, max: number): string {
  return `${value}/${max} ` + '▰'.repeat(Math.max(0, value)) + '▱'.repeat(Math.max(0, max - value));
}

function wrap(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width && line) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function stripAnsi(value: string): string { return value.replace(/\x1b\[[0-9;]*m/g, ''); }
