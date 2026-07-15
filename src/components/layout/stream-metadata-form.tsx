import { useCallback, useState, useEffect } from 'react';
import { useValueStreamStore } from '../../store/value-stream-store';
import { Button } from '../ui/button';
import type { ValueStream } from '../../types/value-stream.types';

interface StreamMetadataFormProps {
  streamId: string;
  onClose: () => void;
}

export function StreamMetadataForm({ streamId, onClose }: StreamMetadataFormProps) {
  const getStreamById = useValueStreamStore((s) => s.getStreamById);
  const updateStream = useValueStreamStore((s) => s.updateStream);

  const stream = getStreamById(streamId);

  const [formData, setFormData] = useState<Partial<ValueStream>>({
    name: '',
    description: '',
    applications: '',
    involvedTeams: '',
    knownIssues: '',
    createdValues: '',
    customerSegments: '',
  });

  useEffect(() => {
    if (stream) {
      setFormData({
        name: stream.name,
        description: stream.description,
        applications: stream.applications,
        involvedTeams: stream.involvedTeams,
        knownIssues: stream.knownIssues,
        createdValues: stream.createdValues,
        customerSegments: stream.customerSegments,
      });
    }
  }, [stream]);

  const handleChange = useCallback(
    (field: keyof ValueStream, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSave = useCallback(() => {
    updateStream(streamId, formData);
    onClose();
  }, [streamId, formData, updateStream, onClose]);

  if (!stream) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      aria-label="Stream details dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Value Stream Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="stream-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stream Name
            </label>
            <input
              id="stream-name"
              type="text"
              value={formData.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="stream-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              General Description
            </label>
            <textarea
              id="stream-description"
              value={formData.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Describe the value stream's purpose and scope..."
            />
          </div>

          {/* Applications */}
          <div>
            <label htmlFor="stream-applications" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Involved Applications
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(one per line)</span>
            </label>
            <textarea
              id="stream-applications"
              value={formData.applications ?? ''}
              onChange={(e) => handleChange('applications', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="SAP ERP&#10;Salesforce CRM&#10;Jira"
            />
          </div>

          {/* Involved Teams */}
          <div>
            <label htmlFor="stream-teams" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Involved Teams
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(one per line)</span>
            </label>
            <textarea
              id="stream-teams"
              value={formData.involvedTeams ?? ''}
              onChange={(e) => handleChange('involvedTeams', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Engineering&#10;Product Management&#10;Customer Success"
            />
          </div>

          {/* Known Issues */}
          <div>
            <label htmlFor="stream-issues" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Known Issues
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(one per line)</span>
            </label>
            <textarea
              id="stream-issues"
              value={formData.knownIssues ?? ''}
              onChange={(e) => handleChange('knownIssues', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Manual data entry causing delays&#10;Timeout errors during peak hours"
            />
          </div>

          {/* Created Values */}
          <div>
            <label htmlFor="stream-values" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Created Values
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(one per line)</span>
            </label>
            <textarea
              id="stream-values"
              value={formData.createdValues ?? ''}
              onChange={(e) => handleChange('createdValues', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Faster time to market&#10;Improved customer satisfaction&#10;Reduced operational cost"
            />
          </div>

          {/* Customer Segments */}
          <div>
            <label htmlFor="stream-segments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer Segments
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(one per line)</span>
            </label>
            <textarea
              id="stream-segments"
              value={formData.customerSegments ?? ''}
              onChange={(e) => handleChange('customerSegments', e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="B2C Online Shoppers&#10;B2B Enterprise Clients&#10;Internal Stakeholders"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} size="sm">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
