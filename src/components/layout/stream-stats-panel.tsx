import { useMemo } from 'react';
import { useGraphStore } from '../../store/graph-store';
import { useValueStreamStore } from '../../store/value-stream-store';
import type { SipocNodeData } from '../../types/sipoc.types';

interface StatBadgeProps {
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo';
}

function StatBadge({ label, value, color }: StatBadgeProps) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  };

  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border ${colors[color]}`}>
      <span className="text-lg font-bold leading-tight">{value}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function collectUniqueLines(texts: string[]): string[] {
  const seen = new Set<string>();
  for (const text of texts) {
    if (!text.trim()) continue;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) seen.add(trimmed);
    }
  }
  return Array.from(seen);
}

function isNodeComplete(data: SipocNodeData): boolean {
  return (
    data.suppliers.trim().length > 0 &&
    data.inputs.trim().length > 0 &&
    data.outputs.trim().length > 0 &&
    data.customers.trim().length > 0
  );
}

export function StreamStatsPanel() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const activeStreamId = useGraphStore((s) => s.activeStreamId);
  const stream = useValueStreamStore((s) =>
    s.streams.find((st) => st.id === activeStreamId)
  );

  const stats = useMemo(() => {
    const totalProcesses = nodes.length;
    const totalConnections = edges.length;
    const completeNodes = nodes.filter((n) => isNodeComplete(n.data)).length;
    const completionPct = totalProcesses > 0 ? Math.round((completeNodes / totalProcesses) * 100) : 0;

    // Aggregate from node-level data
    const nodeTeams = collectUniqueLines(nodes.map((n) => n.data.involvedTeams));
    const nodeApps = collectUniqueLines(nodes.map((n) => n.data.applicationsInvolved));
    const nodeIssues = collectUniqueLines(nodes.map((n) => n.data.knownIssues));

    // Also include stream-level metadata
    const streamTeams = stream ? collectUniqueLines([stream.involvedTeams]) : [];
    const streamApps = stream ? collectUniqueLines([stream.applications]) : [];
    const streamIssues = stream ? collectUniqueLines([stream.knownIssues]) : [];

    // Merge unique
    const allTeams = Array.from(new Set([...nodeTeams, ...streamTeams]));
    const allApps = Array.from(new Set([...nodeApps, ...streamApps]));
    const allIssues = Array.from(new Set([...nodeIssues, ...streamIssues]));

    return {
      totalProcesses,
      totalConnections,
      completeNodes,
      completionPct,
      teamCount: allTeams.length,
      appCount: allApps.length,
      issueCount: allIssues.length,
      teams: allTeams,
      apps: allApps,
      issues: allIssues,
    };
  }, [nodes, edges, stream]);

  if (!activeStreamId) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4 space-y-4" aria-label="Stream statistics panel">
      {/* Summary stat badges */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatBadge label="Steps" value={stats.totalProcesses} color="blue" />
        <StatBadge label="Connections" value={stats.totalConnections} color="indigo" />
        <StatBadge label="Complete" value={`${stats.completionPct}%`} color={stats.completionPct === 100 ? 'green' : 'amber'} />
        <StatBadge label="Teams" value={stats.teamCount} color="purple" />
        <StatBadge label="Apps" value={stats.appCount} color="blue" />
        <StatBadge label="Issues" value={stats.issueCount} color={stats.issueCount > 0 ? 'red' : 'green'} />
        <StatBadge label="SIPOC Done" value={`${stats.completeNodes}/${stats.totalProcesses}`} color="green" />
      </div>

      {/* Detailed lists */}
      {stats.issueCount > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide mb-1">Known Issues</h4>
          <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
            {stats.issues.slice(0, 5).map((issue, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-red-400 dark:text-red-500 mt-0.5">•</span>
                <span>{issue}</span>
              </li>
            ))}
            {stats.issues.length > 5 && (
              <li className="text-gray-400 dark:text-gray-500 italic">+{stats.issues.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {(stats.teamCount > 0 || stats.appCount > 0) && (
        <div className="flex gap-6">
          {stats.teamCount > 0 && (
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1">Teams</h4>
              <div className="flex flex-wrap gap-1">
                {stats.teams.slice(0, 8).map((team, i) => (
                  <span key={i} className="inline-flex px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs border border-purple-200 dark:border-purple-800">
                    {team}
                  </span>
                ))}
                {stats.teams.length > 8 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 self-center">+{stats.teams.length - 8}</span>
                )}
              </div>
            </div>
          )}
          {stats.appCount > 0 && (
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Applications</h4>
              <div className="flex flex-wrap gap-1">
                {stats.apps.slice(0, 8).map((app, i) => (
                  <span key={i} className="inline-flex px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-800">
                    {app}
                  </span>
                ))}
                {stats.apps.length > 8 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 self-center">+{stats.apps.length - 8}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
