/**
 * Unit tests for toast-store (Zustand)
 *
 * Tests toast notification management: add, remove, auto-dismiss.
 * AAA Principle: Arrange → Act → Assert
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToastStore } from '../store/toast-store';

describe('toast-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addToast', () => {
    it('should add a toast with default type and duration', () => {
      // Arrange & Act
      useToastStore.getState().addToast('Hello world');

      // Assert
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Hello world');
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].duration).toBe(5000);
    });

    it('should add a toast with custom type and duration', () => {
      // Arrange & Act
      useToastStore.getState().addToast('Error!', 'error', 10000);

      // Assert
      const toast = useToastStore.getState().toasts[0];
      expect(toast.type).toBe('error');
      expect(toast.duration).toBe(10000);
    });

    it('should generate unique IDs for each toast', () => {
      // Arrange & Act
      useToastStore.getState().addToast('Toast 1');
      useToastStore.getState().addToast('Toast 2');

      // Assert
      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    it('should auto-remove toast after duration', () => {
      // Arrange
      useToastStore.getState().addToast('Temporary', 'info', 3000);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      // Act — advance time past the duration
      vi.advanceTimersByTime(3001);

      // Assert
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should not auto-remove when duration is 0', () => {
      // Arrange
      useToastStore.getState().addToast('Persistent', 'error', 0);

      // Act — advance time significantly
      vi.advanceTimersByTime(60000);

      // Assert — toast should still be there
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('should remove a specific toast by ID', () => {
      // Arrange
      useToastStore.getState().addToast('First');
      useToastStore.getState().addToast('Second');
      const toasts = useToastStore.getState().toasts;
      const idToRemove = toasts[0].id;

      // Act
      useToastStore.getState().removeToast(idToRemove);

      // Assert
      const remaining = useToastStore.getState().toasts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].message).toBe('Second');
    });

    it('should handle removal of non-existent ID gracefully', () => {
      // Arrange
      useToastStore.getState().addToast('Only toast');

      // Act — remove a non-existent ID
      useToastStore.getState().removeToast('non-existent-id');

      // Assert — original toast remains
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });
});
