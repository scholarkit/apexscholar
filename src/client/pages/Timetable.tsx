import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Settings, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { timetableService, ScheduledBlock, AvailabilityProfile } from '../lib/kanban';

export default function Timetable() {
  const [blocks, setBlocks] = useState<ScheduledBlock[]>([]);
  const [availability, setAvailability] = useState<AvailabilityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [regenerating, setRegenerating] = useState(false);
  const navigate = useNavigate();

  function getStartOfWeek(d: Date) {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(dt.setDate(diff));
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [avail, blks] = await Promise.all([
        timetableService.getAvailability(),
        timetableService.getBlocks()
      ]);
      setAvailability(avail);
      setBlocks(blks);
    } catch (err) {
      console.error('Failed to load timetable', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      await timetableService.regenerate();
      await loadData();
    } catch (err) {
      console.error('Regenerate failed', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availability) return;
    try {
      await timetableService.updateAvailability(availability);
      setShowSettings(false);
      handleRegenerate(); // Regenerate when capacity changes
    } catch (err) {
      console.error('Save availability failed', err);
    }
  };

  // Build week calendar
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-32 lg:pb-8">
      <Breadcrumbs />
      <header className="mb-6 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
          <h1 className="text-2xl font-semibold text-white">Global Timetable</h1>
          <p className="text-base text-zinc-400">
            Your auto-generated schedule based on task deadlines and capacity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-white/5 text-white rounded-xl font-medium transition-colors"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            Capacity
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate Schedule
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && availability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1b23] border border-indigo-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-semibold text-white mb-4">Availability Profile</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Set how many minutes per day you can dedicate to tasks. We use this to auto-schedule your todos.
            </p>
            <form onSubmit={handleSaveAvailability} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Weekday Minutes (Mon-Fri)</label>
                <input
                  type="number"
                  value={availability.weekday_minutes}
                  onChange={e => setAvailability({...availability, weekday_minutes: parseInt(e.target.value) || 0})}
                  className="w-full bg-black/20 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Weekend Minutes (Sat-Sun)</label>
                <input
                  type="number"
                  value={availability.weekend_minutes}
                  onChange={e => setAvailability({...availability, weekend_minutes: parseInt(e.target.value) || 0})}
                  className="w-full bg-black/20 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                  min="0"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium"
                >
                  Save & Regenerate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            {currentWeekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))} className="px-3 py-1.5 text-sm font-medium hover:bg-white/5 rounded-lg text-zinc-300 hover:text-white transition-colors">
              Today
            </button>
            <button onClick={nextWeek} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-7 overflow-y-auto">
          {weekDays.map((date, i) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayBlocks = blocks.filter(b => b.date === dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div key={dateStr} className={`min-h-[200px] border-r border-b md:border-b-0 border-[var(--color-border)] p-3 ${isToday ? 'bg-indigo-500/5' : ''}`}>
                <div className="flex flex-col items-center mb-4">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className={`text-lg font-medium w-8 h-8 flex items-center justify-center rounded-full mt-1 ${isToday ? 'bg-indigo-500 text-white' : 'text-zinc-300'}`}>
                    {date.getDate()}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {dayBlocks.map(block => (
                    <div 
                      key={block.id} 
                      onClick={() => navigate(`/projects/${block.kanban_cards?.project_id}?tab=kanban`)}
                      className="p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-indigo-500/50 cursor-pointer transition-colors group relative"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-white/90 line-clamp-2 leading-tight">
                          {block.kanban_cards?.content || 'Unknown task'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded">
                          <Clock className="w-3 h-3" />
                          {block.duration_minutes}m
                        </span>
                        {block.kanban_cards?.projects && (
                          <span className="text-[10px] text-indigo-400 truncate max-w-[80px]">
                            {block.kanban_cards.projects.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayBlocks.length === 0 && (
                    <div className="text-center py-4">
                      <span className="text-xs text-zinc-600">No tasks</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
