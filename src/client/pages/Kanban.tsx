import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  GripVertical,
  Plus,
  SquareKanban,
  Trash2,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { kv } from '../lib/kv';

// ─── Types ───────────────────────────────────────────────────────────────────

type ColumnId = 'Literature review' | 'Data collection' | 'Analysis' | 'Peer Review';

interface Task {
  id: string;
  projectId?: string;
  columnId: ColumnId;
  content: string;
  createdAt: string;
}

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'Literature review', title: 'Literature Review' },
  { id: 'Data collection', title: 'Data Collection' },
  { id: 'Analysis', title: 'Analysis' },
  { id: 'Peer Review', title: 'Peer Review' },
];

const KV_KEY = 'research_kanban';

// ─── Components ──────────────────────────────────────────────────────────────

function TaskCard({ task, deleteIdea }: { task: Task; deleteIdea?: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-[var(--color-surface)] border    border-[var(--color-border)] hover:border-[var(--color-border)] p-3 rounded-xl shadow-sm text-sm text-zinc-300 transition-colors flex flex-col gap-2"
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
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {new Date(task.createdAt).toLocaleDateString()}
        </span>
        {deleteIdea && (
          <button
            onClick={() => deleteIdea(task.id)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Kanban() {
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Load from Puter JS
  useEffect(() => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    kv.get(KV_KEY).then((data: Task[] | null) => {
      const allTasks = data || [];
      const projectTasks = allTasks.filter((t) => t.projectId === activeProject.id);
      setTasks(projectTasks);
      setLoading(false);
    });
  }, [activeProject]);

  // Auto-save whenever tasks changes
  useEffect(() => {
    if (loading || !activeProject) return;
    const save = async () => {
      try {
        const allTasks: Task[] = (await kv.get(KV_KEY)) || [];
        // Replace tasks for this project only
        const otherTasks = allTasks.filter((t) => t.projectId !== activeProject.id);
        const updatedTasks = [...otherTasks, ...tasks];
        await kv.set(KV_KEY, updatedTasks);
      } catch (err) {
        console.error('Failed to auto-save Kanban board', err);
      }
    };
    const t = setTimeout(save, 500); // debounce save
    return () => clearTimeout(t);
  }, [tasks, loading, activeProject]);

  const addTask = (columnId: ColumnId) => {
    const content = window.prompt('Enter task description:');
    if (!content?.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      projectId: activeProject?.id,
      columnId,
      content,
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
  };

  const deleteTask = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setTasks(tasks.filter((t) => t.id !== id));
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

        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          tasks[activeIndex].columnId = tasks[overIndex].columnId;
          return arrayMove(tasks, activeIndex, overIndex - 1);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Dropping a Task over a empty Column
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        tasks[activeIndex].columnId = overId as ColumnId;
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

        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          tasks[activeIndex].columnId = tasks[overIndex].columnId;
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
      if (cols[t.columnId]) cols[t.columnId].push(t);
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
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading board...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <Breadcrumbs />
      <header className="mb-6 shrink-0">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
        <h1 className="text-2xl font-semibold text-white">Kanban Board</h1>
        <p className="text-base text-zinc-400">
          Track the progress of your research projects and papers.
        </p>
      </header>

      <div className="flex-1 w-full overflow-x-auto pb-4 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/20 py-20">
            <SquareKanban className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Your board is empty</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto text-center mb-6">
              Create your first task to start organizing your research pipeline and tracking
              progress.
            </p>
            <button
              onClick={() => addTask(COLUMNS[0].id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[var(--color-border)] text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add First Task
            </button>
          </div>
        ) : (
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
                  onAddTask={() => addTask(col.id)}
                  onDeleteTask={deleteTask}
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
        )}
      </div>
    </div>
  );
}

// ─── Column Component (Internal) ───────────────────────────────────────────────

import { useDroppable } from '@dnd-kit/core';

function Column({
  column,
  tasks,
  onAddTask,
  onDeleteTask,
}: {
  column: { id: ColumnId; title: string };
  tasks: Task[];
  onAddTask: () => void;
  onDeleteTask: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  });

  return (
    <div className="flex flex-col w-[300px] h-full max-h-full shrink-0">
      <div className="flex items-center justify-between pb-3 px-1">
        <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">
          {column.title}
        </h3>
        <span className="text-xs font-semibold bg-white/10 text-zinc-300 py-0.5 px-2 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 bg-[var(--color-surface)]/40 border    border-[var(--color-border)] rounded-xl p-2 flex flex-col gap-2 overflow-y-auto custom-scrollbar"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} deleteIdea={onDeleteTask} />
          ))}
        </SortableContext>

        <button
          onClick={onAddTask}
          className="mt-1 flex items-center justify-center gap-2 py-3 border border-dashed border-[var(--color-border)] rounded-xl hover:bg-white/5 hover:border-white/20 hover:text-white transition-all text-xs font-medium text-zinc-400 group"
        >
          <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          Add Task
        </button>
      </div>
    </div>
  );
}
