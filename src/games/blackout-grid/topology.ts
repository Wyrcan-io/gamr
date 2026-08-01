import type { Assignment, GameState, GridEdge, GridNode, Point } from './types';

interface Adjacent { edge: GridEdge; other: string; }

function conducting(edge: GridEdge): boolean {
  return edge.condition === 'intact' && edge.breaker === 'closed';
}

export function adjacency(state: GameState, includeOpen = false): Record<string, Adjacent[]> {
  const result: Record<string, Adjacent[]> = {};
  for (const id of Object.keys(state.nodes)) result[id] = [];
  for (const edge of Object.values(state.edges)) {
    if (!includeOpen && !conducting(edge)) continue;
    result[edge.from]?.push({ edge, other: edge.to });
    result[edge.to]?.push({ edge, other: edge.from });
  }
  for (const entries of Object.values(result)) entries.sort((a, b) => a.edge.id.localeCompare(b.edge.id));
  return result;
}

function sourceNode(node: GridNode): boolean {
  return node.sourceOnline && (node.kind === 'bulk-source' || node.kind === 'microgrid');
}

function component(start: string, state: GameState, ignoredEdgeId?: string): Set<string> {
  const result = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of Object.values(state.edges).sort((a, b) => a.id.localeCompare(b.id))) {
      if (edge.id === ignoredEdgeId || !conducting(edge)) continue;
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (next && !result.has(next)) { result.add(next); queue.push(next); }
    }
  }
  return result;
}

export function canCloseEdge(state: GameState, edgeId: string): { ok: boolean; reason?: string } {
  const edge = state.edges[edgeId];
  if (!edge) return { ok: false, reason: 'NO SUCH EDGE' };
  if (edge.condition !== 'intact') return { ok: false, reason: 'EDGE IS NOT READY' };
  if (edge.breaker === 'closed') return { ok: false, reason: 'EDGE IS ALREADY CLOSED' };
  if (edge.breaker === 'tripped' && (edge.tripCause === 'fault' || edge.heat >= 40)) return { ok: false, reason: `BREAKER HOT ${Math.round(edge.heat)}%` };
  const left = component(edge.from, state, edge.id);
  if (left.has(edge.to)) return { ok: false, reason: 'LOOP WOULD BE LIVE' };
  const right = component(edge.to, state, edge.id);
  const sources = [...new Set([...left, ...right])].filter(id => sourceNode(state.nodes[id])).length;
  if (sources > 1) return { ok: false, reason: 'LIVE SOURCES NOT SYNCHRONIZED' };
  return { ok: true };
}

export function buildAssignments(state: GameState): Record<string, Assignment> {
  const assignments: Record<string, Assignment> = {};
  const graph = adjacency(state);
  const sources = Object.values(state.nodes).filter(sourceNode).sort((a, b) => a.id.localeCompare(b.id));
  for (const source of sources) {
    if (assignments[source.id]) continue;
    assignments[source.id] = { nodeId: source.id, sourceId: source.id, parentNodeId: null, parentEdgeId: null, depth: 0 };
    const queue = [source.id];
    while (queue.length) {
      const current = queue.shift()!;
      const currentAssignment = assignments[current];
      for (const { edge, other } of graph[current] ?? []) {
        if (assignments[other]) continue;
        assignments[other] = { nodeId: other, sourceId: source.id, parentNodeId: current, parentEdgeId: edge.id, depth: currentAssignment.depth + 1 };
        queue.push(other);
      }
    }
  }
  return assignments;
}

export function updateEnergization(state: GameState): { energized: string[]; deenergized: string[] } {
  const before = new Set(Object.values(state.edges).filter(edge => edge.energized).map(edge => edge.id));
  state.assignments = buildAssignments(state);
  for (const edge of Object.values(state.edges)) edge.energized = false;
  for (const assignment of Object.values(state.assignments)) if (assignment.parentEdgeId) state.edges[assignment.parentEdgeId].energized = true;
  const energized = Object.values(state.edges).filter(edge => edge.energized && !before.has(edge.id)).map(edge => edge.id).sort();
  const deenergized = Object.values(state.edges).filter(edge => !edge.energized && before.has(edge.id)).map(edge => edge.id).sort();
  return { energized, deenergized };
}

export function nodeAt(state: GameState, point: Point): GridNode | undefined {
  return Object.values(state.nodes).find(node => node.position.x === point.x && node.position.y === point.y);
}

export function edgeAt(state: GameState, point: Point): GridEdge | undefined {
  return Object.values(state.edges).find(edge => edge.route.some(routePoint => routePoint.x === point.x && routePoint.y === point.y));
}

export function downstreamDemand(state: GameState, activeDistrictIds: Set<string>): void {
  for (const node of Object.values(state.nodes)) { node.flowMW = 0; node.heat = Math.max(0, node.heat); }
  for (const edge of Object.values(state.edges)) edge.flowMW = 0;
  const nodes = Object.values(state.assignments).sort((a, b) => b.depth - a.depth || a.nodeId.localeCompare(b.nodeId));
  const subtotal: Record<string, number> = {};
  for (const assignment of nodes) {
    const node = state.nodes[assignment.nodeId];
    const district = node?.district;
    const own = district && activeDistrictIds.has(node.id) && district.powered && district.serviceBreaker === 'closed' ? district.requestedMW : 0;
    subtotal[node.id] = (subtotal[node.id] ?? 0) + own;
    node.flowMW = subtotal[node.id];
    if (assignment.parentNodeId && assignment.parentEdgeId) {
      state.edges[assignment.parentEdgeId].flowMW = subtotal[node.id];
      subtotal[assignment.parentNodeId] = (subtotal[assignment.parentNodeId] ?? 0) + subtotal[node.id];
    }
  }
}

export function sourceForNode(state: GameState, nodeId: string): string | null {
  return state.assignments[nodeId]?.sourceId ?? null;
}

