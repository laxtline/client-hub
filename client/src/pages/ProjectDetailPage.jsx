// ProjectDetailPage — the hub for a single project: overview, the Kanban board
// (with task create + detail modal), the AI progress summary panel, and the
// project's invoices. Role-aware: clients view read-only; admin/team can edit.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { projectApi } from '../api/projectApi.js';
import { taskApi } from '../api/taskApi.js';
import { aiApi } from '../api/aiApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { isAdmin, isClient } from '../utils/roleGuards.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatDate, deadlineLabel } from '../utils/dateHelpers.js';

import KanbanBoard from '../components/kanban/KanbanBoard.jsx';
import TaskModal from '../components/kanban/TaskModal.jsx';
import InvoiceTable from '../components/invoices/InvoiceTable.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import InputField from '../components/common/InputField.jsx';
import Loader from '../components/common/Loader.jsx';

const EMPTY_TASK = { title: '', description: '', priority: 'medium', dueDate: '' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const admin = isAdmin(user);
  const client = isClient(user);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  const [activeTask, setActiveTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);

  // Load the project (with tasks, invoices, progress) and its latest AI summary.
  async function load() {
    setLoading(true);
    try {
      const { data } = await projectApi.get(id);
      setProject(data.project);
      // The AI summary is a bonus panel — its failure must never hide the
      // whole project page, so it gets its own catch.
      try {
        const { data: ai } = await aiApi.get(id);
        setSummary(ai.latest);
      } catch {
        setSummary(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load project.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Admin: trigger an on-demand AI summary, then refresh the panel.
  async function generateSummary() {
    setGenLoading(true);
    try {
      const { data } = await aiApi.generate(id);
      setSummary(data.summary);
      toast.success('Summary generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate summary');
    } finally {
      setGenLoading(false);
    }
  }

  function openTask(task) {
    setActiveTask(task);
    setTaskModalOpen(true);
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    try {
      await taskApi.create({ ...taskForm, projectId: id, dueDate: taskForm.dueDate || null });
      setNewTaskOpen(false);
      setTaskForm(EMPTY_TASK);
      toast.success('Task created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create task');
    }
  }

  if (loading) return <Loader />;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Header / overview */}
      <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy dark:text-white">{project.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project.client?.name}</p>
          </div>
          <Badge value={project.status} />
        </div>
        {project.description && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{project.description}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Overview label="Progress" value={`${project.progress}%`} />
          <Overview label="Budget" value={formatCurrency(project.budget)} />
          <Overview label="Deadline" value={formatDate(project.deadline)} />
          <Overview label="Timeline" value={deadlineLabel(project.deadline)} />
        </div>
      </div>

      {/* AI summary panel */}
      <section className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-navy dark:text-gray-100">
            🤖 AI Progress Summary
          </h2>
          <div className="flex items-center gap-2">
            {summary && <Badge value={summary.riskFlag} />}
            {admin && (
              <Button onClick={generateSummary} disabled={genLoading}>
                {genLoading ? 'Generating…' : 'Generate Now'}
              </Button>
            )}
          </div>
        </div>
        {summary ? (
          <>
            {summary.riskFlag === 'unknown' && (
              <p className="mb-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                AI summary unavailable — showing a basic status instead
              </p>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-200">{summary.summaryText}</p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Generated {formatDate(summary.generatedAt)}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No summary yet{admin ? ' — click "Generate Now".' : '.'}
          </p>
        )}
      </section>

      {/* Kanban board */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-navy dark:text-gray-100">Tasks</h2>
          {!client && <Button onClick={() => setNewTaskOpen(true)}>+ Add Task</Button>}
        </div>
        <KanbanBoard tasks={project.tasks} onOpenTask={openTask} onChange={load} readOnly={client} />
      </section>

      {/* Project invoices */}
      {project.invoices?.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-navy dark:text-gray-100">Invoices</h2>
          <InvoiceTable invoices={project.invoices.map((i) => ({ ...i, project }))} />
        </section>
      )}

      {/* Task detail modal */}
      <TaskModal
        task={activeTask}
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSaved={load}
      />

      {/* New task modal */}
      <Modal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} title="Add Task">
        <form onSubmit={handleCreateTask} className="space-y-3">
          <InputField
            label="Title"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
          />
          <InputField
            label="Description"
            as="textarea"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Priority"
              as="select"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </InputField>
            <InputField
              label="Due date"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setNewTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Small labelled stat used in the project overview grid.
function Overview({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-semibold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );
}
