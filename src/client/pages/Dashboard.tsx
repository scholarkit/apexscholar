import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Calendar,
  Clock,
  FolderOpen,
  GitCommit,
  Layers,
  Plus,
} from 'lucide-react';
import { eachDayOfInterval, format, formatDistanceToNow, subDays } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { parseEntryDate } from '../utils/dateUtils';
import { useDashboardData } from '../hooks/queries/useDashboardData';
import { useProject } from '../contexts/ProjectContext';

export default function Dashboard() {
  const { entries, resourcesCount, projectsCount, projectMap, projects, isLoading } = useDashboardData();
  const { setActiveProject } = useProject();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | 'all'>('30d');

  // Switch to the entry's project and navigate to journal
  const handleViewEntry = useCallback(
    (projectId?: string) => {
      if (projectId) {
        const project = projects.find((p) => p.id === projectId);
        if (project) setActiveProject(project);
      }
      navigate('/journal');
    },
    [projects, setActiveProject, navigate]
  );

  // Sort entries by date descending (most recent first)
  // Must be above the loading guard to satisfy Rules of Hooks
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime()
      ),
    [entries]
  );

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const lastActivity = sortedEntries.length > 0 ? sortedEntries[0]!.date : null; // Analytics logic
  const today = new Date();
  let startDate: Date;

  if (timeRange === '7d') {
    startDate = subDays(today, 6);
  } else if (timeRange === '30d') {
    startDate = subDays(today, 29);
  } else if (timeRange === '3m') {
    startDate = subDays(today, 89);
  } else {
    // All Time: find the earliest entry or fallback to 30 days ago
    if (entries.length > 0) {
      const dates = entries.map((e) => parseEntryDate(e.date).getTime());
      startDate = new Date(Math.min(...dates));
    } else {
      startDate = subDays(today, 29);
    }
  }

  const intervalDays = eachDayOfInterval({ start: startDate, end: today });

  const activityData = intervalDays.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = entries.filter(
      (e) => format(parseEntryDate(e.date), 'yyyy-MM-dd') === dateStr
    ).length;
    return {
      date: format(date, timeRange === '7d' ? 'EEE' : 'MMM d'),
      count,
      fullDate: dateStr,
    };
  });

  const typeData = entries.reduce(
    (acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const typeChartData = Object.entries(typeData).map(([name, value]) => ({ name, value }));

  const ranges = [
    { id: '7d', label: '7 D' },
    { id: '30d', label: '30 D' },
    { id: '3m', label: '3 M' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              Overview
            </span>
            <span className="text-xs text-[var(--color-text-muted)] font-mono">
              {format(today, 'EEEE, MMMM d')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text)]">
            Research Workspace
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1">
            Track daily breakthroughs, synthesis momentum, and active milestones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/journal"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Log</span>
          </Link>
        </div>
      </header>

      {/* KPI Overview — Asymmetric, high-end cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Hero Card: Total Entries */}
        <div className="card-elevated rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              Logs
            </span>
          </div>
          <div>
            <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Research Entries
            </h3>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight mt-1 text-[var(--color-text)] tabular-nums">
              {entries.length}
            </p>
          </div>
        </div>

        {/* Projects Card */}
        <Link
          to="/projects"
          className="card-elevated rounded-2xl p-5 sm:p-6 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs text-[var(--color-text-muted)] group-hover:text-violet-400 transition-colors flex items-center gap-1 font-medium">
              View all &rarr;
            </span>
          </div>
          <div>
            <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Workspaces
            </h3>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight mt-1 text-[var(--color-text)] tabular-nums">
              {projectsCount}
            </p>
          </div>
        </Link>

        {/* Resources Card */}
        <Link
          to="/resources"
          className="card-elevated rounded-2xl p-5 sm:p-6 group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform">
              <FolderOpen className="w-5 h-5" />
            </div>
            <span className="text-xs text-[var(--color-text-muted)] group-hover:text-emerald-400 transition-colors flex items-center gap-1 font-medium">
              Library &rarr;
            </span>
          </div>
          <div>
            <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Saved Resources
            </h3>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight mt-1 text-[var(--color-text)] tabular-nums">
              {resourcesCount}
            </p>
          </div>
        </Link>

        {/* Last Activity Card */}
        <div className="card-elevated rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            {lastActivity && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Last Contribution
            </h3>
            <p className="text-base sm:text-lg font-semibold tracking-tight mt-1 text-[var(--color-text)] line-clamp-1">
              {lastActivity
                ? formatDistanceToNow(parseEntryDate(lastActivity), { addSuffix: true })
                : 'No logs yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Activity Chart */}
        <div className="card-elevated rounded-2xl p-5 sm:p-7 col-span-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Activity className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                  Research Activity Rhythm
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Frequency of notes, drafts, and recorded findings
                </p>
              </div>
            </div>

            {/* Segmented Time Range Selector */}
            <div className="flex bg-[var(--color-surface-2)] p-1 rounded-xl border border-[var(--color-border)]">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id as any)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${
                    timeRange === r.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '12px',
                    color: 'var(--color-text)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                  itemStyle={{ color: '#818cf8', fontWeight: 600 }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Left Column: Entry Distribution & Recent Activity */}
        <div className="space-y-6">
          {/* Entry Types Distribution */}
          <div className="card-elevated rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                  Entry Distribution
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Breakdown by documentation category
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {typeChartData.length === 0 ? (
                <p className="text-[var(--color-text-muted)] text-center py-6 text-sm">No data recorded yet</p>
              ) : (
                typeChartData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'][index % 4]}`}
                      />
                      <span className="text-sm font-medium text-[var(--color-text)] capitalize">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-semibold text-sm tabular-nums text-[var(--color-text)]">
                      {item.value}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-[var(--color-text)]">
                <Clock className="w-5 h-5 text-indigo-400" />
                Recent Activity
              </h2>
              <Link
                to="/journal"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                View all logs &rarr;
              </Link>
            </div>

            <div className="space-y-3.5">
              {sortedEntries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="card-elevated p-5 rounded-2xl group flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-xs font-semibold text-indigo-400 border border-indigo-500/20 capitalize">
                        {entry.type}
                      </span>
                      {entry.project_id && projectMap.get(entry.project_id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-xs font-medium text-violet-400 border border-violet-500/20 truncate max-w-[160px]">
                          <Layers className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{projectMap.get(entry.project_id)}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      {formatDistanceToNow(parseEntryDate(entry.date), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text)] line-clamp-2 mt-2 leading-relaxed opacity-90">
                    {entry.content}
                  </p>
                  <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      {format(parseEntryDate(entry.date), 'MMM d, yyyy')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleViewEntry(entry.project_id)}
                      className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Open in journal &rarr;
                    </button>
                  </div>
                </div>
              ))}

              {sortedEntries.length === 0 && (
                <div className="text-center py-12 card-elevated rounded-2xl border-dashed">
                  <BookOpen className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3 opacity-60" />
                  <p className="text-[var(--color-text)] font-semibold mb-1">No research logs recorded</p>
                  <p className="text-[var(--color-text-muted)] text-sm mb-5 max-w-sm mx-auto">
                    Start documenting your findings, hypotheses, and papers in the journal.
                  </p>
                  <Link
                    to="/journal"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-sm active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" /> Create Journal Log
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Milestones */}
        <div className="card-elevated rounded-2xl p-5 sm:p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <GitCommit className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                Recent Milestones
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Sequential progression of discoveries
              </p>
            </div>
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[var(--color-border)]">
            {sortedEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-indigo-400 border-indigo-500/30 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-xs font-semibold text-indigo-400 border border-indigo-500/20 capitalize">
                      {entry.type}
                    </span>
                    {entry.project_id && projectMap.get(entry.project_id) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-violet-500/10 text-[10px] font-medium text-violet-400 border border-violet-500/20 truncate max-w-[130px]">
                        {projectMap.get(entry.project_id)}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--color-text)] text-sm line-clamp-2 mb-2 leading-relaxed opacity-90">
                    {entry.content}
                  </p>
                  <time className="block font-mono text-[11px] text-[var(--color-text-muted)]">
                    {format(parseEntryDate(entry.date), 'MMM d, yyyy')}
                  </time>
                </div>
              </div>
            ))}
            {sortedEntries.length === 0 && (
              <p className="text-[var(--color-text-muted)] text-center py-8 relative z-10 text-sm">
                No milestones recorded yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
