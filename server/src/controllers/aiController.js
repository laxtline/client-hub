import prisma from '../config/db.js';
import { generateProjectSummary } from '../services/aiSummaryService.js';

export async function generateSummary(req, res, next) {
  try {
    const summary = await generateProjectSummary(req.params.projectId);
    res.status(201).json({ summary });
  } catch (err) {
    next(err);
  }
}

export async function getSummaries(req, res, next) {
  try {
    // A client can only read its own project summaries.
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
