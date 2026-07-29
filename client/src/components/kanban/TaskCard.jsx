// TaskCard — a single draggable card on the Kanban board. CONCEPT (@dnd-kit
// useDraggable): registers this element as something the user can pick up; the
// board's DndContext reports where it's dropped. Clicking (not dragging) opens it.
import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import Badge from '../common/Badge.jsx';
import { formatDate } from '../../utils/dateHelpers.js';

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  // The board's 6px activation distance means a drag also fires a click on
  // pointer-up, which popped the task modal open every time a card was moved.
  // Remember whether this pointer gesture became a drag and swallow that click.
  const draggedRef = useRef(false);
  if (isDragging) draggedRef.current = true;

  function handleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onOpen(task);
  }

  // Apply the live drag offset so the card follows the cursor.
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
        // Keyboard users could not open a task at all before this.
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
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Due {formatDate(task.dueDate)}</p>
      )}
    </div>
  );
}
