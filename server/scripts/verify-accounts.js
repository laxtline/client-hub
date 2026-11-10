// Run only against a disposable local database named clienthub_access_test_*.
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
assert(['127.0.0.1', 'localhost'].includes(database.hostname)
  && database.pathname.startsWith('/clienthub_access_test_'), 'Use a disposable local clienthub_access_test_* database.');
process.env.NODE_ENV = 'test';
for (const key of ['SMTP_HOST', 'GROQ_API_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) process.env[key] = '';
const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/db.js');
const { setupAccounts } = await import('./setup-accounts.js');
const { initSockets, closeSockets } = await import('../src/sockets/socketHandler.js');
const { createRequire } = await import('node:module');
const requireClient = createRequire(new URL('../../client/package.json', import.meta.url));
const { io } = requireClient('socket.io-client');
const server = http.createServer(app);
initSockets(server);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://localhost:${server.address().port}`;
let checks = 0;

async function request(session, path, method = 'GET', body, status = 200) {
  const response = await fetch(origin + '/api' + path, {
    method,
    headers: { ...(session?.token && { Authorization: `Bearer ${session.token}` }),
      ...(session?.cookie && { Cookie: session.cookie }), ...(body && { 'Content-Type': 'application/json' }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.headers.get('content-type')?.includes('application/pdf')
    ? Buffer.from(await response.arrayBuffer()) : await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

function session(result) { return { user: result.data.user, token: result.data.accessToken, cookie: result.cookie }; }
async function login(email, password) { return session(await request(null, '/auth/login', 'POST', { email, password })); }
function passed(name) { checks++; console.log('PASS:', name); }
async function socketRejected(account) {
  const socket = io(origin, { auth: { token: account.token }, transports: ['websocket'], reconnection: false, timeout: 3000 });
  try {
    await new Promise((resolve, reject) => {
      socket.once('connect', () => reject(new Error('Restricted account connected to sockets')));
      socket.once('connect_error', resolve);
    });
  } finally { socket.disconnect(); }
}
const password = 'Personal@Test123';

try {
  const admin = await login('admin@clienthub.com', 'Admin@ClientHub.Passcode');
  const signup = await request(null, '/auth/signup', 'POST', {
    name: 'Public Visitor', email: 'visitor@account-test.example', password,
    role: 'admin', isDemo: false, createdByAdmin: true,
  }, 201);
  const demo = session(signup);
  assert.equal(demo.user.role, 'demo');
  assert.equal(demo.user.isDemo, true);
  for (const path of ['/clients', '/projects', '/tasks', '/tasks/mine', '/invoices', '/payments/history', '/analytics/admin', '/analytics/client', '/notifications', '/accounts', '/ai/summary/anything']) {
    await request(demo, path, 'GET', undefined, 403);
  }
  await request(demo, '/projects', 'POST', { title: 'Forbidden' }, 403);
  await request(demo, '/accounts/team', 'POST', { name: 'Forbidden', email: 'forbidden@example.com' }, 403);
  await request(demo, '/auth/change-password', 'POST', { currentPassword: password, password: 'New@Test123' }, 403);
  await socketRejected(demo);
  await request(null, '/auth/forgot-password', 'POST', { email: demo.user.email }, 403);
  await request(null, '/auth/reset-password', 'POST', { token: 'old-token', password }, 403);
  passed('Public signup ignores role injection; demo reads, writes and password resets are blocked');

  const sharedDemo = await login('demo@clienthub.example', 'Demo@ClientHub123');
  assert.equal(sharedDemo.user.role, 'demo');
  await request(sharedDemo, '/projects', 'GET', undefined, 403);
  const refreshedDemo = session(await request(sharedDemo, '/auth/refresh', 'POST'));
  assert.equal(refreshedDemo.user.role, 'demo');
  passed('Shared demo login and refresh retain demo-only access');

  const legacy = await prisma.user.create({ data: {
    name: 'Old signup', email: 'old-signup@account-test.example', passwordHash: (await prisma.user.findUnique({ where: { id: demo.user.id } })).passwordHash,
    role: 'team_member',
  } });
  const legacySession = await login(legacy.email, password);
  assert.equal(legacySession.user.role, 'demo');
  await request(legacySession, '/projects', 'GET', undefined, 403);
  await setupAccounts();
  assert.equal((await prisma.user.findUnique({ where: { id: legacy.id } })).role, 'demo');
  await request(legacySession, '/auth/me', 'GET', undefined, 401);
  passed('Old public team registrations lose agency access and existing sessions');

  const createdTeam = await request(admin, '/accounts/team', 'POST', { name: 'Account Test Team', email: 'staff@account-test.example', role: 'admin' }, 201);
  let team = await login(createdTeam.data.credentials.email, createdTeam.data.credentials.temporaryPassword);
  assert.equal(team.user.role, 'team_member');
  assert.equal(team.user.mustChangePassword, true);
  await socketRejected(team);
  assert(!JSON.stringify(createdTeam.data).includes('passwordHash'));
  await request(team, '/tasks/mine', 'GET', undefined, 403);
  const pendingRefresh = session(await request(team, '/auth/refresh', 'POST'));
  assert.equal(pendingRefresh.user.mustChangePassword, true);
  const firstTeamToken = team;
  team = session(await request(team, '/auth/change-password', 'POST', {
    currentPassword: createdTeam.data.credentials.temporaryPassword, password,
  }));
  assert.equal(team.user.mustChangePassword, false);
  await request(firstTeamToken, '/auth/me', 'GET', undefined, 401);
  await request(firstTeamToken, '/auth/refresh', 'POST', undefined, 401);
  await request(null, '/auth/login', 'POST', { email: team.user.email, password: createdTeam.data.credentials.temporaryPassword }, 401);
  passed('Admin creates team accounts; first login requires a new password and invalidates temporary sessions');

  async function createClient(email) {
    const result = await request(admin, '/clients', 'POST', { name: email.split('@')[0], contactEmail: email, notes: 'Private admin notes' }, 201);
    let account = await login(email, result.data.credentials.temporaryPassword);
    await request(account, '/projects', 'GET', undefined, 403);
    account = session(await request(account, '/auth/change-password', 'POST', { currentPassword: result.data.credentials.temporaryPassword, password }));
    assert.equal(account.user.role, 'client');
    return { client: result.data.client, account };
  }
  const customer = await createClient('customer@account-test.example');
  const other = await createClient('other@account-test.example');
  const countBefore = await prisma.client.count();
  await request(admin, '/clients', 'POST', { name: 'Duplicate', contactEmail: team.user.email }, 409);
  assert.equal(await prisma.client.count(), countBefore);
  await request(admin, '/clients', 'POST', { name: 'Missing email' }, 400);
  passed('Client creation links a portal account atomically and requires the initial password change');

  async function createProject(client, title) {
    return (await request(admin, '/projects', 'POST', { clientId: client.id, title, budget: 25000 }, 201)).data.project;
  }
  const project = await createProject(customer.client, 'Assigned Project');
  const foreignProject = await createProject(other.client, 'Unrelated Project');
  const task = (await request(admin, '/tasks', 'POST', { projectId: project.id, title: 'Assigned task', assignedToUserId: team.user.id }, 201)).data.task;
  const coworkerTask = (await request(admin, '/tasks', 'POST', { projectId: project.id, title: 'Someone else task' }, 201)).data.task;
  const foreignTask = (await request(admin, '/tasks', 'POST', { projectId: foreignProject.id, title: 'Foreign task' }, 201)).data.task;
  for (const path of ['/clients', '/accounts', '/invoices', '/payments/history', '/analytics/admin', `/ai/summary/${project.id}`]) {
    await request(team, path, 'GET', undefined, 403);
  }
  const projects = (await request(team, '/projects')).data.projects;
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, project.id);
  assert(!('budget' in projects[0]));
  assert(!('notes' in projects[0].client));
  const view = (await request(team, `/projects/${project.id}`)).data.project;
  assert.deepEqual(view.tasks.map((row) => row.id), [task.id]);
  assert(!('invoices' in view));
  await request(team, `/projects/${foreignProject.id}`, 'GET', undefined, 403);
  assert.deepEqual((await request(team, '/tasks')).data.tasks.map((row) => row.id), [task.id]);
  assert.deepEqual((await request(team, '/tasks/mine')).data.tasks.map((row) => row.id), [task.id]);
  await request(team, '/tasks', 'POST', { projectId: project.id, title: 'Self-created task' }, 403);
  for (const row of [coworkerTask, foreignTask]) {
    await request(team, `/tasks/${row.id}/comments`, 'GET', undefined, 403);
    await request(team, `/tasks/${row.id}/activity`, 'GET', undefined, 403);
    await request(team, `/tasks/${row.id}/status`, 'PATCH', { status: 'done' }, 403);
    await request(team, `/tasks/${row.id}`, 'PUT', { hoursLogged: 10 }, 403);
  }
  await request(team, `/tasks/${task.id}`, 'PUT', { assignedToUserId: team.user.id }, 403);
  await request(team, `/tasks/${task.id}`, 'PUT', { hoursLogged: 2, priority: 'high' });
  await request(team, `/tasks/${task.id}/status`, 'PATCH', { status: 'done' });
  await request(team, `/tasks/${task.id}/comments`, 'POST', { text: 'Work complete' }, 201);
  await request(admin, `/tasks/${task.id}`, 'PUT', { assignedToUserId: null });
  await request(team, `/tasks/${task.id}/status`, 'PATCH', { status: 'todo' }, 403);
  await request(team, `/projects/${project.id}`, 'GET', undefined, 403);
  await request(admin, `/tasks/${task.id}`, 'PUT', { assignedToUserId: team.user.id });
  passed('Team can work on assigned tasks without directory, billing or unrelated project access');

  const invoice = (await request(admin, '/invoices', 'POST', {
    projectId: project.id, clientId: customer.client.id, lineItems: [{ description: 'Work', quantity: 1, rate: 100 }],
  }, 201)).data.invoice;
  const foreignInvoice = (await request(admin, '/invoices', 'POST', {
    projectId: foreignProject.id, clientId: other.client.id, lineItems: [{ description: 'Other work', quantity: 1, rate: 100 }],
  }, 201)).data.invoice;
  assert.deepEqual((await request(customer.account, '/projects')).data.projects.map((row) => row.id), [project.id]);
  assert.deepEqual((await request(customer.account, '/invoices')).data.invoices.map((row) => row.id), [invoice.id]);
  for (const path of [`/projects/${foreignProject.id}`, `/tasks?projectId=${foreignProject.id}`, `/tasks/${foreignTask.id}/comments`, `/tasks/${foreignTask.id}/activity`, `/invoices/${foreignInvoice.id}`, `/invoices/${foreignInvoice.id}/pdf`, `/ai/summary/${foreignProject.id}`]) {
    await request(customer.account, path, 'GET', undefined, 403);
  }
  await request(customer.account, `/tasks/${foreignTask.id}/comments`, 'POST', { text: 'Not mine' }, 403);
  await request(customer.account, '/payments/simulate', 'POST', { invoiceId: foreignInvoice.id, amount: 100, method: 'mock' }, 403);
  await request(customer.account, `/tasks/${task.id}/status`, 'PATCH', { status: 'todo' }, 403);
  const pdf = await request(customer.account, `/invoices/${invoice.id}/pdf`);
  assert(pdf.data.subarray(0, 4).equals(Buffer.from('%PDF')));
  passed('Client ownership is enforced for projects, tasks, comments, invoices, PDFs, summaries and payments');

  const socket = io(origin, { auth: { token: team.token }, transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  const disconnected = new Promise((resolve) => socket.once('disconnect', resolve));
  const reset = await request(admin, `/accounts/${team.user.id}/reset-password`, 'POST');
  await disconnected;
  socket.disconnect();
  await request(team, '/tasks/mine', 'GET', undefined, 401);
  await request(team, '/auth/refresh', 'POST', undefined, 401);
  await request(null, '/auth/login', 'POST', { email: team.user.email, password }, 401);
  team = await login(team.user.email, reset.data.credentials.temporaryPassword);
  assert.equal(team.user.mustChangePassword, true);
  await request(team, '/tasks/mine', 'GET', undefined, 403);
  team = session(await request(team, '/auth/change-password', 'POST', { currentPassword: reset.data.credentials.temporaryPassword, password }));
  await request(team, '/tasks/mine');
  passed('Admin reset disconnects sockets, revokes access/refresh sessions and forces a fresh password');

  const resetClient = await request(admin, `/accounts/${customer.account.user.id}/reset-password`, 'POST');
  await request(customer.account, '/projects', 'GET', undefined, 401);
  const pendingClient = await login(customer.account.user.email, resetClient.data.credentials.temporaryPassword);
  assert.equal(pendingClient.user.mustChangePassword, true);
  await request(other.account, `/accounts/${team.user.id}/reset-password`, 'POST', undefined, 403);
  await request(admin, `/accounts/${admin.user.id}/reset-password`, 'POST', undefined, 404);
  const seededTeam = await prisma.user.findUnique({ where: { email: 'developer@clienthub.com' } });
  await request(admin, `/accounts/${seededTeam.id}/reset-password`, 'POST', undefined, 403);
  await request(admin, '/auth/change-password', 'POST', { currentPassword: 'Admin@ClientHub.Passcode', password }, 403);
  const accounts = (await request(admin, '/accounts')).data;
  assert(!JSON.stringify(accounts).includes('passwordHash'));
  assert(!JSON.stringify(accounts).includes('temporaryPassword'));
  passed('Client resets work; non-admin resets, seed-password changes and password disclosure are blocked');

  await request(admin, `/accounts/${team.user.id}/status`, 'PATCH', { disabled: true });
  await request(team, '/tasks/mine', 'GET', undefined, 401);
  await request(null, '/auth/login', 'POST', { email: team.user.email, password }, 401);
  await request(admin, `/accounts/${team.user.id}/status`, 'PATCH', { disabled: false });
  await login(team.user.email, password);
  passed('Admin can disable or re-enable accounts without deleting records');

  if (process.argv.includes('--browser')) {
    const clientDir = fileURLToPath(new URL('../../client/', import.meta.url));
    const browser = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--reporter=line', '--workers=1'], {
      cwd: clientDir, stdio: 'inherit', windowsHide: true,
      env: { ...process.env, VITE_API_URL: origin + '/api', VITE_SOCKET_URL: origin,
        TEST_API_URL: origin + '/api', CLIENTHUB_ACCOUNT_TESTS: 'true' },
    });
    const exitCode = await new Promise((resolve) => browser.on('exit', resolve));
    assert.equal(exitCode, 0, 'Browser checks failed');
  }
  console.log(`\n${checks} account and access scenarios passed.`);
} finally {
  closeSockets();
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
}
