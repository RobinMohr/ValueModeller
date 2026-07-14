import { useCallback } from 'react';
import { useGraphStore } from '../../store/graph-store';
import { useUiStore } from '../../store/ui-store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { SipocNodeData } from '../../types/sipoc.types';

interface SipocTextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function SipocTextAreaField({ id, label, value, placeholder, onChange }: SipocTextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[80px] resize-y"
        rows={3}
      />
    </div>
  );
}

export function SipocForm() {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const deleteNode = useGraphStore((s) => s.deleteNode);

  const node = useGraphStore((s) =>
    selectedNodeId ? s.nodes.find((n) => n.id === selectedNodeId) : undefined
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

        <SipocTextAreaField
          id="process-description"
          label="Process Description"
          value={node.data.processDescription}
          placeholder="Describe what this process does..."
          onChange={(value) => handleUpdate('processDescription', value)}
        />

        <SipocTextAreaField
          id="suppliers"
          label="Suppliers"
          value={node.data.suppliers}
          placeholder="Who provides inputs to this process? (one per line)"
          onChange={(value) => handleUpdate('suppliers', value)}
        />

        <SipocTextAreaField
          id="inputs"
          label="Inputs"
          value={node.data.inputs}
          placeholder="What materials, data, or resources enter? (one per line)"
          onChange={(value) => handleUpdate('inputs', value)}
        />

        <SipocTextAreaField
          id="outputs"
          label="Outputs"
          value={node.data.outputs}
          placeholder="What does this process produce? (one per line)"
          onChange={(value) => handleUpdate('outputs', value)}
        />

        <SipocTextAreaField
          id="customers"
          label="Customers"
          value={node.data.customers}
          placeholder="Who receives the outputs? (one per line)"
          onChange={(value) => handleUpdate('customers', value)}
        />

        <div className="border-t border-gray-200 pt-6 space-y-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Additional Details</h3>

          <SipocTextAreaField
            id="applications-involved"
            label="Applications Involved"
            value={node.data.applicationsInvolved ?? ''}
            placeholder="Which applications or systems are involved in this process step?"
            onChange={(value) => handleUpdate('applicationsInvolved', value)}
          />

          <SipocTextAreaField
            id="involved-teams"
            label="Involved Teams"
            value={node.data.involvedTeams ?? ''}
            placeholder="Which teams or departments are involved in this process step?"
            onChange={(value) => handleUpdate('involvedTeams', value)}
          />

          <SipocTextAreaField
            id="known-issues"
            label="Known Issues"
            value={node.data.knownIssues ?? ''}
            placeholder="Any known problems, bottlenecks, or improvement opportunities?"
            onChange={(value) => handleUpdate('knownIssues', value)}
          />
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
          Delete Process
        </Button>
      </div>
    </div>
  );
}
