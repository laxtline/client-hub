import crypto from 'node:crypto';

export const userFields = {
  id: true, name: true, email: true, role: true,
  isDemo: true, createdByAdmin: true, mustChangePassword: true, disabled: true, sessionVersion: true,
};

export function publicUser(user) {
  const { id, name, email, isDemo, mustChangePassword } = user;
  // Old public registrations must not keep their previous team access.
  const role = user.role === 'team_member' && !user.createdByAdmin && !isDemo ? 'demo' : user.role;
  return { id, name, email, role, isDemo, mustChangePassword };
}

export function temporaryPassword() {
  return crypto.randomBytes(18).toString('base64url');
}

export function passwordLocked(user) {
  return user.isDemo || user.role === 'demo';
}

export async function revokeSessions(db, userId) {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null }, data: { revokedAt: new Date() },
  });
  await db.passwordResetToken.deleteMany({ where: { userId } });
}
