import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ValueStream } from '../types/value-stream.types';
import type { SipocNode, SipocEdge } from '../types/sipoc.types';
import { generateId } from '../utils/id';
import { demoNodes, demoEdges } from '../utils/demo-data';
import { safeLocalStorage } from '../utils/safe-storage';

interface ValueStreamStore {
  streams: ValueStream[];
  createStream: (name: string) => string;
  updateStream: (id: string, updates: Partial<Omit<ValueStream, 'id' | 'createdAt'>>) => void;
  deleteStream: (id: string) => void;
  getStreamById: (id: string) => ValueStream | undefined;
  saveStreamGraph: (id: string, nodes: SipocNode[], edges: SipocEdge[]) => void;
}

function createDefaultStream(name: string): ValueStream {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    description: '',
    applications: '',
    involvedTeams: '',
    knownIssues: '',
    createdValues: '',
    customerSegments: '',
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createDemoStream(): ValueStream {
  const now = new Date().toISOString();
  return {
    id: 'demo-stream',
    name: 'Order Fulfillment',
    description: 'End-to-end order fulfillment process from order receipt to shipment delivery.',
    applications: 'SAP ERP\nShopify Storefront\nSalesforce CRM\nStripe Payment Gateway\nDHL Shipping Portal',
    involvedTeams: 'Sales Team\nCustomer Service\nWarehouse Team\nFinance Department\nIT Operations\nLogistics Partner',
    knownIssues: 'Manual order entry from phone orders causes delays\nTimeout errors during peak hours\nLabel printing occasionally fails for international orders',
    createdValues: 'Fast order processing\nReliable payment handling\nTimely delivery',
    customerSegments: 'B2C Online Shoppers\nB2B Wholesale Clients\nInternational Customers',
    nodes: demoNodes,
    edges: demoEdges,
    createdAt: now,
    updatedAt: now,
  };
}

export const useValueStreamStore = create<ValueStreamStore>()(
  persist(
    (set, get) => ({
      streams: [createDemoStream()],

      createStream: (name) => {
        const stream = createDefaultStream(name);
        set({ streams: [...get().streams, stream] });
        return stream.id;
      },

      updateStream: (id, updates) => {
        set({
          streams: get().streams.map((s) =>
            s.id === id
              ? { ...s, ...updates, updatedAt: new Date().toISOString() }
              : s
          ),
        });
      },

      deleteStream: (id) => {
        set({ streams: get().streams.filter((s) => s.id !== id) });
      },

      getStreamById: (id) => {
        return get().streams.find((s) => s.id === id);
      },

      saveStreamGraph: (id, nodes, edges) => {
        set({
          streams: get().streams.map((s) =>
            s.id === id
              ? { ...s, nodes, edges, updatedAt: new Date().toISOString() }
              : s
          ),
        });
      },
    }),
    {
      name: 'value-modeller-streams',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);
