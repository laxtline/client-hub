import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { taskApi } from '../../api/taskApi.js';
import TaskColumn from './TaskColumn.jsx';

const COLUMNS = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'review', title: 'Review' },
  { status: 'done', title: 'Done' },
];

export default function KanbanBoard({ tasks, onOpenTask, onChange, readOnly = false }) {
  const [items, setItems] = useState(tasks);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  // Leave a little room so clicks do not start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, distance: 8 } })
  );

  async function handleDragEnd({ active, over }) {
    if (!over || readOnly) return;
    const newStatus = over.id;
    const task = items.find((t) => t.id === active.id);
    if (!task || task.status === newStatus) return;

    setItems((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t)));
    try {
      await taskApi.updateStatus(active.id, newStatus);
      onChange?.();
    } catch {
      // Put it back if the save fails.
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
