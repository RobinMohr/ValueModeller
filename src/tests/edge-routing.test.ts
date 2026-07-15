/**
 * Unit tests for edge-routing utilities
 *
 * Tests getObstructingNodes and computeSmartPath for edge avoidance routing.
 * AAA Principle: Arrange → Act → Assert
 */
import { describe, it, expect } from 'vitest';
import { getObstructingNodes, computeSmartPath } from '../utils/edge-routing';

describe('getObstructingNodes', () => {
  it('should return empty when no nodes are between source and target', () => {
    // Arrange
    const sourcePoint = { x: 0, y: 50 };
    const targetPoint = { x: 400, y: 50 };
    const nodes = [
      { id: 'A', position: { x: 0, y: 0 }, measured: { width: 100, height: 80 } },
      { id: 'B', position: { x: 350, y: 0 }, measured: { width: 100, height: 80 } },
    ];

    // Act
    const result = getObstructingNodes(sourcePoint, targetPoint, nodes, 'A', 'B');

    // Assert
    expect(result).toHaveLength(0);
  });

  it('should detect a node directly in the path', () => {
    // Arrange — C is between A and B on the line
    const sourcePoint = { x: 50, y: 50 };
    const targetPoint = { x: 500, y: 50 };
    const nodes = [
      { id: 'A', position: { x: 0, y: 0 }, measured: { width: 100, height: 80 } },
      { id: 'B', position: { x: 450, y: 0 }, measured: { width: 100, height: 80 } },
      { id: 'C', position: { x: 200, y: 20 }, measured: { width: 100, height: 80 } },
    ];

    // Act
    const result = getObstructingNodes(sourcePoint, targetPoint, nodes, 'A', 'B');

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('C');
  });

  it('should exclude source and target nodes from obstruction check', () => {
    // Arrange — only source and target present
    const sourcePoint = { x: 100, y: 50 };
    const targetPoint = { x: 300, y: 50 };
    const nodes = [
      { id: 'A', position: { x: 50, y: 0 }, measured: { width: 100, height: 100 } },
      { id: 'B', position: { x: 250, y: 0 }, measured: { width: 100, height: 100 } },
    ];

    // Act
    const result = getObstructingNodes(sourcePoint, targetPoint, nodes, 'A', 'B');

    // Assert
    expect(result).toHaveLength(0);
  });

  it('should detect multiple obstructing nodes', () => {
    // Arrange — C and D are both in the path
    const sourcePoint = { x: 50, y: 50 };
    const targetPoint = { x: 700, y: 50 };
    const nodes = [
      { id: 'A', position: { x: 0, y: 0 }, measured: { width: 100, height: 80 } },
      { id: 'B', position: { x: 650, y: 0 }, measured: { width: 100, height: 80 } },
      { id: 'C', position: { x: 200, y: 20 }, measured: { width: 100, height: 80 } },
      { id: 'D', position: { x: 400, y: 20 }, measured: { width: 100, height: 80 } },
    ];

    // Act
    const result = getObstructingNodes(sourcePoint, targetPoint, nodes, 'A', 'B');

    // Assert
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toContain('C');
    expect(result.map((r) => r.id)).toContain('D');
  });

  it('should not detect nodes far from the path', () => {
    // Arrange — C is far below the path line
    const sourcePoint = { x: 50, y: 50 };
    const targetPoint = { x: 500, y: 50 };
    const nodes = [
      { id: 'A', position: { x: 0, y: 0 }, measured: { width: 100, height: 80 } },
      { id: 'B', position: { x: 450, y: 0 }, measured: { width: 100, height: 80 } },
      { id: 'C', position: { x: 200, y: 300 }, measured: { width: 100, height: 80 } },
    ];

    // Act
    const result = getObstructingNodes(sourcePoint, targetPoint, nodes, 'A', 'B');

    // Assert
    expect(result).toHaveLength(0);
  });

  it('should use default dimensions when measured is not provided', () => {
    // Arrange — node without measured property, default width=200, height=80
    const sourcePoint = { x: 50, y: 50 };
    const targetPoint = { x: 600, y: 50 };
    const nodes = [
      { id: 'A', position: { x: 0, y: 0 } },
      { id: 'B', position: { x: 550, y: 0 } },
      { id: 'C', position: { x: 250, y: 10 } }, // default 200×80, directly in path
    ];

    // Act
    const result = getObstructingNodes(sourcePoint, targetPoint, nodes, 'A', 'B');

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('C');
  });
});

describe('computeSmartPath', () => {
  it('should return a straight line when no obstructions', () => {
    // Arrange
    const sourcePoint = { x: 0, y: 50 };
    const targetPoint = { x: 400, y: 50 };

    // Act
    const result = computeSmartPath(sourcePoint, targetPoint, []);

    // Assert
    expect(result.path).toContain('M 0 50');
    expect(result.path).toContain('L 400 50');
    expect(result.labelX).toBe(200);
    expect(result.labelY).toBe(50);
  });

  it('should route around obstructing nodes', () => {
    // Arrange
    const sourcePoint = { x: 50, y: 50 };
    const targetPoint = { x: 500, y: 50 };
    const obstructingNodes = [
      { id: 'C', rect: { x: 200, y: 20, width: 100, height: 80 } },
    ];

    // Act
    const result = computeSmartPath(sourcePoint, targetPoint, obstructingNodes);

    // Assert — path should not be a straight line
    expect(result.path).toContain('M');
    expect(result.path.length).toBeGreaterThan(20); // Complex path
    // Label should be positioned along the routed segment
    expect(typeof result.labelX).toBe('number');
    expect(typeof result.labelY).toBe('number');
  });

  it('should produce a valid SVG path string', () => {
    // Arrange
    const sourcePoint = { x: 0, y: 50 };
    const targetPoint = { x: 600, y: 50 };
    const obstructingNodes = [
      { id: 'C', rect: { x: 200, y: 20, width: 150, height: 80 } },
    ];

    // Act
    const result = computeSmartPath(sourcePoint, targetPoint, obstructingNodes);

    // Assert — starts with M (moveto) command
    expect(result.path).toMatch(/^M\s/);
    // Contains L (lineto) or Q (quadratic curve) commands
    expect(result.path).toMatch(/[LQ]/);
  });
});
