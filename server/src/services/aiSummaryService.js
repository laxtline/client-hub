// ===================================================================
// aiSummaryService — THE CORE DIFFERENTIATOR.
// Aggregates a project's recent activity, asks Groq (Llama) to write a friendly
// progress summary + risk flag, stores it, and NEVER crashes the app if the
// AI call fails (falls back to a deterministic template).
// ===================================================================
import prisma from '../config/db.js';
import { groqEnabled, groqChat } from '../config/groq.js';
import logger from '../utils/logger.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Step 1 — Aggregate the raw activity numbers we want the AI to reason about.
 * @returns {object} structured stats used both for the prompt and the fallback
 */
async function aggregateActivity(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { include: { comments: { orderBy: { createdAt: 'desc' }, take: 3 } } },
      client: true,
    },
  });
  if (!project) throw new Error('Project not found');

  const weekAgo = new Date(Date.now() - ONE_WEEK_MS);
  const tasks = project.tasks;
  // completedAt (stamped when a task moves to done) is the honest measure of
  // "finished this week"; createdAt would miss old tasks completed recently.
  const completedThisWeek = tasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt >= weekAgo
  ).length;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const pendingTasks = totalTasks - doneTasks;
  const hoursLogged = tasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);
  const daysToDeadline = project.deadline
    ? Math.ceil((new Date(project.deadline) - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  // Recent comments often reveal blockers — surface a few for the model.
  const recentComments = tasks
    .flatMap((t) => t.comments.map((c) => c.text))
    .slice(0, 5);

  return {
    projectTitle: project.title,
    clientName: project.client?.name,
    completedThisWeek,
    totalTasks,
    doneTasks,
    pendingTasks,
    hoursLogged,
    daysToDeadline,
    recentComments,
  };
}

/**
 * Step 2 — Turn the stats into a clear, well-scoped prompt for the model.
 * We explicitly ask for JSON so the response is easy to parse reliably.
 */
function buildPrompt(stats) {
  return `You are a project manager writing a short weekly progress update for a client.

Project: "${stats.projectTitle}" for client ${stats.clientName || 'N/A'}.
Activity data:
- Tasks completed this week: ${stats.completedThisWeek}
- Total tasks: ${stats.totalTasks} (done: ${stats.doneTasks}, pending: ${stats.pendingTasks})
- Hours logged: ${stats.hoursLogged}
- Days until deadline: ${stats.daysToDeadline ?? 'no deadline set'}
- Recent team comments/blockers: ${stats.recentComments.length ? stats.recentComments.join(' | ') : 'none'}

Write a friendly, professional 3-4 sentence summary covering what was done,
what is pending, and any likely blockers. Then classify project risk.

Respond ONLY with strict JSON in this exact shape:
{"summary": "<text>", "riskFlag": "on_track" | "at_risk" | "delayed"}`;
}

/**
 * Deterministic fallback used when the AI is unavailable or errors.
 * Guarantees the feature always returns something useful.
 */
function fallbackSummary(stats) {
  const deadlinePart =
    stats.daysToDeadline != null ? ` Deadline in ${stats.daysToDeadline} day(s).` : '';
  return {
    summaryText: `${stats.doneTasks} of ${stats.totalTasks} tasks completed (` +
      `${stats.completedThisWeek} this week), ${stats.hoursLogged} hours logged.` +
      `${deadlinePart} (AI summary unavailable — showing an automatic summary.)`,
    riskFlag: 'unknown',
  };
}

/**
 * Public API — generate + persist a summary for one project.
 * @param {string} projectId
 * @returns {Promise<{summaryText:string, riskFlag:string, aiUsed:boolean}>}
 */
export async function generateProjectSummary(projectId) {
  const stats = await aggregateActivity(projectId);

  let summaryText;
  let riskFlag;
  let aiUsed = false;

  if (!groqEnabled) {
    // No API key configured — go straight to fallback.
    ({ summaryText, riskFlag } = fallbackSummary(stats));
  } else {
    try {
      const text = await groqChat({
        messages: [{ role: 'user', content: buildPrompt(stats) }],
        maxTokens: 400,
        jsonMode: true, // ask Groq for strict JSON output
      });
      const parsed = JSON.parse(text); // model was told to return strict JSON
      // Guard BOTH fields: valid JSON missing "summary" would otherwise send
      // undefined into the non-null summaryText column and crash the create.
      if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
        throw new Error('AI response missing "summary" field');
      }
      summaryText = parsed.summary;
      riskFlag = ['on_track', 'at_risk', 'delayed'].includes(parsed.riskFlag)
        ? parsed.riskFlag
        : 'unknown';
      aiUsed = true;
    } catch (err) {
      // Graceful degradation — log and fall back, never throw to the caller.
      logger.error(`AI summary failed for project ${projectId}: ${err.message}`);
      ({ summaryText, riskFlag } = fallbackSummary(stats));
    }
  }

  // Persist with full history (one row per generation).
  const saved = await prisma.aISummary.create({
    data: { projectId, summaryText, riskFlag },
  });

  return { ...saved, aiUsed };
}
