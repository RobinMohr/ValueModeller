/**
 * Unit tests for auto-layout utility
 *
 * Tests dagre-based automatic node layout.
 * AAA Principle: Arrange → Act → Assert
 */
import { describe, it, expect } from 'vitest';
import { getLayoutedNodes } from '../utils/auto-layout';
import type { SipocNode, SipocEdge } from '../types/sipoc.types';

function makeNode(id: string, x = 0, y = 0): SipocNode {
  return {
    id,
    type: 'sipoc',
    position: { x, y },
    data: {
      label: `Node ${id}`,
      processDescription: '',
      suppliers: '',
      inputs: '',
      outputs: '',
      customers: '',
      applicationsInvolved: '',
      involvedTeams: '',
      knownIssues: '',
      cycleTime: '',
      leadTime: '',
      valueAddPercent: '',
    },
  };
}

function makeEdge(source: string, target: string): SipocEdge {
  return { id: `${source}-${target}`, source, target };
}

describe('getLayoutedNodes', () => {
  it('should return nodes with updated positions', () => {
    // Arrange
    const nodes = [makeNode('A'), makeNode('B')];
    const edges: SipocEdge[] = [makeEdge('A', 'B')];

    // Act
    const result = getLayoutedNodes(nodes, edges);

    // Assert
    expect(result).toHaveLength(2);
    // Positions should be different from 0,0 after layout
    const positionA = result.find((n) => n.id === 'A')!.position;
    const positionB = result.find((n) => n.id === 'B')!.position;
    // In LR direction, A should be left of B
    expect(positionA.x).toBeLessThan(positionB.x);
  });

  it('should arrange nodes left-to-right by default', () => {
    // Arrange
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges: SipocEdge[] = [makeEdge('A', 'B'), makeEdge('B', 'C')];

    // Act
    const result = getLayoutedNodes(nodes, edges);

    // Assert
    const xA = result.find((n) => n.id === 'A')!.position.x;
    const xB = result.find((n) => n.id === 'B')!.position.x;
    const xC = result.find((n) => n.id === 'C')!.position.x;
    expect(xA).toBeLessThan(xB);
    expect(xB).toBeLessThan(xC);
  });

  it('should support top-to-bottom direction', () => {
    // Arrange
    const nodes = [makeNode('A'), makeNode('B')];
    const edges: SipocEdge[] = [makeEdge('A', 'B')];

    // Act
    const result = getLayoutedNodes(nodes, edges, { direction: 'TB' });

    // Assert
    const yA = result.find((n) => n.id === 'A')!.position.y;
    const yB = result.find((n) => n.id === 'B')!.position.y;
    expect(yA).toBeLessThan(yB);
  });

  it('should handle a single node', () => {
    // Arrange
    const nodes = [makeNode('A')];
    const edges: SipocEdge[] = [];

    // Act
    const result = getLayoutedNodes(nodes, edges);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('A');
    expect(typeof result[0].position.x).toBe('number');
    expect(typeof result[0].position.y).toBe('number');
  });

  it('should preserve node data while updating positions', () => {
    // Arrange
    const nodes = [makeNode('A')];
    nodes[0].data.label = 'Custom Label';
    nodes[0].data.suppliers = 'Supplier X';
    const edges: SipocEdge[] = [];

    // Act
    const result = getLayoutedNodes(nodes, edges);

    // Assert
    expect(result[0].data.label).toBe('Custom Label');
    expect(result[0].data.suppliers).toBe('Supplier X');
  });

  it('should handle branching (diamond) patterns', () => {
    // Arrange — A → B, A → C, B → D, C → D
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
    const edges: SipocEdge[] = [
      makeEdge('A', 'B'),
      makeEdge('A', 'C'),
      makeEdge('B', 'D'),
      makeEdge('C', 'D'),
    ];

    // Act
    const result = getLayoutedNodes(nodes, edges);

    // Assert — D should be rightmost, A should be leftmost
    const xA = result.find((n) => n.id === 'A')!.position.x;
    const xD = result.find((n) => n.id === 'D')!.position.x;
    expect(xA).toBeLessThan(xD);
  });
});
