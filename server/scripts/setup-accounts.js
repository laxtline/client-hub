import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';
import { demoEmail, demoPassword, seedEmails } from '../src/utils/demoAccounts.js';

export async function setupAccounts() {
  const demo = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (demo && demo.role !== 'demo') throw new Error('The public demo email belongs to an agency account. Use a different demo email.');
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  await prisma.$transaction(async (tx) => {
    // Keep the existing local seed logins usable, but lock their passwords.
    await tx.user.updateMany({
      where: { email: { in: seedEmails } },
      data: { isDemo: true, createdByAdmin: true, mustChangePassword: false },
    });
    const oldSignups = await tx.user.findMany({
      where: { role: 'team_member', createdByAdmin: false, isDemo: false }, select: { id: true },
    });
    const ids = oldSignups.map((user) => user.id);
    await tx.user.updateMany({
      where: { id: { in: ids } }, data: { role: 'demo', isDemo: true, sessionVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: { in: ids }, revokedAt: null }, data: { revokedAt: new Date() },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: { in: [...ids, ...(demo ? [demo.id] : [])] } } });
    if (!demo) {
      await tx.user.create({ data: { name: 'Demo Visitor', email: demoEmail, passwordHash, role: 'demo', isDemo: true } });
    }
    console.log(`Account setup complete. ${ids.length} old public signup(s) moved to demo access. No business records deleted.`);
  });
}

if (process.argv[1]?.endsWith('setup-accounts.js')) {
  setupAccounts().catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
