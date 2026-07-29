// Seed script — populates the DB with realistic demo data so the live app looks
// populated, not empty. Run with: npm run seed
//
// Creates a full agency snapshot: an admin, a team of members, several clients
// (each with a portal login), multiple projects across every status, a busy
// Kanban board with comments + activity history, invoices/payments in every
// state, in-app notifications, and AI progress summaries.
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

async function main() {
  // Guard: this script WIPES every table before seeding. Because it runs in
  // the container boot command, an unguarded run would destroy real data on
  // every restart. Skip if data already exists unless explicitly forced.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(`Database already has ${existingUsers} user(s) — skipping seed.`);
    console.log('Set FORCE_SEED=true to wipe and reseed.');
    return;
  }

  console.log('Seeding ClientHub demo data...');

  // Clear existing data (order matters due to FK constraints).
  await prisma.taskActivity.deleteMany();
  await prisma.aISummary.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('Demo@1234', 10);

  // ===================================================================
  // USERS — 1 admin, a 4-person team, and client-portal logins.
  // ===================================================================
  const admin = await prisma.user.create({
    data: { name: 'Agency Admin', email: 'admin@demo.com', passwordHash: password, role: 'admin' },
  });

  // Primary demo team member (kept as team@demo.com for the login page hint).
  const team = await prisma.user.create({
    data: { name: 'Rahul Sharma', email: 'team@demo.com', passwordHash: password, role: 'team_member' },
  });
  const priya = await prisma.user.create({
    data: { name: 'Priya Nair', email: 'priya@demo.com', passwordHash: password, role: 'team_member' },
  });
  const arjun = await prisma.user.create({
    data: { name: 'Arjun Mehta', email: 'arjun@demo.com', passwordHash: password, role: 'team_member' },
  });
  const sana = await prisma.user.create({
    data: { name: 'Sana Kapoor', email: 'sana@demo.com', passwordHash: password, role: 'team_member' },
  });
  // Kept for readability when scanning the seeded team; not referenced below.
  const _teamMembers = [team, priya, arjun, sana];

  // Client-role logins (one per client company that has portal access).
  const clientUser = await prisma.user.create({
    data: { name: 'Acme Client', email: 'client@demo.com', passwordHash: password, role: 'client' },
  });
  const globexUser = await prisma.user.create({
    data: { name: 'Globex Contact', email: 'globex@demo.com', passwordHash: password, role: 'client' },
  });
  const initechUser = await prisma.user.create({
    data: { name: 'Initech Contact', email: 'initech@demo.com', passwordHash: password, role: 'client' },
  });
  const starkUser = await prisma.user.create({
    data: { name: 'Stark Contact', email: 'stark@demo.com', passwordHash: password, role: 'client' },
  });

  // ===================================================================
  // CLIENTS — a mix of portal-enabled customers and a plain lead.
  // ===================================================================
  const acme = await prisma.client.create({
    data: {
      name: 'Acme Client',
      companyName: 'Acme Corp',
      contactEmail: 'client@demo.com',
      contactPhone: '+91 99999 11111',
      notes: 'Flagship retainer client. Monthly marketing + web work.',
      linkedUserId: clientUser.id,
    },
  });
  const globex = await prisma.client.create({
    data: {
      name: 'Globex Ltd',
      companyName: 'Globex',
      contactEmail: 'globex@demo.com',
      contactPhone: '+91 99999 22222',
      notes: 'Mobile-first product company. New in 2026.',
      linkedUserId: globexUser.id,
    },
  });
  const initech = await prisma.client.create({
    data: {
      name: 'Initech Systems',
      companyName: 'Initech',
      contactEmail: 'initech@demo.com',
      contactPhone: '+91 99999 33333',
      notes: 'Internal tools & dashboard modernization.',
      linkedUserId: initechUser.id,
    },
  });
  const stark = await prisma.client.create({
    data: {
      name: 'Stark Industries',
      companyName: 'Stark Industries Pvt Ltd',
      contactEmail: 'stark@demo.com',
      contactPhone: '+91 99999 44444',
      notes: 'Enterprise account. High-touch, quarterly reviews.',
      linkedUserId: starkUser.id,
    },
  });
  // Created purely to populate the demo list; nothing links back to it.
  const _wayne = await prisma.client.create({
    data: {
      name: 'Wayne Enterprises',
      companyName: 'Wayne Enterprises',
      contactEmail: 'contact@wayne.example',
      contactPhone: '+91 99999 55555',
      notes: 'Prospect / lead — proposal sent, awaiting sign-off. No portal login yet.',
    },
  });

  // ===================================================================
  // PROJECTS — covering every ProjectStatus value.
  // ===================================================================
  const website = await prisma.project.create({
    data: {
      clientId: acme.id,
      title: 'Acme Website Redesign',
      description: 'Full redesign of the Acme marketing site with a new design system and CMS.',
      budget: 250000,
      startDate: new Date('2026-05-01'),
      deadline: new Date('2026-08-15'),
      status: 'in_progress',
    },
  });
  const acmeBrand = await prisma.project.create({
    data: {
      clientId: acme.id,
      title: 'Acme Brand Refresh',
      description: 'Logo, colour system and brand guidelines refresh.',
      budget: 120000,
      startDate: new Date('2026-02-01'),
      deadline: new Date('2026-04-30'),
      status: 'completed',
    },
  });
  const globexApp = await prisma.project.create({
    data: {
      clientId: globex.id,
      title: 'Globex Mobile App',
      description: 'iOS + Android app MVP with offline sync.',
      budget: 500000,
      startDate: new Date('2026-06-15'),
      deadline: new Date('2026-11-30'),
      status: 'in_progress',
    },
  });
  const initechDash = await prisma.project.create({
    data: {
      clientId: initech.id,
      title: 'Initech Ops Dashboard',
      description: 'Internal analytics dashboard replacing legacy spreadsheets.',
      budget: 320000,
      startDate: new Date('2026-03-10'),
      deadline: new Date('2026-09-01'),
      status: 'on_hold',
    },
  });
  // Extra project so a client has more than one; no tasks hang off it.
  const _starkPortal = await prisma.project.create({
    data: {
      clientId: stark.id,
      title: 'Stark Partner Portal',
      description: 'B2B partner portal with SSO and role-based access.',
      budget: 900000,
      startDate: new Date('2026-07-01'),
      deadline: new Date('2027-01-15'),
      status: 'not_started',
    },
  });

  // ===================================================================
  // TASKS — a realistic Kanban across the active projects, spread over
  // the team, with due dates, comments and an activity trail.
  // ===================================================================
  const now = new Date('2026-07-05');
  const day = 24 * 60 * 60 * 1000;
  const inDays = (n) => new Date(now.getTime() + n * day);

  // [title, status, priority, hoursLogged, assignee, dueInDays]
  const taskPlan = [
    // Acme Website Redesign
    [website, 'Wireframes', 'done', 12, 'high', priya, -20],
    [website, 'Design system', 'done', 18, 'high', priya, -10],
    [website, 'Homepage build', 'in_progress', 9, 'medium', team, 6],
    [website, 'CMS integration', 'review', 6, 'medium', arjun, 3],
    [website, 'SEO setup', 'todo', 0, 'low', sana, 14],
    [website, 'Accessibility audit', 'todo', 0, 'medium', sana, 18],
    // Globex Mobile App
    [globexApp, 'Auth & onboarding flow', 'in_progress', 14, 'high', team, 8],
    [globexApp, 'Offline sync engine', 'todo', 0, 'high', arjun, 21],
    [globexApp, 'Push notifications', 'todo', 0, 'medium', arjun, 25],
    [globexApp, 'App icon & splash', 'done', 4, 'low', priya, -3],
    // Initech Ops Dashboard (on hold — mostly review/todo)
    [initechDash, 'Data model + ETL', 'review', 22, 'high', arjun, -2],
    [initechDash, 'Chart components', 'in_progress', 10, 'medium', sana, 12],
    [initechDash, 'Access control', 'todo', 0, 'high', team, 30],
    // Acme Brand Refresh (completed)
    [acmeBrand, 'Logo concepts', 'done', 16, 'high', priya, -60],
    [acmeBrand, 'Brand guidelines', 'done', 20, 'medium', priya, -40],
  ];

  const createdTasks = {};
  for (const [project, title, status, hours, priority, assignee, due] of taskPlan) {
    const t = await prisma.task.create({
      data: {
        projectId: project.id,
        title,
        status,
        priority,
        hoursLogged: hours,
        assignedToUserId: assignee.id,
        dueDate: inDays(due),
      },
    });
    createdTasks[title] = t;

    // Activity trail: creation + (for progressed tasks) a status change.
    await prisma.taskActivity.create({
      data: { taskId: t.id, userId: admin.id, action: 'task_created', detail: `Assigned to ${assignee.name}` },
    });
    if (status !== 'todo') {
      await prisma.taskActivity.create({
        data: { taskId: t.id, userId: assignee.id, action: 'status_changed', detail: `todo → ${status}` },
      });
    }
  }

  // A few discussion threads on key tasks.
  const comments = [
    ['Homepage build', team, 'Hero section is done — pulling copy from the CMS next.'],
    ['Homepage build', priya, 'Looks great! Can we tighten the spacing above the fold?'],
    ['CMS integration', arjun, 'Blocked on API keys from the client — following up today.'],
    ['Auth & onboarding flow', team, 'OTP login working on both platforms. QA next.'],
    ['Data model + ETL', arjun, 'ETL job is ready for review. On hold until budget is confirmed.'],
  ];
  for (const [taskTitle, user, text] of comments) {
    await prisma.taskComment.create({
      data: { taskId: createdTasks[taskTitle].id, userId: user.id, text },
    });
    await prisma.taskActivity.create({
      data: { taskId: createdTasks[taskTitle].id, userId: user.id, action: 'comment_added', detail: text.slice(0, 40) },
    });
  }

  // ===================================================================
  // INVOICES + PAYMENTS — paid, pending and overdue states.
  // ===================================================================
  const paidInvoice = await prisma.invoice.create({
    data: {
      projectId: website.id,
      clientId: acme.id,
      lineItems: [{ description: 'Design phase', quantity: 1, rate: 80000 }],
      taxRate: 18,
      totalAmount: 94400,
      status: 'paid',
    },
  });
  await prisma.payment.create({
    data: {
      invoiceId: paidInvoice.id,
      amount: 94400,
      gatewayTransactionId: 'pay_demo_ACME001',
      status: 'paid',
      paidAt: new Date('2026-06-20'),
    },
  });

  await prisma.invoice.create({
    data: {
      projectId: website.id,
      clientId: acme.id,
      lineItems: [{ description: 'Development phase (milestone 1)', quantity: 1, rate: 100000 }],
      taxRate: 18,
      totalAmount: 118000,
      status: 'pending',
      dueDate: inDays(20),
    },
  });

  // Overdue invoice for Globex.
  await prisma.invoice.create({
    data: {
      projectId: globexApp.id,
      clientId: globex.id,
      lineItems: [
        { description: 'Discovery & UX', quantity: 1, rate: 90000 },
        { description: 'Sprint 1', quantity: 1, rate: 110000 },
      ],
      taxRate: 18,
      totalAmount: 236000,
      status: 'overdue',
      dueDate: inDays(-5),
    },
  });

  // Paid brand-refresh invoice.
  const brandInvoice = await prisma.invoice.create({
    data: {
      projectId: acmeBrand.id,
      clientId: acme.id,
      lineItems: [{ description: 'Brand refresh — full scope', quantity: 1, rate: 120000 }],
      taxRate: 18,
      totalAmount: 141600,
      status: 'paid',
    },
  });
  await prisma.payment.create({
    data: {
      invoiceId: brandInvoice.id,
      amount: 141600,
      gatewayTransactionId: 'pay_demo_ACME002',
      status: 'paid',
      paidAt: new Date('2026-05-05'),
    },
  });

  // Initech pending invoice (project on hold).
  await prisma.invoice.create({
    data: {
      projectId: initechDash.id,
      clientId: initech.id,
      lineItems: [{ description: 'Phase 1 — data platform', quantity: 1, rate: 150000 }],
      taxRate: 18,
      totalAmount: 177000,
      status: 'pending',
      dueDate: inDays(10),
    },
  });

  // ===================================================================
  // AI SUMMARIES — varied risk flags across projects.
  // ===================================================================
  await prisma.aISummary.create({
    data: {
      projectId: website.id,
      summaryText:
        'Strong week: wireframes and the design system are complete, and the homepage build ' +
        'is underway. CMS integration is in review, blocked only on client API keys. SEO and ' +
        'accessibility work is queued. No major blockers — on track for the Aug 15 deadline.',
      riskFlag: 'on_track',
    },
  });
  await prisma.aISummary.create({
    data: {
      projectId: globexApp.id,
      summaryText:
        'Auth and onboarding are progressing well, but the offline sync engine — the riskiest ' +
        'piece — has not started and an invoice is now overdue. Recommend confirming payment and ' +
        'front-loading sync work next sprint.',
      riskFlag: 'at_risk',
    },
  });
  await prisma.aISummary.create({
    data: {
      projectId: initechDash.id,
      summaryText:
        'Project is on hold pending budget sign-off. ETL work is complete and in review; ' +
        'remaining work cannot start until the client confirms Phase 2. Timeline is slipping.',
      riskFlag: 'delayed',
    },
  });

  // ===================================================================
  // NOTIFICATIONS — a few unread alerts per role.
  // ===================================================================
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, message: 'Globex invoice is overdue by 5 days.', type: 'invoice_overdue', link: '/invoices' },
      { userId: admin.id, message: 'AI flagged “Globex Mobile App” as at risk.', type: 'ai_risk', link: '/projects' },
      { userId: admin.id, message: 'Payment received: ₹94,400 from Acme Corp.', type: 'invoice_paid', isRead: true, link: '/invoices' },
      // Task notifications deep-link to the task's PROJECT page (which hosts the
      // Kanban board) — there is no standalone /tasks route, so linking there
      // would drop the user on the 404 page.
      { userId: team.id, message: 'You were assigned “Homepage build”.', type: 'task_assigned', link: `/projects/${website.id}` },
      { userId: team.id, message: 'Priya commented on “Homepage build”.', type: 'comment', link: `/projects/${website.id}` },
      { userId: priya.id, message: 'You were assigned “App icon & splash”.', type: 'task_assigned', isRead: true, link: `/projects/${globexApp.id}` },
      { userId: arjun.id, message: 'You were assigned “CMS integration”.', type: 'task_assigned', link: `/projects/${website.id}` },
      { userId: clientUser.id, message: 'New invoice available for “Acme Website Redesign”.', type: 'invoice_new', link: '/invoices' },
      { userId: clientUser.id, message: 'Weekly AI progress report is ready.', type: 'ai_summary', link: '/projects' },
    ],
  });

  // ===================================================================
  // Summary log
  // ===================================================================
  const counts = {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    invoices: await prisma.invoice.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('Seed complete:', counts);
  console.log('Admin login  → admin@demo.com  (Demo@1234)');
  console.log('Team logins  → team@demo.com, priya@demo.com, arjun@demo.com, sana@demo.com  (Demo@1234)');
  console.log('Client logins → client@demo.com, globex@demo.com, initech@demo.com, stark@demo.com  (Demo@1234)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
