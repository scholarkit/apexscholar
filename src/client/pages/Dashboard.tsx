import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FolderOpen, Activity, Plus, Clock, Layers, Calendar, GitCommit } from 'lucide-react';
import { formatDistanceToNow, format, subDays, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Resource, resourcesService } from '../lib/resources';
import { parseEntryDate } from '../utils/dateUtils';
import { projectService } from '../lib/projects';
import { JournalEntry, journalService } from '../lib/journal';

export default function Dashboard() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | 'all'>('30d');

  useEffect(() => {
    const loadData = async () => {
      const entriesData = await journalService.getEntries();
      const resourcesData = await resourcesService.listAll();
      const projectsData = await projectService.getProjects();
      setEntries(entriesData);
      setResources(resourcesData);
      setProjects(projectsData);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-8 w-full">
        <header className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-zinc-800/60 rounded-xl animate-pulse mb-2"></div>
            <div className="h-4 w-72 bg-zinc-800/60 rounded-xl animate-pulse"></div>
          </div>
        </header>

        {/* KPI Overview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-xl bg-zinc-900/50 border border-neutral-800 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-zinc-800/60 rounded-xl animate-pulse"></div>
                <div className="h-5 w-24 bg-zinc-800/60 rounded-xl animate-pulse"></div>
              </div>
              <div className="h-10 w-16 bg-zinc-800/60 rounded-xl animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Analytics Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-neutral-800 backdrop-blur-sm h-96 col-span-full"></div>
        </div>

        {/* Recent Activity Skeleton */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-zinc-800/60 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-zinc-800/60 rounded-xl animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-5 rounded-xl bg-zinc-900/30 border border-neutral-800 h-28 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const lastActivity = entries.length > 0 ? entries[0].date : (resources.length > 0 ? resources[0].created_at : null);

  // Analytics logic
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
      const dates = entries.map(e => parseEntryDate(e.date).getTime());
      startDate = new Date(Math.min(...dates));
    } else {
      startDate = subDays(today, 29);
    }
  }

  const intervalDays = eachDayOfInterval({ start: startDate, end: today });

  const activityData = intervalDays.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = entries.filter(e => e.start_date === dateStr).length;
    return {
      date: format(date, timeRange === '7d' ? 'EEE' : 'MMM d'),
      count,
      fullDate: dateStr
    };
  });

  const typeData = entries.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Dashboard</h1>
          <p className="text-base text-zinc-400">Welcome back. Here's what's happening in your research.</p>
        </div>
      </header>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Total Entries</h3>
          </div>
          <p className="text-right sm:text-left text-4xl font-semibold text-white">{entries.length}</p>
        </div>

        <Link to="/projects" className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 sm:p-6 shadow-sm hover:border-violet-500/30 hover:bg-zinc-900/70 transition-all group">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="p-3 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20 transition-colors">
              <Layers className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Projects</h3>
          </div>
          <p className="text-right sm:text-left text-4xl font-semibold text-white">{projects.length}</p>
        </Link>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <FolderOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Resources</h3>
          </div>
          <p className="text-right sm:text-left text-4xl font-semibold text-white">{resources.length}</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Last Activity</h3>
          </div>
          <p className="text-right sm:text-left text-lg sm:text-2xl font-semibold text-white">
            {lastActivity ? formatDistanceToNow(parseEntryDate(lastActivity), { addSuffix: true }) : 'No activity yet'}
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Activity Chart */}
        <div className="bg-zinc-900/40 border border-neutral-800 rounded-xl p-3 sm:p-6 col-span-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Activity className="w-5 h-5 text-indigo-500" />
              </div>
              <h2 className="text-xl font-semibold text-white">Research Activity</h2>
            </div>

            <div className="flex bg-black p-1 rounded-xl border border-neutral-800">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id as any)}
                  className={`w-full px-2 sm:px-4 py-1.5 text-xs font-medium rounded-xl transition-all ${timeRange === r.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
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
                <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#818cf8' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entry Types Distribution */}
        <div className="bg-zinc-900/40 border border-neutral-800 rounded-xl p-3 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Entry Distribution</h2>
          </div>
          <div className="space-y-4">
            {typeChartData.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No data available</p>
            ) : (
              typeChartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'][index % 4]}`} />
                    <span className="text-zinc-300">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Milestones (From Analytics) */}
        <div className="bg-zinc-900/40 border border-neutral-800 rounded-xl p-3 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <GitCommit className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Recent Milestones</h2>
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {entries.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-zinc-900 text-zinc-500 group-[.is-active]:text-indigo-500 group-[.is-active]:border-indigo-500/30 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-neutral-800 bg-zinc-900/50 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white text-xs sm:text-sm">{entry.type}</div>
                    <time className="font-mono text-xs text-zinc-500">{format(parseEntryDate(entry.date), 'MMM d')}</time>
                  </div>
                  <div className="text-zinc-400 text-sm line-clamp-2">{entry.content}</div>
                </div>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="text-zinc-500 text-center py-8 relative z-10">No milestones yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-zinc-400" />
          Recent Activity
        </h2>

        <div className="space-y-4">
          {entries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className="px-1 sm:px-2.5 py-1 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 border border-neutral-800">
                    {entry.type}
                  </span>
                  <span className="text-xs sm:text-sm text-zinc-500">
                    {formatDistanceToNow(parseEntryDate(entry.date), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <p className="text-zinc-300 line-clamp-2 mt-2 leading-relaxed">
                {entry.content}
              </p>
              <Link to="/journal" className="inline-flex items-center text-sm text-indigo-500 hover:text-indigo-300 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                View full entry &rarr;
              </Link>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-12 bg-zinc-900/20 border border-dashed border-white/10 rounded-xl">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-white font-medium mb-1">No recent activity</p>
              <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">Start documenting your research journey by creating your first journal entry.</p>
              <Link to="/journal" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl font-medium transition-colors">
                <Plus className="w-4 h-4" /> Create Journal Entry
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
