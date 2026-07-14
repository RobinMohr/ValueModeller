import type { Node } from '@xyflow/react';

export interface HelperLines {
  horizontal: number | null;
  vertical: number | null;
  snapX: number | null;
  snapY: number | null;
}

const SNAP_THRESHOLD = 5;

// Default node dimensions (used when measured dimensions aren't available)
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 100;

function getNodeDimensions(node: Node): { width: number; height: number } {
  return {
    width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
  };
}

/**
 * Computes helper line positions and snap offsets for a dragging node
 * relative to all other nodes.
 *
 * Checks alignment on 5 reference points per axis:
 *   - left edge, center-x, right edge (horizontal snap → vertical line)
 *   - top edge, center-y, bottom edge (vertical snap → horizontal line)
 */
export function getHelperLines(
  draggingNode: Node,
  nodes: Node[]
): HelperLines {
  const result: HelperLines = {
    horizontal: null,
    vertical: null,
    snapX: null,
    snapY: null,
  };

  const dragDims = getNodeDimensions(draggingNode);
  const dragCenterX = draggingNode.position.x + dragDims.width / 2;
  const dragCenterY = draggingNode.position.y + dragDims.height / 2;
  const dragLeft = draggingNode.position.x;
  const dragRight = draggingNode.position.x + dragDims.width;
  const dragTop = draggingNode.position.y;
  const dragBottom = draggingNode.position.y + dragDims.height;

  let closestDistX = SNAP_THRESHOLD + 1;
  let closestDistY = SNAP_THRESHOLD + 1;

  for (const node of nodes) {
    if (node.id === draggingNode.id) continue;

    const dims = getNodeDimensions(node);
    const nodeCenterX = node.position.x + dims.width / 2;
    const nodeCenterY = node.position.y + dims.height / 2;
    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + dims.width;
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + dims.height;

    // Vertical alignment checks (produces vertical helper line, snaps X)
    const xChecks = [
      { dragRef: dragLeft, nodeRef: nodeLeft }, // left-to-left
      { dragRef: dragLeft, nodeRef: nodeCenterX }, // left-to-center
      { dragRef: dragLeft, nodeRef: nodeRight }, // left-to-right
      { dragRef: dragCenterX, nodeRef: nodeLeft }, // center-to-left
      { dragRef: dragCenterX, nodeRef: nodeCenterX }, // center-to-center
      { dragRef: dragCenterX, nodeRef: nodeRight }, // center-to-right
      { dragRef: dragRight, nodeRef: nodeLeft }, // right-to-left
      { dragRef: dragRight, nodeRef: nodeCenterX }, // right-to-center
      { dragRef: dragRight, nodeRef: nodeRight }, // right-to-right
    ];

    for (const { dragRef, nodeRef } of xChecks) {
      const dist = Math.abs(dragRef - nodeRef);
      if (dist < closestDistX) {
        closestDistX = dist;
        // Snap: adjust dragging node position so dragRef aligns with nodeRef
        result.vertical = nodeRef;
        result.snapX = draggingNode.position.x + (nodeRef - dragRef);
      }
    }

    // Horizontal alignment checks (produces horizontal helper line, snaps Y)
    const yChecks = [
      { dragRef: dragTop, nodeRef: nodeTop }, // top-to-top
      { dragRef: dragTop, nodeRef: nodeCenterY }, // top-to-center
      { dragRef: dragTop, nodeRef: nodeBottom }, // top-to-bottom
      { dragRef: dragCenterY, nodeRef: nodeTop }, // center-to-top
      { dragRef: dragCenterY, nodeRef: nodeCenterY }, // center-to-center
      { dragRef: dragCenterY, nodeRef: nodeBottom }, // center-to-bottom
      { dragRef: dragBottom, nodeRef: nodeTop }, // bottom-to-top
      { dragRef: dragBottom, nodeRef: nodeCenterY }, // bottom-to-center
      { dragRef: dragBottom, nodeRef: nodeBottom }, // bottom-to-bottom
    ];

    for (const { dragRef, nodeRef } of yChecks) {
      const dist = Math.abs(dragRef - nodeRef);
      if (dist < closestDistY) {
        closestDistY = dist;
        result.horizontal = nodeRef;
        result.snapY = draggingNode.position.y + (nodeRef - dragRef);
      }
    }
  }

  // Only return snap/lines when within threshold
  if (closestDistX > SNAP_THRESHOLD) {
    result.vertical = null;
    result.snapX = null;
  }
  if (closestDistY > SNAP_THRESHOLD) {
    result.horizontal = null;
    result.snapY = null;
  }

  return result;
}
