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
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-zinc-800/60 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-72 bg-zinc-800/60 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-zinc-800/60 rounded-lg animate-pulse"></div>
            <div className="h-10 w-28 bg-zinc-800/60 rounded-lg animate-pulse"></div>
          </div>
        </header>

        {/* KPI Overview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900/50 border    border-[#1f2937] backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-zinc-800/60 rounded-xl animate-pulse"></div>
                <div className="h-5 w-24 bg-zinc-800/60 rounded-lg animate-pulse"></div>
              </div>
              <div className="h-10 w-16 bg-zinc-800/60 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Recent Activity Skeleton */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-zinc-800/60 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-zinc-800/60 rounded-lg animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-xl bg-zinc-900/30 border    border-[#1f2937] h-28 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const lastActivity = entries.length > 0 ? entries[0].date : (resources.length > 0 ? resources[0].date_added : null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white mb-1">Dashboard</h1>
          <p className="text-xs sm:text-base text-zinc-400">Welcome back. Here's what's happening in your research.</p>
        </div>
        <div className="w-full sm:w-fit mt-2 sm:mt-0 flex flex-col sm:flex-row gap-3">
          <Link to="/journal" className="w-full sm:w-fit flex items-center gap-1 sm:gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors  ">
            <Plus className="w-4 h-4" />
            New Entry
          </Link>
          <Link to="/resources" className="w-full sm:w-fit flex items-center gap-1 sm:gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors border border-white/10">
            <Upload className="w-4 h-4" />
            Upload
          </Link>
        </div>
      </header>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-3 sm:p-6 rounded-2xl bg-zinc-900/50 border    border-[#1f2937] backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Total Entries</h3>
          </div>
          <p className="text-2xl sm:text-4xl font-semibold text-white">{entries.length}</p>
        </div>

        <div className="p-3 sm:p-6 rounded-2xl bg-zinc-900/50 border    border-[#1f2937] backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <FolderOpen className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
            <h3 className="text-zinc-400 font-medium">Resources</h3>
          </div>
          <p className="text-2xl sm:text-4xl font-semibold text-white">{resources.length}</p>
        </div>

        <div className="p-3 sm:p-6 rounded-2xl bg-zinc-900/50 border    border-[#1f2937] backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
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
            <div key={entry.id} className="p-5 rounded-xl bg-zinc-900/30 border    border-[#1f2937] hover:bg-zinc-900/50 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className="px-1 sm:px-2.5 py-1 rounded-md bg-zinc-800 text-xs font-medium text-zinc-300 border    border-[#1f2937]">
                    {entry.entry_type}
                  </span>
                  <span className="text-xs sm:text-sm text-zinc-500">
                    {formatDistanceToNow(parseEntryDate(entry.date), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <p className="text-zinc-300 line-clamp-2 mt-2 leading-relaxed">
                {entry.content}
              </p>
              <Link to="/journal" className="inline-flex items-center text-sm text-[#3B82F6] hover:text-indigo-300 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                View full entry &rarr;
              </Link>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-12 bg-zinc-900/20 border border-dashed border-white/10 rounded-2xl">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-white font-medium mb-1">No recent activity</p>
              <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">Start documenting your research journey by creating your first journal entry.</p>
              <Link to="/journal" className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20 border border-indigo-500/20 rounded-xl font-medium transition-colors">
                <Plus className="w-4 h-4" /> Create Journal Entry
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
