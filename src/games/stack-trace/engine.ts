import { campaignPuzzles, puzzleById } from './content';
import { dailyDate, dailyPuzzleId } from './daily';
import { runSuite, totalSteps } from './machine';
import type { BlockInstance, BlockVariant, Command, CommandResult, PuzzleDefinition, RepairSnapshot, StackTraceState } from './types';

function snapshot(state: StackTraceState): RepairSnapshot {
  const variants: Record<string, BlockVariant> = {};
  Object.values(state.blocks).forEach(block => { variants[block.id] = block.variant; });
  return { tape: [...state.tape], variants };
}

function restore(state: StackTraceState, value: RepairSnapshot): void {
  state.tape = [...value.tape];
  Object.entries(value.variants).forEach(([id, variant]) => { if (state.blocks[id]) state.blocks[id].variant = variant; });
  state.tray = Object.keys(state.blocks).filter(id => !state.tape.includes(id) && !state.blocks[id].locked);
}

function freshPuzzle(puzzle: PuzzleDefinition, mode: StackTraceState['mode'], clears: StackTraceState['clears'] = {}): StackTraceState {
  const blocks: Record<string, BlockInstance> = Object.fromEntries(puzzle.blocks.map(block => [block.id, { ...block, variants: block.variants ? [...block.variants] : undefined }]));
  const returnId = puzzle.blocks.find(block => block.locked)?.id ?? puzzle.blocks[puzzle.blocks.length - 1].id;
  return {
    version: 1, phase: 'brief', mode, puzzleId: puzzle.id, tape: Array.from({ length: puzzle.slotCount }, (_, index) => index === puzzle.slotCount - 1 ? returnId : null),
    tray: puzzle.blocks.filter(block => block.id !== returnId).map(block => block.id), blocks, selectedTapeSlot: 0, selectedTrayIndex: 0, selectedTestIndex: 0, traceFrameIndex: 0,
    focus: 'tape', liftedBlockId: null, results: puzzle.tests.map(test => ({ testId: test.id, status: 'unrun', trace: [] })), undo: [], redo: [], clears, edits: 0, runs: 0, hintsUsed: 0,
    notice: 'READ THE CONTRACT. REPAIR THE TAPE, THEN RUN THE SUITE.',
  };
}

export function createState(): StackTraceState {
  return { ...freshPuzzle(campaignPuzzles()[0], 'campaign'), phase: 'start', notice: 'STACK TRACE // A PROGRAM REPAIR CONSOLE' };
}

export function activePuzzle(state: StackTraceState): PuzzleDefinition { return puzzleById(state.puzzleId); }
function setEdit(state: StackTraceState): void { state.phase = 'editing'; state.results = activePuzzle(state).tests.map(test => ({ testId: test.id, status: 'unrun', trace: [] })); state.traceFrameIndex = 0; state.notice = 'PROGRAM MODIFIED — VERIFY AGAIN.'; }
function commitEdit(state: StackTraceState): void { state.undo.push(snapshot(state)); if (state.undo.length > 50) state.undo.shift(); state.redo = []; state.edits += 1; setEdit(state); }
function hasBlock(state: StackTraceState, id: string): boolean { return state.tape.includes(id) || state.tray.includes(id); }
function cycleVariant(block: BlockInstance, direction: -1 | 1): void { if (!block.variants?.length) return; const index = block.variants.findIndex(value => value === block.variant); block.variant = block.variants[(index + direction + block.variants.length) % block.variants.length]; }
function currentIndex(state: StackTraceState): number { return state.focus === 'tray' ? state.selectedTrayIndex : state.focus === 'tests' ? state.selectedTestIndex : state.selectedTapeSlot; }
function moveSelection(state: StackTraceState, delta: -1 | 1): void {
  const max = state.focus === 'tape' ? state.tape.length : state.focus === 'tray' ? Math.max(1, state.tray.length) : activePuzzle(state).tests.length;
  const next = (currentIndex(state) + delta + max) % max;
  if (state.focus === 'tape') state.selectedTapeSlot = next;
  else if (state.focus === 'tray') state.selectedTrayIndex = next;
  else state.selectedTestIndex = next;
}

export function applyCommand(input: StackTraceState, command: Command): CommandResult {
  const state = input;
  const events: string[] = [];
  if (command.type === 'start' && state.phase === 'start') {
    const puzzle = command.mode === 'daily' ? puzzleById(dailyPuzzleId()) : campaignPuzzles()[0];
    const fresh = freshPuzzle(puzzle, command.mode); fresh.phase = 'editing'; fresh.notice = command.mode === 'daily' ? `DAILY TRACE ${dailyDate()} // REPAIR TODAY'S ROUTINE.` : command.mode === 'tutorial' ? 'TUTORIAL // MOVE LOAD X INTO THE TAPE.' : fresh.notice; return { state: fresh, events: ['start'] };
  }
  if (command.type === 'restart') { const fresh = freshPuzzle(activePuzzle(state), state.mode, state.clears); fresh.phase = 'editing'; return { state: fresh, events: ['restart'] }; }
  if (state.phase === 'start' || state.phase === 'brief' || state.phase === 'ending') return { state, events };
  if (command.type === 'focus') { state.focus = command.focus; state.notice = `${command.focus.toUpperCase()} FOCUS.`; return { state, events }; }
  if (command.type === 'move') { moveSelection(state, command.delta); return { state, events }; }
  if (command.type === 'insert') {
    if (state.focus !== 'tray' || !state.tray.includes(command.blockId) || state.tape[command.at]) { state.notice = 'SLOT OCCUPIED — LIFT OR CHOOSE AN EMPTY SLOT.'; return { state, events: ['invalid'] }; }
    commitEdit(state); state.tape[command.at] = command.blockId; state.tray = state.tray.filter(id => id !== command.blockId); state.notice = `${state.blocks[command.blockId].variant} PLACED AT LINE ${command.at + 1}.`; events.push('placed'); return { state, events };
  }
  if (command.type === 'lift') {
    const id = state.tape[command.at]; if (!id || state.blocks[id].locked || state.liftedBlockId) { state.notice = 'SELECT A MOVABLE BLOCK.'; return { state, events: ['invalid'] }; }
    commitEdit(state); state.tape[command.at] = null; state.liftedBlockId = id; state.notice = `LIFTED ${state.blocks[id].variant}. CHOOSE A SLOT, THEN DROP.`; events.push('moved'); return { state, events };
  }
  if (command.type === 'drop') {
    const id = state.liftedBlockId; if (!id || state.tape[command.at] || state.blocks[id].locked) { state.notice = 'DROP ON AN EMPTY SLOT.'; return { state, events: ['invalid'] }; }
    commitEdit(state); state.tape[command.at] = id; state.liftedBlockId = null; state.notice = `${state.blocks[id].variant} DROPPED AT LINE ${command.at + 1}.`; events.push('moved'); return { state, events };
  }
  if (command.type === 'return') {
    const id = state.tape[command.at]; if (!id || state.blocks[id].locked) { state.notice = 'RETURN CANNOT BE REMOVED.'; return { state, events: ['invalid'] }; }
    commitEdit(state); state.tape[command.at] = null; state.tray.push(id); state.notice = `${state.blocks[id].variant} RETURNED TO TRAY.`; events.push('moved'); return { state, events };
  }
  if (command.type === 'mutate') {
    const block = state.blocks[command.blockId]; if (!block || !hasBlock(state, command.blockId) || !block.variants?.length) { state.notice = 'THIS BLOCK HAS NO MUTABLE FIELD.'; return { state, events: ['invalid'] }; }
    commitEdit(state); cycleVariant(block, command.direction); state.notice = `${block.id.toUpperCase()} MUTATED → ${block.variant}.`; events.push('mutated'); return { state, events };
  }
  if (command.type === 'undo' || command.type === 'redo') {
    const from = command.type === 'undo' ? state.undo : state.redo; const to = command.type === 'undo' ? state.redo : state.undo; const value = from.pop();
    if (!value) { state.notice = `NO ${command.type === 'undo' ? 'UNDO' : 'REDO'} AVAILABLE.`; return { state, events: ['invalid'] }; }
    to.push(snapshot(state)); restore(state, value); state.liftedBlockId = null; setEdit(state); state.notice = `${command.type.toUpperCase()} APPLIED.`; events.push(command.type); return { state, events };
  }
  if (command.type === 'run') {
    const puzzle = activePuzzle(state); state.results = runSuite(puzzle, state.tape, state.blocks); state.runs += 1; state.traceFrameIndex = 0; const passed = state.results.every(result => result.status === 'pass');
    if (passed) {
      state.phase = 'complete'; const record = { patched: true, lean: state.tape.filter(Boolean).length - 1 <= (puzzle.targets?.maxBlocks ?? 999), clean: totalSteps(state.results) <= (puzzle.targets?.maxTotalSteps ?? 999), runs: state.runs, edits: state.edits }; state.clears[state.puzzleId] = record; state.notice = `ALL TESTS PASS ✓  ${record.lean ? 'LEAN' : 'PATCHED'} REPAIR ACCEPTED.`; events.push('complete');
    } else { state.phase = 'editing'; const first = state.results.find(result => result.status !== 'pass'); state.selectedTestIndex = Math.max(0, state.results.indexOf(first!)); state.notice = first?.status === 'fault' ? `${first.fault} AT TEST ${first.testId}. STEP THE TRACE.` : `MISMATCH AT TEST ${first?.testId ?? 'UNKNOWN'}.`; events.push(first?.status === 'fault' ? 'fault' : 'run'); }
    return { state, events };
  }
  if (command.type === 'selectTest') { state.selectedTestIndex = (state.selectedTestIndex + command.delta + activePuzzle(state).tests.length) % activePuzzle(state).tests.length; state.traceFrameIndex = 0; return { state, events }; }
  if (command.type === 'trace') { const result = state.results[state.selectedTestIndex]; if (result?.trace.length) state.traceFrameIndex = Math.max(0, Math.min(result.trace.length - 1, state.traceFrameIndex + command.delta)); return { state, events }; }
  if (command.type === 'hint') { const puzzle = activePuzzle(state); state.hintsUsed = Math.max(state.hintsUsed, command.tier); state.notice = puzzle.hints[command.tier - 1]; return { state, events: ['hint'] }; }
  if (command.type === 'next' && state.phase === 'complete') {
    const list = campaignPuzzles(); const index = list.findIndex(puzzle => puzzle.id === state.puzzleId); if (index >= 0 && index < list.length - 1) { const fresh = freshPuzzle(list[index + 1], state.mode, state.clears); fresh.phase = 'editing'; fresh.notice = `CASE ${fresh.puzzleId} LOADED. READ THE CONTRACT.`; return { state: fresh, events: ['next'] }; }
    state.phase = 'ending'; state.notice = 'CAMPAIGN COMPLETE ★ ALL ROUTINES REPAIRED.'; return { state, events: ['ending'] };
  }
  return { state, events };
}
