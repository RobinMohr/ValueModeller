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
  /** Color for group nodes */
  color?: string;
  [key: string]: unknown;
}

export interface GroupNodeData {
  label: string;
  color: string;
  [key: string]: unknown;
}

export type SipocNode = Node<SipocNodeData>;

export type SipocEdge = Edge;

export interface GraphState {
  nodes: SipocNode[];
  edges: SipocEdge[];
}
