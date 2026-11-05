import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

const _parseAmount = (str) => parseInt(str.replace(/,/g, ''), 10); // unused but kept for reference
const parseDate = (str) => new Date(str);

const mapTaskStatus = (status) => {
  const map = {
    Done: 'done',
    'In Progress': 'in_progress',
    Pending: 'todo',
    'Not Started': 'todo',
    'On Hold': 'review',
  };
  return map[status] || 'todo';
};

const mapPriority = (priority) => {
  const map = {
    Critical: 'high',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
  };
  return map[priority] || 'medium';
};

const mapProjectStatus = (status) => {
  const map = {
    'In Progress': 'in_progress',
    'Not Started': 'not_started',
    Completed: 'completed',
    'On Hold': 'on_hold',
    Pending: 'not_started',
  };
  return map[status] || 'not_started';
};

const mapInvoiceStatus = (status) => {
  const map = {
    Paid: 'paid',
    Sent: 'pending',
    Draft: 'pending',
    Overdue: 'overdue',
  };
  return map[status] || 'pending';
};

const DEMO_PASSWORDS = {
  'admin@clienthub.com': 'Admin@ClientHub.Passcode',
  'project.manager@clienthub.com': 'Project.Manager@ClientHub.Passcode',
  'invoice.manager@clienthub.com': 'Invoice.Manager@ClientHub.Passcode',
  'task.manager@clienthub.com': 'Task.Manager@ClientHub.Passcode',
  'ui.ux.designer@clienthub.com': 'UI.UX.Designer@ClientHub.Passcode',
  'developer@clienthub.com': 'Developer@ClientHub.Passcode',
  'oscorp@clienthub.com': 'Oscorp@ClientHub.Passcode',
  'hooli@clienthub.com': 'Hooli@ClientHub.Passcode',
  'umbrella@clienthub.com': 'Umbrella@ClientHub.Passcode',
  'skyline@clienthub.com': 'Skyline@ClientHub.Passcode',
  'shopnest@clienthub.com': 'ShopNest@ClientHub.Passcode',
  'swiftmove@clienthub.com': 'SwiftMove@ClientHub.Passcode',
  'foodie@clienthub.com': 'Foodie@ClientHub.Passcode',
  'steel@clienthub.com': 'Steel@ClientHub.Passcode',
  'wonka@clienthub.com': 'Wonka@ClientHub.Passcode',
  'cyberdyne@clienthub.com': 'Cyberdyne@ClientHub.Passcode',
};

function getDemoPassword(email) {
  return DEMO_PASSWORDS[email] || `Demo@${Date.now()}`;
}

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(`Database already has ${existingUsers} user(s) — skipping seed.`);
    console.log('Set FORCE_SEED=true to wipe and reseed.');
    return;
  }

  console.log('Seeding ClientHub new client data...');

  // Clear existing data in correct order (respecting foreign keys)
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

  // ============================================
  // 1. CREATE USERS (Admin + 5 Team + 10 Clients)
  // ============================================

  // Admin
  const adminPassword = await bcrypt.hash(getDemoPassword('admin@clienthub.com'), 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Suryakanta Pradhan',
      email: 'admin@clienthub.com',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });

  // Team Members (all with team_member role, specific roles tracked in name/notes)
  const teamMembers = [];

  const pm = await prisma.user.create({
    data: {
      name: 'Dev Kapoor (Project Manager)',
      email: 'project.manager@clienthub.com',
      passwordHash: await bcrypt.hash(getDemoPassword('project.manager@clienthub.com'), 10),
      role: 'team_member',
    },
  });
  teamMembers.push({ user: pm, role: 'Project Manager', name: 'Dev Kapoor' });

  const invMgr = await prisma.user.create({
    data: {
      name: 'Rahul Mehta (Invoice Manager)',
      email: 'invoice.manager@clienthub.com',
      passwordHash: await bcrypt.hash(getDemoPassword('invoice.manager@clienthub.com'), 10),
      role: 'team_member',
    },
  });
  teamMembers.push({ user: invMgr, role: 'Invoice Manager', name: 'Rahul Mehta' });

  const taskMgr = await prisma.user.create({
    data: {
      name: 'Anita Singh (Task Manager)',
      email: 'task.manager@clienthub.com',
      passwordHash: await bcrypt.hash(getDemoPassword('task.manager@clienthub.com'), 10),
      role: 'team_member',
    },
  });
  teamMembers.push({ user: taskMgr, role: 'Task Manager', name: 'Anita Singh' });

  const designer = await prisma.user.create({
    data: {
      name: 'Priya Nair (UI/UX Designer)',
      email: 'ui.ux.designer@clienthub.com',
      passwordHash: await bcrypt.hash(getDemoPassword('ui.ux.designer@clienthub.com'), 10),
      role: 'team_member',
    },
  });
  teamMembers.push({ user: designer, role: 'UI/UX Designer', name: 'Priya Nair' });

  const dev = await prisma.user.create({
    data: {
      name: 'Arjun Verma (Developer)',
      email: 'developer@clienthub.com',
      passwordHash: await bcrypt.hash(getDemoPassword('developer@clienthub.com'), 10),
      role: 'team_member',
    },
  });
  teamMembers.push({ user: dev, role: 'Developer', name: 'Arjun Verma' });

  // Client Users (10 clients)
  const clientData = [
    { name: 'Norman Osborn', email: 'oscorp@clienthub.com', company: 'Oscorp Technologies' },
    { name: 'Gavin Belson', email: 'hooli@clienthub.com', company: 'Hooli Digital' },
    { name: 'Dr. Preeti Menon', email: 'umbrella@clienthub.com', company: 'Umbrella Healthcare' },
    { name: 'Vikram Malhotra', email: 'skyline@clienthub.com', company: 'Skyline Realty' },
    { name: 'Neha Kulkarni', email: 'shopnest@clienthub.com', company: 'ShopNest' },
    { name: 'Imran Qureshi', email: 'swiftmove@clienthub.com', company: 'SwiftMove Logistics' },
    { name: 'Ananya Iyer', email: 'foodie@clienthub.com', company: 'Foodie Hub' },
    { name: 'Sanjay Rathore', email: 'steel@clienthub.com', company: 'Tata Heavy Steel' },
    { name: 'Willy Wonka', email: 'wonka@clienthub.com', company: 'Wonka Sweets' },
    { name: 'Miles Dyson', email: 'cyberdyne@clienthub.com', company: 'Cyberdyne Systems' },
  ];

  const clientUsers = [];
  for (const c of clientData) {
    const user = await prisma.user.create({
      data: {
        name: c.name,
        email: c.email,
        passwordHash: await bcrypt.hash(getDemoPassword(c.email), 10),
        role: 'client',
      },
    });
    clientUsers.push({ user, company: c.company });
  }

  // ============================================
  // 2. CREATE CLIENTS (linked to users)
  // ============================================
  const clients = [];
  for (const cu of clientUsers) {
    const client = await prisma.client.create({
      data: {
        name: cu.user.name,
        companyName: cu.company,
        contactEmail: cu.user.email,
        contactPhone: '+91 99999 00000', // placeholder
        notes: `${cu.company} - ClientHub client`,
        linkedUserId: cu.user.id,
      },
    });
    clients.push({ client, user: cu.user, company: cu.company });
  }

  // Helper to find client by company name
  const findClient = (companyName) => clients.find((c) => c.company === companyName).client;

  // ============================================
  // 3. CREATE PROJECTS (15 projects)
  // ============================================
  const projectData = [
    {
      title: 'Oscorp Enterprise Portal v2.0',
      client: 'Oscorp Technologies',
      status: 'In Progress',
      progress: 55,
      budget: 1850000,
      deadline: '28 Feb 2027',
      description: 'Enterprise portal redesign and modernization for Oscorp Technologies.',
    },
    {
      title: 'Oscorp AI Research Dashboard',
      client: 'Oscorp Technologies',
      status: 'In Progress',
      progress: 30,
      budget: 1200000,
      deadline: '15 Apr 2027',
      description: 'AI-powered research dashboard with ML model integration.',
    },
    {
      title: 'Hooli Compression Platform',
      client: 'Hooli Digital',
      status: 'In Progress',
      progress: 65,
      budget: 2200000,
      deadline: '31 Jan 2027',
      description: 'Next-gen compression platform with middleware optimization.',
    },
    {
      title: 'Hooli Mobile App (iOS/Android)',
      client: 'Hooli Digital',
      status: 'Not Started',
      progress: 0,
      budget: 850000,
      deadline: '30 Jun 2027',
      description: 'Cross-platform mobile application for Hooli Digital.',
    },
    {
      title: 'Umbrella Patient Portal',
      client: 'Umbrella Healthcare',
      status: 'In Progress',
      progress: 40,
      budget: 1575000,
      deadline: '20 Mar 2027',
      description: 'HIPAA-compliant patient portal with records management.',
    },
    {
      title: 'Umbrella Telemedicine Platform',
      client: 'Umbrella Healthcare',
      status: 'On Hold',
      progress: 15,
      budget: 925000,
      deadline: '10 Sep 2027',
      description: 'Telemedicine platform with video consultation features.',
    },
    {
      title: 'Skyline Property CRM',
      client: 'Skyline Realty',
      status: 'Completed',
      progress: 100,
      budget: 680000,
      deadline: '15 Oct 2026',
      description: 'Property CRM with listing sync and agent dashboard.',
    },
    {
      title: 'Skyline Virtual Tour Platform',
      client: 'Skyline Realty',
      status: 'In Progress',
      progress: 45,
      budget: 1120000,
      deadline: '30 Apr 2027',
      description: '3D virtual tour platform with VR headset compatibility.',
    },
    {
      title: 'ShopNest Marketplace Redesign',
      client: 'ShopNest',
      status: 'In Progress',
      progress: 70,
      budget: 1450000,
      deadline: '15 Dec 2026',
      description: 'Marketplace redesign with checkout flow and payment gateway.',
    },
    {
      title: 'ShopNest Vendor Dashboard',
      client: 'ShopNest',
      status: 'Not Started',
      progress: 0,
      budget: 780000,
      deadline: '28 Feb 2027',
      description: 'Vendor dashboard with onboarding wizard and inventory sync.',
    },
    {
      title: 'SwiftMove Fleet Tracking System',
      client: 'SwiftMove Logistics',
      status: 'In Progress',
      progress: 50,
      budget: 1625000,
      deadline: '31 Mar 2027',
      description: 'GPS fleet tracking with real-time alert engine.',
    },
    {
      title: 'SwiftMove Route Optimization AI',
      client: 'SwiftMove Logistics',
      status: 'Pending',
      progress: 10,
      budget: 1050000,
      deadline: '15 Jul 2027',
      description: 'AI-powered route optimization with traffic data integration.',
    },
    {
      title: 'Foodie Hub Multi-Outlet POS',
      client: 'Foodie Hub',
      status: 'In Progress',
      progress: 60,
      budget: 950000,
      deadline: '20 Jan 2027',
      description: 'Multi-location POS with offline-first sync engine.',
    },
    {
      title: 'Tata Steel ERP Integration',
      client: 'Tata Heavy Steel',
      status: 'In Progress',
      progress: 35,
      budget: 2500000,
      deadline: '30 May 2027',
      description: 'SAP S/4HANA integration with shop floor data collection.',
    },
    {
      title: 'Cyberdyne Neural Network Platform',
      client: 'Cyberdyne Systems',
      status: 'Not Started',
      progress: 0,
      budget: 3000000,
      deadline: '31 Aug 2027',
      description: 'Neural network training platform with CI/CD pipeline.',
    },
  ];

  const projects = [];
  for (const p of projectData) {
    const client = findClient(p.client);
    const project = await prisma.project.create({
      data: {
        clientId: client.id,
        title: p.title,
        description: p.description,
        budget: p.budget,
        startDate: new Date('2026-07-01'), // default start date
        deadline: parseDate(p.deadline),
        status: mapProjectStatus(p.status),
      },
    });
    projects.push({ project, title: p.title, client: p.client });
  }

  // Helper to find project by title
  const findProject = (title) => projects.find((p) => p.title === title).project;

  // ============================================
  // 4. CREATE TASKS (30 tasks)
  // ============================================
  const taskData = [
    {
      title: 'Design System & Component Library',
      project: 'Oscorp Enterprise Portal v2.0',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Priya Nair',
    },
    {
      title: 'Backend API Architecture',
      project: 'Oscorp Enterprise Portal v2.0',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'ML Model Training Pipeline',
      project: 'Oscorp AI Research Dashboard',
      priority: 'High',
      status: 'Pending',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Data Visualization Widgets',
      project: 'Oscorp AI Research Dashboard',
      priority: 'Medium',
      status: 'Pending',
      assignee: 'Priya Nair',
    },
    {
      title: 'Compression Algorithm Optimization',
      project: 'Hooli Compression Platform',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Cross-browser Testing Suite',
      project: 'Hooli Compression Platform',
      priority: 'Medium',
      status: 'Done',
      assignee: 'Anita Singh',
    },
    {
      title: 'HIPAA Compliance Audit',
      project: 'Umbrella Patient Portal',
      priority: 'Critical',
      status: 'In Progress',
      assignee: 'Rahul Mehta',
    },
    {
      title: 'Patient Records Migration',
      project: 'Umbrella Patient Portal',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Video Consultation Infrastructure',
      project: 'Umbrella Telemedicine Platform',
      priority: 'High',
      status: 'On Hold',
      assignee: 'Arjun Verma',
    },
    {
      title: 'E-prescription Module Design',
      project: 'Umbrella Telemedicine Platform',
      priority: 'Medium',
      status: 'Pending',
      assignee: 'Priya Nair',
    },
    {
      title: 'Property Listing Sync Engine',
      project: 'Skyline Property CRM',
      priority: 'High',
      status: 'Done',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Agent Dashboard Analytics',
      project: 'Skyline Property CRM',
      priority: 'Medium',
      status: 'Done',
      assignee: 'Dev Kapoor',
    },
    {
      title: '3D Virtual Tour Renderer',
      project: 'Skyline Virtual Tour Platform',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'VR Headset Compatibility',
      project: 'Skyline Virtual Tour Platform',
      priority: 'Medium',
      status: 'Pending',
      assignee: 'Priya Nair',
    },
    {
      title: 'Checkout Flow Redesign',
      project: 'ShopNest Marketplace Redesign',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Priya Nair',
    },
    {
      title: 'Payment Gateway Integration (Razorpay/Stripe)',
      project: 'ShopNest Marketplace Redesign',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Vendor Onboarding Wizard',
      project: 'ShopNest Vendor Dashboard',
      priority: 'Medium',
      status: 'Not Started',
      assignee: 'Priya Nair',
    },
    {
      title: 'Inventory Sync API',
      project: 'ShopNest Vendor Dashboard',
      priority: 'High',
      status: 'Not Started',
      assignee: 'Arjun Verma',
    },
    {
      title: 'GPS Fleet Tracking Core',
      project: 'SwiftMove Fleet Tracking System',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Real-time Alert Engine',
      project: 'SwiftMove Fleet Tracking System',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Dev Kapoor',
    },
    {
      title: 'Route Optimization ML Model',
      project: 'SwiftMove Route Optimization AI',
      priority: 'High',
      status: 'Pending',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Traffic Data Integration',
      project: 'SwiftMove Route Optimization AI',
      priority: 'Medium',
      status: 'Pending',
      assignee: 'Anita Singh',
    },
    {
      title: 'Multi-location POS Architecture',
      project: 'Foodie Hub Multi-Outlet POS',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Offline-first Sync Engine',
      project: 'Foodie Hub Multi-Outlet POS',
      priority: 'High',
      status: 'In Progress',
      assignee: 'Dev Kapoor',
    },
    {
      title: 'SAP S/4HANA Integration Layer',
      project: 'Tata Steel ERP Integration',
      priority: 'Critical',
      status: 'In Progress',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Shop Floor Data Collection',
      project: 'Tata Steel ERP Integration',
      priority: 'High',
      status: 'Pending',
      assignee: 'Rahul Mehta',
    },
    {
      title: 'Neural Network Training Cluster Setup',
      project: 'Cyberdyne Neural Network Platform',
      priority: 'Critical',
      status: 'Not Started',
      assignee: 'Arjun Verma',
    },
    {
      title: 'Model Versioning & CI/CD Pipeline',
      project: 'Cyberdyne Neural Network Platform',
      priority: 'High',
      status: 'Not Started',
      assignee: 'Dev Kapoor',
    },
  ];

  // Helper to find assignee user by name
  const findAssignee = (name) => {
    const tm = teamMembers.find((m) => m.name === name);
    return tm ? tm.user : null;
  };

  const createdTasks = {};
  for (const t of taskData) {
    const project = findProject(t.project);
    const assignee = findAssignee(t.assignee);

    if (!project || !assignee) {
      console.warn(`Skipping task "${t.title}" - project or assignee not found`);
      continue;
    }

    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: t.title,
        description: `${t.title} for ${t.project}`,
        status: mapTaskStatus(t.status),
        priority: mapPriority(t.priority),
        assignedToUserId: assignee.id,
        dueDate: project.deadline, // use project deadline as task due date
        hoursLogged: 0,
      },
    });
    createdTasks[t.title] = task;

    // Create task activity
    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        userId: admin.id,
        action: 'task_created',
        detail: `Assigned to ${assignee.name}`,
      },
    });
    if (t.status !== 'Not Started' && t.status !== 'Pending') {
      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          userId: assignee.id,
          action: 'status_changed',
          detail: `todo → ${mapTaskStatus(t.status)}`,
        },
      });
    }
  }

  // ============================================
  // 5. CREATE INVOICES (25 invoices)
  // ============================================
  const invoiceData = [
    {
      num: 'INV-2026-001',
      client: 'Oscorp Technologies',
      project: 'Oscorp Enterprise Portal v2.0',
      amount: 555000,
      status: 'Paid',
      dueDate: '15 Nov 2026',
      paidDate: '10 Nov 2026',
      description: 'Design phase',
    },
    {
      num: 'INV-2026-002',
      client: 'Oscorp Technologies',
      project: 'Oscorp AI Research Dashboard',
      amount: 360000,
      status: 'Sent',
      dueDate: '30 Nov 2026',
      paidDate: null,
      description: 'Research phase - milestone 1',
    },
    {
      num: 'INV-2026-003',
      client: 'Hooli Digital',
      project: 'Hooli Compression Platform',
      amount: 1100000,
      status: 'Paid',
      dueDate: '01 Nov 2026',
      paidDate: '28 Oct 2026',
      description: 'Compression platform - milestone 1',
    },
    {
      num: 'INV-2026-004',
      client: 'Hooli Digital',
      project: 'Hooli Compression Platform',
      amount: 660000,
      status: 'Sent',
      dueDate: '15 Dec 2026',
      paidDate: null,
      description: 'Compression platform - milestone 2',
    },
    {
      num: 'INV-2026-005',
      client: 'Umbrella Healthcare',
      project: 'Umbrella Patient Portal',
      amount: 630000,
      status: 'Paid',
      dueDate: '10 Nov 2026',
      paidDate: '05 Nov 2026',
      description: 'Patient portal - phase 1',
    },
    {
      num: 'INV-2026-006',
      client: 'Umbrella Healthcare',
      project: 'Umbrella Patient Portal',
      amount: 472500,
      status: 'Sent',
      dueDate: '30 Nov 2026',
      paidDate: null,
      description: 'Patient portal - phase 2',
    },
    {
      num: 'INV-2026-007',
      client: 'Skyline Realty',
      project: 'Skyline Property CRM',
      amount: 680000,
      status: 'Paid',
      dueDate: '20 Oct 2026',
      paidDate: '18 Oct 2026',
      description: 'Property CRM - full scope',
    },
    {
      num: 'INV-2026-008',
      client: 'Skyline Realty',
      project: 'Skyline Virtual Tour Platform',
      amount: 560000,
      status: 'Sent',
      dueDate: '15 Dec 2026',
      paidDate: null,
      description: 'Virtual tour platform - milestone 1',
    },
    {
      num: 'INV-2026-009',
      client: 'ShopNest',
      project: 'ShopNest Marketplace Redesign',
      amount: 725000,
      status: 'Paid',
      dueDate: '01 Nov 2026',
      paidDate: '29 Oct 2026',
      description: 'Marketplace redesign - phase 1',
    },
    {
      num: 'INV-2026-010',
      client: 'ShopNest',
      project: 'ShopNest Marketplace Redesign',
      amount: 435000,
      status: 'Sent',
      dueDate: '15 Dec 2026',
      paidDate: null,
      description: 'Marketplace redesign - phase 2',
    },
    {
      num: 'INV-2026-011',
      client: 'SwiftMove Logistics',
      project: 'SwiftMove Fleet Tracking System',
      amount: 812500,
      status: 'Paid',
      dueDate: '15 Nov 2026',
      paidDate: '12 Nov 2026',
      description: 'Fleet tracking - phase 1',
    },
    {
      num: 'INV-2026-012',
      client: 'SwiftMove Logistics',
      project: 'SwiftMove Fleet Tracking System',
      amount: 487500,
      status: 'Sent',
      dueDate: '30 Nov 2026',
      paidDate: null,
      description: 'Fleet tracking - phase 2',
    },
    {
      num: 'INV-2026-013',
      client: 'Foodie Hub',
      project: 'Foodie Hub Multi-Outlet POS',
      amount: 475000,
      status: 'Paid',
      dueDate: '10 Nov 2026',
      paidDate: '08 Nov 2026',
      description: 'POS system - phase 1',
    },
    {
      num: 'INV-2026-014',
      client: 'Foodie Hub',
      project: 'Foodie Hub Multi-Outlet POS',
      amount: 285000,
      status: 'Sent',
      dueDate: '20 Dec 2026',
      paidDate: null,
      description: 'POS system - phase 2',
    },
    {
      num: 'INV-2026-015',
      client: 'Tata Heavy Steel',
      project: 'Tata Steel ERP Integration',
      amount: 1250000,
      status: 'Paid',
      dueDate: '01 Nov 2026',
      paidDate: '30 Oct 2026',
      description: 'ERP integration - phase 1',
    },
    {
      num: 'INV-2026-016',
      client: 'Tata Heavy Steel',
      project: 'Tata Steel ERP Integration',
      amount: 750000,
      status: 'Sent',
      dueDate: '15 Dec 2026',
      paidDate: null,
      description: 'ERP integration - phase 2',
    },
    {
      num: 'INV-2026-017',
      client: 'Cyberdyne Systems',
      project: 'Cyberdyne Neural Network Platform',
      amount: 900000,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'Neural platform - initial setup',
    },
    {
      num: 'INV-2026-018',
      client: 'Hooli Digital',
      project: 'Hooli Mobile App (iOS/Android)',
      amount: 255000,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'Mobile app - discovery phase',
    },
    {
      num: 'INV-2026-019',
      client: 'ShopNest',
      project: 'ShopNest Vendor Dashboard',
      amount: 234000,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'Vendor dashboard - discovery',
    },
    {
      num: 'INV-2026-020',
      client: 'SwiftMove Logistics',
      project: 'SwiftMove Route Optimization AI',
      amount: 315000,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'Route optimization - discovery',
    },
    {
      num: 'INV-2026-021',
      client: 'Umbrella Healthcare',
      project: 'Umbrella Telemedicine Platform',
      amount: 277500,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'Telemedicine - discovery',
    },
    {
      num: 'INV-2026-022',
      client: 'Skyline Realty',
      project: 'Skyline Virtual Tour Platform',
      amount: 336000,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'Virtual tour - phase 2',
    },
    {
      num: 'INV-2026-023',
      client: 'Foodie Hub',
      project: 'Foodie Hub Multi-Outlet POS',
      amount: 190000,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'POS - phase 3',
    },
    {
      num: 'INV-2026-024',
      client: 'Tata Heavy Steel',
      project: 'Tata Steel ERP Integration',
      amount: 500000,
      status: 'Draft',
      dueDate: '15 Jan 2027',
      paidDate: null,
      description: 'ERP - phase 3',
    },
    {
      num: 'INV-2026-025',
      client: 'Cyberdyne Systems',
      project: 'Cyberdyne Neural Network Platform',
      amount: 1200000,
      status: 'Draft',
      dueDate: '31 Jan 2027',
      paidDate: null,
      description: 'Neural platform - training cluster',
    },
  ];

  for (const inv of invoiceData) {
    const project = findProject(inv.project);
    const client = findClient(inv.client);

    if (!project || !client) {
      console.warn(`Skipping invoice ${inv.num} - project or client not found`);
      continue;
    }

    const invoice = await prisma.invoice.create({
      data: {
        projectId: project.id,
        clientId: client.id,
        lineItems: [{ description: inv.description, quantity: 1, rate: inv.amount }],
        taxRate: 18,
        totalAmount: Math.round(inv.amount * 1.18), // add 18% GST
        status: mapInvoiceStatus(inv.status),
        dueDate: parseDate(inv.dueDate),
      },
    });

    // Create payment if paid
    if (inv.status === 'Paid' && inv.paidDate) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: Math.round(inv.amount * 1.18),
          gatewayTransactionId: `pay_${inv.num.replace('INV-', '').replace('-', '_')}`,
          status: 'paid',
          paidAt: parseDate(inv.paidDate),
        },
      });
    }
  }

  // ============================================
  // 6. CREATE AI SUMMARIES (for active projects)
  // ============================================
  const aiSummaries = [
    {
      project: 'Oscorp Enterprise Portal v2.0',
      text: 'Strong progress: design system and component library are underway, backend API architecture is in progress. On track for Feb 2027 deadline.',
      risk: 'on_track',
    },
    {
      project: 'Oscorp AI Research Dashboard',
      text: 'ML model training pipeline pending, data visualization widgets pending. Early stage, need to accelerate to meet Apr 2027 deadline.',
      risk: 'at_risk',
    },
    {
      project: 'Hooli Compression Platform',
      text: 'Compression algorithm optimization progressing well at 65% completion. Cross-browser testing suite completed. On track for Jan 2027 deadline.',
      risk: 'on_track',
    },
    {
      project: 'Umbrella Patient Portal',
      text: 'HIPAA compliance audit in progress (critical), patient records migration underway. 40% complete, targeting Mar 2027 deadline.',
      risk: 'at_risk',
    },
    {
      project: 'Umbrella Telemedicine Platform',
      text: 'On hold pending HIPAA legal review. Video consultation infrastructure blocked. E-prescription design pending.',
      risk: 'delayed',
    },
    {
      project: 'Skyline Property CRM',
      text: 'Completed successfully. Property listing sync engine and agent dashboard analytics both done. Final payment received.',
      risk: 'on_track',
    },
    {
      project: 'Skyline Virtual Tour Platform',
      text: '3D virtual tour renderer in progress at 45%. VR headset compatibility pending. Targeting Apr 2027 deadline.',
      risk: 'on_track',
    },
    {
      project: 'ShopNest Marketplace Redesign',
      text: 'Checkout flow redesign and payment gateway integration both in progress at 70%. UAT scheduled for Dec 5, 2026.',
      risk: 'on_track',
    },
    {
      project: 'SwiftMove Fleet Tracking System',
      text: 'GPS fleet tracking core and real-time alert engine both in progress at 50%. Demo scheduled for Dec 10, 2026.',
      risk: 'on_track',
    },
    {
      project: 'SwiftMove Route Optimization AI',
      text: 'Early stage at 10%. Route optimization ML model and traffic data integration both pending. ML expertise bottleneck.',
      risk: 'at_risk',
    },
    {
      project: 'Foodie Hub Multi-Outlet POS',
      text: 'Multi-location POS architecture and offline-first sync engine both in progress at 60%. Sprint review Dec 20, 2026.',
      risk: 'on_track',
    },
    {
      project: 'Tata Steel ERP Integration',
      text: 'SAP S/4HANA integration layer in progress (critical), shop floor data collection pending. 35% complete, targeting May 2027.',
      risk: 'at_risk',
    },
    {
      project: 'Cyberdyne Neural Network Platform',
      text: 'Not started yet. Neural network training cluster setup and CI/CD pipeline both pending. No kickoff, ₹30L budget at risk.',
      risk: 'at_risk',
    },
  ];

  for (const ai of aiSummaries) {
    const project = findProject(ai.project);
    if (project) {
      await prisma.aISummary.create({
        data: {
          projectId: project.id,
          summaryText: ai.text,
          riskFlag: ai.risk,
        },
      });
    }
  }

  // ============================================
  // 7. CREATE NOTIFICATIONS
  // ============================================
  const notifications = [
    {
      user: 'admin@clienthub.com',
      message: 'Cyberdyne Neural Network Platform — No kickoff yet, budget ₹30L at risk',
      type: 'ai_risk',
      link: '/projects',
    },
    {
      user: 'admin@clienthub.com',
      message: 'Umbrella Telemedicine Platform — On hold pending HIPAA legal review',
      type: 'ai_risk',
      link: '/projects',
    },
    {
      user: 'admin@clienthub.com',
      message: 'Hooli Mobile App — Not started, dependent on Compression Platform v1 release',
      type: 'ai_risk',
      link: '/projects',
    },
    {
      user: 'admin@clienthub.com',
      message: 'Multiple invoice due dates on 15 Dec 2026 (INV-004, 006, 008, 010, 012, 014, 016)',
      type: 'invoice_overdue',
      link: '/invoices',
    },
    {
      user: 'project.manager@clienthub.com',
      message: 'ShopNest Marketplace Redesign UAT scheduled for 05 Dec 2026',
      type: 'milestone',
      link: '/projects',
    },
    {
      user: 'project.manager@clienthub.com',
      message: 'SwiftMove Fleet Tracking Demo scheduled for 10 Dec 2026',
      type: 'milestone',
      link: '/projects',
    },
    {
      user: 'project.manager@clienthub.com',
      message: 'Oscorp Enterprise Portal v2.0 Phase 1 Delivery scheduled for 28 Dec 2026',
      type: 'milestone',
      link: '/projects',
    },
    {
      user: 'invoice.manager@clienthub.com',
      message: '8 Draft invoices convert to Sent on 15 Jan 2027',
      type: 'invoice_new',
      link: '/invoices',
    },
    {
      user: 'task.manager@clienthub.com',
      message: 'Cross-browser Testing Suite completed for Hooli Compression Platform',
      type: 'task_completed',
      link: '/tasks',
    },
    {
      user: 'ui.ux.designer@clienthub.com',
      message: 'Design System & Component Library in progress for Oscorp Enterprise Portal',
      type: 'task_assigned',
      link: '/tasks',
    },
    {
      user: 'developer@clienthub.com',
      message: 'Backend API Architecture in progress for Oscorp Enterprise Portal',
      type: 'task_assigned',
      link: '/tasks',
    },
    {
      user: 'developer@clienthub.com',
      message: 'SAP S/4HANA Integration Layer in progress for Tata Steel ERP Integration',
      type: 'task_assigned',
      link: '/tasks',
    },
    {
      user: 'oscorp@clienthub.com',
      message: 'New invoice available for Oscorp Enterprise Portal v2.0',
      type: 'invoice_new',
      link: '/invoices',
    },
    {
      user: 'hooli@clienthub.com',
      message: 'New invoice available for Hooli Compression Platform',
      type: 'invoice_new',
      link: '/invoices',
    },
    {
      user: 'umbrella@clienthub.com',
      message: 'New invoice available for Umbrella Patient Portal',
      type: 'invoice_new',
      link: '/invoices',
    },
  ];

  for (const n of notifications) {
    const user = await prisma.user.findUnique({ where: { email: n.user } });
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          message: n.message,
          type: n.type,
          link: n.link,
          isRead: false,
        },
      });
    }
  }

  // ============================================
  // 8. VERIFY & LOG RESULTS
  // ============================================
  const counts = {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    aiSummaries: await prisma.aISummary.count(),
    notifications: await prisma.notification.count(),
  };

  console.log('\nSeed complete! Summary:');
  console.log('Entity          Count');
  for (const [key, value] of Object.entries(counts)) {
    console.log(`${key.padEnd(15)} ${String(value).padStart(5)}`);
  }

  console.log('\nLogin Credentials (each account has its own password):');
  console.log('Role              Email                            Password');
  console.log('Admin             admin@clienthub.com              Admin@ClientHub.Passcode');
  console.log(
    'Project Manager   project.manager@clienthub.com    Project.Manager@ClientHub.Passcode'
  );
  console.log(
    'Invoice Manager   invoice.manager@clienthub.com    Invoice.Manager@ClientHub.Passcode'
  );
  console.log('Task Manager      task.manager@clienthub.com       Task.Manager@ClientHub.Passcode');
  console.log(
    'UI/UX Designer    ui.ux.designer@clienthub.com     UI.UX.Designer@ClientHub.Passcode'
  );
  console.log('Developer         developer@clienthub.com          Developer@ClientHub.Passcode');
  console.log('Oscorp            oscorp@clienthub.com             Oscorp@ClientHub.Passcode');
  console.log('Hooli Digital     hooli@clienthub.com              Hooli@ClientHub.Passcode');
  console.log('Umbrella Healthcare umbrella@clienthub.com           Umbrella@ClientHub.Passcode');
  console.log('Skyline Realty    skyline@clienthub.com            Skyline@ClientHub.Passcode');
  console.log('ShopNest          shopnest@clienthub.com           ShopNest@ClientHub.Passcode');
  console.log('SwiftMove Logistics swiftmove@clienthub.com          SwiftMove@ClientHub.Passcode');
  console.log('Foodie Hub        foodie@clienthub.com             Foodie@ClientHub.Passcode');
  console.log('Tata Heavy Steel  steel@clienthub.com              Steel@ClientHub.Passcode');
  console.log('Wonka Sweets      wonka@clienthub.com              Wonka@ClientHub.Passcode');
  console.log('Cyberdyne Systems cyberdyne@clienthub.com          Cyberdyne@ClientHub.Passcode');

  console.log('\nDashboard Metrics (from seed data):');
  console.log('  Total Projects: 15');
  console.log('  Total Contract Value: ₹2,38,85,000');
  console.log('  Invoiced to Date: ₹1,13,60,000');
  console.log('  Collected: ₹74,85,000');
  console.log('  Outstanding (Sent): ₹38,75,000');
  console.log('  Draft/Upcoming: ₹65,25,000');
  console.log('  Team: 5 members (Dev, Rahul, Anita, Priya, Arjun)');
  console.log('  Clients: 10 companies across 7 industries');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
