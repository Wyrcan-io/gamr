import { activePuzzle } from './engine';
import { blockLabel } from './machine';
import type { StackTraceState, TestResult } from './types';
import { centerText, clipToWidth, padToWidth } from '../../ui/terminal';
import { getCurrentThemePalette, type TerminalThemePalette } from '../utils';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;

export interface StackTraceRenderOptions {
  helpOpen?: boolean;
}

function line(value: string, width: number, style = ''): string {
  return `${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`;
}

function center(value: string, width: number): string {
  return centerText(value, width);
}

/**
 * Stack Trace status vocabulary. The marker is the meaning; the palette is
 * only a second signal. This remains readable in Paper, Contrast, and logs.
 */
function status(result: TestResult | undefined, palette: TerminalThemePalette): { mark: string; style: string; label: string } {
  if (!result || result.status === 'unrun') return { mark: '[ ]', style: palette.muted, label: 'unrun' };
  if (result.status === 'pass') return { mark: '[+]', style: palette.good, label: 'pass' };
  if (result.status === 'fault') return { mark: '[!]', style: palette.warning, label: 'fault' };
  return { mark: '[x]', style: palette.danger, label: 'mismatch' };
}

function sectionLabel(label: string, width: number, palette: TerminalThemePalette): string {
  const rule = Math.max(0, width - label.length - 4);
  return `${palette.line}${BOLD}-- ${label} ${'-'.repeat(rule)}${RESET}`;
}

function resizeFrame(cols: number, rows: number, palette: TerminalThemePalette): string {
  const lines = [
    `${palette.focus}${BOLD}${center('g/ STACK TRACE / REPAIR BENCH', cols)}${RESET}`,
    '',
    center('This repair bench needs a little more room.', cols),
    center(`Need 80x24  Have ${cols}x${rows}`, cols),
    center('Resize the terminal, then return to the case.', cols),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function startFrame(cols: number, palette: TerminalThemePalette): string {
  const lines = [
    `${palette.focus}${BOLD}${center('g/ STACK TRACE', cols)}${RESET}`,
    center('PROGRAM REPAIR BENCH', cols),
    '',
    center('Move visible blocks through a broken program.', cols),
    center('Run the tests. Read the evidence. Change one thing at a time.', cols),
    '',
    center(`${palette.focus}[T]${RESET} tutorial   ${palette.focus}[P]${RESET} campaign   ${palette.focus}[D]${RESET} daily   ${palette.focus}[Q]${RESET} quit`, cols),
    '',
    `${palette.muted}${center('Every test is visible. Every failure leaves a trace.', cols)}${RESET}`,
    `${palette.muted}${center('? help', cols)}${RESET}`,
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function helpFrame(cols: number, palette: TerminalThemePalette): string {
  const lines = [
    `${palette.focus}${BOLD}${center('g/ STACK TRACE / HELP', cols)}${RESET}`,
    '',
    center('Repair loop', cols),
    center('1 tape   2 tray   3 tests   Tab cycles focus', cols),
    center('Arrows or W/A/S/D move the focused item', cols),
    center('Enter places, drops, or advances a trace', cols),
    center('Space lifts a block from the tape', cols),
    center('X/Backspace returns a block to the tray', cols),
    '',
    center('Evidence and editing', cols),
    center('R runs the suite   F finds the first failure', cols),
    center('M changes a mutable block   Z undo   Y redo', cols),
    center('H shows the next hint tier   S steps a trace', cols),
    '',
    center('Escape closes help or opens pause   Q quits from pause', cols),
    center(`${palette.focus}? / Escape  close`, cols),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function endingFrame(state: StackTraceState, cols: number, palette: TerminalThemePalette): string {
  const puzzle = activePuzzle(state);
  const record = state.clears[state.puzzleId];
  const lines = [
    `${palette.focus}${BOLD}${line('g/ STACK TRACE', cols)}${RESET}`,
    line(`CASE ${puzzle.id}  /  ${puzzle.title}`, cols, palette.muted),
    '',
    `${palette.good}${BOLD}${line('CAMPAIGN REPORT  [+] ALL ROUTINES REPAIRED', cols)}${RESET}`,
    line(record ? `LAST CASE  runs ${record.runs}  edits ${record.edits}  ${record.lean ? 'lean' : 'patched'}  ${record.clean ? 'clean trace' : 'trace reviewed'}` : 'Campaign report ready.', cols, palette.ink),
    line(state.notice, cols, palette.muted),
    '',
    line('The repair bench is clear. Choose another case or leave the bench.', cols, palette.ink),
    '',
    line('[R] replay current case   [N] next game   [Q] quit', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

export function renderFrame(
  state: StackTraceState,
  cols: number,
  rows: number,
  palette: TerminalThemePalette = getCurrentThemePalette(),
  options: StackTraceRenderOptions = {},
): string {
  if (cols < 80 || rows < 24) return resizeFrame(cols, rows, palette);
  if (options.helpOpen) return helpFrame(cols, palette);
  if (state.phase === 'start') return startFrame(cols, palette);
  if (state.phase === 'ending') return endingFrame(state, cols, palette);

  const puzzle = activePuzzle(state);
  const left = Math.min(42, Math.max(32, Math.floor((cols - 3) * 0.44)));
  const right = cols - left - 3;
  const lines: string[] = [];
  const chapter = puzzle.chapter === 0 ? 'TUTORIAL' : `CHAPTER ${puzzle.chapter}`;

  lines.push(`${palette.focus}${BOLD}${line('g/ STACK TRACE', cols)}${RESET}`);
  lines.push(line(`CASE ${puzzle.id}  /  ${chapter}  /  ${puzzle.title}`, cols, palette.muted));
  lines.push(line(`CONTRACT  ${puzzle.contract}`, cols, palette.ink));
  lines.push('');
  lines.push(`${sectionLabel('PROGRAM TAPE', left, palette)}   ${sectionLabel('TEST LEDGER', right, palette)}`);

  const rowCount = Math.max(state.tape.length + 1, puzzle.tests.length + 1);
  for (let index = 0; index < rowCount; index += 1) {
    const id = state.tape[index];
    const selected = state.focus === 'tape' && state.selectedTapeSlot === index;
    const tapeLabel = id ? blockLabel(state.blocks[id]) : 'empty';
    const tape = `${selected ? '>' : ' '} L${String(index + 1).padStart(2, '0')}  ${tapeLabel}`;
    const test = puzzle.tests[index];
    const result = state.results[index];
    const marker = status(result, palette);
    const input = test ? Object.entries(test.input).map(([key, value]) => `${key}=${String(value).padStart(3)}`).join(' ') : '';
    const testText = test
      ? `${marker.mark} T${test.id.slice(1).padStart(2, '0')}  ${input} -> ${String(test.expected).padStart(3)}${result?.actual === undefined ? '' : `  got ${result.actual}`}`
      : '';
    lines.push(`${line(tape, left, selected ? `${palette.focus}${BOLD}` : '')}   ${line(testText, right, test ? marker.style : '')}`);
  }

  lines.push('');
  lines.push(`${sectionLabel('BLOCK TRAY', left, palette)}   ${sectionLabel('TRACE INSPECTOR', right, palette)}`);
  const tray = state.tray.length
    ? state.tray.map((id, index) => `${state.focus === 'tray' && index === state.selectedTrayIndex ? '>' : ' '}[${blockLabel(state.blocks[id])}]`).join(' ')
    : '(empty - all blocks placed)';
  const selectedResult = state.results[state.selectedTestIndex];
  const trace = selectedResult?.trace[state.traceFrameIndex];
  const traceLine = trace
    ? `T${selectedResult.testId.slice(1)}  line ${trace.line + 1}  ${trace.instruction}`
    : 'Select a test and run the suite.';
  lines.push(`${line(tray, left)}   ${line(traceLine, right, trace ? palette.ink : palette.muted)}`);
  const held = state.liftedBlockId ? `LIFTED [${blockLabel(state.blocks[state.liftedBlockId])}]` : `FOCUS ${state.focus.toUpperCase()}`;
  const stack = trace ? `before [${trace.stackBefore.join(', ')}]  after [${trace.stackAfter.join(', ')}]` : 'S steps the selected trace; F finds the first failure.';
  lines.push(`${line(`${held}  *  M changes a mutable block`, left, palette.muted)}   ${line(stack, right, palette.muted)}`);

  lines.push('');
  const passed = state.results.filter((result) => result.status === 'pass').length;
  const statusStyle = state.phase === 'complete' ? palette.good : palette.warning;
  const statusLabel = state.phase === 'complete' ? 'RESULT [+]' : 'NOTICE';
  lines.push(line(`${statusLabel}  ${state.notice}`, cols, `${statusStyle}${BOLD}`));
  lines.push(line(`TESTS ${passed}/${puzzle.tests.length} PASS  *  RUNS ${state.runs}  *  EDITS ${state.edits}  *  HINTS ${state.hintsUsed}`, cols, palette.muted));
  if (state.phase === 'complete') {
    lines.push(line('[Enter/N] next case   [R] replay current   [?] help   [Esc] pause   [Q] quit', cols, palette.focus));
  } else {
    lines.push(line('1 tape  2 tray  3 tests  | arrows move | Enter act | R run | H hint | ? help | Esc pause', cols, palette.muted));
  }
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}
