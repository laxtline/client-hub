// Pure helper to compute a project's progress percentage from its tasks.
// Kept separate so it can be unit-tested and reused by controllers/services.

/**
 * Calculate completion percentage of a project.
 * @param {Array<{status: string}>} tasks - the project's tasks
 * @returns {number} integer 0-100 (0 when there are no tasks)
 */
export function calculateProgress(tasks = []) {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}
