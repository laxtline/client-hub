import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import Badge from '../common/Badge.jsx';
import { fmtDate } from '../../utils/helpers.js';

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  // Do not open the task when a drag ends.
  const draggedRef = useRef(false);
  if (isDragging) draggedRef.current = true;

  function handleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onOpen(task);
  }

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task);
        }
      }}
      role="button"
      tabIndex={0}
      className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm hover:shadow dark:border-gray-600 dark:bg-gray-700 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{task.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <Badge value={task.priority} />
        {task.assignedTo?.name && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{task.assignedTo.name}</span>
        )}
      </div>
      {task.dueDate && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Due {fmtDate(task.dueDate)}
        </p>
      )}
    </div>
  );
}
