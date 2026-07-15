/**
 * Unit tests for ui-store (Zustand)
 *
 * Tests UI state management: node selection, side panel open/close.
 * AAA Principle: Arrange → Act → Assert
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../store/ui-store';

describe('ui-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUiStore.setState({ selectedNodeId: null, isSidePanelOpen: false });
  });

  describe('selectNode', () => {
    it('should set the selected node ID', () => {
      // Arrange & Act
      useUiStore.getState().selectNode('node-123');

      // Assert
      expect(useUiStore.getState().selectedNodeId).toBe('node-123');
    });

    it('should allow deselecting by passing null', () => {
      // Arrange
      useUiStore.getState().selectNode('node-123');

      // Act
      useUiStore.getState().selectNode(null);

      // Assert
      expect(useUiStore.getState().selectedNodeId).toBeNull();
    });
  });

  describe('openSidePanel', () => {
    it('should set selectedNodeId and open the panel', () => {
      // Arrange & Act
      useUiStore.getState().openSidePanel('node-456');

      // Assert
      expect(useUiStore.getState().selectedNodeId).toBe('node-456');
      expect(useUiStore.getState().isSidePanelOpen).toBe(true);
    });
  });

  describe('closeSidePanel', () => {
    it('should close the panel and clear selected node', () => {
      // Arrange
      useUiStore.getState().openSidePanel('node-789');

      // Act
      useUiStore.getState().closeSidePanel();

      // Assert
      expect(useUiStore.getState().isSidePanelOpen).toBe(false);
      expect(useUiStore.getState().selectedNodeId).toBeNull();
    });
  });

  describe('state independence', () => {
    it('should allow selecting a node without opening the panel', () => {
      // Arrange & Act
      useUiStore.getState().selectNode('node-abc');

      // Assert
      expect(useUiStore.getState().selectedNodeId).toBe('node-abc');
      expect(useUiStore.getState().isSidePanelOpen).toBe(false);
    });
  });
});
