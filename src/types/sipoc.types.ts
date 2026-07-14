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
  /** Cycle time in minutes (time to complete one unit of work) */
  cycleTime: string;
  /** Lead time in minutes (total elapsed time from start to end) */
  leadTime: string;
  /** Value-add percentage (0-100) — portion of time that adds customer value */
  valueAddPercent: string;
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
