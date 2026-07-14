import { useEffect } from 'react';
import { AppShell } from './components/layout/app-shell';
import { useGraphStore } from './store/graph-store';
import { demoNodes, demoEdges } from './utils/demo-data';

export function App() {
  const nodes = useGraphStore((s) => s.nodes);

  // Load demo data if the store is empty (first visit)
  useEffect(() => {
    if (nodes.length === 0) {
      useGraphStore.setState({ nodes: demoNodes, edges: demoEdges });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AppShell />;
}
