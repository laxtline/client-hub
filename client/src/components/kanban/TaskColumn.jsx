// TaskColumn — one Kanban column (a drop target). CONCEPT (@dnd-kit useDroppable):
// marks this area as a place a card can be dropped; the id is the column's status.
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard.jsx';

export default function TaskColumn({ status, title, tasks, onOpenTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60 ${
        isOver ? 'ring-2 ring-brand-blue' : ''
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-navy dark:text-gray-100">{title}</h3>
        <span className="rounded-full bg-white px-2 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
        ))}
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed py-6 text-center text-xs text-gray-400 dark:border-gray-600 dark:text-gray-500">
            Drop tasks here
          </p>
        )}
      </div>
    </div>
  );
}
