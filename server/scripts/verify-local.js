// Only use this with the local demo database.
// Run from server: node scripts/verify-local.js
import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const database = new URL(process.env.DATABASE_URL);
assert(
  database.hostname === '127.0.0.1' &&
    ((database.port === '5433' && database.pathname === '/clienthub') || database.pathname.startsWith('/clienthub_access_test_')),
  'Integration checks only run against the project PostgreSQL database on 127.0.0.1:5433/clienthub'
);
process.env.NODE_ENV = 'test';
for (const key of ['SMTP_HOST', 'GROQ_API_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'])
  process.env[key] = '';
process.env.RAZORPAY_WEBHOOK_SECRET = crypto.randomBytes(32).toString('hex');
const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/db.js');
const { initSockets, closeSockets } = await import('../src/sockets/socketHandler.js');
const requireClient = createRequire(path.join(root, 'client/package.json'));
const { io } = requireClient('socket.io-client');
const server = http.createServer(app);
initSockets(server);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const prefix = `QA-${crypto.randomBytes(6).toString('hex')}`;
const sockets = [];
const invoiceIds = [];
const projectIds = [];
const refreshHashes = new Set();
const checks = [];
let fixtureClient;
let fixtureUser;

async function request(session, route, { method = 'GET', body, status = 200, headers = {} } = {}) {
  const res = await fetch(origin + '/api' + route, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.cookie ? { Cookie: session.cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const isPdf = res.headers.get('content-type')?.includes('application/pdf');
  const data = isPdf ? Buffer.from(await res.arrayBuffer()) : await res.json();
  assert.equal(res.status, status, `${method} ${route}: ${JSON.stringify(data)}`);
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  if (cookie?.startsWith('refreshToken=')) {
    refreshHashes.add(
      crypto.createHash('sha256').update(cookie.slice('refreshToken='.length)).digest('hex')
    );
  }
  return { data, cookie, headers: res.headers };
}
async function login(email, password) {
  const result = await request(null, '/auth/login', { method: 'POST', body: { email, password } });
  assert(result.data.accessToken && result.cookie);
  return { user: result.data.user, token: result.data.accessToken, cookie: result.cookie };
}
async function check(name, work) {
  await work();
  checks.push(name);
  console.log('PASS:', name);
}
async function connect(session) {
  const events = [];
  const socket = io(origin, {
    auth: { token: session.token },
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  socket.on('invoice:updated', (event) => events.push(event));
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
  return events;
}
async function createInvoice(admin, project, amount = 125.5) {
  const result = await request(admin, '/invoices', {
    method: 'POST',
    status: 201,
    body: {
      projectId: project.id,
      clientId: project.clientId,
      lineItems: [{ description: `${prefix} development services`, quantity: 2, rate: amount }],
      taxRate: 18,
    },
  });
  invoiceIds.push(result.data.invoice.id);
  return result.data.invoice;
}

try {
  let admin, team, other, customer, project, task, invoice;
  await check(
    'all 16 demo accounts log in with the correct roles; admin email accepts case and spaces',
    async () => {
      const source = fs.readFileSync(new URL('../src/prisma/seed.js', import.meta.url), 'utf8');
      const credentials = [...source.matchAll(/'([^']+@clienthub\.com)': '([^']+)'/g)];
      assert.equal(credentials.length, 16);
      for (const [, email, password] of credentials) {
        const session = await login(
          email === 'admin@clienthub.com' ? ` ${email.toUpperCase()} ` : email,
          password
        );
        const expectedRole =
          email === 'admin@clienthub.com'
            ? 'admin'
            : [
                  'project.manager',
                  'invoice.manager',
                  'task.manager',
                  'ui.ux.designer',
                  'developer',
                ].some((name) => email.startsWith(name + '@'))
              ? 'team_member'
              : 'client';
        assert.equal(session.user.role, expectedRole);
        if (expectedRole === 'admin') admin = session;
        if (email === 'developer@clienthub.com') team = session;
        if (email === 'swiftmove@clienthub.com') other = session;
      }
    }
  );
  await check('wrong passwords and unauthenticated requests are rejected', async () => {
    await request(null, '/auth/login', {
      method: 'POST',
      body: { email: 'admin@clienthub.com', password: 'wrong-password' },
      status: 401,
    });
    await request(null, '/invoices', { status: 401 });
  });
  await check('admin dashboard and pagination work; team cannot read agency totals', async () => {
    await request(admin, '/analytics/admin');
    await request(team, '/analytics/admin', { status: 403 });
    const list = await request(admin, '/clients?page=2&limit=3');
    assert.equal(list.data.clients.length, 3);
    await request(admin, '/projects?page=-1', { status: 400 });
    await request(admin, '/invoices?status=invalid', { status: 400 });
  });
  await check('admin-created client portal account and project persist', async () => {
    const email = prefix.toLowerCase() + '@example.invalid';
    const password = crypto.randomBytes(18).toString('hex');
    const result = await request(admin, '/clients', {
      method: 'POST',
      status: 201,
      body: {
        name: prefix,
        contactEmail: email,
        notes: 'Local QA fixture',
      },
    });
    fixtureClient = result.data.client;
    fixtureUser = fixtureClient.linkedUserId;
    customer = await login(email, result.data.credentials.temporaryPassword);
    const changed = await request(customer, '/auth/change-password', {
      method: 'POST', body: { currentPassword: result.data.credentials.temporaryPassword, password },
    });
    customer = { user: changed.data.user, token: changed.data.accessToken, cookie: changed.cookie };
    project = (
      await request(admin, '/projects', {
        method: 'POST',
        status: 201,
        body: {
          clientId: fixtureClient.id,
          title: prefix + ' Project',
          deadline: '2027-01-01',
        },
      })
    ).data.project;
    projectIds.push(project.id);
    assert.equal(
      (await prisma.project.findUnique({ where: { id: project.id } })).clientId,
      fixtureClient.id
    );
    await request(customer, '/projects', { method: 'POST', status: 403, body: {} });
  });
  await check(
    'team task assignment, hours, comments, status history and project progress persist',
    async () => {
      task = (
        await request(admin, '/tasks', {
          method: 'POST',
          status: 201,
          body: {
            projectId: project.id,
            title: prefix + ' Task',
            assignedToUserId: team.user.id,
            dueDate: '2027-01-01',
          },
        })
      ).data.task;
      const mine = await request(team, '/tasks/mine');
      assert(mine.data.tasks.some((row) => row.id === task.id));
      await request(team, `/tasks/${task.id}`, {
        method: 'PUT',
        body: { hoursLogged: 2.5, dueDate: null },
      });
      assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).dueDate, null);
      await request(customer, `/tasks/${task.id}/comments`, {
        method: 'POST',
        status: 201,
        body: { text: 'QA client feedback' },
      });
      assert.equal((await request(team, `/tasks/${task.id}/comments`)).data.comments.length, 1);
      await request(team, `/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: { status: 'done' },
      });
      assert((await prisma.task.findUnique({ where: { id: task.id } })).completedAt);
      assert.equal((await request(customer, `/projects/${project.id}`)).data.project.progress, 100);
      assert.equal((await request(team, `/tasks/${task.id}/activity`)).data.activities.length, 1);
      await request(team, `/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: { status: 'todo' },
      });
      assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).completedAt, null);
      assert.equal(
        (await request(admin, `/invoices/suggest/${project.id}`)).data.lineItems[0].quantity,
        2.5
      );
      await request(customer, `/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: { status: 'done' },
        status: 403,
      });
      await request(team, `/tasks/${task.id}`, {
        method: 'PUT',
        body: { dueDate: 'invalid' },
        status: 400,
      });
    }
  );
  await check(
    'invoice totals are saved correctly and mismatched clients are rejected',
    async () => {
      invoice = await createInvoice(admin, project);
      assert.equal(invoice.totalAmount, 296.18);
      const foreign = await prisma.client.findUnique({ where: { linkedUserId: other.user.id } });
      await request(admin, '/invoices', {
        method: 'POST',
        status: 400,
        body: {
          projectId: project.id,
          clientId: foreign.id,
          lineItems: [{ description: 'Mismatch', quantity: 1, rate: 1 }],
        },
      });
      await request(team, '/invoices', { method: 'POST', body: {}, status: 403 });
    }
  );
  await check('client and admin can download invoice PDFs; team billing access is blocked', async () => {
    await request(team, `/invoices/${invoice.id}/pdf`, { status: 403 });
    for (const session of [customer, admin]) {
      const pdf = await request(session, `/invoices/${invoice.id}/pdf`);
      assert.equal(pdf.data.subarray(0, 5).toString(), '%PDF-');
      assert(pdf.data.length > 1000);
      assert(pdf.headers.get('content-disposition').includes('.pdf'));
      if (session === admin) {
        fs.mkdirSync(path.join(root, '.local-postgres/qa'), { recursive: true });
        fs.writeFileSync(path.join(root, '.local-postgres/qa/invoice.pdf'), pdf.data);
      }
    }
  });
  await check('long invoice descriptions and multiple pages produce a complete PDF', async () => {
    const { generateInvoicePDF } = await import('../src/utils/generatePDF.js');
    const lineItems = Array.from({ length: 18 }, (_, i) => ({
      description:
        `Item ${i + 1}: ` +
        'Detailed implementation review, client feedback and acceptance testing. '.repeat(5),
      quantity: 2,
      rate: 125.5,
    }));
    const pdf = await generateInvoicePDF({
      ...invoice,
      id: 'QA-MULTIPAGE',
      client: { name: 'Local verification client' },
      project: { title: 'PDF layout verification' },
      lineItems,
      totalAmount: 5331.24,
    });
    assert((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length > 1);
    fs.writeFileSync(path.join(root, '.local-postgres/qa/invoice-multipage.pdf'), pdf);
  });
  await check(
    'clients cannot see or pay another client invoice, project, tasks or PDF',
    async () => {
      for (const route of [
        `/invoices/${invoice.id}`,
        `/invoices/${invoice.id}/pdf`,
        `/projects/${project.id}`,
        `/tasks?projectId=${project.id}`,
        `/tasks/${task.id}/comments`,
        `/ai/summary/${project.id}`,
      ])
        await request(other, route, { status: 403 });
      const list = await request(other, '/invoices?limit=100');
      assert(!list.data.invoices.some((row) => row.id === invoice.id));
      await request(other, '/payments/simulate', {
        method: 'POST',
        status: 403,
        body: { invoiceId: invoice.id, amount: invoice.totalAmount, method: 'mock' },
      });
    }
  );
  await check('payment validates amount; gateway is clearly unavailable without keys', async () => {
    for (const amount of ['NaN', 1])
      await request(customer, '/payments/simulate', {
        method: 'POST',
        status: 400,
        body: { invoiceId: invoice.id, amount, method: 'mock' },
      });
    await request(customer, `/payments/order/${invoice.id}`, { method: 'POST', status: 503 });
    assert.equal(await prisma.payment.count({ where: { invoiceId: invoice.id } }), 0);
    process.env.NODE_ENV = 'production';
    try {
      await request(customer, '/payments/simulate', {
        method: 'POST',
        status: 403,
        body: { invoiceId: invoice.id, amount: invoice.totalAmount, method: 'mock' },
      });
    } finally {
      process.env.NODE_ENV = 'test';
    }
  });
  await check(
    'concurrent payments update admin/client views and keep invoice events away from team',
    async () => {
      const events = await Promise.all([admin, team, customer, other].map(connect));
      const before = (await request(admin, '/analytics/admin')).data.totalRevenue;
      const statuses = await Promise.all(
        [1, 2].map(async () => {
          const res = await fetch(origin + '/api/payments/simulate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${customer.token}`,
            },
            body: JSON.stringify({
              invoiceId: invoice.id,
              amount: invoice.totalAmount,
              method: 'mock',
            }),
          });
          await res.json();
          return res.status;
        })
      );
      assert.equal(statuses.filter((status) => status === 200).length, 1);
      assert(statuses.every((status) => [200, 400, 409].includes(status)));
      assert.equal(
        await prisma.payment.count({ where: { invoiceId: invoice.id, status: 'paid' } }),
        1
      );
      for (const session of [admin, customer]) {
        const current = (await request(session, `/invoices/${invoice.id}`)).data.invoice;
        assert.equal(current.status, 'paid');
        assert(current.payments[0].paidAt);
        assert(
          (await request(session, '/payments/history')).data.payments.some(
            (p) => p.invoiceId === invoice.id
          )
        );
        assert(
          (await request(session, '/notifications')).data.notifications.some((n) =>
            n.message.includes(invoice.id)
          )
        );
      }
      for (const rows of [events[0], events[2]])
        assert.equal(rows.filter((row) => row.invoiceId === invoice.id).length, 1);
      assert.equal(events[1].length, 0);
      assert.equal(events[3].length, 0);
      assert.equal(
        Math.round(((await request(admin, '/analytics/admin')).data.totalRevenue - before) * 100),
        29618
      );
      assert.equal((await request(customer, '/analytics/client')).data.paidInvoices, 1);
      assert.equal((await request(customer, '/analytics/client')).data.pendingInvoices, 0);
    }
  );
  await check(
    'signed webhook rejects wrong amounts and commits payment/invoice once across retries',
    async () => {
      const gatewayInvoice = await createInvoice(admin, project, 50);
      const order = prefix + '-order';
      const payment = await prisma.payment.create({
        data: {
          invoiceId: gatewayInvoice.id,
          amount: gatewayInvoice.totalAmount,
          gatewayTransactionId: order,
          status: 'created',
        },
      });
      const event = (amount) => ({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              order_id: order,
              amount,
              status: 'captured',
              currency: 'INR',
            },
          },
        },
      });
      const sign = (body) =>
        crypto
          .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(JSON.stringify(body))
          .digest('hex');
      await request(null, '/payments/webhook', { method: 'POST', body: event(1), status: 400 });
      await request(null, '/payments/webhook', {
        method: 'POST',
        body: event(1),
        status: 400,
        headers: { 'x-razorpay-signature': sign(event(1)) },
      });
      assert.equal(
        (await prisma.invoice.findUnique({ where: { id: gatewayInvoice.id } })).status,
        'pending'
      );
      const body = event(Math.round(gatewayInvoice.totalAmount * 100));
      const options = { method: 'POST', body, headers: { 'x-razorpay-signature': sign(body) } };
      await request(null, '/payments/webhook', options);
      const paid = await prisma.payment.findUnique({ where: { id: payment.id } });
      const notificationCount = await prisma.notification.count({
        where: { message: { contains: gatewayInvoice.id } },
      });
      await request(null, '/payments/webhook', options);
      assert.equal(
        (await prisma.payment.findUnique({ where: { id: payment.id } })).paidAt.getTime(),
        paid.paidAt.getTime()
      );
      assert.equal(
        await prisma.notification.count({ where: { message: { contains: gatewayInvoice.id } } }),
        notificationCount
      );
      assert.equal(
        (await prisma.invoice.findUnique({ where: { id: gatewayInvoice.id } })).status,
        'paid'
      );
    }
  );
  await check(
    'notification read state persists and cannot be changed by another account',
    async () => {
      const notification = (await request(customer, '/notifications')).data.notifications.find(
        (n) => n.message.includes(invoice.id)
      );
      assert(notification);
      await request(other, `/notifications/${notification.id}/read`, {
        method: 'PATCH',
        status: 404,
      });
      await request(customer, `/notifications/${notification.id}/read`, { method: 'PATCH' });
      assert.equal(
        (await prisma.notification.findUnique({ where: { id: notification.id } })).isRead,
        true
      );
      await request(customer, '/notifications/read-all', { method: 'PATCH' });
      assert.equal((await request(customer, '/notifications')).data.unread, 0);
    }
  );
  await check('AI summary fallback is saved and visible to the owning client', async () => {
    const generated = (
      await request(admin, `/ai/summary/${project.id}`, { method: 'POST', status: 201 })
    ).data.summary;
    assert.equal(generated.riskFlag, 'unknown');
    assert(
      (await request(customer, `/ai/summary/${project.id}`)).data.latest.summaryText.length > 0
    );
  });
  await check(
    'refresh cookie restores session, rotates tokens and rejects replay after logout',
    async () => {
      const oldCookie = customer.cookie;
      const refreshed = await request(customer, '/auth/refresh', { method: 'POST' });
      assert(refreshed.data.accessToken && refreshed.cookie !== oldCookie);
      customer.token = refreshed.data.accessToken;
      customer.cookie = refreshed.cookie;
      await request({ cookie: oldCookie }, '/auth/refresh', { method: 'POST', status: 401 });
      await request(customer, '/auth/me');
      await request(customer, '/auth/logout', { method: 'POST' });
      await request(customer, '/auth/refresh', { method: 'POST', status: 401 });
    }
  );
  await check(
    'password recovery is admin-managed and forces a new password',
    async () => {
      await request(null, '/auth/forgot-password', {
        method: 'POST',
        body: { email: customer.user.email },
        status: 403,
      });
      assert.equal(
        await prisma.passwordResetToken.count({ where: { userId: fixtureUser, usedAt: null } }),
        0
      );
      const password = crypto.randomBytes(18).toString('hex');
      await request(null, '/auth/reset-password', {
        method: 'POST',
        body: { token: 'old-link', password },
        status: 403,
      });
      const reset = await request(admin, `/accounts/${fixtureUser}/reset-password`, { method: 'POST' });
      const temporary = reset.data.credentials.temporaryPassword;
      const pending = await login(customer.user.email, temporary);
      await request(pending, '/projects', { status: 403 });
      await request(pending, '/auth/change-password', {
        method: 'POST', body: { currentPassword: temporary, password },
      });
      await login(customer.user.email, password);
    }
  );
  await check('archive operations persist and remove the fixture from active lists', async () => {
    await request(admin, `/projects/${project.id}`, {
      method: 'PUT',
      body: { deadline: null, description: '' },
    });
    assert.equal((await prisma.project.findUnique({ where: { id: project.id } })).deadline, null);
    await request(admin, `/clients/${fixtureClient.id}`, { method: 'PUT', body: { notes: '' } });
    assert.equal((await prisma.client.findUnique({ where: { id: fixtureClient.id } })).notes, '');
    await request(admin, `/projects/${project.id}/archive`, { method: 'PATCH' });
    assert(
      !(await request(admin, '/projects?limit=100')).data.projects.some((p) => p.id === project.id)
    );
    await request(admin, `/clients/${fixtureClient.id}/archive`, { method: 'PATCH' });
    assert(
      (await request(admin, '/clients?status=archived&limit=100')).data.clients.some(
        (c) => c.id === fixtureClient.id
      )
    );
  });
  console.log(
    `\n${checks.length} local integration scenarios passed. PDF: .local-postgres/qa/invoice.pdf`
  );
} finally {
  for (const socket of sockets) socket.disconnect();
  closeSockets();
  await new Promise((resolve) => server.close(resolve));
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { message: { contains: prefix } },
        ...invoiceIds.map((id) => ({ message: { contains: id } })),
        ...(fixtureUser ? [{ userId: fixtureUser }] : []),
      ],
    },
  });
  if (projectIds.length) await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  if (fixtureClient) await prisma.client.delete({ where: { id: fixtureClient.id } });
  if (fixtureUser) await prisma.user.delete({ where: { id: fixtureUser } });
  if (refreshHashes.size)
    await prisma.refreshToken.deleteMany({ where: { tokenHash: { in: [...refreshHashes] } } });
  await prisma.$disconnect();
}
