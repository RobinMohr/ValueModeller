import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ValueStream } from '../types/value-stream.types';
import type { SipocNode, SipocEdge } from '../types/sipoc.types';
import { generateId } from '../utils/id';
import { demoNodes, demoEdges } from '../utils/demo-data';
import { sdlcDemoNodes, sdlcDemoEdges } from '../utils/demo-data-sdlc';
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

function createSdlcDemoStream(): ValueStream {
  const now = new Date().toISOString();
  return {
    id: 'demo-sdlc-stream',
    name: 'Software Development Lifecycle (SDLC)',
    description: 'End-to-end enterprise software delivery pipeline from feature ideation through UX design, parallel frontend/backend development, code review, automated testing, canary deployment, production monitoring, and continuous improvement feedback loops.',
    applications: 'Jira\nGitHub\nFigma\nArgoCD\nDatadog\nPagerDuty\nLaunchDarkly\nAmplitude\nPlaywright\nSonarQube\nAWS EKS\nSlack\nConfluence\nStorybook',
    involvedTeams: 'Product Management\nUX Design\nFrontend Development\nBackend Development\nQA Engineering\nDevOps Engineering\nSite Reliability Engineering\nSecurity Engineering\nData Analytics\nCustomer Success\nAgile Coaches',
    knownIssues: 'PR review time averages 18 hours (target: 4 hours)\nE2E test suite takes 45 minutes with 8% flaky test rate\nCanary analysis misses slow-burn memory leaks\nFeature flag cleanup debt: 45 stale flags in production\nAlert fatigue: 40% of PagerDuty alerts non-actionable\nDORA metrics not yet automated\nCross-team dependencies cause 40% of sprint misses',
    createdValues: 'Rapid feature delivery (2-week sprint cadence)\nProduction stability (99.9% uptime SLA)\nData-driven product decisions\nDeveloper experience & velocity\nSecurity & compliance (SOC 2 Type II)',
    customerSegments: 'SaaS End Users\nEnterprise Customers (self-hosted)\nInternal Engineering Teams\nPartner Integrators (API consumers)',
    nodes: sdlcDemoNodes,
    edges: sdlcDemoEdges,
    createdAt: now,
    updatedAt: now,
  };
}

export const useValueStreamStore = create<ValueStreamStore>()(
  persist(
    (set, get) => ({
      streams: [createDemoStream(), createSdlcDemoStream()],

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
