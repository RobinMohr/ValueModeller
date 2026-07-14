import type { Edge } from '@xyflow/react';

/**
 * Checks if adding an edge from `source` to `target` would create a cycle
 * in the directed graph. Value streams must be DAGs (Directed Acyclic Graphs).
 *
 * Uses BFS to determine if there's already a path from `target` to `source`.
 * If such a path exists, adding the edge source→target would create a cycle.
 */
export function wouldCreateCycle(
  edges: Edge[],
  source: string,
  target: string
): boolean {
  // Self-loop is always a cycle
  if (source === target) return true;

  // Build adjacency list from existing edges
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    } else {
      adjacency.set(edge.source, [edge.target]);
    }
  }

  // BFS from `target` to see if we can reach `source`
  const visited = new Set<string>();
  const queue: string[] = [target];
  visited.add(target);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) return true;

    const neighbors = adjacency.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  return false;
}
