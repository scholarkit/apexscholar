import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FolderOpen, Activity, Plus, Upload, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Entry, Resource, puterService } from '../lib/puter';
import { parseEntryDate } from '../utils/dateUtils';

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const entriesData = await puterService.kvGet('research_entries') || [];
      const resourcesData = await puterService.kvGet('research_resources') || [];
      setEntries(entriesData);
      setResources(resourcesData);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const lastActivity = entries.length > 0 ? entries[0].date : (resources.length > 0 ? resources[0].date_added : null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Dashboard</h1>
          <p className="text-zinc-400">Welcome back. Here's what's happening in your research.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/journal" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" />
            New Entry
          </Link>
          <Link to="/resources" className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors border border-white/10">
            <Upload className="w-4 h-4" />
            Upload
          </Link>
        </div>
      </header>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Total Entries</h3>
          </div>
          <p className="text-4xl font-semibold text-white">{entries.length}</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <FolderOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Resources</h3>
          </div>
          <p className="text-4xl font-semibold text-white">{resources.length}</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Last Activity</h3>
          </div>
          <p className="text-xl font-semibold text-white">
            {lastActivity ? formatDistanceToNow(parseEntryDate(lastActivity), { addSuffix: true }) : 'No activity yet'}
          </p>
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
            <div key={entry.id} className="p-5 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs font-medium text-zinc-300 border border-white/5">
                    {entry.entry_type}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {formatDistanceToNow(parseEntryDate(entry.date), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <p className="text-zinc-300 line-clamp-2 mt-2 leading-relaxed">
                {entry.content}
              </p>
              <Link to="/journal" className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                View full entry &rarr;
              </Link>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <p className="text-zinc-500">No recent activity. Start by creating a new journal entry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
