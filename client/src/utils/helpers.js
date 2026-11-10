export function formatMoney(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export const formatCurrency = formatMoney;

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(value) {
  if (!value) return null;
  const diffMs = new Date(value).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(value) {
  const days = daysUntil(value);
  if (days === null) return 'No deadline';
  if (days < 0) return Math.abs(days) + ' day(s) overdue';
  if (days === 0) return 'Due today';
  return 'in ' + days + ' day(s)';
}

export function isAdmin(user) {
  return user?.role === 'admin';
}
export function isClient(user) {
  return user?.role === 'client';
}
export function isTeam(user) {
  return user?.role === 'team_member';
}

export function defaultRoute(role) {
  if (role === 'demo') return '/demo';
  if (role === 'team_member') return '/team';
  if (role === 'client') return '/client';
  return '/admin';
}

export function roleLabel(role) {
  return { admin: 'Admin', team_member: 'Team Member', client: 'Client', demo: 'Demo' }[role] || role;
}

export function escapeHtml(value) {
  const entities = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&apos;',
  };
  return String(value ?? '').replace(/[&<>"']/g, (char) => entities[char]);
}
