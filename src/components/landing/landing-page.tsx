import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useValueStreamStore } from '../../store/value-stream-store';
import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/theme-toggle';
import { cn } from '../../utils/cn';
import { useFocusTrap } from '../../hooks/use-focus-trap';
import type { ValueStream } from '../../types/value-stream.types';

type ViewMode = 'cards' | 'table';

export function LandingPage() {
  const streams = useValueStreamStore((s) => s.streams);
  const createStream = useValueStreamStore((s) => s.createStream);
  const deleteStream = useValueStreamStore((s) => s.deleteStream);
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    if (!newStreamName.trim()) return;
    const id = createStream(newStreamName.trim());
    setNewStreamName('');
    setShowCreateDialog(false);
    navigate(`/stream/${id}`);
  }, [newStreamName, createStream, navigate]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteStream(id);
      setDeleteConfirmId(null);
    },
    [deleteStream]
  );

  const handleOpen = useCallback(
    (id: string) => {
      navigate(`/stream/${id}`);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Value Modeller</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your value streams</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
              <ThemeToggle />
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                + New Value Stream
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {streams.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateDialog(true)} />
        ) : viewMode === 'cards' ? (
          <CardsView
            streams={streams}
            deleteConfirmId={deleteConfirmId}
            onOpen={handleOpen}
            onDelete={handleDelete}
            onDeleteConfirm={setDeleteConfirmId}
          />
        ) : (
          <TableView
            streams={streams}
            deleteConfirmId={deleteConfirmId}
            onOpen={handleOpen}
            onDelete={handleDelete}
            onDeleteConfirm={setDeleteConfirmId}
          />
        )}
      </main>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateStreamDialog
          newStreamName={newStreamName}
          onNameChange={setNewStreamName}
          onCreate={handleCreate}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}

/* ---------- View Mode Toggle ---------- */

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5" role="radiogroup" aria-label="View mode">
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === 'cards'}
        aria-label="Cards view"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          viewMode === 'cards'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        )}
        onClick={() => onChange('cards')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Cards
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === 'table'}
        aria-label="Table view"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          viewMode === 'table'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        )}
        onClick={() => onChange('table')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Table
      </button>
    </div>
  );
}

/* ---------- Empty State ---------- */

interface EmptyStateProps {
  onCreateClick: () => void;
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No value streams yet</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Create your first value stream to get started.</p>
      <div className="mt-6">
        <Button onClick={onCreateClick}>
          + Create Value Stream
        </Button>
      </div>
    </div>
  );
}

/* ---------- Cards View ---------- */

interface StreamListViewProps {
  streams: ValueStream[];
  deleteConfirmId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteConfirm: (id: string | null) => void;
}

function CardsView({ streams, deleteConfirmId, onOpen, onDelete, onDeleteConfirm }: StreamListViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {streams.map((stream) => (
        <div
          key={stream.id}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          {/* Card header */}
          <div
            className="p-5 cursor-pointer"
            onClick={() => onOpen(stream.id)}
            role="button"
            tabIndex={0}
            aria-label={`Open ${stream.name}`}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(stream.id); }}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                {stream.name}
              </h3>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                {stream.nodes.length} {stream.nodes.length === 1 ? 'process' : 'processes'}
              </span>
            </div>

            {stream.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {stream.description}
              </p>
            )}

            {/* Metadata pills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {stream.involvedTeams && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {stream.involvedTeams.split('\n').filter(Boolean).length} teams
                </span>
              )}
              {stream.applications && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {stream.applications.split('\n').filter(Boolean).length} apps
                </span>
              )}
              {stream.customerSegments && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  {stream.customerSegments.split('\n').filter(Boolean).length} segments
                </span>
              )}
            </div>

            {/* Timestamps */}
            <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Updated {new Date(stream.updatedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Card actions */}
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <Button
              onClick={() => onOpen(stream.id)}
              size="sm"
              variant="secondary"
            >
              Open
            </Button>
            <DeleteAction
              streamId={stream.id}
              streamName={stream.name}
              isConfirming={deleteConfirmId === stream.id}
              onDelete={onDelete}
              onConfirm={onDeleteConfirm}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Table View ---------- */

function TableView({ streams, deleteConfirmId, onOpen, onDelete, onDeleteConfirm }: StreamListViewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Processes
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Teams
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Apps
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Segments
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Updated
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {streams.map((stream) => {
              const teamCount = stream.involvedTeams ? stream.involvedTeams.split('\n').filter(Boolean).length : 0;
              const appCount = stream.applications ? stream.applications.split('\n').filter(Boolean).length : 0;
              const segmentCount = stream.customerSegments ? stream.customerSegments.split('\n').filter(Boolean).length : 0;

              return (
                <tr
                  key={stream.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => onOpen(stream.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{stream.name}</span>
                      {stream.description && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{stream.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      {stream.nodes.length}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {teamCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {teamCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {appCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {appCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {segmentCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        {segmentCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {new Date(stream.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => onOpen(stream.id)}
                        size="sm"
                        variant="secondary"
                      >
                        Open
                      </Button>
                      <DeleteAction
                        streamId={stream.id}
                        streamName={stream.name}
                        isConfirming={deleteConfirmId === stream.id}
                        onDelete={onDelete}
                        onConfirm={onDeleteConfirm}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Delete Action (shared) ---------- */

interface DeleteActionProps {
  streamId: string;
  streamName: string;
  isConfirming: boolean;
  onDelete: (id: string) => void;
  onConfirm: (id: string | null) => void;
}

function DeleteAction({ streamId, streamName, isConfirming, onDelete, onConfirm }: DeleteActionProps) {
  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">Delete?</span>
        <Button
          onClick={() => onDelete(streamId)}
          size="sm"
          variant="danger"
        >
          Yes
        </Button>
        <Button
          onClick={() => onConfirm(null)}
          size="sm"
          variant="ghost"
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => onConfirm(streamId)}
      size="sm"
      variant="ghost"
      aria-label={`Delete ${streamName}`}
    >
      <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </Button>
  );
}

/* ---------- Create Stream Dialog ---------- */

interface CreateStreamDialogProps {
  newStreamName: string;
  onNameChange: (name: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

function CreateStreamDialog({ newStreamName, onNameChange, onCreate, onClose }: CreateStreamDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>({ isOpen: true, onClose });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={cn(
          'bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4',
          'animate-in fade-in zoom-in-95'
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-stream-dialog-title"
      >
        <h2 id="create-stream-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Value Stream</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Give your value stream a name. You can add details later.
        </p>
        <div className="mt-4">
          <label htmlFor="stream-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <input
            id="stream-name"
            type="text"
            value={newStreamName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }}
            placeholder="e.g. Customer Onboarding"
            className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={onCreate} size="sm" disabled={!newStreamName.trim()}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
