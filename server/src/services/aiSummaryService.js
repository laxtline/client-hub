import prisma from '../config/db.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const weekMs = 7 * 24 * 60 * 60 * 1000;

// TODO: avoid regenerating the same summary repeatedly.

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

function fallback(stats) {
  const deadlinePart = stats.daysToDeadline != null ? ` Deadline in ${stats.daysToDeadline} day(s).` : '';
  return {
    summaryText:
      `${stats.doneTasks} of ${stats.totalTasks} tasks completed (` +
      `${stats.completedThisWeek} this week), ${stats.hoursLogged} hours logged.` +
      `${deadlinePart} (AI unavailable)`,
    riskFlag: 'unknown',
  };
}

export async function generateProjectSummary(projectId) {
  const stats = await aggregateActivity(projectId);

  let summaryText;
  let riskFlag;
  let aiUsed = false;

  try {
    const res = await fetch(`${AI_SERVICE_URL}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_title: stats.projectTitle,
        client_name: stats.clientName,
        completed_this_week: stats.completedThisWeek,
        total_tasks: stats.totalTasks,
        done_tasks: stats.doneTasks,
        hours_logged: stats.hoursLogged,
        days_to_deadline: stats.daysToDeadline,
        recent_comments: stats.recentComments,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      summaryText = data.summary || '';
      riskFlag = ['on_track', 'at_risk', 'delayed'].includes(data.riskFlag) ? data.riskFlag : 'unknown';
      aiUsed = data.aiUsed === true;
    } else {
      throw new Error(`AI service responded ${res.status}`);
    }
  } catch (err) {
    console.log('[aiSummaryService] python service failed, using fallback:', err.message);
    ({ summaryText, riskFlag } = fallback(stats));
  }

  const saved = await prisma.aISummary.create({
    data: { projectId, summaryText, riskFlag },
  });

  return { ...saved, aiUsed };
}
