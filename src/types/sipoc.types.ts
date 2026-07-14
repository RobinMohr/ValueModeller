import type { Node, Edge } from '@xyflow/react';

export interface SipocNodeData {
  label: string;
  processDescription: string;
  suppliers: string;
  inputs: string;
  outputs: string;
  customers: string;
  applicationsInvolved: string;
  involvedTeams: string;
  knownIssues: string;
  [key: string]: unknown;
}

export type SipocNode = Node<SipocNodeData, 'sipoc'>;

export type SipocEdge = Edge;

export interface GraphState {
  nodes: SipocNode[];
  edges: SipocEdge[];
}
