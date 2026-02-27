import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { Entry } from '../db';
import { Activity, Calendar, GitCommit } from 'lucide-react';
import { parseEntryDate } from '../utils/dateUtils';

export default function Analytics() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | 'all'>('30d');

  useEffect(() => {
    fetch('/api/entries')
      .then(res => res.json())
      .then(data => {
        setEntries(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-zinc-500 animate-pulse">Loading analytics...</div>;

  // Generate date range based on selection
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
    const count = entries.filter(e => e.date.split(' to ')[0] === dateStr).length;
    return {
      date: format(date, timeRange === '7d' ? 'EEE' : 'MMM d'),
      count,
      fullDate: dateStr
    };
  });

  const typeData = entries.reduce((acc, entry) => {
    acc[entry.entry_type] = (acc[entry.entry_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeData).map(([name, value]) => ({ name, value }));

  const ranges = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '3m', label: '3 Months' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Analytics & Progress</h1>
          <p className="text-zinc-400">Visualize your research activity and milestones.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 col-span-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Research Activity</h2>
            </div>

            <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id as any)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${timeRange === r.id
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
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
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
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

        {/* Timeline */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <GitCommit className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Recent Milestones</h2>
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {entries.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-zinc-900 text-zinc-500 group-[.is-active]:text-indigo-400 group-[.is-active]:border-indigo-500/30 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-zinc-900/50 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white text-sm">{entry.entry_type}</div>
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
    </div>
  );
}
