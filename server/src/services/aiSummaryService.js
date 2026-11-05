import prisma from '../config/db.js';
import { groqEnabled, groqChat } from '../config/groq.js';
import logger from '../utils/logger.js';

const weekMs = 7 * 24 * 60 * 60 * 1000;

async function aggregateActivity(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { include: { comments: { orderBy: { createdAt: 'desc' }, take: 3 } } },
      client: true,
    },
  });
  if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

  const weekAgo = new Date(Date.now() - weekMs);
  const tasks = project.tasks;
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
  const recentComments = tasks.flatMap((t) => t.comments.map((c) => c.text)).slice(0, 5);

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

function fallbackSummary(stats) {
  const deadlinePart =
    stats.daysToDeadline != null ? ` Deadline in ${stats.daysToDeadline} day(s).` : '';
  return {
    summaryText:
      `${stats.doneTasks} of ${stats.totalTasks} tasks completed (` +
      `${stats.completedThisWeek} this week), ${stats.hoursLogged} hours logged.` +
      `${deadlinePart} (AI summary unavailable - showing an automatic summary.)`,
    riskFlag: 'unknown',
  };
}

export async function generateProjectSummary(projectId) {
  const stats = await aggregateActivity(projectId);

  let summaryText;
  let riskFlag;
  let aiUsed = false;

  if (!groqEnabled) {
    ({ summaryText, riskFlag } = fallbackSummary(stats));
  } else {
    try {
      const text = await groqChat({
        messages: [{ role: 'user', content: buildPrompt(stats) }],
        maxTokens: 400,
        jsonMode: true,
      });
      const parsed = JSON.parse(text);
      if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
        throw new Error('AI response missing "summary" field');
      }
      summaryText = parsed.summary;
      riskFlag = ['on_track', 'at_risk', 'delayed'].includes(parsed.riskFlag)
        ? parsed.riskFlag
        : 'unknown';
      aiUsed = true;
    } catch (err) {
      logger.error(`AI summary failed for project ${projectId}: ${err.message}`);
      ({ summaryText, riskFlag } = fallbackSummary(stats));
    }
  }

  const saved = await prisma.aISummary.create({
    data: { projectId, summaryText, riskFlag },
  });

  return { ...saved, aiUsed };
}
