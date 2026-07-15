/**
 * Unit tests for cycle-detection utility
 *
 * Tests the wouldCreateCycle function which prevents cycles in the DAG.
 * AAA Principle: Arrange → Act → Assert
 */
import { describe, it, expect } from 'vitest';
import { wouldCreateCycle } from '../utils/cycle-detection';
import type { Edge } from '@xyflow/react';

describe('wouldCreateCycle', () => {
  it('should detect self-loops', () => {
    // Arrange
    const edges: Edge[] = [];

    // Act
    const result = wouldCreateCycle(edges, 'A', 'A');

    // Assert
    expect(result).toBe(true);
  });

  it('should return false for a valid new edge with no existing edges', () => {
    // Arrange
    const edges: Edge[] = [];

    // Act
    const result = wouldCreateCycle(edges, 'A', 'B');

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for a valid chain A → B → C (adding B → C)', () => {
    // Arrange
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
    ];

    // Act
    const result = wouldCreateCycle(edges, 'B', 'C');

    // Assert
    expect(result).toBe(false);
  });

  it('should detect a simple cycle A → B → A', () => {
    // Arrange
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
    ];

    // Act — try adding B → A which would create A → B → A
    const result = wouldCreateCycle(edges, 'B', 'A');

    // Assert
    expect(result).toBe(true);
  });

  it('should detect an indirect cycle A → B → C → A', () => {
    // Arrange
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
    ];

    // Act — try adding C → A which would create A → B → C → A
    const result = wouldCreateCycle(edges, 'C', 'A');

    // Assert
    expect(result).toBe(true);
  });

  it('should allow parallel edges in a DAG', () => {
    // Arrange — A → B, A → C, B → D, C → D
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'A', target: 'C' },
      { id: 'e3', source: 'B', target: 'D' },
    ];

    // Act — adding C → D should be fine (diamond pattern)
    const result = wouldCreateCycle(edges, 'C', 'D');

    // Assert
    expect(result).toBe(false);
  });

  it('should handle complex graph with multiple paths', () => {
    // Arrange — A → B, B → C, A → D, D → C, C → E
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
      { id: 'e3', source: 'A', target: 'D' },
      { id: 'e4', source: 'D', target: 'C' },
      { id: 'e5', source: 'C', target: 'E' },
    ];

    // Act — adding E → A would create a long cycle
    const result = wouldCreateCycle(edges, 'E', 'A');

    // Assert
    expect(result).toBe(true);
  });

  it('should return false when nodes are disconnected', () => {
    // Arrange — A → B, C → D (two separate chains)
    const edges: Edge[] = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'C', target: 'D' },
    ];

    // Act — adding B → C connects them without a cycle
    const result = wouldCreateCycle(edges, 'B', 'C');

    // Assert
    expect(result).toBe(false);
  });
});
