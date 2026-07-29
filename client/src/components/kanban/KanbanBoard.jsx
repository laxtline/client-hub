// KanbanBoard — the 4-column drag-and-drop board. Owns the DndContext, groups
// tasks by status into columns, and persists a move by calling the API when a
// card is dropped on a different column. Optimistically updates the UI first.
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { taskApi } from '../../api/taskApi.js';
import TaskColumn from './TaskColumn.jsx';

// The four Kanban columns (status value → display title), in order.
const COLUMNS = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'review', title: 'Review' },
  { status: 'done', title: 'Done' },
];

export default function KanbanBoard({ tasks, onOpenTask, onChange, readOnly = false }) {
  const [items, setItems] = useState(tasks);

  // Keep local state in sync whenever the parent reloads tasks (create/delete/edit).
  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  // Require a small drag distance so a plain click opens the task instead of dragging.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // When a card is dropped: `active.id` is the task, `over.id` is the column status.
  async function handleDragEnd({ active, over }) {
    if (!over || readOnly) return;
    const newStatus = over.id;
    const task = items.find((t) => t.id === active.id);
    if (!task || task.status === newStatus) return;

    // Optimistic update for a snappy feel.
    setItems((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t)));
    try {
      await taskApi.updateStatus(active.id, newStatus);
      onChange?.();
    } catch {
      // Revert on failure.
      setItems((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: task.status } : t)));
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <TaskColumn
            key={col.status}
            status={col.status}
            title={col.title}
            tasks={items.filter((t) => t.status === col.status)}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
