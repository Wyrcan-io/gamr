import { RANGE_MAX, RANGE_MIN, type BlockInstance, type FaultCode, type PuzzleDefinition, type TestCase, type TestResult, type TraceFrame } from './types';

export function blockLabel(block: BlockInstance): string {
  if (block.kind === 'load') return `LOAD ${block.variant}`;
  if (block.kind === 'push') return `PUSH ${block.variant}`;
  if (block.kind === 'minmax') return String(block.variant);
  if (block.kind === 'predicate') return `${block.variant}?`;
  return String(block.variant);
}

function checked(value: number): number | FaultCode {
  return Number.isInteger(value) && value >= RANGE_MIN && value <= RANGE_MAX ? value : 'RANGE';
}

function pop(stack: number[], count: number): number[] | FaultCode {
  return stack.length >= count ? stack.splice(stack.length - count, count) : 'UNDERFLOW';
}

export function executeInstruction(block: BlockInstance, input: TestCase['input'], initial: number[]): { stack: number[]; output?: number; fault?: FaultCode } {
  const stack = [...initial];
  const binary = (operation: (a: number, b: number) => number): { stack: number[]; fault?: FaultCode } => {
    const values = pop(stack, 2);
    if (typeof values === 'string') return { stack, fault: values };
    const result = checked(operation(values[0], values[1]));
    if (typeof result === 'string') return { stack: [...stack, values[0], values[1]], fault: result };
    stack.push(result);
    return { stack };
  };
  switch (block.kind) {
    case 'load': stack.push(Number(input[block.variant as 'X' | 'Y'] ?? 0)); return { stack };
    case 'push': stack.push(Number(block.variant)); return { stack };
    case 'neg': {
      const values = pop(stack, 1); if (typeof values === 'string') return { stack, fault: values };
      const result = checked(-values[0]); if (typeof result === 'string') return { stack: [...stack, values[0]], fault: result };
      stack.push(result); return { stack };
    }
    case 'abs': {
      const values = pop(stack, 1); if (typeof values === 'string') return { stack, fault: values };
      const result = checked(Math.abs(values[0])); if (typeof result === 'string') return { stack: [...stack, values[0]], fault: result };
      stack.push(result); return { stack };
    }
    case 'dup': if (!stack.length) return { stack, fault: 'UNDERFLOW' }; stack.push(stack[stack.length - 1]); return { stack };
    case 'swap': {
      const values = pop(stack, 2); if (typeof values === 'string') return { stack, fault: values };
      stack.push(values[1], values[0]); return { stack };
    }
    case 'add': return binary((a, b) => a + b);
    case 'sub': return binary((a, b) => a - b);
    case 'mul': return binary((a, b) => a * b);
    case 'minmax': return binary((a, b) => block.variant === 'MAX' ? Math.max(a, b) : Math.min(a, b));
    case 'predicate': {
      const values = pop(stack, 1); if (typeof values === 'string') return { stack, fault: values };
      const result = block.variant === 'NEG' ? values[0] < 0 : values[0] === 0;
      stack.push(result ? 1 : 0); return { stack };
    }
    case 'select': {
      const values = pop(stack, 3); if (typeof values === 'string') return { stack, fault: values };
      const result = values[2] !== 0 ? values[1] : values[0]; stack.push(result); return { stack };
    }
    case 'return':
      if (stack.length !== 1) return { stack, fault: 'RETURN_ARITY' };
      return { stack: [], output: stack[0] };
    default: return { stack };
  }
}

export function runProgram(puzzle: PuzzleDefinition, tape: Array<string | null>, blocks: Record<string, BlockInstance>, test: TestCase): TestResult {
  void puzzle;
  let stack: number[] = [];
  const trace: TraceFrame[] = [];
  for (let index = 0; index < tape.length; index += 1) {
    const blockId = tape[index]; if (!blockId) continue;
    const block = blocks[blockId]; if (!block) continue;
    const before = [...stack];
    const result = executeInstruction(block, test.input, stack);
    const frame: TraceFrame = { line: index, blockId, instruction: blockLabel(block), stackBefore: before, stackAfter: [...result.stack] };
    if (result.fault) { frame.fault = result.fault; trace.push(frame); return { testId: test.id, status: 'fault', trace, fault: result.fault }; }
    stack = result.stack;
    if (result.output !== undefined) { frame.output = result.output; trace.push(frame); return { testId: test.id, status: result.output === test.expected ? 'pass' : 'mismatch', actual: result.output, trace }; }
    trace.push(frame);
  }
  return { testId: test.id, status: 'fault', trace, fault: 'RETURN_ARITY' };
}

export function runSuite(puzzle: PuzzleDefinition, tape: Array<string | null>, blocks: Record<string, BlockInstance>): TestResult[] {
  return puzzle.tests.map(test => runProgram(puzzle, tape, blocks, test));
}

export function totalSteps(results: TestResult[]): number { return results.reduce((sum, result) => sum + result.trace.length, 0); }
