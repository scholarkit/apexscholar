import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { useTimer } from '../contexts/TimerContext';
import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  GripVertical,
  Pencil,
  Play,
  Pause,
  Plus,
  SquareKanban,
  Trash2,
  X,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { kv } from '../lib/kv';
import { kanbanService, KanbanCard } from '../lib/kanban';

// ─── Types ───────────────────────────────────────────────────────────────────

type ColumnId = 'pending' | 'in_progress' | 'completed';

// Alias KanbanCard to Task for backwards compatibility in UI
type Task = KanbanCard;

const COLUMNS: { id: ColumnId; title: string; color: string }[] = [
  { id: 'pending', title: 'Pending', color: 'amber' },
  { id: 'in_progress', title: 'In Progress', color: 'blue' },
  { id: 'completed', title: 'Completed', color: 'emerald' },
];

/** Map old column IDs to new ones so existing data isn't lost */
const COLUMN_MIGRATION: Record<string, ColumnId> = {
  'Literature review': 'pending',
  'Data collection': 'in_progress',
  Analysis: 'in_progress',
  'Peer Review': 'completed',
  // new IDs map to themselves
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
};

const KV_KEY = 'research_kanban';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr + 'T00:00:00');
  return deadline < today;
}

function isDueSoon(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr + 'T00:00:00');
  const diffDays = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 2;
}

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

// ─── Components ──────────────────────────────────────────────────────────────

const TaskCard = memo(function TaskCard({
  task,
  deleteIdea,
  onEdit,
  isViewer,
  isTimerRunning,
  elapsedSeconds,
  onToggleTimer,
}: {
  task: Task;
  deleteIdea?: (id: string) => void;
  onEdit?: (task: Task) => void;
  isViewer?: boolean;
  isTimerRunning?: boolean;
  elapsedSeconds?: number;
  onToggleTimer?: (taskId: string) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
    disabled: isViewer,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-zinc-800 border-2 border-indigo-500 border-dashed rounded-xl h-[100px]"
      />
    );
  }

  const overdue = task.deadline && task.column_id !== 'completed' && isOverdue(task.deadline);
  const dueSoon = task.deadline && task.column_id !== 'completed' && !overdue && isDueSoon(task.deadline);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border)] p-3 rounded-xl shadow-sm text-sm text-zinc-300 transition-colors flex flex-col gap-2"
    >
      <div className="flex gap-2 w-full">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-white mt-0.5 flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {task.content}
        </p>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-600 pl-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(task.created_at || new Date()).toLocaleDateString()}
          </span>
          {task.estimated_minutes && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px]">
                <Clock className="w-3 h-3 text-zinc-500" /> Est: {task.estimated_minutes}m
              </span>
              {elapsedSeconds !== undefined && (
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                  isTimerRunning
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}>
                  Time: {formatTime(elapsedSeconds)}
                </span>
              )}
              {(() => {
                const estSeconds = task.estimated_minutes * 60;
                const isOverEstimate = estSeconds > 0 && (elapsedSeconds || 0) > estSeconds;
                const overEstimateMinutes = isOverEstimate ? Math.ceil(((elapsedSeconds || 0) - estSeconds) / 60) : 0;
                return isOverEstimate ? (
                  <span className="px-1 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-semibold">
                    +{overEstimateMinutes}m over
                  </span>
                ) : null;
              })()}
            </div>
          )}
          {task.deadline && (
            <span
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${overdue
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : dueSoon
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                }`}
            >
              <Clock className="w-3 h-3" />
              {overdue ? 'Overdue · ' : dueSoon ? 'Due soon · ' : ''}
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>
        {!isViewer && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.estimated_minutes && onToggleTimer && (
              <button
                onClick={() => onToggleTimer(task.id)}
                className={`p-1 rounded transition-all ${
                  isTimerRunning
                    ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isTimerRunning ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(task)}
                className="p-1 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {deleteIdea && (
              <button
                onClick={() => deleteIdea(task.id)}
                className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Inline Add Task Form ────────────────────────────────────────────────────

const AddTaskForm = memo(function AddTaskForm({
  onAdd,
  onCancel,
}: {
  onAdd: (content: string, deadline?: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onAdd(content.trim(), deadline || undefined);
    setContent('');
    setDeadline('');
  };

  return (
    <div className="bg-[var(--color-surface)] border border-indigo-500/30 rounded-xl p-3 space-y-2">
      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Task description..."
        rows={2}
        className="w-full bg-transparent text-sm text-white placeholder-zinc-600 resize-none focus:outline-none leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="bg-transparent text-xs text-zinc-400 focus:outline-none [color-scheme:dark]"
            placeholder="Deadline (optional)"
          />
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 text-zinc-500 hover:text-white rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
});

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Kanban() {
  const { activeProject, projects, isViewer, loading: projectLoading } = useProject();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const {
    activeTaskId: activeTimerTaskId,
    taskElapsedTimes,
    startTimer,
    stopTimer,
    setTaskElapsedTimes,
  } = useTimer();

  const KV_TIMERS_KEY = useMemo(() => activeProject ? `kanban_timers_${activeProject.id}` : '', [activeProject]);

  // Load and migrate data
  useEffect(() => {
    if (projectLoading) return;

    if (!activeProject) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        // Check for legacy KV data
        const kvData: any[] | null = await kv.get(KV_KEY);
        if (kvData && kvData.length > 0) {
          console.log('Migrating legacy Kanban data to DB...');
          const validProjectIds = new Set(projects.map((p) => p.id));
          for (const t of kvData) {
            const hasValidProject =
              t.projectId &&
              t.projectId !== 'null' &&
              t.projectId !== 'undefined' &&
              validProjectIds.has(t.projectId);

            if (
              !t.projectId ||
              t.projectId === 'null' ||
              t.projectId === 'undefined' ||
              hasValidProject
            ) {
              await kanbanService.createCard({
                project_id: hasValidProject ? t.projectId : undefined,
                column_id: COLUMN_MIGRATION[t.columnId] || 'pending',
                content: t.content,
                deadline: t.deadline
              });
            } else {
              console.log(`Skipping migration of card "${t.content}" because project ${t.projectId} no longer exists.`);
            }
          }
          await kv.delete(KV_KEY);
        }

        // Fetch from Postgres
        const allCards = await kanbanService.getGlobalCards();
        const projectCards = allCards.filter((t) => t.project_id === activeProject.id);
        setTasks(projectCards);

        // Fetch task timers from KV
        const savedTimers = await kv.get(`kanban_timers_${activeProject.id}`);
        if (savedTimers) {
          setTaskElapsedTimes((prev) => ({ ...prev, ...savedTimers }));
        }
      } catch (err) {
        console.error('Failed to load kanban cards', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeProject, projects, projectLoading]);

  const handleToggleTimer = async (taskId: string) => {
    if (activeTimerTaskId === taskId) {
      stopTimer();
    } else {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        startTimer(taskId, task.content, KV_TIMERS_KEY);
      }
    }
  };

  const addTask = async (column_id: ColumnId, content: string, deadline?: string) => {
    try {
      const newCard = await kanbanService.createCard({
        project_id: activeProject?.id,
        column_id,
        content,
        deadline,
      });
      setTasks((prev) => [...prev, newCard]);
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedCard = await kanbanService.updateCard(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedCard : t)));
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await kanbanService.deleteCard(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // Drag and Drop Logic
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    // Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].column_id !== tasks[overIndex].column_id) {
          const newColumn = tasks[overIndex].column_id;
          tasks[activeIndex].column_id = newColumn;
          kanbanService.updateCard(activeId, { column_id: newColumn }).catch(console.error);
          return arrayMove(tasks, activeIndex, overIndex - 1);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Dropping a Task over an empty Column
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        tasks[activeIndex].column_id = overId as ColumnId;
        kanbanService.updateCard(activeId, { column_id: overId as ColumnId }).catch(console.error);
        return arrayMove(tasks, activeIndex, activeIndex);
      });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].column_id !== tasks[overIndex].column_id) {
          const newColumn = tasks[overIndex].column_id;
          tasks[activeIndex].column_id = newColumn;
          kanbanService.updateCard(activeId, { column_id: newColumn }).catch(console.error);
          return arrayMove(tasks, activeIndex, overIndex - 1);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }
  };

  // Group tasks by column
  const columns = useMemo(() => {
    const cols = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as Task[]]));
    tasks.forEach((t) => {
      if (cols[t.column_id]) cols[t.column_id].push(t);
    });
    return cols;
  }, [tasks]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Active Project</h2>
        <p className="text-zinc-500 mb-8 max-w-sm">
          You must select or create a project before accessing the Kanban Board.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Projects
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading board...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full pb-32 lg:pb-8">
      <Breadcrumbs />
      <header className="mb-6 shrink-0">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
        <h1 className="text-2xl font-semibold text-white">Kanban Board</h1>
        <p className="text-base text-zinc-400">
          Track the progress of your research projects and papers.
        </p>
      </header>

      <div className="flex-1 w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-4 h-full min-w-max items-start">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={columns[col.id]}
                  onAddTask={(content, deadline) => addTask(col.id, content, deadline)}
                  onDeleteTask={deleteTask}
                  onEditTask={setEditingTask}
                  isViewer={isViewer}
                  activeTimerTaskId={activeTimerTaskId}
                  taskElapsedTimes={taskElapsedTimes}
                  onToggleTimer={handleToggleTimer}
                />
              ))}
              {typeof window !== 'undefined' &&
                createPortal(
                  <DragOverlay
                    dropAnimation={{
                      sideEffects: defaultDropAnimationSideEffects({
                        styles: { active: { opacity: '0.5' } },
                      }),
                    }}
                  >
                    {activeTask && <TaskCard task={activeTask} />}
                  </DragOverlay>,
                  document.body
                )}
            </DndContext>
          </div>
      </div>
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={updateTask}
        />
      )}
    </div>
  );
}

// ─── Column Component (Internal) ───────────────────────────────────────────────

import { useDroppable } from '@dnd-kit/core';

const COLUMN_DOT_COLORS: Record<string, string> = {
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
  emerald: 'bg-emerald-400',
};

const Column = memo(function Column({
  column,
  tasks,
  onAddTask,
  onDeleteTask,
  onEditTask,
  isViewer,
  activeTimerTaskId,
  taskElapsedTimes,
  onToggleTimer,
}: {
  column: { id: ColumnId; title: string; color: string };
  tasks: Task[];
  onAddTask: (content: string, deadline?: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
  isViewer?: boolean;
  activeTimerTaskId?: string | null;
  taskElapsedTimes?: Record<string, number>;
  onToggleTimer?: (taskId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  });

  return (
    <div className="flex flex-col w-[300px] h-full max-h-full shrink-0">
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${COLUMN_DOT_COLORS[column.color] || 'bg-zinc-400'}`} />
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">
            {column.title}
          </h3>
        </div>
        <span className="text-xs font-semibold bg-white/10 text-zinc-300 py-0.5 px-2 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 bg-[var(--color-surface)]/40 border border-[var(--color-border)] rounded-xl p-2 flex flex-col gap-2 overflow-y-auto custom-scrollbar"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              deleteIdea={onDeleteTask}
              onEdit={onEditTask}
              isViewer={isViewer}
              isTimerRunning={activeTimerTaskId === task.id}
              elapsedSeconds={taskElapsedTimes?.[task.id]}
              onToggleTimer={onToggleTimer}
            />
          ))}
        </SortableContext>

        {!isViewer && (
          showForm ? (
            <AddTaskForm
              onAdd={(content, deadline) => {
                onAddTask(content, deadline);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="mt-1 flex items-center justify-center gap-2 py-3 border border-dashed border-[var(--color-border)] rounded-xl hover:bg-white/5 hover:border-white/20 hover:text-white transition-all text-xs font-medium text-zinc-400 group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Add Task
            </button>
          )
        )}
      </div>
    </div>
  );
});

// ─── Edit Task Modal ─────────────────────────────────────────────────────────────

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => Promise<void>;
}

function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const [content, setContent] = useState(task.content);
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>(
    task.estimated_minutes !== undefined && task.estimated_minutes !== null
      ? task.estimated_minutes
      : ''
  );
  const [columnId, setColumnId] = useState<ColumnId>(task.column_id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(task.id, {
        content: content.trim(),
        deadline: deadline || undefined,
        estimated_minutes: estimatedMinutes === '' ? undefined : Number(estimatedMinutes),
        column_id: columnId,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Edit Task</h3>
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
              onChange={(e) => setColumnId(e.target.value as ColumnId)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id} className="bg-[var(--color-surface)]">
                  {col.title}
                </option>
              ))}
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
