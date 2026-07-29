// Small role helpers used across the UI to decide what a user can see/do.
// Roles come straight from the backend: 'admin' | 'team_member' | 'client'.

export const isAdmin = (user) => user?.role === 'admin';
export const isTeam = (user) => user?.role === 'team_member';
export const isClient = (user) => user?.role === 'client';

// Where a freshly logged-in user should land, based on their role.
export function defaultRouteForRole(role) {
  if (role === 'client') return '/client';
  return '/admin'; // admin + team_member share the admin-style dashboard
}

// Human-friendly label for a role (used in the navbar/user menu).
export function roleLabel(role) {
  return { admin: 'Admin', team_member: 'Team Member', client: 'Client' }[role] || role;
}
