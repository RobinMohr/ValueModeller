import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

interface UseFocusTrapOptions {
  /** Whether the focus trap is currently active */
  isOpen: boolean;
  /** Callback to close the dialog (triggered on Escape key) */
  onClose?: () => void;
}

/**
 * Traps keyboard focus within a dialog container, restores focus to the
 * previously focused element on close, and handles Escape key dismissal.
 *
 * Returns a ref to attach to the dialog container element.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions
) {
  const { isOpen, onClose } = options;
  const containerRef = useRef<T>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the trigger element when the dialog opens
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Focus the first focusable element inside the container when it opens
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

    // Small delay to ensure the DOM is painted before moving focus
    const raf = requestAnimationFrame(() => {
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        // If no focusable children, focus the container itself
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Restore focus to the trigger element when the dialog closes
  useEffect(() => {
    if (isOpen) return;

    return () => {
      if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen]);

  // Handle Tab key trapping and Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || !containerRef.current) return;

      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  return containerRef;
}
