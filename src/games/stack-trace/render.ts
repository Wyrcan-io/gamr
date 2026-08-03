import { activePuzzle } from './engine';
import { blockLabel } from './machine';
import type { StackTraceState, TestResult } from './types';
import { centerText, clipToWidth, padToWidth } from '../../ui/terminal';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const DIM = `${ESC}2m`;
const BOLD = `${ESC}1m`;
const GREEN = `${ESC}92m`;
const AMBER = `${ESC}93m`;
const RED = `${ESC}91m`;
const WHITE = `${ESC}97m`;

function line(value: string, width: number, style = ''): string {
  return `${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`;
}

function center(value: string, width: number): string {
  return centerText(value, width);
}

function status(result: TestResult | undefined): { mark: string; style: string } {
  if (!result || result.status === 'unrun') return { mark: '[ ]', style: DIM };
  if (result.status === 'pass') return { mark: '[+]', style: GREEN };
  if (result.status === 'fault') return { mark: '[!]', style: AMBER };
  return { mark: '[x]', style: RED };
}

function sectionLabel(label: string, width: number, themeColor: string): string {
  const rule = Math.max(0, width - label.length - 4);
  return `${themeColor}${BOLD}-- ${label} ${'-'.repeat(rule)}${RESET}`;
}

function resizeFrame(cols: number, rows: number): string {
  const lines = [
    `${ESC}2J${ESC}H${center('STACK TRACE / REPAIR BENCH', cols)}`,
    '',
    center('This repair bench needs a little more room.', cols),
    center(`Need 80×24  Have ${cols}×${rows}`, cols),
    center('Resize the terminal, then return to the case.', cols),
  ];
  return lines.join('\r\n');
}

export function renderFrame(state: StackTraceState, cols: number, rows: number, themeColor: string): string {
  if (cols < 80 || rows < 24) return resizeFrame(cols, rows);

  const puzzle = activePuzzle(state);
  if (state.phase === 'start') {
    const lines = [
      `${themeColor}${BOLD}${center('g/ STACK TRACE', cols)}${RESET}`,
      center('PROGRAM REPAIR BENCH', cols),
      '',
      center('Move visible blocks through a broken program.', cols),
      center('Run the tests. Read the evidence. Change one thing at a time.', cols),
      '',
      center(`${themeColor}[T]${RESET} tutorial   ${themeColor}[P]${RESET} campaign   ${themeColor}[D]${RESET} daily   ${themeColor}[Q]${RESET} quit`, cols),
      '',
      `${DIM}${center('Every test is visible. Every failure leaves a trace.', cols)}${RESET}`,
    ];
    return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
  }

  if (state.phase === 'ending') {
    const lines = [
      `${themeColor}${BOLD}${center('g/ STACK TRACE', cols)}${RESET}`,
      '',
      `${themeColor}${BOLD}${center('REPAIR REPORT', cols)}${RESET}`,
      center('CAMPAIGN COMPLETE [+]', cols),
      center(state.notice, cols),
      '',
      center('[R] restart current   [N] next game   [Q] quit', cols),
    ];
    return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
  }

  const left = 36;
  const right = cols - left - 3;
  const lines: string[] = [];
  const chapter = puzzle.chapter === 0 ? 'TUTORIAL' : `CHAPTER ${puzzle.chapter}`;
  lines.push(`${themeColor}${BOLD}${line('g/ STACK TRACE', cols)}${RESET}`);
  lines.push(line(`CASE ${puzzle.id}  /  ${chapter}  /  ${puzzle.title}`, cols, DIM));
  lines.push(line(`CONTRACT  ${puzzle.contract}`, cols, WHITE));
  lines.push('');
  lines.push(`${sectionLabel('PROGRAM TAPE', left, themeColor)}   ${sectionLabel('TEST LEDGER', right, themeColor)}`);

  const rowCount = Math.max(state.tape.length + 1, puzzle.tests.length + 1);
  for (let index = 0; index < rowCount; index += 1) {
    const id = state.tape[index];
    const selected = state.focus === 'tape' && state.selectedTapeSlot === index;
    const tapeLabel = id ? blockLabel(state.blocks[id]) : 'empty';
    const tape = `${selected ? '>' : ' '} L${String(index + 1).padStart(2, '0')}  ${tapeLabel}`;
    const test = puzzle.tests[index];
    const result = state.results[index];
    const marker = status(result);
    const testText = test
      ? `${marker.mark} T${test.id.slice(1).padStart(2, '0')}  ${Object.entries(test.input).map(([key, value]) => `${key}=${String(value).padStart(3)}`).join(' ')} -> ${String(test.expected).padStart(3)}${result?.actual === undefined ? '' : `  got ${result.actual}`}`
      : '';
    lines.push(`${line(tape, left, selected ? `${themeColor}${BOLD}` : '')}   ${line(testText, right, test ? marker.style : '')}`);
  }

  lines.push('');
  lines.push(`${sectionLabel('BLOCK TRAY', left, themeColor)}   ${sectionLabel('TRACE INSPECTOR', right, themeColor)}`);
  const tray = state.tray.length
    ? state.tray.map((id, index) => `${state.focus === 'tray' && index === state.selectedTrayIndex ? '>' : ' '}[${blockLabel(state.blocks[id])}]`).join(' ')
    : '(empty — all blocks placed)';
  const selectedResult = state.results[state.selectedTestIndex];
  const trace = selectedResult?.trace[state.traceFrameIndex];
  const traceLine = trace
    ? `T${selectedResult.testId.slice(1)}  line ${trace.line + 1}  ${trace.instruction}`
    : 'Select a test and run the suite.';
  lines.push(`${line(tray, left)}   ${line(traceLine, right, trace ? WHITE : DIM)}`);
  const held = state.liftedBlockId ? `LIFTED [${blockLabel(state.blocks[state.liftedBlockId])}]` : `FOCUS ${state.focus.toUpperCase()}`;
  const stack = trace ? `before [${trace.stackBefore.join(', ')}]  after [${trace.stackAfter.join(', ')}]` : 'S steps the selected trace; F finds the first failure.';
  lines.push(`${line(`${held}  ·  M changes a mutable block`, left, DIM)}   ${line(stack, right, DIM)}`);

  lines.push('');
  const passed = state.results.filter((result) => result.status === 'pass').length;
  lines.push(line(`NOTICE  ${state.notice}`, cols, `${AMBER}${BOLD}`));
  lines.push(line(`TESTS ${passed}/${puzzle.tests.length} PASS  ·  RUNS ${state.runs}  ·  EDITS ${state.edits}`, cols, DIM));
  lines.push(line('1 tape  2 tray  3 tests  ·  arrows move  ·  Enter/Space place  ·  R run  ·  H hint  ·  Esc pause', cols, DIM));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}
