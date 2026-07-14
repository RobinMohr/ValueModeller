import type { SipocNode, SipocEdge } from '../types/sipoc.types';

export const demoNodes: SipocNode[] = [
  {
    id: 'node-1',
    type: 'sipoc',
    position: { x: 50, y: 200 },
    data: {
      label: 'Receive Order',
      processDescription: 'Customer places an order via web or phone',
      suppliers: 'Customer\nSales Team',
      inputs: 'Purchase Order\nCustomer Requirements',
      outputs: 'Confirmed Order',
      customers: 'Order Processing Team',
      applicationsInvolved: 'SAP ERP\nShopify Storefront\nSalesforce CRM',
      involvedTeams: 'Sales Team\nCustomer Service',
      knownIssues: 'Manual order entry from phone orders causes delays',
    },
  },
  {
    id: 'node-2',
    type: 'sipoc',
    position: { x: 350, y: 100 },
    data: {
      label: 'Check Inventory',
      processDescription: 'Verify stock availability for ordered items',
      suppliers: 'Order Processing Team',
      inputs: 'Confirmed Order',
      outputs: 'Stock Status Report',
      customers: 'Warehouse Team',
      applicationsInvolved: 'SAP Warehouse Management\nInventory Tracker',
      involvedTeams: 'Warehouse Team',
      knownIssues: '',
    },
  },
  {
    id: 'node-3',
    type: 'sipoc',
    position: { x: 350, y: 320 },
    data: {
      label: 'Process Payment',
      processDescription: 'Charge customer payment method',
      suppliers: 'Payment Gateway',
      inputs: 'Confirmed Order\nPayment Details',
      outputs: 'Payment Confirmation',
      customers: 'Finance Department',
      applicationsInvolved: 'Stripe Payment Gateway\nSAP Finance Module',
      involvedTeams: 'Finance Department\nIT Operations',
      knownIssues: 'Timeout errors during peak hours\nNo retry mechanism for failed payments',
    },
  },
  {
    id: 'node-4',
    type: 'sipoc',
    position: { x: 680, y: 200 },
    data: {
      label: 'Ship Order',
      processDescription: 'Pack and dispatch items to customer',
      suppliers: 'Warehouse Team\nShipping Partner',
      inputs: 'Stock Status Report\nPayment Confirmation',
      outputs: 'Shipped Package\nTracking Number',
      customers: 'Customer',
      applicationsInvolved: 'DHL Shipping Portal\nSAP Logistics',
      involvedTeams: 'Warehouse Team\nLogistics Partner',
      knownIssues: 'Label printing occasionally fails for international orders',
    },
  },
];

export const demoEdges: SipocEdge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', type: 'smoothstep', animated: true },
  { id: 'e1-3', source: 'node-1', target: 'node-3', type: 'smoothstep', animated: true },
  { id: 'e2-4', source: 'node-2', target: 'node-4', type: 'smoothstep', animated: true },
  { id: 'e3-4', source: 'node-3', target: 'node-4', type: 'smoothstep', animated: true },
];
