import type { SipocNode, SipocEdge } from '../types/sipoc.types';

export interface ExportedModel {
  version: 1;
  exportedAt: string;
  name: string;
  nodes: SipocNode[];
  edges: SipocEdge[];
}

/**
 * Exports the current model as a JSON file download.
 */
export function exportModelToJson(nodes: SipocNode[], edges: SipocEdge[]): void {
  const model: ExportedModel = {
    version: 1,
    exportedAt: new Date().toISOString(),
    name: 'Value Stream Model',
    nodes,
    edges,
  };

  const json = JSON.stringify(model, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `value-model-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads a JSON file selected by the user and returns the parsed model.
 * Returns null if the file is invalid.
 */
export function importModelFromJson(): Promise<ExportedModel | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as unknown;
          if (isValidExportedModel(parsed)) {
            resolve(parsed);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });

    // Handle cancel (no file selected)
    input.addEventListener('cancel', () => resolve(null));

    input.click();
  });
}

function isValidExportedModel(data: unknown): data is ExportedModel {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.nodes)) return false;
  if (!Array.isArray(obj.edges)) return false;

  // Validate that nodes have the expected shape
  for (const node of obj.nodes) {
    if (typeof node !== 'object' || node === null) return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== 'string') return false;
    if (typeof n.data !== 'object' || n.data === null) return false;
    const d = n.data as Record<string, unknown>;
    if (typeof d.label !== 'string') return false;
  }

  // Validate that edges have the expected shape
  for (const edge of obj.edges) {
    if (typeof edge !== 'object' || edge === null) return false;
    const e = edge as Record<string, unknown>;
    if (typeof e.id !== 'string') return false;
    if (typeof e.source !== 'string') return false;
    if (typeof e.target !== 'string') return false;
  }

  return true;
}
