import type { Node, Edge } from '@xyflow/react';

export interface SipocEntry {
  id: string;
  value: string;
}

export interface SipocNodeData {
  label: string;
  processDescription: string;
  suppliers: SipocEntry[];
  inputs: SipocEntry[];
  outputs: SipocEntry[];
  customers: SipocEntry[];
  [key: string]: unknown;
}

export type SipocNode = Node<SipocNodeData, 'sipoc'>;

export type SipocEdge = Edge;

export interface GraphState {
  nodes: SipocNode[];
  edges: SipocEdge[];
}
