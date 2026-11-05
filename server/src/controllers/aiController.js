// AI controller — endpoints for generating and reading project AI summaries.
import prisma from '../config/db.js';
import { generateProjectSummary } from '../services/aiSummaryService.js';

// POST /api/ai/summary/:projectId — admin-only "Generate Summary Now"
export async function generateSummary(req, res, next) {
  try {
    const summary = await generateProjectSummary(req.params.projectId);
    res.status(201).json({ summary });
  } catch (err) {
    next(err);
  }
}

// GET /api/ai/summary/:projectId — latest summary + history for a project
export async function getSummaries(req, res, next) {
  try {
    // Tenant isolation: a client can only read summaries for their own project.
    if (req.user.role === 'client') {
      const client = await prisma.client.findUnique({ where: { linkedUserId: req.user.id } });
      const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
      if (!project || project.clientId !== client?.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const summaries = await prisma.aISummary.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { generatedAt: 'desc' },
    });
    res.json({ latest: summaries[0] || null, history: summaries.slice(1) });
  } catch (err) {
    next(err);
  }
}
