import Dagre from '@dagrejs/dagre';
import type { SipocNode, SipocEdge } from '../types/sipoc.types';

interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeWidth?: number;
  nodeHeight?: number;
  nodesep?: number;
  ranksep?: number;
}

/**
 * Applies a dagre auto-layout to the given nodes and edges.
 * Returns a new array of nodes with updated positions.
 */
export function getLayoutedNodes(
  nodes: SipocNode[],
  edges: SipocEdge[],
  options: LayoutOptions = {}
): SipocNode[] {
  const {
    direction = 'LR',
    nodeWidth = 200,
    nodeHeight = 90,
    nodesep = 50,
    ranksep = 100,
  } = options;

  const graph = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: direction,
    nodesep,
    ranksep,
    marginx: 20,
    marginy: 20,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  Dagre.layout(graph);

  return nodes.map((node) => {
    const dagreNode = graph.node(node.id);
    // Dagre returns center coordinates; React Flow uses top-left
    const x = dagreNode.x - nodeWidth / 2;
    const y = dagreNode.y - nodeHeight / 2;

    return {
      ...node,
      position: { x, y },
    };
  });
}
