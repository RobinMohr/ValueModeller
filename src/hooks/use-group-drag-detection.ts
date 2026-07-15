import { useCallback } from 'react';
import type { OnNodeDrag } from '@xyflow/react';
import { useGraphStore } from '../store/graph-store';
import type { SipocNode } from '../types/sipoc.types';

/**
 * Detects when a node is dragged into or out of a group node and
 * automatically assigns/unassigns group membership.
 *
 * Returns a handler to be composed with other onNodeDragStop handlers.
 */
export function useGroupDragDetection(): {
  handleGroupDetection: OnNodeDrag<SipocNode>;
} {
  const handleGroupDetection: OnNodeDrag<SipocNode> = useCallback(
    (_event, node) => {
      // Skip group assignment for group nodes themselves
      if (node.type === 'group') return;

      // Check if the dragged node was dropped inside a group node
      const allNodes = useGraphStore.getState().nodes;
      const assignNodeToGroup = useGraphStore.getState().assignNodeToGroup;

      // Get absolute position of the dragged node
      const nodeAbsX = node.position.x;
      const nodeAbsY = node.position.y;

      // Find group nodes that contain this position
      const groupNode = allNodes.find((n) => {
        if (n.type !== 'group') return false;
        if (n.id === node.id) return false;
        // Already has this parent — skip reassignment
        if ((node as Record<string, unknown>).parentId === n.id) return false;

        const gx = n.position.x;
        const gy = n.position.y;
        const gw = (n.style?.width as number) ?? (n.measured?.width ?? 400);
        const gh = (n.style?.height as number) ?? (n.measured?.height ?? 250);

        return nodeAbsX >= gx && nodeAbsX <= gx + gw && nodeAbsY >= gy && nodeAbsY <= gy + gh;
      });

      const currentParent = (node as Record<string, unknown>).parentId as string | undefined;

      if (groupNode && currentParent !== groupNode.id) {
        // Assign to group
        assignNodeToGroup(node.id, groupNode.id);
      } else if (!groupNode && currentParent) {
        // Removed from group — convert to absolute position
        const parentNode = allNodes.find((n) => n.id === currentParent);
        if (parentNode) {
          // First update position to absolute, then remove parent
          const absPosition = {
            x: node.position.x + parentNode.position.x,
            y: node.position.y + parentNode.position.y,
          };
          useGraphStore.setState({
            nodes: allNodes.map((n) => {
              if (n.id !== node.id) return n;
              const { parentId, extent, ...rest } = n as Record<string, unknown>;
              return { ...rest, position: absPosition } as SipocNode;
            }),
          });
        }
      }
    },
    []
  );

  return { handleGroupDetection };
}
