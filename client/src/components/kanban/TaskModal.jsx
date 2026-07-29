// TaskModal — opens when a Kanban card is clicked. Shows/edits task fields, logs
// hours, and hosts the comment thread. Admin/team can edit; clients view only.
import { useEffect, useState } from 'react';
import { taskApi } from '../../api/taskApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { isClient } from '../../utils/roleGuards.js';
import { formatDate } from '../../utils/dateHelpers.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import InputField from '../common/InputField.jsx';
import Badge from '../common/Badge.jsx';

export default function TaskModal({ task, open, onClose, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const readOnly = isClient(user);

  const [hours, setHours] = useState(0);
  const [priority, setPriority] = useState('medium');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the task's fields + comment thread each time a task is opened.
  useEffect(() => {
    if (!task) return;
    setHours(task.hoursLogged || 0);
    setPriority(task.priority || 'medium');
    // Active-flag guard: switching quickly from task A to task B must not let
    // A's slower comments response render under B (or after unmount).
    let active = true;
    setComments([]);
    taskApi
      .listComments(task.id)
      .then(({ data }) => {
        if (active) setComments(data.comments);
      })
      .catch(() => {
        if (active) setComments([]);
      });
    return () => {
      active = false;
    };
  }, [task]);

  if (!task) return null;

  // Save edited fields (hours + priority) back to the server.
  async function handleSave() {
    setSaving(true);
    try {
      await taskApi.update(task.id, { hoursLogged: Number(hours), priority });
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save task');
    } finally {
      setSaving(false);
    }
  }

  // Post a comment and append it to the thread.
  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await taskApi.addComment(task.id, newComment.trim());
      setComments((prev) => [...prev, data.comment]);
      setNewComment('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post comment');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.title}
      footer={
        !readOnly && (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge value={task.status} />
          <Badge value={task.priority} />
          {task.dueDate && (
            <span className="text-gray-500 dark:text-gray-400">Due {formatDate(task.dueDate)}</span>
          )}
        </div>

        {/* Editable fields (hidden for client-role viewers). */}
        {!readOnly && (
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Hours logged"
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <InputField
              label="Priority"
              as="select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </InputField>
          </div>
        )}

        {/* Comment thread. */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-brand-navy dark:text-gray-100">Comments</h4>
          <div className="space-y-2">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">No comments yet.</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-gray-50 p-2 text-sm dark:bg-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-100">
                  {c.user?.name || 'User'}
                </span>
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-400">
                  {formatDate(c.createdAt)}
                </span>
                <p className="text-gray-600 dark:text-gray-300">{c.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              aria-label="Add a comment"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            />
            <Button type="submit">Post</Button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
