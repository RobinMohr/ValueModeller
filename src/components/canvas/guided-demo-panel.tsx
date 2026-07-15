import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';
import { useGraphStore } from '../../store/graph-store';
import { useUiStore } from '../../store/ui-store';
import { Button } from '../ui/button';
import { useFocusTrap } from '../../hooks/use-focus-trap';
import type { SipocNode, SipocEdge } from '../../types/sipoc.types';

interface DemoStep {
  nodeId: string;
  label: string;
  description: string;
  role: string;
  metrics: string;
}

function getTopologicalOrder(nodes: SipocNode[], edges: SipocEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    const targets = adjacency.get(edge.source);
    if (targets) targets.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // Add any remaining nodes (disconnected) at the end
  for (const node of nodes) {
    if (!order.includes(node.id)) {
      order.push(node.id);
    }
  }

  return order;
}

function buildDemoSteps(nodes: SipocNode[], edges: SipocEdge[]): DemoStep[] {
  const order = getTopologicalOrder(nodes, edges);

  return order.map((nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const data = node.data;
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    // Determine the node's role in the flow
    let role = 'Step';
    if (incomingEdges.length === 0) {
      role = '🚀 Starting Point';
    } else if (outgoingEdges.length === 0) {
      role = '🏁 Final Step';
    } else if (outgoingEdges.length > 1) {
      role = '🔀 Branching Point';
    } else if (incomingEdges.length > 1) {
      role = '🔗 Merge Point';
    } else {
      role = '⚙️ Step';
    }

    // Build metrics string
    const metricsParts: string[] = [];
    if (data.cycleTime) metricsParts.push(`CT: ${data.cycleTime} min`);
    if (data.leadTime) metricsParts.push(`LT: ${data.leadTime} min`);
    if (data.valueAddPercent) metricsParts.push(`VA: ${data.valueAddPercent}%`);
    const metrics = metricsParts.length > 0 ? metricsParts.join(' · ') : '';

    return {
      nodeId,
      label: data.label || 'Unnamed Step',
      description: data.processDescription || 'No description provided.',
      role,
      metrics,
    };
  }).filter(Boolean) as DemoStep[];
}

export function GuidedDemoPanel() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const { fitView } = useReactFlow();

  const steps = useMemo(() => buildDemoSteps(nodes, edges), [nodes, edges]);

  const currentStep = steps[currentStepIndex] ?? null;

  const dialogRef = useFocusTrap<HTMLDivElement>({ isOpen: isActive });

  // Highlight current node and focus on it
  const focusNode = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex];
      if (!step) return;

      // Select only the current node to highlight it
      useGraphStore.setState({
        nodes: nodes.map((n) => ({
          ...n,
          selected: n.id === step.nodeId,
        })),
      });

      // Pan to the focused node
      fitView({
        nodes: [{ id: step.nodeId }],
        padding: 0.5,
        duration: 500,
        maxZoom: 1.5,
      });
    },
    [nodes, steps, fitView]
  );

  const startDemo = useCallback(() => {
    if (steps.length === 0) return;
    setIsActive(true);
    setCurrentStepIndex(0);
    closeSidePanel();
    focusNode(0);
  }, [steps, closeSidePanel, focusNode]);

  const stopDemo = useCallback(() => {
    setIsActive(false);
    setAutoPlay(false);
    setCurrentStepIndex(0);

    // Deselect all nodes
    useGraphStore.setState({
      nodes: nodes.map((n) => ({ ...n, selected: false })),
    });

    fitView({ padding: 0.2, duration: 300 });
  }, [nodes, fitView]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setCurrentStepIndex(index);
      focusNode(index);
    },
    [steps, focusNode]
  );

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      // End of demo — stop
      setAutoPlay(false);
      return;
    }
    goToStep(nextIndex);
  }, [currentStepIndex, steps, goToStep]);

  const prevStep = useCallback(() => {
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  const openDetails = useCallback(() => {
    if (currentStep) {
      openSidePanel(currentStep.nodeId);
    }
  }, [currentStep, openSidePanel]);

  // Auto-play: advance every 4 seconds
  useEffect(() => {
    if (!autoPlay || !isActive) return;

    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next >= steps.length) {
          setAutoPlay(false);
          return prev;
        }
        focusNode(next);
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [autoPlay, isActive, steps, focusNode]);

  // Keyboard navigation during demo
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          prevStep();
          break;
        case 'Escape':
          event.preventDefault();
          stopDemo();
          break;
        case 'Enter':
          event.preventDefault();
          openDetails();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, stopDemo, openDetails]);

  if (!isActive) {
    return (
      <Panel position="top-right" className="mt-2 mr-2">
        <Button
          onClick={startDemo}
          size="sm"
          variant="secondary"
          disabled={steps.length === 0}
          title="Start guided walkthrough of the value stream"
          aria-label="Start guided demo"
        >
          ▶ Demo
        </Button>
      </Panel>
    );
  }

  return (
    <Panel position="bottom-center" className="mb-4">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 max-w-md w-[400px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-demo-panel-title"
        aria-live="polite"
      >
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <h3 id="guided-demo-panel-title" className="sr-only">Guided Demo Walkthrough</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current step info */}
        {currentStep && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                {currentStep.role}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {currentStep.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {currentStep.description}
            </p>
            {currentStep.metrics && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {currentStep.metrics.split(' · ').map((metric) => (
                  <span
                    key={metric}
                    className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded"
                  >
                    {metric}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-1 mb-3">
          {steps.map((step, index) => (
            <button
              key={step.nodeId}
              onClick={() => goToStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStepIndex
                  ? 'bg-primary-500 scale-125'
                  : index < currentStepIndex
                    ? 'bg-primary-300 dark:bg-primary-700'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={`Go to step ${index + 1}: ${step.label}`}
              title={step.label}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              onClick={prevStep}
              size="sm"
              variant="ghost"
              disabled={currentStepIndex === 0}
              aria-label="Previous step"
              title="Previous (←)"
            >
              ←
            </Button>
            <Button
              onClick={() => setAutoPlay((prev) => !prev)}
              size="sm"
              variant="ghost"
              aria-label={autoPlay ? 'Pause auto-play' : 'Start auto-play'}
              title={autoPlay ? 'Pause' : 'Auto-play'}
            >
              {autoPlay ? '⏸' : '⏵'}
            </Button>
            <Button
              onClick={nextStep}
              size="sm"
              variant="ghost"
              disabled={currentStepIndex === steps.length - 1}
              aria-label="Next step"
              title="Next (→ or Space)"
            >
              →
            </Button>
          </div>

          <div className="flex gap-1">
            <Button
              onClick={openDetails}
              size="sm"
              variant="secondary"
              title="Open details panel (Enter)"
            >
              Details
            </Button>
            <Button
              onClick={stopDemo}
              size="sm"
              variant="ghost"
              title="Exit demo (Esc)"
              aria-label="Stop demo"
            >
              ✕ Exit
            </Button>
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
          ← → navigate · Space next · Enter details · Esc exit
        </p>
      </div>
    </Panel>
  );
}
