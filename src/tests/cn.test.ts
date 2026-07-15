/**
 * Unit tests for cn utility (clsx + tailwind-merge)
 *
 * Tests the className merging helper used throughout the app.
 * AAA Principle: Arrange → Act → Assert
 */
import { describe, it, expect } from 'vitest';
import { cn } from '../utils/cn';

describe('cn', () => {
  it('should merge simple class strings', () => {
    // Arrange & Act
    const result = cn('text-sm', 'font-bold');

    // Assert
    expect(result).toBe('text-sm font-bold');
  });

  it('should handle conditional classes via objects', () => {
    // Arrange
    const isActive = true;
    const isDisabled = false;

    // Act
    const result = cn('base-class', {
      'text-blue-500': isActive,
      'opacity-50': isDisabled,
    });

    // Assert
    expect(result).toContain('base-class');
    expect(result).toContain('text-blue-500');
    expect(result).not.toContain('opacity-50');
  });

  it('should merge conflicting tailwind classes (last wins)', () => {
    // Arrange & Act
    const result = cn('text-red-500', 'text-blue-500');

    // Assert — tailwind-merge resolves conflicts
    expect(result).toBe('text-blue-500');
  });

  it('should handle undefined and null values', () => {
    // Arrange & Act
    const result = cn('base', undefined, null, 'extra');

    // Assert
    expect(result).toBe('base extra');
  });

  it('should handle empty string inputs', () => {
    // Arrange & Act
    const result = cn('base', '', 'extra');

    // Assert
    expect(result).toBe('base extra');
  });

  it('should merge padding conflicts correctly', () => {
    // Arrange & Act
    const result = cn('p-4', 'p-2');

    // Assert
    expect(result).toBe('p-2');
  });
});
