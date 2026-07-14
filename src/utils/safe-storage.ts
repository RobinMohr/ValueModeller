import type { StateStorage } from 'zustand/middleware';
import { useToastStore } from '../store/toast-store';

/**
 * Estimates the total localStorage usage in bytes.
 */
export function getLocalStorageUsageBytes(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += key.length * 2; // UTF-16
        const value = localStorage.getItem(key);
        if (value) {
          total += value.length * 2;
        }
      }
    }
  } catch {
    // If we can't enumerate, return 0
  }
  return total;
}

/**
 * Returns localStorage usage as a human-readable string.
 */
export function getLocalStorageUsageFormatted(): string {
  const bytes = getLocalStorageUsageBytes();
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Estimates remaining localStorage capacity.
 * Most browsers have a 5MB limit per origin.
 */
export function getLocalStorageRemainingPercent(): number {
  const used = getLocalStorageUsageBytes();
  const limit = 5 * 1024 * 1024; // 5MB typical limit
  return Math.max(0, Math.min(100, ((limit - used) / limit) * 100));
}

/**
 * Custom storage adapter that wraps localStorage with error handling.
 * Shows toast notifications when storage operations fail.
 */
export const safeLocalStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.error('[Storage] Failed to read from localStorage:', error);
      useToastStore.getState().addToast(
        'Failed to load saved data. Your changes may not persist.',
        'error',
        8000
      );
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    try {
      // Check remaining space before write
      const remaining = getLocalStorageRemainingPercent();
      if (remaining < 10) {
        useToastStore.getState().addToast(
          `Storage almost full (${getLocalStorageUsageFormatted()} used). Consider exporting your data.`,
          'warning',
          8000
        );
      }

      localStorage.setItem(name, value);
    } catch (error) {
      console.error('[Storage] Failed to write to localStorage:', error);

      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        useToastStore.getState().addToast(
          'Storage quota exceeded! Your latest changes could not be saved. Export your data to avoid data loss.',
          'error',
          0 // Persistent — user must dismiss
        );
      } else {
        useToastStore.getState().addToast(
          'Failed to save data. Your latest changes may be lost.',
          'error',
          8000
        );
      }
    }
  },

  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error('[Storage] Failed to remove from localStorage:', error);
    }
  },
};
