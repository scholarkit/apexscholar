import { Calendar, Clock, SquareKanban, ArrowRight, Plus, X, Bell, Play, Pause } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { useProject } from '../contexts/ProjectContext';
import { kanbanService, KanbanCard, pushService } from '../lib/kanban';
import { useTimer } from '../contexts/TimerContext';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kv } from '../lib/kv';

type UrgencyBucket = 'Overdue' | 'Due this week' | 'Due later' | 'No due date';

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (num: number) => String(num).padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function GlobalKanban() {
  const { projects, setActiveProject } = useProject();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const {
    activeTaskId: activeTimerTaskId,
    taskElapsedTimes,
    startTimer,
    stopTimer,
    setTaskElapsedTimes,
  } = useTimer();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await kanbanService.getGlobalCards();
        // Only show pending and in_progress
        setCards(data.filter(c => c.column_id !== 'completed'));

        // Fetch global timers
        const savedTimers = await kv.get('kanban_timers_global');
        if (savedTimers) {
          setTaskElapsedTimes((prev) => ({ ...prev, ...savedTimers }));
        }
      } catch (err) {
        console.error('Failed to load global kanban', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggleTimer = async (taskId: string) => {
    if (activeTimerTaskId === taskId) {
      stopTimer();
    } else {
      const card = cards.find((c) => c.id === taskId);
      if (card) {
        startTimer(taskId, card.content, 'kanban_timers_global');
      }
    }
  };

  const handleCreateCard = async (newCardData: Partial<KanbanCard>) => {
    try {
      const createdCard = await kanbanService.createCard(newCardData);
      if (createdCard.column_id !== 'completed') {
        if (createdCard.project_id) {
          const proj = projects.find(p => p.id === createdCard.project_id);
          if (proj) {
            createdCard.projects = { name: proj.name };
          }
        }
        setCards((prev) => [createdCard, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create card', err);
    }
  };

  const getBucket = (deadline?: string): UrgencyBucket => {
    if (!deadline) return 'No due date';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(deadline + 'T00:00:00');
    if (d < today) return 'Overdue';
    
    const diffDays = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return 'Due this week';
    return 'Due later';
  };

  const grouped = cards.reduce((acc, card) => {
    const bucket = getBucket(card.deadline);
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(card);
    return acc;
  }, {} as Record<UrgencyBucket, KanbanCard[]>);

  const buckets: { title: UrgencyBucket; color: string; items: KanbanCard[] }[] = [
    { title: 'Overdue', color: 'text-red-400 bg-red-400/10 border-red-500/20', items: grouped['Overdue'] || [] },
    { title: 'Due this week', color: 'text-amber-400 bg-amber-400/10 border-amber-500/20', items: grouped['Due this week'] || [] },
    { title: 'Due later', color: 'text-blue-400 bg-blue-400/10 border-blue-500/20', items: grouped['Due later'] || [] },
    { title: 'No due date', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-500/20', items: grouped['No due date'] || [] },
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in your browser.');
      return;
    }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        // In a real app, VAPID public key should be fetched from backend or env
        // We'll pass a dummy placeholder if not injected, assuming backend uses the same
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuB-5LNdNyx8T5o7B_B6D6tYKM';
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        });
        
        await pushService.subscribe(subscription);
        alert('Notifications enabled!');
      } else {
        alert('Notification permission denied.');
      }
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
      alert('Error enabling notifications.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="flex flex-col h-full pb-32 lg:pb-8">
      <Breadcrumbs />
      <header className="mb-6 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
          <h1 className="text-2xl font-semibold text-white">Todos</h1>
          <p className="text-base text-zinc-400">
            Your global unified view of all pending tasks across every project.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {Notification.permission !== 'granted' && (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white border border-[var(--color-border)] rounded-xl font-medium transition-all"
            >
              <Bell className="w-4 h-4" />
              {subscribing ? 'Enabling...' : 'Enable Notifications'}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </header>

      <div className="flex-1 w-full space-y-8">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/20 py-20">
            <SquareKanban className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">You are all caught up!</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto text-center mb-6">
              There are no pending tasks in your todos.
            </p>
          </div>
        ) : (
          buckets.map((bucket) => bucket.items.length > 0 && (
            <div key={bucket.title} className="space-y-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bucket.color}`}>
                  {bucket.title} ({bucket.items.length})
                </span>
              </h3>
              <div className="flex flex-col gap-2">
                {bucket.items.map(card => (
                  <div key={card.id} className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/50 rounded-xl transition-colors group">
                    <div className="flex items-center gap-4">
                      {card.projects && (
                        <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-medium whitespace-nowrap">
                          {card.projects.name}
                        </span>
                      )}
                      <p className="text-sm text-zinc-200">{card.content}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-zinc-500">
                      {card.deadline && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(card.deadline + 'T00:00:00').toLocaleDateString()}
                        </span>
                      )}
                      {card.estimated_minutes && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Est: {card.estimated_minutes}m
                          </span>
                          {taskElapsedTimes[card.id] !== undefined && (
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                              activeTimerTaskId === card.id
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            }`}>
                              Time: {formatTime(taskElapsedTimes[card.id] || 0)}
                            </span>
                          )}
                          {(() => {
                            const estSeconds = card.estimated_minutes * 60;
                            const elapsed = taskElapsedTimes[card.id] || 0;
                            const isOverEstimate = estSeconds > 0 && elapsed > estSeconds;
                            const overEstimateMinutes = isOverEstimate ? Math.ceil((elapsed - estSeconds) / 60) : 0;
                            return isOverEstimate ? (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-semibold">
                                +{overEstimateMinutes}m over
                              </span>
                            ) : null;
                          })()}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        {card.estimated_minutes && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTimer(card.id);
                            }}
                            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg border transition-all ${
                              activeTimerTaskId === card.id
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 animate-pulse'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5 border-zinc-700/50'
                            }`}
                          >
                            {activeTimerTaskId === card.id ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (card.project_id) {
                              const proj = projects.find((p) => p.id === card.project_id);
                              if (proj) {
                                setActiveProject(proj);
                              }
                            }
                            navigate('/kanban');
                          }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all"
                        >
                          Start <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateCard}
          projects={projects}
        />
      )}
    </div>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  onClose: () => void;
  onSave: (newCardData: Partial<KanbanCard>) => Promise<void>;
  projects: any[];
}

function CreateTaskModal({ onClose, onSave, projects }: CreateTaskModalProps) {
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [columnId, setColumnId] = useState<'pending' | 'in_progress'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        content: content.trim(),
        project_id: projectId || undefined,
        deadline: deadline || undefined,
        estimated_minutes: estimatedMinutes === '' ? undefined : Number(estimatedMinutes),
        column_id: columnId,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Create New Task</h3>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Task Description <span className="text-indigo-400">*</span>
            </label>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed"
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Associate Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="" className="bg-[var(--color-surface)]">
                No Project (Global)
              </option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-[var(--color-surface)]">
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Estimated Duration</label>
              <input
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={(e) => {
                  const val = e.target.value;
                  setEstimatedMinutes(val === '' ? '' : parseInt(val, 10));
                }}
                placeholder="Minutes"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Status / Column</label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value as any)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="pending" className="bg-[var(--color-surface)]">Pending</option>
              <option value="in_progress" className="bg-[var(--color-surface)]">In Progress</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-[var(--color-border)] text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
