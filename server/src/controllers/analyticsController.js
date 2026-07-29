// Analytics controller — aggregates numbers for the admin & client dashboards.
import prisma from '../config/db.js';
import { calculateProgress } from '../utils/calculateProgress.js';

// GET /api/analytics/admin — totals for the admin dashboard
export async function adminAnalytics(req, res, next) {
  try {
    const [paidAgg, pendingAgg, overdueAgg, activeCount, completedCount, totalClients, totalProjects, topPaid, team] =
      await Promise.all([
        prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: 'paid' } }),
        prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: 'pending' } }),
        // Overdue invoices: both the outstanding amount and how many.
        prisma.invoice.aggregate({
          _sum: { totalAmount: true },
          _count: true,
          where: { status: 'overdue' },
        }),
        prisma.project.count({ where: { status: 'in_progress' } }),
        prisma.project.count({ where: { status: 'completed' } }),
        prisma.client.count({ where: { archived: false } }),
        prisma.project.count({ where: { archived: false } }),
        // Top clients by paid revenue — aggregated in the database so the
        // query stays O(5) regardless of how many clients/invoices exist.
        prisma.invoice.groupBy({
          by: ['clientId'],
          where: { status: 'paid', client: { archived: false } },
          _sum: { totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 5,
        }),
        // Team workload: each member with their count of not-yet-done tasks.
        prisma.user.findMany({
          where: { role: { in: ['admin', 'team_member'] } },
          select: {
            name: true,
            _count: { select: { assignedTasks: { where: { status: { not: 'done' } } } } },
          },
        }),
      ]);

    // Resolve the five client names in one query.
    const topClientRows = await prisma.client.findMany({
      where: { id: { in: topPaid.map((g) => g.clientId) } },
      select: { id: true, name: true },
    });
    const nameById = Object.fromEntries(topClientRows.map((c) => [c.id, c.name]));
    const topClients = topPaid.map((g) => ({
      name: nameById[g.clientId] || '—',
      revenue: g._sum.totalAmount || 0,
    }));

    // Shape the workload data for the chart: [{ name, tasks }], busiest first.
    const teamWorkload = team
      .map((u) => ({ name: u.name, tasks: u._count.assignedTasks }))
      .sort((a, b) => b.tasks - a.tasks);

    res.json({
      totalRevenue: paidAgg._sum.totalAmount || 0,
      pendingPayments: pendingAgg._sum.totalAmount || 0,
      overduePayments: overdueAgg._sum.totalAmount || 0,
      overdueCount: overdueAgg._count || 0,
      activeProjects: activeCount,
      completedProjects: completedCount,
      totalClients,
      totalProjects,
      topClients,
      teamWorkload,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/client — summary for the logged-in client's dashboard
export async function clientAnalytics(req, res, next) {
  try {
    const client = await prisma.client.findUnique({ where: { linkedUserId: req.user.id } });
    if (!client) {
      return res.json({ projects: [], pendingInvoices: 0, overdueInvoices: 0, paidInvoices: 0 });
    }

    const [projects, pending, overdue, paid] = await Promise.all([
      prisma.project.findMany({
        where: { clientId: client.id, archived: false },
        include: { tasks: { select: { status: true } } },
      }),
      prisma.invoice.count({ where: { clientId: client.id, status: 'pending' } }),
      // The daily cron flips past-due invoices to "overdue" — without this
      // bucket they would vanish from the client's dashboard entirely.
      prisma.invoice.count({ where: { clientId: client.id, status: 'overdue' } }),
      prisma.invoice.count({ where: { clientId: client.id, status: 'paid' } }),
    ]);

    res.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        deadline: p.deadline,
        progress: calculateProgress(p.tasks),
      })),
      pendingInvoices: pending,
      overdueInvoices: overdue,
      paidInvoices: paid,
    });
  } catch (err) {
    next(err);
  }
}
