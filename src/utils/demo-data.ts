import type { SipocNode, SipocEdge } from '../types/sipoc.types';

export const demoNodes: SipocNode[] = [
  {
    id: 'node-1',
    type: 'sipoc',
    position: { x: 50, y: 200 },
    data: {
      label: 'Receive Order',
      processDescription: 'Customer places an order via web or phone',
      suppliers: [
        { id: 's1-1', value: 'Customer' },
        { id: 's1-2', value: 'Sales Team' },
      ],
      inputs: [
        { id: 'i1-1', value: 'Purchase Order' },
        { id: 'i1-2', value: 'Customer Requirements' },
      ],
      outputs: [
        { id: 'o1-1', value: 'Confirmed Order' },
      ],
      customers: [
        { id: 'c1-1', value: 'Order Processing Team' },
      ],
    },
  },
  {
    id: 'node-2',
    type: 'sipoc',
    position: { x: 350, y: 100 },
    data: {
      label: 'Check Inventory',
      processDescription: 'Verify stock availability for ordered items',
      suppliers: [
        { id: 's2-1', value: 'Order Processing Team' },
      ],
      inputs: [
        { id: 'i2-1', value: 'Confirmed Order' },
      ],
      outputs: [
        { id: 'o2-1', value: 'Stock Status Report' },
      ],
      customers: [
        { id: 'c2-1', value: 'Warehouse Team' },
      ],
    },
  },
  {
    id: 'node-3',
    type: 'sipoc',
    position: { x: 350, y: 320 },
    data: {
      label: 'Process Payment',
      processDescription: 'Charge customer payment method',
      suppliers: [
        { id: 's3-1', value: 'Payment Gateway' },
      ],
      inputs: [
        { id: 'i3-1', value: 'Confirmed Order' },
        { id: 'i3-2', value: 'Payment Details' },
      ],
      outputs: [
        { id: 'o3-1', value: 'Payment Confirmation' },
      ],
      customers: [
        { id: 'c3-1', value: 'Finance Department' },
      ],
    },
  },
  {
    id: 'node-4',
    type: 'sipoc',
    position: { x: 680, y: 200 },
    data: {
      label: 'Ship Order',
      processDescription: 'Pack and dispatch items to customer',
      suppliers: [
        { id: 's4-1', value: 'Warehouse Team' },
        { id: 's4-2', value: 'Shipping Partner' },
      ],
      inputs: [
        { id: 'i4-1', value: 'Stock Status Report' },
        { id: 'i4-2', value: 'Payment Confirmation' },
      ],
      outputs: [
        { id: 'o4-1', value: 'Shipped Package' },
        { id: 'o4-2', value: 'Tracking Number' },
      ],
      customers: [
        { id: 'c4-1', value: 'Customer' },
      ],
    },
  },
];

export const demoEdges: SipocEdge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', type: 'smoothstep' },
  { id: 'e1-3', source: 'node-1', target: 'node-3', type: 'smoothstep' },
  { id: 'e2-4', source: 'node-2', target: 'node-4', type: 'smoothstep' },
  { id: 'e3-4', source: 'node-3', target: 'node-4', type: 'smoothstep' },
];
