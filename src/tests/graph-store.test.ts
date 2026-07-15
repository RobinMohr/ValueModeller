/**
 * Unit tests for graph-store (Zustand)
 *
 * Tests node/edge management: addNode, deleteNode, duplicateNodes, updateNodeData, etc.
 * AAA Principle: Arrange → Act → Assert
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../store/graph-store';

describe('graph-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGraphStore.setState({ nodes: [], edges: [], activeStreamId: null });
  });

  describe('addNode', () => {
    it('should add a new node at the specified position', () => {
      // Arrange
      const position = { x: 100, y: 200 };

      // Act
      const id = useGraphStore.getState().addNode(position);

      // Assert
      const nodes = useGraphStore.getState().nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe(id);
      expect(nodes[0].position).toEqual(position);
      expect(nodes[0].type).toBe('sipoc');
    });

    it('should create a node with default SIPOC data', () => {
      // Arrange & Act
      useGraphStore.getState().addNode({ x: 0, y: 0 });

      // Assert
      const node = useGraphStore.getState().nodes[0];
      expect(node.data.label).toBe('New Step');
      expect(node.data.processDescription).toBe('');
      expect(node.data.suppliers).toBe('');
      expect(node.data.inputs).toBe('');
      expect(node.data.outputs).toBe('');
      expect(node.data.customers).toBe('');
    });

    it('should generate unique IDs for each new node', () => {
      // Arrange & Act
      const id1 = useGraphStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useGraphStore.getState().addNode({ x: 100, y: 0 });

      // Assert
      expect(id1).not.toBe(id2);
      expect(useGraphStore.getState().nodes).toHaveLength(2);
    });
  });

  describe('addGroupNode', () => {
    it('should add a group node with auto-assigned color', () => {
      // Arrange
      const position = { x: 50, y: 50 };

      // Act
      const id = useGraphStore.getState().addGroupNode(position);

      // Assert
      const nodes = useGraphStore.getState().nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe(id);
      expect(nodes[0].type).toBe('group');
      expect(nodes[0].data.color).toBe('blue'); // first color
    });

    it('should cycle through colors for multiple groups', () => {
      // Arrange & Act
      useGraphStore.getState().addGroupNode({ x: 0, y: 0 });
      useGraphStore.getState().addGroupNode({ x: 500, y: 0 });

      // Assert — groups insert at front, so second group is at index 0
      const nodes = useGraphStore.getState().nodes;
      // First group created gets 'blue', second gets 'green'
      expect(nodes[1].data.color).toBe('blue');
      expect(nodes[0].data.color).toBe('green');
    });

    it('should place group node at the front of nodes array', () => {
      // Arrange — add a regular node first
      useGraphStore.getState().addNode({ x: 100, y: 100 });

      // Act
      useGraphStore.getState().addGroupNode({ x: 0, y: 0 });

      // Assert — group should be first (renders behind)
      const nodes = useGraphStore.getState().nodes;
      expect(nodes[0].type).toBe('group');
      expect(nodes[1].type).toBe('sipoc');
    });
  });

  describe('deleteNode', () => {
    it('should remove the specified node', () => {
      // Arrange
      const id = useGraphStore.getState().addNode({ x: 0, y: 0 });

      // Act
      useGraphStore.getState().deleteNode(id);

      // Assert
      expect(useGraphStore.getState().nodes).toHaveLength(0);
    });

    it('should remove edges connected to the deleted node', () => {
      // Arrange
      const id1 = useGraphStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useGraphStore.getState().addNode({ x: 200, y: 0 });
      useGraphStore.setState({
        edges: [{ id: 'e1', source: id1, target: id2 }],
      });

      // Act
      useGraphStore.getState().deleteNode(id1);

      // Assert
      expect(useGraphStore.getState().edges).toHaveLength(0);
    });

    it('should not affect other nodes', () => {
      // Arrange
      const id1 = useGraphStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useGraphStore.getState().addNode({ x: 200, y: 0 });

      // Act
      useGraphStore.getState().deleteNode(id1);

      // Assert
      const nodes = useGraphStore.getState().nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe(id2);
    });
  });

  describe('deleteEdge', () => {
    it('should remove the specified edge', () => {
      // Arrange
      useGraphStore.setState({
        edges: [
          { id: 'e1', source: 'A', target: 'B' },
          { id: 'e2', source: 'B', target: 'C' },
        ],
      });

      // Act
      useGraphStore.getState().deleteEdge('e1');

      // Assert
      const edges = useGraphStore.getState().edges;
      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('e2');
    });
  });

  describe('updateNodeData', () => {
    it('should update specific fields on a node', () => {
      // Arrange
      const id = useGraphStore.getState().addNode({ x: 0, y: 0 });

      // Act
      useGraphStore.getState().updateNodeData(id, {
        label: 'Updated Label',
        suppliers: 'Supplier A',
      });

      // Assert
      const node = useGraphStore.getState().getNodeById(id);
      expect(node?.data.label).toBe('Updated Label');
      expect(node?.data.suppliers).toBe('Supplier A');
      // Other fields should remain unchanged
      expect(node?.data.inputs).toBe('');
    });

    it('should not affect other nodes', () => {
      // Arrange
      const id1 = useGraphStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useGraphStore.getState().addNode({ x: 200, y: 0 });

      // Act
      useGraphStore.getState().updateNodeData(id1, { label: 'Changed' });

      // Assert
      const node2 = useGraphStore.getState().getNodeById(id2);
      expect(node2?.data.label).toBe('New Step');
    });
  });

  describe('updateEdgeData', () => {
    it('should update data on a specific edge', () => {
      // Arrange
      useGraphStore.setState({
        edges: [{ id: 'e1', source: 'A', target: 'B' }],
      });

      // Act
      useGraphStore.getState().updateEdgeData('e1', { label: 'Flow Label' });

      // Assert
      const edge = useGraphStore.getState().edges[0];
      expect(edge.data).toEqual({ label: 'Flow Label' });
    });
  });

  describe('duplicateNodes', () => {
    it('should clone a single node with offset', () => {
      // Arrange
      const id = useGraphStore.getState().addNode({ x: 100, y: 100 });
      useGraphStore.getState().updateNodeData(id, { label: 'Original' });

      // Act
      const newIds = useGraphStore.getState().duplicateNodes([id]);

      // Assert
      expect(newIds).toHaveLength(1);
      const cloned = useGraphStore.getState().getNodeById(newIds[0]);
      expect(cloned?.data.label).toBe('Original (copy)');
      expect(cloned?.position.x).toBe(150); // 100 + 50 default offset
      expect(cloned?.position.y).toBe(150);
    });

    it('should clone multiple nodes and recreate inter-edges', () => {
      // Arrange
      const id1 = useGraphStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useGraphStore.getState().addNode({ x: 200, y: 0 });
      useGraphStore.setState({
        edges: [{ id: 'e1', source: id1, target: id2 }],
      });

      // Act
      const newIds = useGraphStore.getState().duplicateNodes([id1, id2]);

      // Assert
      expect(newIds).toHaveLength(2);
      const edges = useGraphStore.getState().edges;
      // Original edge + cloned edge
      expect(edges).toHaveLength(2);
      // The cloned edge should connect the new nodes
      const clonedEdge = edges.find((e) => e.source === newIds[0] && e.target === newIds[1]);
      expect(clonedEdge).toBeDefined();
    });

    it('should use custom offset when provided', () => {
      // Arrange
      const id = useGraphStore.getState().addNode({ x: 100, y: 100 });

      // Act
      const newIds = useGraphStore.getState().duplicateNodes([id], { x: 200, y: 100 });

      // Assert
      const cloned = useGraphStore.getState().getNodeById(newIds[0]);
      expect(cloned?.position.x).toBe(300); // 100 + 200
      expect(cloned?.position.y).toBe(200); // 100 + 100
    });
  });

  describe('getNodeById', () => {
    it('should return the correct node', () => {
      // Arrange
      const id = useGraphStore.getState().addNode({ x: 50, y: 75 });

      // Act
      const node = useGraphStore.getState().getNodeById(id);

      // Assert
      expect(node).toBeDefined();
      expect(node?.position).toEqual({ x: 50, y: 75 });
    });

    it('should return undefined for non-existent ID', () => {
      // Arrange & Act
      const node = useGraphStore.getState().getNodeById('non-existent');

      // Assert
      expect(node).toBeUndefined();
    });
  });

  describe('onConnect', () => {
    it('should auto-fill target inputs from source outputs', () => {
      // Arrange
      const id1 = useGraphStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useGraphStore.getState().addNode({ x: 200, y: 0 });
      useGraphStore.getState().updateNodeData(id1, {
        outputs: 'Product Report',
        customers: 'Finance Team',
      });

      // Act
      useGraphStore.getState().onConnect({
        source: id1,
        target: id2,
        sourceHandle: null,
        targetHandle: null,
      });

      // Assert
      const targetNode = useGraphStore.getState().getNodeById(id2);
      expect(targetNode?.data.inputs).toBe('Product Report');
      expect(targetNode?.data.suppliers).toBe('Finance Team');
    });

    it('should not overwrite existing target data', () => {
      // Arrange
      const id1 = useGraphStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useGraphStore.getState().addNode({ x: 200, y: 0 });
      useGraphStore.getState().updateNodeData(id1, { outputs: 'Source Output' });
      useGraphStore.getState().updateNodeData(id2, { inputs: 'Existing Input' });

      // Act
      useGraphStore.getState().onConnect({
        source: id1,
        target: id2,
        sourceHandle: null,
        targetHandle: null,
      });

      // Assert — existing data should not be overwritten
      const targetNode = useGraphStore.getState().getNodeById(id2);
      expect(targetNode?.data.inputs).toBe('Existing Input');
    });
  });
});
