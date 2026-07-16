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
      <header className="flex flex-col sm:flex-row items-center justify-between">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
        <div>
          <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
          <p className="text-base text-zinc-400">
            Welcome back. Here's what's happening in your research.
          </p>
        </div>
      </header>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface-2)] p-3 sm:p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Total Entries</h3>
          </div>
          <p className="text-right sm:text-left text-4xl font-semibold">{entries.length}</p>
        </div>

        <Link
          to="/projects"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface-2)] p-3 sm:p-6 shadow-sm hover:border-violet-500/30 hover:bg-[var(--color-surface)]/70 transition-all group"
        >
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="p-3 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20 transition-colors">
              <Layers className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Projects</h3>
          </div>
          <p className="text-right sm:text-left text-4xl font-semibold">{projectsCount}</p>
        </Link>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface-2)] p-3 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <FolderOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Resources</h3>
          </div>
          <p className="text-right sm:text-left text-4xl font-semibold">{resourcesCount}</p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface-2)] p-3 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Last Activity</h3>
          </div>
          <p className="text-right sm:text-left text-lg sm:text-2xl font-semibold">
            {lastActivity
              ? formatDistanceToNow(parseEntryDate(lastActivity), { addSuffix: true })
              : 'No activity yet'}
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Activity Chart */}
        <div className="bg-[var(--bg-surface-2)] border border-[var(--color-border)] rounded-xl p-3 sm:p-6 col-span-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Activity className="w-5 h-5 text-indigo-500" />
              </div>
              <h2 className="text-xl font-semibold">Research Activity</h2>
            </div>

            <div className="flex bg-[var(--bg-surface-2)] p-1 rounded-xl border border-[var(--color-border)]">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id as any)}
                  className={`w-full px-2 sm:px-4 py-1.5 text-xs font-medium rounded-xl transition-all ${
                    timeRange === r.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-zinc-500 hover:text-[var(--color-text-faint)]'
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
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff40"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#ffffff40"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#ffffff10',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  itemStyle={{ color: '#818cf8' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Left Column: Entry Distribution & Recent Activity */}
        <div className="space-y-6">
          {/* Entry Types Distribution */}
          <div className="bg-[var(--bg-surface-2)] border border-[var(--color-border)] rounded-xl p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Entry Distribution</h2>
            </div>
            <div className="space-y-4">
              {typeChartData.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No data available</p>
              ) : (
                typeChartData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'][index % 4]}`}
                      />
                      <span className="text-[var(--color-text-muted)]">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              Recent Activity
            </h2>

            <div className="space-y-4">
              {sortedEntries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="p-5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--color-border)] transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-1 sm:px-2.5 py-1 rounded-xl bg-[var(--color-surface-2)] text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-accent-glow)]">
                        {entry.type}
                      </span>
                      {entry.project_id && projectMap.get(entry.project_id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-500/10 text-xs font-medium text-violet-400 border border-violet-500/20">
                          <Layers className="w-3 h-3" />
                          {projectMap.get(entry.project_id)}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm text-zinc-500">
                        {formatDistanceToNow(parseEntryDate(entry.date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <p className="line-clamp-2 mt-2 leading-relaxed">{entry.content}</p>
                  <button
                    type="button"
                    onClick={() => handleViewEntry(entry.project_id)}
                    className="inline-flex items-center text-sm text-indigo-500 hover:text-indigo-300 mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View full entry &rarr;
                  </button>
                </div>
              ))}

              {sortedEntries.length === 0 && (
                <div className="text-center py-12 bg-[var(--color-surface)]/20 border border-dashed border-[var(--color-border)] rounded-xl">
                  <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-white font-medium mb-1">No recent activity</p>
                  <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
                    Start documenting your research journey by creating your first journal entry.
                  </p>
                  <Link
                    to="/journal"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Create Journal Entry
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Milestones (From Analytics) */}
        <div className="bg-[var(--bg-surface-2)] border border-[var(--color-border)] rounded-xl p-3 sm:p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <GitCommit className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold">Recent Milestones</h2>
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[var(--color-border)]">
            {sortedEntries.slice(0, 5).map((entry, i) => (
              <div
                key={entry.id}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] group-[.is-active]:text-indigo-500 group-[.is-active]:border-indigo-500/30 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                      {entry.type}
                    </span>
                    {entry.project_id && projectMap.get(entry.project_id) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-violet-500/10 text-[10px] font-medium text-violet-400 border border-violet-500/20 truncate max-w-[140px]">
                        {projectMap.get(entry.project_id)}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--color-text)] text-sm line-clamp-2 mb-2 leading-relaxed">{entry.content}</p>
                  <time className="block font-mono text-[11px] text-zinc-500">
                    {format(parseEntryDate(entry.date), 'MMM d, yyyy')}
                  </time>
                </div>
              </div>
            ))}
            {sortedEntries.length === 0 && (
              <p className="text-zinc-500 text-center py-8 relative z-10">No milestones yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
