import Dagre from '@dagrejs/dagre';
import type { SipocNode, SipocEdge } from '../types/sipoc.types';

interface LayoutOptions {
  direction?: 'LR' | 'TB';
  /** Default width for nodes without measured dimensions */
  nodeWidth?: number;
  /** Default height for nodes without measured dimensions */
  nodeHeight?: number;
  nodesep?: number;
  ranksep?: number;
}

/**
 * Estimates the height of a SIPOC node based on its content.
 * Accounts for title, description, and SIPOC sections.
 */
function estimateNodeHeight(node: SipocNode): number {
  const BASE_HEIGHT = 52; // padding + title
  const LINE_HEIGHT = 16; // approx px per text line
  const SECTION_OVERHEAD = 20; // label + gap per SIPOC section
  const DESCRIPTION_OVERHEAD = 8;

  let height = BASE_HEIGHT;

  const data = node.data;

  // Process description
  if (data.processDescription && data.processDescription.trim()) {
    const lines = data.processDescription.split('\n').filter((l) => l.trim()).length;
    height += DESCRIPTION_OVERHEAD + lines * LINE_HEIGHT;
  }

  // SIPOC sections
  const sections = [data.suppliers, data.inputs, data.outputs, data.customers];
  for (const section of sections) {
    if (section && section.trim()) {
      const lines = section.split('\n').filter((l) => l.trim()).length;
      height += SECTION_OVERHEAD + lines * LINE_HEIGHT;
    }
  }

  // Border-top separator when content exists
  const hasContent = sections.some((s) => s && s.trim());
  if (hasContent) {
    height += 12; // border-t + mt-1 + pt-2
  }

  return Math.max(height, 90);
}

/**
 * Applies a dagre auto-layout to the given nodes and edges.
 * Uses per-node measured dimensions (from React Flow) when available,
 * falling back to content-based estimation or defaults.
 * Returns a new array of nodes with updated positions.
 */
export function getLayoutedNodes(
  nodes: SipocNode[],
  edges: SipocEdge[],
  options: LayoutOptions = {}
): SipocNode[] {
  const {
    direction = 'LR',
    nodeWidth = 280,
    nodeHeight = 200,
    nodesep = 80,
    ranksep = 120,
  } = options;

  const graph = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: direction,
    nodesep,
    ranksep,
    marginx: 20,
    marginy: 20,
  });

  // Use per-node dimensions: measured (from React Flow) > estimated > defaults
  const nodeSizes = new Map<string, { width: number; height: number }>();

  for (const node of nodes) {
    const measured = node.measured;
    let width: number;
    let height: number;

    if (measured?.width && measured?.height) {
      // React Flow has measured the actual rendered dimensions
      width = measured.width;
      height = measured.height;
    } else if (node.type === 'group' && node.style) {
      // Group nodes have explicit style dimensions
      width = (node.style.width as number) || 400;
      height = (node.style.height as number) || 250;
    } else {
      // Estimate from content or use defaults
      width = nodeWidth;
      height = estimateNodeHeight(node);
    }

    nodeSizes.set(node.id, { width, height });
    graph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  Dagre.layout(graph);

  return nodes.map((node) => {
    const dagreNode = graph.node(node.id);
    const size = nodeSizes.get(node.id) ?? { width: nodeWidth, height: nodeHeight };
    // Dagre returns center coordinates; React Flow uses top-left
    const x = dagreNode.x - size.width / 2;
    const y = dagreNode.y - size.height / 2;

    return {
      ...node,
      position: { x, y },
    };
  });
}
