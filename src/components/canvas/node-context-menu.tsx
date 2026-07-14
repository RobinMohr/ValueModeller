import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface ContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function NodeContextMenu({ x, y, items, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    // Use timeout to avoid immediately closing due to the same event
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menuRef.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > viewportHeight) {
      menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const handleItemClick = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose]
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1 animate-in fade-in zoom-in-95"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Node context menu"
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
            item.variant === 'danger'
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            item.disabled && 'opacity-40 cursor-not-allowed'
          )}
          onClick={() => !item.disabled && handleItemClick(item.action)}
          role="menuitem"
          disabled={item.disabled}
        >
          <span className="w-4 text-center">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
