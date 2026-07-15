import { useCallback, useState } from 'react';
import type { NodeChange, NodePositionChange } from '@xyflow/react';
import { useGraphStore } from '../store/graph-store';
import { useUiStore } from '../store/ui-store';
import { getHelperLines } from '../utils/helper-lines';
import type { SipocNode } from '../types/sipoc.types';

export interface HelperLinesState {
  horizontal: number | null;
  vertical: number | null;
}

interface UseHelperLinesReturn {
  helperLines: HelperLinesState;
  handleNodesChange: (changes: NodeChange<SipocNode>[]) => void;
  clearHelperLines: () => void;
}

/**
 * Manages helper line state for snap-to-alignment during node dragging.
 * Wraps onNodesChange to detect position changes, compute helper lines,
 * and apply snap corrections when nodes are within the snap threshold.
 */
export function useHelperLines(): UseHelperLinesReturn {
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);

  const [helperLines, setHelperLines] = useState<HelperLinesState>({
    horizontal: null,
    vertical: null,
  });

  const clearHelperLines = useCallback(() => {
    setHelperLines({ horizontal: null, vertical: null });
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange<SipocNode>[]) => {
      // Close side panel if selected node is removed
      const removedIds = changes
        .filter((c): c is import('@xyflow/react').NodeRemoveChange => c.type === 'remove')
        .map((c) => c.id);

      if (removedIds.length > 0 && selectedNodeId && removedIds.includes(selectedNodeId)) {
        closeSidePanel();
      }

      // Helper lines: detect position changes (dragging) and snap to alignment
      const positionChanges = changes.filter(
        (c): c is NodePositionChange =>
          c.type === 'position' && c.dragging === true && c.position !== undefined
      );

      if (positionChanges.length === 1) {
        const change = positionChanges[0];
        const currentNodes = useGraphStore.getState().nodes;
        const draggingNode = currentNodes.find((n) => n.id === change.id);

        if (draggingNode && change.position) {
          // Create a temporary node at the new position for helper line calculation
          const tempNode = { ...draggingNode, position: change.position };
          const lines = getHelperLines(tempNode, currentNodes);

          setHelperLines({
            horizontal: lines.horizontal,
            vertical: lines.vertical,
          });

          // Apply snap if within threshold
          if (lines.snapX !== null || lines.snapY !== null) {
            change.position = {
              x: lines.snapX ?? change.position.x,
              y: lines.snapY ?? change.position.y,
            };
          }
        }
      } else if (positionChanges.length === 0) {
        // Not dragging — check if drag ended
        const hasNonDragging = changes.some(
          (c) => c.type === 'position' && c.dragging === false
        );
        if (hasNonDragging) {
          setHelperLines({ horizontal: null, vertical: null });
        }
      }

      onNodesChange(changes);
    },
    [onNodesChange, selectedNodeId, closeSidePanel]
  );

  return {
    helperLines,
    handleNodesChange,
    clearHelperLines,
  };
}
