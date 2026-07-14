import { useCallback } from 'react';
import type { SipocEntry } from '../../types/sipoc.types';
import { generateId } from '../../utils/id';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

interface SipocListSectionProps {
  title: string;
  description: string;
  items: SipocEntry[];
  color: 'blue' | 'green' | 'orange' | 'purple';
  onChange: (items: SipocEntry[]) => void;
}

const colorMap = {
  blue: 'border-l-blue-400 bg-blue-50/50',
  green: 'border-l-green-400 bg-green-50/50',
  orange: 'border-l-orange-400 bg-orange-50/50',
  purple: 'border-l-purple-400 bg-purple-50/50',
};

export function SipocListSection({
  title,
  description,
  items,
  color,
  onChange,
}: SipocListSectionProps) {
  const handleAdd = useCallback(() => {
    onChange([...items, { id: generateId(), value: '' }]);
  }, [items, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange]
  );

  const handleChange = useCallback(
    (id: string, value: string) => {
      onChange(items.map((item) => (item.id === id ? { ...item, value } : item)));
    },
    [items, onChange]
  );

  return (
    <div className={cn('border-l-4 rounded-r-md p-3', colorMap[color])}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <Button variant="ghost" size="sm" onClick={handleAdd} aria-label={`Add ${title.toLowerCase()}`}>
          + Add
        </Button>
      </div>
      <p className="text-xs text-gray-500 mb-2">{description}</p>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No items yet</p>
      ) : (
        <ul className="space-y-2" aria-label={`${title} list`}>
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="text"
                value={item.value}
                onChange={(e) => handleChange(item.id, e.target.value)}
                placeholder={`Enter ${title.toLowerCase().slice(0, -1)}...`}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                aria-label={`${title} item`}
              />
              <button
                onClick={() => handleRemove(item.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`Remove ${title.toLowerCase().slice(0, -1)}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
