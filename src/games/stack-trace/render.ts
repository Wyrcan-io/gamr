import { activePuzzle } from './engine';
import { blockLabel } from './machine';
import type { StackTraceState, TestResult } from './types';

const ESC = '\x1b[';
const reset = `${ESC}0m`;
const dim = `${ESC}2m`;
const bright = `${ESC}1m`;
const cyan = `${ESC}36m`;
const green = `${ESC}92m`;
const amber = `${ESC}93m`;
const red = `${ESC}91m`;
const white = `${ESC}97m`;

function clip(value: string, width: number): string { return value.length <= width ? value.padEnd(width) : `${value.slice(0, Math.max(0, width - 1))}…`; }
function center(value: string, width: number): string { const left = Math.max(0, Math.floor((width - value.length) / 2)); return `${' '.repeat(left)}${value}`; }
function status(result: TestResult | undefined): string {
  if (!result || result.status === 'unrun') return `${dim}·${reset}`;
  if (result.status === 'pass') return `${green}✓${reset}`;
  if (result.status === 'fault') return `${amber}!${reset}`;
  return `${red}×${reset}`;
}
function box(title: string, width: number): string { return `┌─ ${title} ${'─'.repeat(Math.max(0, width - title.length - 5))}┐`; }

export function renderFrame(state: StackTraceState, cols: number, rows: number, themeColor: string): string {
  if (cols < 80 || rows < 28) return `${ESC}2J${ESC}H${center('STACK TRACE', cols)}\r\n\r\n${center('Terminal too small.', cols)}\r\n${center(`Need 80x28  Have ${cols}x${rows}`, cols)}\r\n${center('Make the pane larger, then return to the game.', cols)}`;
  const puzzle = activePuzzle(state);
  if (state.phase === 'start') return `${ESC}2J${ESC}H\r\n${themeColor}${bright}${center('S T A C K   T R A C E', cols)}${reset}\r\n${center('PROGRAM REPAIR CONSOLE', cols)}\r\n\r\n${center('A small program is broken. The tests know how it should behave.', cols)}\r\n${center('Move blocks. Mutate values. Run the suite. Read the trace.', cols)}\r\n\r\n${center(`${cyan}[T]${reset} tutorial    ${cyan}[P]${reset} campaign    ${cyan}[D]${reset} daily    ${cyan}[Q]${reset} quit`, cols)}\r\n\r\n${center('Every test is visible. Every failure is explainable.', cols)}`;
  if (state.phase === 'ending') return `${ESC}2J${ESC}H\r\n${themeColor}${bright}${center('REPAIR REPORT', cols)}${reset}\r\n\r\n${center('CAMPAIGN COMPLETE ★', cols)}\r\n${center(state.notice, cols)}\r\n\r\n${center('[R] restart current    [N] next game    [Q] quit', cols)}`;

  const lines: string[] = [];
  lines.push(`${themeColor}${bright}${center('S T A C K   T R A C E', cols)}${reset}`);
  lines.push(`${dim} CASE ${puzzle.id} / ${puzzle.chapter === 0 ? 'TUTORIAL' : `CHAPTER ${puzzle.chapter}`}   ${puzzle.title}${reset}`);
  lines.push(`${white}${clip(puzzle.contract, cols - 2)}${reset}`);
  lines.push('');
  const left = 48; const right = cols - left - 3;
  lines.push(`${box('EXECUTION TAPE', left)}   ${box('TEST SUITE', right)}`);
  for (let i = 0; i < Math.max(state.tape.length + 1, puzzle.tests.length + 1); i += 1) {
    let tape = '';
    if (i < state.tape.length) {
      const id = state.tape[i]; const selected = state.focus === 'tape' && state.selectedTapeSlot === i; const label = id ? blockLabel(state.blocks[id]) : '·';
      tape = `${selected ? `${cyan}▶${reset}` : ' '} L${String(i + 1).padStart(2, '0')} [${selected ? bright : ''}${clip(label, 14)}${selected ? reset : ''}]`;
    } else tape = ' '.repeat(23);
    const test = puzzle.tests[i]; const result = state.results[i];
    const testText = test ? `${status(result)} T${test.id.slice(1).padStart(2, '0')}  ${Object.entries(test.input).map(([key, value]) => `${key}=${String(value).padStart(3)}`).join(' ')} → ${String(test.expected).padStart(3)}${result?.actual === undefined ? '' : `  got ${result.actual}`}` : '';
    lines.push(`│ ${clip(tape, left - 2)} │   │ ${clip(testText, right - 2)} │`);
  }
  lines.push(`└${'─'.repeat(left - 1)}┘   └${'─'.repeat(right - 1)}┘`);
  lines.push('');
  lines.push(`${box('BLOCK TRAY', left)}   ${box('INSPECT / TRACE', right)}`);
  const tray = state.tray.length ? state.tray.map((id, index) => `${state.focus === 'tray' && index === state.selectedTrayIndex ? '▶' : ' '}[${blockLabel(state.blocks[id])}]`).join(' ') : '(empty — all blocks placed)';
  const selectedResult = state.results[state.selectedTestIndex]; const frame = selectedResult?.trace[state.traceFrameIndex];
  lines.push(`│ ${clip(tray, left - 2)} │   │ ${clip(frame ? `T${selectedResult.testId.slice(1)}  line ${frame.line + 1} ▶ ${frame.instruction}` : 'Select a test and run the suite.', right - 2)} │`);
  lines.push(`│ ${clip(state.liftedBlockId ? `LIFTED [${blockLabel(state.blocks[state.liftedBlockId])}] — choose empty slot` : `SELECTED ${state.focus.toUpperCase()}  ·  M mutates a block`, left - 2)} │   │ ${clip(frame ? `before [${frame.stackBefore.join(', ')}]  after [${frame.stackAfter.join(', ')}]` : 'S steps the selected trace; F jumps to first failure.', right - 2)} │`);
  lines.push(`└${'─'.repeat(left - 1)}┘   └${'─'.repeat(right - 1)}┘`);
  lines.push('');
  const passed = state.results.filter(result => result.status === 'pass').length;
  lines.push(`${amber}${clip(`NOTICE  ${state.notice}`, cols - 2)}${reset}`);
  lines.push(`${dim}${clip(`TESTS ${passed}/${puzzle.tests.length} PASS   RUNS ${state.runs}   EDITS ${state.edits}   Z undo · Y redo · R run · S step · H hint · Esc pause`, cols - 2)}${reset}`);
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}
