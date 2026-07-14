import { useCallback, useState } from 'react';
import type { Node, Edge, OnNodeDrag } from '@xyflow/react';
import type { SipocNode, SipocEdge } from '../types/sipoc.types';

/** Distance in pixels below which nodes will auto-connect on drop */
const PROXIMITY_THRESHOLD = 150;

/** Estimated node dimensions for center calculation */
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

interface ProximityResult {
  sourceId: string;
  targetId: string;
}

interface ProximityEdgeInfo {
  sourceId: string;
  targetId: string;
  label: string;
}

function getNodeCenter(node: Node): { x: number; y: number } {
  return {
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  };
}

function getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Finds the closest node to the dragged node within the proximity threshold.
 * Determines connection direction based on relative horizontal position:
 * - If the closest node is to the LEFT → it becomes source (closest → dragged)
 * - If the closest node is to the RIGHT → dragged becomes source (dragged → closest)
 * Avoids creating duplicate edges.
 */
function findClosestNode(
  draggedNode: SipocNode,
  allNodes: SipocNode[],
  existingEdges: SipocEdge[]
): ProximityResult | null {
  const draggedCenter = getNodeCenter(draggedNode);
  let closestDistance = Infinity;
  let closestNode: SipocNode | null = null;

  for (const node of allNodes) {
    if (node.id === draggedNode.id) continue;

    const nodeCenter = getNodeCenter(node);
    const distance = getDistance(draggedCenter, nodeCenter);

    if (distance < PROXIMITY_THRESHOLD && distance < closestDistance) {
      closestDistance = distance;
      closestNode = node;
    }
  }

  if (!closestNode) return null;

  // Determine direction: left node is source, right node is target
  const draggedIsRight = draggedNode.position.x > closestNode.position.x;
  const sourceId = draggedIsRight ? closestNode.id : draggedNode.id;
  const targetId = draggedIsRight ? draggedNode.id : closestNode.id;

  // Don't create duplicate edges
  const edgeExists = existingEdges.some(
    (e) =>
      (e.source === sourceId && e.target === targetId) ||
      (e.source === targetId && e.target === sourceId)
  );

  if (edgeExists) return null;

  return { sourceId, targetId };
}

/**
 * Hook that provides proximity-based auto-edge creation.
 * When a node is dragged near another node, a ghost edge is shown.
 * On drop, the onCreateEdge callback is called with the edge info.
 */
export function useProximityConnect(
  nodes: SipocNode[],
  edges: SipocEdge[],
  getNodeById: (id: string) => SipocNode | undefined,
  onCreateEdge: (info: ProximityEdgeInfo) => void
) {
  const [ghostEdge, setGhostEdge] = useState<Edge | null>(null);

  const onNodeDrag: OnNodeDrag<SipocNode> = useCallback(
    (_event, draggedNode) => {
      const result = findClosestNode(draggedNode, nodes, edges);

      if (result) {
        const edge: Edge = {
          id: '__proximity-ghost__',
          source: result.sourceId,
          target: result.targetId,
          type: 'default',
          animated: true,
          style: {
            stroke: '#6366f1',
            strokeWidth: 2,
            strokeDasharray: '5,5',
            opacity: 0.6,
          },
        };
        setGhostEdge(edge);
      } else {
        setGhostEdge(null);
      }
    },
    [nodes, edges]
  );

  const onNodeDragStop: OnNodeDrag<SipocNode> = useCallback(
    (_event, draggedNode) => {
      // Recalculate with the final drop position
      const result = findClosestNode(draggedNode, nodes, edges);
      setGhostEdge(null);

      if (result) {
        // Derive edge label from source node's first output line
        const sourceNode = getNodeById(result.sourceId);
        const outputsText = sourceNode?.data?.outputs ?? '';
        const firstOutput = outputsText.split('\n').filter((s: string) => s.trim())[0] ?? '';

        onCreateEdge({
          sourceId: result.sourceId,
          targetId: result.targetId,
          label: firstOutput,
        });
      }
    },
    [nodes, edges, getNodeById, onCreateEdge]
  );

  return {
    ghostEdge,
    onNodeDrag,
    onNodeDragStop,
  };
}
