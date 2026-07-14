import type { SipocNode, SipocEdge } from './sipoc.types';

export interface ValueStream {
  id: string;
  name: string;
  description: string;
  applications: string;
  involvedTeams: string;
  knownIssues: string;
  createdValues: string;
  customerSegments: string;
  nodes: SipocNode[];
  edges: SipocEdge[];
  createdAt: string;
  updatedAt: string;
}
