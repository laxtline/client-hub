// Unit tests for the pure calculation helpers. These need no mocks because the
// functions take plain data and return a value — the easiest things to test well.
import { describe, it, expect, vi } from 'vitest';

// invoiceService imports the Prisma client at module load; mock it so these pure
// tests don't need a generated Prisma client or a live database.
vi.mock('../config/db.js', () => ({ default: {} }));

import { calculateProgress } from '../utils/calculateProgress.js';
import { calculateInvoiceTotal } from '../services/invoiceService.js';

describe('calculateProgress', () => {
  it('returns 0 when there are no tasks', () => {
    expect(calculateProgress([])).toBe(0);
  });

  it('returns the percentage of done tasks, rounded', () => {
    const tasks = [{ status: 'done' }, { status: 'todo' }, { status: 'done' }, { status: 'review' }];
    // 2 of 4 done = 50%
    expect(calculateProgress(tasks)).toBe(50);
  });

  it('returns 100 when every task is done', () => {
    expect(calculateProgress([{ status: 'done' }, { status: 'done' }])).toBe(100);
  });
});

describe('calculateInvoiceTotal', () => {
  it('sums quantity × rate across line items', () => {
    const items = [
      { quantity: 2, rate: 100 },
      { quantity: 1, rate: 50 },
    ];
    expect(calculateInvoiceTotal(items, 0)).toBe(250);
  });

  it('applies the tax rate on top of the subtotal', () => {
    const items = [{ quantity: 1, rate: 1000 }];
    // 1000 + 18% = 1180
    expect(calculateInvoiceTotal(items, 18)).toBe(1180);
  });

  it('handles an empty invoice as 0', () => {
    expect(calculateInvoiceTotal([], 18)).toBe(0);
  });
});
