import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, SquareKanban, ArrowRight } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { kanbanService, KanbanCard, pushService } from '../lib/kanban';
import { Bell } from 'lucide-react';

type UrgencyBucket = 'Overdue' | 'Due this week' | 'Due later' | 'No due date';

export default function GlobalKanban() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await kanbanService.getGlobalCards();
        // Only show pending and in_progress
        setCards(data.filter(c => c.column_id !== 'completed'));
      } catch (err) {
        console.error('Failed to load global kanban', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
          <h1 className="text-2xl font-semibold text-white">Backlog</h1>
          <p className="text-base text-zinc-400">
            Your global unified view of all pending tasks across every project.
          </p>
        </div>
        {Notification.permission !== 'granted' && (
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
          >
            <Bell className="w-4 h-4" />
            {subscribing ? 'Enabling...' : 'Enable Notifications'}
          </button>
        )}
      </header>

      <div className="flex-1 w-full max-w-4xl space-y-8">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/20 py-20">
            <SquareKanban className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">You are all caught up!</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto text-center mb-6">
              There are no pending tasks in your backlog.
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
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {card.estimated_minutes} min
                        </span>
                      )}
                      <button
                        onClick={() => navigate(`/projects/${card.project_id}?tab=kanban`)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all"
                      >
                        Start <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
