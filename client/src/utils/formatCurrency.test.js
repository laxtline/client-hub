// Unit tests for the pure formatting/role helpers — fast, no rendering needed.
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency.js';
import { formatDate, daysUntil, deadlineLabel } from './dateHelpers.js';
import { isAdmin, isClient, defaultRouteForRole, roleLabel } from './roleGuards.js';

describe('formatCurrency', () => {
  it('formats a number as INR with no decimals', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
  });

  it('falls back to ₹0 for non-numeric input', () => {
    expect(formatCurrency('not a number')).toBe('₹0');
    expect(formatCurrency(undefined)).toBe('₹0');
  });
});

describe('dateHelpers', () => {
  it('returns an em dash for missing/invalid dates', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('garbage')).toBe('—');
  });

  it('formats a valid ISO date', () => {
    expect(formatDate('2026-08-15')).toMatch(/2026/);
  });

  it('daysUntil returns null when no date is given', () => {
    expect(daysUntil(null)).toBeNull();
  });

  it('deadlineLabel describes a missing deadline', () => {
    expect(deadlineLabel(null)).toBe('No deadline');
  });
});

describe('roleGuards', () => {
  it('identifies roles correctly', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isClient({ role: 'client' })).toBe(true);
    expect(isAdmin({ role: 'client' })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it('routes clients to /client and everyone else to /admin', () => {
    expect(defaultRouteForRole('client')).toBe('/client');
    expect(defaultRouteForRole('admin')).toBe('/admin');
    expect(defaultRouteForRole('team_member')).toBe('/admin');
  });

  it('produces friendly role labels', () => {
    expect(roleLabel('team_member')).toBe('Team Member');
    expect(roleLabel('admin')).toBe('Admin');
  });
});
