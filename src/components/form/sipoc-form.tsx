import { useCallback, useMemo } from 'react';
import { useGraphStore } from '../../store/graph-store';
import { useUiStore } from '../../store/ui-store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SipocListSection } from './sipoc-list-section';
import type { SipocNodeData } from '../../types/sipoc.types';

export function SipocForm() {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const getNodeById = useGraphStore((s) => s.getNodeById);
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const deleteNode = useGraphStore((s) => s.deleteNode);

  const node = useMemo(
    () => (selectedNodeId ? getNodeById(selectedNodeId) : undefined),
    [selectedNodeId, getNodeById]
  );

  const handleUpdate = useCallback(
    (field: keyof SipocNodeData, value: SipocNodeData[keyof SipocNodeData]) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { [field]: value });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      closeSidePanel();
    }
  }, [selectedNodeId, deleteNode, closeSidePanel]);

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4">
        Select a process node to view details
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Process Details</h2>
        <button
          onClick={closeSidePanel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Input
          id="process-label"
          label="Process Name"
          value={node.data.label}
          onChange={(e) => handleUpdate('label', e.target.value)}
          placeholder="e.g., Order Processing"
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="process-description" className="text-sm font-medium text-gray-700">
            Process Description
          </label>
          <textarea
            id="process-description"
            value={node.data.processDescription}
            onChange={(e) => handleUpdate('processDescription', e.target.value)}
            placeholder="Describe what this process does..."
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[80px] resize-y"
            rows={3}
          />
        </div>

        <SipocListSection
          title="Suppliers"
          description="Who provides inputs to this process?"
          items={node.data.suppliers}
          color="blue"
          onChange={(items) => handleUpdate('suppliers', items)}
        />

        <SipocListSection
          title="Inputs"
          description="What materials, data, or resources enter?"
          items={node.data.inputs}
          color="green"
          onChange={(items) => handleUpdate('inputs', items)}
        />

        <SipocListSection
          title="Outputs"
          description="What does this process produce?"
          items={node.data.outputs}
          color="orange"
          onChange={(items) => handleUpdate('outputs', items)}
        />

        <SipocListSection
          title="Customers"
          description="Who receives the outputs?"
          items={node.data.customers}
          color="purple"
          onChange={(items) => handleUpdate('customers', items)}
        />
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
          Delete Process
        </Button>
      </div>
    </div>
  );
}
