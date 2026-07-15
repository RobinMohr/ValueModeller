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
    name: 'Insurance Claims Processing',
    description: 'End-to-end insurance claims handling from first notice of loss (FNOL) through investigation, settlement, and closure. Includes fraud screening branch and rejection/dispute handling path.',
    applications: 'Guidewire ClaimCenter\nSAP Finance\nFRISS Fraud Detection\nPower BI\nXactimate\nSnowflake Data Warehouse\nAWS S3\nLexisNexis Risk Solutions',
    involvedTeams: 'Customer Service\nFNOL Team\nClaims Processing\nFraud Detection\nClaims Adjusters\nField Inspectors\nClaims Management\nFinance Department\nLegal Team\nBusiness Intelligence\nCompliance',
    knownIssues: 'ML fraud model has 12% false positive rate on water damage claims\nField inspection scheduling averages 5-day wait time\nClaims above €50k require 3 approvals with 2-day delay per level\nInternational payments take 3-5 business days\nNo real-time reporting — data warehouse refreshes nightly',
    createdValues: 'Fast claims resolution\nFraud prevention\nRegulatory compliance (Solvency II)\nCustomer satisfaction\nCost-effective settlements',
    customerSegments: 'Private Policyholders\nCommercial Clients\nBroker Partners\nRepair Service Providers',
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
