import prisma from '../config/db.js';
import { calculateProgress } from '../utils/calculateProgress.js';

// Admin query-plan check.
export async function debugQuery(req, res, next) {
  try {
    const result = await prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT p.*, c.name as client_name
      FROM "Project" p
      JOIN "Client" c ON p."clientId" = c.id
      WHERE p.archived = false
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `;
    res.json({ explain: result });
  } catch (err) {
    next(err);
  }
}

export async function adminAnalytics(req, res, next) {
  try {
    const [
      paidAgg,
      pendingAgg,
      overdueAgg,
      activeCount,
      completedCount,
      totalClients,
      totalProjects,
      topPaid,
      team,
    ] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: 'paid' } }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: 'pending' } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        _count: true,
        where: { status: 'overdue' },
      }),
      prisma.project.count({ where: { status: 'in_progress', archived: false } }),
      prisma.project.count({ where: { status: 'completed', archived: false } }),
      prisma.client.count({ where: { archived: false } }),
      prisma.project.count({ where: { archived: false } }),
      // Get paid totals in the database.
      prisma.invoice.groupBy({
        by: ['clientId'],
        where: { status: 'paid', client: { archived: false } },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      prisma.user.findMany({
        where: { role: { in: ['admin', 'team_member'] } },
        select: {
          name: true,
          _count: {
            select: {
              assignedTasks: { where: { status: { not: 'done' }, project: { archived: false } } },
            },
          },
        },
      }),
    ]);

    // Look up the names in one query.
    const topClientRows = await prisma.client.findMany({
      where: { id: { in: topPaid.map((g) => g.clientId) } },
      select: { id: true, name: true },
    });
    const nameById = Object.fromEntries(topClientRows.map((c) => [c.id, c.name]));
    const topClients = topPaid.map((g) => ({
      name: nameById[g.clientId] || '—',
      revenue: g._sum.totalAmount || 0,
    }));

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
