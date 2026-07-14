import { useStore, type ReactFlowState } from '@xyflow/react';

interface HelperLinesRendererProps {
  horizontal: number | null;
  vertical: number | null;
}

// We need the viewport transform to convert flow coordinates to screen coordinates
const transformSelector = (state: ReactFlowState) => state.transform;

/**
 * Renders alignment helper lines on the canvas.
 * Lines are drawn in flow-coordinate space using a ViewportPortal-like approach:
 * an absolutely-positioned SVG overlay transformed with the viewport.
 */
export function HelperLinesRenderer({ horizontal, vertical }: HelperLinesRendererProps) {
  const transform = useStore(transformSelector);

  if (horizontal === null && vertical === null) {
    return null;
  }

  // The SVG is positioned at 0,0 in the flow and scaled/translated with the viewport
  const [tx, ty, zoom] = transform;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1000] h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {vertical !== null && (
        <line
          x1={vertical * zoom + tx}
          y1={0}
          x2={vertical * zoom + tx}
          y2="100%"
          stroke="#6366f1"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}
      {horizontal !== null && (
        <line
          x1={0}
          y1={horizontal * zoom + ty}
          x2="100%"
          y2={horizontal * zoom + ty}
          stroke="#6366f1"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}
    </svg>
  );
}
